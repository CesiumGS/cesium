import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer");

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

const longitude = -75.222071;
const latitude = 40.027237;
const height = 1; // in meters

const cartographic = new Cesium.Cartographic.fromDegrees(
  longitude,
  latitude,
  height,
);

const panoIds = await provider.getPanoIds(cartographic);

const panoIdMetadata = await provider.getPanoIdMetadata(panoIds[0]);

const panoLat = panoIdMetadata.lat;
const panoLng = panoIdMetadata.lng;

const streetViewPanorama = await provider.loadPanoramafromPanoId(panoIds[0], 3);

viewer.scene.primitives.add(streetViewPanorama);

// Convert to Cartesian3 position
const position = Cesium.Cartesian3.fromDegrees(panoLng, panoLat, height);

// Create a transform matrix to place the sphere at the correct location
const transform = Cesium.Transforms.eastNorthUpToFixedFrame(position);

// Lock the camera to this position
viewer.scene.camera.lookAtTransform(
  transform,
  new Cesium.HeadingPitchRange(
    Cesium.Math.toRadians(panoIdMetadata.heading), // heading
    0, // pitch
    2, // small offset to allow rotation
  ),
);

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

const startCartographic = Cesium.Cartographic.fromDegrees(
  panoIdMetadata.lng,
  panoIdMetadata.lat,
  0,
);

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

Object.keys(panoIdMetadata.links).forEach((linkId) => {
  const link = panoIdMetadata.links[linkId];
  const destPoint = destinationPoint(startCartographic, link.heading, 15, 0);
  console.log(destPoint);
  // Add a point at the destination
  viewer.entities.add({
    position: destPoint,
    point: {
      pixelSize: 30,
      color: Cesium.Color.RED,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
    },
  });
});
