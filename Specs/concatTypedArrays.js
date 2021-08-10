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
    var array = arrays[i];
    var data = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    buffer.set(data, byteOffset);
    byteOffset += data.length;
  }
  return buffer;
}
