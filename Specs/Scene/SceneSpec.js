/*global defineSuite*/
defineSuite([
         'Core/defined',
         'Core/defaultValue',
         'Core/Color',
         'Core/Cartesian3',
         'Core/BoundingSphere',
         'Core/Event',
         'Core/Extent',
         'Renderer/DrawCommand',
         'Renderer/CommandLists',
         'Renderer/Context',
         'Renderer/UniformState',
         'Scene/AnimationCollection',
         'Scene/Camera',
         'Scene/CompositePrimitive',
         'Scene/ExtentPrimitive',
         'Scene/FrameState',
         'Scene/ScreenSpaceCameraController',
         'Specs/createScene',
         'Specs/destroyScene'
     ], 'Scene/Scene', function(
         defined,
         defaultValue,
         Color,
         Cartesian3,
         BoundingSphere,
         Event,
         Extent,
         DrawCommand,
         CommandLists,
         Context,
         UniformState,
         AnimationCollection,
         Camera,
         CompositePrimitive,
         ExtentPrimitive,
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

        var contextAttributes = scene.getContext()._gl.getContextAttributes();
        // Do not check depth and antialias since they are requests not requirements
        expect(contextAttributes.alpha).toEqual(false);
        expect(contextAttributes.stencil).toEqual(false);
        expect(contextAttributes.premultipliedAlpha).toEqual(true);
        expect(contextAttributes.preserveDrawingBuffer).toEqual(false);

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

    function getMockPrimitive(options) {
        return {
            update : function(context, frameState, commandList) {
                options = defaultValue(options, defaultValue.EMPTY_OBJECT);

                if (defined(options.command)) {
                    var commandLists = new CommandLists();
                    commandLists.opaqueList.push(options.command);
                    commandList.push(commandLists);
                }

                if (defined(options.event)) {
                    frameState.events.push(options.event);
                }
            },
            destroy : function() {
            }
        };
    }

    it('fires FrameState events', function() {
        var spyListener = jasmine.createSpy('listener');
        var event = new Event();
        event.addEventListener(spyListener);

        var scene = createScene();
        scene.getPrimitives().add(getMockPrimitive({
            event : event
        }));

        scene.initializeFrame();
        scene.render();
        expect(spyListener).toHaveBeenCalled();

        destroyScene(scene);
    });

    it('debugCommandFilter filters commands', function() {
        var c = new DrawCommand();
        c.execute = function() {};
        spyOn(c, 'execute');

        var scene = createScene();
        scene.getPrimitives().add(getMockPrimitive({
            command : c
        }));

        scene.debugCommandFilter = function(command) {
            return command !== c;   // Do not execute command
        };

        scene.initializeFrame();
        scene.render();
        expect(c.execute).not.toHaveBeenCalled();

        destroyScene(scene);
    });

    it('debugCommandFilter does not filter commands', function() {
        var c = new DrawCommand();
        c.execute = function() {};
        spyOn(c, 'execute');

        var scene = createScene();
        scene.getPrimitives().add(getMockPrimitive({
            command : c
        }));

        expect(scene.debugCommandFilter).toBeUndefined();
        scene.initializeFrame();
        scene.render();
        expect(c.execute).toHaveBeenCalled();

        destroyScene(scene);
    });

    it('debugShowBoundingVolume draws a bounding sphere', function() {
        var c = new DrawCommand();
        c.execute = function() {};
        c.debugShowBoundingVolume = true;
        c.boundingVolume = new BoundingSphere(Cartesian3.ZERO, 7000000.0);

        var scene = createScene();
        scene.getPrimitives().add(getMockPrimitive({
            command : c
        }));

        scene.initializeFrame();
        scene.render();
        expect(scene.getContext().readPixels()[0]).not.toEqual(0);  // Red bounding sphere

        destroyScene(scene);
    });

    it('opaque/translucent render order (1)', function() {
        var extent = Extent.fromDegrees(-100.0, 30.0, -90.0, 40.0);

        var extentPrimitive1 = new ExtentPrimitive({
            extent : extent,
            asynchronous : false
        });
        extentPrimitive1.material.uniforms.color = new Color(1.0, 0.0, 0.0, 1.0);

        var extentPrimitive2 = new ExtentPrimitive({
            extent : extent,
            height : 1000.0,
            asynchronous : false
        });
        extentPrimitive2.material.uniforms.color = new Color(0.0, 1.0, 0.0, 0.5);

        var scene = createScene();
        var primitives = scene.getPrimitives();
        primitives.add(extentPrimitive1);
        primitives.add(extentPrimitive2);

        scene.getCamera().controller.viewExtent(extent);

        scene.initializeFrame();
        scene.render();
        var pixels = scene.getContext().readPixels();
        expect(pixels[0]).not.toEqual(0);
        expect(pixels[1]).not.toEqual(0);
        expect(pixels[2]).toEqual(0);

        primitives.raiseToTop(extentPrimitive1);

        scene.initializeFrame();
        scene.render();
        pixels = scene.getContext().readPixels();
        expect(pixels[0]).not.toEqual(0);
        expect(pixels[1]).not.toEqual(0);
        expect(pixels[2]).toEqual(0);

        destroyScene(scene);
    });

    it('opaque/translucent render order (2)', function() {
        var extent = Extent.fromDegrees(-100.0, 30.0, -90.0, 40.0);

        var extentPrimitive1 = new ExtentPrimitive({
            extent : extent,
            height : 1000.0,
            asynchronous : false
        });
        extentPrimitive1.material.uniforms.color = new Color(1.0, 0.0, 0.0, 1.0);

        var extentPrimitive2 = new ExtentPrimitive({
            extent : extent,
            asynchronous : false
        });
        extentPrimitive2.material.uniforms.color = new Color(0.0, 1.0, 0.0, 0.5);

        var scene = createScene();
        var primitives = scene.getPrimitives();
        primitives.add(extentPrimitive1);
        primitives.add(extentPrimitive2);

        scene.getCamera().controller.viewExtent(extent);

        scene.initializeFrame();
        scene.render();
        var pixels = scene.getContext().readPixels();
        expect(pixels[0]).not.toEqual(0);
        expect(pixels[1]).toEqual(0);
        expect(pixels[2]).toEqual(0);

        primitives.raiseToTop(extentPrimitive1);

        scene.initializeFrame();
        scene.render();
        pixels = scene.getContext().readPixels();
        expect(pixels[0]).not.toEqual(0);
        expect(pixels[1]).toEqual(0);
        expect(pixels[2]).toEqual(0);

        destroyScene(scene);
    });

    it('isDestroyed', function() {
        var scene = createScene();
        expect(scene.isDestroyed()).toEqual(false);
        destroyScene(scene);
        expect(scene.isDestroyed()).toEqual(true);
    });
}, 'WebGL');
