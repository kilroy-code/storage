const { clients, URL } = globalThis; // Put here anything not defined by your linter.
import { ResponseCache } from '/@kilroy-code/storage/lib/responseCache.mjs';
const cache = new ResponseCache('storage');

self.addEventListener('activate', event => {
  console.log('activate service worker. ResponseCache', ResponseCache.version);
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
  if (!((new URL(request.url)).pathname.startsWith('/storage/'))) {
    return event.respondWith(fetch(event.request));
  }
  event.respondWith(new Promise(async resolve => {
    const promise = cache.dispatch(request);
    const answer = await promise;
    resolve(answer);
  }));
});

