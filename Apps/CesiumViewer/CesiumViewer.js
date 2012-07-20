/*global define*/
define([
        'dojo/dom',
        'dojo/on',
        'dojo/_base/event',
        'dojo/io-query',
        'Core/JulianDate',
        'Core/Clock',
        'Core/ClockStep',
        'DojoWidgets/CesiumWidget',
        'Core/requestAnimationFrame',
        './AnimationController'
    ], function(
        dom,
        on,
        event,
        ioQuery,
        JulianDate,
        Clock,
        ClockStep,
        CesiumWidget,
        requestAnimationFrame,
        AnimationController) {
    "use strict";
    /*global console*/

    var endUserOptions = {};
    if (window.location.search) {
        endUserOptions = ioQuery.queryToObject(window.location.search.substring(1));
    }

    var currentTime = new JulianDate();
    var clock = new Clock({
        startTime : currentTime.addDays(-0.5),
        stopTime : currentTime.addDays(0.5),
        currentTime : currentTime,
        clockStep : ClockStep.SYSTEM_CLOCK_DEPENDENT,
        multiplier : 1
    });
    var animationController = new AnimationController(clock);

    var cesium = new CesiumWidget({
        clock : clock,
        animationController : animationController,
        endUserOptions : endUserOptions,

        postSetup : function(widget) {
            var dropBox = dom.byId('cesiumContainer');
            on(dropBox, 'drop', widget.handleDrop);
            on(dropBox, 'dragenter', event.stop);
            on(dropBox, 'dragover', event.stop);
            on(dropBox, 'dragexit', event.stop);

            on(window, 'resize', function() {
                cesium.resize();
            });

            function updateAndRender() {
                var currentTime = animationController.update();
                widget.update(currentTime);
                widget.render();
                requestAnimationFrame(updateAndRender);
            }
            updateAndRender();
        },

        onSetupError : function(widget, error) {
            console.log(error);
        }
    });

    cesium.placeAt(dom.byId('cesiumContainer'));
});
