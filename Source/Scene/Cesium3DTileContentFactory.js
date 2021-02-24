import Batched3DModel3DTileContent from "./Batched3DModel3DTileContent.js";
import Composite3DTileContent from "./Composite3DTileContent.js";
import Geometry3DTileContent from "./Geometry3DTileContent.js";
import Instanced3DModel3DTileContent from "./Instanced3DModel3DTileContent.js";
import PointCloud3DTileContent from "./PointCloud3DTileContent.js";
import Tileset3DTileContent from "./Tileset3DTileContent.js";
import Vector3DTileContent from "./Vector3DTileContent.js";

/**
 * Maps a tile's magic field in its header to a new content object for the tile's payload.
 *
 * @private
 */
var Cesium3DTileContentFactory = {
  b3dm: function (tileset, tile, resource, arrayBuffer, byteOffset) {
    return new Batched3DModel3DTileContent(
      tileset,
      tile,
      resource,
      arrayBuffer,
      byteOffset
    );
  },
  pnts: function (tileset, tile, resource, arrayBuffer, byteOffset) {
    return new PointCloud3DTileContent(
      tileset,
      tile,
      resource,
      arrayBuffer,
      byteOffset
    );
  },
  i3dm: function (tileset, tile, resource, arrayBuffer, byteOffset) {
    return new Instanced3DModel3DTileContent(
      tileset,
      tile,
      resource,
      arrayBuffer,
      byteOffset
    );
  },
  cmpt: function (tileset, tile, resource, arrayBuffer, byteOffset) {
    // Send in the factory in order to avoid a cyclical dependency
    return new Composite3DTileContent(
      tileset,
      tile,
      resource,
      arrayBuffer,
      byteOffset,
      Cesium3DTileContentFactory
    );
  },
  json: function (tileset, tile, resource, arrayBuffer, byteOffset) {
    return new Tileset3DTileContent(
      tileset,
      tile,
      resource,
      arrayBuffer,
      byteOffset
    );
  },
  geom: function (tileset, tile, resource, arrayBuffer, byteOffset) {
    return new Geometry3DTileContent(
      tileset,
      tile,
      resource,
      arrayBuffer,
      byteOffset
    );
  },
  vctr: function (tileset, tile, resource, arrayBuffer, byteOffset) {
    return new Vector3DTileContent(
      tileset,
      tile,
      resource,
      arrayBuffer,
      byteOffset
    );
  },
};
export default Cesium3DTileContentFactory;
