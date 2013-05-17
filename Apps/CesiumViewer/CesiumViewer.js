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
        'Core/VertexFormat',
        'Core/Transforms',
        'Core/ScreenSpaceEventHandler',
        'Core/ScreenSpaceEventType',
        'Scene/Primitive',
        'Scene/Appearance',
        'Scene/Material',
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
        VertexFormat,
        Transforms,
        ScreenSpaceEventHandler,
        ScreenSpaceEventType,
        Primitive,
        Appearance,
        Material,
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

        var scene = widget.scene;

        var mesh = ExtentTessellator.compute({
            extent : new Extent(
                CesiumMath.toRadians(-180.0),
                CesiumMath.toRadians(50.0),
                CesiumMath.toRadians(180.0),
                CesiumMath.toRadians(90.0)),
            granularity : 0.006                     // More than 64K vertices
        });
        mesh.pickData = 'mesh';

        var mesh2 = new EllipsoidGeometry({
            ellipsoid : new Ellipsoid(500000.0, 500000.0, 1000000.0),
            modelMatrix : Matrix4.multiplyByTranslation(Transforms.eastNorthUpToFixedFrame(
                    Ellipsoid.WGS84.cartographicToCartesian(Cartographic.fromDegrees(-95.59777, 40.03883))), new Cartesian3(0.0, 0.0, 500000.0)),
            pickData : 'mesh2'
        });

        var mesh3 = new BoxGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            dimensions : new Cartesian3(1000000.0, 1000000.0, 2000000.0),
            modelMatrix : Matrix4.multiplyByTranslation(Transforms.eastNorthUpToFixedFrame(
                Ellipsoid.WGS84.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883))), new Cartesian3(0.0, 0.0, 3000000.0)),
            pickData : 'mesh3'
        });
        var primitive = new Primitive({
            geometries : [mesh, mesh2, mesh3],
            appearance : Appearance.CLOSED_TRANSLUCENT
        });
        widget.scene.getPrimitives().add(primitive);

        var m = new Material({
            context : widget.scene.getContext(),
            fabric : {
                type : 'Image',
                uniforms : {
                    image : '../Sandcastle/images/Cesium_Logo_Color.jpg'
                }
            }
         });
        var rs = {
            depthTest : {
                enabled : true
            }
        };
        var appearance = new Appearance({
            material : m,
            renderState : rs
        });

        var mesh4 = new BoxGeometry({
            dimensions : new Cartesian3(1000000.0, 1000000.0, 1000000.0),
            modelMatrix : Matrix4.multiplyByTranslation(Transforms.eastNorthUpToFixedFrame(
                Ellipsoid.WGS84.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883))), new Cartesian3(0.0, 0.0, 4500000.0)),
            pickData : 'mesh4'
        });

        var primitive2 = new Primitive({
            geometries : mesh4,
            appearance :appearance,
            vertexCacheOptimize : false,
            releaseGeometries : true,
            transformToWorldCoordinates : false
        });
        widget.scene.getPrimitives().add(primitive2);

        var handler = new ScreenSpaceEventHandler(scene.getCanvas());
        handler.setInputAction(
            function (movement) {
                var pickedObject = scene.pick(movement.endPosition);
                if (typeof pickedObject !== 'undefined') {
                    console.log(pickedObject);
                }
            },
            ScreenSpaceEventType.MOUSE_MOVE
        );

        domClass.remove(win.body(), 'loading');
    });
});