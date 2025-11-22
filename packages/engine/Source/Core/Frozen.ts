/**
 * Utilities helpful for setting a default value for a parameter.
 *
 * @namespace Frozen
 */
interface FrozenInterface {
  /**
   * A frozen empty object that can be used as the default value for options passed as
   * an object literal.
   */
  EMPTY_OBJECT: Readonly<Record<string, never>>;

  /**
   * A frozen empty array that can be used as the default value for options passed as
   * an array literal.
   */
  EMPTY_ARRAY: readonly never[];
}

const Frozen: FrozenInterface = {
  EMPTY_OBJECT: Object.freeze({}) as Readonly<Record<string, never>>,
  EMPTY_ARRAY: Object.freeze([]) as readonly never[],
};

export default Frozen;
