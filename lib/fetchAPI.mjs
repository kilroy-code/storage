export class FetchAPI {
  constructor({name, debug = false}) {
    this.name = name;
    this.debug = debug;

    const worker = `/fairshare/serviceWorkerCache.mjs?name=${this.name}`;
    this.ready = navigator.serviceWorker
      .register(worker, {type: 'module', scope: '/fairshare/'})
      .then(async registration => {
	if (registration.installing) {
	  console.log(`Service worker installing for scope ${registration.scope}.`);
	} else if (registration.waiting) {
	  console.log(`Service worker installed for scope ${registration.scope}.`);
	} else if (registration.active) {
	  console.log(`Service worker active for scope ${registration.scope}.`);
	}
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
