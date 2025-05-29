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
  async list(tag) { // Promises a list of urls that that have been put so far.
    const withoutBase = request => {
      const url = new URL(request.url);
      return this.tag(url.pathname + url.search + url.hash);
    };
    return this.cache.then(async cache => {
      const list = await cache.keys(this.url(tag), {ignoreSearch: true}); // Everything matching /collectionName/
      return (list || []).map(withoutBase);
    });
  }
  get(tag) { // Promise the json
    return this.cacheGet(this.url(tag)).then(response => response?.json());
  }
  delete(tag) { // Removes the previously put request and promises true if present, else false.
    return this.cache.then(cache => cache.delete(this.url(tag)));
  }
  put(tag, data) {
    return this.cache.then(cache => cache.put(this.url(tag), Response.json(data)));
  }

  async dispatch(request) { // Accepts a Request and promises a Response.
    const url = request.url;
    const tag = this.tag(url);
    switch (request.method) {
    case 'GET':
      if (!url.includes('?')) return Response.json(await this.list(tag));
      return (await this.cacheGet(tag)) || Response.json(null);
    case 'PUT':
      await this.put(tag, await request.json());
      return Response.json(null);
    case 'DELETE':
      return Response.json(await this.delete(tag));
    default:
      return undefined;
    }
  }
  log(...rest) { // console.log only if debug.
    if (this.debug) console.log(this.name, ...rest);
  }

  // Internal
  url(tag) { // Answer a url string by which tag is looked up within this.name.
    return tag;
  }
  tag(url) { // Answer a string identifying the object represented by url.
    return url;
  }
  cacheGet(url) { // Promise the previously put Response
    return this.cache.then(cache => cache.match(url));
  }
  get cache() { // Answers the open cache, and serializes the requests.
    return this.queue = this.queue.then(() => caches.open(this.name));
  }
}
