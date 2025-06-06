import Cache from '@ki1r0y/cache';

export class StorageBase {
  constructor({name, maxSerializerSize = 1e3, debug = false}) {
    const serializer = new Cache(maxSerializerSize);
    Object.assign(this, {name, debug, serializer});
  }

  // These four serialize requests behind this.ready promise, which must be set by constructor.
  async list() { // Promises an array of the tags that have been put into this collection.
    return this.serialize('', (ready, path) => this.listInternal(path, ready));   
  }
  // These three further serialize read/write access through tag.
  async get(tag) { // Promises the JSONable value that was put put into this collection at tag.
    return this.serialize(tag, (ready, path) => this.getInternal(path, ready));
  }
  async delete(tag) { // Removes the previously put request and promises true if present, else false.
    return this.serialize(tag, (ready, path) => this.deleteInternal(path, ready));
  }
  async put(tag, data) { // Stores the JSONable data at tag, promising undefined.
    return this.serialize(tag, (ready, path) => this.putInternal(path, data, ready));
  }

  log(...rest) { // console.log only if debug.
    if (this.debug) console.log(this.name, ...rest);
  }
  async serialize(tag, op) { // Answer a promise that resolves after this.ready and any pending access to tag, answering ready.
    const {serializer, ready} = this;
    let queue = serializer.get(tag) || ready;
    queue = queue.then(async () => op(await this.ready, this.path(tag)));
    serializer.set(tag, queue);
    return await queue;
  }
}
