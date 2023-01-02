function dataUriToBuffer(dataUri) {
  const binaryString = atob(dataUri.split(",")[1]);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; ++i) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export default dataUriToBuffer;
