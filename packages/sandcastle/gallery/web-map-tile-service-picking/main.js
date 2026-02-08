import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  shouldAnimate: true,
});

const kvpProvider = new Cesium.WebMapTileServiceImageryProvider({
  url: "https://wmts.marine.copernicus.eu/teroWmts",
  layer:
    "NWSHELF_ANALYSISFORECAST_PHY_004_013/cmems_mod_nws_phy_anfc_0.027deg-2D_PT15M-i_202411/uo",
  style: "cmap:balance",
  tileMatrixSetID: "EPSG:3857",
  format: "image/png",
  enablePickFeatures: true,
});

const restProvider = new Cesium.WebMapTileServiceImageryProvider({
  url: "https://geoserver.digitalearth.africa/geoserver/gwc/service/wmts/rest/{layer}/{style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}?format={format}",
  layer: "waterbodies:DEAfrica_Waterbodies",
  style: "waterbodies:waterbodies_v0_0_4",
  tileMatrixSetID: "EPSG:3857",
  tileMatrixLabels: [
    "EPSG:3857:0",
    "EPSG:3857:1",
    "EPSG:3857:2",
    "EPSG:3857:3",
    "EPSG:3857:4",
    "EPSG:3857:5",
    "EPSG:3857:6",
    "EPSG:3857:7",
    "EPSG:3857:8",
    "EPSG:3857:9",
    "EPSG:3857:10",
    "EPSG:3857:11",
    "EPSG:3857:12",
    "EPSG:3857:13",
    "EPSG:3857:14",
    "EPSG:3857:15",
    "EPSG:3857:16",
    "EPSG:3857:17",
    "EPSG:3857:18",
    "EPSG:3857:19",
    "EPSG:3857:20",
    "EPSG:3857:21",
    "EPSG:3857:22",
    "EPSG:3857:23",
    "EPSG:3857:24",
    "EPSG:3857:25",
    "EPSG:3857:26",
    "EPSG:3857:27",
    "EPSG:3857:28",
    "EPSG:3857:29",
    "EPSG:3857:30",
  ],
  format: "image/png",
  enablePickFeatures: true,

  getFeatureInfoUrl:
    "https://geoserver.digitalearth.africa/geoserver/gwc/service/wmts/rest/{layer}/{style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}/{j}/{i}?format={format}",
});

let currentLayer;
Sandcastle.addToolbarMenu([
  {
    text: "KVP",
    onselect: function () {
      if (currentLayer) {
        viewer.imageryLayers.remove(currentLayer);
      }
      const layer = new Cesium.ImageryLayer(kvpProvider);

      viewer.imageryLayers.add(layer);
      viewer.scene.camera.flyTo({
        destination: new Cesium.Cartesian3(
          5814252.249108092,
          -250899.4077323251,
          7761230.9524666285,
        ),
        orientation: new Cesium.HeadingPitchRoll(
          6.283185307179581,
          -1.568415877096228,
          0,
        ),
        duration: 0,
      });
    },
  },
  {
    text: "REST",
    onselect: function () {
      if (currentLayer) {
        viewer.imageryLayers.remove(currentLayer);
      }
      const layer = new Cesium.ImageryLayer(restProvider);
      viewer.imageryLayers.add(layer);
      viewer.scene.camera.flyTo({
        destination: new Cesium.Cartesian3(
          10405276.856780395,
          3901435.9450037265,
          -374679.3227363354,
        ),
        orientation: new Cesium.HeadingPitchRoll(
          6.283185307179577,
          -1.5707219052683716,
          0,
        ),
        duration: 0,
      });
    },
  },
]);

Sandcastle.addToggleButton(
  "Enable Feature Picking",
  kvpProvider.enablePickFeatures && restProvider.enablePickFeatures,
  function (checked) {
    kvpProvider.enablePickFeatures = checked;
    restProvider.enablePickFeatures = checked;
  },
);
