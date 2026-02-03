import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");

// The following .gltf file contains styled point data using the BENTLEY_materials_point_style extension.
// The styled point data allows the points to have a variety of diameters.
const modelURL =
  "../../../Specs/Data/Models/glTF-2.0/StyledPoints/points-r5-g8-b14-y10.gltf";

const height = 0.0;
const hpr = new Cesium.HeadingPitchRoll(0.0, 0.0, 0.0);
const origin = Cesium.Cartesian3.fromDegrees(-123.0744619, 44.0503706, height);
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
