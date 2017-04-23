/*global defineSuite*/
defineSuite([
        'Scene/DebugCameraPrimitive',
        'Core/Cartesian3',
        'Core/Color',
        'Scene/Camera',
        'Specs/createScene'
    ], function(
        DebugCameraPrimitive,
        Cartesian3,
        Color,
        Camera,
        createScene) {
    'use strict';

    var scene;
    var camera;

    beforeAll(function() {
        scene = createScene();

        camera = new Camera(scene);
        camera.position = new Cartesian3(0.0, 0.0, 0.0);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);

        scene.camera.position = new Cartesian3(0.0, 0.0, 0.0);
        scene.camera.direction = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
        scene.camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        scene.camera.zoomOut(1.0);
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    afterEach(function() {
        scene.primitives.removeAll();
    });

    it('throws if options.camera is undefined', function() {
        expect(function() {
            return new DebugCameraPrimitive();
        }).toThrowDeveloperError();
    });

    it('gets the default properties', function() {
        var p = new DebugCameraPrimitive({
            camera : camera
        });
        expect(p.show).toEqual(true);
        expect(p.id).not.toBeDefined();
        p.destroy();
    });

    it('constructs with options', function() {
        var p = new DebugCameraPrimitive({
            camera : camera,
            color : Color.YELLOW,
            updateOnChange : false,
            show : false,
            id : 'id'
        });
        expect(p.show).toEqual(false);
        expect(p.id).toEqual('id');
        p.destroy();
    });

    it('renders', function() {
        scene.primitives.add(new DebugCameraPrimitive({
            camera : camera
        }));
        expect(scene).notToRender([0, 0, 0, 255]);
    });

    it('does not render when show is false', function() {
        scene.primitives.add(new DebugCameraPrimitive({
            camera : camera,
            show : false
        }));
        expect(scene).toRender([0, 0, 0, 255]);
    });

    it('updates when underlying camera changes', function() {
        var p = scene.primitives.add(new DebugCameraPrimitive({
            camera : camera
        }));
        scene.renderForSpecs();
        var primitive = p._outlinePrimitive;
        scene.renderForSpecs();
        expect(p._outlinePrimitive).not.toBe(primitive);
    });

    it('does not update when updateOnChange is false', function() {
        var p = scene.primitives.add(new DebugCameraPrimitive({
            camera : camera,
            updateOnChange : false
        }));
        scene.renderForSpecs();
        var primitive = p._primitive;
        scene.renderForSpecs();
        expect(p._primitive).toBe(primitive);
    });

    it('is picked', function() {
        var p = scene.primitives.add(new DebugCameraPrimitive({
            camera : camera,
            id : 'id'
        }));

        expect(scene).toPickAndCall(function(result) {
            expect(result.primitive).toBe(p);
            expect(result.id).toBe('id');
        });
    });

    it('isDestroyed', function() {
        var p = scene.primitives.add(new DebugCameraPrimitive({
            camera : camera
        }));
        expect(p.isDestroyed()).toEqual(false);
        scene.primitives.remove(p);
        expect(p.isDestroyed()).toEqual(true);
    });
}, 'WebGL');
