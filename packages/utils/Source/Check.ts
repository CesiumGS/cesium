import { defined, DeveloperError } from "../Source/index";

function getUndefinedErrorMessage(name: string) {
  return `${name} is required, actual value was undefined`;
}

function getFailedTypeErrorMessage(
  actual: string,
  expected: string,
  name: string,
) {
  return `Expected ${name} to be typeof ${expected}, actual typeof was ${actual}`;
}

type NumberCheck = {
  (name: string, test: any): asserts test is number;
  lessThan(name: string, test: any, limit: number): asserts test is number;
  lessThanOrEquals(
    name: string,
    test: any,
    limit: number,
  ): asserts test is number;
  greaterThan(name: string, test: any, limit: number): asserts test is number;
  greaterThanOrEquals(
    name: string,
    test: any,
    limit: number,
  ): asserts test is number;
  equals(name1: string, name2: string, test1: any, test2: any): void;
};

const numberCheck: NumberCheck = function (
  name: string,
  test: any,
): asserts test is number {
  if (typeof test !== "number") {
    throw new DeveloperError(
      getFailedTypeErrorMessage(typeof test, "number", name),
    );
  }
} as NumberCheck;

/**
 * Throws if test is not typeof 'number' and less than limit
 *
 * @param {string} name The name of the variable being tested
 * @param {*} test The value to test
 * @param {number} limit The limit value to compare against
 * @exception {DeveloperError} test must be typeof 'number' and less than limit
 */
numberCheck.lessThan = function (
  name: string,
  test: any,
  limit: number,
): asserts test is number {
  numberCheck(name, test);
  if (test >= limit) {
    throw new DeveloperError(
      `Expected ${name} to be less than ${limit}, actual value was ${test}`,
    );
  }
};

/**
 * Throws if test is not typeof 'number' and less than or equal to limit
 *
 * @param {string} name The name of the variable being tested
 * @param {*} test The value to test
 * @param {number} limit The limit value to compare against
 * @exception {DeveloperError} test must be typeof 'number' and less than or equal to limit
 */
numberCheck.lessThanOrEquals = function (
  name: string,
  test: any,
  limit: number,
): asserts test is number {
  numberCheck(name, test);
  if (test > limit) {
    throw new DeveloperError(
      `Expected ${name} to be less than or equal to ${limit}, actual value was ${test}`,
    );
  }
};

/**
 * Throws if test is not typeof 'number' and greater than limit
 *
 * @param {string} name The name of the variable being tested
 * @param {*} test The value to test
 * @param {number} limit The limit value to compare against
 * @exception {DeveloperError} test must be typeof 'number' and greater than limit
 */
numberCheck.greaterThan = function (
  name: string,
  test: any,
  limit: number,
): asserts test is number {
  numberCheck(name, test);
  if (test <= limit) {
    throw new DeveloperError(
      `Expected ${name} to be greater than ${limit}, actual value was ${test}`,
    );
  }
};

/**
 * Throws if test is not typeof 'number' and greater than or equal to limit
 *
 * @param {string} name The name of the variable being tested
 * @param {*} test The value to test
 * @param {number} limit The limit value to compare against
 * @exception {DeveloperError} test must be typeof 'number' and greater than or equal to limit
 */
numberCheck.greaterThanOrEquals = function (
  name: string,
  test: any,
  limit: number,
): asserts test is number {
  numberCheck(name, test);
  if (test < limit) {
    throw new DeveloperError(
      `Expected ${name} to be greater than or equal to ${limit}, actual value was ${test}`,
    );
  }
};

/**
 * Throws if test1 and test2 is not typeof 'number' and not equal in value
 *
 * @param {string} name1 The name of the first variable being tested
 * @param {string} name2 The name of the second variable being tested against
 * @param {*} test1 The value to test
 * @param {*} test2 The value to test against
 * @exception {DeveloperError} test1 and test2 should be type of 'number' and be equal in value
 */
numberCheck.equals = function (
  name1: string,
  name2: string,
  test1: any,
  test2: any,
): void {
  numberCheck(name1, test1);
  numberCheck(name2, test2);
  if (test1 !== test2) {
    throw new DeveloperError(
      `${name1} must be equal to ${name2}, the actual values are ${test1} and ${test2}`,
    );
  }
};

type CheckType = {
  defined<T>(name: string, test: T): asserts test is NonNullable<T>;
  typeOf: {
    string(name: string, test: any): asserts test is string;
    func(name: string, test: any): asserts test is Function;
    object(name: string, test: any): asserts test is object;
    bool(name: string, test: any): asserts test is boolean;
    bigint(name: string, test: any): asserts test is bigint;
    number: NumberCheck;
  };
};

/**
 * Contains functions for checking that supplied arguments are of a specified type
 * or meet specified conditions
 */
const Check: CheckType = {
  /**
   * Throws if test is not defined
   *
   * @param {string} name The name of the variable being tested
   * @param {*} test The value that is to be checked
   * @exception {DeveloperError} test must be defined
   */
  defined<T>(name: string, test: T): asserts test is NonNullable<T> {
    if (!defined(test)) {
      throw new DeveloperError(getUndefinedErrorMessage(name));
    }
  },

  /**
   * Contains type checking functions, all using the typeof operator
   */
  typeOf: {
    /**
     * Throws if test is not typeof 'string'
     *
     * @param {string} name The name of the variable being tested
     * @param {*} test The value to test
     * @exception {DeveloperError} test must be typeof 'string'
     */
    string(name: string, test: any): asserts test is string {
      if (typeof test !== "string") {
        throw new DeveloperError(
          getFailedTypeErrorMessage(typeof test, "string", name),
        );
      }
    },

    /**
     * Throws if test is not typeof 'function'
     *
     * @param {string} name The name of the variable being tested
     * @param {*} test The value to test
     * @exception {DeveloperError} test must be typeof 'function'
     */
    func(name: string, test: any): asserts test is Function {
      if (typeof test !== "function") {
        throw new DeveloperError(
          getFailedTypeErrorMessage(typeof test, "function", name),
        );
      }
    },

    /**
     * Throws if test is not typeof 'object'
     *
     * @param {string} name The name of the variable being tested
     * @param {*} test The value to test
     * @exception {DeveloperError} test must be typeof 'object'
     */
    object(
      name: string,
      test: any,
    ): asserts test is Record<string | number | symbol, any> {
      if (typeof test !== "object" || test === null) {
        throw new DeveloperError(
          getFailedTypeErrorMessage(typeof test, "object", name),
        );
      }
    },

    /**
     * Throws if test is not typeof 'boolean'
     *
     * @param {string} name The name of the variable being tested
     * @param {*} test The value to test
     * @exception {DeveloperError} test must be typeof 'boolean'
     */
    bool(name: string, test: any): asserts test is boolean {
      if (typeof test !== "boolean") {
        throw new DeveloperError(
          getFailedTypeErrorMessage(typeof test, "boolean", name),
        );
      }
    },

    /**
     * Throws if test is not typeof 'bigint'
     *
     * @param {string} name The name of the variable being tested
     * @param {*} test The value to test
     * @exception {DeveloperError} test must be typeof 'bigint'
     */
    bigint(name: string, test: any): asserts test is bigint {
      if (typeof test !== "bigint") {
        throw new DeveloperError(
          getFailedTypeErrorMessage(typeof test, "bigint", name),
        );
      }
    },

    /**
     * Throws if test is not typeof 'number'
     *
     * @param {string} name The name of the variable being tested
     * @param {*} test The value to test
     * @exception {DeveloperError} test must be typeof 'number'
     */
    number: numberCheck,
  },
};

export default Check;
