/*global defineSuite*/
defineSuite([
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/Color',
        'Core/Ellipsoid',
        'Core/GeographicProjection',
        'Core/PixelFormat',
        'Core/Rectangle',
        'Core/RuntimeError',
        'Core/WebMercatorProjection',
        'Renderer/DrawCommand',
        'Renderer/PixelDatatype',
        'Scene/Camera',
        'Scene/FrameState',
        'Scene/Globe',
        'Scene/Pass',
        'Scene/PrimitiveCollection',
        'Scene/RectanglePrimitive',
        'Scene/Scene',
        'Scene/ScreenSpaceCameraController',
        'Scene/TweenCollection',
        'Specs/createScene',
        'Specs/equals',
        'Specs/render'
    ], 'Scene/Scene', function(
        BoundingSphere,
        Cartesian3,
        Color,
        Ellipsoid,
        GeographicProjection,
        PixelFormat,
        Rectangle,
        RuntimeError,
        WebMercatorProjection,
        DrawCommand,
        PixelDatatype,
        Camera,
        FrameState,
        Globe,
        Pass,
        PrimitiveCollection,
        RectanglePrimitive,
        Scene,
        ScreenSpaceCameraController,
        TweenCollection,
        createScene,
        equals,
        render) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor,WebGLRenderingContext*/

    var scene;

    beforeAll(function() {
        scene = createScene();
    });

    afterEach(function() {
        scene.backgroundColor = new Color(0.0, 0.0, 0.0, 0.0);
        scene.debugCommandFilter = undefined;
        scene.fxaaOrderIndependentTranslucency = true;
        scene.fxaa = false;
        scene.primitives.removeAll();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    it('constructor has expected defaults', function() {
        expect(scene.canvas).toBeInstanceOf(HTMLCanvasElement);
        expect(scene.primitives).toBeInstanceOf(PrimitiveCollection);
        expect(scene.camera).toBeInstanceOf(Camera);
        expect(scene.screenSpaceCameraController).toBeInstanceOf(ScreenSpaceCameraController);
        expect(scene.mapProjection).toBeInstanceOf(GeographicProjection);
        expect(scene.frameState).toBeInstanceOf(FrameState);
        expect(scene.tweens).toBeInstanceOf(TweenCollection);

        var contextAttributes = scene.context._gl.getContextAttributes();
        // Do not check depth and antialias since they are requests not requirements
        expect(contextAttributes.alpha).toEqual(false);
        expect(contextAttributes.stencil).toEqual(false);
        expect(contextAttributes.premultipliedAlpha).toEqual(true);
        expect(contextAttributes.preserveDrawingBuffer).toEqual(false);
    });

    it('constructor sets options', function() {
        var webglOptions = {
            alpha : true,
            depth : true, //TODO Change to false when https://bugzilla.mozilla.org/show_bug.cgi?id=745912 is fixed.
            stencil : true,
            antialias : false,
            premultipliedAlpha : true, // Workaround IE 11.0.8, which does not honor false.
            preserveDrawingBuffer : true
        };
        var mapProjection = new WebMercatorProjection();

        var s = createScene({
            contextOptions : {
                webgl : webglOptions
            },
            mapProjection : mapProjection
        });

        var contextAttributes = s.context._gl.getContextAttributes();
        expect(contextAttributes.alpha).toEqual(webglOptions.alpha);
        expect(contextAttributes.depth).toEqual(webglOptions.depth);
        expect(contextAttributes.stencil).toEqual(webglOptions.stencil);
        expect(contextAttributes.antialias).toEqual(webglOptions.antialias);
        expect(contextAttributes.premultipliedAlpha).toEqual(webglOptions.premultipliedAlpha);
        expect(contextAttributes.preserveDrawingBuffer).toEqual(webglOptions.preserveDrawingBuffer);
        expect(s.mapProjection).toEqual(mapProjection);

        s.destroyForSpecs();
    });

    it('constructor throws without options', function() {
        expect(function() {
            return new Scene();
        }).toThrowDeveloperError();
    });

    it('constructor throws without options.canvas', function() {
      expect(function() {
          return new Scene({});
      }).toThrowDeveloperError();
  });

    it('draws background color', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        scene.backgroundColor = Color.BLUE;
        expect(scene.renderForSpecs()).toEqual([0, 0, 255, 255]);
    });

    it('calls afterRender functions', function() {
        var spyListener = jasmine.createSpy('listener');

        var primitive = {
            update : function(context, frameState, commandList) {
                frameState.afterRender.push(spyListener);
            },
            destroy : function() {
            }
        };
        scene.primitives.add(primitive);

        scene.renderForSpecs();
        expect(spyListener).toHaveBeenCalled();
    });

    function CommandMockPrimitive(command) {
        this.update = function(context, frameState, commandList) {
            commandList.push(command);
        };
        this.destroy = function() {
        };
    }

    it('debugCommandFilter filters commands', function() {
        var c = new DrawCommand({
            pass : Pass.OPAQUE
        });
        c.execute = function() {};
        spyOn(c, 'execute');

        scene.primitives.add(new CommandMockPrimitive(c));

        scene.debugCommandFilter = function(command) {
            return command !== c;   // Do not execute command
        };

        scene.renderForSpecs();
        expect(c.execute).not.toHaveBeenCalled();
    });

    it('debugCommandFilter does not filter commands', function() {
        var c = new DrawCommand({
            pass : Pass.OPAQUE
        });
        c.execute = function() {};
        spyOn(c, 'execute');

        scene.primitives.add(new CommandMockPrimitive(c));

        expect(scene.debugCommandFilter).toBeUndefined();
        scene.renderForSpecs();
        expect(c.execute).toHaveBeenCalled();
    });

    it('debugShowBoundingVolume draws a bounding sphere', function() {
        var radius = Cartesian3.magnitude(scene.camera.position) - 10.0;

        var c = new DrawCommand({
            pass : Pass.OPAQUE,
            debugShowBoundingVolume : true,
            boundingVolume : new BoundingSphere(Cartesian3.ZERO, radius)
        });
        c.execute = function() {};

        scene.primitives.add(new CommandMockPrimitive(c));

        expect(scene.renderForSpecs()[0]).not.toEqual(0);  // Red bounding sphere
    });

    it('debugShowCommands tints commands', function() {
        var c = new DrawCommand({
            pass : Pass.OPAQUE,
            shaderProgram : scene.context.createShaderProgram(
                'void main() { gl_Position = vec4(1.0); }',
                'void main() { gl_FragColor = vec4(1.0); }')
        });
        c.execute = function() {};

        scene.primitives.add(new CommandMockPrimitive(c));

        scene.debugShowCommands = true;
        scene.renderForSpecs();
        expect(c._debugColor).toBeDefined();
        scene.debugShowCommands = false;
    });

    it('debugShowFramesPerSecond', function() {
        scene.debugShowFramesPerSecond = true;
        scene.renderForSpecs();
        expect(scene._performanceDisplay).toBeDefined();
        scene.debugShowFramesPerSecond = false;
    });

    it('opaque/translucent render order (1)', function() {
        var rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);

        var rectanglePrimitive1 = new RectanglePrimitive({
            rectangle : rectangle,
            asynchronous : false
        });
        rectanglePrimitive1.material.uniforms.color = new Color(1.0, 0.0, 0.0, 1.0);

        var rectanglePrimitive2 = new RectanglePrimitive({
            rectangle : rectangle,
            height : 1000.0,
            asynchronous : false
        });
        rectanglePrimitive2.material.uniforms.color = new Color(0.0, 1.0, 0.0, 0.5);

        var primitives = scene.primitives;
        primitives.add(rectanglePrimitive1);
        primitives.add(rectanglePrimitive2);

        scene.camera.viewRectangle(rectangle);

        var pixels = scene.renderForSpecs();
        expect(pixels[0]).not.toEqual(0);
        expect(pixels[1]).not.toEqual(0);
        expect(pixels[2]).toEqual(0);

        primitives.raiseToTop(rectanglePrimitive1);

        pixels = scene.renderForSpecs();
        expect(pixels[0]).not.toEqual(0);
        expect(pixels[1]).not.toEqual(0);
        expect(pixels[2]).toEqual(0);
    });

    it('opaque/translucent render order (2)', function() {
        var rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);

        var rectanglePrimitive1 = new RectanglePrimitive({
            rectangle : rectangle,
            height : 1000.0,
            asynchronous : false
        });
        rectanglePrimitive1.material.uniforms.color = new Color(1.0, 0.0, 0.0, 1.0);

        var rectanglePrimitive2 = new RectanglePrimitive({
            rectangle : rectangle,
            asynchronous : false
        });
        rectanglePrimitive2.material.uniforms.color = new Color(0.0, 1.0, 0.0, 0.5);

        var primitives = scene.primitives;
        primitives.add(rectanglePrimitive1);
        primitives.add(rectanglePrimitive2);

        scene.camera.viewRectangle(rectangle);

        var pixels = scene.renderForSpecs();
        expect(pixels[0]).not.toEqual(0);
        expect(pixels[1]).toEqual(0);
        expect(pixels[2]).toEqual(0);

        primitives.raiseToTop(rectanglePrimitive1);

        pixels = scene.renderForSpecs();
        expect(pixels[0]).not.toEqual(0);
        expect(pixels[1]).toEqual(0);
        expect(pixels[2]).toEqual(0);
    });

    it('renders fast path with no translucent primitives', function() {
        var rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);

        var rectanglePrimitive = new RectanglePrimitive({
            rectangle : rectangle,
            height : 1000.0,
            asynchronous : false
        });
        rectanglePrimitive.material.uniforms.color = new Color(1.0, 0.0, 0.0, 1.0);

        var primitives = scene.primitives;
        primitives.add(rectanglePrimitive);

        scene.camera.viewRectangle(rectangle);

        var pixels = scene.renderForSpecs();
        expect(pixels[0]).not.toEqual(0);
        expect(pixels[1]).toEqual(0);
        expect(pixels[2]).toEqual(0);
    });

    it('renders with OIT and without FXAA', function() {
        var rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);

        var rectanglePrimitive = new RectanglePrimitive({
            rectangle : rectangle,
            height : 1000.0,
            asynchronous : false
        });
        rectanglePrimitive.material.uniforms.color = new Color(1.0, 0.0, 0.0, 0.5);

        var primitives = scene.primitives;
        primitives.add(rectanglePrimitive);

        scene.camera.viewRectangle(rectangle);

        scene.fxaaOrderIndependentTranslucency = false;
        scene.fxaa = false;

        var pixels = scene.renderForSpecs();
        expect(pixels[0]).not.toEqual(0);
        expect(pixels[1]).toEqual(0);
        expect(pixels[2]).toEqual(0);
    });

    it('renders with forced FXAA', function() {
        var context = scene.context;

        // Workaround for Firefox on Mac, which does not support RGBA + depth texture
        // attachments, which is allowed by the spec.
        if (context.depthTexture) {
            var framebuffer = context.createFramebuffer({
                colorTextures : [context.createTexture2D({
                    width : 1,
                    height : 1,
                    pixelFormat : PixelFormat.RGBA,
                    pixelDatatype : PixelDatatype.UNSIGNED_BYTE
                })],
                depthTexture : context.createTexture2D({
                    width : 1,
                    height : 1,
                    pixelFormat : PixelFormat.DEPTH_COMPONENT,
                    pixelDatatype : PixelDatatype.UNSIGNED_SHORT
                })
            });

            var status = framebuffer.status;
            framebuffer.destroy();

            if (status !== WebGLRenderingContext.FRAMEBUFFER_COMPLETE) {
                return;
            }
        }

        var s = createScene();
        s._oit._translucentMRTSupport = false;
        s._oit._translucentMultipassSupport = false;

        s.fxaa = true;

        var rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);

        var rectanglePrimitive = new RectanglePrimitive({
            rectangle : rectangle,
            height : 1000.0,
            asynchronous : false
        });
        rectanglePrimitive.material.uniforms.color = new Color(1.0, 0.0, 0.0, 1.0);

        var primitives = s.primitives;
        primitives.add(rectanglePrimitive);

        s.camera.viewRectangle(rectangle);

        var pixels = s.renderForSpecs();
        expect(pixels[0]).not.toEqual(0);
        expect(pixels[1]).toEqual(0);
        expect(pixels[2]).toEqual(0);

        s.destroyForSpecs();
    });

    it('setting a central body', function() {
        var scene = createScene();
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var globe = new Globe(ellipsoid);
        scene.globe = globe;

        expect(scene.globe).toBe(globe);

        scene.destroyForSpecs();
    });

    it('destroys primitive on set globe', function() {
        var scene = createScene();
        var globe = new Globe(Ellipsoid.UNIT_SPHERE);

        scene.globe = globe;
        expect(globe.isDestroyed()).toEqual(false);

        scene.globe = null;
        expect(globe.isDestroyed()).toEqual(true);

        scene.destroyForSpecs();
    });

    it('renders a central body', function() {
        var s = createScene();

        s.globe = new Globe(Ellipsoid.UNIT_SPHERE);
        s.camera.position = new Cartesian3(1.02, 0.0, 0.0);
        s.camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        s.camera.direction = Cartesian3.negate(Cartesian3.normalize(s.camera.position, new Cartesian3()), new Cartesian3());

        s.renderForSpecs();

        waitsFor(function() {
            render(s._context, s.frameState, s.globe);
            return !equals(this.env, s._context.readPixels(), [0, 0, 0, 0]);
        }, 'the central body to be rendered', 5000);
    });

    it('renders with multipass OIT if MRT is available', function() {
        if (scene.context.drawBuffers) {
            var s = createScene();
            s._oit._translucentMRTSupport = false;
            s._oit._translucentMultipassSupport = true;

            var rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);

            var rectanglePrimitive = new RectanglePrimitive({
                rectangle : rectangle,
                height : 1000.0,
                asynchronous : false
            });
            rectanglePrimitive.material.uniforms.color = new Color(1.0, 0.0, 0.0, 0.5);

            var primitives = s.primitives;
            primitives.add(rectanglePrimitive);

            s.camera.viewRectangle(rectangle);

            var pixels = s.renderForSpecs();
            expect(pixels[0]).not.toEqual(0);
            expect(pixels[1]).toEqual(0);
            expect(pixels[2]).toEqual(0);

            s.destroyForSpecs();
        }
    });

    it('renders with alpha blending if floating point textures are available', function() {
        if (scene.context.floatingPointTexture) {
            var s = createScene();
            s._oit._translucentMRTSupport = false;
            s._oit._translucentMultipassSupport = false;

            var rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);

            var rectanglePrimitive = new RectanglePrimitive({
                rectangle : rectangle,
                height : 1000.0,
                asynchronous : false
            });
            rectanglePrimitive.material.uniforms.color = new Color(1.0, 0.0, 0.0, 0.5);

            var primitives = s.primitives;
            primitives.add(rectanglePrimitive);

            s.camera.viewRectangle(rectangle);

            var pixels = s.renderForSpecs();
            expect(pixels[0]).not.toEqual(0);
            expect(pixels[1]).toEqual(0);
            expect(pixels[2]).toEqual(0);

            s.destroyForSpecs();
        }
    });

    it('isDestroyed', function() {
        var s = createScene();
        expect(s.isDestroyed()).toEqual(false);
        s.destroyForSpecs();
        expect(s.isDestroyed()).toEqual(true);
    });

    it('raises renderError when render throws', function() {
        var s = createScene({
            rethrowRenderErrors : false
        });

        var spyListener = jasmine.createSpy('listener');
        s.renderError.addEventListener(spyListener);

        var error = 'foo';
        s.primitives.update = function() {
            throw error;
        };

        s.render();

        expect(spyListener).toHaveBeenCalledWith(s, error);

        s.destroyForSpecs();
    });

    it('a render error is rethrown if rethrowRenderErrors is true', function() {
        var s = createScene();
        s.rethrowRenderErrors = true;

        var spyListener = jasmine.createSpy('listener');
        s.renderError.addEventListener(spyListener);

        var error = new RuntimeError('error');
        s.primitives.update = function() {
            throw error;
        };

        expect(function() {
            s.render();
        }).toThrowRuntimeError();

        expect(spyListener).toHaveBeenCalledWith(s, error);

        s.destroyForSpecs();
    });

    it('raises the preRender event prior to rendering', function() {
        var s = createScene();

        var spyListener = jasmine.createSpy('listener');
        s.preRender.addEventListener(spyListener);

        s.render();

        expect(spyListener.callCount).toBe(1);

        s.destroyForSpecs();
    });

    it('raises the postRender event after rendering', function() {
        var s = createScene();

        var spyListener = jasmine.createSpy('listener');
        s.postRender.addEventListener(spyListener);

        s.render();

        expect(spyListener.callCount).toBe(1);

        s.destroyForSpecs();
    });

    it('get maximumAliasedLineWidth', function() {
        var s = createScene();
        expect(s.maximumAliasedLineWidth).toBeGreaterThanOrEqualTo(1);
        s.destroyForSpecs();
    });

    it('get maximumCubeMapSize', function() {
        var s = createScene();
        expect(s.maximumCubeMapSize).toBeGreaterThanOrEqualTo(16);
        s.destroyForSpecs();
    });
}, 'WebGL');
