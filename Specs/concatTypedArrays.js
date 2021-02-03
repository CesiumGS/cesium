export default function concatTypedArrays(arrays) {
  var i;
  var length = arrays.length;

  var byteLength = 0;
  for (i = 0; i < length; ++i) {
    byteLength += arrays[i].byteLength;
  }
  var buffer = new Uint8Array(byteLength);

  var byteOffset = 0;
  for (i = 0; i < length; ++i) {
    var data = new Uint8Array(arrays[i].buffer);
    byteLength = data.length;
    for (var j = 0; j < byteLength; ++j) {
      buffer[byteOffset++] = data[j];
    }
  }
  return buffer;
}
