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
            positiveX: '/Source/Assets/Textures/SkyBox/tycho8_px_80.jpg',
            negativeX: '/Source/Assets/Textures/SkyBox/tycho8_mx_80.jpg',
            positiveY: '/Source/Assets/Textures/SkyBox/tycho8_py_80.jpg',
            negativeY: '/Source/Assets/Textures/SkyBox/tycho8_my_80.jpg',
            positiveZ: '/Source/Assets/Textures/SkyBox/tycho8_pz_80.jpg',
            negativeZ: '/Source/Assets/Textures/SkyBox/tycho8_mz_80.jpg'
        };

        widget.scene.skyBox = new SkyBox(source);
    });
});
