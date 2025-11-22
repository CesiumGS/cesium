import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  timeline: false,
  animation: false,
  sceneModePicker: false,
  baseLayerPicker: false,
  geocoder: Cesium.IonGeocodeProviderType.GOOGLE,
  // The globe does not need to be displayed,
  // since the Photorealistic 3D Tiles include terrain
  globe: false,
});

// Enable rendering the sky
viewer.scene.skyAtmosphere.show = true;

// Add Photorealistic 3D Tiles
try {
  const tileset = await Cesium.createGooglePhotorealistic3DTileset({
    // Only the Google Geocoder can be used with Google Photorealistic 3D Tiles.  Set the `geocode` property of the viewer constructor options to IonGeocodeProviderType.GOOGLE.
    onlyUsingWithGoogleGeocoder: true,
  });
  viewer.scene.primitives.add(tileset);
} catch (error) {
  console.log(`Error loading Photorealistic 3D Tiles tileset.
          ${error}`);
}

// Point the camera at the Googleplex
viewer.scene.camera.setView({
  destination: new Cesium.Cartesian3(
    -2693797.551060477,
    -4297135.517094725,
    3854700.7470414364,
  ),
  orientation: new Cesium.HeadingPitchRoll(
    4.6550106925119925,
    -0.2863894863138836,
    1.3561760425773173e-7,
  ),
});
