const { Response, URL } = globalThis; // Put here anything not defined by your linter.

export class ResponseCache {
  static version = 3;
  // list/get/put/delete of requests (which can be url strings)
  //
  // The url string are assumed to be of the form /collectionName/?tag=itemTag,
  // where /collectionName should produce a list of all the stored under that collection.
  //
  // For convenience, Requests are canonicalized:
  // - Everything but the url is ignored. In particular, delete() and put() do not need to use the DELETE or PUT methods.
  // - TODO: Massage /collectionName/itemTag to /collectionName?tag=itemTag, and also recognize that in dispatch GET.
  // - TODO: destroy op.
  constructor({name, debug = false}) {
    Object.assign(this, {name, debug, queue: Promise.resolve()});
  }

  // Thse four take a url string (and jsonable item for put), and return a jsonable item.
  async list(url) { // Promises a list of urls that that have been put so far.
    function withoutBase(request) {
      const url = new URL(request.url);
      return url.pathname + url.search + url.hash;
    }
    return this.cache.then(async cache => {
      const list = await cache.keys(url, {ignoreSearch: true}); // Everything matching /collectionName/
      return (list || []).map(withoutBase);
    });
  }
  get(url) { // Promise the json
    return this.cacheGet(url).then(response => response?.json());
  }
  delete(url) { // Removes the previously put request and promises true if present, else false.
    return this.cache.then(cache => cache.delete(url));
  }
  put(url, data) {
    return this.cache.then(cache => cache.put(url, Response.json(data)));
  }

  async dispatch(request) { // Accepts a Request and promises a Response.
    const url = request.url;
    switch (request.method) {
    case 'GET':
      if (!url.includes('?')) return Response.json(await this.list(url));
      return (await this.cacheGet(url)) || Response.json(null);
    case 'PUT':
      await this.put(url, await request.json());
      return Response.json(null);
    case 'DELETE':
      return Response.json(await this.delete(url));
    default:
      return undefined;
    }
  }
  log(...rest) { // console.log only if debug.
    if (this.debug) console.log(this.name, ...rest);
  }

  // Internal
  cacheGet(url) { // Promise the previously put Response
    return this.cache.then(cache => cache.match(url));
  }
  get cache() { // Answers the open cache, and serializes the requests.
    return this.queue = this.queue.then(() => caches.open(this.name));
  }
}
