import Cesium3DTilesetMostDetailedTraversal from "./Cesium3DTilesetMostDetailedTraversal.js";
import Cesium3DTilesetTraversal from "./Cesium3DTilesetTraversal.js";

/**
 * The pass in which a 3D Tileset is updated.
 *
 * @private
 */
var Cesium3DTilePass = {
  RENDER: 0,
  PICK: 1,
  SHADOW: 2,
  PRELOAD: 3,
  PRELOAD_FLIGHT: 4,
  REQUEST_RENDER_MODE_DEFER_CHECK: 5,
  MOST_DETAILED_PRELOAD: 6,
  MOST_DETAILED_PICK: 7,
  NUMBER_OF_PASSES: 8,
};

var passOptions = new Array(Cesium3DTilePass.NUMBER_OF_PASSES);

passOptions[Cesium3DTilePass.RENDER] = Object.freeze({
  traversal: Cesium3DTilesetTraversal,
  isRender: true,
  requestTiles: true,
  ignoreCommands: false,
});

passOptions[Cesium3DTilePass.PICK] = Object.freeze({
  traversal: Cesium3DTilesetTraversal,
  isRender: false,
  requestTiles: false,
  ignoreCommands: false,
});

passOptions[Cesium3DTilePass.SHADOW] = Object.freeze({
  traversal: Cesium3DTilesetTraversal,
  isRender: false,
  requestTiles: true,
  ignoreCommands: false,
});

passOptions[Cesium3DTilePass.PRELOAD] = Object.freeze({
  traversal: Cesium3DTilesetTraversal,
  isRender: false,
  requestTiles: true,
  ignoreCommands: true,
});

passOptions[Cesium3DTilePass.PRELOAD_FLIGHT] = Object.freeze({
  traversal: Cesium3DTilesetTraversal,
  isRender: false,
  requestTiles: true,
  ignoreCommands: true,
});

passOptions[Cesium3DTilePass.REQUEST_RENDER_MODE_DEFER_CHECK] = Object.freeze({
  traversal: Cesium3DTilesetTraversal,
  isRender: false,
  requestTiles: true,
  ignoreCommands: true,
});

passOptions[Cesium3DTilePass.MOST_DETAILED_PRELOAD] = Object.freeze({
  traversal: Cesium3DTilesetMostDetailedTraversal,
  isRender: false,
  requestTiles: true,
  ignoreCommands: true,
});

passOptions[Cesium3DTilePass.MOST_DETAILED_PICK] = Object.freeze({
  traversal: Cesium3DTilesetMostDetailedTraversal,
  isRender: false,
  requestTiles: false,
  ignoreCommands: false,
});

Cesium3DTilePass.getPassOptions = function (pass) {
  return passOptions[pass];
};
export default Object.freeze(Cesium3DTilePass);
