// Set your Cesium Ion access token from .env file or use default
Cesium.Ion.defaultAccessToken = 'YOUR_CESIUM_ION_ACCESS_TOKEN';

// Google 2D Tiles asset ID from Cesium Ion
const assetId = 3830184;

// Create Google imagery layer from Ion
const google = Cesium.ImageryLayer.fromProviderAsync(
    Cesium.IonImageryProvider.fromAssetId(assetId)
);

// Initialize the Cesium Viewer
async function initViewer() {
    const viewer = new Cesium.Viewer("cesiumContainer", {
        animation: false,
        baseLayer: false,
        baseLayerPicker: false,
        geocoder: false,
        timeline: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        homeButton: false,
        terrainProvider: await Cesium.CesiumTerrainProvider.fromIonAssetId(1),
    });

    // Add the Google imagery layer to the viewer
    viewer.imageryLayers.add(google);

    // Fly to Philadelphia area
    viewer.scene.camera.flyTo({
        duration: 0,
        destination: Cesium.Rectangle.fromDegrees(
            -75.280266,
            39.867004,
            -74.955763,
            40.137992
        ),
    });
}

// Initialize the viewer
initViewer().catch(console.error);
