# Storage

> The code in this repository is from earlier working versions, as we developed the ideas. It is now obsolete. The text in this README is about what will replace it.

Storage is a protocol for a very general key-value store that can be implemented by a number of very different technologies for different purposes, including in-memory storage or distributed file systems.  

### Context in distributed systems:

- It is increasingly important to think of applications not as independent activityies, with occassional data transfers between silos, and instead think of applications as components of a distributed ecosystem. 
- Designing for distributed applications must assume changes over the application lifetime, and a great deal of decentralized interactions.
- There is a difference between transient and persistent data. Transient or live data changes rapidly through high-frequency realtime messages, but has some flexibility in semantics. There are several good approaches for modeling such behavior, including BASE, MVCC, and Croquet. This repository is not about this kind of messaging or data, but rather about storage of long-term perisistent data that changes much less often than it is read. The two models can be combined. For example, multiple nodes of a distributed system might each replicate their own live mutable objects that exchange frequent messages, while initially pulling data and making snapshots at key occassions. Such persistent snapshots might be used by yet other applications that do not need to have the same live realtime model.
- Within the stable persistent data handled by Storage, there is s a difference between mutable and immutable data that effects the choice of implementation for efficiency and security.

### Storage Principles

- Most data is immutable: 
  - cacheable at client, edge, and server
  - can be efficiently implemented by P2P or DHT systems
  - popular such data that appears in many contexts can be re-used without refetching
  - we can maximize immutability and re-useability by breaking up large assemblies of content into smaller pieces.
- We can maximize immutability and re-useability by treating most mutable components as simply a map of timestamps => immutable content hashes that each designate an immutable snapshot. 
  - At most, this introduces a single (typically MTU-sized) additional read or write, and often not even that.
  - This also allows every object to have a map of past states, such that interactions are easily and efficiently undoable, which in turn allows a much freer and less intimidating user-experience.
  - The storage format is regular enough that the entire space can be traced for realtime garbage-collection, allowing unneeded past states to be easily purged.
- Browser-side encryption makes things safer and simpler:
  - For data that needs to be private, relying on access-controlled cloud storage is a risk to the user that the custodian might not keep the key safe, and a risk to the custodian that they may be forced to divulge the content under threat of violence or legal action. It is much better to encrypt in the browser, transmit and store the encrypted data in the cloud, and decrypt in the browser. Since the server is then not doing any acccess control for read, a wide variety of caching and storage techniques can then be used.
  - Browser-signed data allows everything to be attributed at the fine-grain size of the data.
  - Writing data is also efficient. There is no need for access control on never-yet-seen data - which is most data because most is immutable and thus not re-written. For mutable data, safe rewriting is handled efficiently by checking the signature, requiring at most one indexed data-read by the server. (In current architectures over large address spaces, an CPU signature validation has far less latency than an access control list database lookup.)
  - The [Distributed Security protocol](../distributed-security.md) provides an efficient way to create arbitrary "teams" of users matching access control requirements. Storage and Distributed Security thus form a co-dependency, such that each depends on the other.



