/*global define*/
define([
        'dojo/_base/window',
        'dojo/dom-class',
        'dojo/io-query',
        'dojo/parser',
        'dojo/ready',
        'Core/Color',
        'Core/Math',
        'Core/Cartographic',
        'Core/Cartesian3',
        'Core/Matrix4',
        'Core/Ellipsoid',
        'Core/Extent',
        'Core/ExtentGeometry',
        'Core/EllipseGeometry',
        'Core/EllipsoidGeometry',
        'Core/PolygonGeometry',
        'Core/BoxGeometry',
        'Core/GeometryFilters',
        'Core/VertexFormat',
        'Core/Transforms',
        'Core/ScreenSpaceEventHandler',
        'Core/ScreenSpaceEventType',
        'Scene/Primitive',
        'Scene/Appearance',
        'Scene/ClosedTranslucentAppearance',
        'Scene/PerGeometryColorClosedTranslucentAppearance',
        'Scene/EllipsoidSurfaceAppearance',
        'Scene/Material',
        'Widgets/Dojo/checkForChromeFrame',
        'Widgets/Dojo/CesiumViewerWidget'
    ], function(
        win,
        domClass,
        ioQuery,
        parser,
        ready,
        Color,
        CesiumMath,
        Cartographic,
        Cartesian3,
        Matrix4,
        Ellipsoid,
        Extent,
        ExtentGeometry,
        EllipseGeometry,
        EllipsoidGeometry,
        PolygonGeometry,
        BoxGeometry,
        GeometryFilters,
        VertexFormat,
        Transforms,
        ScreenSpaceEventHandler,
        ScreenSpaceEventType,
        Primitive,
        Appearance,
        ClosedTranslucentAppearance,
        PerGeometryColorClosedTranslucentAppearance,
        EllipsoidSurfaceAppearance,
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
        var ellipsoid = widget.centralBody.getEllipsoid();

        var mesh = new ExtentGeometry({
            vertexFormat : VertexFormat.POSITION_AND_NORMAL,
            extent : new Extent(
                CesiumMath.toRadians(-180.0),
                CesiumMath.toRadians(50.0),
                CesiumMath.toRadians(180.0),
                CesiumMath.toRadians(90.0)),
            granularity : 0.006,                     // More than 64K vertices
            pickData : 'mesh',
            color : Color.CORNFLOWERBLUE
        });

        var mesh2 = new EllipsoidGeometry({
            vertexFormat : VertexFormat.POSITION_AND_NORMAL,
            ellipsoid : new Ellipsoid(500000.0, 500000.0, 1000000.0),
            modelMatrix : Matrix4.multiplyByTranslation(Transforms.eastNorthUpToFixedFrame(
                    ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-95.59777, 40.03883))), new Cartesian3(0.0, 0.0, 500000.0)),
            pickData : 'mesh2',
            color : Color.AQUAMARINE.clone()
        });
        mesh2.color.alpha = 0.5;

        var mesh3 = new BoxGeometry({
            vertexFormat : VertexFormat.POSITION_AND_NORMAL,
            dimensions : new Cartesian3(1000000.0, 1000000.0, 2000000.0),
            modelMatrix : Matrix4.multiplyByTranslation(Transforms.eastNorthUpToFixedFrame(
                ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883))), new Cartesian3(0.0, 0.0, 3000000.0)),
            pickData : 'mesh3',
            color : Color.BLANCHEDALMOND
        });

        var mesh4 = new EllipseGeometry({
            vertexFormat : VertexFormat.POSITION_AND_NORMAL,
            ellipsoid : ellipsoid,
            center : ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-100, 20)),
            semiMinorAxis : 500000.0,
            semiMajorAxis : 1000000.0,
            bearing : CesiumMath.PI_OVER_FOUR,
            height : 1000000.0,
            pickData : 'mesh4',
            color : Color.LIME
        });

        var primitive = new Primitive({
            geometries : [mesh, mesh2, mesh3, mesh4],
            appearance : new PerGeometryColorClosedTranslucentAppearance()
        });
        scene.getPrimitives().add(primitive);

        var m = new Material({
            context : widget.scene.getContext(),
            fabric : {
                materials : {
                    diffuseMaterial : {
                        type : 'DiffuseMap',
                        uniforms : {
                            image : '../Sandcastle/images/bumpmap.png'
                        }
                    },
                    normalMap : {
                        type : 'NormalMap',
                        uniforms : {
                            image : '../Sandcastle/images/normalmap.png',
                            strength : 0.6
                        }
                    }
                },
                components : {
                    diffuse : 'diffuseMaterial.diffuse',
                    specular : 0.01,
                    normal : 'normalMap.normal'
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

        var mesh5 = new EllipsoidGeometry({
            vertexFormat : VertexFormat.ALL,
            ellipsoid : new Ellipsoid(1000000.0, 500000.0, 500000.0),
            modelMatrix : Matrix4.multiplyByTranslation(Transforms.eastNorthUpToFixedFrame(
                    ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883))), new Cartesian3(0.0, 0.0, 4500000.0)),
            pickData : 'mesh5'
        });

        var primitive2 = new Primitive({
            geometries : mesh5,
            appearance :appearance,
            vertexCacheOptimize : false,
            releaseGeometries : true,
            transformToWorldCoordinates : false
        });
        scene.getPrimitives().add(primitive2);

        var polygonGeometry = new PolygonGeometry({
            vertexFormat : VertexFormat.POSITION_AND_ST,
/*
            positions : ellipsoid.cartographicArrayToCartesianArray([
                Cartographic.fromDegrees(-72.0, 40.0),
                Cartographic.fromDegrees(-70.0, 35.0),
                Cartographic.fromDegrees(-75.0, 30.0),
                Cartographic.fromDegrees(-70.0, 30.0),
                Cartographic.fromDegrees(-68.0, 40.0)
            ]),
*/
            polygonHierarchy : {
                positions : ellipsoid.cartographicArrayToCartesianArray([
                    Cartographic.fromDegrees(-109.0, 30.0),
                    Cartographic.fromDegrees(-95.0, 30.0),
                    Cartographic.fromDegrees(-95.0, 40.0),
                    Cartographic.fromDegrees(-109.0, 40.0)
                ]),
                holes : [{
                    positions : ellipsoid.cartographicArrayToCartesianArray([
                        Cartographic.fromDegrees(-107.0, 31.0),
                        Cartographic.fromDegrees(-107.0, 39.0),
                        Cartographic.fromDegrees(-97.0, 39.0),
                        Cartographic.fromDegrees(-97.0, 31.0)
                    ]),
                    holes : [{
                        positions : ellipsoid.cartographicArrayToCartesianArray([
                            Cartographic.fromDegrees(-105.0, 33.0),
                            Cartographic.fromDegrees(-99.0, 33.0),
                            Cartographic.fromDegrees(-99.0, 37.0),
                            Cartographic.fromDegrees(-105.0, 37.0)
                            ]),
                        holes : [{
                            positions : ellipsoid.cartographicArrayToCartesianArray([
                                Cartographic.fromDegrees(-103.0, 34.0),
                                Cartographic.fromDegrees(-101.0, 34.0),
                                Cartographic.fromDegrees(-101.0, 36.0),
                                Cartographic.fromDegrees(-103.0, 36.0)
                            ])
                        }]
                    }]
                }]
            },
            pickData : 'polygon3',
            stRotation : 0.523598776
        });

        widget.scene.getPrimitives().add(new Primitive({
            geometries : polygonGeometry,
            appearance : new EllipsoidSurfaceAppearance({
                material : Material.fromType(scene.getContext(), 'Stripe')
            })
        }));

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
