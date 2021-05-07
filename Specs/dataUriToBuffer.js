export default function dataUriToBuffer(dataUri) {
  var binaryString = atob(dataUri.split(",")[1]);
  var length = binaryString.length;
  var bytes = new Uint8Array(length);
  for (var i = 0; i < length; ++i) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
