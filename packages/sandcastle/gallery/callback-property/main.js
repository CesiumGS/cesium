import * as Cesium from "cesium";

// This example illustrates a Callback Property, a property whose
// value is lazily evaluated by a callback function.
// Use a CallbackProperty when your data can't be pre-computed
// or needs to be derived from other properties at runtime.
const viewer = new Cesium.Viewer("cesiumContainer");
viewer.clock.shouldAnimate = true;

const startLatitude = 35;
const startLongitude = -120;
let endLongitude;
const startTime = Cesium.JulianDate.now();

// Add a polyline to the scene. Positions are dynamic.
const isConstant = false;
const redLine = viewer.entities.add({
  polyline: {
    // This callback updates positions each frame.
    positions: new Cesium.CallbackProperty(function (time, result) {
      endLongitude =
        startLongitude +
        0.001 * Cesium.JulianDate.secondsDifference(time, startTime);
      return Cesium.Cartesian3.fromDegreesArray(
        [startLongitude, startLatitude, endLongitude, startLatitude],
        Cesium.Ellipsoid.WGS84,
        result,
      );
    }, isConstant),
    width: 5,
    material: Cesium.Color.RED,
  },
});

const startCartographic = Cesium.Cartographic.fromDegrees(
  startLongitude,
  startLatitude,
);

// use scratch object to avoid new allocations per frame.
let endCartographic = new Cesium.Cartographic();
const scratch = new Cesium.Cartographic();
const geodesic = new Cesium.EllipsoidGeodesic();

// Calculate the length of the line
function getLength(time, result) {
  // Get the end position from the polyLine's callback.
  const endPoint = redLine.polyline.positions.getValue(time, result)[1];
  endCartographic = Cesium.Cartographic.fromCartesian(endPoint);

  geodesic.setEndPoints(startCartographic, endCartographic);
  const lengthInMeters = Math.round(geodesic.surfaceDistance);
  return `${(lengthInMeters / 1000).toFixed(1)} km`;
}

function getMidpoint(time, result) {
  // Get the end position from the polyLine's callback.
  const endPoint = redLine.polyline.positions.getValue(time, result)[1];
  endCartographic = Cesium.Cartographic.fromCartesian(endPoint);

  geodesic.setEndPoints(startCartographic, endCartographic);
  const midpointCartographic = geodesic.interpolateUsingFraction(0.5, scratch);
  return Cesium.Cartesian3.fromRadians(
    midpointCartographic.longitude,
    midpointCartographic.latitude,
  );
}

// Label the polyline with calculated length.
const label = viewer.entities.add({
  position: new Cesium.CallbackProperty(getMidpoint, isConstant),
  label: {
    // This callback updates the length to print each frame.
    text: new Cesium.CallbackProperty(getLength, isConstant),
    font: "20px sans-serif",
    pixelOffset: new Cesium.Cartesian2(0.0, 20),
  },
});

// Keep the view centered.
viewer.trackedEntity = label;
