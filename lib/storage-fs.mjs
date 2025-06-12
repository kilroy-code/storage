import * as fs from 'node:fs/promises';
import { StorageBase } from './storage-base.mjs';

export class StorageFS extends StorageBase {
  constructor(...rest) {
    super(...rest);
    this.ready = fs.mkdir(this.path(''), {recursive: true})
      .then(() => this.delay(200)); // recursive does not error if exists.
  }
  delay(ms = 100) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  listInternal(path) {
    return fs.readdir(path).catch(e => console.warn('list', e));
  }
  getInternal(path) { // Promise undefined if nothing at path, otherwise the parsed data.
    return fs.readFile(path, {encoding: 'utf8'})
      .then(json => json === undefined ? json : JSON.parse(json),
	    e => (e.code !== 'ENOENT') && console.warn('get', e));
  }
  deleteInternal(path) { // If path was there, promise true, else false.
    return fs.rm(path).then(() => true, () => false);
  }
  putInternal(path, data) { // stringify data and put at path
    // The flush option is horribly expensive on OSX. Less than 100 writes/second.
    return fs.writeFile(path, JSON.stringify(data), {flush: true});
  }

  // You would think that it's bad to put too many files in the same directory, but
  // it turns out that in modern operating systems, that's fine.
  // Keeping all the collection items flat in the same directory makes things much easier:
  // - No need for put to ensure that the intermediate directories exist.
  // - No need for delete to remove intermediate directories if removing the item leaves it empty.
  // - No need for list() to gather up the tree through intermediate directories.
  path(tag) { // Answer a path string by which tag is looked up within this.name.
    return `${this.fullName}/${tag}`;
  }
  tag(path) { // Answer a string identifying the object represented by path.
    return path.split('/')[1];
  }
  async destroy() { // Promise to remove the whole directory.
    const dir = this.path('');
    await this.delay();
    let value = await fs.rm(dir, {recursive: true}).then(() => true, () => false);
    await this.delay();
    return value;
  }
}
