import {IdentityMetadata, ready} from "../identityMetadata.mjs";

describe('Identity storage', function () {
  beforeAll(async function () {
    await ready;
  });
  describe('basics', function () {
    let someObject = {foo: 123, bar: "a string", baz: {red: true, white: [1.2, "foo"], blue: 17}};
    it('accepts an identity object.', function () {
      let identity = new IdentityMetadata(someObject);
      expect(identity.identityData).toEqual(someObject);
    });
    it('can a non-identity object.', function () {
      let identityData = {foo: 42},
          identity = new IdentityMetadata(identityData, someObject);
      expect(identity.identityData).toEqual(identityData);
      expect(identity.nonIdentityData).toEqual(someObject);
    });
    it('produces a hash of identity, ignoring non-identity data.', async function () {
      let identity = new IdentityMetadata(someObject),
          sameIdentity = new IdentityMetadata(someObject, {otherData: 17}),
          differentIdentity = new IdentityMetadata({something: "else"}),
          tag = await identity.getIdentityHashDigest();
      expect(tag).toBe(await sameIdentity.getIdentityHashDigest());
      expect(await tag).not.toBe(await differentIdentity.getIdentityHashDigest());
      expect(await tag.length).toBeLessThanOrEqual(44);
    });
    it('can combine identity and non-identity data', function () {
      let identity = {foo: 17},
          nonIdentity = {otherData: 42},
          metadata = new IdentityMetadata(identity, nonIdentity),
          combined = metadata.getCombinedData();
      expect(metadata.identityData).toEqual(identity);
      expect(metadata.nonIdentityData).toEqual(nonIdentity);
      expect(combined.foo).toBe(identity.foo);
      expect(combined.bar).toBe(nonIdentity.bar); 
    });
    describe('serialization', function () {
      function testSerialization (label, nonIdentityData = undefined, privateData = undefined) {
        it(label, async function () {
          let identity = new IdentityMetadata(someObject, nonIdentityData, privateData),
              serialized = identity.toSerialization(),
              parsed = IdentityMetadata.fromSerialization(serialized);
          expect(parsed.identityData).toEqual(someObject);
          expect(parsed.nonIdentityData).toEqual(nonIdentityData || {}); // Not undefined
          expect(parsed.privateData).toEqual(privateData || {});        
        });
      }
      testSerialization('can be serialized and remade without nonIdentityData.');
      testSerialization('can be serialized and remade with nonIdentityData.', {otherData: 42});
      testSerialization('can be serialized and remade with privateData.', {otherData: 19}, {password: 'secret'});            
    });
  });
});
