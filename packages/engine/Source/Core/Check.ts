import { defined } from "./defined.js";
import { DeveloperError } from "./DeveloperError.js";

function getUndefinedErrorMessage(name: string): string {
  return `${name} is required, actual value was undefined`;
}

function getFailedTypeErrorMessage(
  actual: string,
  expected: string,
  name: string
): string {
  return `Expected ${name} to be typeof ${expected}, actual typeof was ${actual}`;
}

/**
 * Type checking functions for number with comparison operations.
 */
interface NumberCheck {
  (name: string, test: unknown): asserts test is number;
  lessThan(name: string, test: unknown, limit: number): asserts test is number;
  lessThanOrEquals(name: string, test: unknown, limit: number): asserts test is number;
  greaterThan(name: string, test: unknown, limit: number): asserts test is number;
  greaterThanOrEquals(name: string, test: unknown, limit: number): asserts test is number;
  equals(name1: string, name2: string, test1: unknown, test2: unknown): void;
}

/**
 * Type checking functions using the typeof operator.
 */
interface TypeOf {
  func(name: string, test: unknown): asserts test is Function;
  string(name: string, test: unknown): asserts test is string;
  number: NumberCheck;
  object(name: string, test: unknown): asserts test is object;
  bool(name: string, test: unknown): asserts test is boolean;
  bigint(name: string, test: unknown): asserts test is bigint;
}

/**
 * Contains functions for checking that supplied arguments are of a specified type
 * or meet specified conditions.
 */
interface CheckInterface {
  defined<T>(name: string, test: T | undefined | null): asserts test is T;
  typeOf: TypeOf;
}

/**
 * Contains functions for checking that supplied arguments are of a specified type
 * or meet specified conditions.
 */
const Check: CheckInterface = {
  /**
   * Throws if test is not defined.
   *
   * @param name - The name of the variable being tested.
   * @param test - The value that is to be checked.
   * @throws {DeveloperError} test must be defined.
   */
  defined<T>(name: string, test: T | undefined | null): asserts test is T {
    if (!defined(test)) {
      throw new DeveloperError(getUndefinedErrorMessage(name));
    }
  },

  typeOf: {} as TypeOf,
};

/**
 * Throws if test is not typeof 'function'.
 *
 * @param name - The name of the variable being tested.
 * @param test - The value to test.
 * @throws {DeveloperError} test must be typeof 'function'.
 */
Check.typeOf.func = function (
  name: string,
  test: unknown
): asserts test is Function {
  if (typeof test !== "function") {
    throw new DeveloperError(
      getFailedTypeErrorMessage(typeof test, "function", name)
    );
  }
};

/**
 * Throws if test is not typeof 'string'.
 *
 * @param name - The name of the variable being tested.
 * @param test - The value to test.
 * @throws {DeveloperError} test must be typeof 'string'.
 */
Check.typeOf.string = function (
  name: string,
  test: unknown
): asserts test is string {
  if (typeof test !== "string") {
    throw new DeveloperError(
      getFailedTypeErrorMessage(typeof test, "string", name)
    );
  }
};

/**
 * Throws if test is not typeof 'number'.
 *
 * @param name - The name of the variable being tested.
 * @param test - The value to test.
 * @throws {DeveloperError} test must be typeof 'number'.
 */
const numberCheck = function (
  name: string,
  test: unknown
): asserts test is number {
  if (typeof test !== "number") {
    throw new DeveloperError(
      getFailedTypeErrorMessage(typeof test, "number", name)
    );
  }
} as NumberCheck;

/**
 * Throws if test is not typeof 'number' and less than limit.
 *
 * @param name - The name of the variable being tested.
 * @param test - The value to test.
 * @param limit - The limit value to compare against.
 * @throws {DeveloperError} test must be typeof 'number' and less than limit.
 */
numberCheck.lessThan = function (
  name: string,
  test: unknown,
  limit: number
): asserts test is number {
  numberCheck(name, test);
  if (test >= limit) {
    throw new DeveloperError(
      `Expected ${name} to be less than ${limit}, actual value was ${test}`
    );
  }
};

