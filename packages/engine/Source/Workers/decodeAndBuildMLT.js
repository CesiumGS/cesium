import createTaskProcessorWorker from "./createTaskProcessorWorker.js";
import decodeMLT from "../Scene/decodeMLT.js";
import buildVectorTileBuffers, {
  collectVectorBufferTransferables,
} from "../Scene/buildVectorTileBuffers.js";
import { buildVectorGltfFromBuffers } from "../Scene/buildVectorGltfFromMVT.js";

/**
 * Worker function that decodes an MLT tile and builds either transferable
 * vector geometry buffers (direct path) or a glTF binary (legacy/reference path).
 *
 * @param {object} parameters
 * @param {ArrayBuffer} parameters.arrayBuffer The raw MLT tile binary.
 * @param {number} parameters.tileX Tile X coordinate.
 * @param {number} parameters.tileY Tile Y coordinate.
 * @param {number} parameters.tileZ Tile Z coordinate.
 * @param {string} [parameters.featureIdProperty] Property name to use as feature ID.
 * @param {"buffers"|"glb"} [parameters.outputFormat="buffers"] Output format.
 * @param {ArrayBuffer[]} transferableObjects Buffers to transfer back (zero-copy).
 * @returns {object|undefined} `{ geometry }` or `{ glb }`, or undefined if the
 *   tile contains no geometry.
 */
function decodeAndBuildMLT(parameters, transferableObjects) {
  const decodedTile = decodeMLT(parameters.arrayBuffer);

  const tileCoordinates = {
    tileX: parameters.tileX,
    tileY: parameters.tileY,
    tileZ: parameters.tileZ,
  };

  const geometry = buildVectorTileBuffers(decodedTile, tileCoordinates, {
    featureIdProperty: parameters.featureIdProperty,
  });

  if (!geometry) {
    return undefined;
  }

  if (parameters.outputFormat === "glb") {
    const glb = buildVectorGltfFromBuffers(geometry);
    if (glb) {
      transferableObjects.push(glb.buffer);
    }
    return { glb: glb };
  }

  collectVectorBufferTransferables(geometry, transferableObjects);
  return { geometry: geometry };
}

export default createTaskProcessorWorker(decodeAndBuildMLT);
