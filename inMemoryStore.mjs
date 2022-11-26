import { IdentityMetadata } from './identityMetadata.mjs';
import { MissingItemError, MissingCollectionError } from './errors.mjs';
export { MissingItemError, MissingCollectionError};

export class InMemoryStore {
  constructor() {
    this.db = {test: {}}; // FIXME: include the basic collections.
    this.baseUrl = null;
  }
  setCredentials() {}
  async save({collection:x = 'test', payload, collectionTag = x}) {
    //payload.timestamp = Date.now();
    let collection = this.db[collectionTag],
        itemTag = payload.tag || await IdentityMetadata.hashDigest(JSON.stringify(payload));
    if (!collection) collection = this.db[collectionTag] = {};
    collection[itemTag] = payload;
    return Promise.resolve({
      tag: itemTag
    });
  }
  retrieve({collection:x = 'test', tag:itemTag, collectionTag = x}) {
    const collection = this.db[collectionTag];
    if (!collection) return Promise.reject(new MissingCollectionError('', {tag: collectionTag}));
    const item = collection[itemTag];
    if (!item) return Promise.reject(new MissingItemError('', {tag: itemTag, kind: collectionTag}));
    return Promise.resolve(item);
  }
}
