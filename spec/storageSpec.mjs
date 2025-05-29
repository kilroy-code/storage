const { describe, it, expect, beforeAll, afterAll, jasmine, Request, Response } = globalThis; // Put here anything not defined by your linter.
import { ResponseCache, FetchAPI } from '@kilroy-code/storage';

function note(text) {
  const note = document.createElement('p');
  note.innerText = text;
  document.body.append(note);
}

describe("ResponseCache", function () {
  const cache = new ResponseCache({name: 'storage'});
  const fetcher = new FetchAPI({name: 'storage'});
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

    await fetcher.ready;

    // Delayed addition of manifest.
    const manifest = document.createElement('link');
    manifest.setAttribute('rel', 'manifest');
    manifest.setAttribute('href', new URL('manifest-test.json', location.href).href);
    document.head.append(manifest);
  });
  function testOperations(label, opMaker, debug = false) {
    beforeAll(async function () {
      cache.debug = debug;
      note(`${label} previously stored data: ${await opMaker('get', sticky)}.`);
      await opMaker('put', item+'initial', initialData);
    });
    afterAll(async function () {
      cache.debug = false;
      let list = await opMaker('list', collection);
      await Promise.all(list.map(request => false || opMaker('delete', request)));
      const after = await opMaker('list', collection);
      expect(after).toEqual([]);
      await opMaker('put', sticky, ResponseCache.version);
    });
    it("gets what is put there.", async function () {
      const response = await opMaker('get', item+'initial');
      expect(response).toBe(initialData);
    });
    it("promises undefined for what is not there.", async function () {
      expect(!!(await opMaker('get', item+"something not yet put there"))).toBeFalsy();
    });
    it("lists what is put there.", async function () {
      const list = await opMaker('list', collection);
      const initialRequest = list.find(request => (request.url || request).includes('initial'));
      expect(initialRequest).toBeTruthy();
      const response = await opMaker('get', initialRequest);
      expect(response).toBe(initialData);
    });
    it("can put responses.", async function() {
      const name = 'x';
      const url = item+name;
      const body = "foo bar "+name;
      await opMaker('put', url, body);
      const answer = await opMaker('get', url);
      expect(answer).toBe(body);
    });
    it("can delete.", async function () {
      const name = 'to be deleted';
      const url = item+name;
      const body = "something "+name;
      await opMaker('put', url, body);
      const answer = await opMaker('get', url);
      expect(answer).toBe(body);

      expect(await opMaker('delete', url)).toBeTruthy();
      expect(!!(await opMaker('get', url))).toBeFalsy();
      expect(await opMaker('delete', url)).toBeFalsy();
    });
  }
  describe('with string url request', function () {
    testOperations('string', (op, tag, data) => cache[op](tag, data));
  });
  describe('by dispatch', function () {
    testOperations('dispatch', async (op, tag, data) => {
      const options = {method: (op === 'list') ? 'GET' : op.toUpperCase()};
      if (data) options.body = JSON.stringify(data);
      const response = await cache.dispatch(new Request(tag, options));
      return response.json();
    });
  });
  describe('by fetch api', function () {
    testOperations('service worker', (op, tag, data) => fetcher[op](tag, data));
  });
});
