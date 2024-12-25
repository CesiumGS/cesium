import { Check } from "@cesium/engine";
import Cesium3DTilesInspector from "../Cesium3DTilesInspector/Cesium3DTilesInspector.js";

/**
 * A mixin which adds the {@link Cesium3DTilesInspector} widget to the {@link Viewer} widget.
 * Rather than being called directly, this function is normally passed as
 * a parameter to {@link Viewer#extend}, as shown in the example below.
 * @function
 *
 * @param {Viewer} viewer The viewer instance.
 *
 * @example
 * const viewer = new Cesium.Viewer('cesiumContainer');
 * viewer.extend(Cesium.viewerCesium3DTilesInspectorMixin);
 */
function viewerCesium3DTilesInspectorMixin(viewer) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("viewer", viewer);
  //>>includeEnd('debug');

  const container = document.createElement("div");
  container.className = "cesium-viewer-cesium3DTilesInspectorContainer";
  viewer.container.appendChild(container);
  const cesium3DTilesInspector = new Cesium3DTilesInspector(
    container,
    viewer.scene,
  );

  Object.defineProperties(viewer, {
    cesium3DTilesInspector: {
      get: function () {
        return cesium3DTilesInspector;
      },
    },
  });
}
export default viewerCesium3DTilesInspectorMixin;
