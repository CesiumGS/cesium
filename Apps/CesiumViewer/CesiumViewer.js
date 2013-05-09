/*global define*/
define([
        'dojo/_base/window',
        'dojo/dom-class',
        'dojo/io-query',
        'dojo/parser',
        'dojo/ready',
        'Core/Math',
        'Core/Extent',
        'Core/ExtentTessellator',
        'Core/GeometryFilters',
        'Scene/Primitive',
        'Scene/Appearance',
        'Widgets/Dojo/checkForChromeFrame',
        'Widgets/Dojo/CesiumViewerWidget'
    ], function(
        win,
        domClass,
        ioQuery,
        parser,
        ready,
        CesiumMath,
        Extent,
        ExtentTessellator,
        MeshFilters,
        Primitive,
        Appearance,
        checkForChromeFrame,
        CesiumViewerWidget) {
    "use strict";
    /*global console*/

    ready(function() {
        parser.parse();

        checkForChromeFrame();

        var endUserOptions = {};
        if (window.location.search) {
            endUserOptions = ioQuery.queryToObject(window.location.search.substring(1));
        }

        var widget = new CesiumViewerWidget({
            endUserOptions : endUserOptions,
            enableDragDrop : true
        });
        widget.placeAt('cesiumContainer');
        widget.startup();
        widget.fullscreen.viewModel.fullscreenElement(document.body);

        var mesh = ExtentTessellator.compute({
            extent : new Extent(
                CesiumMath.toRadians(-180.0),
                CesiumMath.toRadians(50.0),
                CesiumMath.toRadians(180.0),
                CesiumMath.toRadians(90.0))
        });
        var anotherMesh = ExtentTessellator.compute({
            extent : new Extent(
                CesiumMath.toRadians(-180.0),
                CesiumMath.toRadians(10.0),
                CesiumMath.toRadians(180.0),
                CesiumMath.toRadians(30.0))
        });

        var primitive = new Primitive(MeshFilters.combine([mesh, anotherMesh]), Appearance.EXAMPLE_APPEARANCE);
        widget.scene.getPrimitives().add(primitive);

        domClass.remove(win.body(), 'loading');
    });
});