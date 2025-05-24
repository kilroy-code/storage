# @kilroy-code/storage

Key-value store for Web pages & PWAs, and their Express.js server.

The api provides four asynchronous operations: `get`, `put`, `delete`, and `list`. 
- In a browser, these are implemented with the Cache API. They can be used either directly in a Web page, or through a service worker. The latter makes it easy for one or more apps or PWAs to share storage.
- In NodeJS, these are implemented with the file system. They can be used either directly in a NodeJS app, or as routes in an ExpressJS server. The latter makes it easy for a server-based application to store things locally that are then exposed to REST API clients.

This library does _not_ provide:
- access control, as this is the job of higher-level libraries such as @ki1r0y/distributed-security
- synchronization between distributed stores, as this is the job of higher-level libraries such as @kilroy-code/flexstore

The reasons for using the Cache API as the backing store are:
- It is flexible: An app can easily be configured between store locally, store on server, local-first cache, etc.
- It can be shared among several apps that use the same service worker. In particular, at this time of writing, iOS does not make it easy to share data between a Web page that starts to get used before later installing it as a PWAS. With this design, it is easy.
