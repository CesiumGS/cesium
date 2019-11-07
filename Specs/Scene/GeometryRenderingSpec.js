import { ArcType } from '../../Source/Cesium.js';
import { BoundingSphere } from '../../Source/Cesium.js';
import { BoxGeometry } from '../../Source/Cesium.js';
import { Cartesian2 } from '../../Source/Cesium.js';
import { Cartesian3 } from '../../Source/Cesium.js';
import { CircleGeometry } from '../../Source/Cesium.js';
import { Color } from '../../Source/Cesium.js';
import { ColorGeometryInstanceAttribute } from '../../Source/Cesium.js';
import { ComponentDatatype } from '../../Source/Cesium.js';
import { CoplanarPolygonGeometry } from '../../Source/Cesium.js';
import { CornerType } from '../../Source/Cesium.js';
import { CorridorGeometry } from '../../Source/Cesium.js';
import { CylinderGeometry } from '../../Source/Cesium.js';
import { defined } from '../../Source/Cesium.js';
import { EllipseGeometry } from '../../Source/Cesium.js';
import { Ellipsoid } from '../../Source/Cesium.js';
import { EllipsoidGeometry } from '../../Source/Cesium.js';
import { Geometry } from '../../Source/Cesium.js';
import { GeometryAttribute } from '../../Source/Cesium.js';
import { GeometryInstance } from '../../Source/Cesium.js';
import { Math as CesiumMath } from '../../Source/Cesium.js';
import { Matrix4 } from '../../Source/Cesium.js';
import { PerspectiveFrustum } from '../../Source/Cesium.js';
import { PlaneGeometry } from '../../Source/Cesium.js';
import { PolygonGeometry } from '../../Source/Cesium.js';
import { PolylineGeometry } from '../../Source/Cesium.js';
import { PolylineVolumeGeometry } from '../../Source/Cesium.js';
import { PrimitiveType } from '../../Source/Cesium.js';
import { Rectangle } from '../../Source/Cesium.js';
import { RectangleGeometry } from '../../Source/Cesium.js';
import { SimplePolylineGeometry } from '../../Source/Cesium.js';
import { SphereGeometry } from '../../Source/Cesium.js';
import { Transforms } from '../../Source/Cesium.js';
import { WallGeometry } from '../../Source/Cesium.js';
import { EllipsoidSurfaceAppearance } from '../../Source/Cesium.js';
import { Material } from '../../Source/Cesium.js';
import { PerInstanceColorAppearance } from '../../Source/Cesium.js';
import { PolylineColorAppearance } from '../../Source/Cesium.js';
import { Primitive } from '../../Source/Cesium.js';
import { SceneMode } from '../../Source/Cesium.js';
import createScene from '../createScene.js';
import pollToPromise from '../pollToPromise.js';