/**
 * Throws if test is not typeof 'number' and less than or equal to limit.
 *
 * @param name - The name of the variable being tested.
 * @param test - The value to test.
 * @param limit - The limit value to compare against.
 * @throws {DeveloperError} test must be typeof 'number' and less than or equal to limit.
 */
numberCheck.lessThanOrEquals = function (
  name: string,
  test: unknown,
  limit: number
): asserts test is number {
  numberCheck(name, test);
  if (test > limit) {
    throw new DeveloperError(
      `Expected ${name} to be less than or equal to ${limit}, actual value was ${test}`
    );
  }
};

/**
 * Throws if test is not typeof 'number' and greater than limit.
 *
 * @param name - The name of the variable being tested.
 * @param test - The value to test.
 * @param limit - The limit value to compare against.
 * @throws {DeveloperError} test must be typeof 'number' and greater than limit.
 */
numberCheck.greaterThan = function (
  name: string,
  test: unknown,
  limit: number
): asserts test is number {
  numberCheck(name, test);
  if (test <= limit) {
    throw new DeveloperError(
      `Expected ${name} to be greater than ${limit}, actual value was ${test}`
    );
  }
};

/**
 * Throws if test is not typeof 'number' and greater than or equal to limit.
 *
 * @param name - The name of the variable being tested.
 * @param test - The value to test.
 * @param limit - The limit value to compare against.
 * @throws {DeveloperError} test must be typeof 'number' and greater than or equal to limit.
 */
numberCheck.greaterThanOrEquals = function (
  name: string,
  test: unknown,
  limit: number
): asserts test is number {
  numberCheck(name, test);
  if (test < limit) {
    throw new DeveloperError(
      `Expected ${name} to be greater than or equal to ${limit}, actual value was ${test}`
    );
  }
};

/**
 * Throws if test1 and test2 is not typeof 'number' and not equal in value.
 *
 * @param name1 - The name of the first variable being tested.
 * @param name2 - The name of the second variable being tested against.
 * @param test1 - The value to test.
 * @param test2 - The value to test against.
 * @throws {DeveloperError} test1 and test2 should be type of 'number' and be equal in value.
 */
numberCheck.equals = function (
  name1: string,
  name2: string,
  test1: unknown,
  test2: unknown
): void {
  numberCheck(name1, test1);
  numberCheck(name2, test2);
  if (test1 !== test2) {
    throw new DeveloperError(
      `${name1} must be equal to ${name2}, the actual values are ${test1} and ${test2}`
    );
  }
};

Check.typeOf.number = numberCheck;

/**
 * Throws if test is not typeof 'object'.
 *
 * @param name - The name of the variable being tested.
 * @param test - The value to test.
 * @throws {DeveloperError} test must be typeof 'object'.
 */
Check.typeOf.object = function (
  name: string,
  test: unknown
): asserts test is object {
  if (typeof test !== "object") {
    throw new DeveloperError(
      getFailedTypeErrorMessage(typeof test, "object", name)
    );
  }
};

/**
 * Throws if test is not typeof 'boolean'.
 *
 * @param name - The name of the variable being tested.
 * @param test - The value to test.
 * @throws {DeveloperError} test must be typeof 'boolean'.
 */
Check.typeOf.bool = function (
  name: string,
  test: unknown
): asserts test is boolean {
  if (typeof test !== "boolean") {
    throw new DeveloperError(
      getFailedTypeErrorMessage(typeof test, "boolean", name)
    );
  }
};

/**
 * Throws if test is not typeof 'bigint'.
 *
 * @param name - The name of the variable being tested.
 * @param test - The value to test.
 * @throws {DeveloperError} test must be typeof 'bigint'.
 */
Check.typeOf.bigint = function (
  name: string,
  test: unknown
): asserts test is bigint {
  if (typeof test !== "bigint") {
    throw new DeveloperError(
      getFailedTypeErrorMessage(typeof test, "bigint", name)
    );
  }
};

export { Check };
export default Check;
