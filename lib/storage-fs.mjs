import * as fs from 'node:fs/promises';
import Cache from '@ki1r0y/cache';

export class StorageFS {
  constructor({name, debug = false}) {
    const serializer = new Cache(1e3);
    Object.assign(this, {name, debug, serializer}); // this.path() requires that name be set before call.
    this.ready = fs.mkdir(this.path(''), {recursive: true}); // recursive does not error if exists.
  }

  // Thse four take a url string (and jsonable item for put), and return a jsonable item.
  async list() { // Promises a list of urls that that have been put so far.
    return this.cache('').then(async cache => {
      return await fs.readdir(this.name, {withFileTypes: true, recursive: true})
	.then(files => {
	  const filtered = files.filter(dirent => dirent.isFile() && !dirent.parentPath.includes('temp'));
	  const names = filtered.map(dirent => dirent.name);
	  return names;	    
	    
	});
    });
  }
  get(tag) { // Promise the json
    return this.cache(tag).then(cache => {
      return fs.readFile(this.path(tag), {encoding: 'utf8'})
	.catch(() => undefined)
	.then(json => json === undefined ? json : JSON.parse(json));
    });
  }
  delete(tag) { // Removes the previously put request and promises true if present, else false.
    return this.cache(tag).then(async cache => {
      return await fs.rm(this.path(tag)).then(() => true, () => false);
    });
  }
  put(tag, data) {
    return this.cache(tag).then(async cache => {
      // The flush option is horribly expensive on OSX. Less than 100 puts/second.
      const pathname = this.path(tag);
      await fs.writeFile(pathname, JSON.stringify(data)/*, {flush: true}*/);
    });
  }

  log(...rest) { // console.log only if debug.
    if (this.debug) console.log(this.name, ...rest);
  }

  // Internal
  // You would think that it's bad to put too many files in the same directory, but
  // it turns out that in modern operating systems, that's fine.
  // Keeping all the collection items flat in the same directory makes things much easier:
  // - No need for put to ensure that the intermediate directories exist.
  // - No need for delete to remove intermediate directories if removing the item leaves it empty.
  // - No need for list() to gather up the tree through intermediate directories.
  path(tag) { // Answer a path string by which tag is looked up within this.name.
    return `${this.name}/${tag}`;
  }
  tag(path) { // Answer a string identifying the object represented by url.
    return path.split('/')[1];
  }
  cache(tag) { // Answers the open cache, and serializes the requests.
    const {serializer, ready} = this;
    let queue = serializer.get(tag) || ready;
    queue = queue.then(() => null);
    serializer.set(tag, queue);
    return queue;
  }
}
