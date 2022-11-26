import crypto from 'crypto';
import uuid4 from "uuid4";
import { BaseIdentity } from './baseIdentity.mjs';

export class IdentityMetadata extends BaseIdentity {
  static uuid() {
    return uuid4();
  }
  static hash(data) {
    // SHA-224 might be a better choice, as it is 28 bytes binary / 40 base64 / 56 hex
    // compared with SHA-256 at 32 bytes binary / 44 base64 / 64 hex
    // We COULD do that if hashing is ALWAYS done on the server (e.g., in node),
    // but I'd like browser code to be able to generate everything itself, even if only for testing.
    // Every browser that supports crypto.subtle supports 256.
    let hasher = crypto.createHash('sha256');
    hasher.update(Buffer.from(data)); // Should we conditionalize to only create a Buffer.from when handed an ArrayBuffer?
    return Promise.resolve(hasher); // Promise for compatibility with browser version.
  }
  static base64(bytes) {
    return bytes.digest('base64');
  }
  static hex(bytes) {
    return bytes.digest('hex');
  }
}
