import { IdentityMetadata, ready } from '../identityMetadata.mjs';
import errors from '../errors.mjs';
import {performance} from '../../utilities/performance.mjs';
import {delay} from '../../utilities/delay.mjs';

// Answer a function suitable for catch that checks the expected properties of the reason.
export function expectFailure(failureClass, {kind, tag, method = 'GET', status = 404, baseUrl}) {
  return reason => {
    expect(reason).toBeInstanceOf(failureClass);
    expect(reason.name).toBe(reason.constructor.name);
    if (baseUrl) {
      expect(reason.method).toBe(method);
      expect(reason.path).toContain(baseUrl);
    }
    if (status) {
      expect(reason.status).toBe(status);
      }
    if (kind) {
      expect(reason.kind).toBe(kind);
      expect(reason.message).toContain(kind);
    }
    if (tag) {
      expect(reason.tag).toBe(tag);
      expect(reason.message).toContain(tag);
    }
  }
}
export function matchesInput(result, payload) {
  // Every property written must be in result, but there may be more!
  for (let property in payload) { 
    expect(result[property]).toEqual(payload[property]);
  }
}

export function basic(storage, collection, testCredentials, alternativeCredentials, payloads,
                      {minimumRetrievalsPerMS, expectedRetrievalsPerMS,
                       minimumSavesPerMS = minimumRetrievalsPerMS,
                       expectedSavesPerMS = expectedRetrievalsPerMS,
                       ownerIsStored = true}) {
  describe('basic', function () {
    function read(tag) {
      return storage.retrieve({collection, tag});
    }
    function write(payload, tag = undefined) {
      return storage.save({collection, payload, tag});
    }
    let isMutable = ['owner', 'place'].includes(collection),
	index = 0,
        payload1 = payloads[index++],
        payload2 = payloads[index++],
        payload3 = payloads[index++],
        payload4 = payloads[index++],
        payload5 = payloads[index++],
        payload6 = payloads[index++],
        payload7 = payloads[index++],
        payload8 = payloads[index++],
	payload9 = payloads[index++],
	payload10 = payloads[index++],
	payload11 = payloads[index++],
	payload12 = payloads[index++],
	payload13 = payloads[index++],
	remaining = payloads.slice(index),
        dividedPayloads = [],
        payloadsLength = remaining.length;
    while (remaining.length) { // divide payloads into groups of a size that can be operated on in parallel.
      dividedPayloads.push(remaining.splice(0, 100));
    }
    beforeAll(async function () {
      await ready;
    });
    describe('operation', function () {
      it('saves as collection and payload, answering a promise for an object with tag and usertag.', async function () {
        // user test cases create an explicit new user, rather than the one used for storage of everything else.
        let expectedOwner = storage.userTag,
            promise = write(payload1), // fixme
            stored = await promise;
        expect(promise).toBeInstanceOf(Promise);
        expect(typeof stored).toBe('object');
        expect(typeof stored.tag).toBe('string');
        expect(stored.userTag).toBe(expectedOwner);
      });
      
      it('retrieves as collection and tag, answering a promise for the saved payload.', async function () {
        // This works for ALL collections because even media does json by default.
        let stored = await write(payload2),
            tag = stored.tag,
            promise = read(tag),
            result = await promise;
        expect(promise).toBeInstanceOf(Promise);
        matchesInput(result, payload2);
      });
      if (ownerIsStored) {
        it('adds usertag to data', async function () {
          let stored = await write(payload3),
              result = await read(stored.tag);
          expect(payload3.userTag).toBeUndefined();
	  expect(stored.userTag).toBeTruthy();
          expect(stored.userTag).toBe(storage.userTag);
          expect(result.userTag).toBe(storage.userTag);
        });
        it('adds timestamp to data', async function () { // FIXME: does not yet work for InMemoryStore!
          let stored = await write(payload4),
              result = await read(stored.tag);
            expect(payload4.timestamp).toBeUndefined();
            expect(stored.timestamp).toBeTruthy();
            expect(result.timestamp).toBe(stored.timestamp);
        });
      }
      it('can be read by others, if public.', async function () {
        let stored = await write(payload5); // That's fine if it's the same as above.
        storage.setCredentials(alternativeCredentials);
        let result = await read(stored.tag);
        storage.setCredentials(testCredentials);
        matchesInput(result, payload5);
      });
      it('rejects retrieval if the tag does not exist.', async function () {
        let unknownTagInCollection = await IdentityMetadata.hashDigest(JSON.stringify(payload6));
        await read(unknownTagInCollection)
          .catch(expectFailure(errors.MissingItemError, {kind: collection, tag: unknownTagInCollection, baseUrl: storage.baseUrl}));
      });

      if (isMutable) {
        describe('as mutable data', function () {
          function succeedOrFail(promise, data) {
            // Either success or failure can happen, based on when the request arrived, but not both.
            return promise.then(success => {
              (data === undefined) || matchesInput(success, data);
            },
                                failure => expect(failure.status).toBe(404));
          }
          it('allows overlapping read and write without corruption, and can be modified by owner.', async function () {
            // FIXME: do this many times, on much much bigger data.
            let data1 = payload7,
                data2 = payload8,
                expectedOwner = storage.userTag,
                tag = await ((collection === 'place') ? IdentityMetadata.hashDigest(data1.guid + expectedOwner) : expectedOwner),
                initialData = read(tag).catch(() => data1); // Existing value, if any, else what we write.
            // Although requested in order, the browser may send them in any order,
            // and the requests may arrive at the server in any order.
            let initialReadPromise = succeedOrFail(read(tag), initialData),
                initialWritePromise = write(data1, tag),
                secondReadPromise = succeedOrFail(read(tag), initialData);
            await initialReadPromise;
            expect(await initialWritePromise).toBeTruthy();
            await secondReadPromise;

            let secondWritePromise = write(data2, tag),
                thirdReadPromise = succeedOrFail(read(tag), undefined); // could be initialData or data2
            expect(await secondWritePromise).toBeTruthy();
            await thirdReadPromise;
            let result = await read(tag);
            matchesInput(result, data2);
            expect(result.userTag).toBe(expectedOwner);
          });
          it('modifications are forbidden for non-owner', async function () {
            let data1 = payload9,
                data2 = payload10;
	    let written = (await write(data1));
            expect(written.userTag).toBe(storage.userTag);
            storage.setCredentials(alternativeCredentials);
            await write(data2).catch(expectFailure(errors.ForbiddenError, {method: 'PUT', status: 403, tag: alternativeCredentials.userTag, baseUrl: storage.baseUrl}));
            storage.setCredentials(testCredentials);
          });
        });
      } else {
        describe('as immutable data', function () {
          it('produces a tag that can be verified by a browser.', async function () {
            let object = payload11,
                tag = (await write(object)).tag,
                digest = await IdentityMetadata.hashDigest(JSON.stringify(object));
            expect(tag).toBe(digest);
            // Note: client code must not rely on computing a tag ahead of writing and then reading before
            // the write promise has resolved. (It won't break anything except the code that relies on the reads!)
          });
          it('answers the original data (without error) when a subsequent write is attempted.', async function () {
            let data = payload12,
                stored = await write(data),
                result = await read(stored.tag);
            storage.setCredentials(alternativeCredentials);
            let altStored = await write(data),
                altResult = await read(altStored.tag);
            storage.setCredentials(testCredentials);
            expect(stored.userTag).toBe(stored.userTag);
            if (ownerIsStored) {
              expect(result.userTag).toBe(stored.userTag);
              expect(altStored.userTag).toBe(stored.userTag);
              expect(altResult.userTag).toBe(stored.userTag);

              expect(result.timestamp).toBe(stored.timestamp);
              expect(altStored.timestamp).toBe(stored.timestamp);
              expect(altResult.timestamp).toBe(stored.timestamp);
            }
          });
          it('allows simultaneous writes of the same data by the same or different users, without corruption.', async function () {
            let nWrites = 100,
                // All in parallel
		data = payload13,
                promises = Array.from({length: nWrites}, () => write(data));
            storage.setCredentials(alternativeCredentials);
            let alternativePromises = Array.from({length: nWrites}, () => write(data));
            storage.setCredentials(testCredentials); 
            let resolved = await Promise.all(promises.concat(alternativePromises)),
                tag = resolved[0].tag;
            matchesInput(await read(tag), data);
            for (let written of resolved) { // All of the writes produce the same tag.
              expect(written.tag).toBe(tag);
            }
          });
        });
      }
    });

    describe('performance', function () {
      beforeEach(async function () { // Allow some garbage collection.
	await delay(2e3);
      });
      function checkTime(startMS, minimumMS, expectedMS, action) {
        let elapsedMS = performance.now() - startMS,
            kPerSecond = payloadsLength/elapsedMS,
            warn = kPerSecond < expectedMS,
            error = kPerSecond < minimumSavesPerMS,
            logger = error ? console.error : (warn ? console.warn : console.info),
            message = {collection};
        message[action] = kPerSecond;
        logger(message);
        expect(kPerSecond).toBeGreaterThan(minimumMS);
        if (warn && !error) pending(`${kPerSecond.toPrecision(1)} kPerSecond`);
      }
      async function saveInChunks() { // A browser may run out of resources if trying to fetch too many a once.
        let results = [];
        for (let group of dividedPayloads) {
          results.push(await Promise.all(group.map(payload => write(payload))));
        }
        return results;
      }
      it(`can do ${minimumSavesPerMS}k saves per second in a client (and this test will warn if not ${expectedSavesPerMS}k).`, async function () {
        let start = performance.now();
        await saveInChunks();
        checkTime(start, minimumSavesPerMS, expectedSavesPerMS, 'kSavesPerSecond');
      }, 10000);
      it(`can do ${minimumRetrievalsPerMS}k retrieves per second in a client (and this test will warn if not ${expectedRetrievalsPerMS}k).`, async function () {
        let responses = await saveInChunks(),
            start = performance.now();
        for (let group of responses) {
          await Promise.all(group.map(saved => read(saved.tag)));
        }
        checkTime(start, minimumRetrievalsPerMS, expectedRetrievalsPerMS, 'kRetrievesPerSecond');
      }, 10000);
    });
  });
}
