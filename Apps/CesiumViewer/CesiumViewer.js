/*global define*/
define([
        'dojo/dom',
        'dojo/on',
        'dojo/_base/event',
        'dojo/io-query',
        'dijit/registry',
        'DojoWidgets/CesiumWidget',
        'DojoWidgets/getJson',
        'Core/DefaultProxy',
        'Core/JulianDate',
        'Core/Clock',
        'Core/ClockStep',
        'Core/ClockRange',
        'Core/Iso8601',
        'Core/FullScreen',
        'Core/Ellipsoid',
        'Core/Transforms',
        'Core/Cartesian3',
        'Core/requestAnimationFrame',
        'Scene/SceneTransitioner',
        'Scene/BingMapsStyle',
        'DynamicScene/processCzml',
        'DynamicScene/DynamicObjectCollection',
        'DynamicScene/VisualizerCollection',
        './AnimationController'
    ], function(
        dom,
        on,
        event,
        ioQuery,
        registry,
        CesiumWidget,
        getJson,
        DefaultProxy,
        JulianDate,
        Clock,
        ClockStep,
        ClockRange,
        Iso8601,
        FullScreen,
        Ellipsoid,
        Transforms,
        Cartesian3,
        requestAnimationFrame,
        SceneTransitioner,
        BingMapsStyle,
        processCzml,
        DynamicObjectCollection,
        VisualizerCollection,
        AnimationController) {
    "use strict";
    /*global console*/

    var visualizers;
    var currentTime = new JulianDate();
    var clock = new Clock({
        startTime : currentTime.addDays(-0.5),
        stopTime : currentTime.addDays(0.5),
        currentTime : currentTime,
        clockStep : ClockStep.SYSTEM_CLOCK_DEPENDENT,
        multiplier : 1
    });
    var animationController = new AnimationController(clock);
    var spindleController;
    var timeline;
    var transitioner;
    var dynamicObjectCollection = new DynamicObjectCollection();
    var speedIndicatorElement;
    var timeLabel;
    var lastTimeLabelUpdate;
    var cameraCenteredObjectID;
    var cameraCenteredObjectIDPosition;
    var lastCameraCenteredObjectID;

    function updateSpeedIndicator() {
        if (animationController.isAnimating()) {
            speedIndicatorElement.innerHTML = clock.multiplier + 'x realtime';
        } else {
            speedIndicatorElement.innerHTML = clock.multiplier + 'x realtime (paused)';
        }
    }

    function setTimeFromBuffer() {
        var animReverse = registry.byId('animReverse');
        var animPause = registry.byId('animPause');
        var animPlay = registry.byId('animPlay');
        animReverse.set('checked', false);
        animPause.set('checked', true);
        animPlay.set('checked', false);

        var availability = dynamicObjectCollection.computeAvailability();
        if (availability.start.equals(Iso8601.MINIMUM_VALUE)) {
            clock.startTime = new JulianDate();
            clock.stopTime = clock.startTime.addDays(1);
            clock.clockRange = ClockRange.UNBOUNDED;
        } else {
            clock.startTime = availability.start;
            clock.stopTime = availability.stop;
            clock.clockRange = ClockRange.LOOP;
        }

        clock.multiplier = 60;
        clock.currentTime = clock.startTime;
        timeline.zoomTo(clock.startTime, clock.stopTime);
        updateSpeedIndicator();
    }

    function handleDrop(e) {
        e.stopPropagation(); // Stops some browsers from redirecting.
        e.preventDefault();

        var files = e.dataTransfer.files;
        var f = files[0];
        var reader = new FileReader();
        reader.onload = function(evt) {
            //CZML_TODO visualizers.removeAllPrimitives(); is not really needed here, but right now visualizers
            //cache data indefinitely and removeAll is the only way to get rid of it.
            //while there are no visual differences, removeAll cleans the cache and improves performance
            visualizers.removeAllPrimitives();
            dynamicObjectCollection.clear();
            processCzml(JSON.parse(evt.target.result), dynamicObjectCollection, f.name);
            setTimeFromBuffer();
        };
        reader.readAsText(f);
    }

    function onObjectRightClickSelected(selectedObject) {
        if (selectedObject && selectedObject.dynamicObject) {
            cameraCenteredObjectID = selectedObject.dynamicObject.id;
        } else {
            cameraCenteredObjectID = undefined;
        }
    }

    var cesium = new CesiumWidget({
        clock : clock,

        postSetup : function(widget) {
            var scene = widget.scene;

            function update() {
                var currentTime = animationController.update();

                if (typeof timeline !== 'undefined') {
                    timeline.updateFromClock();
                }
                visualizers.update(currentTime);

                if (Math.abs(currentTime.getSecondsDifference(lastTimeLabelUpdate)) >= 1.0) {
                    timeLabel.innerHTML = currentTime.toDate().toUTCString();
                    lastTimeLabelUpdate = currentTime;
                }

                // Update the camera to stay centered on the selected object, if any.
                if (cameraCenteredObjectID) {
                    var dynamicObject = dynamicObjectCollection.getObject(cameraCenteredObjectID);
                    if (dynamicObject && dynamicObject.position) {
                        cameraCenteredObjectIDPosition = dynamicObject.position.getValueCartesian(currentTime, cameraCenteredObjectIDPosition);
                        if (typeof cameraCenteredObjectIDPosition !== 'undefined') {
                            // If we're centering on an object for the first time, zoom to within 2km of it.
                            if (lastCameraCenteredObjectID !== cameraCenteredObjectID) {
                                lastCameraCenteredObjectID = cameraCenteredObjectID;
                                var camera = widget.scene.getCamera();
                                camera.position = camera.position.normalize().multiplyByScalar(5000.0);

                                var controllers = camera.getControllers();
                                controllers.removeAll();
                                spindleController = controllers.addSpindle();
                                spindleController.constrainedAxis = Cartesian3.UNIT_Z;
                            }

                            if (typeof spindleController !== 'undefined' && !spindleController.isDestroyed()) {
                                var transform = Transforms.eastNorthUpToFixedFrame(cameraCenteredObjectIDPosition, widget.ellipsoid);
                                spindleController.setReferenceFrame(transform, Ellipsoid.UNIT_SPHERE);
                            }
                        }
                    }
                }
                widget.render(currentTime);
                requestAnimationFrame(update);
            }

            transitioner = new SceneTransitioner(scene);
            visualizers = VisualizerCollection.createCzmlStandardCollection(scene, dynamicObjectCollection);
            //widget.enableStatistics(true);

            var queryObject = {};
            if (window.location.search) {
                queryObject = ioQuery.queryToObject(window.location.search.substring(1));
            }

            if (typeof queryObject.source !== 'undefined') {
                getJson(queryObject.source).then(function(czmlData) {
                    processCzml(czmlData, dynamicObjectCollection, queryObject.source);
                    setTimeFromBuffer();
                });
            }

            if (typeof queryObject.lookAt !== 'undefined') {
                cameraCenteredObjectID = queryObject.lookAt;
            }

            on(cesium, 'ObjectRightClickSelected', onObjectRightClickSelected);

            var dropBox = dom.byId('cesiumContainer');
            on(dropBox, 'drop', handleDrop);
            on(dropBox, 'dragenter', event.stop);
            on(dropBox, 'dragover', event.stop);
            on(dropBox, 'dragexit', event.stop);

            on(window, 'resize', function() {
                cesium.resize();
            });

            lastTimeLabelUpdate = clock.currentTime;
            timeLabel = dom.byId('timeLabel_label');
            timeLabel.innerHTML = clock.currentTime.toDate().toUTCString();

            speedIndicatorElement = dom.byId('speedIndicator');
            updateSpeedIndicator();

            var animReverse = registry.byId('animReverse');
            var animPause = registry.byId('animPause');
            var animPlay = registry.byId('animPlay');

            on(registry.byId('animReset'), 'Click', function() {
                animationController.reset();
                animReverse.set('checked', false);
                animPause.set('checked', true);
                animPlay.set('checked', false);
                updateSpeedIndicator();
            });

            function onAnimPause() {
                animationController.pause();
                animReverse.set('checked', false);
                animPause.set('checked', true);
                animPlay.set('checked', false);
                updateSpeedIndicator();
            }

            on(animPause, 'Click', onAnimPause);

            on(animReverse, 'Click', function() {
                animationController.playReverse();
                animReverse.set('checked', true);
                animPause.set('checked', false);
                animPlay.set('checked', false);
                updateSpeedIndicator();
            });

            on(animPlay, 'Click', function() {
                animationController.play();
                animReverse.set('checked', false);
                animPause.set('checked', false);
                animPlay.set('checked', true);
                updateSpeedIndicator();
            });

            on(registry.byId('animSlow'), 'Click', function() {
                animationController.slower();
                updateSpeedIndicator();
            });

            on(registry.byId('animFast'), 'Click', function() {
                animationController.faster();
                updateSpeedIndicator();
            });

            function onTimelineScrub(e) {
                clock.currentTime = e.timeJulian;
                onAnimPause();
            }

            var timelineWidget = registry.byId('mainTimeline');
            timelineWidget.clock = clock;
            timelineWidget.setupCallback = function(t) {
                timeline = t;
                timeline.addEventListener('settime', onTimelineScrub, false);
                timeline.zoomTo(clock.startTime, clock.stopTime);
            };

            var viewHome = registry.byId('viewHome');
            var view2D = registry.byId('view2D');
            var view3D = registry.byId('view3D');
            var viewColumbus = registry.byId('viewColumbus');
            var viewFullScreen = registry.byId('viewFullScreen');

            view2D.set('checked', false);
            view3D.set('checked', true);
            viewColumbus.set('checked', false);

            on(viewFullScreen, 'Click', function() {
                if (FullScreen.isFullscreenEnabled()) {
                    FullScreen.exitFullscreen();
                } else {
                    FullScreen.requestFullScreen(document.body);
                }
            });

            on(viewHome, 'Click', function() {
                view2D.set('checked', false);
                view3D.set('checked', true);
                viewColumbus.set('checked', false);
                transitioner.morphTo3D();
                cesium.viewHome();
                cesium.showSkyAtmosphere(true);
                cesium.showGroundAtmosphere(true);
            });
            on(view2D, 'Click', function() {
                cameraCenteredObjectID = undefined;
                view2D.set('checked', true);
                view3D.set('checked', false);
                viewColumbus.set('checked', false);
                cesium.showSkyAtmosphere(false);
                cesium.showGroundAtmosphere(false);
                transitioner.morphTo2D();
            });
            on(view3D, 'Click', function() {
                cameraCenteredObjectID = undefined;
                view2D.set('checked', false);
                view3D.set('checked', true);
                viewColumbus.set('checked', false);
                transitioner.morphTo3D();
                cesium.showSkyAtmosphere(true);
                cesium.showGroundAtmosphere(true);
            });
            on(viewColumbus, 'Click', function() {
                cameraCenteredObjectID = undefined;
                view2D.set('checked', false);
                view3D.set('checked', false);
                viewColumbus.set('checked', true);
                cesium.showSkyAtmosphere(false);
                cesium.showGroundAtmosphere(false);
                transitioner.morphToColumbusView();
            });

            var cbLighting = registry.byId('cbLighting');
            on(cbLighting, 'Change', function(value) {
                cesium.centralBody.affectedByLighting = !value;
            });

            var imagery = registry.byId('imagery');
            var imageryAerial = registry.byId('imageryAerial');
            var imageryAerialWithLabels = registry.byId('imageryAerialWithLabels');
            var imageryRoad = registry.byId('imageryRoad');
            var imagerySingleTile = registry.byId('imagerySingleTile');
            var imageryOptions = [imageryAerial, imageryAerialWithLabels, imageryRoad, imagerySingleTile];
            var bingHtml = imagery.containerNode.innerHTML;

            function createImageryClickFunction(control, style) {
                return function() {
                    if (style) {
                        cesium.setStreamingImageryMapStyle(style);
                        imagery.containerNode.innerHTML = bingHtml;
                    } else {
                        cesium.enableStreamingImagery(false);
                        imagery.containerNode.innerHTML = 'Imagery';
                    }

                    imageryOptions.forEach(function(o) {
                        o.set('checked', o === control);
                    });
                };
            }

            on(imageryAerial, 'Click', createImageryClickFunction(imageryAerial, BingMapsStyle.AERIAL));
            on(imageryAerialWithLabels, 'Click', createImageryClickFunction(imageryAerialWithLabels, BingMapsStyle.AERIAL_WITH_LABELS));
            on(imageryRoad, 'Click', createImageryClickFunction(imageryRoad, BingMapsStyle.ROAD));
            on(imagerySingleTile, 'Click', createImageryClickFunction(imagerySingleTile, undefined));

            update();
        },

        onSetupError : function(widget, error) {
            console.log(error);
        }
    });

    cesium.placeAt(dom.byId('cesiumContainer'));
});