// Set your Cesium Ion access token from .env file or use default
Cesium.Ion.defaultAccessToken = 'YOUR_CESIUM_ION_ACCESS_TOKEN';

// Wait for DOM to be ready
window.addEventListener('DOMContentLoaded', function() {
    const viewer = new Cesium.Viewer('cesiumContainer');

    // Set camera position with heading, pitch and roll
    viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(-122.4175, 37.655, 400),
        orientation: {
            heading: Cesium.Math.toRadians(0.0),
            pitch: Cesium.Math.toRadians(-15.0),
            roll: 0.0
        }
    });

    // Fly to a location
    setTimeout(() => {
        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(-73.98, 40.75, 200),
            orientation: {
                heading: Cesium.Math.toRadians(0.0),
                pitch: Cesium.Math.toRadians(-20.0),
            },
            duration: 3
        });
    }, 2000);
});
