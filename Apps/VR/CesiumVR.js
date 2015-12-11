/*global require*/
require({
            baseUrl : '.',
            paths : {
                domReady : '../../ThirdParty/requirejs-2.1.20/domReady',
                Cesium : '../../Source'
            }
        }, [
           'Cesium/Widgets/FullscreenButton/FullScreenButton',
           'Cesium/Widgets/Viewer/Viewer',
           'domReady!'
       ], function(
    FullscreenButton,
    Viewer) {
    "use strict";

    var loadingIndicator = document.getElementById('loadingIndicator');
    var viewer = new Viewer('cesiumContainer', {
        animation : false,
        baseLayerPicker : false,
        fullscreenButton : false,
        geocoder : false,
        homeButton : false,
        infoBox : false,
        sceneModePicker : false,
        selectionIndicator : false,
        timeline : false,
        navigationHelpButton : false,
        navigationInstructionsInitiallyVisible : false,
        scene3DOnly : true
    });

    var vrHMD;
    var vrSensor;

    function EnumerateVRDevice(devices) {
        for (var i = 0; i < devices.length; ++i) {
            if (devices[i] instanceof HMDVRDevice) {
                vrHMD = devices[i];

                /*
                if ('getEyeParameters' in vrHMD) {
                    var leftEye = vrHMD.getEyeParameters("left");
                    var rightEye = vrHMD.getEyeParameters("right");

                    var e = leftEye.eyeTranslation;
                    vrEyeLeft = [e.x, e.y, e.z];
                    e = rightEye.eyeTranslation;
                    vrEyeRight = [e.x, e.y, e.z];

                    vrFovLeft = leftEye.recommendedFieldOfView;
                    vrFovRight = rightEye.recommendedFieldOfView;
                } else {
                    var e = vrHMD.getEyeTranslation("left");
                    vrEyeLeft = [e.x, e.y, e.z];
                    e = vrHMD.getEyeTranslation("right");
                    vrEyeRight = [e.x, e.y, e.z];

                    vrFovLeft = vrHMD.getRecommendedEyeFieldOfView("left");
                    vrFovRight = vrHMD.getRecommendedEyeFieldOfView("right");
                }
                */

                break;
            }
        }

        for (var i = 0; i < devices.length; ++i) {
            if (devices[i] instanceof PositionSensorVRDevice) {
                // If we have an HMD, make sure to get the associated sensor
                if (vrHMD == null || vrHMD.hardwareUnitId == devices[i].hardwareUnitId) {
                    vrSensor = devices[i];
                    break;
                }
            }
        }

        var fullscreenContainer = document.createElement('div');
        fullscreenContainer.className = 'cesium-viewer-fullscreenContainer';
        document.getElementsByClassName('cesium-viewer')[0].appendChild(fullscreenContainer);
        var fullscreenButton = new FullscreenButton(fullscreenContainer, viewer.canvas, vrHMD);
    }

    if (navigator.getVRDevices) {
        navigator.getVRDevices().then(EnumerateVRDevice);
    } else if (navigator.mozGetVRDevices) {
        navigator.mozGetVRDevices(EnumerateVRDevice);
    }

    loadingIndicator.style.display = 'none';
});