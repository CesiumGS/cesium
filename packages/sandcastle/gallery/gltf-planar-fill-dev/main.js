import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");

// Hide the globe, skybox, atmosphere, and stars so we can see the model against the background color.
// This is important for testing backgroundFill which renders using czm_backgroundColor.
viewer.scene.globe.show = false;
viewer.scene.skyBox.show = false;
viewer.scene.skyAtmosphere.show = false;
viewer.scene.sun.show = false;
viewer.scene.moon.show = false;
viewer.scene.backgroundColor = Cesium.Color.BLACK;

// Adjust camera controller for model-only viewing (no globe)
const controller = viewer.scene.screenSpaceCameraController;
controller.enableCollisionDetection = false;
controller.minimumZoomDistance = 1.0;
controller.maximumZoomDistance = 5000.0;

// The following .gltf file contains polygons using the BENTLEY_materials_planar_fill extension.
// This extension controls how planar polygon fills are rendered for CAD-style visualization:
// - wireframeFill: controls fill visibility in wireframe mode (0=NONE, 1=ALWAYS, 2=TOGGLE)
// - backgroundFill: when true, renders using the view's background color (invisible mask)
// - behind: when true, renders behind coplanar geometry (useful for hatching)
const modelURL =
  "../../../Specs/Data/Models/glTF-2.0/PlanarFill/glTF/planar-fill-polygons.gltf";

try {
  const model = await Cesium.Model.fromGltfAsync({
    url: modelURL,
  });

  viewer.scene.primitives.add(model);

  model.readyEvent.addEventListener(() => {
    // Zoom to the model
    viewer.camera.flyToBoundingSphere(model.boundingSphere, {
      duration: 0,
      offset: new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(0.0),
        Cesium.Math.toRadians(-45.0),
        model.boundingSphere.radius * 3.0,
      ),
    });
  });
} catch (error) {
  console.error("Error loading model:", error);
  window.alert(`Error loading model: ${error}`);
}
