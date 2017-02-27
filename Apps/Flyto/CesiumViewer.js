/*global define*/
define([
        'Cesium/Core/Cartesian3',
        'Cesium/Core/Math',
        'Cesium/Core/objectToQuery',
        'Cesium/Core/queryToObject',
        'Cesium/Scene/createOpenStreetMapImageryProvider',
        'Cesium/Widgets/Viewer/Viewer',
        'domReady!'
    ], function(
        Cartesian3,
        CesiumMath,
        objectToQuery,
        queryToObject,
        createOpenStreetMapImageryProvider,
        Viewer) {
    'use strict';

    var endUserOptions = queryToObject(window.location.search.substring(1));

    var viewer = new Viewer('cesiumContainer', {
        baseLayerPicker: false,
        imageryProvider: createOpenStreetMapImageryProvider()
    });

    // 35.6891 139.7899  tokyo
    // 37.7757 -122.4382 SF

    viewer.camera.flyTo({
        duration: 0,
        destination : Cartesian3.fromDegrees(139.7899, 35.6891, 35000.0),
        orientation : {
            heading : CesiumMath.toRadians(15),
            pitch : CesiumMath.toRadians(-35.0),
            roll : 0.0
        }
    });

    var flyToSF = function(){
       viewer.camera.flyTo({
            duration: 10,
            destination : Cartesian3.fromDegrees(-122.4382, 37.7757, 45000.0),
            orientation : {
                heading : CesiumMath.toRadians(25),
                pitch : CesiumMath.toRadians(-15.0),
                roll : 0.0
            },
            maximumHeight: 1000000,
            flyOverLon: CesiumMath.toRadians(0),
            flyOverLonWeight: 3
        }); 
    };

    var flyToTokyo = function(){
       viewer.camera.flyTo({
            duration: 10,
            destination : Cartesian3.fromDegrees(139.7899, 35.6891, 35000.0),
            orientation : {
                heading : CesiumMath.toRadians(15),
                pitch : CesiumMath.toRadians(-35.0),
                roll : 0.0
            },
            maximumHeight: 1000000,
            flyOverLon: CesiumMath.toRadians(0),
            flyOverLonWeight: 3
        }); 
    };

    setTimeout(function() {
        flyToSF();
        setTimeout(flyToTokyo, 10 * 1000)
    }, 30 * 1000);

    var loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.style.display = 'none';
});