describe('Scene/GeometryRenderingSpec', function() {

    var scene;
    var ellipsoid;
    var primitive;
    var geometry;

    beforeAll(function() {
        scene = createScene();
        scene.frameState.scene3DOnly = false;
        scene.primitives.destroyPrimitives = false;

        ellipsoid = Ellipsoid.WGS84;
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        scene.morphTo3D(0.0);

        var camera = scene.camera;
        camera.frustum = new PerspectiveFrustum();
        camera.frustum.aspectRatio = scene.drawingBufferWidth / scene.drawingBufferHeight;
        camera.frustum.fov = CesiumMath.toRadians(60.0);
    });

    afterEach(function() {
        scene.primitives.removeAll();
        primitive = primitive && !primitive.isDestroyed() && primitive.destroy();
    });

    function render3D(instance, afterView, appearance) {
        if (!defined(appearance)) {
            appearance = new PerInstanceColorAppearance({
                flat : true
            });
        }

        primitive = new Primitive({
            geometryInstances : instance,
            appearance : appearance,
            asynchronous : false
        });

        scene.mode = SceneMode.SCENE3D;
        scene.morphTime = SceneMode.getMorphTime(scene.mode);
        scene.camera.update(scene.mode);
        scene.camera.viewBoundingSphere(geometry.boundingSphereWC);

        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(primitive);
        if (typeof afterView === 'function') {
            afterView();
        }

        expect(scene).notToRender([0, 0, 0, 255]);
    }

    function renderCV(instance, afterView, appearance) {
        if (!defined(appearance)) {
            appearance = new PerInstanceColorAppearance({
                flat : true
            });
        }

        primitive = new Primitive({
            geometryInstances : instance,
            appearance : appearance,
            asynchronous : false
        });

        scene.mode = SceneMode.COLUMBUS_VIEW;
        scene.morphTime = SceneMode.getMorphTime(scene.mode);
        scene.camera.update(scene.mode);
        scene.camera.viewBoundingSphere(geometry.boundingSphereWC);

        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(primitive);
        if (typeof afterView === 'function') {
            afterView();
        }
        expect(scene).notToRender([0, 0, 0, 255]);
    }

    function render2D(instance, appearance) {
        if (!defined(appearance)) {
            appearance = new PerInstanceColorAppearance({
                flat : true
            });
        }

        primitive = new Primitive({
            geometryInstances : instance,
            appearance : appearance,
            asynchronous : false
        });

        scene.mode = SceneMode.SCENE2D;
        scene.morphTime = SceneMode.getMorphTime(scene.mode);
        scene.camera.update(scene.mode);
        scene.camera.viewBoundingSphere(geometry.boundingSphereWC);

        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(primitive);
        expect(scene).notToRender([0, 0, 0, 255]);
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

        scene.mode = SceneMode.SCENE3D;
        scene.morphTime = SceneMode.getMorphTime(scene.mode);
        scene.camera.update(scene.mode);
        scene.camera.viewBoundingSphere(geometry.boundingSphereWC);

        scene.primitives.add(primitive);
        if (typeof afterView === 'function') {
            afterView();
        }

        expect(scene).toPickAndCall(function(result) {
            expect(result.primitive).toEqual(primitive);
            expect(result.id).toEqual(instance.id);
        });
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

        scene.mode = SceneMode.SCENE3D;
        scene.morphTime = SceneMode.getMorphTime(scene.mode);
        scene.camera.update(scene.mode);
        scene.camera.viewBoundingSphere(geometry.boundingSphereWC);

        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(primitive);
        if (typeof afterView === 'function') {
            afterView();
        }
        primitive.update(scene.frameState);

        return pollToPromise(function() {
            scene.renderForSpecs();
            return primitive.ready;
        }).then(function() {
            expect(scene).notToRender([0, 0, 0, 255]);
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
                    Cartesian3.fromDegrees(-75.59777, 40.03883)), new Cartesian3(0.0, 0.0, 100000.0), new Matrix4()),
                id : 'box',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
            geometry = BoxGeometry.createGeometry(instance.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
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
            return renderAsync(instance);
        });
    }, 'WebGL');

    describe('PlaneGeometry', function() {
        var instance;
        beforeAll(function() {
            instance = new GeometryInstance({
                geometry : new PlaneGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT
                }),
                modelMatrix : Matrix4.multiplyByTranslation(Transforms.eastNorthUpToFixedFrame(
                    Cartesian3.fromDegrees(-75.59777, 40.03883)), new Cartesian3(0.0, 0.0, 100000.0), new Matrix4()),
                id : 'plane',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
            geometry = PlaneGeometry.createGeometry(instance.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
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
            return renderAsync(instance);
        });
    }, 'WebGL');

    describe('CircleGeometry', function() {
        var instance;
        beforeAll(function() {
            instance = new GeometryInstance({
                geometry : new CircleGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    center : Cartesian3.fromDegrees(-100, 20),
                    radius : 1000000.0
                }),
                id : 'circle',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
            geometry = CircleGeometry.createGeometry(instance.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
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
            return renderAsync(instance);
        });
    }, 'WebGL');

    describe('CoplanarPolygonGeometry', function() {
        var instance;
        beforeAll(function() {
            instance = new GeometryInstance({
                geometry : CoplanarPolygonGeometry.fromPositions({
                    positions : Cartesian3.fromDegreesArrayHeights([
                        71.0, -10.0, 0.0,
                        70.0, 0.0, 20000.0,
                        69.0, 0.0, 20000.0,
                        68.0, -10.0, 0.0
                    ]),
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT
                }),
                id: 'coplanar polygon',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(Math.random(), Math.random(), Math.random(), 0.5)
                }
            });
            geometry = CoplanarPolygonGeometry.createGeometry(instance.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
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
            return renderAsync(instance);
        });
    });

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
                        Cartesian3.fromDegrees(-90.0, 45.0)), new Cartesian3(0.0, 0.0, 500000.0), new Matrix4()), 90000.0, new Matrix4()),
                attributes : {
                    color : new ColorGeometryInstanceAttribute(Math.random(), Math.random(), Math.random(), 0.5)
                }
            });
            geometry = CylinderGeometry.createGeometry(instance.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
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
            return renderAsync(instance);
        });
    }, 'WebGL');

    describe('EllipseGeometry', function() {
        var instance;
        beforeAll(function() {
            instance = new GeometryInstance({
                geometry : new EllipseGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    center : Cartesian3.fromDegrees(-100, 20),
                    semiMinorAxis : 1000000.0,
                    semiMajorAxis : 1000000.0
                }),
                id : 'ellipse',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
            geometry = EllipseGeometry.createGeometry(instance.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
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
            return renderAsync(instance);
        });

        it('rotated', function() {
            var rotated = new GeometryInstance({
                geometry : new EllipseGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    center : Cartesian3.fromDegrees(-100, 20),
                    semiMinorAxis : 1000000.0,
                    semiMajorAxis : 1000000.0,
                    rotation : CesiumMath.PI_OVER_FOUR
                }),
                id : 'ellipse',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
            geometry = EllipseGeometry.createGeometry(rotated.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
            render3D(rotated);
        });

        it('at height', function() {
            var atHeight = new GeometryInstance({
                geometry : new EllipseGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    center : Cartesian3.fromDegrees(-100, 20),
                    semiMinorAxis : 1000000.0,
                    semiMajorAxis : 1000000.0,
                    height : 1000000.0
                }),
                id : 'ellipse',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
            geometry = EllipseGeometry.createGeometry(atHeight.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
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
                    center : Cartesian3.fromDegrees(-100, 20),
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
            geometry = EllipseGeometry.createGeometry(instance.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
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
            return renderAsync(instance);
        });

        it('renders bottom', function() {
            function afterView() {
                var height = (extrudedHeight - geometryHeight) * 0.5;
                var transform = Matrix4.multiplyByTranslation(
                        Transforms.eastNorthUpToFixedFrame(geometry.boundingSphere.center),
                        new Cartesian3(0.0, 0.0, height), new Matrix4());
                scene.camera.lookAtTransform(transform, new Cartesian3(0.0, 0.0, geometry.boundingSphere.radius));
                scene.camera.rotateDown(CesiumMath.PI);
            }
            render3D(instance, afterView);
        });

        it('renders wall', function() {
            function afterView() {
                var transform = Transforms.eastNorthUpToFixedFrame(geometry.boundingSphere.center);
                scene.camera.lookAtTransform(transform, new Cartesian3(0.0, 0.0, geometry.boundingSphere.radius));
                scene.camera.rotateDown(CesiumMath.PI_OVER_TWO);
            }
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
                    Cartesian3.fromDegrees(-100, 20)), new Cartesian3(0.0, 0.0, 1000000.0), new Matrix4()),
                id : 'ellipsoid',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
            geometry = EllipsoidGeometry.createGeometry(instance.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
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
            return renderAsync(instance);
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
                    Cartesian3.fromDegrees(-100, 20)), new Cartesian3(0.0, 0.0, 1000000.0), new Matrix4()),
                id : 'sphere',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
            geometry = SphereGeometry.createGeometry(instance.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
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
            return renderAsync(instance);
        });
    }, 'WebGL');

    describe('RectangleGeometry', function() {
        var instance;
        var rectangle;
        beforeAll(function() {
            rectangle = Rectangle.fromDegrees(0, 0, 1, 1);
            instance = new GeometryInstance({
                geometry : new RectangleGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    rectangle : rectangle
                }),
                id : 'rectangle',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
            geometry = RectangleGeometry.createGeometry(instance.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
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
            return renderAsync(instance);
        });

        it('rotated geometry', function() {
            var rotated = new GeometryInstance({
                geometry : new RectangleGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    rectangle : rectangle,
                    rotation : CesiumMath.PI_OVER_FOUR
                }),
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
            geometry = RectangleGeometry.createGeometry(rotated.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
            render3D(rotated);
        });

        it('rotated texture', function() {
            var rotated = new GeometryInstance({
                geometry : new RectangleGeometry({
                    vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    rectangle : rectangle,
                    stRotation : CesiumMath.PI_OVER_TWO
                })
            });
            var appearance = new EllipsoidSurfaceAppearance({
                material : Material.fromType('Stripe')
            });
            geometry = RectangleGeometry.createGeometry(rotated.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
            render3D(rotated, undefined, appearance);
        });

        it('at height', function() {
            var atHeight = new GeometryInstance({
                geometry : new RectangleGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    rectangle : rectangle,
                    height : 100000.0
                }),
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
            geometry = RectangleGeometry.createGeometry(atHeight.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
            render3D(atHeight);
        });
    }, 'WebGL');

    describe('Extruded RectangleGeometry', function() {
        var instance;
        var rectangle;
        var extrudedHeight;
        var geometryHeight;
        beforeAll(function() {
            rectangle = Rectangle.fromDegrees(-1, -1, 1, 1);
            extrudedHeight = 200000.0;
            geometryHeight = 100000.0;
            instance = new GeometryInstance({
                geometry : new RectangleGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    rectangle : rectangle,
                    height : geometryHeight,
                    extrudedHeight : extrudedHeight
                }),
                id : 'rectangle',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
            geometry = RectangleGeometry.createGeometry(instance.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
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
            return renderAsync(instance);
        });

        it('renders bottom', function() {
            function afterView() {
                var transform = Transforms.eastNorthUpToFixedFrame(geometry.boundingSphereWC.center);
                scene.camera.lookAtTransform(transform, new Cartesian3(0.0, 0.0, geometry.boundingSphereWC.radius));
                scene.camera.rotateDown(CesiumMath.PI);
            }
            render3D(instance, afterView);
        });

        it('renders north wall', function() {
            function afterView() {
                var transform = Transforms.eastNorthUpToFixedFrame(geometry.boundingSphereWC.center);
                scene.camera.lookAtTransform(transform, new Cartesian3(0.0, 0.0, geometry.boundingSphereWC.radius));
                scene.camera.rotateDown(-CesiumMath.PI_OVER_TWO);
            }
            render3D(instance, afterView);
        });

        it('renders south wall', function() {
            function afterView() {
                var transform = Transforms.eastNorthUpToFixedFrame(geometry.boundingSphereWC.center);
                scene.camera.lookAtTransform(transform, new Cartesian3(0.0, 0.0, geometry.boundingSphereWC.radius));
                scene.camera.rotateDown(CesiumMath.PI_OVER_TWO);
            }
            render3D(instance, afterView);
        });

        it('renders west wall', function() {
            function afterView() {
                var transform = Transforms.eastNorthUpToFixedFrame(geometry.boundingSphereWC.center);
                scene.camera.lookAtTransform(transform, new Cartesian3(0.0, 0.0, geometry.boundingSphereWC.radius));
                scene.camera.rotateRight(-CesiumMath.PI_OVER_TWO);
            }
            render3D(instance, afterView);
        });

        it('renders east wall', function() {
            function afterView() {
                var transform = Transforms.eastNorthUpToFixedFrame(geometry.boundingSphereWC.center);
                scene.camera.lookAtTransform(transform, new Cartesian3(0.0, 0.0, geometry.boundingSphereWC.radius));
                scene.camera.rotateRight(CesiumMath.PI_OVER_TWO);
            }
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
                    positions : Cartesian3.fromDegreesArray([
                        0.0, 45.0,
                        10.0, 45.0,
                        10.0, 55.0,
                        0.0, 55.0
                    ])
                }),
                id : 'polygon',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
            geometry = PolygonGeometry.createGeometry(instance.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
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
            return renderAsync(instance);
        });

        it('at height', function() {
            var atHeight = new GeometryInstance({
                geometry : PolygonGeometry.fromPositions({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    positions : Cartesian3.fromDegreesArray([
                        0.0, 45.0,
                        10.0, 45.0,
                        10.0, 55.0,
                        0.0, 55.0
                    ]),
                    height : 3000000.0
                }),
                id : 'polygon',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
            geometry = PolygonGeometry.createGeometry(atHeight.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, atHeight.modelMatrix);
            render3D(atHeight);
        });

        it('hierarchy', function() {
            var hierarchy = new GeometryInstance({
                geometry : new PolygonGeometry({
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
                    polygonHierarchy : {
                        positions : Cartesian3.fromDegreesArray([
                            -109.0, 30.0,
                            -95.0, 30.0,
                            -95.0, 40.0,
                            -109.0, 40.0
                        ]),
                        holes : [{
                            positions : Cartesian3.fromDegreesArray([
                                -107.0, 31.0,
                                -107.0, 39.0,
                                -97.0, 39.0,
                                -97.0, 31.0
                            ]),
                            holes : [{
                                positions : Cartesian3.fromDegreesArray([
                                    -106.5, 31.5,
                                    -97.5, 31.5,
                                    -97.5, 38.5,
                                    -106.5, 38.5
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
            geometry = PolygonGeometry.createGeometry(hierarchy.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, hierarchy.modelMatrix);
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
                    positions : Cartesian3.fromDegreesArray([
                        -1.0, -1.0,
                        1.0, -1.0,
                        1.0, 1.0,
                        -1.0, 1.0
                    ]),
                    height: geometryHeight,
                    extrudedHeight: extrudedHeight
                }),
                id : 'extrudedPolygon',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
            geometry = PolygonGeometry.createGeometry(instance.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
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
            return renderAsync(instance);
        });

        it('renders bottom', function() {
            function afterView() {
                var height = (extrudedHeight - geometryHeight) * 0.5;
                var transform = Matrix4.multiplyByTranslation(
                        Transforms.eastNorthUpToFixedFrame(geometry.boundingSphere.center),
                        new Cartesian3(0.0, 0.0, height), new Matrix4());
                scene.camera.lookAtTransform(transform, new Cartesian3(0.0, 0.0, geometry.boundingSphere.radius));
                scene.camera.rotateDown(CesiumMath.PI);
            }
            render3D(instance, afterView);
        });

        it('renders wall 1', function() {
            function afterView() {
                var transform = Transforms.eastNorthUpToFixedFrame(geometry.boundingSphere.center);
                scene.camera.lookAtTransform(transform, new Cartesian3(0.0, 0.0, geometry.boundingSphere.radius));
                scene.camera.rotateUp(CesiumMath.PI_OVER_TWO);
            }
            render3D(instance, afterView);
        });

        it('renders wall 2', function() {
            function afterView() {
                var transform = Transforms.eastNorthUpToFixedFrame(geometry.boundingSphere.center);
                scene.camera.lookAtTransform(transform, new Cartesian3(0.0, 0.0, geometry.boundingSphere.radius));
                scene.camera.rotateDown(-CesiumMath.PI_OVER_TWO);
            }
            render3D(instance, afterView);
        });

        it('renders wall 3', function() {
            function afterView() {
                var transform = Transforms.eastNorthUpToFixedFrame(geometry.boundingSphere.center);
                scene.camera.lookAtTransform(transform, new Cartesian3(0.0, 0.0, geometry.boundingSphere.radius));
                scene.camera.rotateRight(-CesiumMath.PI_OVER_TWO);
            }
            render3D(instance, afterView);
        });

        it('renders wall 4', function() {
            function afterView() {
                var transform = Transforms.eastNorthUpToFixedFrame(geometry.boundingSphere.center);
                scene.camera.lookAtTransform(transform, new Cartesian3(0.0, 0.0, geometry.boundingSphere.radius));
                scene.camera.rotateRight(CesiumMath.PI_OVER_TWO);
            }
            render3D(instance, afterView);
        });

        it('renders with correct winding order in southern hemisphere', function() {
            var instance =  new GeometryInstance({
                geometry : PolygonGeometry.fromPositions({
                    vertexFormat : PerInstanceColorAppearance.VERTEX_FORMAT,
                    ellipsoid : ellipsoid,
                    positions : Cartesian3.fromDegreesArrayHeights([
                        -108.0, -25.0, 500000,
                        -100.0, -25.0, 500000,
                        -100.0, -30.0, 500000,
                        -108.0, -30.0, 500000
                    ]),
                    perPositionHeight : true,
                    extrudedHeight: 0
                }),
                id : 'extrudedPolygon',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
            geometry = PolygonGeometry.createGeometry(instance.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);

            function afterView() {
                var transform = Transforms.eastNorthUpToFixedFrame(geometry.boundingSphereWC.center);
                scene.camera.lookAtTransform(transform, new Cartesian3(0.0, 0.0, geometry.boundingSphereWC.radius));
                scene.camera.rotateDown(-CesiumMath.PI_OVER_TWO);
                scene.camera.moveForward(geometry.boundingSphereWC.radius * 0.75);
            }
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
                    positions : Cartesian3.fromDegreesArrayHeights([
                        0.0, 0.0, height,
                        0.01, 0.0, height
                    ])
                }),
                id : 'wall',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            });
            geometry = WallGeometry.createGeometry(instance.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);

            afterView3D = function() {
                var transform = Transforms.eastNorthUpToFixedFrame(geometry.boundingSphereWC.center);
                scene.camera.lookAtTransform(transform, new Cartesian3(0.0, 0.0, geometry.boundingSphereWC.radius));
                scene.camera.rotateDown(-CesiumMath.PI_OVER_TWO);
            };

            afterViewCV = function() {
                var transform = Transforms.eastNorthUpToFixedFrame(geometry.boundingSphereWC.center);
                Matrix4.clone(transform, scene.camera._transform);
                scene.camera.rotateDown(-CesiumMath.PI_OVER_TWO);
                scene.camera.zoomIn(geometry.boundingSphereWC.radius);
                Matrix4.clone(Matrix4.IDENTITY, scene.camera._transform);
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
            return renderAsync(instance, afterView3D);
        });
    }, 'WebGL');

    describe('CorridorGeometry', function() {
        var instance;
        var positions;
        var width;
        beforeAll(function() {
            positions = Cartesian3.fromDegreesArray([
                0.0, -1.0,
                0.0, 1.0
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
            geometry = CorridorGeometry.createGeometry(instance.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
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
            return renderAsync(instance);
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
            geometry = CorridorGeometry.createGeometry(atHeight.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, atHeight.modelMatrix);
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
            positions = Cartesian3.fromDegreesArray([
                 0.0, -1.0,
                 0.0, 1.0
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
            geometry = CorridorGeometry.createGeometry(instance.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
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
            return renderAsync(instance);
        });

        it('renders bottom', function() {
            function afterView() {
                var height = (extrudedHeight - geometryHeight) * 0.5;
                var transform = Matrix4.multiplyByTranslation(
                        Transforms.eastNorthUpToFixedFrame(geometry.boundingSphereWC.center),
                        new Cartesian3(0.0, 0.0, height), new Matrix4());
                scene.camera.lookAtTransform(transform, new Cartesian3(0.0, 0.0, geometry.boundingSphereWC.radius));
                scene.camera.rotateDown(CesiumMath.PI);
            }
            render3D(instance, afterView);
        });

        it('renders north wall', function() {
            function afterView() {
                var transform = Transforms.eastNorthUpToFixedFrame(geometry.boundingSphereWC.center);
                scene.camera.lookAtTransform(transform, new Cartesian3(0.0, 0.0, geometry.boundingSphereWC.radius));
                scene.camera.rotateDown(-CesiumMath.PI_OVER_TWO);
            }
            render3D(instance, afterView);
        });

        it('renders south wall', function() {
            function afterView() {
                var transform = Transforms.eastNorthUpToFixedFrame(geometry.boundingSphereWC.center);
                scene.camera.lookAtTransform(transform, new Cartesian3(0.0, 0.0, geometry.boundingSphereWC.radius));
                scene.camera.rotateDown(CesiumMath.PI_OVER_TWO);
            }
            render3D(instance, afterView);
        });

        it('renders west wall', function() {
            function afterView() {
                var transform = Transforms.eastNorthUpToFixedFrame(geometry.boundingSphereWC.center);
                scene.camera.lookAtTransform(transform, new Cartesian3(0.0, 0.0, geometry.boundingSphereWC.radius));
                scene.camera.rotateRight(-CesiumMath.PI_OVER_TWO);
            }
            render3D(instance, afterView);
        });

        it('renders east wall', function() {
            function afterView() {
                var transform = Transforms.eastNorthUpToFixedFrame(geometry.boundingSphereWC.center);
                scene.camera.lookAtTransform(transform, new Cartesian3(0.0, 0.0, geometry.boundingSphereWC.radius));
                scene.camera.rotateRight(CesiumMath.PI_OVER_TWO);
            }
            render3D(instance, afterView);
        });
    }, 'WebGL');

    describe('PolylineVolumeGeometry', function() {
        var instance;
        var geometryHeight;
        var positions;
        var shape;
        beforeAll(function() {
            positions = Cartesian3.fromDegreesArray([
                 0.0, -1.0,
                 0.0, 1.0
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
            geometry = PolylineVolumeGeometry.createGeometry(instance.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
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
            return renderAsync(instance);
        });

        it('renders bottom', function() {
            function afterView() {
                var height = geometryHeight * 0.5;
                var transform = Matrix4.multiplyByTranslation(
                        Transforms.eastNorthUpToFixedFrame(geometry.boundingSphereWC.center),
                        new Cartesian3(0.0, 0.0, height), new Matrix4());
                scene.camera.lookAtTransform(transform, new Cartesian3(0.0, 0.0, geometry.boundingSphereWC.radius));
                scene.camera.rotateDown(CesiumMath.PI);
            }
            render3D(instance, afterView);
        });

        it('renders north wall', function() {
            function afterView() {
                var transform = Transforms.eastNorthUpToFixedFrame(geometry.boundingSphereWC.center);
                scene.camera.lookAtTransform(transform, new Cartesian3(0.0, 0.0, geometry.boundingSphereWC.radius));
                scene.camera.rotateDown(-CesiumMath.PI_OVER_TWO);
            }
            render3D(instance, afterView);
        });

        it('renders south wall', function() {
            function afterView() {
                var transform = Transforms.eastNorthUpToFixedFrame(geometry.boundingSphereWC.center);
                scene.camera.lookAtTransform(transform, new Cartesian3(0.0, 0.0, geometry.boundingSphereWC.radius));
                scene.camera.rotateDown(CesiumMath.PI_OVER_TWO);
            }
            render3D(instance, afterView);
        });

        it('renders west wall', function() {
            function afterView() {
                var transform = Transforms.eastNorthUpToFixedFrame(geometry.boundingSphereWC.center);
                scene.camera.lookAtTransform(transform, new Cartesian3(0.0, 0.0, geometry.boundingSphereWC.radius));
                scene.camera.rotateRight(-CesiumMath.PI_OVER_TWO);
            }
            render3D(instance, afterView);
        });

        it('renders east wall', function() {
            function afterView() {
                var transform = Transforms.eastNorthUpToFixedFrame(geometry.boundingSphereWC.center);
                scene.camera.lookAtTransform(transform, new Cartesian3(0.0, 0.0, geometry.boundingSphereWC.radius));
                scene.camera.rotateRight(CesiumMath.PI_OVER_TWO);
            }
            render3D(instance, afterView);
        });
    }, 'WebGL');

    describe('SimplePolylineGeometry', function() {
        var instance;
        beforeAll(function() {
            instance = new GeometryInstance({
                geometry : new SimplePolylineGeometry({
                    positions : Cartesian3.fromDegreesArray([
                        0.0, 0.0,
                        5.0, 0.0
                    ])
                }),
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 1.0, 1.0)
                },
                id : 'simple polyline'
            });
            geometry = SimplePolylineGeometry.createGeometry(instance.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
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
            return renderAsync(instance);
        });

        it('per segment colors', function() {
            instance = new GeometryInstance({
                geometry : new SimplePolylineGeometry({
                    positions : Cartesian3.fromDegreesArray([
                        0.0, 0.0,
                        5.0, 0.0
                    ]),
                    colors : [new Color(1.0, 0.0, 0.0, 1.0), new Color(0.0, 1.0, 0.0, 1.0)]
                }),
                id : 'polyline'
            });
            geometry = SimplePolylineGeometry.createGeometry(instance.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
            render3D(instance);
        });

        it('per vertex colors', function() {
            instance = new GeometryInstance({
                geometry : new SimplePolylineGeometry({
                    positions : Cartesian3.fromDegreesArray([
                        0.0, 0.0,
                        5.0, 0.0
                    ]),
                    colors : [new Color(1.0, 0.0, 0.0, 1.0), new Color(0.0, 1.0, 0.0, 1.0)],
                    colorsPerVertex : true
                }),
                id : 'polyline'
            });
            geometry = SimplePolylineGeometry.createGeometry(instance.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
            render3D(instance);
        });
    }, 'WebGL');

    describe('PolylineGeometry', function() {
        var instance;
        var appearance;

        beforeAll(function() {
            instance = new GeometryInstance({
                geometry : new PolylineGeometry({
                    positions : Cartesian3.fromDegreesArray([
                        0.0, 0.0,
                        5.0, 0.0
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
            geometry = PolylineGeometry.createGeometry(instance.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
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
            return renderAsync(instance, undefined, appearance);
        });

        it('per segment colors', function() {
            instance = new GeometryInstance({
                geometry : new PolylineGeometry({
                    positions : Cartesian3.fromDegreesArray([
                        0.0, 0.0,
                        5.0, 0.0
                    ]),
                    width : 20.0,
                    colors : [new Color(1.0, 0.0, 0.0, 1.0), new Color(0.0, 1.0, 0.0, 1.0)],
                    arcType : ArcType.NONE
                }),
                id : 'polyline'
            });
            geometry = PolylineGeometry.createGeometry(instance.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
            render3D(instance, undefined, appearance);
        });

        it('per vertex colors', function() {
            instance = new GeometryInstance({
                geometry : new PolylineGeometry({
                    positions : Cartesian3.fromDegreesArray([
                        0.0, 0.0,
                        5.0, 0.0
                    ]),
                    width : 20.0,
                    colors : [new Color(1.0, 0.0, 0.0, 1.0), new Color(0.0, 1.0, 0.0, 1.0)],
                    colorsPerVertex : true,
                    arcType : ArcType.NONE
                }),
                id : 'polyline'
            });
            geometry = PolylineGeometry.createGeometry(instance.geometry);
            geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
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
                                    1000000.0, 0.0, 0.0,
                                    1000000.0, 1000000.0, 0.0,
                                    1000000.0, 0.0, 1000000.0,
                                    1000000.0, 1000000.0, 1000000.0
                                ])
                            })
                        },
                        indices : new Uint16Array([0, 1, 2, 2, 1, 3]),
                        primitiveType : PrimitiveType.TRIANGLES
                    }),
                    modelMatrix : Matrix4.multiplyByTranslation(Transforms.eastNorthUpToFixedFrame(
                        Cartesian3.fromDegrees(0,0)), new Cartesian3(0.0, 0.0, 10000.0), new Matrix4()),
                    id : 'customWithIndices',
                    attributes : {
                        color : new ColorGeometryInstanceAttribute(1.0, 1.0, 1.0, 1.0)
                    }
                });
                geometry = instance.geometry;
                geometry.boundingSphere = BoundingSphere.fromVertices(instance.geometry.attributes.position.values);
                geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
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
                                    1000000.0, 0.0, 0.0,
                                    1000000.0, 1000000.0, 0.0,
                                    1000000.0, 0.0, 1000000.0,
                                    1000000.0, 0.0, 1000000.0,
                                    1000000.0, 1000000.0, 0.0,
                                    1000000.0, 1000000.0, 1000000.0
                                ])
                            })
                        },
                        primitiveType : PrimitiveType.TRIANGLES
                    }),
                    modelMatrix : Matrix4.multiplyByTranslation(Transforms.eastNorthUpToFixedFrame(
                        Cartesian3.fromDegrees(0,0)), new Cartesian3(0.0, 0.0, 10000.0), new Matrix4()),
                    id : 'customWithoutIndices',
                    attributes : {
                        color : new ColorGeometryInstanceAttribute(1.0, 1.0, 1.0, 1.0)
                    }
                });
                geometry = instance.geometry;
                geometry.boundingSphere = BoundingSphere.fromVertices(instance.geometry.attributes.position.values);
                geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
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

        describe('with native arrays as attributes and indices', function() {
            var instance;
            beforeAll(function() {
                instance = new GeometryInstance({
                    geometry : new Geometry({
                        attributes : {
                            position : new GeometryAttribute({
                                componentDatatype : ComponentDatatype.DOUBLE,
                                componentsPerAttribute : 3,
                                values : [
                                    1000000.0, 0.0, 0.0,
                                    1000000.0, 1000000.0, 0.0,
                                    1000000.0, 0.0, 1000000.0,
                                    1000000.0, 1000000.0, 1000000.0
                                ]
                            })
                        },
                        indices : [0, 1, 2, 2, 1, 3],
                        primitiveType : PrimitiveType.TRIANGLES
                    }),
                    modelMatrix : Matrix4.multiplyByTranslation(Transforms.eastNorthUpToFixedFrame(
                        Cartesian3.fromDegrees(0,0)), new Cartesian3(0.0, 0.0, 10000.0), new Matrix4()),
                    id : 'customWithIndices',
                    attributes : {
                        color : new ColorGeometryInstanceAttribute(1.0, 1.0, 1.0, 1.0)
                    }
                });
                geometry = instance.geometry;
                geometry.boundingSphere = BoundingSphere.fromVertices(instance.geometry.attributes.position.values);
                geometry.boundingSphereWC = BoundingSphere.transform(geometry.boundingSphere, instance.modelMatrix);
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
