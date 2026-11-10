import * as Cesium from "cesium";

//Load a GeoJSON file containing simplestyle information.
//To learn more about simplestyle, see https://github.com/mapbox/simplestyle-spec

//In this particular example, the name of each entity is set to its maki icon identifier.
//Clicking on each billboard will show it's identifier in the InfoBox.

const viewer = new Cesium.Viewer("cesiumContainer", {
  sceneMode: Cesium.SceneMode.SCENE2D,
  timeline: false,
  animation: false,
});

const dataSource = Cesium.GeoJsonDataSource.load(
  "../../SampleData/simplestyles.geojson",
);
viewer.dataSources.add(dataSource);
viewer.zoomTo(dataSource);
