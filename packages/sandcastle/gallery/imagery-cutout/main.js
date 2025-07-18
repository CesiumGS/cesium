import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  baseLayer: Cesium.ImageryLayer.fromProviderAsync(
    Cesium.TileMapServiceImageryProvider.fromUrl(
      Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),
    ),
  ),
  baseLayerPicker: false,
});

const canvas = viewer.canvas;
canvas.setAttribute("tabindex", "0"); // needed to put focus on the canvas
canvas.onclick = function () {
  canvas.focus();
};

const defaultImageryLayerCutout = Cesium.Rectangle.fromDegrees(
  -90,
  20,
  -70,
  40,
);

// Cut a rectangle out of the base layer
const layers = viewer.imageryLayers;
const imageryBaseLayer = layers.get(0);

imageryBaseLayer.cutoutRectangle = defaultImageryLayerCutout;

// Fit a SingleTileImageryProvider inside the cutout on the lowest layer
const logo = Cesium.ImageryLayer.fromProviderAsync(
  Cesium.SingleTileImageryProvider.fromUrl(
    "../images/Cesium_Logo_overlay.png",
    {
      rectangle: defaultImageryLayerCutout,
    },
  ),
);
layers.add(logo);

// Add an Earth at Night layer and a "traveling" cutout
const earthAtNight = Cesium.ImageryLayer.fromProviderAsync(
  Cesium.IonImageryProvider.fromAssetId(3812),
);
earthAtNight.cutoutRectangle = Cesium.Rectangle.fromDegrees(-100, 10, -60, 50);
earthAtNight.alpha = 0.9;
layers.add(earthAtNight);

// "traveling" code
const flags = {
  moveEast: false,
  moveWest: false,
  moveNorth: false,
  moveSouth: false,
};

function getFlagForKeyCode(code) {
  switch (code) {
    case "KeyW":
      return "moveNorth";
    case "KeyS":
      return "moveSouth";
    case "KeyD":
      return "moveEast";
    case "KeyA":
      return "moveWest";
    default:
      return undefined;
  }
}

document.addEventListener(
  "keydown",
  function (e) {
    const flagName = getFlagForKeyCode(e.code);
    if (typeof flagName !== "undefined") {
      flags[flagName] = true;
    }
  },
  false,
);

document.addEventListener(
  "keyup",
  function (e) {
    const flagName = getFlagForKeyCode(e.code);
    if (typeof flagName !== "undefined") {
      flags[flagName] = false;
    }
  },
  false,
);

const moveIncrement = 0.05;
viewer.clock.onTick.addEventListener(function (clock) {
  const travelingRectangle = earthAtNight.cutoutRectangle;
  if (
    flags.moveNorth &&
    travelingRectangle.north + moveIncrement < Cesium.Math.PI_OVER_TWO
  ) {
    travelingRectangle.north += moveIncrement;
    travelingRectangle.south += moveIncrement;
  }
  if (
    flags.moveSouth &&
    travelingRectangle.south - moveIncrement > -Cesium.Math.PI_OVER_TWO
  ) {
    travelingRectangle.north -= moveIncrement;
    travelingRectangle.south -= moveIncrement;
  }
  if (flags.moveEast) {
    travelingRectangle.east += moveIncrement;
    travelingRectangle.west += moveIncrement;
  }
  if (flags.moveWest) {
    travelingRectangle.east -= moveIncrement;
    travelingRectangle.west -= moveIncrement;
  }
  travelingRectangle.east = wrapLongitude(travelingRectangle.east);
  travelingRectangle.west = wrapLongitude(travelingRectangle.west);
});

function wrapLongitude(value) {
  if (value < -Cesium.Math.PI) {
    return value + Cesium.Math.TWO_PI;
  }
  if (value > Cesium.Math.PI) {
    return value - Cesium.Math.TWO_PI;
  }
  return value;
}
