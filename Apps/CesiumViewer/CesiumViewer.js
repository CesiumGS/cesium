/*global define*/
define([
        'DynamicScene/CzmlDataSource',
        'DynamicScene/GeoJsonDataSource',
        'Scene/PerformanceDisplay',
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
        'Core/SimplePolylineGeometry',
        'Core/GeometryPipeline',
        'Core/Transforms',
        'Core/PrimitiveType',
        'Core/ComponentDatatype',
        'Core/ScreenSpaceEventHandler',
        'Core/ScreenSpaceEventType',
        'Core/WallGeometry',
        'Core/VertexFormat',
        'Scene/Primitive',
        'Scene/MaterialAppearance',
        'Scene/PerInstanceColorAppearance',
        'Scene/EllipsoidSurfaceAppearance',
        'Scene/DebugAppearance',
        'Scene/Material',
        'Scene/ExtentPrimitive',
        'Scene/Polygon',
        'Scene/createTangentSpaceDebugPrimitive',
        'Widgets/checkForChromeFrame',
        'Widgets/Viewer/Viewer',
        'Widgets/Viewer/viewerDragDropMixin',
        'Widgets/Viewer/viewerDynamicObjectMixin',
        'domReady!'
    ], function(
        CzmlDataSource,
        GeoJsonDataSource,
        PerformanceDisplay,
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
        SimplePolylineGeometry,
        GeometryPipeline,
        Transforms,
        PrimitiveType,
        ComponentDatatype,
        ScreenSpaceEventHandler,
        ScreenSpaceEventType,
        WallGeometry,
        VertexFormat,
        Primitive,
        MaterialAppearance,
        PerInstanceColorAppearance,
        EllipsoidSurfaceAppearance,
        DebugAppearance,
        Material,
        ExtentPrimitive,
        Polygon,
        createTangentSpaceDebugPrimitive,
        checkForChromeFrame,
        Viewer,
        viewerDragDropMixin,
        viewerDynamicObjectMixin) {
    "use strict";
    /*global console*/

    /*
     * 'debug'  : true/false,   // Full WebGL error reporting at substantial performance cost.
     * 'lookAt' : CZML id,      // The CZML ID of the object to track at startup.
     * 'source' : 'file.czml',  // The relative URL of the CZML file to load at startup.
     * 'stats'  : true,         // Enable the FPS performance display.
     * 'theme'  : 'lighter',    // Use the dark-text-on-light-background theme.
     */
    var endUserOptions = {};
    var queryString = window.location.search.substring(1);
    if (queryString !== '') {
        var params = queryString.split('&');
        for ( var i = 0, len = params.length; i < len; ++i) {
            var param = params[i];
            var keyValuePair = param.split('=');
            if (keyValuePair.length > 1) {
                endUserOptions[keyValuePair[0]] = decodeURIComponent(keyValuePair[1].replace(/\+/g, ' '));
            }
        }
    }

    var loadingIndicator = document.getElementById('loadingIndicator');

    checkForChromeFrame('cesiumContainer').then(function(prompting) {
        if (!prompting) {
            startup();
        } else {
            loadingIndicator.style.display = 'none';
        }
    }).otherwise(function(e) {
        console.error(e);
        window.alert(e);
    });

    function endsWith(str, suffix) {
        var strLength = str.length;
        var suffixLength = suffix.length;
        return (suffixLength < strLength) && (str.indexOf(suffix, strLength - suffixLength) !== -1);
    }

    function startup() {
        var viewer = new Viewer('cesiumContainer');
        viewer.extend(viewerDragDropMixin);
        viewer.extend(viewerDynamicObjectMixin);

        viewer.onRenderLoopError.addEventListener(function(viewerArg, error) {
            console.log(error);
            window.alert(error);
        });

        viewer.onDropError.addEventListener(function(viewerArg, name, error) {
            console.log(error);
            window.alert(error);
        });

        var scene = viewer.scene;
        var context = scene.getContext();
        if (endUserOptions.debug) {
            context.setValidateShaderProgram(true);
            context.setValidateFramebuffer(true);
            context.setLogShaderCompilation(true);
            context.setThrowOnWebGLError(true);
        }

        if (typeof endUserOptions.source !== 'undefined') {
            var source;
            if (endsWith(endUserOptions.source.toUpperCase(), ".GEOJSON")) {
                source = new GeoJsonDataSource();
            } else {
                source = new CzmlDataSource();
            }
            source.loadUrl(endUserOptions.source).then(function() {
                viewer.dataSources.add(source);

                var dataClock = source.getClock();
                if (typeof dataClock !== 'undefined') {
                    dataClock.clone(viewer.clock);
                    viewer.timeline.updateFromClock();
                    viewer.timeline.zoomTo(dataClock.startTime, dataClock.stopTime);
                }

                if (typeof endUserOptions.lookAt !== 'undefined') {
                    var dynamicObject = source.getDynamicObjectCollection().getObject(endUserOptions.lookAt);
                    if (typeof dynamicObject !== 'undefined') {
                        viewer.trackedObject = dynamicObject;
                    } else {
                        window.alert('No object with id ' + endUserOptions.lookAt + ' exists in the provided source.');
                    }
                }
            }, function(e) {
                window.alert(e);
            }).always(function() {
                loadingIndicator.style.display = 'none';
            });
        } else {
            loadingIndicator.style.display = 'none';
        }

        if (endUserOptions.stats) {
            scene.getPrimitives().add(new PerformanceDisplay());
        }

        var theme = endUserOptions.theme;
        if (typeof theme !== 'undefined') {
            if (endUserOptions.theme === 'lighter') {
                document.body.classList.add('cesium-lighter');
                viewer.animation.applyThemeChanges();
            } else {
                window.alert('Unknown theme: ' + theme);
            }
        }

        var ellipsoid = viewer.centralBody.getEllipsoid();

        var geometry = new GeometryInstance({
            geometry : new ExtentGeometry({
                vertexFormat : PerInstanceColorAppearance.VERTEX_FORMAT,
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

        var geometry1 = new GeometryInstance({
            geometry : new ExtentGeometry({
                vertexFormat : PerInstanceColorAppearance.VERTEX_FORMAT,
                extent : new Extent(
                        CesiumMath.toRadians(-90.0),
                        CesiumMath.toRadians(10.0),
                        CesiumMath.toRadians(-70.0),
                        CesiumMath.toRadians(20.0)),
                rotation: CesiumMath.toRadians(30),
                height: 300000,
                extrudedOptions: {
                    height: 600000
                }
            }),
            pickData: 'geometry1',
            color: Color.BLUEVIOLET.clone()
        });
        geometry1.color.alpha = 0.5;

        var geometry2 = new GeometryInstance({
            geometry : new EllipsoidGeometry({
                vertexFormat : VertexFormat.ALL,
//                vertexFormat : PerInstanceColorAppearance.VERTEX_FORMAT,
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
                vertexFormat : PerInstanceColorAppearance.VERTEX_FORMAT,
                dimensions : new Cartesian3(1000000.0, 1000000.0, 2000000.0)
            }),
            modelMatrix : Matrix4.multiplyByTranslation(Transforms.eastNorthUpToFixedFrame(
                ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883))), new Cartesian3(0.0, 0.0, 3000000.0)),
            pickData : 'geometry3',
            color : Color.BLANCHEDALMOND
        });
        var geometry4 = new GeometryInstance({
            geometry : new EllipseGeometry({
                vertexFormat : PerInstanceColorAppearance.VERTEX_FORMAT,
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
            geometryInstances : [geometry, geometry1, geometry2, geometry3, geometry4],
            appearance : new PerInstanceColorAppearance({
                closed : true
            })
        });
        scene.getPrimitives().add(primitive);

        scene.getPrimitives().add(createTangentSpaceDebugPrimitive({
            geometry : geometry2.geometry,
            length : 10000.0,
            modelMatrix : geometry2.modelMatrix
        }));

        var m = new Material({
            context : viewer.scene.getContext(),
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
        var appearance = new MaterialAppearance({
            materialSupport :  MaterialAppearance.MaterialSupport.ALL,
            material : m,
            renderState : rs
        });
        var geometry5 = new GeometryInstance({
            geometry : new EllipsoidGeometry({
                vertexFormat : MaterialAppearance.MaterialSupport.ALL.vertexFormat,
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
            releaseGeometryInstances : true,
            transformToWorldCoordinates : false
        }));

        var polygonGeometry = new GeometryInstance({
            geometry : new PolygonGeometry({
                vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
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
                height : 3000000.0,
                stRotation : 0.523598776
            }),
            pickData : 'polygon3'
        });
        var polygonPrimitive = new Primitive({
            geometryInstances : polygonGeometry,
            appearance : new EllipsoidSurfaceAppearance({
                material : Material.fromType(scene.getContext(), 'Stripe'),
                aboveGround : true,
                translucent : false,
                flat : true
            })
        });
        scene.getPrimitives().add(polygonPrimitive);

        var wall = new GeometryInstance({
            geometry : new WallGeometry({
                vertexFormat : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat,
                positions    : ellipsoid.cartographicArrayToCartesianArray([
                    Cartographic.fromDegrees(-125.0, 37.0, 100000.0),
                    Cartographic.fromDegrees(-125.0, 38.0, 100000.0),
                    Cartographic.fromDegrees(-120.0, 38.0, 100000.0),
                    Cartographic.fromDegrees(-120.0, 37.0, 100000.0),
                    Cartographic.fromDegrees(-125.0, 37.0, 100000.0)
                ])
            })
            // pickData is undefined here for testing
        });
        var wallPrimitive = new Primitive({
            geometryInstances : wall,
            appearance : new MaterialAppearance({
                materialSupport : MaterialAppearance.MaterialSupport.TEXTURED,
                material : Material.fromType(scene.getContext(), 'Checkerboard'),
                faceForward : true
            }),
            allowColumbusView : false
        });
        wallPrimitive.appearance.material.uniforms.repeat = { x : 20.0, y : 6.0 };
        scene.getPrimitives().add(wallPrimitive);

        scene.getPrimitives().add(new Primitive({
            geometryInstances : new GeometryInstance({
                geometry : new WallGeometry({
                    vertexFormat : VertexFormat.ALL,
                    positions    : ellipsoid.cartographicArrayToCartesianArray([
                        Cartographic.fromDegrees(-5.0, -5.0, 500000.0),
                        Cartographic.fromDegrees( 5.0, -5.0, 600000.0),
                        Cartographic.fromDegrees( 5.0,  5.0, 600000.0),
                        Cartographic.fromDegrees(-5.0,  5.0, 500000.0),
                        Cartographic.fromDegrees(-5.0, -5.0, 500000.0)
                    ]),
                    bottom : 400000.0
                })
            }),
            appearance : new DebugAppearance({
                attributeName : 'normal'
            })
        }));

        var customWithIndices = new GeometryInstance({
           geometry : new Geometry({
               attributes : {
                   position : new GeometryAttribute({
                        componentDatatype : ComponentDatatype.DOUBLE,
                        componentsPerAttribute : 3,
                        values : new Float64Array([
                            7000000.0, 0.0, 0.0,
                            7000000.0, 1000000.0, 0.0,
                            7000000.0, 0.0, 1000000.0
                        ])
                   })
               },
               indices : new Uint16Array([0, 1, 1, 2, 2, 0]),
               primitiveType : PrimitiveType.LINES
           }),
           pickData : 'customWithIndices',
           color : new Color(1.0, 1.0, 1.0, 1.0)
        });
        scene.getPrimitives().add(new Primitive({
            geometryInstances : customWithIndices,
            appearance : new PerInstanceColorAppearance({
                flat : true
            })
        }));

        var customWithoutIndices = new GeometryInstance({
            geometry : new Geometry({
                attributes : {
                    position : new GeometryAttribute({
                         componentDatatype : ComponentDatatype.DOUBLE,
                         componentsPerAttribute : 3,
                         values : new Float64Array([
                             7500000.0, 0.0, 0.0,
                             7500000.0, 1000000.0, 0.0,
                             7500000.0, 0.0, 1000000.0
                         ])
                    })
                },
                primitiveType : PrimitiveType.LINE_LOOP
            }),
            pickData : 'customWithoutIndices',
            color : new Color(1.0, 1.0, 0.0, 1.0)
         });
         scene.getPrimitives().add(new Primitive({
             geometryInstances : customWithoutIndices,
             appearance : new PerInstanceColorAppearance({
                 renderState : {}, // No depth test
                 flat : true
             })
         }));

         scene.getPrimitives().add(new Primitive({
             geometryInstances : [
                 new GeometryInstance({
                     geometry : new SimplePolylineGeometry({
                         positions : ellipsoid.cartographicArrayToCartesianArray([
                             Cartographic.fromDegrees(0.0, 0.0),
                             Cartographic.fromDegrees(5.0, 0.0),
                             Cartographic.fromDegrees(5.0, 5.0)
                         ])
                     }),
                     color : new Color(1.0, 1.0, 1.0, 1.0),
                     pickData : 'simple polyline'
                 }),
                 new GeometryInstance({
                     geometry : new SimplePolylineGeometry({
                         positions : ellipsoid.cartographicArrayToCartesianArray([
                             Cartographic.fromDegrees(0.0, 0.0),
                             Cartographic.fromDegrees(0.0, 5.0),
                             Cartographic.fromDegrees(5.0, 5.0)
                         ])
                     }),
                     color : new Color(1.0, 0.0, 1.0, 1.0),
                     pickData : 'another simple polyline'
                 })
             ],
             appearance : new PerInstanceColorAppearance({
                 flat : true,
                 translucent : false
             })
         }));

         var extentPrimitive = new ExtentPrimitive({
             extent : Extent.fromDegrees(0.0, 20.0, 10.0, 30.0)
         });
         scene.getPrimitives().add(extentPrimitive);

         var pp = new Polygon({
             positions : ellipsoid.cartographicArrayToCartesianArray([
                 Cartographic.fromDegrees(0.0, 45.0),
                 Cartographic.fromDegrees(10.0, 45.0),
                 Cartographic.fromDegrees(10.0, 55.0)
             ])
          });
         scene.getPrimitives().add(pp);

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
        handler.setInputAction(
            function () {
                polygonPrimitive.appearance.material = Material.fromType(scene.getContext(), 'Wood');
                wallPrimitive.appearance = new MaterialAppearance();

                extentPrimitive.material = Material.fromType(scene.getContext(), 'Dot');
                extentPrimitive.rotation = CesiumMath.toRadians(45.0);
                extentPrimitive.height = 1500000.0;

                pp.material = Material.fromType(scene.getContext(), 'Dot');
                pp.textureRotationAngle = CesiumMath.toRadians(30.0);
                pp.height = 1500000.0;
            },
            ScreenSpaceEventType.LEFT_CLICK
        );
    }
});
