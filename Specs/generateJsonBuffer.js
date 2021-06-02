import { defaultValue } from "../Source/Cesium.js";

export default function generateJsonBuffer(json, byteOffset, boundary) {
  var i;
  var jsonString = JSON.stringify(json);

  byteOffset = defaultValue(byteOffset, 0);
  boundary = defaultValue(boundary, 1);

  var byteLength = jsonString.length;
  var remainder = (byteOffset + byteLength) % boundary;
  var padding = remainder === 0 ? 0 : boundary - remainder;

  var buffer = new Uint8Array(byteLength + padding);

  for (i = 0; i < byteLength; ++i) {
    buffer[i] = jsonString.charCodeAt(i);
  }
  for (i = 0; i < padding; ++i) {
    buffer[byteLength + i] = 32; // Whitespace
  }

  return buffer;
}
