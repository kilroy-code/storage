import errors from './errors.mjs';
import { IdentityMetadata, ready } from './identityMetadata.mjs';
export const fetch = (typeof window !== 'undefined') ? window.fetch : await import('node-fetch').then(exports => {
  let xfetch = exports.default;
  return function fetch(resource, options) {
    if (!resource.startsWith('http')) resource = "http://localhost:3000" + resource;
    return xfetch(resource, options);
  };
});
export const btoa = (typeof window !== 'undefined') ? window.btoa : function btoa(string) { return Buffer.from(string, 'binary').toString('base64'); };
export { ready };

// Design question: Should payload in to save, and combinedData out from retrieve, include tag?
// Certainly it is redundant:
//   Can't retrieve without already knowing the tag.
//   Verifying the integrity of retrieved immutable content involves hashing content that should not include the tag (as that would be circular).
//   Verifying the integrity of mutable content requires a signature of some portion of the content, but:
//      Every noun content has a userTag, and that is the same as tag for an owner.
//      Place content has a guid, and the tag is a hash of guid+userTag.
// But maybe it will be convenient in producing/verifying signatures to include the tag?
// The current implementation does NOT include the tag.
//   The tag CAN be specified as a a named argument, which is useful for testing.
//   Otherwise:
//      owner uses the current usertag.
//      place uses hashes payload.guid + current userTag.

const safeGlobal = (typeof(window) === 'undefined') ? global : window;
export class RestStore {
  baseUrl = '/noun';
  setCredentials(properties) {
    Object.assign(this, properties);
  }
  
  async save({collection = 'test', tag, payload, mime = 'application/json', ...options}) {
    switch (collection) {
    case 'thing':
      return this.storeJSON(`${this.baseUrl}/thing`, 'POST', payload, options);
    case 'media':
      if (mime === 'application/json') { // Special case "Do What I Mean". Binary formats have buffer payloads.
        payload = JSON.stringify(payload);
      }
      return this.storeMime(`${this.baseUrl}/media`, 'POST', mime, payload); // tag is really mime type
    case 'friend':
      return this.storeMime(`${this.baseUrl}/allow/${tag || this.userTag}`, 'POST', 'text/plain', payload, options);
    case 'place':
      tag = tag || await IdentityMetadata.hashDigest(payload.guid + this.userTag);
      // fall through
    default:
      tag = tag || this.userTag;
      return this.storeMutable(collection, tag, payload, options);
    }
  }
  retrieve({collection = 'test', tag, ...options}) {
    // fixme: make InMemoryStore match. fixme: decide about extension
    switch (collection) {
    case 'media':
      return this
        .retrieveResponse(collection, tag, options)
        .then(async response => {
          let contentType = response.headers.get('Content-Type');
          if (contentType.startsWith('text/')) return response.text();
          if (contentType.startsWith('application/json')) return response.json();
          return response.arrayBuffer();
        });
    default:
      return this.retrieveJSON(collection, tag, options);
    }
  }

  async fetchOK(url, {useCredentials, ...options} = {}) { // fetch, but throw error if not response.ok
    // useCredentials is not the default, because there is generally no need in GET, and we don't want clients to divulge more than needed.
    if (useCredentials) {
      if (!options.headers) options.headers = {};
      // IWBNI we generated this just once, but for now, it is simulating the signing work that we would be doing
      // for each request, so there's no point in optimizing that yet.
      options.headers.Authorization = 'Basic ' + btoa(this.userTag + ':' + this.password);
    }
    let response = await fetch(url, options);
    if (response.ok) return response;
    let errorData = {},
        contentType = response.headers.get('Content-Type');
    if (contentType.startsWith('application/json')) {
      errorData = await response.json();
    }
    errors.ki1r0yError.rethrow(errorData, errors, response.statusText, response.status);
  }

  retrieveResponse(collection, tag, {extension = 'json', ...options} = {}) {
    return this.fetchOK(`${this.baseUrl}/${collection}/${tag}.${extension}`, options);
  }
  retrieveBlob(collection, tag, extension = 'json') {
    return this
      .retrieveResponse(collection, tag, {extension})
      .then(response => response.blob());
  }
  retrieveJSON(collection, tag, options) {
    return this
      .retrieveResponse(collection, tag, options)
      .then(response => response.json())
  }

  storeMime(url, method, mime, body) {
    return this.fetchOK(url, {
      method,
      useCredentials: true,
      headers: {'Content-Type': mime},
      body 
    }).then(response => response.json());
  }
  storeJSON(url, method, object, {nonIdentityData = {}, privateData} = {}) {
    nonIdentityData = Object.assign({}, {
      userTag: this.userTag,
      timestamp: Date.now()  // fixme: make certain that this is croquet time
    }, nonIdentityData);
    return this.storeMime(url, method, 'application/json', new IdentityMetadata(object, nonIdentityData, privateData).toSerialization());
  }
  storeMutable(collection, tag, object, options) {
    return this.storeJSON(`${this.baseUrl}/${collection}/${tag}.json`, 'PUT', object, options);
  }
}

