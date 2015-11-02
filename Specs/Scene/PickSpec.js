/*global defineSuite*/
defineSuite([
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Ellipsoid',
        'Core/FeatureDetection',
        'Core/GeometryInstance',
        'Core/Math',
        'Core/Matrix4',
        'Core/Rectangle',
        'Core/RectangleGeometry',
        'Core/ShowGeometryInstanceAttribute',
        'Scene/EllipsoidSurfaceAppearance',
        'Scene/OrthographicFrustum',
        'Scene/PerspectiveFrustum',
        'Scene/Primitive',
        'Scene/SceneMode',
        'Specs/createScene'
    ], 'Scene/Pick', function(
        Cartesian2,
        Cartesian3,
        Ellipsoid,
        FeatureDetection,
        GeometryInstance,
        CesiumMath,
        Matrix4,
        Rectangle,
        RectangleGeometry,
        ShowGeometryInstanceAttribute,
        EllipsoidSurfaceAppearance,
        OrthographicFrustum,
        PerspectiveFrustum,
        Primitive,
        SceneMode,
        createScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var scene;
    var primitives;
    var camera;

    beforeAll(function() {
        scene = createScene();
        primitives = scene.primitives;
        camera = scene.camera;
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        camera.lookAtTransform(Matrix4.IDENTITY);
        camera.position = new Cartesian3(1.03, 0.0, 0.0);
        camera.direction = new Cartesian3(-1.0, 0.0, 0.0);
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        camera.right = Cartesian3.clone(Cartesian3.UNIT_Y);

        camera.frustum = new PerspectiveFrustum();
        camera.frustum.near = 0.01;
        camera.frustum.far = 2.0;
        camera.frustum.fov = CesiumMath.toRadians(60.0);
        camera.frustum.aspectRatio = 1.0;

        scene.mode = SceneMode.SCENE3D;
        scene.morphTime = SceneMode.getMorphTime(scene.mode);
    });

    afterEach(function() {
        primitives.removeAll();
    });

    function createRectangle() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;

        var e = new Primitive({
            geometryInstances: new GeometryInstance({
                geometry: new RectangleGeometry({
                    rectangle: Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
                    vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                    ellipsoid: ellipsoid,
                    granularity: CesiumMath.toRadians(20.0)
                })
            }),
            appearance: new EllipsoidSurfaceAppearance({
                aboveGround: false
            }),
            asynchronous: false
        });

        primitives.add(e);

        return e;
    }

    it('does not pick undefined window positions', function() {
        expect(function() {
            scene.pick(undefined);
        }).toThrowDeveloperError();
    });

    it('picks a primitive', function() {
        if (FeatureDetection.isInternetExplorer()) {
            // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
            return;
        }

        var rectangle = createRectangle();
        var pickedObject = scene.pick(new Cartesian2(0, 0));
        expect(pickedObject.primitive).toEqual(rectangle);
    });

    it('does not pick primitives when show is false', function() {
        var rectangle = createRectangle();
        rectangle.show = false;

        var pickedObject = scene.pick(new Cartesian2(0, 0));
        expect(pickedObject).not.toBeDefined();
    });

    it('does not pick primitives when alpha is zero', function() {
        var rectangle = createRectangle();
        rectangle.appearance.material.uniforms.color.alpha = 0.0;

        var pickedObject = scene.pick(new Cartesian2(0, 0));
        expect(pickedObject).not.toBeDefined();
    });

    it('picks the top primitive', function() {
        createRectangle();
        var rectangle2 = createRectangle();
        rectangle2.height = 0.01;

        var pickedObject = scene.pick(new Cartesian2(0, 0));
        expect(pickedObject.primitive).toEqual(rectangle2);
    });

    it('does not drill pick undefined window positions', function() {
        expect(function() {
            scene.pick(undefined);
        }).toThrowDeveloperError();
    });

    it('drill picks multiple objects', function() {
        var rectangle1 = createRectangle();
        var rectangle2 = createRectangle();
        rectangle2.height = 0.01;

        var pickedObjects = scene.drillPick(new Cartesian2(0, 0));
        expect(pickedObjects.length).toEqual(2);
        expect(pickedObjects[0].primitive).toEqual(rectangle2);
        expect(pickedObjects[1].primitive).toEqual(rectangle1);
    });

    it('does not drill pick when show is false', function() {
        var rectangle1 = createRectangle();
        var rectangle2 = createRectangle();
        rectangle2.height = 0.01;
        rectangle2.show = false;

        var pickedObjects = scene.drillPick(new Cartesian2(0, 0));
        expect(pickedObjects.length).toEqual(1);
        expect(pickedObjects[0].primitive).toEqual(rectangle1);
    });

    it('does not drill pick when alpha is zero', function() {
        var rectangle1 = createRectangle();
        var rectangle2 = createRectangle();
        rectangle2.height = 0.01;
        rectangle2.appearance.material.uniforms.color.alpha = 0.0;

        var pickedObjects = scene.drillPick(new Cartesian2(0, 0));
        expect(pickedObjects.length).toEqual(1);
        expect(pickedObjects[0].primitive).toEqual(rectangle1);
    });

    it('can drill pick batched Primitives with show attribute', function() {
        var geometry = new RectangleGeometry({
            rectangle : Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
            ellipsoid : Ellipsoid.UNIT_SPHERE,
            granularity : CesiumMath.toRadians(20.0),
            vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT
        });

        var geometryWithHeight = new RectangleGeometry({
            rectangle : Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
            ellipsoid : Ellipsoid.UNIT_SPHERE,
            granularity : CesiumMath.toRadians(20.0),
            vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
            height : 0.01
        });

        var instance1 = new GeometryInstance({
            id : 1,
            geometry : geometry,
            attributes : {
                show : new ShowGeometryInstanceAttribute(true)
            }
        });

        var instance2 = new GeometryInstance({
            id : 2,
            geometry : geometry,
            attributes : {
                show : new ShowGeometryInstanceAttribute(false)
            }
        });

        var instance3 = new GeometryInstance({
            id : 3,
            geometry : geometryWithHeight,
            attributes : {
                show : new ShowGeometryInstanceAttribute(true)
            }
        });

        var primitive = primitives.add(new Primitive({
            geometryInstances : [instance1, instance2, instance3],
            asynchronous : false,
            appearance : new EllipsoidSurfaceAppearance()
        }));

        var pickedObjects = scene.drillPick(new Cartesian2(0, 0));
        expect(pickedObjects.length).toEqual(2);
        expect(pickedObjects[0].primitive).toEqual(primitive);
        expect(pickedObjects[0].id).toEqual(3);
        expect(pickedObjects[1].primitive).toEqual(primitive);
        expect(pickedObjects[1].id).toEqual(1);
    });

    it('can drill pick without ID', function() {
        var geometry = new RectangleGeometry({
            rectangle : Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
            ellipsoid : Ellipsoid.UNIT_SPHERE,
            granularity : CesiumMath.toRadians(20.0),
            vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT
        });

        var instance1 = new GeometryInstance({
            geometry : geometry,
            attributes : {
                show : new ShowGeometryInstanceAttribute(true)
            }
        });

        var instance2 = new GeometryInstance({
            geometry : geometry,
            attributes : {
                show : new ShowGeometryInstanceAttribute(true)
            }
        });

        var primitive = primitives.add(new Primitive({
            geometryInstances : [instance1, instance2],
            asynchronous : false,
            appearance : new EllipsoidSurfaceAppearance()
        }));

        var pickedObjects = scene.drillPick(new Cartesian2(0, 0));
        expect(pickedObjects.length).toEqual(1);
        expect(pickedObjects[0].primitive).toEqual(primitive);
    });

    it('can drill pick batched Primitives without show attribute', function() {
        var geometry = new RectangleGeometry({
            rectangle : Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
            ellipsoid : Ellipsoid.UNIT_SPHERE,
            granularity : CesiumMath.toRadians(20.0),
            vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT
        });

        var geometryWithHeight = new RectangleGeometry({
            rectangle : Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
            ellipsoid : Ellipsoid.UNIT_SPHERE,
            granularity : CesiumMath.toRadians(20.0),
            vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
            height : 0.01
        });

        var instance1 = new GeometryInstance({
            id : 1,
            geometry : geometry
        });

        var instance2 = new GeometryInstance({
            id : 2,
            geometry : geometry
        });

        var instance3 = new GeometryInstance({
            id : 3,
            geometry : geometryWithHeight
        });

        var primitive = primitives.add(new Primitive({
            geometryInstances : [instance1, instance2, instance3],
            asynchronous : false,
            appearance : new EllipsoidSurfaceAppearance()
        }));

        var pickedObjects = scene.drillPick(new Cartesian2(0, 0));
        expect(pickedObjects.length).toEqual(1);
        expect(pickedObjects[0].primitive).toEqual(primitive);
        expect(pickedObjects[0].id).toEqual(3);
    });

    it('stops drill picking when the limit is reached.', function() {
        var rectangle1 = createRectangle();
        var rectangle2 = createRectangle();
        var rectangle3 = createRectangle();
        var rectangle4 = createRectangle();
        rectangle2.height = 0.01;
        rectangle3.height = 0.02;
        rectangle4.height = 0.03;

        var pickedObjects = scene.drillPick(new Cartesian2(0, 0), 3);
        expect(pickedObjects.length).toEqual(3);
        expect(pickedObjects[0].primitive).toEqual(rectangle4);
        expect(pickedObjects[1].primitive).toEqual(rectangle3);
        expect(pickedObjects[2].primitive).toEqual(rectangle2);
    });

    it('picks in 2D', function() {
        var ellipsoid = scene.mapProjection.ellipsoid;
        var maxRadii = ellipsoid.maximumRadius;

        camera.position = new Cartesian3(0.0, 0.0, 2.0 * maxRadii);
        Cartesian3.clone(Cartesian3.UNIT_Z, camera.direction);
        Cartesian3.negate(camera.direction, camera.direction);
        Cartesian3.negate(Cartesian3.UNIT_X, camera.up);
        Cartesian3.clone(Cartesian3.UNIT_Y, camera.right);

        var frustum = new OrthographicFrustum();
        frustum.right = maxRadii * Math.PI;
        frustum.left = -frustum.right;
        frustum.top = frustum.right * (scene.drawingBufferHeight / scene.drawingBufferWidth);
        frustum.bottom = -frustum.top;
        frustum.near = 0.01 * maxRadii;
        frustum.far = 60.0 * maxRadii;
        camera.frustum = frustum;

        scene.mode = SceneMode.SCENE2D;
        scene.morphTime = SceneMode.getMorphTime(scene.mode);

        var rectangle = createRectangle();
        scene.initializeFrame();
        var pickedObject = scene.pick(new Cartesian2(0, 0));
        expect(pickedObject.primitive).toEqual(rectangle);
    });

    it('picks in 2D when rotated', function() {
        var ellipsoid = scene.mapProjection.ellipsoid;
        var maxRadii = ellipsoid.maximumRadius;

        camera.position = new Cartesian3(0.0, 0.0, 2.0 * maxRadii);
        Cartesian3.clone(Cartesian3.UNIT_Z, camera.direction);
        Cartesian3.negate(camera.direction, camera.direction);
        Cartesian3.negate(Cartesian3.UNIT_X, camera.up);
        Cartesian3.clone(Cartesian3.UNIT_Y, camera.right);

        var frustum = new OrthographicFrustum();
        frustum.right = maxRadii * Math.PI;
        frustum.left = -frustum.right;
        frustum.top = frustum.right * (scene.drawingBufferHeight / scene.drawingBufferWidth);
        frustum.bottom = -frustum.top;
        frustum.near = 0.01 * maxRadii;
        frustum.far = 60.0 * maxRadii;
        camera.frustum = frustum;

        scene.mode = SceneMode.SCENE2D;
        scene.morphTime = SceneMode.getMorphTime(scene.mode);

        var rectangle = createRectangle();
        scene.initializeFrame();
        var pickedObject = scene.pick(new Cartesian2(0.0, 0.0));
        expect(pickedObject.primitive).toEqual(rectangle);
    });
}, 'WebGL');
