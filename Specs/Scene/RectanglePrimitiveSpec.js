/*global defineSuite*/
defineSuite([
        'Scene/RectanglePrimitive',
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/defaultValue',
        'Core/Ellipsoid',
        'Core/Math',
        'Core/Rectangle',
        'Renderer/ClearCommand',
        'Scene/SceneMode',
        'Specs/createCamera',
        'Specs/createContext',
        'Specs/createFrameState',
        'Specs/createScene',
        'Specs/destroyContext',
        'Specs/destroyScene',
        'Specs/pick',
        'Specs/render'
    ], function(
        RectanglePrimitive,
        BoundingSphere,
        Cartesian3,
        defaultValue,
        Ellipsoid,
        CesiumMath,
        Rectangle,
        ClearCommand,
        SceneMode,
        createCamera,
        createContext,
        createFrameState,
        createScene,
        destroyContext,
        destroyScene,
        pick,
        render) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var frameState;
    var rectangle;
    var us;

    beforeAll(function() {
        context = createContext();
        frameState = createFrameState();
    });

    afterAll(function() {
        destroyContext(context);
    });

    beforeEach(function() {
        rectangle = new RectanglePrimitive();

        us = context.uniformState;
        us.update(context, createFrameState(createCamera({
            eye : new Cartesian3(1.02, 0.0, 0.0),
            target : Cartesian3.ZERO,
            up : Cartesian3.UNIT_Z
        })));
    });

    afterEach(function() {
        rectangle = rectangle && rectangle.destroy();
        us = undefined;
    });

    function createRectangle(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var e = new RectanglePrimitive({
            ellipsoid : Ellipsoid.UNIT_SPHERE,
            granularity : CesiumMath.toRadians(20.0),
            rectangle : Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
            id : options.id,
            asynchronous : false,
            debugShowBoundingVolume : options.debugShowBoundingVolume
        });
        e.material.uniforms.color.alpha = 1.0;

        return e;
    }

    it('gets defaults', function() {
        expect(rectangle.show).toEqual(true);
        expect(rectangle.ellipsoid).toEqual(Ellipsoid.WGS84);
        expect(rectangle.granularity).toEqual(CesiumMath.RADIANS_PER_DEGREE);
        expect(rectangle.height).toEqual(0.0);
        expect(rectangle.rotation).toEqual(0.0);
        expect(rectangle.textureRotationAngle).toEqual(0.0);
        expect(rectangle.material.uniforms.color).toEqual({
            red : 1.0,
            green : 1.0,
            blue : 0.0,
            alpha : 0.5
        });
        expect(rectangle.asynchronous).toEqual(true);
        expect(rectangle.debugShowBoundingVolume).toEqual(false);
    });

    it('renders', function() {
        rectangle = createRectangle();
        rectangle.material.uniforms.color = {
            red : 1.0,
            green : 0.0,
            blue : 0.0,
            alpha : 1.0
        };

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, rectangle);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('does not render when show is false', function() {
        rectangle = createRectangle();
        rectangle.material.uniforms.color = {
            red : 1.0,
            green : 0.0,
            blue : 0.0,
            alpha : 1.0
        };
        rectangle.show = false;

        expect(render(context, frameState, rectangle)).toEqual(0);
    });

    it('does not render without rectangle', function() {
        rectangle = new RectanglePrimitive();
        rectangle.ellipsoid = Ellipsoid.UNIT_SPHERE;
        rectangle.granularity = CesiumMath.toRadians(20.0);
        expect(render(context, frameState, rectangle)).toEqual(0);
    });

    it('renders bounding volume with debugShowBoundingVolume', function() {
        var scene = createScene();
        scene.primitives.add(createRectangle({
            debugShowBoundingVolume : true
        }));

        var camera = scene.camera;
        camera.position = new Cartesian3(1.02, 0.0, 0.0);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
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
        rectangle = createRectangle({
            id : 'id'
        });

        var pickedObject = pick(context, frameState, rectangle, 0, 0);
        expect(pickedObject.primitive).toEqual(rectangle);
        expect(pickedObject.id).toEqual('id');
    });

    it('is not picked (show === false)', function() {
        rectangle = createRectangle();
        rectangle.show = false;

        var pickedObject = pick(context, frameState, rectangle, 0, 0);
        expect(pickedObject).not.toBeDefined();
    });

    it('is not picked (alpha === 0.0)', function() {
        rectangle = createRectangle();
        rectangle.material.uniforms.color.alpha = 0.0;

        var pickedObject = pick(context, frameState, rectangle, 0, 0);
        expect(pickedObject).not.toBeDefined();
    });

    it('test 3D bounding sphere', function() {
        rectangle = createRectangle();
        var commandList = [];
        rectangle.update(context, frameState, commandList);
        var boundingVolume = commandList[0].boundingVolume;
        expect(boundingVolume).toEqual(BoundingSphere.fromRectangle3D(rectangle.rectangle, Ellipsoid.UNIT_SPHERE));
    });

    it('test Columbus view bounding sphere', function() {
        rectangle = createRectangle();

        var mode = frameState.mode;
        frameState.mode = SceneMode.COLUMBUS_VIEW;
        var commandList = [];
        rectangle.update(context, frameState, commandList);
        var boundingVolume = commandList[0].boundingVolume;
        frameState.mode = mode;

        var b3D = BoundingSphere.fromRectangle3D(rectangle.rectangle, Ellipsoid.UNIT_SPHERE);
        expect(boundingVolume).toEqual(BoundingSphere.projectTo2D(b3D, frameState.mapProjection));
    });

    it('test 2D bounding sphere', function() {
        rectangle = createRectangle();

        var mode = frameState.mode;
        frameState.mode = SceneMode.SCENE2D;
        var commandList = [];
        rectangle.update(context, frameState, commandList);
        var boundingVolume = commandList[0].boundingVolume;
        frameState.mode = mode;

        var b3D = BoundingSphere.fromRectangle3D(rectangle.rectangle, Ellipsoid.UNIT_SPHERE);
        var b2D = BoundingSphere.projectTo2D(b3D, frameState.mapProjection);
        b2D.center.x = 0.0;
        expect(boundingVolume).toEqual(b2D);
    });

    it('isDestroyed', function() {
        var e = new RectanglePrimitive();
        expect(e.isDestroyed()).toEqual(false);
        e.destroy();
        expect(e.isDestroyed()).toEqual(true);
    });

    it('throws when updated/rendered without a ellipsoid', function() {
        rectangle = createRectangle();
        rectangle.ellipsoid = undefined;

        expect(function() {
            rectangle.update(context, frameState);
        }).toThrowDeveloperError();
    });

    it('throws when updated/rendered without an invalid granularity', function() {
        rectangle = createRectangle();
        rectangle.granularity = -1.0;

        expect(function() {
            rectangle.update(context, frameState);
        }).toThrowDeveloperError();
    });

    it('throws when rendered without a material', function() {
        rectangle = createRectangle();
        rectangle.material = undefined;

        expect(function() {
            render(context, frameState, rectangle);
        }).toThrowDeveloperError();
    });
}, 'WebGL');