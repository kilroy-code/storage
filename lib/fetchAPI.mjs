export class FetchAPI {
  constructor(dbName, debug = false) {
    this.name = dbName;
    this.debug = debug;
  }
  log(...rest) {
    if (this.debug) console.log(this.name, ...rest);
  }
  async list(url) {
    const response = await fetch(url);
    return response.json();
  }
  async get(url) {
    const response = await fetch(url);
    return response.json();
  }
  async delete(url) {
    const response = await fetch(url, {method: 'DELETE'});
    return response.json();
  }
  async put(url, data) {
    const response = await fetch(url, {method: 'PUT', body: JSON.stringify(data)});
    return response.json();
  }
}
