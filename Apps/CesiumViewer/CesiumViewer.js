/*global define*/
define([
    'dojo/dom',
    'dojo/on',
    'dojo/io-query',
    'DojoWidgets/CesiumWidget'
], function(
    dom,
    on,
    ioQuery,
    CesiumWidget
) {
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

            widget.defaultRenderLoop();
        },

        onSetupError : function(widget, error) {
            console.log(error);
        }
    });

    cesium.placeAt(dom.byId('cesiumContainer'));
});
