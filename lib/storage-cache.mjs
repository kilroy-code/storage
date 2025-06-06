import { StorageBase } from './storage-base.mjs';
const { Response, URL } = globalThis; // Put here anything not defined by your linter.

export class StorageCache extends StorageBase {
  constructor(...rest) {
    super(...rest);
    this.stripper = new RegExp(`^\/${this.name}\/`);
    this.ready = caches.open(this.name)
      .then(async cache => {
	const persist = await navigator.storage.persist();
	console.log(`Storage ${this.name} ${persist ? 'is' : 'is not'} separate from browser-clearing.`);
	return cache;
      });
  }

  async listInternal(cache) { // Convert cache.keys() to just the tags.
    const list = await cache.keys();
    return (list || []).map(request => this.tag(request.url));
  }
  async getInternal(path, cache) { // Promise response.json if there is a match, else undefined.
    const response = await cache.match(path);
    return response?.json();
  }
  deleteInternal(path, cache) { // Kill it.
    return cache.delete(path);
  }
  putInternal(path, data, cache) { // Set it, as json.
    return cache.put(path, Response.json(data));
  }

  // There are two ways in which cache.keys can return a list of all the paths stored in this cache:
  // 1. Use tag directly as the whole url, and give no argument to cache.keys(), so that all tags are returned.
  // 2. Use ?tag=mumble in the url to store under, and then give the ignoreSearch option to cache.keys().
  // We do the former.
  path(tag) {
    return `/${this.name}/${tag}`;
  }
  tag(url) {
    return new URL(url).pathname.replace(this.stripper, '');
  }
  destroy() { // Remove the whole Cache, promising true
    return caches.delete(this.name);
  }
}
