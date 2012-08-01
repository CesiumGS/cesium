/*global define*/
define([
    'dojo/dom',
    'dojo/on',
    'dojo/io-query',
    'Widgets/Dojo/CesiumViewerWidget'
], function(
    dom,
    on,
    ioQuery,
    CesiumViewerWidget
) {
    "use strict";
    /*global console*/

    var endUserOptions = {};
    if (window.location.search) {
        endUserOptions = ioQuery.queryToObject(window.location.search.substring(1));
    }

    new CesiumViewerWidget({
        endUserOptions : endUserOptions,
        enableDragDrop : true,

        postSetup : function(widget) {
            widget.startRenderLoop();
        },

        onSetupError : function(widget, error) {
            console.log(error);
        }
    }).placeAt(dom.byId('cesiumContainer'));
});
