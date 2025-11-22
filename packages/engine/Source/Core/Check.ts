import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";

function getUndefinedErrorMessage(name: string): string {
  return `${name} is required, actual value was undefined`;
}

function getFailedTypeErrorMessage(actual: string, expected: string, name: string): string {
  return `Expected ${name} to be typeof ${expected}, actual typeof was ${actual}`;
}

/**
 * Type checking functions for numbers with additional constraints
 */
interface NumberCheck {
  (name: string, test: any): void;
  lessThan: (name: string, test: any, limit: number) => void;
  lessThanOrEquals: (name: string, test: any, limit: number) => void;
  greaterThan: (name: string, test: any, limit: number) => void;
  greaterThanOrEquals: (name: string, test: any, limit: number) => void;
  equals: (name1: string, name2: string, test1: any, test2: any) => void;
}

/**
 * Contains type checking functions, all using the typeof operator
 */
interface TypeOf {
  func: (name: string, test: any) => void;
  string: (name: string, test: any) => void;
  number: NumberCheck;
  object: (name: string, test: any) => void;
  bool: (name: string, test: any) => void;
  bigint: (name: string, test: any) => void;
}

/**
 * Contains functions for checking that supplied arguments are of a specified type
 * or meet specified conditions
 */
interface CheckInterface {
  typeOf: TypeOf;
  defined: (name: string, test: any) => void;
}

// Create the number check function with additional methods
const numberCheck = function (name: string, test: any): void {
  if (typeof test !== "number") {
    throw new DeveloperError(
      getFailedTypeErrorMessage(typeof test, "number", name)
    );
  }
} as NumberCheck;

numberCheck.lessThan = function (name: string, test: any, limit: number): void {
  numberCheck(name, test);
  if (test >= limit) {
    throw new DeveloperError(
      `Expected ${name} to be less than ${limit}, actual value was ${test}`
    );
  }
};

numberCheck.lessThanOrEquals = function (name: string, test: any, limit: number): void {
  numberCheck(name, test);
  if (test > limit) {
    throw new DeveloperError(
      `Expected ${name} to be less than or equal to ${limit}, actual value was ${test}`
    );
  }
};

numberCheck.greaterThan = function (name: string, test: any, limit: number): void {
  numberCheck(name, test);
  if (test <= limit) {
    throw new DeveloperError(
      `Expected ${name} to be greater than ${limit}, actual value was ${test}`
    );
  }
};

numberCheck.greaterThanOrEquals = function (name: string, test: any, limit: number): void {
  numberCheck(name, test);
  if (test < limit) {
    throw new DeveloperError(
      `Expected ${name} to be greater than or equal to ${limit}, actual value was ${test}`
    );
  }
};

numberCheck.equals = function (name1: string, name2: string, test1: any, test2: any): void {
  numberCheck(name1, test1);
  numberCheck(name2, test2);
  if (test1 !== test2) {
    throw new DeveloperError(
      `${name1} must be equal to ${name2}, the actual values are ${test1} and ${test2}`
    );
  }
};

/**
 * Contains functions for checking that supplied arguments are of a specified type
 * or meet specified conditions
 */
const Check: CheckInterface = {
  typeOf: {
    /**
     * Throws if test is not typeof 'function'
     */
    func: function (name: string, test: any): void {
      if (typeof test !== "function") {
        throw new DeveloperError(
          getFailedTypeErrorMessage(typeof test, "function", name)
        );
      }
    },

    /**
     * Throws if test is not typeof 'string'
     */
    string: function (name: string, test: any): void {
      if (typeof test !== "string") {
        throw new DeveloperError(
          getFailedTypeErrorMessage(typeof test, "string", name)
        );
      }
    },

    /**
     * Throws if test is not typeof 'number'
     */
    number: numberCheck,

    /**
     * Throws if test is not typeof 'object'
     */
    object: function (name: string, test: any): void {
      if (typeof test !== "object") {
        throw new DeveloperError(
          getFailedTypeErrorMessage(typeof test, "object", name)
        );
      }
    },

    /**
     * Throws if test is not typeof 'boolean'
     */
    bool: function (name: string, test: any): void {
      if (typeof test !== "boolean") {
        throw new DeveloperError(
          getFailedTypeErrorMessage(typeof test, "boolean", name)
        );
      }
    },

    /**
     * Throws if test is not typeof 'bigint'
     */
    bigint: function (name: string, test: any): void {
      if (typeof test !== "bigint") {
        throw new DeveloperError(
          getFailedTypeErrorMessage(typeof test, "bigint", name)
        );
      }
    },
  },

  /**
   * Throws if test is not defined
   */
  defined: function (name: string, test: any): void {
    if (!defined(test)) {
      throw new DeveloperError(getUndefinedErrorMessage(name));
    }
  },
};

export default Check;
