import { InMemoryStore, MissingItemError, MissingCollectionError } from '../inMemoryStore.mjs';
import { basic } from './basic.mjs';

describe('Client-side In-Memory Baseline Storage', function () {
  // This is a test of the most basic save/retrieve functionality and performance.
  // E.g. using the InMemory store as it does here, it sets an upper bound on the performance available in a browser.
  let storage = new InMemoryStore();
  basic(storage, 'test', null, null,
        Array.from({length: 1000}, (_, index) => ({x: index})),
        {minimumRetrievalsPerMS: 700, expectedRetrievalsPerMS: 850,
         minimumSavesPerMS: 20, expectedSavesPerMS: 25,
	 ownerIsStored : false});
});
