/*global define*/
define([
        'dojo/dom',
        'dojo/on',
        'dojo/io-query',
        'DojoWidgets/CesiumWidget',
        'Core/requestAnimationFrame'
    ], function(
        dom,
        on,
        ioQuery,
        CesiumWidget,
        requestAnimationFrame) {
    "use strict";
    /*global console*/

    var endUserOptions = {};
    if (window.location.search) {
        endUserOptions = ioQuery.queryToObject(window.location.search.substring(1));
    }

    var cesium = new CesiumWidget({
        endUserOptions : endUserOptions,
        enableDragDrop : true,

        postSetup : function(widget) {
            on(window, 'resize', function() {
                cesium.resize();
            });

            var animationController = widget.animationController;
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
