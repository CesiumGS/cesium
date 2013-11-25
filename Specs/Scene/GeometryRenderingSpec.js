/*global defineSuite*/
defineSuite([
         'Core/BoxGeometry',
         'Core/CircleGeometry',
         'Core/CylinderGeometry',
         'Core/defined',
         'Core/EllipseGeometry',
         'Core/EllipsoidGeometry',
         'Core/SphereGeometry',
         'Core/ExtentGeometry',
         'Core/PolygonGeometry',
         'Core/SimplePolylineGeometry',
         'Core/PolylineGeometry',
         'Core/WallGeometry',
         'Core/CorridorGeometry',
         'Core/CornerType',
         'Core/defaultValue',
         'Core/Geometry',
         'Core/GeometryAttribute',
         'Core/GeometryInstance',
         'Core/ColorGeometryInstanceAttribute',
         'Core/GeometryInstanceAttribute',
         'Core/ComponentDatatype',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Matrix4',
         'Core/Extent',
         'Core/Ellipsoid',
         'Core/PrimitiveType',
         'Core/PolylineVolumeGeometry',
         'Core/Transforms',
         'Core/Cartographic',
         'Core/BoundingSphere',
         'Core/Math',
         'Core/Color',
         'Renderer/ClearCommand',
         'Scene/PerInstanceColorAppearance',
         'Scene/PolylineColorAppearance',
         'Scene/Primitive',
         'Scene/SceneMode',
         'Scene/OrthographicFrustum',
         'Scene/EllipsoidSurfaceAppearance',
         'Scene/Material',
         'Specs/render',
         'Specs/pick',
         'Specs/createContext',
         'Specs/destroyContext',
         'Specs/createFrameState'
     ], 'Scene/GeometryRendering', function(
         BoxGeometry,
         CircleGeometry,
         CylinderGeometry,
         defined,
         EllipseGeometry,
         EllipsoidGeometry,
         SphereGeometry,
         ExtentGeometry,
         PolygonGeometry,
         SimplePolylineGeometry,
         PolylineGeometry,
         WallGeometry,
         CorridorGeometry,
         CornerType,
         defaultValue,
         Geometry,
         GeometryAttribute,
         GeometryInstance,
         ColorGeometryInstanceAttribute,
         GeometryInstanceAttribute,
         ComponentDatatype,
         Cartesian2,
         Cartesian3,
         Matrix4,
         Extent,
         Ellipsoid,
         PrimitiveType,
         PolylineVolumeGeometry,
         Transforms,
         Cartographic,
         BoundingSphere,
         CesiumMath,
         Color,
         ClearCommand,
         PerInstanceColorAppearance,
         PolylineColorAppearance,
         Primitive,
         SceneMode,
         OrthographicFrustum,
         EllipsoidSurfaceAppearance,
         Material,
         render,
         pick,
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
        var center = Cartesian3.clone(sphere.center);
        var radius = sphere.radius;

        var direction = ellipsoid.geodeticSurfaceNormal(center, camera.direction);
        Cartesian3.negate(direction, direction);
        Cartesian3.normalize(direction, direction);
        var right = Cartesian3.cross(direction, Cartesian3.UNIT_Z, camera.right);
        Cartesian3.normalize(right, right);
        Cartesian3.cross(right, direction, camera.up);

        var scalar = Cartesian3.magnitude(center) + radius;
        Cartesian3.normalize(center, center);
        Cartesian3.multiplyByScalar(center, scalar, camera.position);
    }

    function render3D(instance, afterView, appearance) {
        if (!defined(appearance)) {
            appearance = new PerInstanceColorAppearance({
                flat : true
            });
        }

        var primitive = new Primitive({
            geometryInstances : instance,
            appearance : appearance,
            asynchronous : false
        });

        var frameState = createFrameState();
        primitive.update(context, frameState, []);
        viewSphere3D(frameState.camera, primitive._boundingSphere, primitive.modelMatrix);

        if (typeof afterView === 'function') {
            afterView(frameState, primitive);
        }

        context.getUniformState().update(context, frameState);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        primitive = primitive && primitive.destroy();
    }

    function viewSphereCV(camera, sphere, modelMatrix) {
        sphere = BoundingSphere.transform(sphere, modelMatrix);
        sphere = BoundingSphere.projectTo2D(sphere);
        var center = Cartesian3.clone(sphere.center);
        var radius = sphere.radius * 0.5;

        Cartesian3.clone(Cartesian3.UNIT_Z, camera.direction);
        Cartesian3.negate(camera.direction, camera.direction);
        Cartesian3.clone(Cartesian3.UNIT_Y, camera.up);
        Cartesian3.clone(Cartesian3.UNIT_X, camera.right);

        camera.position.x = center.y;
        camera.position.y = center.z;
        camera.position.z = center.x + radius;
    }

    function renderCV(instance, afterView, appearance) {
        if (!defined(appearance)) {
            appearance = new PerInstanceColorAppearance({
                flat : true
            });
        }

        var primitive = new Primitive({
            geometryInstances : instance,
            appearance : appearance,
            asynchronous : false
        });

        var frameState = createFrameState();
        primitive.update(context, frameState, []);

        frameState.mode = SceneMode.COLUMBUS_VIEW;
        frameState.morphTime = frameState.mode.morphTime;
        frameState.camera.transform = new Matrix4(0.0, 0.0, 1.0, 0.0,
                                                  1.0, 0.0, 0.0, 0.0,
                                                  0.0, 1.0, 0.0, 0.0,
                                                  0.0, 0.0, 0.0, 1.0);
        frameState.camera.controller.update(frameState.mode, frameState.scene2D);

        viewSphereCV(frameState.camera, primitive._boundingSphere, primitive.modelMatrix);

        if (typeof afterView === 'function') {
            afterView(frameState, primitive);
        }

        context.getUniformState().update(context, frameState);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        primitive = primitive && primitive.destroy();
    }

    function viewSphere2D(camera, sphere, modelMatrix) {
        sphere = BoundingSphere.transform(sphere, modelMatrix);
        sphere = BoundingSphere.projectTo2D(sphere);
        var center = Cartesian3.clone(sphere.center);
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

    function render2D(instance, appearance) {
        if (!defined(appearance)) {
            appearance = new PerInstanceColorAppearance({
                flat : true
            });
        }

        var primitive = new Primitive({
            geometryInstances : instance,
            appearance : appearance,
            asynchronous : false
        });

        var frameState = createFrameState();
        primitive.update(context, frameState, []);

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

        viewSphere2D(frameState.camera, primitive._boundingSphere, primitive.modelMatrix);
        context.getUniformState().update(context, frameState);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        primitive = primitive && primitive.destroy();
    }

    function pickGeometry(instance, afterView, appearance) {
        if (!defined(appearance)) {
            appearance = new PerInstanceColorAppearance({
                flat : true
            });
        }

        var primitive = new Primitive({
            geometryInstances : instance,
            appearance : appearance,
            asynchronous : false
        });

        var frameState = createFrameState();
        primitive.update(context, frameState, []);

        viewSphere3D(frameState.camera, primitive._boundingSphere, primitive.modelMatrix);

        if (typeof afterView === 'function') {
            afterView(frameState, primitive);
        }

        context.getUniformState().update(context, frameState);

        var pickObject = pick(context, frameState, primitive);
        expect(pickObject.primitive).toEqual(primitive);
        expect(pickObject.id).toEqual(instance.id);

        primitive = primitive && primitive.destroy();
    }

    function renderAsync(instance, afterView, appearance) {
        if (!defined(appearance)) {
            appearance = new PerInstanceColorAppearance({
                flat : true
            });
        }

        var primitive = new Primitive({
            geometryInstances : instance,
            appearance : appearance
        });

        var frameState = createFrameState();

        waitsFor(function() {
            return render(context, frameState, primitive) > 0;
        });

        runs(function() {
            viewSphere3D(frameState.camera, primitive._boundingSphere, primitive.modelMatrix);

            if (typeof afterView === 'function') {
                afterView(frameState, primitive);
            }

            context.getUniformState().update(context, frameState);

            ClearCommand.ALL.execute(context);
            expect(context.readPixels()).toEqual([0, 0, 0, 0]);

            render(context, frameState, primitive);
            expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

            primitive = primitive && primitive.destroy();
        });
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

        it('async', function() {
            renderAsync(instance);
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

        it('async', function() {
            renderAsync(instance);
        });
    }, 'WebGL');

    describe('CylinderGeometry', function() {
        var instance;
        beforeAll(function() {
            instance = new GeometryInstance({
                geometry : new CylinderGeometry({
                    length: 5,
                    topRadius: 3,
                    bottomRadius: 5,
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT
                }),
                id: 'cylinder',
                modelMatrix : Matrix4.multiplyByUniformScale(Matrix4.multiplyByTranslation(Transforms.eastNorthUpToFixedFrame(
                        ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-90.0, 45.0))), new Cartesian3(0.0, 0.0, 500000.0)), 90000.0),
                attributes : {
                    color : new ColorGeometryInstanceAttribute(Math.random(), Math.random(), Math.random(), 0.5)
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

        it('async', function() {
            renderAsync(instance);
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

        it('async', function() {
            renderAsync(instance);
        });

        it('rotated', function() {
            var rotated = new GeometryInstance({
                geometry : new EllipseGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    center : ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-100, 20)),
                    semiMinorAxis : 1000000.0,
                    semiMajorAxis : 1000000.0,
                    rotation : CesiumMath.PI_OVER_FOUR
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

    describe('Extruded EllipseGeometry', function() {
        var instance;
        var extrudedHeight;
        var geometryHeight;
        beforeAll(function() {
            extrudedHeight = 200000.0;
            geometryHeight = 100000.0;
            instance = new GeometryInstance({
                geometry : new EllipseGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    center : ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-100, 20)),
                    semiMinorAxis : 1000000.0,
                    semiMajorAxis : 1000000.0,
                    height : geometryHeight,
                    extrudedHeight : extrudedHeight
                }),
                id : 'extrudedEllipse',
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

        it('async', function() {
            renderAsync(instance);
        });

        it('renders bottom', function() {
            var afterView = function(frameState, primitive) {
                var height = (extrudedHeight - geometryHeight) * 0.5;
                var transform = Matrix4.multiplyByTranslation(
                        Transforms.eastNorthUpToFixedFrame(primitive._boundingSphere.center),
                        new Cartesian3(0.0, 0.0, height));
                frameState.camera.controller.rotateDown(CesiumMath.PI, transform);
            };
            render3D(instance, afterView);
        });

        it('renders wall', function() {
            var afterView = function(frameState, primitive) {
                var transform = Transforms.eastNorthUpToFixedFrame(primitive._boundingSphere.center);
                frameState.camera.controller.rotateDown(CesiumMath.PI_OVER_TWO, transform);
            };
            render3D(instance, afterView);
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

        it('async', function() {
            renderAsync(instance);
        });
    }, 'WebGL');

    describe('SphereGeometry', function() {
        var instance;
        beforeAll(function() {
            instance = new GeometryInstance({
                geometry : new SphereGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    radius : 1000000.0
                }),
                modelMatrix : Matrix4.multiplyByTranslation(Transforms.eastNorthUpToFixedFrame(
                    ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-100, 20))), new Cartesian3(0.0, 0.0, 1000000.0)),
                id : 'sphere',
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

        it('async', function() {
            renderAsync(instance);
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

        it('async', function() {
            renderAsync(instance);
        });

        it('rotated geometry', function() {
            var rotated = new GeometryInstance({
                geometry : new ExtentGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    extent : extent,
                    rotation : CesiumMath.PI_OVER_FOUR
                }),
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
            render3D(rotated);
        });

        it('rotated texture', function() {
            var rotated = new GeometryInstance({
                geometry : new ExtentGeometry({
                    vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    extent : extent,
                    stRotation : CesiumMath.PI_OVER_TWO
                })
            });
            var appearance = new EllipsoidSurfaceAppearance({
                material : Material.fromType('Stripe')
            });
            render3D(rotated, undefined, appearance);
        });

        it('at height', function() {
            var atHeight = new GeometryInstance({
                geometry : new ExtentGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    extent : extent,
                    height : 100000.0
                }),
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
            render3D(atHeight);
        });
    }, 'WebGL');

    describe('Extruded ExtentGeometry', function() {
        var instance;
        var extent;
        var extrudedHeight;
        var geometryHeight;
        beforeAll(function() {
            extent = Extent.fromDegrees(-1, -1, 1, 1);
            extrudedHeight = 200000.0;
            geometryHeight = 100000.0;
            instance = new GeometryInstance({
                geometry : new ExtentGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    extent : extent,
                    height : geometryHeight,
                    extrudedHeight : extrudedHeight
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

        it('async', function() {
            renderAsync(instance);
        });

        it('renders bottom', function() {
            var afterView = function(frameState, primitive) {
                var transform = Transforms.eastNorthUpToFixedFrame(primitive._boundingSphere.center);
                frameState.camera.controller.rotateDown(CesiumMath.PI, transform);
            };
            render3D(instance, afterView);
        });

        it('renders north wall', function() {
            var afterView = function(frameState, primitive) {
                var transform = Transforms.eastNorthUpToFixedFrame(primitive._boundingSphere.center);
                frameState.camera.controller.rotateDown(-CesiumMath.PI_OVER_TWO, transform);
            };
            render3D(instance, afterView);
        });

        it('renders south wall', function() {
            var afterView = function(frameState, primitive) {
                var transform = Transforms.eastNorthUpToFixedFrame(primitive._boundingSphere.center);
                frameState.camera.controller.rotateDown(CesiumMath.PI_OVER_TWO, transform);
            };
            render3D(instance, afterView);
        });

        it('renders west wall', function() {
            var afterView = function(frameState, primitive) {
                var transform = Transforms.eastNorthUpToFixedFrame(primitive._boundingSphere.center);
                frameState.camera.controller.rotateRight(-CesiumMath.PI_OVER_TWO, transform);
            };
            render3D(instance, afterView);
        });

        it('renders east wall', function() {
            var afterView = function(frameState, primitive) {
                var transform = Transforms.eastNorthUpToFixedFrame(primitive._boundingSphere.center);
                frameState.camera.controller.rotateRight(CesiumMath.PI_OVER_TWO, transform);
            };
            render3D(instance, afterView);
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

        it('async', function() {
            renderAsync(instance);
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


    describe('Extruded PolygonGeometry', function() {
        var instance;
        var extrudedHeight;
        var geometryHeight;

        beforeAll(function() {
            extrudedHeight = 200000.0;
            geometryHeight = 100000.0;

            instance = new GeometryInstance({
                geometry : PolygonGeometry.fromPositions({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    positions : ellipsoid.cartographicArrayToCartesianArray([
                        Cartographic.fromDegrees(-1.0, -1.0),
                        Cartographic.fromDegrees(1.0, -1.0),
                        Cartographic.fromDegrees(1.0, 1.0),
                        Cartographic.fromDegrees(-1.0, 1.0)
                    ]),
                    height: geometryHeight,
                    extrudedHeight: extrudedHeight
                }),
                id : 'extrudedPolygon',
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

        it('async', function() {
            renderAsync(instance);
        });

        it('renders bottom', function() {
            var afterView = function(frameState, primitive) {
                var height = (extrudedHeight - geometryHeight) * 0.5;
                var transform = Matrix4.multiplyByTranslation(
                        Transforms.eastNorthUpToFixedFrame(primitive._boundingSphere.center),
                        new Cartesian3(0.0, 0.0, height));
                frameState.camera.controller.rotateDown(CesiumMath.PI, transform);
            };
            render3D(instance, afterView);
        });

        it('renders wall 1', function() {
            var afterView = function(frameState, primitive) {
                var transform = Transforms.eastNorthUpToFixedFrame(primitive._boundingSphere.center);
                frameState.camera.controller.rotateUp(CesiumMath.PI_OVER_TWO, transform);
            };
            render3D(instance, afterView);
        });

        it('renders wall 2', function() {
            var afterView = function(frameState, primitive) {
                var transform = Transforms.eastNorthUpToFixedFrame(primitive._boundingSphere.center);
                frameState.camera.controller.rotateDown(-CesiumMath.PI_OVER_TWO, transform);
            };
            render3D(instance, afterView);
        });

        it('renders wall 3', function() {
            var afterView = function(frameState, primitive) {
                var transform = Transforms.eastNorthUpToFixedFrame(primitive._boundingSphere.center);
                frameState.camera.controller.rotateRight(-CesiumMath.PI_OVER_TWO, transform);
            };
            render3D(instance, afterView);
        });

        it('renders wall 4', function() {
            var afterView = function(frameState, primitive) {
                var transform = Transforms.eastNorthUpToFixedFrame(primitive._boundingSphere.center);
                frameState.camera.controller.rotateRight(CesiumMath.PI_OVER_TWO, transform);
            };
            render3D(instance, afterView);
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

            afterView3D = function(frameState, primitive) {
                var transform = Transforms.eastNorthUpToFixedFrame(primitive._boundingSphere.center);
                frameState.camera.controller.rotateDown(-CesiumMath.PI_OVER_TWO, transform);
                frameState.camera.controller.zoomIn(primitive._boundingSphere.radius * 0.99);
            };

            afterViewCV = function(frameState, primitive) {
                var translation = Cartesian3.clone(frameState.camera.position);
                translation.z = 0.0;
                var transform = Matrix4.fromTranslation(translation);
                frameState.camera.controller.rotateDown(-CesiumMath.PI_OVER_TWO, transform);
                frameState.camera.controller.zoomIn(primitive._boundingSphere.radius * 1.85);
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

        it('async', function() {
            renderAsync(instance, afterView3D);
        });
    }, 'WebGL');

    describe('CorridorGeometry', function() {
        var instance;
        var positions;
        var width;
        beforeAll(function() {
            positions = ellipsoid.cartographicArrayToCartesianArray([
                Cartographic.fromDegrees(0.0, -1.0),
                Cartographic.fromDegrees(0.0, 1.0)
            ]);
            width = 100000;
            instance = new GeometryInstance({
                geometry : new CorridorGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    positions: positions,
                    width: width,
                    cornerType: CornerType.MITERED
                }),
                id : 'corridor',
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

        it('async', function() {
            renderAsync(instance);
        });

        it('at height', function() {
            var atHeight = new GeometryInstance({
                geometry : new CorridorGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    positions: positions,
                    width: width,
                    cornerType: CornerType.MITERED,
                    height: 100000
                }),
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
            render3D(atHeight);
        });
    }, 'WebGL');

    describe('Extruded CorridorGeometry', function() {
        var instance;
        var extrudedHeight;
        var geometryHeight;
        var width = 100000;
        var positions;
        beforeAll(function() {
            positions = ellipsoid.cartographicArrayToCartesianArray([
                 Cartographic.fromDegrees(0.0, -1.0),
                 Cartographic.fromDegrees(0.0, 1.0)
             ]);
            extrudedHeight = 200000.0;
            geometryHeight = 100000.0;
            instance = new GeometryInstance({
                geometry : new CorridorGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    positions: positions,
                    width: width,
                    cornerType: CornerType.MITERED,
                    height: geometryHeight,
                    extrudedHeight: extrudedHeight
                }),
                id : 'extrudedCorridor',
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

        it('async', function() {
            renderAsync(instance);
        });

        it('renders bottom', function() {
            var afterView = function(frameState, primitive) {
                var height = (extrudedHeight - geometryHeight) * 0.5;
                var transform = Matrix4.multiplyByTranslation(
                        Transforms.eastNorthUpToFixedFrame(primitive._boundingSphere.center),
                        new Cartesian3(0.0, 0.0, height));
                frameState.camera.controller.rotateDown(CesiumMath.PI, transform);
            };
            render3D(instance, afterView);
        });

        it('renders north wall', function() {
            var afterView = function(frameState, primitive) {
                var transform = Transforms.eastNorthUpToFixedFrame(primitive._boundingSphere.center);
                frameState.camera.controller.rotateDown(-CesiumMath.PI_OVER_TWO, transform);
            };
            render3D(instance, afterView);
        });

        it('renders south wall', function() {
            var afterView = function(frameState, primitive) {
                var transform = Transforms.eastNorthUpToFixedFrame(primitive._boundingSphere.center);
                frameState.camera.controller.rotateDown(CesiumMath.PI_OVER_TWO, transform);
            };
            render3D(instance, afterView);
        });

        it('renders west wall', function() {
            var afterView = function(frameState, primitive) {
                var transform = Transforms.eastNorthUpToFixedFrame(primitive._boundingSphere.center);
                frameState.camera.controller.rotateRight(-CesiumMath.PI_OVER_TWO, transform);
            };
            render3D(instance, afterView);
        });

        it('renders east wall', function() {
            var afterView = function(frameState, primitive) {
                var transform = Transforms.eastNorthUpToFixedFrame(primitive._boundingSphere.center);
                frameState.camera.controller.rotateRight(CesiumMath.PI_OVER_TWO, transform);
            };
            render3D(instance, afterView);
        });
    }, 'WebGL');

    describe('PolylineVolumeGeometry', function() {
        var instance;
        var geometryHeight;
        var positions;
        var shape;
        beforeAll(function() {
            positions = ellipsoid.cartographicArrayToCartesianArray([
                 Cartographic.fromDegrees(0.0, -1.0),
                 Cartographic.fromDegrees(0.0, 1.0)
             ]);
            shape = [new Cartesian2(-100000, -100000), new Cartesian2(100000, -100000), new Cartesian2(100000, 100000), new Cartesian2(-100000, 100000)];
            geometryHeight = 150000.0;
            instance = new GeometryInstance({
                geometry : new PolylineVolumeGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    polylinePositions: positions,
                    shapePositions: shape,
                    cornerType: CornerType.MITERED,
                    height: geometryHeight
                }),
                id : 'polylineVolume',
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

        it('async', function() {
            renderAsync(instance);
        });

        it('renders bottom', function() {
            var afterView = function(frameState, primitive) {
                var height = geometryHeight * 0.5;
                var transform = Matrix4.multiplyByTranslation(
                        Transforms.eastNorthUpToFixedFrame(primitive._boundingSphere.center),
                        new Cartesian3(0.0, 0.0, height));
                frameState.camera.controller.rotateDown(CesiumMath.PI, transform);
            };
            render3D(instance, afterView);
        });

        it('renders north wall', function() {
            var afterView = function(frameState, primitive) {
                var transform = Transforms.eastNorthUpToFixedFrame(primitive._boundingSphere.center);
                frameState.camera.controller.rotateDown(-CesiumMath.PI_OVER_TWO, transform);
            };
            render3D(instance, afterView);
        });

        it('renders south wall', function() {
            var afterView = function(frameState, primitive) {
                var transform = Transforms.eastNorthUpToFixedFrame(primitive._boundingSphere.center);
                frameState.camera.controller.rotateDown(CesiumMath.PI_OVER_TWO, transform);
            };
            render3D(instance, afterView);
        });

        it('renders west wall', function() {
            var afterView = function(frameState, primitive) {
                var transform = Transforms.eastNorthUpToFixedFrame(primitive._boundingSphere.center);
                frameState.camera.controller.rotateRight(-CesiumMath.PI_OVER_TWO, transform);
            };
            render3D(instance, afterView);
        });

        it('renders east wall', function() {
            var afterView = function(frameState, primitive) {
                var transform = Transforms.eastNorthUpToFixedFrame(primitive._boundingSphere.center);
                frameState.camera.controller.rotateRight(CesiumMath.PI_OVER_TWO, transform);
            };
            render3D(instance, afterView);
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

        it('async', function() {
            renderAsync(instance);
        });

        it('per segment colors', function() {
            instance = new GeometryInstance({
                geometry : new SimplePolylineGeometry({
                    positions : ellipsoid.cartographicArrayToCartesianArray([
                        Cartographic.fromDegrees(0.0, 0.0),
                        Cartographic.fromDegrees(5.0, 0.0)
                    ]),
                    colors : [new Color(1.0, 0.0, 0.0, 1.0), new Color(0.0, 1.0, 0.0, 1.0)]
                }),
                id : 'polyline'
            });
            render3D(instance);
        });

        it('per vertex colors', function() {
            instance = new GeometryInstance({
                geometry : new SimplePolylineGeometry({
                    positions : ellipsoid.cartographicArrayToCartesianArray([
                        Cartographic.fromDegrees(0.0, 0.0),
                        Cartographic.fromDegrees(5.0, 0.0)
                    ]),
                    colors : [new Color(1.0, 0.0, 0.0, 1.0), new Color(0.0, 1.0, 0.0, 1.0)],
                    colorsPerVertex : true
                }),
                id : 'polyline'
            });
            render3D(instance);
        });
    }, 'WebGL');

    describe('PolylineGeometry', function() {
        var instance;
        var appearance;

        beforeAll(function() {
            instance = new GeometryInstance({
                geometry : new PolylineGeometry({
                    positions : ellipsoid.cartographicArrayToCartesianArray([
                        Cartographic.fromDegrees(0.0, 0.0),
                        Cartographic.fromDegrees(5.0, 0.0)
                    ]),
                    width : 20.0
                }),
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 1.0, 1.0)
                },
                id : 'polyline'
            });

            appearance = new PolylineColorAppearance({
                translucent : false
            });
        });

        it('3D', function() {
            render3D(instance, undefined, appearance);
        });

        it('Columbus view', function() {
            renderCV(instance, undefined, appearance);
        });

        it('2D', function() {
            render2D(instance, appearance);
        });

        it('pick', function() {
            pickGeometry(instance, undefined, appearance);
        });

        it('async', function() {
            renderAsync(instance, undefined, appearance);
        });

        it('per segment colors', function() {
            instance = new GeometryInstance({
                geometry : new PolylineGeometry({
                    positions : ellipsoid.cartographicArrayToCartesianArray([
                        Cartographic.fromDegrees(0.0, 0.0),
                        Cartographic.fromDegrees(5.0, 0.0)
                    ]),
                    width : 20.0,
                    colors : [new Color(1.0, 0.0, 0.0, 1.0), new Color(0.0, 1.0, 0.0, 1.0)]
                }),
                id : 'polyline'
            });
            render3D(instance, undefined, appearance);
        });

        it('per vertex colors', function() {
            instance = new GeometryInstance({
                geometry : new PolylineGeometry({
                    positions : ellipsoid.cartographicArrayToCartesianArray([
                        Cartographic.fromDegrees(0.0, 0.0),
                        Cartographic.fromDegrees(5.0, 0.0)
                    ]),
                    width : 20.0,
                    colors : [new Color(1.0, 0.0, 0.0, 1.0), new Color(0.0, 1.0, 0.0, 1.0)],
                    colorsPerVertex : true
                }),
                id : 'polyline'
            });
            render3D(instance, undefined, appearance);
        });
    }, 'WebGL');

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
        }, 'WebGL');

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
        }, 'WebGL');
    });

}, 'WebGL');
