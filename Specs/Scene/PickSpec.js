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
         'Core/Math'
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
         CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;
    var primitives;

    beforeAll(function() {
        scene = createScene();
        primitives = scene.getPrimitives();

        var camera = scene.getCamera();
        camera.position = new Cartesian3(1.03, 0.0, 0.0);
        camera.direction = new Cartesian3(-1.0, 0.0, 0.0);
        camera.up = Cartesian3.UNIT_Z;
        camera.right = Cartesian3.UNIT_Y;

        camera.frustum.near = 0.01;
        camera.frustum.far = 2.0;
        camera.frustum.fovy = CesiumMath.toRadians(60.0);
        camera.frustum.aspectRatio = 1.0;
    });

    afterAll(function() {
        destroyScene(scene);
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
}, 'WebGL');