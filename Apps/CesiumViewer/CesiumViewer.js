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
         VisualizerCollection,
         fillBuffer) {

    var propertyFunctionsMap = {
        position : createOrUpdatePosition,
        orientation : createOrUpdateOrientation,
        billboard : createOrUpdateDynamicBillboard,
        label : createOrUpdateDynamicLabel
    };

    var _buffer = new Layer("root", "root", propertyFunctionsMap);
    fillBuffer(_buffer, 'Gallery/simple.czm');

    var visualizers;
    var clock = new Clock(JulianDate.fromIso8601("2012-03-15T10:00:00Z"), JulianDate.fromIso8601("2012-03-15T20:00:00Z"), JulianDate.fromIso8601("2012-03-15T10:00:00Z"),
            ClockStep.SYSTEM_CLOCK, ClockRange.CLAMPED, 300);

    var cesium = new CesiumWidget({
        proxy : new DefaultProxy('/proxy/'),

        clock : clock,

        preRender : function(widget) {
            clock.tick();
            visualizers.update(clock.currentTime, _buffer);
        },

        postSetup : function(widget) {
            visualizers = new VisualizerCollection([new DynamicBillboardVisualizer(widget.scene)]);
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