/*global define*/
define(['dojo/dom',
        'dojo/on',
        'dojo/_base/event',
        'DojoWidgets/CesiumWidget',
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
        'DynamicScene/VisualizerCollection',
        'CesiumViewer/loadCzmlFromUrl'],
function(dom,
         on,
         event,
         CesiumWidget,
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
         VisualizerCollection,
         loadCzmlFromUrl) {
    "use strict";
    /*global console*/

    var visualizers;
    var clock = new Clock(new JulianDate(), undefined, undefined, ClockStep.SYSTEM_CLOCK, ClockRange.LOOP, 300);

    var _buffer = new CzmlObjectCollection("root", "root", {
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

    var cesium = new CesiumWidget({
        clock : clock,

        preRender : function(widget) {
            clock.tick();
            visualizers.update(clock.currentTime, _buffer);
        },

        postSetup : function(widget) {
            var scene = widget.scene;
            visualizers = new VisualizerCollection([new DynamicBillboardVisualizer(scene),
                                                    new DynamicConeVisualizer(scene),
                                                    new DynamicLabelVisualizer(scene),
                                                    new DynamicPointVisualizer(scene),
                                                    new DynamicPolygonVisualizer(scene),
                                                    new DynamicPolylineVisualizer(scene),
                                                    new DynamicPyramidVisualizer(scene)]);
            widget.enableStatistics(true);
        },

        onSetupError : function(widget, error) {
            console.log(error);
        }
    });

    //This function is a total HACK and only temporary.
    function setTimeFromBuffer() {
        var czmlObjects = _buffer.getObjects();
        for ( var i = 0, len = czmlObjects.length; i < len; i++) {
            var object = czmlObjects[i];
            if (typeof object.position !== 'undefined') {
                var intervals = object.position._propertyIntervals;
                if (typeof intervals !== 'undefined' && intervals._intervals[0].data._isSampled) {
                    var firstTime = intervals._intervals[0].data._intervals._intervals[0].data.times[0];
                    if (typeof firstTime !== 'undefined') {
                        clock.startTime = firstTime;
                        clock.stopTime = firstTime.addDays(1);
                        clock.currentTime = firstTime;
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

    var dropBox = dom.byId("cesiumContainer");
    on(dropBox, 'drop', handleDrop);
    on(dropBox, 'dragenter', event.stop);
    on(dropBox, 'dragover', event.stop);
    on(dropBox, 'dragexit', event.stop);

    cesium.placeAt(dom.byId("cesiumContainer"));

    on(window, 'resize', function() {
        cesium.resize();
    });
});