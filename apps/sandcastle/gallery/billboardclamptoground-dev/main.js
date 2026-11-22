import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});
viewer.scene.globe.depthTestAgainstTerrain = true;

const ellipsoid = viewer.scene.globe.ellipsoid;
const billboardCollection = viewer.scene.primitives.add(
  new Cesium.BillboardCollection({
    scene: viewer.scene,
  }),
);

// seneca
const centerLongitude = -1.385205433269729;
const centerLatitude = 0.6777926580888163;

const gridWidth = Math.floor(Math.random() * 100.0);
const gridHeight = Math.floor(Math.random() * 100.0);
const rectangleHalfSize = 0.0005;

const e = new Cesium.Rectangle(
  centerLongitude - rectangleHalfSize,
  centerLatitude - rectangleHalfSize,
  centerLongitude + rectangleHalfSize,
  centerLatitude + rectangleHalfSize,
);

for (let y = 0; y < gridHeight; ++y) {
  for (let x = 0; x < gridWidth; ++x) {
    const longitude = Cesium.Math.lerp(e.west, e.east, x / (gridWidth - 1));
    const latitude = Cesium.Math.lerp(e.south, e.north, y / (gridHeight - 1));
    const position = new Cesium.Cartographic(longitude, latitude);

    billboardCollection.add({
      position: ellipsoid.cartographicToCartesian(position),
      image: "../images/facility.gif",
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    });
  }
}

let billboard;

Sandcastle.addToolbarButton("Add billboard", function () {
  if (!Cesium.defined(billboard)) {
    billboard = billboardCollection.add({
      position: ellipsoid.cartographicToCartesian(
        new Cesium.Cartographic(centerLongitude, centerLatitude, 1000.0),
      ),
      image: "../images/Cesium_Logo_overlay.png",
      scale: 0.7,
      heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
    });
  }
});

Sandcastle.addToolbarButton("Remove billboard", function () {
  if (Cesium.defined(billboard)) {
    billboardCollection.remove(billboard);
    billboard = undefined;
  }
});

Sandcastle.addToolbarMenu([
  {
    text: "Relative to ground",
    onselect: function () {
      if (Cesium.defined(billboard)) {
        billboard.heightReference = Cesium.HeightReference.RELATIVE_TO_GROUND;
      }
    },
  },
  {
    text: "Clamp to ground",
    onselect: function () {
      if (Cesium.defined(billboard)) {
        billboard.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
      }
    },
  },
  {
    text: "None",
    onselect: function () {
      if (Cesium.defined(billboard)) {
        billboard.heightReference = Cesium.HeightReference.NONE;
      }
    },
  },
]);

const lonGran = 0.00005;

Sandcastle.addToolbarButton("Increase longitude", function () {
  if (Cesium.defined(billboard)) {
    const cartographic = ellipsoid.cartesianToCartographic(billboard.position);
    cartographic.longitude += lonGran;
    billboard.position = ellipsoid.cartographicToCartesian(cartographic);
  }
});

Sandcastle.addToolbarButton("Decrease longitude", function () {
  if (Cesium.defined(billboard)) {
    const cartographic = ellipsoid.cartesianToCartographic(billboard.position);
    cartographic.longitude -= lonGran;
    billboard.position = ellipsoid.cartographicToCartesian(cartographic);
  }
});
