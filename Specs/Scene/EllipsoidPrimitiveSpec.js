/*global defineSuite*/
defineSuite([
        'Scene/EllipsoidPrimitive',
        'Core/Cartesian3',
        'Core/defined',
        'Core/Matrix4',
        'Renderer/ClearCommand',
        'Scene/Material',
        'Specs/createCamera',
        'Specs/createContext',
        'Specs/createFrameState',
        'Specs/createScene',
        'Specs/destroyContext',
        'Specs/destroyScene',
        'Specs/pick',
        'Specs/render'
    ], function(
        EllipsoidPrimitive,
        Cartesian3,
        defined,
        Matrix4,
        ClearCommand,
        Material,
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
    var ellipsoid;
    var frameState;
    var us;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    beforeEach(function() {
        ellipsoid = new EllipsoidPrimitive();
        frameState = createFrameState(createCamera({
            eye :new Cartesian3(1.02, 0.0, 0.0),
            target : Cartesian3.ZERO,
            up : Cartesian3.UNIT_Z
        }));
        us = context.uniformState;
        us.update(context, frameState);
    });

    afterEach(function() {
        us = undefined;
        if (defined(ellipsoid) && !ellipsoid.isDestroyed()) {
            ellipsoid = ellipsoid.destroy();
        }
    });

    it('gets the default properties', function() {
        expect(ellipsoid.show).toEqual(true);
        expect(ellipsoid.center).toEqual(Cartesian3.ZERO);
        expect(ellipsoid.radii).toBeUndefined();
        expect(ellipsoid.modelMatrix).toEqual(Matrix4.IDENTITY);
        expect(ellipsoid.material.type).toEqual(Material.ColorType);
        expect(ellipsoid.debugShowBoundingVolume).toEqual(false);
    });

    it('Constructs with options', function() {
        var material = Material.fromType(Material.StripeType);
        var e = new EllipsoidPrimitive({
            center : new Cartesian3(1.0, 2.0, 3.0),
            radii : new Cartesian3(4.0, 5.0, 6.0),
            modelMatrix : Matrix4.fromScale(2.0),
            show : false,
            material : material,
            id : 'id',
            debugShowBoundingVolume : true
        });

        expect(e.center).toEqual(new Cartesian3(1.0, 2.0, 3.0));
        expect(e.radii).toEqual(new Cartesian3(4.0, 5.0, 6.0));
        expect(e.modelMatrix).toEqual(Matrix4.fromScale(2.0));
        expect(e.show).toEqual(false);
        expect(e.material).toBe(material);
        expect(e.id).toEqual('id');
        expect(e.debugShowBoundingVolume).toEqual(true);

        e.destroy();
    });

    it('renders with the default material', function() {
        ellipsoid.radii = new Cartesian3(1.0, 1.0, 1.0);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, ellipsoid);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('renders with a custom modelMatrix', function() {
        ellipsoid.radii = new Cartesian3(0.1, 0.1, 0.1);
        ellipsoid.modelMatrix = Matrix4.fromScale(new Cartesian3(10.0, 10.0, 10.0));

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, ellipsoid);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('renders two with a vertex array cache hit', function() {
        ellipsoid.radii = new Cartesian3(1.0, 1.0, 1.0);
        var ellipsoid2 = new EllipsoidPrimitive();
        ellipsoid2.radii = new Cartesian3(1.0, 1.0, 1.0);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, ellipsoid);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, ellipsoid2);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        ellipsoid2.destroy();
    });

    it('renders bounding volume with debugShowBoundingVolume', function() {
        var scene = createScene();
        scene.primitives.add(new EllipsoidPrimitive({
            radii : new Cartesian3(1.0, 1.0, 1.0),
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

    it('does not render when show is false', function() {
        ellipsoid.radii = new Cartesian3(1.0, 1.0, 1.0);
        ellipsoid.show = false;

        expect(render(context, frameState, ellipsoid)).toEqual(0);
    });

    it('does not render without radii', function() {
        expect(render(context, frameState, ellipsoid)).toEqual(0);
    });

    it('does not render when not in view due to center', function() {
        ellipsoid.radii = new Cartesian3(1.0, 1.0, 1.0);
        ellipsoid.center = new Cartesian3(10.0, 0.0, 0.0);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, ellipsoid);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
    });

    it('is picked', function() {
        ellipsoid.radii = new Cartesian3(1.0, 1.0, 1.0);
        ellipsoid.id = 'id';

        var pickedObject = pick(context, frameState, ellipsoid, 0, 0);
        expect(pickedObject.primitive).toEqual(ellipsoid);
        expect(pickedObject.id).toEqual('id');
    });

    it('is not picked (show === false)', function() {
        ellipsoid.radii = new Cartesian3(1.0, 1.0, 1.0);
        ellipsoid.show = false;

        var pickedObject = pick(context, frameState, ellipsoid, 0, 0);
        expect(pickedObject).not.toBeDefined();
    });

    it('is not picked (alpha === 0.0)', function() {
        ellipsoid.radii = new Cartesian3(1.0, 1.0, 1.0);
        ellipsoid.material.uniforms.color.alpha = 0.0;

        var pickedObject = pick(context, frameState, ellipsoid, 0, 0);
        expect(pickedObject).not.toBeDefined();
    });

    it('isDestroyed', function() {
        expect(ellipsoid.isDestroyed()).toEqual(false);
        ellipsoid.destroy();
        expect(ellipsoid.isDestroyed()).toEqual(true);
    });

    it('throws when rendered without a material', function() {
        ellipsoid.radii = new Cartesian3(1.0, 1.0, 1.0);
        ellipsoid.material = undefined;

        expect(function() {
            render(context, frameState, ellipsoid);
        }).toThrowDeveloperError();
    });
}, 'WebGL');
