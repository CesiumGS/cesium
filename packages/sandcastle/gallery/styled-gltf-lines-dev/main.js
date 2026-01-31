import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");

// The following .gltf file contains styled line data using the BENTLEY_materials_line_style extension
// combined with EXT_mesh_primitive_edge_visibility for edge rendering.
// The extension allows lines to have custom width (in screen pixels) and 16-bit dash patterns.
const modelURL =
  "../../SampleData/models/StyledLines/BENTLEY_materials_line_style.gltf";

const height = 0.0;
const hpr = new Cesium.HeadingPitchRoll(0.0, 0.0, 0.0);
const origin = Cesium.Cartesian3.fromDegrees(0.0, 0.0, height);
const modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(origin, hpr);

try {
  const model = viewer.scene.primitives.add(
    await Cesium.Model.fromGltfAsync({
      url: modelURL,
      modelMatrix: modelMatrix,
    }),
  );

  model.readyEvent.addEventListener(() => {
    const camera = viewer.camera;

    // Zoom to model
    const controller = viewer.scene.screenSpaceCameraController;
    const r = 2.0 * Math.max(model.boundingSphere.radius, camera.frustum.near);
    controller.minimumZoomDistance = r * 0.5;

    const center = model.boundingSphere.center;
    const heading = Cesium.Math.toRadians(230.0);
    const pitch = Cesium.Math.toRadians(-20.0);
    camera.lookAt(
      center,
      new Cesium.HeadingPitchRange(heading, pitch, r * 2.0),
    );
    camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
  });
} catch (error) {
  window.alert(`Error loading model: ${error}`);
}
