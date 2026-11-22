import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  shouldAnimate: true,
});

const dates = [
  "2018-07-19T15:18:00Z",
  "2018-07-19T15:18:00.5Z",
  "2018-07-19T15:18:01Z",
  "2018-07-19T15:18:01.5Z",
  "2018-07-19T15:18:02Z",
  "2018-07-19T15:18:02.5Z",
];

const uris = [
  "../../SampleData/Cesium3DTiles/PointCloud/PointCloudTimeDynamic/0.pnts",
  "../../SampleData/Cesium3DTiles/PointCloud/PointCloudTimeDynamic/1.pnts",
  "../../SampleData/Cesium3DTiles/PointCloud/PointCloudTimeDynamic/2.pnts",
  "../../SampleData/Cesium3DTiles/PointCloud/PointCloudTimeDynamic/3.pnts",
  "../../SampleData/Cesium3DTiles/PointCloud/PointCloudTimeDynamic/4.pnts",
];

function dataCallback(interval, index) {
  return {
    uri: uris[index],
  };
}

const timeIntervalCollection =
  Cesium.TimeIntervalCollection.fromIso8601DateArray({
    iso8601Dates: dates,
    dataCallback: dataCallback,
  });

const pointCloud = new Cesium.TimeDynamicPointCloud({
  intervals: timeIntervalCollection,
  clock: viewer.clock,
  style: new Cesium.Cesium3DTileStyle({
    pointSize: 5,
  }),
});
viewer.scene.primitives.add(pointCloud);

const start = Cesium.JulianDate.fromIso8601(dates[0]);
const stop = Cesium.JulianDate.fromIso8601(dates[dates.length - 1]);

viewer.timeline.zoomTo(start, stop);

const clock = viewer.clock;
clock.startTime = start;
clock.currentTime = start;
clock.stopTime = stop;
clock.clockRange = Cesium.ClockRange.LOOP_STOP;

viewer.zoomTo(pointCloud, new Cesium.HeadingPitchRange(0.0, -0.5, 50.0));
