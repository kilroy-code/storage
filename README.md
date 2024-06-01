# Storage

> The code in this repository is from earlier working versions, as we developed the ideas. It is now obsolete. The text in this README is about what will replace it.

Storage is a protocol for a very general key-value store, for which different parts of it can be implemented by a number of very different technologies for different purposes, including in-memory storage or distributed file systems.  

### Context in distributed systems:

- It is increasingly important to think of applications not as independent activityies, with occassional data transfers between silos, and instead think of applications as components of an always-on, always-interacting, distributed ecosystem. 
- Designing for distributed applications must assume changes over the application lifetime, and a great deal of decentralized interactions.
- There is a difference between transient and persistent data. Transient or live data changes rapidly through high-frequency realtime messages, but has some flexibility in semantics. There are several good approaches for modeling such behavior, including BASE, MVCC, and Croquet. 
- It can be difficult to handle all of the above considerations in systems oriented around moving data around. The more robust models tend to be oriented around live processes that evolve by communicating over time by messages. However, it is frequently the case that such objects don't _do_ anything for relatively long periods of time, or that different applications can operate on different facets of these process objects, and some of these factets may be relatively static, or even a fixed snapshot from a moment in time. 
- The purpose of the Storage API is to define a general mechanism for storing and retrieving these snapshots in time of process objects. It doesn't require a specific model for making use these snapshots, but rather provides enough info for many heterogeneous implementations to interact. In some cases, these snapshots may be thought of as result artifacts from a computation, a hibernating object that may yet evolve, or simply as the latest data values of some record. The Storage API is merely a tool for these cases, flexible in implementation with just enough complexity to safely foster some inter-application communication.


### Storage Principles

- Most data is immutable: 
  - cacheable at client, edge, and server
  - can be efficiently implemented by P2P or DHT systems
  - popular such data that appears in many contexts can be re-used without refetching
  - we can maximize immutability and re-useability by breaking up large assemblies of content into smaller pieces, each of which is reused or changes at different rates
- We can maximize immutability and re-useability by treating most mutable components as simply a map of timestamps => immutable content hashes that each designate an immutable snapshot. 
  - At most, this introduces a single additional read or write, and often not even that.
  - This also allows every object to have a map of past states, such that interactions are easily and efficiently undoable, which in turn allows a much freer and less intimidating user-experience.
  - The storage format is regular enough that the entire space can be traced for realtime garbage-collection, allowing unneeded past states to be easily purged.
- Browser-side encryption makes things safer and simpler:
  - For data that needs to be private, relying on access-controlled cloud storage is a risk to the user that the custodian might not keep the key safe, and a risk to the custodian that they may be forced to divulge the content under threat of violence or legal action. It is much better to encrypt in the browser, transmit and store the encrypted data in the cloud, and decrypt in the browser. Readability is then controlled by having the keys to decrypt, defined by the writer of the data, rather than enforced by the holder of the stored data. Since the server is then not doing any acccess control for read, a wide variety of caching and storage techniques can then be used.
  - Browser-signed data allows everything to be attributed at the fine-grain size of the data, which is much more meaningful than trying to trace the attribution of large aggregations of content.
  - Writing data is also efficient. There is no need for access control on never-yet-seen data - which is most data because most is immutable and thus not re-written. For mutable data, safe rewriting is handled efficiently by checking the signature, requiring at most one indexed data-read by the server. (In current architectures over large address spaces, a CPU signature validation has far less latency than an access control list database lookup.)
  - The [Distributed Security protocol](../distributed-security.md) provides an efficient way to create arbitrary "teams" of users matching access control requirements. Storage and Distributed Security thus form a co-dependency, such that each depends on the other.



