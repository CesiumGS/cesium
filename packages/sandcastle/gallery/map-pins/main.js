import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  timeline: false,
  animation: false,
});

const pinBuilder = new Cesium.PinBuilder();

const bluePin = viewer.entities.add({
  name: "Blank blue pin",
  position: Cesium.Cartesian3.fromDegrees(-75.170726, 39.9208667),
  billboard: {
    image: pinBuilder.fromColor(Cesium.Color.ROYALBLUE, 48).toDataURL(),
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
  },
});

const questionPin = viewer.entities.add({
  name: "Question mark",
  position: Cesium.Cartesian3.fromDegrees(-75.1698529, 39.9220071),
  billboard: {
    image: pinBuilder.fromText("?", Cesium.Color.BLACK, 48).toDataURL(),
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
  },
});

const url = Cesium.buildModuleUrl("Assets/Textures/maki/grocery.png");
const groceryPin = Promise.resolve(
  pinBuilder.fromUrl(url, Cesium.Color.GREEN, 48),
).then(function (canvas) {
  return viewer.entities.add({
    name: "Grocery store",
    position: Cesium.Cartesian3.fromDegrees(-75.1705217, 39.921786),
    billboard: {
      image: canvas.toDataURL(),
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    },
  });
});

//Create a red pin representing a hospital from the maki icon set.
const hospitalPin = Promise.resolve(
  pinBuilder.fromMakiIconId("hospital", Cesium.Color.RED, 48),
).then(function (canvas) {
  return viewer.entities.add({
    name: "Hospital",
    position: Cesium.Cartesian3.fromDegrees(-75.1698606, 39.9211275),
    billboard: {
      image: canvas.toDataURL(),
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    },
  });
});

//Since some of the pins are created asynchronously, wait for them all to load before zooming/
Promise.all([bluePin, questionPin, groceryPin, hospitalPin]).then(
  function (pins) {
    viewer.zoomTo(pins);
  },
);
