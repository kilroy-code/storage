export class FetchAPI {
  constructor({name, debug = false}) {
    this.name = name;
    this.debug = debug;
  }
  async list(tag) {
    const response = await fetch(this.url(tag));
    return response.json();
  }
  async get(tag) {
    const response = await fetch(this.url(tag));
    return response.json();
  }
  async delete(tag) {
    const response = await fetch(this.url(tag), {method: 'DELETE'});
    return response.json();
  }
  async put(tag, data) {
    const response = await fetch(this.url(tag), {method: 'PUT', body: JSON.stringify(data)});
    return response.json();
  }

  url(tag) { // Answer a url string by which tag is looked up within this.name.
    return `/${this.name}${tag}`;
  }
  log(...rest) {
    if (this.debug) console.log(this.name, ...rest);
  }
}
