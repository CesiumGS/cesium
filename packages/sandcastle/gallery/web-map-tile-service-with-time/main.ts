import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  shouldAnimate: true,
});

function dataCallback(interval, index) {
  let time;
  if (index === 0) {
    // leading
    time = Cesium.JulianDate.toIso8601(interval.stop);
  } else {
    time = Cesium.JulianDate.toIso8601(interval.start);
  }

  return {
    Time: time,
  };
}

const times = Cesium.TimeIntervalCollection.fromIso8601({
  iso8601: "2015-07-30/2017-06-16/P1D",
  leadingInterval: true,
  trailingInterval: true,
  isStopIncluded: false, // We want stop time to be part of the trailing interval
  dataCallback: dataCallback,
});

// Add a WMTS imagery layer.
// This comes from NASA's GIBS API.
// See https://wiki.earthdata.nasa.gov/display/GIBS/GIBS+API+for+Developers#GIBSAPIforDevelopers-OGCWebMapService(WMS)
const provider = new Cesium.WebMapTileServiceImageryProvider({
  url: "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.jpg",
  layer: "MODIS_Terra_CorrectedReflectance_TrueColor",
  style: "default",
  tileMatrixSetID: "250m",
  maximumLevel: 5,
  format: "image/jpeg",
  clock: viewer.clock,
  times: times,
  credit: "NASA Global Imagery Browse Services for EOSDIS",
});
const layer = new Cesium.ImageryLayer(provider);

// Make the weather layer semi-transparent to see the underlying geography.
layer.alpha = 0.5;

viewer.imageryLayers.add(layer);

const start = Cesium.JulianDate.fromIso8601("2015-07-30");
const stop = Cesium.JulianDate.fromIso8601("2017-06-17");

viewer.timeline.zoomTo(start, stop);

const clock = viewer.clock;
clock.startTime = start;
clock.stopTime = stop;
clock.currentTime = start;
clock.clockRange = Cesium.ClockRange.LOOP_STOP;
clock.multiplier = 7200;
