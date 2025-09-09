import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});

const pinBuilder = new Cesium.PinBuilder();

Sandcastle.addToolbarMenu(
  [
    {
      text: "Track with Waypoints",
      onselect: function () {
        viewer.dataSources
          .add(
            Cesium.GpxDataSource.load("../../SampleData/gpx/lamina.gpx", {
              clampToGround: true,
            }),
          )
          .then(function (dataSource) {
            viewer.zoomTo(dataSource.entities);
          });
      },
    },
    {
      text: "Route",
      onselect: function () {
        viewer.dataSources
          .add(
            Cesium.GpxDataSource.load("../../SampleData/gpx/route.gpx", {
              clampToGround: true,
            }),
          )
          .then(function (dataSource) {
            viewer.zoomTo(dataSource.entities);
          });
      },
    },
    {
      text: "Waypoints",
      onselect: function () {
        viewer.dataSources
          .add(
            Cesium.GpxDataSource.load("../../SampleData/gpx/wpt.gpx", {
              clampToGround: true,
            }),
          )
          .then(function (dataSource) {
            viewer.zoomTo(dataSource.entities);
          });
      },
    },
    {
      text: "Multiple Tracks with Waypoints",
      onselect: function () {
        viewer.dataSources
          .add(
            Cesium.GpxDataSource.load("../../SampleData/gpx/complexTrk.gpx", {
              clampToGround: true,
            }),
          )
          .then(function (dataSource) {
            viewer.zoomTo(dataSource.entities);
          });
      },
    },
    {
      text: "Symbology Options",
      onselect: function () {
        viewer.dataSources
          .add(
            Cesium.GpxDataSource.load("../../SampleData/gpx/lamina.gpx", {
              clampToGround: true,
              trackColor: Cesium.Color.YELLOW,
              waypointImage: pinBuilder.fromMakiIconId(
                "bicycle",
                Cesium.Color.BLUE,
                48,
              ),
            }),
          )
          .then(function (dataSource) {
            viewer.zoomTo(dataSource.entities);
          });
      },
    },
  ],
  "toolbar",
);

Sandcastle.reset = function () {
  viewer.dataSources.removeAll();
  viewer.clock.clockRange = Cesium.ClockRange.UNBOUNDED;
  viewer.clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK;
};
