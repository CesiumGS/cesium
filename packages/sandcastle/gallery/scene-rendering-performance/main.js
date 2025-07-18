import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

// Create a viewer that won't render a new frame unless
// updates to the scene require it to reduce overall CPU usage.
const viewer = new Cesium.Viewer("cesiumContainer", {
  requestRenderMode: true,
  maximumRenderTimeChange: Infinity,
  terrain: Cesium.Terrain.fromWorldTerrain(),
});

const scene = viewer.scene;
scene.debugShowFramesPerSecond = true;

let tileset;

const viewModel = {
  requestRenderMode: true,
  showTimeOptions: false,
  timeChangeEnabled: false,
  maximumRenderTimeChange: 0.0,
  lastRenderTime: "",
  requestRender: function () {
    scene.requestRender();
  },
};

// Clear scene and set default view.
let handler;
let loadingTileset = false;
function resetScene() {
  viewer.trackedEntity = undefined;
  viewer.dataSources.removeAll();
  viewer.entities.removeAll();
  viewer.scene.primitives.remove(tileset);
  viewer.clock.shouldAnimate = false;
  handler = handler && handler.destroy();
  scene.skyBox.show = true;
  scene.camera.flyHome(0.0);
  scene.requestRender();
  viewModel.showTimeOptions = false;
  viewModel.timeChangeEnabled = false;
  viewModel.maximumRenderTimeChange = 0;
  loadingTileset = false;
}

// Load a tileset and set the view.
// No need to call scene.requestRender()
async function loadTilesetScenario() {
  resetScene();

  loadingTileset = true;
  try {
    tileset = await Cesium.Cesium3DTileset.fromIonAssetId(40866);
    if (!loadingTileset) {
      // Scenario was changed. Discard result.
      return;
    }
    viewer.scene.primitives.add(tileset);
    viewer.zoomTo(tileset);
  } catch (error) {
    console.log(`Error loading tileset: ${error}`);
  }
}

// Load an animated model and set the view.
// No need to call scene.requestRender()
// Enable and adjust maximum simulation time change to see
// animations at desired speed.
function loadModelScenario() {
  resetScene();
  viewModel.timeChangeEnabled = true;
  viewModel.showTimeOptions = true;

  const entity = viewer.entities.add({
    name: "Aircraft",
    position: Cesium.Cartesian3.fromDegrees(-123.0744619, 44.0503706, 5000.0),
    model: {
      uri: "../../SampleData/models/CesiumAir/Cesium_Air.glb",
      minimumPixelSize: 128,
      maximumScale: 20000,
    },
  });

  viewer.trackedEntity = entity;
  viewer.clock.shouldAnimate = true;
}

// Load CZML DataSource with a model and set the trackedEntity.
// No need to call scene.requestRender()
// Enable and adjust maximum simulation time change to see
// animations at desired speed.
function loadCzmlScenario() {
  resetScene();
  viewModel.showTimeOptions = true;
  viewModel.timeChangeEnabled = true;
  viewModel.maximumRenderTimeChange = 10.0;

  viewer.dataSources.add(
    Cesium.CzmlDataSource.load("../../SampleData/simple.czml"),
  );
  viewer.clock.shouldAnimate = true;
}

// Pick an entity, only rendering when needed.
function pickingScenario() {
  resetScene();

  let color = Cesium.Color.CORNFLOWERBLUE;
  const colorProperty = new Cesium.CallbackProperty(function () {
    return color;
  }, false);
  const entity = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883),
    box: {
      dimensions: new Cesium.Cartesian3(1000000.0, 1000000.0, 30000.0),
      material: new Cesium.ColorMaterialProperty(colorProperty),
    },
  });

  scene.requestRender();

  // If the mouse is over the box, change its scale and color,
  // then request a new render frame.
  let lastPicked;
  handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
  handler.setInputAction(function (movement) {
    const pickedObject = scene.pick(movement.endPosition);
    if (Cesium.defined(pickedObject) && pickedObject.id === entity) {
      if (Cesium.defined(lastPicked)) {
        return;
      }
      color = Cesium.Color.YELLOW;
      scene.requestRender();
      lastPicked = pickedObject;
    } else if (Cesium.defined(lastPicked)) {
      color = Cesium.Color.CORNFLOWERBLUE;
      scene.requestRender();
      lastPicked = undefined;
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
}

// Changes to the scene with the API will require
// calling requestRender() on change.
function setScenePropertiesScenario() {
  resetScene();

  scene.skyBox.show = false;
  scene.backgroundColor = Cesium.Color.CORNFLOWERBLUE;
  scene.requestRender();
}

// BEGIN SANDCASTLE EXAMPLE UI SETUP

const toolbar = document.getElementById("toolbar");
Cesium.knockout.track(viewModel);
Cesium.knockout.applyBindings(viewModel, toolbar);

Cesium.knockout
  .getObservable(viewModel, "requestRenderMode")
  .subscribe(function (value) {
    scene.requestRenderMode = value;
  });

Cesium.knockout
  .getObservable(viewModel, "timeChangeEnabled")
  .subscribe(function (value) {
    scene.maximumRenderTimeChange = value
      ? viewModel.maximumRenderTimeChange
      : Infinity;
  });

Cesium.knockout
  .getObservable(viewModel, "maximumRenderTimeChange")
  .subscribe(function (value) {
    scene.maximumRenderTimeChange = value;
  });

scene.postRender.addEventListener(function () {
  const time = Cesium.JulianDate.toGregorianDate(scene.lastRenderTime);
  const value = `${time.hour}:${time.minute}:${
    time.second
  }:${time.millisecond.toFixed(0)}`;
  Cesium.knockout.getObservable(viewModel, "lastRenderTime")(value);
});

const scenarios = [
  {
    text: "Default view",
    onselect: resetScene,
  },
  {
    text: "Load a 3D tileset and set the view",
    onselect: loadTilesetScenario,
  },
  {
    text: "Mouseover picking",
    onselect: pickingScenario,
  },
  {
    text: "Load time-dynamic CZML",
    onselect: loadCzmlScenario,
  },
  {
    text: "Animated model",
    onselect: loadModelScenario,
  },
  {
    text: "Scene changes with API",
    onselect: setScenePropertiesScenario,
  },
];

Sandcastle.addToolbarMenu(scenarios);
