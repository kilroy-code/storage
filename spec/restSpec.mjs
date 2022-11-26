
import { IdentityMetadata, ready } from '../identityMetadata.mjs';
import { RestStore, fetch } from '../rest.mjs';
import { basic, expectFailure, matchesInput } from './basic.mjs';
import errors from '../errors.mjs';

describe('Storage REST API', function () {
  // FIXME: taglists
  // FIXME: delete? cleanup?
  // FIXME: test private properties directly?
  
  let storage = new RestStore(),
      testCredentials = {password: 'fixme'},
      alternateCredentials = {password: 'stoopid!' },
      credentialsWithFriend = {password: 'hello'},

      friendPlaceData, friendThingData, friendMediaData,
      privatePlace,
      friendPlace, friendThing, friendMedia;
  beforeAll(async function () {
    await ready;
    [testCredentials, alternateCredentials, credentialsWithFriend].forEach(cred => cred.userTag = IdentityMetadata.uuid()); // After IdentityMetadata binding is ready.

    storage.setCredentials(alternateCredentials);
    await storage.save({collection: 'owner', payload: {name: "test 1"}});

    storage.setCredentials(credentialsWithFriend);
    await storage.save({collection: 'owner', payload: {name: 'foo'}});
    await storage.save({collection: 'friend', payload: testCredentials.userTag}); // and not alternateCredentials
    let guid = IdentityMetadata.uuid(),
        restriction = await IdentityMetadata.hashDigest(guid + credentialsWithFriend.userTag);
    friendPlaceData = {guid, restriction},
    friendThingData = {foo: IdentityMetadata.uuid(), restriction},
    friendMediaData = {bar: IdentityMetadata.uuid(), restriction},
    friendPlace = await storage.save({collection: 'place', payload: friendPlaceData});
    privatePlace = await storage.save({collection: 'place', payload: {guid: IdentityMetadata.uuid(), restriction: credentialsWithFriend.userTag}});
    friendThing = await storage.save({collection: 'thing', payload: friendThingData});
    friendMedia = await storage.save({collection: 'media', payload: friendMediaData});
    
    storage.setCredentials(testCredentials);
    await storage.save({collection: 'owner', payload: {name: "test 2"}});
  });

  it('rejects retrieval if the collection does not exist.', async function () {
    let unknownCollectionName = 'unknownCollection';
    await storage
      .retrieve({collection: unknownCollectionName, tag: 'xxwhatever'})
      .catch(expectFailure(errors.MissingCollectionError, {kind: 'collection', tag: unknownCollectionName}));
  });

  describe('owner endpoint', function () {
    basic(storage, 'owner', testCredentials, alternateCredentials,
          // FIXME: We can simplify everything by using testCredentials.userTag here
          Array.from({length: 500}, (_, index) => ({someOwner: index})),
          {minimumRetrievalsPerMS: 0.6, expectedRetrievalsPerMS: 1,
           minimumSavesPerMS: 0.5, expectedSavesPerMS: 0.9});
  });

  describe('place endpoint', function () {
    let payload = Array.from({length: 1000}, (_, index) => ({somePlace: index, guid: 'replace when ready'}));
    beforeAll(async function () {
      await ready;
      payload.forEach(datum => datum.guid = IdentityMetadata.uuid());
    });
    basic(storage, 'place', testCredentials, alternateCredentials, payload,
          {minimumRetrievalsPerMS: 0.45, expectedRetrievalsPerMS: 1,
           minimumSavesPerMS: 0.35, expectedSavesPerMS: 0.9});
    describe('can be restricted', function () {
      it('to just the owner.', async function () {
        let label = {collection: 'place', tag: privatePlace.tag, useCredentials: true};
        expect(privatePlace.tag).toContain('!');

        storage.setCredentials(credentialsWithFriend);
        expect(await storage.retrieve(label)).toBeTruthy();

        storage.setCredentials(testCredentials);
        await storage
          .retrieve(label)
          .then(response => expect(response).toBeFalsy(),
                expectFailure(errors.ForbiddenError, {status: 403, tag: testCredentials.userTag}));
      });
      xit('such that friends can read.', async function () {
        let result = await storage.retrieve({collection: 'place', tag: friendPlace.tag, useCredentials: true});
        matchesInput(result, friendPlaceData);
      });
      it('such that non-friends cannot read.', async function () {
        expect(friendPlace.tag).toContain('!');
	storage.setCredentials(alternateCredentials);
        await storage
          .retrieve({collection: 'place', tag: friendPlace.tag, useCredentials: true})
          .then(response => expect(response).toBeFalsy(),
                expectFailure(errors.ForbiddenError, {status: 403, tag: alternateCredentials.userTag}));
	storage.setCredentials(testCredentials);
      });
    });
  });

  describe('thing endpoint', function () {
    // Each run must use different data (else it won't be rewritten).
    let payloadData = Array.from({length: 1000}, (_, index) => ({someThing: index, unique: 'replace when ready'}));
    beforeAll(async function () { // But we need to wait for a binding for IdentityMetadata.
      await ready;
      payloadData.forEach(datum => datum.unique = IdentityMetadata.uuid());
    });
    basic(storage, 'thing', testCredentials, alternateCredentials, payloadData,
          {minimumRetrievalsPerMS: 0.45, expectedRetrievalsPerMS: 1,
           minimumSavesPerMS: 0.45, expectedSavesPerMS: 0.9});
    describe('can be restricted', function () {
      it('such that only friends of the author of an authorizing composition can read.', function () {
      });
    });
  });

  describe('media endpoint', function () {
    let payload = Array.from({length: 1000}, (_, index) => ({someMedia: index, unique: 'replace when ready'}));
    beforeAll(async function () {
      await ready;
      payload.forEach(datum => datum.unique = IdentityMetadata.uuid());
    });
    basic(storage, 'media', testCredentials, alternateCredentials, payload,
          {minimumRetrievalsPerMS: 0.6, expectedRetrievalsPerMS: 1,
           minimumSavesPerMS: 0.5, expectedSavesPerMS: 0.9,
           ownerIsStored: false});
    describe('can be restricted', function () {
      it('such that only friends of the author of an authorizing composition can read.', function () {
      });
    });
    function media(mime, extension, blobAccessor, payloadOrPromise) {
      describe(mime, function () {
        it('can be stored yielding confirmable tag, and read as blob or mime.', async function () {
          let payload = await payloadOrPromise,
              written = await storage.save({collection: 'media', payload, mime}),
              tag = written.tag,
              mimeRead = await storage.retrieve({collection: 'media', tag, extension}),
              blobRead = await storage.retrieveBlob('media', tag, extension);
          expect(tag).toBe(await IdentityMetadata.hashDigest(payload));
          expect(mimeRead).toEqual(payload);
          expect(blobRead.type).toContain(mime);
          expect(await blobRead[blobAccessor]()).toEqual(payload);
        });
        xit('allows XXX bytes/second while reading.', async function () {
        });
        xit('allows XXX bytes/second while writing.', async function () {
        });
      });
    }
    media('text/plain', 'txt', 'text',
          "The quick brown fox jumps over the lazy dog.");
    media('image/png', 'png', 'arrayBuffer',
          fetch('/images/kilroy-1k2.png').then(r => r.arrayBuffer()));
  });
});
