// Set your Cesium Ion access token from .env file or use default
Cesium.Ion.defaultAccessToken = 'YOUR_CESIUM_ION_ACCESS_TOKEN';

const viewer = new Cesium.Viewer('cesiumContainer');

// Add terrain
Cesium.CesiumTerrainProvider.fromIonAssetId(1).then(function(terrainProvider) {
    viewer.terrainProvider = terrainProvider;
    
    // Enable terrain exaggeration
    viewer.scene.verticalExaggeration = 2.0;
    
    // Fly to Mount Everest
    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(86.9250, 27.9881, 12000),
        orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-20),
        }
    });
});
