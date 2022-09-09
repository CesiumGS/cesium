import { defaultValue } from "../Source/Cesium.js";

function generateJsonBuffer(json, byteOffset, boundary) {
  let i;
  const jsonString = JSON.stringify(json);

  byteOffset = defaultValue(byteOffset, 0);
  boundary = defaultValue(boundary, 1);

  const byteLength = jsonString.length;
  const remainder = (byteOffset + byteLength) % boundary;
  const padding = remainder === 0 ? 0 : boundary - remainder;

  const buffer = new Uint8Array(byteLength + padding);

  for (i = 0; i < byteLength; ++i) {
    buffer[i] = jsonString.charCodeAt(i);
  }
  for (i = 0; i < padding; ++i) {
    buffer[byteLength + i] = 32; // Whitespace
  }

  return buffer;
}

export default generateJsonBuffer;
