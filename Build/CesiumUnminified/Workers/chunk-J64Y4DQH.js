/**
 * @license
 * Cesium - https://github.com/CesiumGS/cesium
 * Version 1.109
 *
 * Copyright 2011-2022 Cesium Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Columbus View (Pat. Pend.)
 *
 * Portions licensed separately.
 * See https://github.com/CesiumGS/cesium/blob/main/LICENSE.md for full licensing details.
 */

import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/DeveloperError.js
function DeveloperError(message) {
  this.name = "DeveloperError";
  this.message = message;
  let stack;
  try {
    throw new Error();
  } catch (e) {
    stack = e.stack;
  }
  this.stack = stack;
}
if (defined_default(Object.create)) {
  DeveloperError.prototype = Object.create(Error.prototype);
  DeveloperError.prototype.constructor = DeveloperError;
}
DeveloperError.prototype.toString = function() {
  let str = `${this.name}: ${this.message}`;
  if (defined_default(this.stack)) {
    str += `
${this.stack.toString()}`;
  }
  return str;
};
DeveloperError.throwInstantiationError = function() {
  throw new DeveloperError(
    "This function defines an interface and should not be called directly."
  );
};
var DeveloperError_default = DeveloperError;

// packages/engine/Source/Core/Check.js
var Check = {};
Check.typeOf = {};
function getUndefinedErrorMessage(name) {
  return `${name} is required, actual value was undefined`;
}
function getFailedTypeErrorMessage(actual, expected, name) {
  return `Expected ${name} to be typeof ${expected}, actual typeof was ${actual}`;
}
Check.defined = function(name, test) {
  if (!defined_default(test)) {
    throw new DeveloperError_default(getUndefinedErrorMessage(name));
  }
};
Check.typeOf.func = function(name, test) {
  if (typeof test !== "function") {
    throw new DeveloperError_default(
      getFailedTypeErrorMessage(typeof test, "function", name)
    );
  }
};
Check.typeOf.string = function(name, test) {
  if (typeof test !== "string") {
    throw new DeveloperError_default(
      getFailedTypeErrorMessage(typeof test, "string", name)
    );
  }
};
Check.typeOf.number = function(name, test) {
  if (typeof test !== "number") {
    throw new DeveloperError_default(
      getFailedTypeErrorMessage(typeof test, "number", name)
    );
  }
};
Check.typeOf.number.lessThan = function(name, test, limit) {
  Check.typeOf.number(name, test);
  if (test >= limit) {
    throw new DeveloperError_default(
      `Expected ${name} to be less than ${limit}, actual value was ${test}`
    );
  }
};
Check.typeOf.number.lessThanOrEquals = function(name, test, limit) {
  Check.typeOf.number(name, test);
  if (test > limit) {
    throw new DeveloperError_default(
      `Expected ${name} to be less than or equal to ${limit}, actual value was ${test}`
    );
  }
};
Check.typeOf.number.greaterThan = function(name, test, limit) {
  Check.typeOf.number(name, test);
  if (test <= limit) {
    throw new DeveloperError_default(
      `Expected ${name} to be greater than ${limit}, actual value was ${test}`
    );
  }
};
Check.typeOf.number.greaterThanOrEquals = function(name, test, limit) {
  Check.typeOf.number(name, test);
  if (test < limit) {
    throw new DeveloperError_default(
      `Expected ${name} to be greater than or equal to ${limit}, actual value was ${test}`
    );
  }
};
Check.typeOf.object = function(name, test) {
  if (typeof test !== "object") {
    throw new DeveloperError_default(
      getFailedTypeErrorMessage(typeof test, "object", name)
    );
  }
};
Check.typeOf.bool = function(name, test) {
  if (typeof test !== "boolean") {
    throw new DeveloperError_default(
      getFailedTypeErrorMessage(typeof test, "boolean", name)
    );
  }
};
Check.typeOf.bigint = function(name, test) {
  if (typeof test !== "bigint") {
    throw new DeveloperError_default(
      getFailedTypeErrorMessage(typeof test, "bigint", name)
    );
  }
};
Check.typeOf.number.equals = function(name1, name2, test1, test2) {
  Check.typeOf.number(name1, test1);
  Check.typeOf.number(name2, test2);
  if (test1 !== test2) {
    throw new DeveloperError_default(
      `${name1} must be equal to ${name2}, the actual values are ${test1} and ${test2}`
    );
  }
};
var Check_default = Check;

export {
  DeveloperError_default,
  Check_default
};
