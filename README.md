# @kilroy/storage

Key-value store for Web pages & PWAs;

The api provides four asynchronous operations: `get`, `put`, `delete`, and `list`. 
- In a browser, these are implemented with the Cache API.
- In NodeJS, these are implemented with the file system.

There are no transactions, but everything is queued: within a store, every request to the same tag happens in the order it is called. However, this does mean that the application may itself need to serialize it's own operations. For example, suppose two different asynchronous calls get, modify, and put related items at different tags or even different storage names. The application may itself need to serialize the two activities.

This library does _not_ provide:
- access control, as this is the job of higher-level libraries such as @ki1r0y/distributed-security
- synchronization between distributed stores, as this is the job of higher-level libraries such as @kilroy-code/flexstore

## API

```
import { StorageLocal } from '@kilroy-code/storage';
const storage = new StorageLocal('MyData');
const tag = uuid4(); // For example, but can be any string. URL-safe strings are recommended.
await storage.put(tag, {foo: 1, bar: 2});
const data = await storage.get(tag);
const tags = storage.list(); // Array includes tag.
await storage.delete(tag);   // true because tag exists
await storage.delete(tag);   // false because tag no longer exists
```
