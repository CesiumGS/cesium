export default function concatTypedArrays(arrays) {
  let i;
  const length = arrays.length;

  let byteLength = 0;
  for (i = 0; i < length; ++i) {
    byteLength += arrays[i].byteLength;
  }
  const buffer = new Uint8Array(byteLength);

  let byteOffset = 0;
  for (i = 0; i < length; ++i) {
    const array = arrays[i];
    const data = new Uint8Array(
      array.buffer,
      array.byteOffset,
      array.byteLength
    );
    buffer.set(data, byteOffset);
    byteOffset += data.length;
  }
  return buffer;
}
