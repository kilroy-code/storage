import errors from '@kilroy-code/utilities/errors.mjs';

export class MissingItemError extends errors.TaggedError {
  constructor(message, {tag, kind, ...properties}) {
    super(message || `${tag} is not a known ${kind}.`, {tag, kind, status: 404, ...properties});
  }
}
export class MissingCollectionError extends MissingItemError {
  constructor(message, {...properties}) {
    super(message, {kind: 'collection', ...properties});
  }
}

export default {MissingItemError, MissingCollectionError, ...errors};
