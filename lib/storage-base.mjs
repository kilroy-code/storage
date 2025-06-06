import Cache from '@ki1r0y/cache';

export class StorageBase {
  constructor({name, debug = false}) {
    const serializer = new Cache(1e3);
    Object.assign(this, {name, debug, serializer});
  }

  // These four serialize requests behind this.ready promise, which must be set by constructor.
  async list() { // Promises an array of the tags that have been put into this collection.
    return this.listInternal(await this.cache(''));
  }
  // These three further serialize read/write access through tag.
  async get(tag) { // Promises the JSONable value that was put put into this collection at tag.
    return this.getInternal(this.path(tag), await this.cache(tag));
  }
  async delete(tag) { // Removes the previously put request and promises true if present, else false.
    return this.deleteInternal(this.path(tag), await this.cache(tag));
  }
  async put(tag, data) { // Stores the JSONable data at tag, promising undefined.
    return this.putInternal(this.path(tag), data, await this.cache(tag));
  }

  log(...rest) { // console.log only if debug.
    if (this.debug) console.log(this.name, ...rest);
  }
  cache(tag) { // Answer a promise that resolves after this.ready and any pending access to tag, answering ready.
    const {serializer, ready} = this;
    let queue = serializer.get(tag) || ready;
    queue = queue.then(storage => storage);
    serializer.set(tag, queue);
    return queue;
  }
}
