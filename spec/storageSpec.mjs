const { describe, it, expect, beforeAll, afterAll, jasmine, Request, Response, URL } = globalThis; // Put here anything not defined by your linter.
import uuid4 from 'uuid4';
import { StorageLocal } from '@kilroy-code/storage';

describe("Storage", function () {
  const storage = new StorageLocal({name: 'test-storage'});
  const initialData = "Initial data";
  afterAll(async function () {
    await storage.destroy();
  });
  function testOperations(label, opMaker, debug = false) {
    beforeAll(async function () {
      storage.debug = debug;
      await opMaker('put', 'initial', initialData);
    });
    afterAll(async function () {
      storage.debug = false;
      let list = await opMaker('list');
      await Promise.all(list.map(request => opMaker('delete', request)));
      const after = await opMaker('list');
      expect(after).toEqual([]);
    });
    it("gets what is put there.", async function () {
      const response = await opMaker('get', 'initial');
      expect(response).toBe(initialData);
    });
    it("promises undefined for what is not there.", async function () {
      expect(!!(await opMaker('get', "something not yet put there"))).toBeFalsy();
    });
    it("lists what is put there.", async function () {
      const list = await opMaker('list');
      const initialRequest = list.find(request => (request.url || request).includes('initial'));
      expect(initialRequest).toBeTruthy();
      const response = await opMaker('get', initialRequest);
      expect(response).toBe(initialData);
    });
    it("can put responses.", async function() {
      const tag = 'x';
      const body = "foo bar "+tag;
      await opMaker('put', tag, body);
      const answer = await opMaker('get', tag);
      expect(answer).toBe(body);
    });
    it("can delete.", async function () {
      const tag = 'to be deleted';
      const body = "something "+tag;
      await opMaker('put', tag, body);
      const answer = await opMaker('get', tag);
      expect(answer).toBe(body);

      expect(await opMaker('delete', tag)).toBeTruthy();
      expect(!!(await opMaker('get', tag))).toBeFalsy();
      expect(await opMaker('delete', tag)).toBeFalsy();
    });
  }
  describe('with string tag request', function () {
    testOperations('string', (op, tag, data) => storage[op](tag, data));
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
	  await storage.put(tags[index], data[index]);
	}
	noteTime('put');
	await storage.list();
	noteTime('list');
	for (let index = 0; index < length; index++) {
	  await storage.get(tags[index]);
	}
	noteTime('get');
	for (let index = 0; index < length; index++) {
	  await storage.delete(tags[index]);
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
	await Promise.all(tags.map((tag, index) => storage.put(tag, data[index])));
	noteTime('put');
	await storage.list();
	noteTime('list');
	await Promise.all(tags.map(tag => storage.get(tag)));
	noteTime('get');
	await Promise.all(tags.map(tag => storage.delete(tag)));
	noteTime('delete');
      }, 30e3);
      report('parallel', 'get', 1000);
      report('parallel', 'put', 1000);
      report('parallel', 'list', 6000);
      report('parallel', 'delete', 1000);
    });
  });
});
