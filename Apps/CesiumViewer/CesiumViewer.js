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
        'DynamicScene/createOrUpdatePosition',
        'DynamicScene/createOrUpdateOrientation',
        'DynamicScene/CzmlObjectCollection',
        'DynamicScene/DynamicBillboardVisualizer',
        'DynamicScene/DynamicLabelVisualizer',
        'DynamicScene/DynamicPointVisualizer',
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
         createOrUpdatePosition,
         createOrUpdateOrientation,
         CzmlObjectCollection,
         DynamicBillboardVisualizer,
         DynamicLabelVisualizer,
         DynamicPointVisualizer,
         VisualizerCollection,
         loadCzmlFromUrl) {

    var visualizers;
    var clock = new Clock(JulianDate.fromIso8601("2012-03-15T10:00:00Z"), JulianDate.fromIso8601("2012-03-15T20:00:00Z"), JulianDate.fromIso8601("2012-03-15T10:00:00Z"), ClockStep.SYSTEM_CLOCK,
            ClockRange.LOOP, 300);

    var _buffer = new CzmlObjectCollection("root", "root", {
        billboard : createOrUpdateDynamicBillboard,
        label : createOrUpdateDynamicLabel,
        point : createOrUpdateDynamicPoint,
        orientation : createOrUpdateOrientation,
        position : createOrUpdatePosition
    });

    loadCzmlFromUrl(_buffer, 'Gallery/simple.czm');

    var cesium = new CesiumWidget({
        proxy : new DefaultProxy('/proxy/'),

        clock : clock,

        preRender : function(widget) {
            clock.tick();
            visualizers.update(clock.currentTime, _buffer);
        },

        postSetup : function(widget) {
            var scene = widget.scene;
            visualizers = new VisualizerCollection([new DynamicBillboardVisualizer(scene), new DynamicLabelVisualizer(scene), new DynamicPointVisualizer(scene)]);
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