/*global defineSuite*/
defineSuite([
        'Scene/DebugModelMatrixPrimitive',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Matrix4',
        'Specs/createScene'
    ], function(
        DebugModelMatrixPrimitive,
        Cartesian2,
        Cartesian3,
        Matrix4,
        createScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var scene;

    beforeAll(function() {
        scene = createScene();
        var camera = scene.camera;
        camera.position = new Cartesian3(1.02, 0.0, 0.0);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    afterEach(function() {
        scene.primitives.removeAll();
    });

    it('gets the default properties', function() {
        var p = new DebugModelMatrixPrimitive();
        expect(p.length).toEqual(10000000.0);
        expect(p.width).toEqual(2.0);
        expect(p.modelMatrix).toEqual(Matrix4.IDENTITY);
        expect(p.show).toEqual(true);
        expect(p.id).not.toBeDefined();
        p.destroy();
    });

    it('Constructs with options', function() {
        var p = new DebugModelMatrixPrimitive({
            length : 10.0,
            width : 1.0,
            modelMatrix : Matrix4.fromUniformScale(2.0),
            show : false,
            id : 'id'
        });
        expect(p.length).toEqual(10.0);
        expect(p.width).toEqual(1.0);
        expect(p.modelMatrix).toEqual(Matrix4.fromUniformScale(2.0));
        expect(p.show).toEqual(false);
        expect(p.id).toEqual('id');
        p.destroy();
    });

    it('renders', function() {
        var p = scene.primitives.add(new DebugModelMatrixPrimitive());
        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);

        // Update and render again
        p.length = 100.0;
        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
    });

    it('does not render when show is false', function() {
        scene.primitives.add(new DebugModelMatrixPrimitive({
            show : false
        }));
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
    });

    it('is picked', function() {
        var p = scene.primitives.add(new DebugModelMatrixPrimitive({
            id : 'id'
        }));

        var pick = scene.pick(new Cartesian2(0, 0));
        expect(pick.primitive).toEqual(p);
        expect(pick.id).toEqual('id');
    });

    it('isDestroyed', function() {
        var p = new DebugModelMatrixPrimitive();
        expect(p.isDestroyed()).toEqual(false);
        p.destroy();
        expect(p.isDestroyed()).toEqual(true);
    });
}, 'WebGL');
