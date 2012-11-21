/*global define*/
define([
    'dojo/dom',
    'dojo/on',
    'dojo/ready',
    'dojo/io-query',
    'Scene/SkyBox',
    'Widgets/Dojo/CesiumViewerWidget'
], function(
    dom,
    on,
    ready,
    ioQuery,
    SkyBox,
    CesiumViewerWidget
) {
    "use strict";
    /*global console*/

    ready(function() {
        var endUserOptions = {};
        if (window.location.search) {
            endUserOptions = ioQuery.queryToObject(window.location.search.substring(1));
        }

        var widget = new CesiumViewerWidget({
            endUserOptions : endUserOptions,
            enableDragDrop : true
        });
        widget.placeAt(dom.byId('cesiumContainer'));
        widget.startup();
    });
});
