import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");
viewer.camera.flyTo({
  destination: new Cesium.Rectangle.fromDegrees(-84, 43, -80, 47),
});

const layers = viewer.imageryLayers;
layers.removeAll();

const layerLinear = Cesium.ImageryLayer.fromProviderAsync(
  Cesium.TileMapServiceImageryProvider.fromUrl(
    Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),
  ),
);
layers.add(layerLinear);

const layerNearest = Cesium.ImageryLayer.fromProviderAsync(
  Cesium.TileMapServiceImageryProvider.fromUrl(
    Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),
  ),
);
layers.add(layerNearest);

// Set the texture minification and magnification filters of layerNearest. Default is LINEAR.
layerNearest.minificationFilter = Cesium.TextureMinificationFilter.NEAREST;
layerNearest.magnificationFilter = Cesium.TextureMagnificationFilter.NEAREST;

// The remaining code installs a split layer so the effect of the texture filters becomes apparent.

layerNearest.splitDirection = Cesium.SplitDirection.RIGHT;

const slider = document.getElementById("slider");
viewer.scene.splitPosition =
  slider.offsetLeft / slider.parentElement.offsetWidth;

let dragStartX = 0;

document
  .getElementById("slider")
  .addEventListener("mousedown", mouseDown, false);
window.addEventListener("mouseup", mouseUp, false);

function mouseUp() {
  window.removeEventListener("mousemove", sliderMove, true);
}

function mouseDown(e) {
  const slider = document.getElementById("slider");
  dragStartX = e.clientX - slider.offsetLeft;
  window.addEventListener("mousemove", sliderMove, true);
}

function sliderMove(e) {
  const slider = document.getElementById("slider");
  const splitPosition =
    (e.clientX - dragStartX) / slider.parentElement.offsetWidth;
  slider.style.left = `${100.0 * splitPosition}%`;
  viewer.scene.splitPosition = splitPosition;
}
