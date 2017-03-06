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

    var viewer = new Viewer('cesiumContainer', {
        baseLayerPicker: false,
        imageryProvider: createOpenStreetMapImageryProvider()
    });

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
            pitchAdjustAltitude: 10000,
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
            pitchAdjustAltitude: 10000,
            flyOverLon: CesiumMath.toRadians(0),
            flyOverLonWeight: 3
        });
    };

    function Tween() {
        this.queue = [];
        this.index = 0;
        this.next = this.next.bind(this);
    }

    Tween.prototype.add = function(f) {
        this.queue.push(f);
        return this;
    };

    Tween.prototype.run = function() {
        this.queue[0](this.next);
    };

    Tween.prototype.next = function() {
        var n = this.queue[this.index++];
        if (n) {
            n(this.next);
        }
    };

    function wrapWait(seconds, callback) {
        var t = seconds * 1000;
        return function(next) {
            setTimeout(function() {
                callback();
                if (next) {
                    next();
                }
            }, t);
        };
    }

    new Tween()
        .add(wrapWait(30, flyToSF))
        .add(wrapWait(10, flyToTokyo))
        .run();

    var loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.style.display = 'none';
});
