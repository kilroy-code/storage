/* Three high level responsibilities:
   1. Utilities for hashing, UUIDs, etc.
   2. Preparing POJO of noun models for serialization (e.g. for saving over the nouns REST API).
   3. Support operations on the server (e.g., within the implementation of that nouns REST API).
   
   We certainly want to store a single flat JSON for each noun (e.g., combining both identity and
   non-identity data), so that serving objects for GET is as simple and fast as
   possible. However, SOMEONE has to produce a hash of just the identity data, so the identity
   class must allow a process by which we start with separate identity and non-identity data and
   end with serialized combined JSON, and in between produce a hash of just the identity part.

   We certainly want to allow the client to produce such a hash, so that it can check the
   integrity of objects it receives from (a possibly distributed/untrustworthy) implementation of
   the nouns REST API. We currently also generate the hash on the server, rather than trusting
   the client (although this could change). This gives us the following API:
     getIdentityHashDigest => base 64 URL encoding of the hash of the identity data
     toString => a string of everything for input to deserialize, suitable for writing to the nouns REST API
     fromString => a static method to recreate the same instance that was serialized
     getCombinedJSON => a JSON string that can be parsed to produce the combined data
*/

export class BaseIdentity {
  constructor(identityData, nonIdentityData = {}, privateData = {}) {
    Object.assign(this, {identityData, nonIdentityData, privateData});
  }
  getIdentityHashDigest() {
    return this.constructor.hashDigest(JSON.stringify(this.identityData));
  }
  
  getCombinedData() {
    return Object.assign({}, this.identityData, this.nonIdentityData); // NonIdentity overrides. No privateData.
  }
  getCombinedJSON() {
    return JSON.stringify(this.getCombinedData());
  }

  // TODO: Use a more compact representation, to get most noun saves to fit in a packet.
  toSerialization() {
    let {identityData, nonIdentityData, privateData} = this;
    return JSON.stringify({identityData, nonIdentityData, privateData});
  }
  static fromObject(object) {
    let {identityData, nonIdentityData, privateData} = object;
    return new this(identityData, nonIdentityData, privateData);
  }
  static fromSerialization(serialized) {
    return this.fromObject(JSON.parse(serialized));
  }

  static hashDigest(data) {
    return this
      .hash(data)
      .then(hash => this.base64url(hash));
  }
  static base64urlFromString(string) {
    // LTS node doesn't have replaceAll yet.
    return string.replace(/\=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }
  static base64url(bytes) {
    return this.base64urlFromString(this.base64(bytes));
  }
}
