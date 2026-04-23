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
 * @private
 */
class MVT3DTileContent {
  /**
   * @param {Cesium3DTileset} tileset
   * @param {Cesium3DTile} tile
   * @param {Resource} resource
   * @param {ArrayBuffer} arrayBuffer
   * @returns {Promise<Empty3DTileContent|VectorGltf3DTileContent>}
   */
  static async fromArrayBuffer(tileset, tile, resource, arrayBuffer) {
    const decodedTile = decodeMVT(arrayBuffer);
    const tileCoordinates = parseTileCoordinates(
      resource.getUrlComponent(true),
    );
    const gltf = buildVectorGltfFromDecodedTile(decodedTile, tileCoordinates);
    if (!defined(gltf)) {
      return new Empty3DTileContent(tileset, tile);
    }

    return VectorGltf3DTileContent.fromGltf(tileset, tile, resource, gltf);
  }
}

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

export default MVT3DTileContent;
