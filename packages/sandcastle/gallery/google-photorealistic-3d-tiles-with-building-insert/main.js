import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

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
  const googleTileset = await Cesium.createGooglePhotorealistic3DTileset({
    // Only the Google Geocoder can be used with Google Photorealistic 3D Tiles.  Set the `geocode` property of the viewer constructor options to IonGeocodeProviderType.GOOGLE.
    onlyUsingWithGoogleGeocoder: true,
  });
  viewer.scene.primitives.add(googleTileset);
} catch (error) {
  console.log(`Error loading Photorealistic 3D Tiles tileset.
  ${error}`);
}

// Add highlight of target lot for development
const targetHighlight = new Cesium.Entity({
  polygon: {
    hierarchy: Cesium.Cartesian3.fromDegreesArray(
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
    material: Cesium.Color.YELLOW.withAlpha(0.6),
    classificationType: Cesium.ClassificationType.CESIUM_3D_TILE,
  },
});
viewer.entities.add(targetHighlight);

// Add tileset of proposed new building
let buildingTileset;
try {
  buildingTileset = await Cesium.Cesium3DTileset.fromIonAssetId(1670818);
  viewer.scene.primitives.add(buildingTileset);
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

// Enable toggling of new building visibility
Sandcastle.addToggleButton("Show proposed building", true, function (checked) {
  buildingTileset.show = checked;
});

// Enable toggling of target location highlight
Sandcastle.addToggleButton(
  "Highlight target location",
  true,
  function (checked) {
    if (checked) {
      viewer.entities.add(targetHighlight);
    } else {
      viewer.entities.remove(targetHighlight);
    }
  },
);
