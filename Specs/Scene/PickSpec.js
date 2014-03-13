/*global defineSuite*/
defineSuite([
         'Scene/ExtentPrimitive',
         'Specs/createScene',
         'Specs/destroyScene',
         'Specs/createCamera',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/Extent',
         'Core/Math',
         'Core/Matrix4',
         'Scene/OrthographicFrustum',
         'Scene/PerspectiveFrustum',
         'Scene/SceneMode'
     ], 'Scene/Pick', function(
         ExtentPrimitive,
         createScene,
         destroyScene,
         createCamera,
         Cartesian2,
         Cartesian3,
         Cartographic,
         Ellipsoid,
         Extent,
         CesiumMath,
         Matrix4,
         OrthographicFrustum,
         PerspectiveFrustum,
         SceneMode) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;
    var primitives;
    var camera;

    beforeAll(function() {
        scene = createScene();
        primitives = scene.primitives;
        camera = scene.camera;
    });

    afterAll(function() {
        destroyScene(scene);
    });

    beforeEach(function() {
        camera.position = new Cartesian3(1.03, 0.0, 0.0);
        camera.direction = new Cartesian3(-1.0, 0.0, 0.0);
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        camera.right = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.transform = Matrix4.clone(Matrix4.IDENTITY);

        camera.frustum = new PerspectiveFrustum();
        camera.frustum.near = 0.01;
        camera.frustum.far = 2.0;
        camera.frustum.fovy = CesiumMath.toRadians(60.0);
        camera.frustum.aspectRatio = 1.0;

        scene.mode = SceneMode.SCENE3D;
        scene.morphTime = scene.mode.morphTime;
    });

    afterEach(function() {
        primitives.removeAll();
    });

    function createExtent() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;

        var e = new ExtentPrimitive({
            ellipsoid : ellipsoid,
            granularity : CesiumMath.toRadians(20.0),
            extent : Extent.fromDegrees(-50.0, -50.0, 50.0, 50.0),
            asynchronous : false
        });

        primitives.add(e);

        return e;
    }

    it('pick (undefined window position)', function() {
        expect(function() {
            scene.pick(undefined);
        }).toThrow();
    });

    it('is picked', function() {
        var extent = createExtent();
        var pickedObject = scene.pick(new Cartesian2(0, 0));
        expect(pickedObject.primitive).toEqual(extent);
    });

    it('is not picked (show === false)', function() {
        var extent = createExtent();
        extent.show = false;

        var pickedObject = scene.pick(new Cartesian2(0, 0));
        expect(pickedObject).not.toBeDefined();
    });

    it('is not picked (alpha === 0.0)', function() {
        var extent = createExtent();
        extent.material.uniforms.color.alpha = 0.0;

        var pickedObject = scene.pick(new Cartesian2(0, 0));
        expect(pickedObject).not.toBeDefined();
    });

    it('is picked (top primitive only)', function() {
        createExtent();
        var extent2 = createExtent();
        extent2.height = 0.01;

        var pickedObject = scene.pick(new Cartesian2(0, 0));
        expect(pickedObject.primitive).toEqual(extent2);
    });

    it('drill pick (undefined window position)', function() {
        expect(function() {
            scene.pick(undefined);
        }).toThrow();
    });

    it('drill pick (all picked)', function() {
        var extent1 = createExtent();
        var extent2 = createExtent();
        extent2.height = 0.01;

        var pickedObjects = scene.drillPick(new Cartesian2(0, 0));
        expect(pickedObjects.length).toEqual(2);
        expect(pickedObjects[0].primitive).toEqual(extent2);
        expect(pickedObjects[1].primitive).toEqual(extent1);
    });

    it('drill pick (show === false)', function() {
        var extent1 = createExtent();
        var extent2 = createExtent();
        extent2.height = 0.01;
        extent2.show = false;

        var pickedObjects = scene.drillPick(new Cartesian2(0, 0));
        expect(pickedObjects.length).toEqual(1);
        expect(pickedObjects[0].primitive).toEqual(extent1);
    });

    it('drill pick (alpha === 0.0)', function() {
        var extent1 = createExtent();
        var extent2 = createExtent();
        extent2.height = 0.01;
        extent2.material.uniforms.color.alpha = 0.0;

        var pickedObjects = scene.drillPick(new Cartesian2(0, 0));
        expect(pickedObjects.length).toEqual(1);
        expect(pickedObjects[0].primitive).toEqual(extent1);
    });

    it('pick in 2D', function() {
        var context = scene.context;
        var ellipsoid = scene.scene2D.projection.ellipsoid;
        var maxRadii = ellipsoid.maximumRadius;

        camera.position = new Cartesian3(0.0, 0.0, 2.0 * maxRadii);
        camera.direction = Cartesian3.normalize(Cartesian3.negate(camera.position));
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);

        var frustum = new OrthographicFrustum();
        frustum.right = maxRadii * Math.PI;
        frustum.left = -frustum.right;
        frustum.top = frustum.right * (context.getDrawingBufferHeight() / context.getDrawingBufferWidth());
        frustum.bottom = -frustum.top;
        frustum.near = 0.01 * maxRadii;
        frustum.far = 60.0 * maxRadii;
        camera.frustum = frustum;

        camera.transform = new Matrix4(0.0, 0.0, 1.0, 0.0,
                                       1.0, 0.0, 0.0, 0.0,
                                       0.0, 1.0, 0.0, 0.0,
                                       0.0, 0.0, 0.0, 1.0);

        scene.mode = SceneMode.SCENE2D;
        scene.morphTime = scene.mode.morphTime;

        var extent = createExtent();
        var pickedObject = scene.pick(new Cartesian2(0, 0));
        expect(pickedObject.primitive).toEqual(extent);
    });

    it('pick in 2D when rotated', function() {
        var context = scene.context;
        var ellipsoid = scene.scene2D.projection.ellipsoid;
        var maxRadii = ellipsoid.maximumRadius;

        camera.position = new Cartesian3(0.0, 0.0, 2.0 * maxRadii);
        camera.direction = Cartesian3.normalize(Cartesian3.negate(camera.position));
        camera.up = Cartesian3.negate(Cartesian3.UNIT_X);

        var frustum = new OrthographicFrustum();
        frustum.right = maxRadii * Math.PI;
        frustum.left = -frustum.right;
        frustum.top = frustum.right * (context.getDrawingBufferHeight() / context.getDrawingBufferWidth());
        frustum.bottom = -frustum.top;
        frustum.near = 0.01 * maxRadii;
        frustum.far = 60.0 * maxRadii;
        camera.frustum = frustum;

        camera.transform = new Matrix4(0.0, 0.0, 1.0, 0.0,
                                       1.0, 0.0, 0.0, 0.0,
                                       0.0, 1.0, 0.0, 0.0,
                                       0.0, 0.0, 0.0, 1.0);

        scene.mode = SceneMode.SCENE2D;
        scene.morphTime = scene.mode.morphTime;

        var extent = createExtent();
        var pickedObject = scene.pick(new Cartesian2(0, 0));
        expect(pickedObject.primitive).toEqual(extent);
    });
}, 'WebGL');
