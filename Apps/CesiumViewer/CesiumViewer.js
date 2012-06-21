/*global define*/
define(['dojo/dom',
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
        'Core/TimeStandard',
        'Core/Iso8601',
        'Core/FullScreen',
        'Core/Ellipsoid',
        'Core/Transforms',
        'Scene/SceneTransitioner',
        'Scene/BingMapsStyle',
        'DynamicScene/CzmlStandard',
        'DynamicScene/DynamicObjectCollection',
        'DynamicScene/VisualizerCollection',],
function(dom,
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
         TimeStandard,
         Iso8601,
         FullScreen,
         Ellipsoid,
         Transforms,
         SceneTransitioner,
         BingMapsStyle,
         CzmlStandard,
         DynamicObjectCollection,
         VisualizerCollection) {
    "use strict";
    /*global console*/

    var visualizers;
    var clock = new Clock(TimeStandard.convertUtcToTai(new JulianDate()), undefined, undefined, ClockStep.SYSTEM_CLOCK_DEPENDENT, ClockRange.LOOP, 256);
    var timeline;
    var transitioner;

    var dynamicObjectCollection = new DynamicObjectCollection();

    var animating = true;
    var speedIndicatorElement;
    var timeLabel;
    var lastTimeLabelUpdate;
    var cameraCenteredObjectID;
    var cameraCenteredObjectIDPosition;
    var lastCameraCenteredObjectID;

    function updateSpeedIndicator() {
        speedIndicatorElement.innerHTML = clock.multiplier + 'x realtime';
    }

    function setTimeFromBuffer() {
        var animReverse = registry.byId('animReverse');
        var animPause = registry.byId('animPause');
        var animPlay = registry.byId('animPlay');
        animating = false;
        animReverse.set('checked', false);
        animPause.set('checked', true);
        animPlay.set('checked', false);

        var i, object, len;
        var startTime = Iso8601.MAXIMUM_VALUE;
        var stopTime = Iso8601.MINIMUM_VALUE;
        var dynamicObjects = dynamicObjectCollection.getObjects();

        var availability = dynamicObjectCollection.computeAvailability();
        startTime = availability.start;
        stopTime = availability.stop;

        //Minor hack to start at a reasonable spot.
        if (startTime.equals(Iso8601.MINIMUM_VALUE)) {
            for (i = 0, len = dynamicObjects.length; i < len; i++) {
                object = dynamicObjects[i];
                if (typeof object.position !== 'undefined') {
                    var intervals = object.position._propertyIntervals;
                    if (typeof intervals !== 'undefined' && intervals._intervals[0].data._intervals._intervals[0].data.isSampled) {
                        var firstTime = intervals._intervals[0].data._intervals._intervals[0].data.times[0];
                        if (typeof firstTime !== 'undefined') {
                            startTime = firstTime;
                            stopTime = firstTime.addDays(1);
                            break;
                        }
                    }
                }
            }
        }

        clock.startTime = startTime;
        clock.stopTime = stopTime;
        clock.currentTime = startTime;
        timeline.zoomTo(startTime, stopTime);
        updateSpeedIndicator();
    }

    function handleDrop(e) {
        e.stopPropagation(); // Stops some browsers from redirecting.
        e.preventDefault();

        var files = e.dataTransfer.files;
        var f = files[0];
        var reader = new FileReader();
        reader.onload = function(evt) {
            //CZML_TODO visualizers.removeAll(); is not really needed here, but right now visualizers
            //cache data indefinitely and removeAll is the only way to get rid of it.
            //while there are no visual differences, removeAll cleans the cache and improves performance
            visualizers.removeAll();
            dynamicObjectCollection.clear();
            dynamicObjectCollection.processCzml(JSON.parse(evt.target.result), f.name);
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

        preRender : function(widget) {
            var currentTime = animating ? clock.tick() : clock.currentTime;

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
                            camera.position = camera.position.normalize().multiplyWithScalar(5000.0);
                        }

                        var transform = Transforms.eastNorthUpToFixedFrame(cameraCenteredObjectIDPosition, widget.ellipsoid);
                        this.spindleCameraController.setReferenceFrame(transform, Ellipsoid.UNIT_SPHERE);
                    }
                }
            }
        },

        postSetup : function(widget) {
            var scene = widget.scene;

            transitioner = new SceneTransitioner(scene);
            visualizers = VisualizerCollection.createCzmlStandardCollection(scene, dynamicObjectCollection);
            widget.enableStatistics(true);

            var queryObject = {};
            if (window.location.search) {
                queryObject = ioQuery.queryToObject(window.location.search.substring(1));
            }

            if (typeof queryObject.source !== 'undefined') {
                getJson(queryObject.source).then(function(czmlData) {
                    dynamicObjectCollection.processCzml(czmlData, queryObject.source);
                    setTimeFromBuffer();
                });
            }

            if (typeof queryObject.lookAt !== 'undefined') {
                cameraCenteredObjectID = queryObject.lookAt;
            }

            var timelineWidget = registry.byId('mainTimeline');
            timelineWidget.clock = clock;
            timelineWidget.setupCallback = function(t) {
                timeline = t;
                timeline.zoomTo(clock.startTime, clock.stopTime);
            };

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
                clock.currentTime = clock.startTime;
                animating = false;
                animReverse.set('checked', false);
                animPause.set('checked', true);
                animPlay.set('checked', false);
            });

            on(animReverse, 'Click', function() {
                if (clock.multiplier > 0) {
                    clock.multiplier = -clock.multiplier;
                }
                animating = true;
                animReverse.set('checked', true);
                animPause.set('checked', false);
                animPlay.set('checked', false);
                updateSpeedIndicator();
            });

            on(animPause, 'Click', function() {
                animating = false;
                animReverse.set('checked', false);
                animPause.set('checked', true);
                animPlay.set('checked', false);
            });

            on(animPlay, 'Click', function() {
                if (clock.multiplier < 0) {
                    clock.multiplier = -clock.multiplier;
                }
                animating = true;
                animReverse.set('checked', false);
                animPause.set('checked', false);
                animPlay.set('checked', true);
                updateSpeedIndicator();
            });

            on(registry.byId('animSlow'), 'Click', function() {
                clock.multiplier *= 0.5;
                updateSpeedIndicator();
            });

            on(registry.byId('animFast'), 'Click', function() {
                clock.multiplier *= 2.0;
                updateSpeedIndicator();
            });

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

            var imageryAerial = registry.byId('imageryAerial');
            var imageryAerialWithLabels = registry.byId('imageryAerialWithLabels');
            var imageryRoad = registry.byId('imageryRoad');
            var imagerySingleTile = registry.byId('imagerySingleTile');
            var imageryOptions = [imageryAerial, imageryAerialWithLabels, imageryRoad, imagerySingleTile];

            function createImageryClickFunction(control, style) {
                return function() {
                    if (style) {
                        cesium.setStreamingImageryMapStyle(style);
                    } else {
                        cesium.enableStreamingImagery(false);
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
        },

        onSetupError : function(widget, error) {
            console.log(error);
        }
    });

    cesium.placeAt(dom.byId('cesiumContainer'));
});