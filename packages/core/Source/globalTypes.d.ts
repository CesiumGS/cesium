/**
 * Utility function providing TypeScript's `keyof` behavior, which otherwise
 * wouldn't be compatible with tsd-jsdoc.
 */
export type KeyOf<T> = keyof T;
