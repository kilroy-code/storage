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
  log(...rest) {
    if (this.debug) console.log(this.name, ...rest);
  }
  async dispatch(request) { // Where put accepts a Response as second argument, and list
    // promise an Array of Requests, dispatch always takes exactly one Request and promises
    // one Response.
    const url = this.url(request);
    switch (request.method) {
    case 'GET':
      if (url.includes('?')) return (await this.cacheGet(url)) || Response.json(null);

      const list = await this.list(url);
      return Response.json(list);
    case 'PUT':
      const putter = await this.put(url, await request.json());
      return Response.json(null);
    case 'DELETE':
      const deleter = await this.delete(url);
      return Response.json(deleter);
    default:
      return undefined;
    }
  }
  async list(url) { // Promises a list of urls that that have been put so far.
    function withoutBase(request) {
      const url = new URL(request.url);
      return url.pathname + url.search + url.hash;
    }
    return this.cache.then(async cache => {
      const list = await cache.keys(this.url(url), {ignoreSearch: true}); // Everything matching /collectionName/
      return (list || []).map(withoutBase);
    });
  }
  cacheGet(url) { // Promise the previously put Response
    return this.cache.then(cache => cache.match(url));
  }
  get(url) { // Promise the json
    return this.cacheGet(url).then(response => response?.json());
  }
  delete(url) { // Removes the previously put request and promises true if present, else false.
    return this.cache.then(cache => cache.delete(this.url(url)));
  }
  async put(url, data) {
    return this.cache.then(cache => cache.put(url, Response.json(data)));
  }

  get cache() {
    return this.queue = this.queue.then(() => caches.open(this.name));
  }
  url(request) {
    return request.url || request;
  }
}
