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

        var source = {
            positiveX: '/SkyBox/TychoSkymapII_4096b_px_r.png',
            negativeX: '/SkyBox/TychoSkymapII_4096b_mx_r.png',
            positiveY: '/SkyBox/TychoSkymapII_4096b_py_r.png',
            negativeY: '/SkyBox/TychoSkymapII_4096b_my_r.png',
            positiveZ: '/SkyBox/TychoSkymapII_4096b_pz_r.png',
            negativeZ: '/SkyBox/TychoSkymapII_4096b_mz_r.png'
        };
        widget.scene.getPrimitives().add(new SkyBox(source));
    });
});
