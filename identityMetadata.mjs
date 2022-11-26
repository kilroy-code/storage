export let IdentityMetadata = null; // The value of the binding CHANGES when dynamic import is fullfilled.
export const ready = new Promise(async resolve => { // Assigns IdentityMetdata AND resolves 'ready' when the dynmaic import is fullfilled.
  const module = await import((typeof window !== 'undefined') ? './identityMetadataBrowser.mjs' : './identityMetadataNode.mjs');
  resolve(IdentityMetadata = module.IdentityMetadata);
});







