import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});

const scene = viewer.scene;
scene.verticalExaggeration = 2.0;
scene.verticalExaggerationRelativeHeight = 2400.0;

scene.camera.setView({
  destination: new Cesium.Cartesian3(
    336567.0354790703,
    5664688.047602498,
    2923204.3566963132,
  ),
  orientation: new Cesium.HeadingPitchRoll(
    1.2273281382639265,
    -0.32239612370237514,
    0.0027207329018610338,
  ),
});

viewer.entities.add({
  position: new Cesium.Cartesian3(
    314557.3531714575,
    5659723.771882165,
    2923538.5417330978,
  ),
  ellipsoid: {
    radii: new Cesium.Cartesian3(400.0, 400.0, 400.0),
    material: Cesium.Color.RED,
    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
  },
});

let visualizeRelativeHeight = true;

function updateMaterial() {
  if (visualizeRelativeHeight) {
    const height = scene.verticalExaggerationRelativeHeight;
    const exaggeration = scene.verticalExaggeration;
    const alpha = Math.min(1.0, exaggeration * 0.25);
    const layer = {
      extendUpwards: true,
      extendDownwards: true,
      entries: [
        {
          height: height + 100.0,
          color: new Cesium.Color(0.0, 1.0, 0.0, alpha * 0.25),
        },
        {
          height: height + 50.0,
          color: new Cesium.Color(1.0, 1.0, 1.0, alpha * 0.5),
        },
        {
          height: height,
          color: new Cesium.Color(1.0, 1.0, 1.0, alpha),
        },
        {
          height: height - 50.0,
          color: new Cesium.Color(1.0, 1.0, 1.0, alpha * 0.5),
        },
        {
          height: height - 100.0,
          color: new Cesium.Color(1.0, 0.0, 0.0, alpha * 0.25),
        },
      ],
    };
    scene.globe.material = Cesium.createElevationBandMaterial({
      scene: scene,
      layers: [layer],
    });
  } else {
    scene.globe.material = undefined;
  }
}
updateMaterial();

const viewModel = {
  exaggeration: scene.verticalExaggeration,
  relativeHeight: scene.verticalExaggerationRelativeHeight,
};

function updateExaggeration() {
  scene.verticalExaggeration = Number(viewModel.exaggeration);
  scene.verticalExaggerationRelativeHeight = Number(viewModel.relativeHeight);
  updateMaterial();
}

Cesium.knockout.track(viewModel);
const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);
for (const name in viewModel) {
  if (viewModel.hasOwnProperty(name)) {
    Cesium.knockout
      .getObservable(viewModel, name)
      .subscribe(updateExaggeration);
  }
}

Sandcastle.addToggleButton(
  "Visualize Relative Height",
  visualizeRelativeHeight,
  function (checked) {
    visualizeRelativeHeight = checked;
    updateMaterial();
  },
);

Sandcastle.addToolbarButton("Remove Exaggeration", function () {
  viewModel.exaggeration = 1.0;
  viewModel.relativeHeight = 0.0;
});
