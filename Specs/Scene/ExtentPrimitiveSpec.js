/*global defineSuite*/
defineSuite([
         'Scene/ExtentPrimitive',
         'Specs/createContext',
         'Specs/destroyContext',
         'Specs/createCamera',
         'Specs/createFrameState',
         'Specs/createScene',
         'Specs/destroyScene',
         'Specs/frameState',
         'Specs/pick',
         'Specs/render',
         'Core/defaultValue',
         'Core/BoundingSphere',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/Extent',
         'Core/Math',
         'Renderer/ClearCommand',
         'Scene/SceneMode'
     ], function(
         ExtentPrimitive,
         createContext,
         destroyContext,
         createCamera,
         createFrameState,
         createScene,
         destroyScene,
         frameState,
         pick,
         render,
         defaultValue,
         BoundingSphere,
         Cartesian3,
         Cartographic,
         Ellipsoid,
         Extent,
         CesiumMath,
         ClearCommand,
         SceneMode) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var extent;
    var us;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    beforeEach(function() {
        extent = new ExtentPrimitive();

        us = context.getUniformState();
        us.update(context, createFrameState(createCamera(context, new Cartesian3(1.02, 0.0, 0.0), Cartesian3.ZERO, Cartesian3.UNIT_Z)));
    });

    afterEach(function() {
        extent = extent && extent.destroy();
        us = undefined;
    });

    function createExtent(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var e = new ExtentPrimitive({
            ellipsoid : Ellipsoid.UNIT_SPHERE,
            granularity : CesiumMath.toRadians(20.0),
            extent : Extent.fromDegrees(-50.0, -50.0, 50.0, 50.0),
            id : options.id,
            asynchronous : false,
            debugShowBoundingVolume : options.debugShowBoundingVolume
        });
        e.material.uniforms.color.alpha = 1.0;

        return e;
    }

    it('gets defaults', function() {
        expect(extent.show).toEqual(true);
        expect(extent.ellipsoid).toEqual(Ellipsoid.WGS84);
        expect(extent.granularity).toEqual(CesiumMath.RADIANS_PER_DEGREE);
        expect(extent.height).toEqual(0.0);
        expect(extent.rotation).toEqual(0.0);
        expect(extent.textureRotationAngle).toEqual(0.0);
        expect(extent.material.uniforms.color).toEqual({
            red : 1.0,
            green : 1.0,
            blue : 0.0,
            alpha : 0.5
        });
        expect(extent.asynchronous).toEqual(true);
        expect(extent.debugShowBoundingVolume).toEqual(false);
    });

    it('renders', function() {
        extent = createExtent();
        extent.material.uniforms.color = {
            red : 1.0,
            green : 0.0,
            blue : 0.0,
            alpha : 1.0
        };

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, extent);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('does not render when show is false', function() {
        extent = createExtent();
        extent.material.uniforms.color = {
            red : 1.0,
            green : 0.0,
            blue : 0.0,
            alpha : 1.0
        };
        extent.show = false;

        expect(render(context, frameState, extent)).toEqual(0);
    });

    it('does not render without extent', function() {
        extent = new ExtentPrimitive();
        extent.ellipsoid = Ellipsoid.UNIT_SPHERE;
        extent.granularity = CesiumMath.toRadians(20.0);
        expect(render(context, frameState, extent)).toEqual(0);
    });

    it('renders bounding volume with debugShowBoundingVolume', function() {
        var scene = createScene();
        scene.primitives.add(createExtent({
            debugShowBoundingVolume : true
        }));

        var camera = scene.camera;
        camera.position = new Cartesian3(1.02, 0.0, 0.0);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_X);
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);

        scene.initializeFrame();
        scene.render();
        var pixels = scene.context.readPixels();
        expect(pixels[0]).not.toEqual(0);
        expect(pixels[1]).toEqual(0);
        expect(pixels[2]).toEqual(0);
        expect(pixels[3]).toEqual(255);

        destroyScene(scene);
    });

    it('is picked', function() {
        extent = createExtent({
            id : 'id'
        });

        var pickedObject = pick(context, frameState, extent, 0, 0);
        expect(pickedObject.primitive).toEqual(extent);
        expect(pickedObject.id).toEqual('id');
    });

    it('is not picked (show === false)', function() {
        extent = createExtent();
        extent.show = false;

        var pickedObject = pick(context, frameState, extent, 0, 0);
        expect(pickedObject).not.toBeDefined();
    });

    it('is not picked (alpha === 0.0)', function() {
        extent = createExtent();
        extent.material.uniforms.color.alpha = 0.0;

        var pickedObject = pick(context, frameState, extent, 0, 0);
        expect(pickedObject).not.toBeDefined();
    });

    it('test 3D bounding sphere', function() {
        extent = createExtent();
        var commandList = [];
        extent.update(context, frameState, commandList);
        var boundingVolume = commandList[0].boundingVolume;
        expect(boundingVolume).toEqual(BoundingSphere.fromExtent3D(extent.extent, Ellipsoid.UNIT_SPHERE));
    });

    it('test Columbus view bounding sphere', function() {
        extent = createExtent();

        var mode = frameState.mode;
        frameState.mode = SceneMode.COLUMBUS_VIEW;
        var commandList = [];
        extent.update(context, frameState, commandList);
        var boundingVolume = commandList[0].boundingVolume;
        frameState.mode = mode;

        var b3D = BoundingSphere.fromExtent3D(extent.extent, Ellipsoid.UNIT_SPHERE);
        expect(boundingVolume).toEqual(BoundingSphere.projectTo2D(b3D, frameState.scene2D.projection));
    });

    it('test 2D bounding sphere', function() {
        extent = createExtent();

        var mode = frameState.mode;
        frameState.mode = SceneMode.SCENE2D;
        var commandList = [];
        extent.update(context, frameState, commandList);
        var boundingVolume = commandList[0].boundingVolume;
        frameState.mode = mode;

        var b3D = BoundingSphere.fromExtent3D(extent.extent, Ellipsoid.UNIT_SPHERE);
        var b2D = BoundingSphere.projectTo2D(b3D, frameState.scene2D.projection);
        b2D.center.x = 0.0;
        expect(boundingVolume).toEqual(b2D);
    });

    it('isDestroyed', function() {
        var e = new ExtentPrimitive();
        expect(e.isDestroyed()).toEqual(false);
        e.destroy();
        expect(e.isDestroyed()).toEqual(true);
    });

    it('throws when updated/rendered without a ellipsoid', function() {
        extent = createExtent();
        extent.ellipsoid = undefined;

        expect(function() {
            extent.update(context, frameState);
        }).toThrowDeveloperError();
    });

    it('throws when updated/rendered without an invalid granularity', function() {
        extent = createExtent();
        extent.granularity = -1.0;

        expect(function() {
            extent.update(context, frameState);
        }).toThrowDeveloperError();
    });

    it('throws when rendered without a material', function() {
        extent = createExtent();
        extent.material = undefined;

        expect(function() {
            render(context, frameState, extent);
        }).toThrowDeveloperError();
    });
}, 'WebGL');