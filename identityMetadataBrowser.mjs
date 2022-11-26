import { BaseIdentity } from './baseIdentity.mjs';
import uuid4 from '../../javascripts/uuid4.mjs'; // A link on server to node_modules....browser.mjs
export const ready = Promise.resolve(true);

export class IdentityMetadata extends BaseIdentity {
  static uuid() {
    return uuid4();
  }

  static async hash(data) {
    if (typeof(data) === 'string') {
      data = new TextEncoder().encode(data);
    }
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuffer);
  }

  static base64(bytes) {
    return btoa(String.fromCharCode(...bytes));
  }
  static hex(bytes) {
    const hashArray = Array.from(bytes); // Species with .map and .join.
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
