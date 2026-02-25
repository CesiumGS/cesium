// Set your Cesium Ion access token from .env file or use default
Cesium.Ion.defaultAccessToken = 'YOUR_CESIUM_ION_ACCESS_TOKEN';

async function initViewer() {
    const viewer = new Cesium.Viewer('cesiumContainer', {
        baseLayerPicker: false
    });

    // Add Bing Maps imagery from Cesium ion
    const bingMaps = await viewer.imageryLayers.addImageryProvider(
        await Cesium.IonImageryProvider.fromAssetId(2)
    );

    // Change layer opacity
    bingMaps.alpha = 0.5;

    // Add another layer
    const arcGis = await viewer.imageryLayers.addImageryProvider(
        await Cesium.ArcGisMapServerImageryProvider.fromUrl(
            'https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer'
        )
    );

    arcGis.alpha = 0.5;
}

// Initialize the viewer
initViewer().catch(console.error);
