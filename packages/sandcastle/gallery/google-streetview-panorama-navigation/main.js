import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  selectionIndicator: false,
  infoBox: false,
});

let initialPano = true;

viewer.scene.globe.show = false;

// Add Photorealistic 3D Tiles
let tileset;
try {
  tileset = await Cesium.createGooglePhotorealistic3DTileset({
    // Only the Google Geocoder can be used with Google Photorealistic 3D Tiles.  Set the `geocode` property of the viewer constructor options to IonGeocodeProviderType.GOOGLE.
    onlyUsingWithGoogleGeocoder: true,
  });
  viewer.scene.primitives.add(tileset);
} catch (error) {
  console.log(`Error loading Photorealistic 3D Tiles tileset.
          ${error}`);
}

const googleMapTilesApiKey = "Google Map Tiles API Key";

const provider = await Cesium.GoogleStreetViewProvider.fromUrl({
  apiKey: googleMapTilesApiKey,
});

async function loadPanorama(panoId) {
  const panoIdMetadata = await provider.getPanoIdMetadata(panoId);
  const streetViewPanorama = await provider.loadPanoramaFromPanoId(panoId, 3);
  viewer.scene.primitives.add(streetViewPanorama);
  positionCameraInPano(panoIdMetadata);
  plotPanoLinks(panoIdMetadata);
  initialPano = false;
}

function positionCameraInPano(panoIdMetadata) {
  const panoLat = panoIdMetadata.lat;
  const panoLng = panoIdMetadata.lng;
  // Convert to Cartesian3 position
  const position = Cesium.Cartesian3.fromDegrees(panoLng, panoLat, height);

  // Create a transform matrix to place the sphere at the correct location
  const transform = Cesium.Transforms.eastNorthUpToFixedFrame(position);

  // Lock the camera to this position
  viewer.scene.camera.lookAtTransform(
    transform,
    new Cesium.HeadingPitchRange(
      initialPano
        ? Cesium.Math.toRadians(panoIdMetadata.heading)
        : viewer.camera.heading, // heading
      0, // pitch
      2, // small offset to allow rotation
    ),
  );
}

// Allow camera to rotate, tilt, and zoom
const controller = viewer.scene.screenSpaceCameraController;
controller.enableRotate = true;
controller.enableZoom = false;
controller.enableTilt = true;
controller.enableTranslate = false;

Sandcastle.addToolbarButton("Toggle Photorealistic Tiles", function () {
  if (!tileset.show) {
    tileset.show = true;
  } else {
    tileset.show = false;
  }
});

// Use Cesium EllipsoidGeodesic to calculate destination
function destinationPoint(startCartographic, heading, distance, height) {
  const headingRad = Cesium.Math.toRadians(heading);
  const R = 6378137.0; // WGS84 radius
  const deltaLat = (distance * Math.cos(headingRad)) / R;
  const deltaLon =
    (distance * Math.sin(headingRad)) /
    (R * Math.cos(startCartographic.latitude));
  const destLat = Cesium.Math.toDegrees(startCartographic.latitude + deltaLat);
  const destLon = Cesium.Math.toDegrees(startCartographic.longitude + deltaLon);
  // Convert destination to Cartesian3
  const destCartesian = Cesium.Cartesian3.fromDegrees(destLon, destLat, height);
  return destCartesian;
}

function plotPanoLinks(panoIdMetadata) {
  const startCartographic = Cesium.Cartographic.fromDegrees(
    panoIdMetadata.lng,
    panoIdMetadata.lat,
    0,
  );
  Object.keys(panoIdMetadata.links).forEach((linkId) => {
    const link = panoIdMetadata.links[linkId];
    const destPoint = destinationPoint(startCartographic, link.heading, 15, 0);
    // Add a point at the destination
    viewer.entities.add({
      position: destPoint,
      point: {
        pixelSize: 30,
        color: Cesium.Color.RED,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
      },
      // custom data
      linkId: linkId,
      panoId: link.panoId,
    });
  });
}

function removeOtherPanoLinks() {
  const entities = viewer.entities.values;

  for (let i = entities.length - 1; i >= 0; i--) {
    const entity = entities[i];

    // only touch entities that have a panoId field
    if (entity.panoId !== undefined) {
      viewer.entities.remove(entity);
    }
  }
}

const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

handler.setInputAction((movement) => {
  const picked = viewer.scene.pick(movement.position);

  if (Cesium.defined(picked) && Cesium.defined(picked.id)) {
    const entity = picked.id;

    if (entity.linkId) {
      console.log("Clicked link:", entity.linkId);
      console.log("Link data:", entity.linkData);

      const primitives = viewer.scene.primitives;
      // Iterate in reverse to avoid index issues when removing
      for (let i = primitives.length - 1; i >= 0; i--) {
        const primitive = primitives.get(i);
        const remove = primitive instanceof Cesium.EquirectangularPanorama;
        if (remove) {
          primitives.remove(primitive);
        }
      }
      removeOtherPanoLinks(entity.panoId);

      loadPanorama(entity.panoId);
    }
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// load initial scene

const longitude = -75.222071;
const latitude = 40.027237;
const height = 1; // in meters

const cartographic = new Cesium.Cartographic.fromDegrees(
  longitude,
  latitude,
  height,
);

const panoIds = await provider.getPanoIds(cartographic);

loadPanorama(panoIds[0]);
