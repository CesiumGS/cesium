/*global define*/
define(['dojo/dom',
        'dojo/on',
        'DojoWidgets/CesiumWidget',
        'Core/DefaultProxy',
        'Core/JulianDate',
        'Core/Clock',
        'Core/ClockStep',
        'Core/ClockRange',
        'DynamicScene/createOrUpdateDynamicBillboard',
        'DynamicScene/createOrUpdateDynamicLabel',
        'DynamicScene/createOrUpdateDynamicPoint',
        'DynamicScene/createOrUpdateDynamicPolyline',
        'DynamicScene/createOrUpdatePosition',
        'DynamicScene/createOrUpdateOrientation',
        'DynamicScene/createOrUpdateVertexPositions',
        'DynamicScene/CzmlObjectCollection',
        'DynamicScene/DynamicBillboardVisualizer',
        'DynamicScene/DynamicLabelVisualizer',
        'DynamicScene/DynamicPointVisualizer',
        'DynamicScene/DynamicPolylineVisualizer',
        'DynamicScene/VisualizerCollection',
        'CesiumViewer/loadCzmlFromUrl'],
function(dom,
         on,
         CesiumWidget,
         DefaultProxy,
         JulianDate,
         Clock,
         ClockStep,
         ClockRange,
         createOrUpdateDynamicBillboard,
         createOrUpdateDynamicLabel,
         createOrUpdateDynamicPoint,
         createOrUpdateDynamicPolyline,
         createOrUpdatePosition,
         createOrUpdateOrientation,
         createOrUpdateVertexPositions,
         CzmlObjectCollection,
         DynamicBillboardVisualizer,
         DynamicLabelVisualizer,
         DynamicPointVisualizer,
         DynamicPolinelineVisualizer,
         VisualizerCollection,
         loadCzmlFromUrl) {
    "use strict";
    /*global console*/

    var visualizers;
    var clock = new Clock(JulianDate.fromIso8601("2012-03-15T10:00:00Z"), JulianDate.fromIso8601("2012-03-15T20:00:00Z"), JulianDate.fromIso8601("2012-03-15T10:00:00Z"), ClockStep.SYSTEM_CLOCK,
            ClockRange.LOOP, 300);

    var _buffer = new CzmlObjectCollection("root", "root", {
        billboard : createOrUpdateDynamicBillboard,
        label : createOrUpdateDynamicLabel,
        orientation : createOrUpdateOrientation,
        point : createOrUpdateDynamicPoint,
        polyline : createOrUpdateDynamicPolyline,
        position : createOrUpdatePosition,
        vertexPositions : createOrUpdateVertexPositions
    });

    loadCzmlFromUrl(_buffer, 'Gallery/simple.czm');

    var cesium = new CesiumWidget({
        clock : clock,

        preRender : function(widget) {
            clock.tick();
            visualizers.update(clock.currentTime, _buffer);
        },

        postSetup : function(widget) {
            var scene = widget.scene;
            visualizers = new VisualizerCollection([new DynamicBillboardVisualizer(scene),
                                                    new DynamicLabelVisualizer(scene),
                                                    new DynamicPointVisualizer(scene),
                                                    new DynamicPolinelineVisualizer(scene)]);
        },

        onSetupError : function(widget, error) {
            console.log(error);
        }
    });

    cesium.placeAt(dom.byId("cesiumContainer"));

    on(window, 'resize', function() {
        cesium.resize();
    });
});