// @ts-check

import ForEach from "./ForEach.js";

/** @import { ForEachElementHandler } from "./ForEach.js"; */

/**
 * Calls the handler with each buffer in a glTF.
 *
 * @param {*} gltf A javascript object containing a glTF asset.
 * @param {ForEachElementHandler} handler Called with each buffer.
 * @returns {*} The first defined value returned by the handler.
 *
 * @internal
 */
function forEachBuffer(gltf, handler) {
  return ForEach.buffer(gltf, handler);
}

export default forEachBuffer;
