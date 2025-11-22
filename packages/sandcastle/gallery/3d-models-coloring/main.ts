import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  infoBox: false,
  selectionIndicator: false,
  shadows: true,
  shouldAnimate: true,
});

let entity;

function getColorBlendMode(colorBlendMode) {
  return Cesium.ColorBlendMode[colorBlendMode.toUpperCase()];
}

function getColor(colorName, alpha) {
  const color = Cesium.Color[colorName.toUpperCase()];
  return Cesium.Color.fromAlpha(color, parseFloat(alpha));
}

// The viewModel tracks the state of our mini application.
const viewModel = {
  color: "Red",
  colors: ["White", "Red", "Green", "Blue", "Yellow", "Gray"],
  alpha: 1.0,
  colorBlendMode: "Highlight",
  colorBlendModes: ["Highlight", "Replace", "Mix"],
  colorBlendAmount: 0.5,
  colorBlendAmountEnabled: false,
  silhouetteColor: "Red",
  silhouetteColors: ["Red", "Green", "Blue", "Yellow", "Gray"],
  silhouetteAlpha: 1.0,
  silhouetteSize: 2.0,
};

// Convert the viewModel members into knockout observables.
Cesium.knockout.track(viewModel);

// Bind the viewModel to the DOM elements of the UI that call for it.
const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);

Cesium.knockout
  .getObservable(viewModel, "color")
  .subscribe(function (newValue) {
    entity.model.color = getColor(newValue, viewModel.alpha);
  });

Cesium.knockout
  .getObservable(viewModel, "alpha")
  .subscribe(function (newValue) {
    entity.model.color = getColor(viewModel.color, newValue);
  });

Cesium.knockout
  .getObservable(viewModel, "colorBlendMode")
  .subscribe(function (newValue) {
    const colorBlendMode = getColorBlendMode(newValue);
    entity.model.colorBlendMode = colorBlendMode;
    viewModel.colorBlendAmountEnabled =
      colorBlendMode === Cesium.ColorBlendMode.MIX;
  });

Cesium.knockout
  .getObservable(viewModel, "colorBlendAmount")
  .subscribe(function (newValue) {
    entity.model.colorBlendAmount = parseFloat(newValue);
  });

Cesium.knockout
  .getObservable(viewModel, "silhouetteColor")
  .subscribe(function (newValue) {
    entity.model.silhouetteColor = getColor(
      newValue,
      viewModel.silhouetteAlpha,
    );
  });

Cesium.knockout
  .getObservable(viewModel, "silhouetteAlpha")
  .subscribe(function (newValue) {
    entity.model.silhouetteColor = getColor(
      viewModel.silhouetteColor,
      newValue,
    );
  });

Cesium.knockout
  .getObservable(viewModel, "silhouetteSize")
  .subscribe(function (newValue) {
    entity.model.silhouetteSize = parseFloat(newValue);
  });

function createModel(url, height) {
  viewer.entities.removeAll();

  const position = Cesium.Cartesian3.fromDegrees(
    -123.0744619,
    44.0503706,
    height,
  );
  const heading = Cesium.Math.toRadians(135);
  const pitch = 0;
  const roll = 0;
  const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
  const orientation = Cesium.Transforms.headingPitchRollQuaternion(
    position,
    hpr,
  );

  entity = viewer.entities.add({
    name: url,
    position: position,
    orientation: orientation,
    model: {
      uri: url,
      minimumPixelSize: 128,
      maximumScale: 20000,
      color: getColor(viewModel.color, viewModel.alpha),
      colorBlendMode: getColorBlendMode(viewModel.colorBlendMode),
      colorBlendAmount: parseFloat(viewModel.colorBlendAmount),
      silhouetteColor: getColor(
        viewModel.silhouetteColor,
        viewModel.silhouetteAlpha,
      ),
      silhouetteSize: parseFloat(viewModel.silhouetteSize),
    },
  });
  viewer.trackedEntity = entity;
}

const options = [
  {
    text: "Aircraft",
    onselect: function () {
      createModel("../../SampleData/models/CesiumAir/Cesium_Air.glb", 5000.0);
    },
  },
  {
    text: "Ground Vehicle",
    onselect: function () {
      createModel("../../SampleData/models/GroundVehicle/GroundVehicle.glb", 0);
    },
  },
  {
    text: "Hot Air Balloon",
    onselect: function () {
      createModel(
        "../../SampleData/models/CesiumBalloon/CesiumBalloon.glb",
        1000.0,
      );
    },
  },
  {
    text: "Milk Truck",
    onselect: function () {
      createModel(
        "../../SampleData/models/CesiumMilkTruck/CesiumMilkTruck.glb",
        0,
      );
    },
  },
  {
    text: "Skinned Character",
    onselect: function () {
      createModel("../../SampleData/models/CesiumMan/Cesium_Man.glb", 0);
    },
  },
];

Sandcastle.addToolbarMenu(options);

Sandcastle.addToggleButton("Shadows", viewer.shadows, function (checked) {
  viewer.shadows = checked;
});
