const { clients, URL } = globalThis; // Put here anything not defined by your linter.
import { ResponseCache } from '/@kilroy-code/storage/lib/responseCache.mjs';

let cache, name;

self.addEventListener('activate', event => {
  name = new URL(location.href).searchParams.get('name');
  console.log(`Activating service worker "${name}" at ${import.meta.url}.`);
  cache = new ResponseCache({name: name});
  self.skipWaiting(); // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting
  event.waitUntil(clients.claim());   // https://developer.mozilla.org/en-US/docs/Web/API/Clients/claim
});

self.addEventListener('message', event => {
  if (event.data === "claim again") {
    self.clients.claim();
    console.log('Had to reclaim clients!');
  }
});

self.addEventListener('fetch', async event => {
  const {request} = event;
  const inScope = new URL(request.url).pathname.startsWith('/' + name);
  event.respondWith(inScope ? cache.dispatch(request) : fetch(request));
});

