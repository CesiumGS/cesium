import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});

//The viewModel tracks the state of our mini application.
const viewModel = {
  enabled: true,
  density: 0,
  visualDensityScalar: 0,
  sse: 0,
  minimumBrightness: 0,
  heightScalar: 0,
  heightFalloff: 0,
  maxHeight: 0,
};
// Convert the viewModel members into knockout observables.
Cesium.knockout.track(viewModel);

// Bind the viewModel to the DOM elements of the UI that call for it.
const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);

Cesium.knockout
  .getObservable(viewModel, "enabled")
  .subscribe(function (newValue) {
    viewer.scene.fog.enabled = newValue;
  });

Cesium.knockout
  .getObservable(viewModel, "density")
  .subscribe(function (newValue) {
    viewer.scene.fog.density = newValue;
  });

Cesium.knockout
  .getObservable(viewModel, "visualDensityScalar")
  .subscribe(function (newValue) {
    viewer.scene.fog.visualDensityScalar = newValue;
  });

Cesium.knockout
  .getObservable(viewModel, "minimumBrightness")
  .subscribe(function (newValue) {
    viewer.scene.fog.minimumBrightness = newValue;
  });
Cesium.knockout.getObservable(viewModel, "sse").subscribe(function (newValue) {
  viewer.scene.fog.screenSpaceErrorFactor = newValue;
});
Cesium.knockout
  .getObservable(viewModel, "heightScalar")
  .subscribe(function (newValue) {
    viewer.scene.fog.heightScalar = newValue;
  });
Cesium.knockout
  .getObservable(viewModel, "heightFalloff")
  .subscribe(function (newValue) {
    viewer.scene.fog.heightFalloff = newValue;
  });
Cesium.knockout
  .getObservable(viewModel, "maxHeight")
  .subscribe(function (newValue) {
    viewer.scene.fog.maxHeight = newValue;
  });

viewModel.enabled = viewer.scene.fog.enabled;
viewModel.density = viewer.scene.fog.density;
viewModel.visualDensityScalar = viewer.scene.fog.visualDensityScalar;
viewModel.sse = viewer.scene.fog.screenSpaceErrorFactor;
viewModel.minimumBrightness = viewer.scene.fog.minimumBrightness;
viewModel.heightScalar = viewer.scene.fog.heightScalar;
viewModel.heightFalloff = viewer.scene.fog.heightFalloff;
viewModel.maxHeight = viewer.scene.fog.maxHeight;

Sandcastle.addToolbarButton(
  "Horizon high altitude",
  function () {
    viewer.camera.setView({
      destination: new Cesium.Cartesian3(
        -2467730.5740817646,
        -4390507.315824514,
        3906155.113316938,
      ),
      orientation: {
        heading: 4.492211521856625,
        pitch: -0.2687139437696304,
      },
    });
  },
  "zoomButtons",
);
// default to the high altitude camera
viewer.camera.setView({
  destination: new Cesium.Cartesian3(
    -2467730.5740817646,
    -4390507.315824514,
    3906155.113316938,
  ),
  orientation: {
    heading: 4.492211521856625,
    pitch: -0.2687139437696304,
  },
});

Sandcastle.addToolbarButton(
  "Horizon low altitude",
  function () {
    viewer.camera.setView({
      destination: new Cesium.Cartesian3(
        -734001.9511656855,
        -4214090.596769834,
        4715898.125886317,
      ),
      orientation: {
        heading: 5.634257362559497,
        pitch: -0.019548505785381032,
      },
    });
  },
  "zoomButtons",
);

Sandcastle.addToolbarButton(
  "Snapshot",
  function () {
    const container = document.getElementById("cesiumContainer");
    const tmpH = container.style.height;
    const tmpW = container.style.width;

    // resize for screenshot
    container.style.height = "600px";
    container.style.width = "800px";
    viewer.resize();
    viewer.render();

    // chrome blocks opening data urls directly, add an image to a new window instead
    // https://stackoverflow.com/questions/45778720/window-open-opens-a-blank-screen-in-chrome
    const win = window.open();
    win.document.write(`<img src="${viewer.canvas.toDataURL("image/png")}" />`);
    // stop the browser from trying to load "nothing" forever
    win.stop();

    // reset viewer size
    container.style.height = tmpH;
    container.style.width = tmpW;
    viewer.resize();
    viewer.render();
  },
  "zoomButtons",
);

const cameraLocation1 = {
  destination: new Cesium.Cartesian3(
    -2693797.551060477,
    -4297135.517094725,
    3854700.7470414364,
  ),
  orientation: new Cesium.HeadingPitchRoll(
    4.6550106925119925,
    -0.2863894863138836,
    1.3561760425773173e-7,
  ),
  duration: 5,
  easingFunction: Cesium.EasingFunction.LINEAR_NONE,
};

const cameraLocation2 = {
  destination: new Cesium.Cartesian3(
    -2687646.8093284643,
    -4303700.035604263,
    3856784.833121914,
  ),
  orientation: new Cesium.HeadingPitchRoll(
    4.655010692511992,
    -0.28638948631389805,
    1.356176033695533e-7,
  ),
  duration: 5,
  easingFunction: Cesium.EasingFunction.LINEAR_NONE,
};

const cameraLocation3 = {
  destination: new Cesium.Cartesian3(
    -2398620.5757977725,
    -4599087.046897942,
    3953783.620126758,
  ),
  orientation: new Cesium.HeadingPitchRoll(
    4.655010692512,
    -0.2863894863139227,
    1.356176024813749e-7,
  ),
  duration: 5,
  easingFunction: Cesium.EasingFunction.LINEAR_NONE,
};

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
async function flightPath(locations, timeAtEach) {
  viewer.camera.setView(locations[0]);
  for (const location of locations) {
    await new Promise((resolve) => {
      viewer.camera.flyTo({
        ...location,
        complete: () => resolve(),
      });
    });
    await delay(timeAtEach);
  }
}

// Zoom and an out tests to see how the fog settings apply over a range of heights
Sandcastle.addToolbarButton("Zoom Out Test", function () {
  flightPath([cameraLocation1, cameraLocation2, cameraLocation3], 1000);
});
Sandcastle.addToolbarButton("Zoom In Test", function () {
  flightPath([cameraLocation3, cameraLocation2, cameraLocation1], 1000);
});
