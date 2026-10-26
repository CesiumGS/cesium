function isTypedArray(o) {
  return ArrayBuffer.isView(o) && !(o instanceof DataView);
}

function typedArrayToArray(array) {
  if (array !== null && typeof array === "object" && isTypedArray(array)) {
    return Array.prototype.slice.call(array, 0);
  }
  return array;
}

function equals(util, a, b) {
  a = typedArrayToArray(a);
  b = typedArrayToArray(b);
  return util.equals(a, b);
}
export default equals;
