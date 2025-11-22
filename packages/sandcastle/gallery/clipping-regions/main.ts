import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  timeline: false,
  animation: false,
  sceneModePicker: false,
  baseLayerPicker: false,
  geocoder: Cesium.IonGeocodeProviderType.GOOGLE,
});
const scene = viewer.scene;

// Enable rendering the sky
scene.skyAtmosphere.show = true;

let worldTerrain;
try {
  worldTerrain = await Cesium.createWorldTerrainAsync();
  scene.terrainProvider = worldTerrain;
  scene.globe.show = false;
} catch (error) {
  window.alert(`There was an error creating world terrain. ${error}`);
}

let worldTileset;
try {
  worldTileset = await Cesium.createGooglePhotorealistic3DTileset({
    // Only the Google Geocoder can be used with Google Photorealistic 3D Tiles.  Set the `geocode` property of the viewer constructor options to IonGeocodeProviderType.GOOGLE.
    onlyUsingWithGoogleGeocoder: true,
  });
  scene.primitives.add(worldTileset);
} catch (error) {
  console.log(`Error loading Photorealistic 3D Tiles tileset.
            ${error}`);
}

// Add tileset of proposed new building
let buildingTileset;
try {
  buildingTileset = await Cesium.Cesium3DTileset.fromIonAssetId(1670818);
  scene.primitives.add(buildingTileset);
} catch (error) {
  console.log(`Error loading building tileset.
  ${error}`);
}

// Zoom to the new building location
const cameraOffset = new Cesium.HeadingPitchRange(
  Cesium.Math.toRadians(95.0),
  Cesium.Math.toRadians(-18.0),
  600.0,
);
viewer.zoomTo(buildingTileset, cameraOffset);

// Add a clipping region covering total lot
const polygons = [
  new Cesium.ClippingPolygon({
    positions: Cesium.Cartesian3.fromDegreesArray(
      [
        [-105.0077102972673, 39.75198671798765],
        [-105.0095858062031, 39.75049417970743],
        [-105.00969000114443, 39.75035082687128],
        [-105.00972838875393, 39.75013579705808],
        [-105.00971742086537, 39.74997136204101],
        [-105.00962967775735, 39.749768979944236],
        [-105.00932806082336, 39.74928832007956],
        [-105.00887837739427, 39.749444324087904],
        [-105.00854934073887, 39.749663572365904],
        [-105.00822578802776, 39.749967145754084],
        [-105.00715641889735, 39.751312128419926],
        [-105.00715641889735, 39.75135429046085],
        [-105.0077102972673, 39.75198671798765],
      ].flat(2),
    ),
  }),
];

scene.globe.clippingPolygons = new Cesium.ClippingPolygonCollection({
  polygons: polygons,
});
worldTileset.clippingPolygons = new Cesium.ClippingPolygonCollection({
  polygons: polygons,
});

// Toggle between globe terrain and a global 3D tileset
Sandcastle.addToolbarMenu([
  {
    text: "3D Tiles",
    onselect: () => {
      scene.globe.show = false;
      worldTileset.show = true;
    },
  },
  {
    text: "Terrain",
    onselect: () => {
      scene.globe.show = true;
      worldTileset.show = false;
    },
  },
]);

// Toggle building inset visibility
Sandcastle.addToggleButton("Show building", true, function (checked) {
  buildingTileset.show = checked;
});

// Toggle clipping polygons enabled
Sandcastle.addToggleButton("Enable clipping", true, function (checked) {
  worldTileset.clippingPolygons.enabled = checked;
  scene.globe.clippingPolygons.enabled = checked;
});

// Toggle between default and inverse clipping
Sandcastle.addToggleButton("Inverse clipping", false, function (checked) {
  worldTileset.clippingPolygons.inverse = checked;
  scene.globe.clippingPolygons.inverse = checked;
});

Sandcastle.addToolbarButton("Remove last polygon", () => {
  if (worldTileset.clippingPolygons.length > 0) {
    worldTileset.clippingPolygons.remove(
      worldTileset.clippingPolygons.get(
        worldTileset.clippingPolygons.length - 1,
      ),
    );
  }

  if (scene.globe.clippingPolygons.length > 0) {
    scene.globe.clippingPolygons.remove(
      scene.globe.clippingPolygons.get(scene.globe.clippingPolygons.length - 1),
    );
  }
});

// Allow clicking new positions to
viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
  Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
);
function createPoint(worldPosition) {
  const point = viewer.entities.add({
    position: worldPosition,
    point: {
      color: Cesium.Color.WHITE,
      pixelSize: 5,
    },
  });
  return point;
}
function drawShape(positionData) {
  return viewer.entities.add({
    polygon: {
      hierarchy: positionData,
      material: new Cesium.ColorMaterialProperty(
        Cesium.Color.WHITE.withAlpha(0.7),
      ),
    },
  });
}
let activeShapePoints = [];
let activeShape;
let floatingPoint;
const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
handler.setInputAction(function (event) {
  // We use `viewer.scene.globe.pick here instead of `viewer.camera.pickEllipsoid` so that
  // we get the correct point when mousing over terrain.
  const ray = viewer.camera.getPickRay(event.position);
  const earthPosition = scene.globe.show
    ? scene.globe.pick(ray, scene)
    : scene.pickPosition(event.position);

  // `earthPosition` will be undefined if our mouse is not over the globe.
  if (Cesium.defined(earthPosition)) {
    if (activeShapePoints.length === 0) {
      floatingPoint = createPoint(earthPosition);
      activeShapePoints.push(earthPosition);
      const dynamicPositions = new Cesium.CallbackProperty(function () {
        return new Cesium.PolygonHierarchy(activeShapePoints);
      }, false);
      activeShape = drawShape(dynamicPositions);
    }
    activeShapePoints.push(earthPosition);
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

handler.setInputAction(function (event) {
  if (Cesium.defined(floatingPoint)) {
    const ray = viewer.camera.getPickRay(event.endPosition);
    const newPosition = scene.globe.show
      ? scene.globe.pick(ray, scene)
      : viewer.scene.pickPosition(event.endPosition);
    if (Cesium.defined(newPosition)) {
      floatingPoint.position.setValue(newPosition);
      activeShapePoints.pop();
      activeShapePoints.push(newPosition);
    }
  }
}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

function createClippingPolygon(positions) {
  if (positions.length < 3) {
    return;
  }

  worldTileset.clippingPolygons.add(
    new Cesium.ClippingPolygon({
      positions: positions,
    }),
  );

  scene.globe.clippingPolygons.add(
    new Cesium.ClippingPolygon({
      positions: positions,
    }),
  );
}

function terminateShape() {
  activeShapePoints.pop();
  createClippingPolygon(activeShapePoints);
  viewer.entities.remove(floatingPoint);
  viewer.entities.remove(activeShape);
  floatingPoint = undefined;
  activeShape = undefined;
  activeShapePoints = [];
}
handler.setInputAction(function (event) {
  terminateShape();
}, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
