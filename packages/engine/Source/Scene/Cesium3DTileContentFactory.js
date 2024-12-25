import Composite3DTileContent from "./Composite3DTileContent.js";
import Geometry3DTileContent from "./Geometry3DTileContent.js";
import Implicit3DTileContent from "./Implicit3DTileContent.js";
import Model3DTileContent from "./Model/Model3DTileContent.js";
import Tileset3DTileContent from "./Tileset3DTileContent.js";
import Vector3DTileContent from "./Vector3DTileContent.js";
import RuntimeError from "../Core/RuntimeError.js";

/**
 * Maps a tile's magic field in its header to a new content object for the tile's payload.
 *
 * @private
 */
const Cesium3DTileContentFactory = {
  b3dm: function (tileset, tile, resource, arrayBuffer, byteOffset) {
    return Model3DTileContent.fromB3dm(
      tileset,
      tile,
      resource,
      arrayBuffer,
      byteOffset,
    );
  },
  pnts: function (tileset, tile, resource, arrayBuffer, byteOffset) {
    return Model3DTileContent.fromPnts(
      tileset,
      tile,
      resource,
      arrayBuffer,
      byteOffset,
    );
  },
  i3dm: function (tileset, tile, resource, arrayBuffer, byteOffset) {
    return Model3DTileContent.fromI3dm(
      tileset,
      tile,
      resource,
      arrayBuffer,
      byteOffset,
    );
  },
  cmpt: function (tileset, tile, resource, arrayBuffer, byteOffset) {
    // Send in the factory in order to avoid a cyclical dependency
    return Composite3DTileContent.fromTileType(
      tileset,
      tile,
      resource,
      arrayBuffer,
      byteOffset,
      Cesium3DTileContentFactory,
    );
  },
  externalTileset: function (tileset, tile, resource, json) {
    return Tileset3DTileContent.fromJson(tileset, tile, resource, json);
  },
  geom: function (tileset, tile, resource, arrayBuffer, byteOffset) {
    return new Geometry3DTileContent(
      tileset,
      tile,
      resource,
      arrayBuffer,
      byteOffset,
    );
  },
  vctr: function (tileset, tile, resource, arrayBuffer, byteOffset) {
    return new Vector3DTileContent(
      tileset,
      tile,
      resource,
      arrayBuffer,
      byteOffset,
    );
  },
  subt: function (tileset, tile, resource, arrayBuffer, byteOffset) {
    return Implicit3DTileContent.fromSubtreeJson(
      tileset,
      tile,
      resource,
      undefined,
      arrayBuffer,
      byteOffset,
    );
  },
  subtreeJson: function (tileset, tile, resource, json) {
    return Implicit3DTileContent.fromSubtreeJson(tileset, tile, resource, json);
  },
  glb: function (tileset, tile, resource, arrayBuffer, byteOffset) {
    const arrayBufferByteLength = arrayBuffer.byteLength;
    if (arrayBufferByteLength < 12) {
      throw new RuntimeError("Invalid glb content");
    }
    const dataView = new DataView(arrayBuffer, byteOffset);
    const byteLength = dataView.getUint32(8, true);
    const glb = new Uint8Array(arrayBuffer, byteOffset, byteLength);
    return Model3DTileContent.fromGltf(tileset, tile, resource, glb);
  },
  gltf: function (tileset, tile, resource, json) {
    return Model3DTileContent.fromGltf(tileset, tile, resource, json);
  },
  geoJson: function (tileset, tile, resource, json) {
    return Model3DTileContent.fromGeoJson(tileset, tile, resource, json);
  },
};
export default Cesium3DTileContentFactory;
