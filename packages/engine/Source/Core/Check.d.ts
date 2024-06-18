/**
 * Contains functions for checking that supplied arguments are of a specified type
 * or meet specified conditions
 */
export const Check: {
  /**
   * Throws if test is not defined
   *
   * @param {string} name The name of the variable being tested
   * @param {*} test The value that is to be checked
   * @exception {DeveloperError} test must be defined
   */
  defined<T>(name: string, test: T): asserts test is NonNullable<T>;
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
    string(name: string, test: any): asserts test is string;
    /**
     * Throws if test is not typeof 'function'
     *
     * @param {string} name The name of the variable being tested
     * @param {*} test The value to test
     * @exception {DeveloperError} test must be typeof 'function'
     */
    func(name: string, test: any): asserts test is Function;
    /**
     * Throws if test is not typeof 'object'
     *
     * @param {string} name The name of the variable being tested
     * @param {*} test The value to test
     * @exception {DeveloperError} test must be typeof 'object'
     */
    object(name: string, test: any): asserts test is object;
    /**
     * Throws if test is not typeof 'boolean'
     *
     * @param {string} name The name of the variable being tested
     * @param {*} test The value to test
     * @exception {DeveloperError} test must be typeof 'boolean'
     */
    bool(name: string, test: any): asserts test is boolean;
    /**
     * Throws if test is not typeof 'bigint'
     *
     * @param {string} name The name of the variable being tested
     * @param {*} test The value to test
     * @exception {DeveloperError} test must be typeof 'bigint'
     */
    bigint(name: string, test: any): asserts test is bigint;
    /**
     * Throws if test is not typeof 'number'
     *
     * @param {string} name The name of the variable being tested
     * @param {*} test The value to test
     * @exception {DeveloperError} test must be typeof 'number'
     */
    number: {
      (name: string, test: any): void;
      /**
       * Throws if test is not typeof 'number' and less than limit
       *
       * @param {string} name The name of the variable being tested
       * @param {*} test The value to test
       * @param {number} limit The limit value to compare against
       * @exception {DeveloperError} test must be typeof 'number' and less than limit
       */
      lessThan(name: string, test: any, limit: number): asserts test is number;
      /**
       * Throws if test is not typeof 'number' and less than or equal to limit
       *
       * @param {string} name The name of the variable being tested
       * @param {*} test The value to test
       * @param {number} limit The limit value to compare against
       * @exception {DeveloperError} test must be typeof 'number' and less than or equal to limit
       */
      lessThanOrEquals(
        name: string,
        test: any,
        limit: number
      ): asserts test is number;
      /**
       * Throws if test is not typeof 'number' and greater than limit
       *
       * @param {string} name The name of the variable being tested
       * @param {*} test The value to test
       * @param {number} limit The limit value to compare against
       * @exception {DeveloperError} test must be typeof 'number' and greater than limit
       */
      greaterThan(
        name: string,
        test: any,
        limit: number
      ): asserts test is number;
      /**
       * Throws if test is not typeof 'number' and greater than or equal to limit
       *
       * @param {string} name The name of the variable being tested
       * @param {*} test The value to test
       * @param {number} limit The limit value to compare against
       * @exception {DeveloperError} test must be typeof 'number' and greater than or equal to limit
       */
      greaterThanOrEquals(
        name: string,
        test: any,
        limit: number
      ): asserts test is number;
      /**
       * Throws if test1 and test2 is not typeof 'number' and not equal in value
       *
       * @param {string} name1 The name of the first variable being tested
       * @param {string} name2 The name of the second variable being tested against
       * @param {*} test1 The value to test
       * @param {*} test2 The value to test against
       * @exception {DeveloperError} test1 and test2 should be type of 'number' and be equal in value
       */
      equals(name1: string, name2: string, test1: any, test2: any): void;
    };
  };
};
