import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  timeline: false,
  animation: false,
  baseLayerPicker: false,
  globe: false,
  geocoder: false,
});
const scene = viewer.scene;

let tileset;
const options = [
  {
    text: "Google P3DT",
    onselect: async () => {
      scene.primitives.remove(tileset);
      try {
        tileset = await Cesium.createGooglePhotorealistic3DTileset({
          // Only the Google Geocoder can be used with Google Photorealistic 3D Tiles.  Set the `geocode` property of the viewer constructor options to IonGeocodeProviderType.GOOGLE.
          onlyUsingWithGoogleGeocoder: true,
        });
        scene.primitives.add(tileset);
      } catch (error) {
        console.log(error);
      }
    },
  },
  {
    text: "Maxar OWT WFF 1.2",
    onselect: async () => {
      scene.primitives.remove(tileset);
      try {
        tileset = await Cesium.Cesium3DTileset.fromIonAssetId(691510, {
          maximumScreenSpaceError: 4,
        });
        scene.primitives.add(tileset);
      } catch (error) {
        console.log(error);
      }
    },
  },
  {
    text: "Bentley BIM Model",
    onselect: async () => {
      scene.primitives.remove(tileset);
      try {
        tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2464651);
        scene.primitives.add(tileset);
        viewer.zoomTo(tileset);
      } catch (error) {
        console.log(error);
      }
    },
  },
  {
    text: "Instanced",
    onselect: async () => {
      scene.primitives.remove(tileset);
      try {
        tileset = await Cesium.Cesium3DTileset.fromUrl(
          "../../SampleData/Cesium3DTiles/Instanced/InstancedWithBatchTable/tileset.json",
        );
        scene.primitives.add(tileset);
        viewer.zoomTo(tileset);
      } catch (error) {
        console.log(error);
      }
    },
  },
];

Sandcastle.addDefaultToolbarMenu(options);

const scratchCartesian = new Cesium.Cartesian3();
const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
handler.setInputAction(function (movement) {
  const pickedPositionResult = scene.pickPosition(movement.position);
  if (Cesium.defined(pickedPositionResult)) {
    viewer.entities.add({
      position: pickedPositionResult,
      point: {
        pixelSize: 10,
        color: Cesium.Color.RED,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
  }

  const ray = scene.camera.getPickRay(movement.position);
  const picked = tileset.pick(ray, scene.frameState, scratchCartesian);

  if (Cesium.defined(picked)) {
    viewer.entities.add({
      position: picked,
      point: {
        pixelSize: 10,
        color: Cesium.Color.YELLOW,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
