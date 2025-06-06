import Cache from '@ki1r0y/cache';
const { Response, URL } = globalThis; // Put here anything not defined by your linter.

export class StorageCache {
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
    const stripper = new RegExp('^\/' + name);
    const serializer = new Cache(1e3);
    const storage = caches.open(name);
    Object.assign(this, {name, debug, stripper, serializer, storage, queue: Promise.resolve()});
  }

  // Thse four take a url string (and jsonable item for put), and return a jsonable item.
  async list() { // Promises a list of urls that that have been put so far.
    const withoutBase = request => {
      const url = new URL(request.url);
      
      return this.tag(url.pathname.replace(this.stripper, '') + url.search + url.hash);
    };
    return this.cache('').then(async cache => {
      const url = this.url('');
      //const list = await cache.keys(url, {ignoreSearch: true}); // Everything matching /collectionName/
      const list = await cache.keys();
      return (list || []).map(withoutBase);
    });
  }
  get(tag) { // Promise the json
    return this.cacheGet(tag).then(response => response?.json());
    //return this.cache(tag).then(cache => cache.match(this.url(tag))).then(response => response?.json());
  }
  delete(tag) { // Removes the previously put request and promises true if present, else false.
    return this.cache(tag).then(cache => cache.delete(this.url(tag)));
  }
  put(tag, data) {
    const url = this.url(tag);
    return this.cache(tag).then(cache => cache.put(url, Response.json(data)));
  }

  log(...rest) { // console.log only if debug.
    if (this.debug) console.log(this.name, ...rest);
  }

  // Internal
  // There are two ways in which cache.keys can return a list of all the paths stored in this cache:
  // 1. Use tag directly as the whole url, and give no argument to cache.keys(), so that all tags are returned.
  // 2. Use ?tag=mumble in the url to store under, and then give the ignoreSearch option to cache.keys().
  url(tag) { // Answer a url string by which tag is looked up within this.name.
    //return `/${this.name}/?tag=${tag}`;
    return tag;
  }
  tag(url) { // Answer a string identifying the object represented by url.
    //return url.split('/')[2];
    //return new URL(url, location.href).searchParams.get('tag');
    return url;
  }
  cacheGet(tag) { // Promise the previously put Response
    return this.cache(tag).then(cache => cache.match(this.url(tag)));
  }
  cache(tag) { // Answers the open cache, and serializes the requests.
    //return this.queue = this.queue.then(() => caches.open(this.name));
    //return caches.open(this.name);
    //return this.storage;
    const {storage, serializer} = this;
    let queue = serializer.get(tag) || Promise.resolve();
    queue = queue.then(() => storage);
    serializer.set(tag, queue);
    return queue;
    //return this.queue = this.queue.then(() => storage);
  }
}
