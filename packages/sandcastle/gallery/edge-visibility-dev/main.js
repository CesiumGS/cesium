import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer");

// The following .glb file contains edge visibility data using the EXT_mesh_primitive_edge_visibility extension.
// This extension allows rendering of specific edges (boundary, crease, silhouette) on 3D models.
const modelURL =
  "../../../Specs/Data/Models/glTF-2.0/EdgeVisibility/glTF-Binary/EdgeVisibility.glb";

const height = 0.0;
const hpr = new Cesium.HeadingPitchRoll(0.0, 0.0, 0.0);

// First model position
const origin1 = Cesium.Cartesian3.fromDegrees(-123.0744619, 44.0503706, height);
const modelMatrix1 = Cesium.Transforms.headingPitchRollToFixedFrame(
  origin1,
  hpr,
);

// Second model position (offset to the east)
const origin2 = Cesium.Cartesian3.fromDegrees(-123.0740619, 44.0503706, height);
const modelMatrix2 = Cesium.Transforms.headingPitchRollToFixedFrame(
  origin2,
  hpr,
);

try {
  // Load first model
  const model1 = viewer.scene.primitives.add(
    await Cesium.Model.fromGltfAsync({
      url: modelURL,
      modelMatrix: modelMatrix1,
      color: Cesium.Color.RED,
    }),
  );

  // Load second model (offset copy) with a different color
  const model2 = viewer.scene.primitives.add(
    await Cesium.Model.fromGltfAsync({
      url: modelURL,
      modelMatrix: modelMatrix2,
      color: Cesium.Color.CYAN,
    }),
  );

  // Helper to convert readyEvent to a Promise
  function waitForReady(model) {
    return new Promise((resolve) => {
      if (model.ready) {
        resolve();
      } else {
        model.readyEvent.addEventListener(() => resolve());
      }
    });
  }

  // Wait for both models to be ready before setting up the camera
  Promise.all([waitForReady(model1), waitForReady(model2)]).then(() => {
    const camera = viewer.camera;

    // Zoom to show both models
    const controller = viewer.scene.screenSpaceCameraController;
    const r = 2.0 * Math.max(model1.boundingSphere.radius, camera.frustum.near);
    controller.minimumZoomDistance = r * 0.5;

    // Center between both models
    const center = Cesium.Cartesian3.midpoint(
      model1.boundingSphere.center,
      model2.boundingSphere.center,
      new Cesium.Cartesian3(),
    );
    const heading = Cesium.Math.toRadians(230.0);
    const pitch = Cesium.Math.toRadians(-20.0);
    camera.lookAt(
      center,
      new Cesium.HeadingPitchRange(heading, pitch, r * 2.5),
    );
    camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
  });

  // Toggle for CAD wireframe mode on first model
  Sandcastle.addToggleButton(
    "CAD Wireframe (Model 1)",
    false,
    function (checked) {
      model1.cadWireframe = checked;
    },
  );

  // Toggle for CAD wireframe mode on second model
  Sandcastle.addToggleButton(
    "CAD Wireframe (Model 2)",
    false,
    function (checked) {
      model2.cadWireframe = checked;
    },
  );
} catch (error) {
  window.alert(`Error loading model: ${error}`);
}
