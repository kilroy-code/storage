const { describe, it, expect, beforeAll, afterAll, jasmine, Request, Response, URL } = globalThis; // Put here anything not defined by your linter.
import uuid4 from 'uuid4';
//import { ResponseCache, FetchAPI } from '@kilroy-code/storage';
//import { PersistIndexedDB } from '../../flexstore/lib/persist-indexeddb.mjs';
//import { StorageFS } from '../lib/storage-fs.mjs';
import { StorageLocal } from '@kilroy-code/storage';

class NothingDictionary {
  storage = {};
  get(k) { const v = this.storage[k]; return v === undefined ? v : JSON.parse(v); }
  delete(k) { delete this.storage[k]; }
  put(k, v) { this.storage[k] = JSON.stringify(v); }
  list() { return Object.keys(this.storage); }
}
class NothingMap {
  storage = new Map();
  get(k) { const v = this.storage.get(k); return v === undefined ? v : JSON.parse(v); }
  delete(k) { this.storage.delete(k); }
  put(k, v) { this.storage.set(k, JSON.stringify(v)); }
  list() { return Array.from(this.storage.keys()); }
}

function note(text) {
  const note = document.createElement('p');
  note.innerText = text;
  document.body.append(note);
}

describe("ResponseCache", function () {
  //const cache = new ResponseCache({name: 'storage'});
  //const  cache = new StorageFS({name: 'storage'});
  const cache = new StorageLocal({name: 'storage'});
  //const cache = new PersistIndexedDB({collectionLabel: 'storage'});
  //const cache = new NothingDictionary();
  const collection = '';
  const item = collection+'';
  const initialData = "Initial data";
  const sticky = item+'sticky';
  beforeAll(async function () {
    // const persist = await navigator.storage.persist();
    // note(`location = "${location.href}"`);
    // note(`Storage ${persist ? 'is' : 'is not'} separate from browser-clearing.`);

    // const outerStorage = await caches.open("auth"); // Not within service worker.
    // const initialOuterStorage = await outerStorage.match(location.href, {ignoreSearch: true }).then(response => response && response.json());
    // await outerStorage.put(location.href, Response.json(location.href));
    // const laterOuterStorage = await outerStorage.match(location.href, {ignoreSearch: true }).then(response => response && response.json());
    // note(`Initial non-service-worker cache value: "${initialOuterStorage}", updated to: "${laterOuterStorage}".`);

    // // Delayed addition of manifest.
    // const manifest = document.createElement('link');
    // manifest.setAttribute('rel', 'manifest');
    // manifest.setAttribute('href', new URL('manifest-test.json', location.href).href);
    // document.head.append(manifest);
  });
  function testOperations(label, opMaker, debug = false) {
    beforeAll(async function () {
      cache.debug = debug;
      //note(`${label} previously stored data: ${await opMaker('get', sticky)}.`);
      await opMaker('put', item+'initial', initialData);
    });
    afterAll(async function () {
      cache.debug = false;
      let list = await opMaker('list', collection);
      await Promise.all(list.map(request => opMaker('delete', request)));
      const after = await opMaker('list', collection);
      expect(after).toEqual([]);
      await opMaker('put', sticky, 'saved');
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
  describe('performance', function () {
    const length = 5e3,
	  data = Array.from({length}, (_, i) => ({s: i.toString(), i: i})),
	  tags = Array.from({length}, () => uuid4()),
	  times = {};
    let start;
    function noteTime(op) {
      let next = Date.now();
      times[op] = next - start;
      start = next;
    }
    function report(label, op, expected) {
      it(`more than ${expected} ${op} ops/second.`, function () {
	const time = times[op];
	const actual = length * 1e3 / time;
	console.log(`${label} ${Math.trunc(actual).toLocaleString()} ${op}s over ${time.toLocaleString()}ms.` );
	expect(actual).toBeGreaterThan(expected);
      });
    }
    describe('serial', function () {
      beforeAll(async function () {
	start = Date.now();
	for (let index = 0; index < length; index++) {
	  await cache.put(tags[index], data[index]);
	}
	noteTime('put');
	await cache.list();
	noteTime('list');
	for (let index = 0; index < length; index++) {
	  await cache.get(tags[index]);
	}
	noteTime('get');
	for (let index = 0; index < length; index++) {
	  await cache.delete(tags[index]);
	}
	noteTime('delete');
      }, 30e3);
      report('serial', 'get', 1000);
      report('serial', 'put', 750);
      report('serial', 'list', 4000);
      report('serial', 'delete', 1000);
    });
    describe('parallel', function () {
      beforeAll(async function () {
	start = Date.now();
	await Promise.all(tags.map((tag, index) => cache.put(tag, data[index])));
	noteTime('put');
	await cache.list();
	noteTime('list');
	await Promise.all(tags.map(tag => cache.get(tag)));
	noteTime('get');
	await Promise.all(tags.map(tag => cache.delete(tag)));
	noteTime('delete');
      }, 30e3);
      report('parallel', 'get', 1000);
      report('parallel', 'put', 1000);
      report('parallel', 'list', 6000);
      report('parallel', 'delete', 1000);
    });
  });
});
