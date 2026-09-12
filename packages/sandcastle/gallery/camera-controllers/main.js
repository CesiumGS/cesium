import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

/* --- Camera Controller Setup --- */

// Disable the default camera controls
scene.screenSpaceCameraController.enableInputs = false;
scene.screenSpaceCameraController.enableCollisionDetection = false;

// Set up the modular camera controllers
const panController = new Cesium.HybridScreenSpacePanCameraController();
viewer.addController(panController);

const tiltController = new Cesium.ScreenSpaceTiltOrbitCameraController();
viewer.addController(tiltController);

const zoomController = new Cesium.ScreenSpaceZoomCameraController();
viewer.addController(zoomController);

/* --- Scene and Asset Setup --- */

Sandcastle.addDefaultToolbarMenu(
  [
    {
      text: "Power plant asset",
      onselect: () => tryLoadScene(plantScene),
    },
    {
      text: "Subsurface mining asset",
      onselect: () => tryLoadScene(mineScene),
    },
  ],
  "sceneToolbar",
);

async function plantScene() {
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2464651);
  scene.primitives.add(tileset);

  viewer.clock.currentTime = Cesium.JulianDate.fromIso8601(
    "2022-08-01T00:00:00Z",
  );

  viewer.zoomTo(
    tileset,
    new Cesium.HeadingPitchRange(
      0.5,
      -0.2,
      tileset.boundingSphere.radius * 4.0,
    ),
  );
}

async function mineScene() {
  const model = await Cesium.Model.fromGltfAsync({
    url: "../../SampleData/models/ParcLeadMine/ParcLeadMine.glb",
    modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(
      Cesium.Cartesian3.fromDegrees(-3.82518, 53.11728, -500.0),
    ),
  });
  scene.primitives.add(model);

  viewer.clock.currentTime = Cesium.JulianDate.fromIso8601(
    "2022-08-01T00:00:00Z",
  );
  scene.camera.setView({
    destination: new Cesium.Cartesian3(
      3827058.651471591,
      -256575.7981065622,
      5078738.238484612,
    ),
    orientation: new Cesium.HeadingPitchRoll(2.0, -0.2, 0.0),
    endTransform: Cesium.Matrix4.IDENTITY,
  });
}

async function tryLoadScene(loadScene) {
  scene.primitives.removeAll();

  try {
    await loadScene();
  } catch (error) {
    console.log(`Error loading scene: ${error}`);
  }
}
