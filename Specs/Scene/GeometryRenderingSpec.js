/*global defineSuite*/
defineSuite([
         'Core/BoxGeometry',
         'Core/CircleGeometry',
         'Core/EllipseGeometry',
         'Core/EllipsoidGeometry',
         'Core/ExtentGeometry',
         'Core/PolygonGeometry',
         'Core/SimplePolylineGeometry',
         'Core/WallGeometry',
         'Core/defaultValue',
         'Core/Geometry',
         'Core/GeometryAttribute',
         'Core/GeometryInstance',
         'Core/ColorGeometryInstanceAttribute',
         'Core/GeometryInstanceAttribute',
         'Core/ComponentDatatype',
         'Core/Cartesian3',
         'Core/Matrix4',
         'Core/Extent',
         'Core/Ellipsoid',
         'Core/PrimitiveType',
         'Core/Transforms',
         'Core/Cartographic',
         'Core/BoundingSphere',
         'Core/Math',
         'Renderer/ClearCommand',
         'Scene/PerInstanceColorAppearance',
         'Scene/Primitive',
         'Scene/SceneMode',
         'Scene/OrthographicFrustum',
         'Specs/render',
         'Specs/pick',
         'Specs/createCanvas',
         'Specs/destroyCanvas',
         'Specs/createContext',
         'Specs/destroyContext',
         'Specs/createFrameState'
     ], 'Scene/GeometryRendering', function(
         BoxGeometry,
         CircleGeometry,
         EllipseGeometry,
         EllipsoidGeometry,
         ExtentGeometry,
         PolygonGeometry,
         SimplePolylineGeometry,
         WallGeometry,
         defaultValue,
         Geometry,
         GeometryAttribute,
         GeometryInstance,
         ColorGeometryInstanceAttribute,
         GeometryInstanceAttribute,
         ComponentDatatype,
         Cartesian3,
         Matrix4,
         Extent,
         Ellipsoid,
         PrimitiveType,
         Transforms,
         Cartographic,
         BoundingSphere,
         CesiumMath,
         ClearCommand,
         PerInstanceColorAppearance,
         Primitive,
         SceneMode,
         OrthographicFrustum,
         render,
         pick,
         createCanvas,
         destroyCanvas,
         createContext,
         destroyContext,
         createFrameState) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var ellipsoid;

    beforeAll(function() {
        context = createContext();
        ellipsoid = Ellipsoid.WGS84;
    });

    afterAll(function() {
        destroyContext(context);
    });

    function viewSphere3D(camera, sphere, modelMatrix) {
        sphere = BoundingSphere.transform(sphere, modelMatrix);
        var center = sphere.center.clone();
        var radius = sphere.radius;

        var direction = ellipsoid.geodeticSurfaceNormal(center, camera.direction);
        Cartesian3.negate(direction, direction);
        Cartesian3.normalize(direction, direction);
        var right = Cartesian3.cross(direction, Cartesian3.UNIT_Z, camera.right);
        Cartesian3.normalize(right, right);
        Cartesian3.cross(right, direction, camera.up);

        var scalar = center.magnitude() + radius;
        Cartesian3.normalize(center, center);
        Cartesian3.multiplyByScalar(center, scalar, camera.position);
    }

    function render3D(instance, afterView, boundingSphere) {
        var primitive = new Primitive({
            geometryInstances : instance,
            appearance : new PerInstanceColorAppearance({
                flat : true
            })
        });

        var frameState = createFrameState();

        var sphere = defaultValue(instance.geometry.boundingSphere, boundingSphere);
        viewSphere3D(frameState.camera, sphere, instance.modelMatrix);

        if (typeof afterView === 'function') {
            afterView(frameState);
        }

        context.getUniformState().update(frameState);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        primitive = primitive && primitive.destroy();
    }

    function viewSphereCV(camera, sphere, modelMatrix) {
        sphere = BoundingSphere.transform(sphere, modelMatrix);
        sphere = BoundingSphere.projectTo2D(sphere);
        var center = sphere.center.clone();
        var radius = sphere.radius * 0.5;

        Cartesian3.clone(Cartesian3.UNIT_Z, camera.direction);
        Cartesian3.negate(camera.direction, camera.direction);
        Cartesian3.clone(Cartesian3.UNIT_Y, camera.up);
        Cartesian3.clone(Cartesian3.UNIT_X, camera.right);

        camera.position.x = center.y;
        camera.position.y = center.z;
        camera.position.z = center.x + radius;
    }

    function renderCV(instance, afterView, boundingSphere) {
        var primitive = new Primitive({
            geometryInstances : instance,
            appearance : new PerInstanceColorAppearance({
                flat : true
            })
        });

        var frameState = createFrameState();
        frameState.mode = SceneMode.COLUMBUS_VIEW;
        frameState.morphTime = frameState.mode.morphTime;
        frameState.camera.transform = new Matrix4(0.0, 0.0, 1.0, 0.0,
                                                  1.0, 0.0, 0.0, 0.0,
                                                  0.0, 1.0, 0.0, 0.0,
                                                  0.0, 0.0, 0.0, 1.0);
        frameState.camera.controller.update(frameState.mode, frameState.scene2D);

        var sphere = defaultValue(instance.geometry.boundingSphere, boundingSphere);
        viewSphereCV(frameState.camera, sphere, instance.modelMatrix);

        if (typeof afterView === 'function') {
            afterView(frameState);
        }

        context.getUniformState().update(frameState);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        primitive = primitive && primitive.destroy();
    }

    function viewSphere2D(camera, sphere, modelMatrix) {
        sphere = BoundingSphere.transform(sphere, modelMatrix);
        sphere = BoundingSphere.projectTo2D(sphere);
        var center = sphere.center.clone();
        var radius = sphere.radius;

        Cartesian3.clone(Cartesian3.UNIT_Z, camera.direction);
        Cartesian3.negate(camera.direction, camera.direction);
        Cartesian3.clone(Cartesian3.UNIT_Y, camera.up);
        Cartesian3.clone(Cartesian3.UNIT_X, camera.right);

        camera.position.x = center.y;
        camera.position.y = center.z;

        var frustum = camera.frustum;
        var ratio = camera.frustum.right / camera.frustum.top;
        frustum.right = radius * 0.25;
        frustum.top = frustum.right / ratio;
        frustum.left = -frustum.right;
        frustum.bottom = -frustum.top;
    }

    function render2D(instance, boundingSphere) {
        var primitive = new Primitive({
            geometryInstances : instance,
            appearance : new PerInstanceColorAppearance({
                flat : true
            })
        });

        var frameState = createFrameState();
        frameState.mode = SceneMode.SCENE2D;
        frameState.morphTime = frameState.mode.morphTime;
        frameState.camera.transform = new Matrix4(0.0, 0.0, 1.0, 0.0,
                                                  1.0, 0.0, 0.0, 0.0,
                                                  0.0, 1.0, 0.0, 0.0,
                                                  0.0, 0.0, 0.0, 1.0);
        var frustum = new OrthographicFrustum();
        frustum.right = ellipsoid.getMaximumRadius() * Math.PI;
        frustum.left = -frustum.right;
        frustum.top = frustum.right;
        frustum.bottom = -frustum.top;
        frameState.camera.frustum = frustum;
        frameState.camera.controller.update(frameState.mode, frameState.scene2D);

        var sphere = defaultValue(instance.geometry.boundingSphere, boundingSphere);
        viewSphere2D(frameState.camera, sphere, instance.modelMatrix);
        context.getUniformState().update(frameState);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        primitive = primitive && primitive.destroy();
    }

    function pickGeometry(instance, afterView, boundingSphere) {
        var primitive = new Primitive({
            geometryInstances : instance,
            appearance : new PerInstanceColorAppearance({
                flat : true
            })
        });

        var frameState = createFrameState();

        var sphere = defaultValue(instance.geometry.boundingSphere, boundingSphere);
        viewSphere3D(frameState.camera, sphere, instance.modelMatrix);

        if (typeof afterView === 'function') {
            afterView(frameState);
        }

        context.getUniformState().update(frameState);

        expect(pick(context, frameState, primitive)).toEqual(instance.id);

        primitive = primitive && primitive.destroy();
    }

    describe('BoxGeometry', function() {
        var instance;
        beforeAll(function() {
            instance = new GeometryInstance({
                geometry : BoxGeometry.fromDimensions({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    dimensions : new Cartesian3(1000000.0, 1000000.0, 2000000.0)
                }),
                modelMatrix : Matrix4.multiplyByTranslation(Transforms.eastNorthUpToFixedFrame(
                    ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883))), new Cartesian3(0.0, 0.0, 3000000.0)),
                id : 'box',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
        });

        it('3D', function() {
            render3D(instance);
        });

        it('Columbus view', function() {
            renderCV(instance);
        });

        it('2D', function() {
            render2D(instance);
        });

        it('pick', function() {
            pickGeometry(instance);
        });
    }, 'WebGL');

    describe('CircleGeometry', function() {
        var instance;
        beforeAll(function() {
            instance = new GeometryInstance({
                geometry : new CircleGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    center : ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-100, 20)),
                    radius : 1000000.0
                }),
                id : 'circle',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
        });

        it('3D', function() {
            render3D(instance);
        });

        it('Columbus view', function() {
            renderCV(instance);
        });

        it('2D', function() {
            render2D(instance);
        });

        it('pick', function() {
            pickGeometry(instance);
        });
    }, 'WebGL');

    describe('EllipseGeometry', function() {
        var instance;
        beforeAll(function() {
            instance = new GeometryInstance({
                geometry : new EllipseGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    center : ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-100, 20)),
                    semiMinorAxis : 1000000.0,
                    semiMajorAxis : 1000000.0
                }),
                id : 'ellipse',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
        });

        it('3D', function() {
            render3D(instance);
        });

        it('Columbus view', function() {
            renderCV(instance);
        });

        it('2D', function() {
            render2D(instance);
        });

        it('pick', function() {
            pickGeometry(instance);
        });

        it('rotated', function() {
            var rotated = new GeometryInstance({
                geometry : new EllipseGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    center : ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-100, 20)),
                    semiMinorAxis : 1000000.0,
                    semiMajorAxis : 1000000.0,
                    bearing : CesiumMath.PI_OVER_FOUR
                }),
                id : 'ellipse',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
            render3D(rotated);
        });

        it('at height', function() {
            var atHeight = new GeometryInstance({
                geometry : new EllipseGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    center : ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-100, 20)),
                    semiMinorAxis : 1000000.0,
                    semiMajorAxis : 1000000.0,
                    height : 1000000.0
                }),
                id : 'ellipse',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
            render3D(atHeight);
        });
    }, 'WebGL');

    describe('EllipsoidGeometry', function() {
        var instance;
        beforeAll(function() {
            instance = new GeometryInstance({
                geometry : new EllipsoidGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    radii : new Cartesian3(1000000.0, 1000000.0, 500000.0)
                }),
                modelMatrix : Matrix4.multiplyByTranslation(Transforms.eastNorthUpToFixedFrame(
                    ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-100, 20))), new Cartesian3(0.0, 0.0, 1000000.0)),
                id : 'ellipsoid',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
        });

        it('3D', function() {
            render3D(instance);
        });

        it('Columbus view', function() {
            renderCV(instance);
        });

        it('2D', function() {
            render2D(instance);
        });

        it('pick', function() {
            pickGeometry(instance);
        });
    }, 'WebGL');

    describe('ExtentGeometry', function() {
        var instance;
        var extent;
        beforeAll(function() {
            extent = Extent.fromDegrees(0, 0, 1, 1);
            instance = new GeometryInstance({
                geometry : new ExtentGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    extent : extent
                }),
                id : 'extent',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
        });

        it('3D', function() {
            render3D(instance);
        });

        it('Columbus view', function() {
            renderCV(instance);
        });

        it('2D', function() {
            render2D(instance);
        });

        it('pick', function() {
            pickGeometry(instance);
        });

        it('rotated', function() {
            var rotated = new GeometryInstance({
                geometry : new ExtentGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    extent : extent,
                    rotation : CesiumMath.PI_OVER_FOUR
                }),
                id : 'extent',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
            render3D(rotated);
        });

        it('at height', function() {
            var atHeight = new GeometryInstance({
                geometry : new ExtentGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    extent : extent,
                    height : 100000.0
                }),
                id : 'extent',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
            render3D(atHeight);
        });
    }, 'WebGL');

    describe('PolygonGeometry', function() {
        var instance;
        beforeAll(function() {
            instance = new GeometryInstance({
                geometry : PolygonGeometry.fromPositions({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    positions : ellipsoid.cartographicArrayToCartesianArray([
                        Cartographic.fromDegrees(0.0, 45.0),
                        Cartographic.fromDegrees(10.0, 45.0),
                        Cartographic.fromDegrees(10.0, 55.0),
                        Cartographic.fromDegrees(0.0, 55.0)
                    ])
                }),
                id : 'polygon',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
        });

        it('3D', function() {
            render3D(instance);
        });

        it('Columbus view', function() {
            renderCV(instance);
        });

        it('2D', function() {
            render2D(instance);
        });

        it('pick', function() {
            pickGeometry(instance);
        });

        it('at height', function() {
            var atHeight = new GeometryInstance({
                geometry : PolygonGeometry.fromPositions({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    positions : ellipsoid.cartographicArrayToCartesianArray([
                        Cartographic.fromDegrees(0.0, 45.0),
                        Cartographic.fromDegrees(10.0, 45.0),
                        Cartographic.fromDegrees(10.0, 55.0),
                        Cartographic.fromDegrees(0.0, 55.0)
                    ]),
                    height : 3000000.0
                }),
                id : 'polygon',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
            render3D(atHeight);
        });

        it('hierarchy', function() {
            var hierarchy = new GeometryInstance({
                geometry : new PolygonGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
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
                                    Cartographic.fromDegrees(-106.5, 31.5),
                                    Cartographic.fromDegrees(-97.5, 31.5),
                                    Cartographic.fromDegrees(-97.5, 38.5),
                                    Cartographic.fromDegrees(-106.5, 38.5)
                                ])
                            }]
                        }]
                    }
                }),
                id : 'polygon',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
            render3D(hierarchy);
        });
    }, 'WebGL');

    describe('WallGeometry', function() {
        var instance;
        var afterViewCV;
        var afterView3D;
        beforeAll(function() {
            var height = 100000.0;

            instance = new GeometryInstance({
                geometry : new WallGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    positions : ellipsoid.cartographicArrayToCartesianArray([
                        Cartographic.fromDegrees(0.0, 0.0, height),
                        Cartographic.fromDegrees(0.01, 0.0, height)
                    ])
                }),
                id : 'wall',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });

            afterView3D = function(frameState) {
                var transform = Transforms.eastNorthUpToFixedFrame(instance.geometry.boundingSphere.center);
                frameState.camera.controller.rotateDown(-CesiumMath.PI_OVER_TWO, transform);
                frameState.camera.controller.zoomIn(instance.geometry.boundingSphere.radius * 0.99);
            };

            afterViewCV = function(frameState) {
                var translation = frameState.camera.position.clone();
                translation.z = 0.0;
                var transform = Matrix4.fromTranslation(translation);
                frameState.camera.controller.rotateDown(-CesiumMath.PI_OVER_TWO, transform);
                frameState.camera.controller.zoomIn(instance.geometry.boundingSphere.radius * 1.85);
            };
        });

        it('3D', function() {
            render3D(instance, afterView3D);
        });

        it('Columbus view', function() {
            renderCV(instance, afterViewCV);
        });

        // walls do not render in 2D

        it('pick', function() {
            pickGeometry(instance, afterView3D);
        });
    }, 'WebGL');

    describe('SimplePolylineGeometry', function() {
        var instance;
        beforeAll(function() {
            instance = new GeometryInstance({
                geometry : new SimplePolylineGeometry({
                    positions : ellipsoid.cartographicArrayToCartesianArray([
                        Cartographic.fromDegrees(0.0, 0.0),
                        Cartographic.fromDegrees(5.0, 0.0)
                    ])
                }),
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 1.0, 1.0)
                },
                id : 'simple polyline'
            });
        });

        it('3D', function() {
            render3D(instance);
        });

        it('Columbus view', function() {
            renderCV(instance);
        });

        it('2D', function() {
            render2D(instance);
        });

        it('pick', function() {
            pickGeometry(instance);
        });
    });

    describe('Custom geometry', function() {
        describe('with indices', function() {
            var instance;
            beforeAll(function() {
                instance = new GeometryInstance({
                    geometry : new Geometry({
                        attributes : {
                            position : new GeometryAttribute({
                                 componentDatatype : ComponentDatatype.DOUBLE,
                                 componentsPerAttribute : 3,
                                 values : new Float64Array([
                                     7000000.0, 0.0, 0.0,
                                     7000000.0, 1000000.0, 0.0,
                                     7000000.0, 0.0, 1000000.0,
                                     7000000.0, 1000000.0, 1000000.0
                                 ])
                            })
                        },
                        indices : new Uint16Array([0, 1, 2, 2, 1, 3]),
                        primitiveType : PrimitiveType.TRIANGLES
                    }),
                    id : 'customWithIndices',
                    attributes : {
                        color : new ColorGeometryInstanceAttribute(1.0, 1.0, 1.0, 1.0)
                    }
                });
                instance.geometry.boundingSphere = BoundingSphere.fromVertices(instance.geometry.attributes.position.values);
            });

            it('3D', function() {
                render3D(instance);
            });

            it('Columbus view', function() {
                renderCV(instance);
            });

            it('2D', function() {
                render2D(instance);
            });

            it('pick', function() {
                pickGeometry(instance);
            });
        });

        describe('without indices', function() {
            var instance;
            beforeAll(function() {
                instance = new GeometryInstance({
                    geometry : new Geometry({
                        attributes : {
                            position : new GeometryAttribute({
                                 componentDatatype : ComponentDatatype.DOUBLE,
                                 componentsPerAttribute : 3,
                                 values : new Float64Array([
                                     7000000.0, 0.0, 0.0,
                                     7000000.0, 1000000.0, 0.0,
                                     7000000.0, 0.0, 1000000.0,
                                     7000000.0, 0.0, 1000000.0,
                                     7000000.0, 1000000.0, 0.0,
                                     7000000.0, 1000000.0, 1000000.0
                                 ])
                            })
                        },
                        primitiveType : PrimitiveType.TRIANGLES
                    }),
                    id : 'customWithIndices',
                    attributes : {
                        color : new ColorGeometryInstanceAttribute(1.0, 1.0, 1.0, 1.0)
                    }
                });
                instance.geometry.boundingSphere = BoundingSphere.fromVertices(instance.geometry.attributes.position.values);
            });

            it('3D', function() {
                render3D(instance);
            });

            it('Columbus view', function() {
                renderCV(instance);
            });

            it('2D', function() {
                render2D(instance);
            });

            it('pick', function() {
                pickGeometry(instance);
            });
        });
    });

});
