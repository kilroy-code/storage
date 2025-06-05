export class FetchAPI {
  constructor({name, debug = false}) {
    this.name = name;
    this.debug = debug;

    const base = location.pathname.split('/').slice(0, -1).join('/'); // directory part
    //const base = '';
    const worker = `${base}/serviceWorkerCache.mjs?name=${this.name}`;
    const narrowing = '/storage/';    // '/' + name;
    // scope: "/storage/"
    // registration.scope: http://localhost:3000/storage/
    // url: "/storage/directItems/?tag=initial"
    //const narrowing = '/';
    // scope: "/"
    // registration.scope: http://localhost:3000/
    // url: "/storage/directItems/?tag=initial"
    // handled request: "http://localhost:3000/storage/directItems/?tag=initial"

    // Scope doesn't refer to the place to which the fetched URLs refer.
    // Scope defines which pages are controlled by the service worker -- i.e., where the references come from.
    // And there is only one service worker for a given page - the most specific wins.
    const scope = `${base}${narrowing}`;
    console.log({base, worker, narrowing, scope});
    this.ready = navigator.serviceWorker
      .register(worker, {type: 'module', scope})
      .then(async registration => {
	//await navigator.serviceWorker.ready; // But I find that's often a lie, so check.
	const reregistration = await navigator.serviceWorker.getRegistration(scope);
	// if (controller === null) { // Can happen from random timing at install, or from shift-reload (which turns off the Cache!).
	// reregistration.active.postMessage("claim again");  // Explicitly tell service worker to clients.claim() again.
	// Are we really ready right after posting? Should we wait another tick?
	await new Promise(resolve => setTimeout(resolve, 500));
	// }
	console.log('should be good to go for scope::', reregistration.scope);
	return reregistration;
      });
  }
  async list(tag) {
    const response = await fetch(await this.url(tag, 'list'));
    return response.json();
  }
  async get(tag) {
    const response = await fetch(await this.url(tag, 'get'));
    return response.json();
  }
  async delete(tag) {
    const response = await fetch(await this.url(tag, 'delete'), {method: 'DELETE'});
    return response.json();
  }
  async put(tag, data) {
    const response = await fetch(await this.url(tag, 'put'), {method: 'PUT', body: JSON.stringify(data)});
    return response.json();
  }

  async url(tag, op) { // Answer a url string by which tag is looked up within this.name.
    const url = `/${this.name}${tag}`;
    //return tag;
    // const url = new URL(`/fairshare/${this.name}${tag}`, location.href).href;
    let scope = (await this.ready).scope;
    console.log(op, {tag, url, scope});
    return url;
  }
  log(...rest) {
    if (this.debug) console.log(this.name, ...rest);
  }
}
