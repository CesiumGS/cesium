/*global define*/
define(['dojo/dom',
        'dojo/on',
        'dojo/_base/event',
        'dojo/io-query',
        'dijit/registry',
        'CesiumDojo/CesiumWidget',
        'CesiumDojo/loadCzmlFromUrl',
        'Core/DefaultProxy',
        'Core/JulianDate',
        'Core/Clock',
        'Core/ClockStep',
        'Core/ClockRange',
        'Core/FullScreen',
        'Core/Ellipsoid',
        'Core/Transforms',
        'Scene/SceneTransitioner',
        'Scene/BingMapsStyle',
        'DynamicScene/DynamicBillboard',
        'DynamicScene/DynamicCone',
        'DynamicScene/DynamicLabel',
        'DynamicScene/DynamicObject',
        'DynamicScene/DynamicPoint',
        'DynamicScene/DynamicPolygon',
        'DynamicScene/DynamicPolyline',
        'DynamicScene/DynamicPyramid',
        'DynamicScene/CzmlObjectCollection',
        'DynamicScene/DynamicBillboardVisualizer',
        'DynamicScene/DynamicConeVisualizer',
        'DynamicScene/DynamicLabelVisualizer',
        'DynamicScene/DynamicPointVisualizer',
        'DynamicScene/DynamicPolygonVisualizer',
        'DynamicScene/DynamicPolylineVisualizer',
        'DynamicScene/DynamicPyramidVisualizer',
        'DynamicScene/VisualizerCollection'],
function(dom,
         on,
         event,
         ioQuery,
         registry,
         CesiumWidget,
         loadCzmlFromUrl,
         DefaultProxy,
         JulianDate,
         Clock,
         ClockStep,
         ClockRange,
         FullScreen,
         Ellipsoid,
         Transforms,
         SceneTransitioner,
         BingMapsStyle,
         DynamicBillboard,
         DynamicCone,
         DynamicLabel,
         DynamicObject,
         DynamicPoint,
         DynamicPolygon,
         DynamicPolyline,
         DynamicPyramid,
         CzmlObjectCollection,
         DynamicBillboardVisualizer,
         DynamicConeVisualizer,
         DynamicLabelVisualizer,
         DynamicPointVisualizer,
         DynamicPolygonVisualizer,
         DynamicPolylineVisualizer,
         DynamicPyramidVisualizer,
         VisualizerCollection) {
    "use strict";
    /*global console*/

var visualizers;
        var clock = new Clock(new JulianDate(), undefined, undefined, ClockStep.SYSTEM_CLOCK, ClockRange.LOOP, 256);
        var timeline;
        var transitioner;

        var _buffer = new CzmlObjectCollection({
            billboard : DynamicBillboard.createOrUpdate,
            cone : DynamicCone.createOrUpdate,
            label : DynamicLabel.createOrUpdate,
            orientation : DynamicObject.createOrUpdateOrientation,
            point : DynamicPoint.createOrUpdate,
            polygon : DynamicPolygon.createOrUpdate,
            polyline : DynamicPolyline.createOrUpdate,
            position : DynamicObject.createOrUpdatePosition,
            pyramid : DynamicPyramid.createOrUpdate,
            vertexPositions : DynamicObject.createOrUpdateVertexPositions
        });

        var animating = true;
        var speedIndicatorElement;
        var timeLabel;
        var lastTimeLabelUpdate;
        var in3D;
        var cameraCenteredObjectID;
        var lastCameraCenteredObjectID;

        //This function is a total HACK and only temporary.
    function setTimeFromBuffer() {
        var czmlObjects = _buffer.getObjects();
        for ( var i = 0, len = czmlObjects.length; i < len; i++) {
            var object = czmlObjects[i];
            if (typeof object.position !== 'undefined') {
                var intervals = object.position._propertyIntervals;
                if (typeof intervals !== 'undefined' && intervals._intervals[0].data._intervals._intervals[0].data.isSampled) {
                    var firstTime = intervals._intervals[0].data._intervals._intervals[0].data.times[0];
                    if (typeof firstTime !== 'undefined') {
                        clock.startTime = firstTime;
                        clock.stopTime = firstTime.addDays(1);
                        clock.currentTime = firstTime;
                        timeline.zoomTo(clock.startTime, clock.stopTime);
                        break;
                    }
                }
            }
        }
    }

    function handleDrop(e) {
        e.stopPropagation(); // Stops some browsers from redirecting.
        e.preventDefault();

        var files = e.dataTransfer.files;
        var f = files[0];
        var reader = new FileReader();
        reader.onload = function(evt) {
            visualizers.clear(_buffer);
            _buffer.clear();
            _buffer.processCzml(JSON.parse(evt.target.result), f.name);
            setTimeFromBuffer();
        };
        reader.readAsText(f);
    }

    function onObjectRightClickSelected(selectedObject) {
        if (selectedObject && selectedObject.id) {
            cameraCenteredObjectID = selectedObject.id;
        } else {
            cameraCenteredObjectID = undefined;
        }
    }

    function updateSpeedIndicator() {
        speedIndicatorElement.innerHTML = clock.multiplier + 'x realtime';
    }

    var cesium = new CesiumWidget(
            {
                clock : clock,

                preRender : function(widget) {
                    var currentTime = animating ? clock.tick() : clock.currentTime;

                    if (typeof timeline !== 'undefined') {
                        timeline.updateFromClock();
                    }
                    visualizers.update(currentTime, _buffer);

                    if (Math.abs(currentTime.getSecondsDifference(lastTimeLabelUpdate)) >= 1.0) {
                        timeLabel.innerHTML = currentTime.toDate().toUTCString();
                        lastTimeLabelUpdate = currentTime;
                    }

                    // Update the camera to stay centered on the selected object, if any.
                    if (cameraCenteredObjectID) {
                        var czmlObject = _buffer.getObject(cameraCenteredObjectID);
                        if (czmlObject && czmlObject.position) {
                            var position = czmlObject.position.getValueCartesian(currentTime);
                            if (typeof position !== 'undefined') {
                                // If we're centering on an object for the first time, zoom to within 2km of it.
                                if (lastCameraCenteredObjectID !== cameraCenteredObjectID) {
                                    lastCameraCenteredObjectID = cameraCenteredObjectID;
                                    var camera = widget.scene.getCamera();
                                    camera.position = camera.position.normalize().multiplyWithScalar(2500000.0);
                                }

                                var transform = Transforms.eastNorthUpToFixedFrame(position, widget.ellipsoid);
                                this.spindleCameraController.setReferenceFrame(transform, Ellipsoid.UNIT_SPHERE);
                            }
                        }
                    }
                },

                postSetup : function(widget) {
                    var scene = widget.scene;

                    transitioner = new SceneTransitioner(scene);

                    visualizers = new VisualizerCollection([new DynamicBillboardVisualizer(scene), new DynamicConeVisualizer(scene), new DynamicLabelVisualizer(scene),
                            new DynamicPointVisualizer(scene), new DynamicPolygonVisualizer(scene), new DynamicPolylineVisualizer(scene), new DynamicPyramidVisualizer(scene)]);
                    widget.enableStatistics(true);

                    var queryObject = {};
                    if (window.location.search) {
                        queryObject = ioQuery.queryToObject(window.location.search.substring(1));
                    }

                    if (typeof queryObject.source !== 'undefined') {
                        visualizers.clear(_buffer);
                        _buffer.clear();
                        loadCzmlFromUrl(_buffer, queryObject.source, setTimeFromBuffer);
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
                    timeLabel = dom.byId('timeLabel');
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

                    var viewHome = registry.byId("viewHome");
                    var view2D = registry.byId("view2D");
                    var view3D = registry.byId("view3D");
                    var viewColumbus = registry.byId("viewColumbus");
                    var viewFullScreen = registry.byId("viewFullScreen");

                    view2D.set('checked', false);
                    view3D.set('checked', true);
                    viewColumbus.set('checked', false);

                    on(viewFullScreen, "Click", function() {
                        if (FullScreen.isFullscreenEnabled()) {
                            FullScreen.exitFullscreen();
                        } else {
                            FullScreen.requestFullScreen(document.body);
                        }
                    });

                    on(viewHome, "Click", function() {
                        view2D.set('checked', false);
                        view3D.set('checked', true);
                        viewColumbus.set('checked', false);
                        transitioner.morphTo3D();
                        cesium.viewHome();
                        cesium.showSkyAtmosphere(true);
                        cesium.showGroundAtmosphere(true);
                        in3D = true;
                    });
                    on(view2D, "Click", function() {
                        cameraCenteredObjectID = undefined;
                        view2D.set('checked', true);
                        view3D.set('checked', false);
                        viewColumbus.set('checked', false);
                        cesium.showSkyAtmosphere(false);
                        cesium.showGroundAtmosphere(false);
                        in3D = false;
                        transitioner.morphTo2D();
                    });
                    on(view3D, "Click", function() {
                        cameraCenteredObjectID = undefined;
                        view2D.set('checked', false);
                        view3D.set('checked', true);
                        viewColumbus.set('checked', false);
                        transitioner.morphTo3D();
                        cesium.showSkyAtmosphere(true);
                        cesium.showGroundAtmosphere(true);
                        in3D = true;
                    });
                    on(viewColumbus, "Click", function() {
                        cameraCenteredObjectID = undefined;
                        view2D.set('checked', false);
                        view3D.set('checked', false);
                        viewColumbus.set('checked', true);
                        cesium.showSkyAtmosphere(false);
                        cesium.showGroundAtmosphere(false);
                        in3D = false;
                        transitioner.morphToColumbusView();
                    });

                    var sunPosition = registry.byId('sunPosition');
                    on(sunPosition, 'Change', function(value) {
                        cesium.lockSunPositionToCamera = !value;
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