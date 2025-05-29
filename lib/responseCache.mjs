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
  constructor({name, debug = false}) {
    Object.assign(this, {name, debug});
  }
  log(...rest) {
    if (this.debug) console.log(this.name, ...rest);
  }
  async dispatch(request) { // Where put accepts a Response as second argument, and list
    // promise an Array of Requests, dispatch always takes exactly one Request and promises
    // one Response.
    switch (request.method) {
    case 'GET':
      const url = request.url || request;
      if (url.includes('?')) return (await this.get(request)) || Response.json(null);
      const list = await this.list(url);
      return Response.json(list);
    case 'PUT':
      const putter = await this.put(request);
      return Response.json(null);
    case 'DELETE':
      const deleter = await this.delete(request);
      return Response.json(deleter);
    default:
      return undefined;
    }
  }
  async list(request) { // Promises a list of Requests (not Responses!) that have been put so far.
    const cache = await caches.open(this.name);
    request = this.canonicalizeRequest(request);
    const list = await cache.keys(request, {ignoreSearch: true}); // Everything matching /collectionName/
    function withoutBase(request) {
      const url = new URL(request.url);
      return url.pathname + url.search + url.hash;
    }
    return (list || []).map(withoutBase);
  }
  async get(request) { // Promise the previously put Response
    const cache = await caches.open(this.name);
    request = this.canonicalizeRequest(request);    
    return cache.match(request);
  }
  async delete(request) { // Removes the previously put request and promises true if present, else false.
    const cache = await caches.open(this.name);
    request = this.canonicalizeRequest(request);
    return cache.delete(request);
  }
  async put(request, response) {
    // response is optional, but we cannot use await in the default.
    response ??= Response.json(await request.json());
    const cache = await caches.open(this.name);
    request = this.canonicalizeRequest(request);
    return cache.put(request, response);
  }
  canonicalizeRequest(request) { // Return a Request with method 'GET'.
    return request.url || request;
  }
}
