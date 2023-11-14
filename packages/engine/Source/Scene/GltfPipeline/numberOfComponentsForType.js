

/**
 * Utility function for retrieving the number of components in a given type.
 *
 * @param {string} type glTF type
 * @returns {number} The number of components in that type.
 *
 * @private
 */
function numberOfComponentsForType(type) {
  switch (type) {
    case "SCALAR":
      return 1;
    case "VEC2":
      return 2;
    case "VEC3":
      return 3;
    case "VEC4":
    case "MAT2":
      return 4;
    case "MAT3":
      return 9;
    case "MAT4":
      return 16;
  }
}

export default numberOfComponentsForType;
