import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

function createPrimitives(scene) {
  const e = scene.primitives.add(
    new Cesium.EllipsoidPrimitive({
      center: Cesium.Cartesian3.fromDegrees(-75.0, 40.0, 500000.0),
      radii: new Cesium.Cartesian3(500000.0, 500000.0, 500000.0),
      material: Cesium.Material.fromType(Cesium.Material.RimLightingType),
    }),
  );
  Sandcastle.declare(e); // For Sandcastle highlighting.

  const e2 = scene.primitives.add(
    new Cesium.EllipsoidPrimitive({
      modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(
        Cesium.Cartesian3.fromDegrees(-95.0, 40.0, 500000.0),
      ),
      radii: new Cesium.Cartesian3(300000.0, 300000.0, 500000.0),
      material: Cesium.Material.fromType(Cesium.Material.StripeType),
    }),
  );
  Sandcastle.declare(e2); // For Sandcastle highlighting.
}

const viewer = new Cesium.Viewer("cesiumContainer");
viewer.screenSpaceEventHandler.setInputAction(function (movement) {
  const pickedPrimitive = viewer.scene.pick(movement.endPosition);
  Sandcastle.highlight(pickedPrimitive);
}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

createPrimitives(viewer.scene);
