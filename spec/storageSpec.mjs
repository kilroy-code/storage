const { describe, it, expect, beforeAll, afterAll, jasmine, Request, Response } = globalThis; // Put here anything not defined by your linter.
import { ResponseCache, FetchAPI } from '@kilroy-code/storage';

function note(text) {
  const note = document.createElement('p');
  note.innerText = text;
  document.body.append(note);
}

describe("ResponseCache", function () {
  const cache = new ResponseCache('immediate');
  const fetcher = new FetchAPI('worker');  
  const collection = '/directItems/';
  const item = collection+'?tag=';
  const initialData = "Initial data";
  const sticky = item+'sticky';
  beforeAll(async function () {
    const persist = await navigator.storage.persist();
    note(`location = "${location.href}"`);
    note(`Storage ${persist ? 'is' : 'is not'} separate from browser-clearing.`);

    const outerStorage = await caches.open("auth"); // Not within service worker.
    const initialOuterStorage = await outerStorage.match(location.href, {ignoreSearch: true }).then(response => response && response.json());
    await outerStorage.put(location.href, Response.json(location.href));
    const laterOuterStorage = await outerStorage.match(location.href, {ignoreSearch: true }).then(response => response && response.json());
    note(`Initial non-service-worker cache value: "${initialOuterStorage}", updated to: "${laterOuterStorage}".`);

    const registration = await navigator.serviceWorker.register('/fairshare/serviceWorkerCache.mjs', {
      type: 'module',
      scope: '/fairshare/'
    });
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
    }
  });
  function testOperations(label, opMaker, debug = false) {
    async function listing() { // Convert a Response to an array of requests if necessary.
      const answer = await opMaker('list', collection);
      if (Array.isArray(answer)) return answer;
      return await answer.json();
    }
    async function get1(url) { // get a value, and convert the Response if necessary.
      const answer = await opMaker('get', url);
      if (answer instanceof Response) return await answer.json();
      return answer;
    }
    async function delete1(url) { // delete a value, and convert the Response if ncessary.
      const answer = await opMaker('delete', url);
      if (answer instanceof Response) return await answer.json();
      return answer;
    } 
    beforeAll(async function () {
      cache.debug = debug;
      note(`${label} previously stored data: ${await get1(sticky)}.`);
      await opMaker('put', item+'initial', initialData);
    });
    afterAll(async function () {
      cache.debug = false;
      let list = await listing();
      await Promise.all(list.map(request => false || cache.delete(request)));
      expect(await listing()).toEqual([]);
      await opMaker('put', sticky, ResponseCache.version);
    });
    it("gets what is put there.", async function () {
      const response = await get1(item+'initial');
      expect(response).toBe(initialData);
    });
    it("promises undefined for what is not there.", async function () {
      expect(!!(await get1(item+"something not yet put there"))).toBeFalsy();
    });
    it("lists what is put there.", async function () {
      const list = await listing();
      const initialRequest = list.find(request => (request.url || request).includes('initial'));
      expect(initialRequest).toBeTruthy();
      const response = await get1(initialRequest);
      expect(response).toBe(initialData);
    });
    it("can put responses.", async function() {
      const name = 'x';
      const url = item+name;
      const body = "foo bar "+name;
      await opMaker('put', url, body);
      const answer = await get1(url);
      expect(answer).toBe(body);
    });
    it("can delete.", async function () {
      const name = 'to be deleted';
      const url = item+name;
      const body = "something "+name;
      await opMaker('put', url, body);
      const answer = await get1(url);
      expect(answer).toBe(body);

      expect(await delete1(url)).toBeTruthy();
      expect(!!(await get1(url))).toBeFalsy();
      expect(await delete1(url)).toBeFalsy();    
    });
  }
  describe('with string url request', function () {
    testOperations('string', (op, url, data) => cache[op](url, data && Response.json(data)));
  });
  describe('with Request objects', function () {
    testOperations('Request', (op, url, data) => cache[op](new Request(url), data && Response.json(data)));
  });
  describe('by dispatch', function () {
    testOperations('dispatch', async (op, url, data) => {
      const options = {method: (op === 'list') ? 'GET' : op.toUpperCase()};
      if (data) options.body = JSON.stringify(data);
      return cache.dispatch(new Request(url, options));
    });
  });
  describe('by fetch api', function () {
    function ensureStorage(url) {
      if (url.startsWith('/storage') || url.startsWith('http')) return url; // fixme: get rid of http guard by having list produce pathnames.
      return '/storage' + url;
    }
    testOperations('service worker', (op, url, data) => fetcher[op](ensureStorage(url), data));
  });
});
