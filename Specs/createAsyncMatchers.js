import { defined, DeveloperError } from "@cesium/core";

function makeAsyncThrowFunction(debug, Type, name) {
  if (debug) {
    return function (util) {
      return {
        compare: function (actualPromise, message) {
          if (!defined(actualPromise) || !defined(actualPromise.then)) {
            throw new Error("Expected function to be called on a promise.");
          }

          return actualPromise
            .then(() => {
              return {
                pass: false,
                message:
                  "Expected a promise to be rejected but it was resolved.",
              };
            })
            .catch((e) => {
              let result = e instanceof Type || e.name === name;
              if (defined(message)) {
                if (typeof message === "string") {
                  result = result && e.message === message;
                } else {
                  result = result && message.test(e.message);
                }
              }
              return {
                pass: result,
                message: result
                  ? `Expected a promise to be rejected with ${name}.`
                  : `Expected a promise to be rejected with ${
                      defined(message) ? `${name}: ${message}` : name
                    }, but it was rejected with ${e}`,
              };
            });
        },
      };
    };
  }

  return function () {
    return {
      compare: function (actualPromise) {
        return Promise.resolve(actualPromise)
          .then(() => {
            return { pass: true };
          })
          .catch((e) => {
            return { pass: true };
          });
      },
      negativeCompare: function (actualPromise) {
        return Promise.resolve(actualPromise)
          .then(() => {
            return { pass: true };
          })
          .catch((e) => {
            return { pass: true };
          });
      },
    };
  };
}

export function createAsyncMatchers(debug) {
  return {
    toBeRejectedWithDeveloperError: makeAsyncThrowFunction(
      debug,
      DeveloperError,
      "DeveloperError",
    ),
  };
}
