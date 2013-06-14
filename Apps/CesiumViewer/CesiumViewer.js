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
        'Core/Geometry',
        'Core/GeometryAttribute',
        'Core/GeometryInstance',
        'Core/ExtentGeometry',
        'Core/EllipseGeometry',
        'Core/EllipsoidGeometry',
        'Core/PolygonGeometry',
        'Core/BoxGeometry',
        'Core/GeometryPipeline',
        'Core/VertexFormat',
        'Core/Transforms',
        'Core/PrimitiveType',
        'Core/ComponentDatatype',
        'Core/ScreenSpaceEventHandler',
        'Core/ScreenSpaceEventType',
        'Core/WallGeometry',
        'Scene/Primitive',
        'Scene/Appearance',
        'Scene/ClosedTranslucentAppearance',
        'Scene/PerInstanceColorClosedTranslucentAppearance',
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
        Geometry,
        GeometryAttribute,
        GeometryInstance,
        ExtentGeometry,
        EllipseGeometry,
        EllipsoidGeometry,
        PolygonGeometry,
        BoxGeometry,
        GeometryPipeline,
        VertexFormat,
        Transforms,
        PrimitiveType,
        ComponentDatatype,
        ScreenSpaceEventHandler,
        ScreenSpaceEventType,
        WallGeometry,
        Primitive,
        Appearance,
        ClosedTranslucentAppearance,
        PerInstanceColorClosedTranslucentAppearance,
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
        widget.fullscreen.viewModel.fullscreenElement = document.body;

        var scene = widget.scene;
        var ellipsoid = widget.centralBody.getEllipsoid();

        var geometry = new GeometryInstance({
            geometry : new ExtentGeometry({
                vertexFormat : VertexFormat.POSITION_AND_NORMAL,
                extent : new Extent(
                    CesiumMath.toRadians(-180.0),
                    CesiumMath.toRadians(50.0),
                    CesiumMath.toRadians(180.0),
                    CesiumMath.toRadians(90.0)),
                granularity : 0.006                     // More than 64K vertices
            }),
            pickData : 'geometry',
            color : Color.CORNFLOWERBLUE
        });
        var geometry2 = new GeometryInstance({
            geometry : new EllipsoidGeometry({
                vertexFormat : VertexFormat.POSITION_AND_NORMAL,
                ellipsoid : new Ellipsoid(500000.0, 500000.0, 1000000.0)
            }),
            modelMatrix : Matrix4.multiplyByTranslation(Transforms.eastNorthUpToFixedFrame(
                ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-95.59777, 40.03883))), new Cartesian3(0.0, 0.0, 500000.0)),
            pickData : 'geometry2',
            color : Color.AQUAMARINE.clone()
        });
        geometry2.color.alpha = 0.5;
        var geometry3 = new GeometryInstance({
            geometry : new BoxGeometry({
                vertexFormat : VertexFormat.POSITION_AND_NORMAL,
                dimensions : new Cartesian3(1000000.0, 1000000.0, 2000000.0)
            }),
            modelMatrix : Matrix4.multiplyByTranslation(Transforms.eastNorthUpToFixedFrame(
                ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883))), new Cartesian3(0.0, 0.0, 3000000.0)),
            pickData : 'geometry3',
            color : Color.BLANCHEDALMOND
        });
        var geometry4 = new GeometryInstance({
            geometry : new EllipseGeometry({
                vertexFormat : VertexFormat.POSITION_AND_NORMAL,
                ellipsoid : ellipsoid,
                center : ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-100, 20)),
                semiMinorAxis : 500000.0,
                semiMajorAxis : 1000000.0,
                bearing : CesiumMath.PI_OVER_FOUR,
                height : 1000000.0
            }),
            pickData : 'geometry4',
            color : new Color(1.0, 1.0, 0.0, 0.5)
        });
        var primitive = new Primitive({
            geometryInstances : [geometry, geometry2, geometry3, geometry4],
            appearance : new PerInstanceColorClosedTranslucentAppearance()
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
        var geometry5 = new GeometryInstance({
            geometry : new EllipsoidGeometry({
                vertexFormat : VertexFormat.ALL,
                ellipsoid : new Ellipsoid(1000000.0, 500000.0, 500000.0)
            }),
            modelMatrix : Matrix4.multiplyByTranslation(Transforms.eastNorthUpToFixedFrame(
                ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883))), new Cartesian3(0.0, 0.0, 4500000.0)),
            pickData : 'geometry5'
        });
        scene.getPrimitives().add(new Primitive({
            geometryInstances : geometry5,
            appearance :appearance,
            vertexCacheOptimize : false,
            releasegeometryInstances : true,
            transformToWorldCoordinates : false
        }));

        var polygonGeometry = new GeometryInstance({
            geometry : new PolygonGeometry({
                vertexFormat : VertexFormat.POSITION_AND_ST,

                positions : ellipsoid.cartographicArrayToCartesianArray([
                    Cartographic.fromDegrees(-82.0, 40.0),
                    Cartographic.fromDegrees(-75.0, 35.0),
                    Cartographic.fromDegrees(-85.0, 30.0),
                    Cartographic.fromDegrees(-70.0, 30.0),
                    Cartographic.fromDegrees(-68.0, 40.0)
                ]),
                surfaceHeight: 600000,
                extrudedHeight: 300000,
                stRotation : 0.523598776
            }),
            pickData : 'polygon3'
        });

        var polygonGeometry1 = new GeometryInstance({
            geometry : new PolygonGeometry({
                vertexFormat : VertexFormat.POSITION_AND_ST,
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
                stRotation : 0.523598776
            }),
            pickData : 'polygon3'
        });
        widget.scene.getPrimitives().add(new Primitive({
            geometryInstances : [polygonGeometry, polygonGeometry1],
            appearance : new EllipsoidSurfaceAppearance({
                material : Material.fromType(scene.getContext(), 'Stripe')
            })
        }));

        var wall = new GeometryInstance({
            geometry : new WallGeometry({
                vertexFormat : VertexFormat.ALL,
                positions    : ellipsoid.cartographicArrayToCartesianArray([
                    Cartographic.fromDegrees(-125.0, 37.0, 100000.0),
                    Cartographic.fromDegrees(-125.0, 38.0, 100000.0),
                    Cartographic.fromDegrees(-120.0, 38.0, 100000.0),
                    Cartographic.fromDegrees(-120.0, 37.0, 100000.0),
                    Cartographic.fromDegrees(-125.0, 37.0, 100000.0)
                ])
            }),
            pickData : 'wall'
        });
        widget.scene.getPrimitives().add(new Primitive({
            geometryInstances : wall,
            appearance : new Appearance({
                material : Material.fromType(scene.getContext(), 'Wood'),
                renderState : {
                    depthTest : {
                        enabled : true
                    }
                }
            })
        }));

        var customWithIndices = new GeometryInstance({
           geometry : new Geometry({
               attributes : {
                   position : new GeometryAttribute({
                        componentDatatype : ComponentDatatype.DOUBLE,
                        componentsPerAttribute : 3,
                        values : new Float64Array([
                            0.0, 0.0, 2000000.0,
                            7500000.0, 0.0, 2000000.0,
                            0.0, 7500000.0, 2000000.0
                        ])
                   })
               },
               indices : new Uint16Array([0, 1, 1, 2, 2, 0]),
               primitiveType : PrimitiveType.LINES
           }),
           pickData : 'customWithIndices'
        });
        widget.scene.getPrimitives().add(new Primitive({
            geometryInstances : customWithIndices,
            appearance : new Appearance()
        }));

        var customWithoutIndices = new GeometryInstance({
            geometry : new Geometry({
                attributes : {
                    position : new GeometryAttribute({
                         componentDatatype : ComponentDatatype.DOUBLE,
                         componentsPerAttribute : 3,
                         values : new Float64Array([
                             0.0, 0.0, 0.0,
                             7500000.0, 0.0, 0.0,
                             0.0, 7500000.0, 0.0
                         ])
                    })
                },
                primitiveType : PrimitiveType.LINE_LOOP
            }),
            pickData : 'customWithoutIndices'
         });
         widget.scene.getPrimitives().add(new Primitive({
             geometryInstances : customWithoutIndices,
             appearance : new Appearance()
         }));
/*
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
*/
        domClass.remove(win.body(), 'loading');
    });
});
