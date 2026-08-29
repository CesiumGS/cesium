import { defined, DeveloperError } from "@cesium/core";
import equals from "./equals.js";

function createMissingFunctionMessageFunction(
  item,
  actualPrototype,
  expectedInterfacePrototype,
) {
  return function () {
    return `Expected function '${item}' to exist on ${actualPrototype.constructor.name} because it should implement interface ${expectedInterfacePrototype.constructor.name}.`;
  };
}

function makeThrowFunction(debug, Type, name) {
  if (debug) {
    return function (util) {
      return {
        compare: function (actual, message) {
          // based on the built-in Jasmine toThrow matcher
          let result = false;
          let exception;

          if (typeof actual !== "function") {
            throw new Error("Actual is not a function");
          }

          try {
            actual();
          } catch (e) {
            exception = e;
          }

          if (exception) {
            result = exception instanceof Type || exception.name === name;
          }
          if (defined(message)) {
            if (typeof message === "string") {
              result = result && exception.message === message;
            } else {
              result = result && message.test(exception.message);
            }
          }

          let testMessage;
          if (result) {
            testMessage = `Expected function not to throw ${name} , but it threw ${exception.message || exception}`;
          } else {
            testMessage = defined(message)
              ? `Expected to throw with ${name}: ${message}, but it was thrown with ${exception}`
              : `Expected function to throw with ${name}.`;
          }

          return {
            pass: result,
            message: testMessage,
          };
        },
      };
    };
  }

  return function () {
    return {
      compare: function (actual, expected) {
        return { pass: true };
      },
      negativeCompare: function (actual, expected) {
        return { pass: true };
      },
    };
  };
}

function isTypedArray(o) {
  return ArrayBuffer.isView(o) && !(o instanceof DataView);
}

function typedArrayToArray(array) {
  if (isTypedArray(array)) {
    return Array.prototype.slice.call(array, 0);
  }
  return array;
}

export function createBaseMatchers(debug) {
  return {
    toBeBetween: function (util) {
      return {
        compare: function (actual, lower, upper) {
          if (lower > upper) {
            const tmp = upper;
            upper = lower;
            lower = tmp;
          }
          return { pass: actual >= lower && actual <= upper };
        },
      };
    },

    toStartWith: function (util) {
      return {
        compare: function (actual, expected) {
          return { pass: actual.slice(0, expected.length) === expected };
        },
      };
    },

    toEndWith: function (util) {
      return {
        compare: function (actual, expected) {
          return { pass: actual.slice(-expected.length) === expected };
        },
      };
    },

    toEqual: function (util) {
      return {
        compare: function (actual, expected) {
          return {
            pass: equals(util, actual, expected),
          };
        },
      };
    },

    toEqualEpsilon: function (util) {
      return {
        compare: function (actual, expected, epsilon) {
          function equalityTester(a, b) {
            a = typedArrayToArray(a);
            b = typedArrayToArray(b);
            if (Array.isArray(a) && Array.isArray(b)) {
              if (a.length !== b.length) {
                return false;
              }

              for (let i = 0; i < a.length; ++i) {
                if (!equalityTester(a[i], b[i])) {
                  return false;
                }
              }

              return true;
            }

            let to_run;
            if (defined(a)) {
              if (typeof a.equalsEpsilon === "function") {
                return a.equalsEpsilon(b, epsilon);
              } else if (a instanceof Object) {
                to_run = Object.getPrototypeOf(a).constructor.equalsEpsilon;
                if (typeof to_run === "function") {
                  return to_run(a, b, epsilon);
                }
              }
            }

            if (defined(b)) {
              if (typeof b.equalsEpsilon === "function") {
                return b.equalsEpsilon(a, epsilon);
              } else if (b instanceof Object) {
                to_run = Object.getPrototypeOf(b).constructor.equalsEpsilon;
                if (typeof to_run === "function") {
                  return to_run(b, a, epsilon);
                }
              }
            }

            if (typeof a === "number" || typeof b === "number") {
              return Math.abs(a - b) <= epsilon;
            }

            if (defined(a) && defined(b)) {
              const keys = Object.keys(a);
              for (let i = 0; i < keys.length; i++) {
                if (!b.hasOwnProperty(keys[i])) {
                  return false;
                }
                const aVal = a[keys[i]];
                const bVal = b[keys[i]];
                if (!equalityTester(aVal, bVal)) {
                  return false;
                }
              }
              return true;
            }

            return equals(util, a, b);
          }

          const result = equalityTester(actual, expected);
          return { pass: result };
        },
      };
    },

    toConformToInterface: function (util) {
      return {
        compare: function (actual, expectedInterface) {
          const actualPrototype = actual.prototype;
          const expectedInterfacePrototype = expectedInterface.prototype;

          for (const item in expectedInterfacePrototype) {
            if (
              expectedInterfacePrototype.hasOwnProperty(item) &&
              typeof expectedInterfacePrototype[item] === "function" &&
              !actualPrototype.hasOwnProperty(item)
            ) {
              return {
                pass: false,
                message: createMissingFunctionMessageFunction(
                  item,
                  actualPrototype,
                  expectedInterfacePrototype,
                ),
              };
            }
          }

          return { pass: true };
        },
      };
    },

    toBeImageOrImageBitmap: function (util) {
      return {
        compare: function (actual) {
          if (typeof createImageBitmap !== "function") {
            return {
              pass: actual instanceof Image,
            };
          }

          return {
            pass: actual instanceof ImageBitmap || actual instanceof Image,
          };
        },
      };
    },

    toThrowDeveloperError: makeThrowFunction(
      debug,
      DeveloperError,
      "DeveloperError",
    ),
  };
}
