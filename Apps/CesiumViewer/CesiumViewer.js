/*global define*/
define([
    'dojo/dom',
    'dojo/on',
    'dojo/ready',
    'dojo/io-query',
    'Widgets/Dojo/CesiumViewerWidget'
], function(
    dom,
    on,
    ready,
    ioQuery,
    CesiumViewerWidget
) {
    "use strict";
    /*global console*/

    ready(function() {
        var endUserOptions = {};
        if (window.location.search) {
            endUserOptions = ioQuery.queryToObject(window.location.search.substring(1));
        }

        new CesiumViewerWidget({
            endUserOptions : endUserOptions,
            enableDragDrop : true,

            postSetup : function(widget) {
                widget.startRenderLoop();
            }
        }).placeAt(dom.byId('cesiumContainer'));
    });
});
