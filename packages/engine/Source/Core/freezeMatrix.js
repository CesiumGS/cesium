import DeveloperError from "./DeveloperError.js";

// Deep copies all property descriptors of the provided object.
function getPropertyDescriptorMap(object) {
  /** @type {PropertyDescriptorMap} */
  const propertyDescriptorMap = {};
  let current = object;

  while (current) {
    Object.entries(Object.getOwnPropertyDescriptors(current)).forEach(
      ([name, descriptor]) => {
        if (propertyDescriptorMap[name]) {
          return;
        }
        propertyDescriptorMap[name] = descriptor;
      },
    );
    Object.getOwnPropertySymbols(current).forEach(
      // eslint-disable-next-line no-loop-func
      (symbol) => {
        if (propertyDescriptorMap[symbol]) {
          return;
        }
        propertyDescriptorMap[symbol] = {
          value: object[symbol],
          enumerable: false,
        };
      },
    );

    // Move up the prototype chain
    current = Object.getPrototypeOf(current);
    if (current.constructor.name === "Object") {
      break;
    }
  }

  return propertyDescriptorMap;
}

// Frozen Matrix option 2: Generate a true Matrix4, including all underlying Float64Array methods.
// This has 100% parity with a regular Matrix4, with the exception that calling any methods that change the underlying matrix,
// or accessing the buffer will throw a DeveloperError
/**
 * @template T
 * @param {T} matrix
 * @returns {Readonly<T>} a frozen matrix
 */
export default function freezeMatrix(matrix) {
  const properties = getPropertyDescriptorMap(matrix);
  // Get both regular and symbol keys
  for (const property of Reflect.ownKeys(properties)) {
    const descriptor = properties[property];
    // These methods manipulate directly or allow the manipulation of the underlying buffer. Make them illegal.
    if (
      ["copyWithin", "fill", "reverse", "set", "sort", "subarray"].includes(
        property,
      )
    ) {
      descriptor.value = function () {
        throw new DeveloperError(`Cannot call ${property} on a frozen Matrix`);
      };
    } else if (typeof descriptor.value === "function") {
      // Proxy all functions back onto the original matrix
      descriptor.value = descriptor.value.bind(matrix);
    }
    // Deny access the underlying buffer on the facade
    if (property === "buffer") {
      descriptor.get = function () {
        throw new DeveloperError(`Cannot access buffer of a frozen Matrix`);
      };
      delete descriptor.value;
    }
  }
  properties.toString = {
    value: matrix.toString,
  };
  properties.constructor = {
    value: matrix.constructor,
  };

  // Create a fake matrix object and map all properties of the real matrix onto it
  const fakeMatrix = Object.create(Object, properties);

  // Freeze the fake matrix object. We know have a fully compatible Matrix clone which is still backed
  // by an underlying Float64Array, but is completed frozen to external changes.
  return Object.freeze(fakeMatrix);
}
