import Check from "../../Core/Check.js";
import VoxelInspector from "../VoxelInspector/VoxelInspector.js";

/**
 * A mixin which adds the {@link VoxelInspector} widget to the {@link Viewer} widget.
 * Rather than being called directly, this function is normally passed as
 * a parameter to {@link Viewer#extend}, as shown in the example below.
 * @function
 *
 * @param {Viewer} viewer The viewer instance.
 *
 * @example
 * var viewer = new Cesium.Viewer('cesiumContainer');
 * viewer.extend(Cesium.viewerVoxelInspectorMixin);
 */
function viewerVoxelInspectorMixin(viewer) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("viewer", viewer);
  //>>includeEnd('debug');

  const container = document.createElement("div");
  container.className = "cesium-viewer-voxelInspectorContainer";
  viewer.container.appendChild(container);
  const voxelInspector = new VoxelInspector(container, viewer.scene);

  Object.defineProperties(viewer, {
    voxelInspector: {
      get: function () {
        return voxelInspector;
      },
    },
  });
}
export default viewerVoxelInspectorMixin;
