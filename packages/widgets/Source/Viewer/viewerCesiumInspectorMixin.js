import { defined, DeveloperError } from "@cesium/engine";
import CesiumInspector from "../CesiumInspector/CesiumInspector.js";

/**
 * A mixin which adds the CesiumInspector widget to the Viewer widget.
 * Rather than being called directly, this function is normally passed as
 * a parameter to {@link Viewer#extend}, as shown in the example below.
 * @function
 *
 * @param {Viewer} viewer The viewer instance.
 *
 * @exception {DeveloperError} viewer is required.
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Cesium%20Inspector.html|Cesium Sandcastle Cesium Inspector Demo}
 *
 * @example
 * const viewer = new Cesium.Viewer('cesiumContainer');
 * viewer.extend(Cesium.viewerCesiumInspectorMixin);
 */
function viewerCesiumInspectorMixin(viewer) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(viewer)) {
    throw new DeveloperError("viewer is required.");
  }
  //>>includeEnd('debug');

  const cesiumInspectorContainer = document.createElement("div");
  cesiumInspectorContainer.className = "cesium-viewer-cesiumInspectorContainer";
  viewer.container.appendChild(cesiumInspectorContainer);
  const cesiumInspector = new CesiumInspector(
    cesiumInspectorContainer,
    viewer.scene,
  );

  Object.defineProperties(viewer, {
    cesiumInspector: {
      get: function () {
        return cesiumInspector;
      },
    },
  });
}
export default viewerCesiumInspectorMixin;
