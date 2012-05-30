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

    function updateSpeedIndicator() {
        speedIndicatorElement.innerHTML = clock.multiplier + 'x realtime';
    }

    var visualizers;
    var clock = new Clock(new JulianDate(), undefined, undefined, ClockStep.SYSTEM_CLOCK, ClockRange.LOOP, 256);
    var timeline;

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

    var cesium = new CesiumWidget({
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
        },

        postSetup : function(widget) {
            var scene = widget.scene;
            visualizers = new VisualizerCollection([new DynamicBillboardVisualizer(scene), new DynamicConeVisualizer(scene), new DynamicLabelVisualizer(scene), new DynamicPointVisualizer(scene),
                    new DynamicPolygonVisualizer(scene), new DynamicPolylineVisualizer(scene), new DynamicPyramidVisualizer(scene)]);
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
        },

        onSetupError : function(widget, error) {
            console.log(error);
        }
    });

    cesium.placeAt(dom.byId('cesiumContainer'));
});