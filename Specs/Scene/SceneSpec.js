/*global defineSuite*/
defineSuite([
         'Core/Color',
         'Renderer/Context',
         'Renderer/UniformState',
         'Scene/AnimationCollection',
         'Scene/Camera',
         'Scene/CompositePrimitive',
         'Scene/FrameState',
         'Scene/ScreenSpaceCameraController',
         'Specs/createScene',
         'Specs/destroyScene'
     ], 'Scene/Scene', function(
         Color,
         Context,
         UniformState,
         AnimationCollection,
         Camera,
         CompositePrimitive,
         FrameState,
         ScreenSpaceCameraController,
         createScene,
         destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor has expected defaults', function() {
        var scene = createScene();
        expect(scene.getCanvas()).toBeInstanceOf(HTMLCanvasElement);
        expect(scene.getContext()).toBeInstanceOf(Context);
        expect(scene.getPrimitives()).toBeInstanceOf(CompositePrimitive);
        expect(scene.getCamera()).toBeInstanceOf(Camera);
        expect(scene.getUniformState()).toBeInstanceOf(UniformState);
        expect(scene.getScreenSpaceCameraController()).toBeInstanceOf(ScreenSpaceCameraController);
        expect(scene.getFrameState()).toBeInstanceOf(FrameState);
        expect(scene.getAnimations()).toBeInstanceOf(AnimationCollection);

        var defaultContextOptions = {
            alpha : false,
            depth : true,
            stencil : false,
            antialias : true,
            premultipliedAlpha : true,
            preserveDrawingBuffer : false
        };
        var contextAttributes = scene.getContext()._gl.getContextAttributes();
        expect(contextAttributes).toEqual(defaultContextOptions);

        destroyScene(scene);
    });

    it('constructor sets contextOptions', function() {
        var contextOptions = {
            alpha : true,
            depth : true, //TODO Change to false when https://bugzilla.mozilla.org/show_bug.cgi?id=745912 is fixed.
            stencil : true,
            antialias : false,
            premultipliedAlpha : false,
            preserveDrawingBuffer : true
        };

        var scene = createScene(contextOptions);
        var contextAttributes = scene.getContext()._gl.getContextAttributes();
        expect(contextAttributes).toEqual(contextOptions);
        destroyScene(scene);
    });

    it('draws background color', function() {
        var scene = createScene();
        scene.initializeFrame();
        scene.render();
        expect(scene.getContext().readPixels()).toEqual([0, 0, 0, 255]);

        scene.backgroundColor = Color.BLUE;
        scene.initializeFrame();
        scene.render();
        expect(scene.getContext().readPixels()).toEqual([0, 0, 255, 255]);
        destroyScene(scene);
    });

    it('isDestroyed', function() {
        var scene = createScene();
        expect(scene.isDestroyed()).toEqual(false);
        destroyScene(scene);
        expect(scene.isDestroyed()).toEqual(true);
    });
}, 'WebGL');
