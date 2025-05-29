export class FetchAPI {
  constructor({name, debug = false}) {
    this.name = name;
    this.debug = debug;

    const base = location.pathname.split('/').slice(0, -1).join('/');
    console.log('fetch setting up at', base);
    const worker = `${base}/serviceWorkerCache.mjs?name=${this.name}`;
    this.ready = navigator.serviceWorker
      .register(worker, {type: 'module', scope: `${base}/`})
      .then(async registration => {
	await navigator.serviceWorker.ready; // But I find that's often a lie, so check.
	if (navigator.serviceWorker.controller === null) { // Can happen from random timing at install, or from shift-reload (which turns off the Cache!).
	  registration.active.postMessage("claim again");  // Explicitly tell service worker to clients.claim() again.
	  // Are we really ready right after posting? Should we wait another tick?
	}
	return registration;
      });
  }
  async list(tag) {
    const response = await fetch(this.url(tag));
    return response.json();
  }
  async get(tag) {
    const response = await fetch(this.url(tag));
    return response.json();
  }
  async delete(tag) {
    const response = await fetch(this.url(tag), {method: 'DELETE'});
    return response.json();
  }
  async put(tag, data) {
    const response = await fetch(this.url(tag), {method: 'PUT', body: JSON.stringify(data)});
    return response.json();
  }

  url(tag) { // Answer a url string by which tag is looked up within this.name.
    return `/${this.name}${tag}`;
  }
  log(...rest) {
    if (this.debug) console.log(this.name, ...rest);
  }
}
