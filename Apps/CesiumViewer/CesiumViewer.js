/*global define*/
define([
        'dojo/_base/window',
        'dojo/dom-class',
        'dojo/io-query',
        'dojo/parser',
        'dojo/ready',
        'Core/Math',
        'Core/Cartographic',
        'Core/Cartesian3',
        'Core/Matrix4',
        'Core/Ellipsoid',
        'Core/Extent',
        'Core/ExtentTessellator',
        'Core/EllipsoidGeometry',
        'Core/BoxGeometry',
        'Core/GeometryFilters',
        'Core/Transforms',
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
        Cartographic,
        Cartesian3,
        Matrix4,
        Ellipsoid,
        Extent,
        ExtentTessellator,
        EllipsoidGeometry,
        BoxGeometry,
        GeometryFilters,
        Transforms,
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
                CesiumMath.toRadians(90.0)),
            granularity : 0.006                     // More than 64K vertices
        });
        var mesh2 = new EllipsoidGeometry({
            ellipsoid : new Ellipsoid(500000.0, 500000.0, 1000000.0),
            modelMatrix : Matrix4.multiplyByTranslation(Transforms.eastNorthUpToFixedFrame(
                    Ellipsoid.WGS84.cartographicToCartesian(Cartographic.fromDegrees(-95.59777, 40.03883))), new Cartesian3(0.0, 0.0, 500000.0))
        });
        var mesh3 = new BoxGeometry({
            dimensions : new Cartesian3(1000000.0, 1000000.0, 2000000.0),
            modelMatrix : Matrix4.multiplyByTranslation(Transforms.eastNorthUpToFixedFrame(
                Ellipsoid.WGS84.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883))), new Cartesian3(0.0, 0.0, 3000000.0))
        });

//        var primitive = new Primitive(GeometryFilters.combine([mesh, mesh2, mesh3]), Appearance.EXAMPLE_APPEARANCE);
        var primitive = new Primitive(GeometryFilters.combine([mesh3]), Appearance.EXAMPLE_APPEARANCE);
        widget.scene.getPrimitives().add(primitive);

        domClass.remove(win.body(), 'loading');
    });
});