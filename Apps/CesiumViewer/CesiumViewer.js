define(['dojo/dom',
        'dojo/on',
        'DojoWidgets/CesiumWidget',
        'Core/DefaultProxy',
        'Core/JulianDate',
        'Core/Clock',
        'Core/ClockStep',
        'Core/ClockRange',
        'DynamicScene/createOrUpdatePosition',
        'DynamicScene/createOrUpdateOrientation',
        'DynamicScene/createOrUpdateDynamicBillboard',
        'DynamicScene/createOrUpdateDynamicLabel',
        'DynamicScene/Layer',
        'DynamicScene/DynamicBillboardVisualizer',
        'DynamicScene/DynamicLabelVisualizer',
        'DynamicScene/VisualizerCollection',
        'CesiumViewer/fillBuffer'],
function(dom,
         on,
         CesiumWidget,
         DefaultProxy,
         JulianDate,
         Clock,
         ClockStep,
         ClockRange,
         createOrUpdatePosition,
         createOrUpdateOrientation,
         createOrUpdateDynamicBillboard,
         createOrUpdateDynamicLabel,
         Layer,
         DynamicBillboardVisualizer,
         DynamicLabelVisualizer,
         VisualizerCollection,
         fillBuffer) {

    var visualizers;
    var clock = new Clock(JulianDate.fromIso8601("2012-03-15T10:00:00Z"), JulianDate.fromIso8601("2012-03-15T20:00:00Z"), JulianDate.fromIso8601("2012-03-15T10:00:00Z"), ClockStep.SYSTEM_CLOCK,
            ClockRange.LOOP, 300);

    var _buffer = new Layer("root", "root", {
        position : createOrUpdatePosition,
        orientation : createOrUpdateOrientation,
        billboard : createOrUpdateDynamicBillboard,
        label : createOrUpdateDynamicLabel
    });
    fillBuffer(_buffer, 'Gallery/simple.czm');

    var cesium = new CesiumWidget({
        proxy : new DefaultProxy('/proxy/'),

        clock : clock,

        preRender : function(widget) {
            clock.tick();
            visualizers.update(clock.currentTime, _buffer);
        },

        postSetup : function(widget) {
            var scene = widget.scene;
            visualizers = new VisualizerCollection([new DynamicBillboardVisualizer(scene), new DynamicLabelVisualizer(scene)]);
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