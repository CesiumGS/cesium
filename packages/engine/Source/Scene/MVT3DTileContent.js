// @ts-check
import Empty3DTileContent from "./Empty3DTileContent.js";
import VectorGltf3DTileContent from "./VectorGltf3DTileContent.js";
import buildVectorGltfFromDecodedTile from "./buildVectorGltfFromDecodedTile.js";
import decodeMVT from "./decodeMVT.js";
import defined from "../Core/defined.js";
/** @import Cesium3DTile from "./Cesium3DTile.js"; */
/** @import Cesium3DTileset from "./Cesium3DTileset.js"; */
/** @import Resource from "../Core/Resource.js"; */

/**
 * Mapbox Vector Tile content adapter for 3D Tiles runtime.
 *
 * @alias MVT3DTileContent
 * @constructor
 * @private
 */
function MVT3DTileContent() {}

/**
 * @param {Cesium3DTileset} tileset
 * @param {Cesium3DTile} tile
 * @param {Resource} resource
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<Empty3DTileContent|VectorGltf3DTileContent>}
 */
MVT3DTileContent.fromArrayBuffer = async function (
  tileset,
  tile,
  resource,
  arrayBuffer,
) {
  const bytes = new Uint8Array(arrayBuffer);
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    arrayBuffer = await decompressGzip(arrayBuffer);
  }

  const decodedTile = decodeMVT(arrayBuffer);
  const tileCoordinates = parseTileCoordinates(resource.getUrlComponent(true));
  const gltf = buildVectorGltfFromDecodedTile(decodedTile, tileCoordinates);
  if (!defined(gltf)) {
    return new Empty3DTileContent(tileset, tile);
  }

  return VectorGltf3DTileContent.fromGltf(tileset, tile, resource, gltf);
};

/**
 * @param {string} url
 * @returns {{tileZ:number, tileX:number, tileY:number}}
 */
function parseTileCoordinates(url) {
  const match = url.match(/\/(\d+)\/(\d+)\/(\d+)\.(?:pbf|mvt)(?:[?#]|$)/i);
  if (!match) {
    return { tileZ: 0, tileX: 0, tileY: 0 };
  }
  return {
    tileZ: parseInt(match[1], 10),
    tileX: parseInt(match[2], 10),
    tileY: parseInt(match[3], 10),
  };
}

/**
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<ArrayBuffer>}
 */
async function decompressGzip(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  if (typeof DecompressionStream === "function") {
    try {
      const stream = new Blob([bytes])
        .stream()
        .pipeThrough(new DecompressionStream("gzip"));
      return await new Response(stream).arrayBuffer();
    } catch {
      // Fall through to pako.
    }
  }

  const { inflate } = await import("pako");
  const out = inflate(bytes);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
}

export default MVT3DTileContent;
