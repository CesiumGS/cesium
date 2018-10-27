defineSuite([
        'Scene/Scene',
        'Core/BoundingSphere',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/CesiumTerrainProvider',
        'Core/Color',
        'Core/defined',
        'Core/Ellipsoid',
        'Core/GeographicProjection',
        'Core/GeometryInstance',
        'Core/HeadingPitchRoll',
        'Core/JulianDate',
        'Core/Math',
        'Core/PerspectiveFrustum',
        'Core/PixelFormat',
        'Core/Rectangle',
        'Core/RectangleGeometry',
        'Core/RequestScheduler',
        'Core/RuntimeError',
        'Core/TaskProcessor',
        'Core/WebGLConstants',
        'Core/WebMercatorProjection',
        'Renderer/DrawCommand',
        'Renderer/Framebuffer',
        'Renderer/Pass',
        'Renderer/PixelDatatype',
        'Renderer/RenderState',
        'Renderer/ShaderProgram',
        'Renderer/ShaderSource',
        'Renderer/Texture',
        'Scene/Camera',
        'Scene/EllipsoidSurfaceAppearance',
        'Scene/FrameState',
        'Scene/Globe',
        'Scene/Material',
        'Scene/Primitive',
        'Scene/PrimitiveCollection',
        'Scene/SceneTransforms',
        'Scene/ScreenSpaceCameraController',
        'Scene/TweenCollection',
        'Specs/createCanvas',
        'Specs/createScene',
        'Specs/pollToPromise',
        'Specs/render'
    ], function(
        Scene,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        CesiumTerrainProvider,
        Color,
        defined,
        Ellipsoid,
        GeographicProjection,
        GeometryInstance,
        HeadingPitchRoll,
        JulianDate,
        CesiumMath,
        PerspectiveFrustum,
        PixelFormat,
        Rectangle,
        RectangleGeometry,
        RequestScheduler,
        RuntimeError,
        TaskProcessor,
        WebGLConstants,
        WebMercatorProjection,
        DrawCommand,
        Framebuffer,
        Pass,
        PixelDatatype,
        RenderState,
        ShaderProgram,
        ShaderSource,
        Texture,
        Camera,
        EllipsoidSurfaceAppearance,
        FrameState,
        Globe,
        Material,
        Primitive,
        PrimitiveCollection,
        SceneTransforms,
        ScreenSpaceCameraController,
        TweenCollection,
        createCanvas,
        createScene,
        pollToPromise,
        render) {
    'use strict';

    var scene;
    var simpleShaderProgram;
    var simpleRenderState;

    beforeAll(function() {
        scene = createScene();
        simpleShaderProgram = ShaderProgram.fromCache({
            context : scene.context,
            vertexShaderSource : new ShaderSource({
                sources : ['void main() { gl_Position = vec4(1.0); }']
            }),
            fragmentShaderSource : new ShaderSource({
                sources : ['void main() { gl_FragColor = vec4(1.0); }']
            })
        });
        simpleRenderState = new RenderState();
    });

    afterEach(function() {
        scene.backgroundColor = new Color(0.0, 0.0, 0.0, 0.0);
        scene.debugCommandFilter = undefined;
        scene.postProcessStages.fxaa.enabled = false;
        scene.primitives.removeAll();
        scene.morphTo3D(0.0);

        var camera = scene.camera;
        camera.frustum = new PerspectiveFrustum();
        camera.frustum.aspectRatio = scene.drawingBufferWidth / scene.drawingBufferHeight;
        camera.frustum.fov = CesiumMath.toRadians(60.0);
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    function createRectangle(rectangle, height) {
        return new Primitive({
            geometryInstances: new GeometryInstance({
                geometry: new RectangleGeometry({
                    rectangle: rectangle,
                    vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                    height: height
                })
            }),
            appearance: new EllipsoidSurfaceAppearance({
                aboveGround: false
            }),
            asynchronous: false
        });
    }

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
        expect(contextAttributes.stencil).toEqual(true);
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
        expect(scene).toRender([0, 0, 0, 255]);

        scene.backgroundColor = Color.BLUE;
        expect(scene).toRender([0, 0, 255, 255]);
    });

    it('calls afterRender functions', function() {
        var spyListener = jasmine.createSpy('listener');

        var primitive = {
            update : function(frameState) {
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
        this.update = function(frameState) {
            frameState.commandList.push(command);
        };
        this.destroy = function() {
        };
    }

    it('debugCommandFilter filters commands', function() {
        var c = new DrawCommand({
            shaderProgram : simpleShaderProgram,
            renderState : simpleRenderState,
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
        var originalLogDepth = scene.logarithmicDepthBuffer;
        scene.logarithmicDepthBuffer = false;

        var c = new DrawCommand({
            shaderProgram : simpleShaderProgram,
            renderState : simpleRenderState,
            pass : Pass.OPAQUE
        });
        c.execute = function() {};
        spyOn(c, 'execute');

        scene.primitives.add(new CommandMockPrimitive(c));

        expect(scene.debugCommandFilter).toBeUndefined();
        scene.renderForSpecs();
        expect(c.execute).toHaveBeenCalled();

        scene.logarithmicDepthBuffer = originalLogDepth;
    });

    it('debugShowBoundingVolume draws a bounding sphere', function() {
        var originalLogDepth = scene.logarithmicDepthBuffer;
        scene.logarithmicDepthBuffer = false;

        var radius = 10.0;
        var center = Cartesian3.add(scene.camera.position, scene.camera.direction, new Cartesian3());

        var c = new DrawCommand({
            shaderProgram : simpleShaderProgram,
            renderState : simpleRenderState,
            pass : Pass.OPAQUE,
            debugShowBoundingVolume : true,
            boundingVolume : new BoundingSphere(center, radius)
        });
        c.execute = function() {};

        scene.primitives.add(new CommandMockPrimitive(c));
        scene.depthTestAgainstTerrain = true;

        expect(scene).toRenderAndCall(function(rgba) {
            expect(rgba[0]).not.toEqual(0);  // Red bounding sphere
        });

        scene.logarithmicDepthBuffer = originalLogDepth;
    });

    it('debugShowCommands tints commands', function() {
        var originalLogDepth = scene.logarithmicDepthBuffer;
        scene.logarithmicDepthBuffer = false;

        var c = new DrawCommand({
            shaderProgram : simpleShaderProgram,
            renderState : simpleRenderState,
            pass : Pass.OPAQUE
        });
        c.execute = function() {};

        var originalShallowClone = DrawCommand.shallowClone;
        spyOn(DrawCommand, 'shallowClone').and.callFake(function(command, result) {
            result = originalShallowClone(command, result);
            result.execute = function() {};
            return result;
        });

        scene.primitives.add(new CommandMockPrimitive(c));

        scene.debugShowCommands = true;
        scene.renderForSpecs();
        expect(c._debugColor).toBeDefined();
        scene.debugShowCommands = false;

        scene.logarithmicDepthBuffer = originalLogDepth;
    });

    it('debugShowFramesPerSecond', function() {
        scene.debugShowFramesPerSecond = true;
        scene.renderForSpecs();
        expect(scene._performanceDisplay).toBeDefined();
        scene.debugShowFramesPerSecond = false;
    });

    it('debugShowGlobeDepth', function() {
        if (!scene.context.depthTexture) {
            return;
        }

        var rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);
        scene.camera.setView({ destination : rectangle });

        var rectanglePrimitive = createRectangle(rectangle);
        rectanglePrimitive.appearance.material.uniforms.color = new Color(1.0, 0.0, 0.0, 1.0);

        scene.primitives.add(rectanglePrimitive);
        expect(scene).toRender([255, 0, 0, 255]);

        scene.debugShowGlobeDepth = true;
        expect(scene).notToRender([255, 0, 0, 255]);

        scene.debugShowGlobeDepth = false;
    });

    it('opaque/translucent render order (1)', function() {
        var rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);

        var rectanglePrimitive1 = createRectangle(rectangle);
        rectanglePrimitive1.appearance.material.uniforms.color = new Color(1.0, 0.0, 0.0, 1.0);

        var rectanglePrimitive2 = createRectangle(rectangle, 1000.0);
        rectanglePrimitive2.appearance.material.uniforms.color = new Color(0.0, 1.0, 0.0, 0.5);

        var primitives = scene.primitives;
        primitives.add(rectanglePrimitive1);
        primitives.add(rectanglePrimitive2);

        scene.camera.setView({ destination : rectangle });
        expect(scene).toRenderAndCall(function(rgba) {
            expect(rgba[0]).not.toEqual(0);
            expect(rgba[1]).not.toEqual(0);
            expect(rgba[2]).toEqual(0);
        });

        primitives.raiseToTop(rectanglePrimitive1);
        expect(scene).toRenderAndCall(function(rgba) {
            expect(rgba[0]).not.toEqual(0);
            expect(rgba[1]).not.toEqual(0);
            expect(rgba[2]).toEqual(0);
        });
    });

    it('opaque/translucent render order (2)', function() {
        var rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);

        var rectanglePrimitive1 = createRectangle(rectangle, 1000.0);
        rectanglePrimitive1.appearance.material.uniforms.color = new Color(1.0, 0.0, 0.0, 1.0);

        var rectanglePrimitive2 = createRectangle(rectangle);
        rectanglePrimitive2.appearance.material.uniforms.color = new Color(0.0, 1.0, 0.0, 0.5);

        var primitives = scene.primitives;
        primitives.add(rectanglePrimitive1);
        primitives.add(rectanglePrimitive2);

        scene.camera.setView({ destination : rectangle });
        expect(scene).toRenderAndCall(function(rgba) {
            expect(rgba[0]).not.toEqual(0);
            expect(rgba[1]).toEqual(0);
            expect(rgba[2]).toEqual(0);
        });

        primitives.raiseToTop(rectanglePrimitive1);
        expect(scene).toRenderAndCall(function(rgba) {
            expect(rgba[0]).not.toEqual(0);
            expect(rgba[1]).toEqual(0);
            expect(rgba[2]).toEqual(0);
        });
    });

    it('renders with OIT and without FXAA', function() {
        var rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);

        var rectanglePrimitive = createRectangle(rectangle, 1000.0);
        rectanglePrimitive.appearance.material.uniforms.color = new Color(1.0, 0.0, 0.0, 0.5);

        var primitives = scene.primitives;
        primitives.add(rectanglePrimitive);

        scene.camera.setView({ destination : rectangle });
        scene.postProcessStages.fxaa.enabled = false;
        expect(scene).toRenderAndCall(function(rgba) {
            expect(rgba[0]).not.toEqual(0);
            expect(rgba[1]).toEqual(0);
            expect(rgba[2]).toEqual(0);
        });
    });

    it('renders with forced FXAA', function() {
        var context = scene.context;

        // Workaround for Firefox on Mac, which does not support RGBA + depth texture
        // attachments, which is allowed by the spec.
        if (context.depthTexture) {
            var framebuffer = new Framebuffer({
                context : context,
                colorTextures : [new Texture({
                    context : context,
                    width : 1,
                    height : 1,
                    pixelFormat : PixelFormat.RGBA,
                    pixelDatatype : PixelDatatype.UNSIGNED_BYTE
                })],
                depthTexture : new Texture({
                    context : context,
                    width : 1,
                    height : 1,
                    pixelFormat : PixelFormat.DEPTH_COMPONENT,
                    pixelDatatype : PixelDatatype.UNSIGNED_SHORT
                })
            });

            var status = framebuffer.status;
            framebuffer.destroy();

            if (status !== WebGLConstants.FRAMEBUFFER_COMPLETE) {
                return;
            }
        }

        var s = createScene();

        if (defined(s._oit)) {
            s._oit._translucentMRTSupport = false;
            s._oit._translucentMultipassSupport = false;
        }

        s.postProcessStages.fxaa.enabled = false;

        var rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);

        var rectanglePrimitive = createRectangle(rectangle, 1000.0);
        rectanglePrimitive.appearance.material.uniforms.color = new Color(1.0, 0.0, 0.0, 1.0);

        var primitives = s.primitives;
        primitives.add(rectanglePrimitive);

        s.camera.setView({ destination : rectangle });

        expect(s).toRenderAndCall(function(rgba) {
            expect(rgba[0]).not.toEqual(0);
            expect(rgba[1]).toEqual(0);
            expect(rgba[2]).toEqual(0);
        });

        s.destroyForSpecs();
    });

    it('setting a globe', function() {
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

        scene.globe = undefined;
        expect(globe.isDestroyed()).toEqual(true);

        scene.destroyForSpecs();
    });

    describe('render tests', function() {
        var s;

        beforeEach(function() {
            s = createScene();
        });

        afterEach(function() {
            s.destroyForSpecs();
        });

        it('renders a globe', function() {
            s.globe = new Globe(Ellipsoid.UNIT_SPHERE);
            s.camera.position = new Cartesian3(1.02, 0.0, 0.0);
            s.camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
            s.camera.direction = Cartesian3.negate(Cartesian3.normalize(s.camera.position, new Cartesian3()), new Cartesian3());

            // To avoid Jasmine's spec has no expectations error
            expect(true).toEqual(true);

            return expect(s).toRenderAndCall(function() {
                return pollToPromise(function() {
                    render(s.frameState, s.globe);
                    return !jasmine.matchersUtil.equals(s._context.readPixels(), [0, 0, 0, 0]);
                });
            });
        });

        it('renders a globe with an ElevationContour', function() {
            s.globe = new Globe(Ellipsoid.UNIT_SPHERE);
            s.globe.material = Material.fromType('ElevationContour');
            s.camera.position = new Cartesian3(1.02, 0.0, 0.0);
            s.camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
            s.camera.direction = Cartesian3.negate(Cartesian3.normalize(s.camera.position, new Cartesian3()), new Cartesian3());

            // To avoid Jasmine's spec has no expectations error
            expect(true).toEqual(true);

            return expect(s).toRenderAndCall(function() {
                return pollToPromise(function() {
                    render(s.frameState, s.globe);
                    return !jasmine.matchersUtil.equals(s._context.readPixels(), [0, 0, 0, 0]);
                });
            });
        });

        it('renders a globe with a SlopeRamp', function() {
            s.globe = new Globe(Ellipsoid.UNIT_SPHERE);
            s.globe.material = Material.fromType('SlopeRamp');
            s.camera.position = new Cartesian3(1.02, 0.0, 0.0);
            s.camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
            s.camera.direction = Cartesian3.negate(Cartesian3.normalize(s.camera.position, new Cartesian3()), new Cartesian3());

            // To avoid Jasmine's spec has no expectations error
            expect(true).toEqual(true);

            return expect(s).toRenderAndCall(function() {
                return pollToPromise(function() {
                    render(s.frameState, s.globe);
                    return !jasmine.matchersUtil.equals(s._context.readPixels(), [0, 0, 0, 0]);
                });
            });
        });

        it('renders a globe with a ElevationRamp', function() {
            s.globe = new Globe(Ellipsoid.UNIT_SPHERE);
            s.globe.material = Material.fromType('ElevationRamp');
            s.camera.position = new Cartesian3(1.02, 0.0, 0.0);
            s.camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
            s.camera.direction = Cartesian3.negate(Cartesian3.normalize(s.camera.position, new Cartesian3()), new Cartesian3());

            // To avoid Jasmine's spec has no expectations error
            expect(true).toEqual(true);

            return expect(s).toRenderAndCall(function() {
                return pollToPromise(function() {
                    render(s.frameState, s.globe);
                    return !jasmine.matchersUtil.equals(s._context.readPixels(), [0, 0, 0, 0]);
                });
            });
        });
    });

    it('renders with multipass OIT if MRT is available', function() {
        if (scene.context.drawBuffers) {
            var s = createScene();
            if (defined(s._oit)) {
                s._oit._translucentMRTSupport = false;
                s._oit._translucentMultipassSupport = true;

                var rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);

                var rectanglePrimitive = createRectangle(rectangle, 1000.0);
                rectanglePrimitive.appearance.material.uniforms.color = new Color(1.0, 0.0, 0.0, 0.5);

                var primitives = s.primitives;
                primitives.add(rectanglePrimitive);

                s.camera.setView({ destination : rectangle });

                expect(s).toRenderAndCall(function(rgba) {
                    expect(rgba[0]).not.toEqual(0);
                    expect(rgba[1]).toEqual(0);
                    expect(rgba[2]).toEqual(0);
                });
            }

            s.destroyForSpecs();
        }
    });

    it('renders with alpha blending if floating point textures are available', function() {
        if (!scene.context.floatingPointTexture) {
            return;
        }
        var s = createScene();
        if (defined(s._oit)) {
            s._oit._translucentMRTSupport = false;
            s._oit._translucentMultipassSupport = false;

            var rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);

            var rectanglePrimitive = createRectangle(rectangle, 1000.0);
            rectanglePrimitive.appearance.material.uniforms.color = new Color(1.0, 0.0, 0.0, 0.5);

            var primitives = s.primitives;
            primitives.add(rectanglePrimitive);

            s.camera.setView({ destination : rectangle });

            expect(s).toRenderAndCall(function(rgba) {
                expect(rgba[0]).not.toEqual(0);
                expect(rgba[1]).toEqual(0);
                expect(rgba[2]).toEqual(0);
            });
        }
        s.destroyForSpecs();
    });

    it('renders map twice when in 2D', function() {
        scene.morphTo2D(0.0);

        var rectangle = Rectangle.fromDegrees(-180.0, -90.0, 180.0, 90.0);

        var rectanglePrimitive1 = createRectangle(rectangle, 0.0);
        rectanglePrimitive1.appearance.material.uniforms.color = new Color(1.0, 0.0, 0.0, 1.0);

        var primitives = scene.primitives;
        primitives.add(rectanglePrimitive1);

        scene.camera.setView({
            destination : new Cartesian3(Ellipsoid.WGS84.maximumRadius * Math.PI + 10000.0, 0.0, 10.0),
            convert : false
        });

        expect(scene).toRenderAndCall(function(rgba) {
            expect(rgba[0]).not.toEqual(0);
            expect(rgba[1]).toEqual(0);
            expect(rgba[2]).toEqual(0);
        });
    });

    it('renders map when the camera is on the IDL in 2D', function() {
        var s = createScene({
            canvas : createCanvas(5, 5)
        });
        s.morphTo2D(0.0);

        var rectangle = Rectangle.fromDegrees(-180.0, -90.0, 180.0, 90.0);

        var rectanglePrimitive1 = createRectangle(rectangle, 0.0);
        rectanglePrimitive1.appearance.material.uniforms.color = new Color(1.0, 0.0, 0.0, 1.0);

        var primitives = s.primitives;
        primitives.add(rectanglePrimitive1);

        s.camera.setView({
            destination : new Cartesian3(Ellipsoid.WGS84.maximumRadius * Math.PI, 0.0, 10.0),
            convert : false
        });

        expect(s).toRenderAndCall(function(rgba) {
            expect(rgba[0]).not.toEqual(0);
            expect(rgba[1]).toEqual(0);
            expect(rgba[2]).toEqual(0);
        });

        s.destroyForSpecs();
    });

    it('copies the globe depth', function() {
        var scene = createScene();
        if (scene.context.depthTexture) {
            var rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);

            var rectanglePrimitive = createRectangle(rectangle, 1000.0);
            rectanglePrimitive.appearance.material.uniforms.color = new Color(1.0, 0.0, 0.0, 0.5);

            var primitives = scene.primitives;
            primitives.add(rectanglePrimitive);

            scene.camera.setView({ destination : rectangle });

            var uniformState = scene.context.uniformState;

            expect(scene).toRenderAndCall(function(rgba) {
                expect(uniformState.globeDepthTexture).toBeDefined();
            });
        }

        scene.destroyForSpecs();
    });

    it('pickPosition', function() {
        if (!scene.pickPositionSupported) {
            return;
        }

        var rectangle = Rectangle.fromDegrees(-0.0001, -0.0001, 0.0001, 0.0001);
        scene.camera.setView({ destination : rectangle });

        var canvas = scene.canvas;
        var windowPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        expect(scene).toRenderAndCall(function() {
            var position = scene.pickPosition(windowPosition);
            expect(position).not.toBeDefined();

            var rectanglePrimitive = createRectangle(rectangle);
            rectanglePrimitive.appearance.material.uniforms.color = new Color(1.0, 0.0, 0.0, 1.0);

            var primitives = scene.primitives;
            primitives.add(rectanglePrimitive);
        });

        expect(scene).toRenderAndCall(function() {
            var position = scene.pickPosition(windowPosition);
            expect(position.x).toBeGreaterThan(Ellipsoid.WGS84.minimumRadius);
            expect(position.y).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
            expect(position.z).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
        });
    });

    it('pickPosition in CV', function() {
        if (!scene.pickPositionSupported) {
            return;
        }

        scene.morphToColumbusView(0.0);

        var rectangle = Rectangle.fromDegrees(-0.0001, -0.0001, 0.0001, 0.0001);
        scene.camera.setView({ destination : rectangle });

        var canvas = scene.canvas;
        var windowPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        expect(scene).toRenderAndCall(function() {
            var position = scene.pickPosition(windowPosition);
            expect(position).not.toBeDefined();

            var rectanglePrimitive = createRectangle(rectangle);
            rectanglePrimitive.appearance.material.uniforms.color = new Color(1.0, 0.0, 0.0, 1.0);

            var primitives = scene.primitives;
            primitives.add(rectanglePrimitive);
        });

        expect(scene).toRenderAndCall(function() {
            var position = scene.pickPosition(windowPosition);
            expect(position.x).toBeGreaterThan(Ellipsoid.WGS84.minimumRadius);
            expect(position.y).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
            expect(position.z).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
        });
    });

    it('pickPosition in 2D', function() {
        if (!scene.pickPositionSupported) {
            return;
        }

        scene.morphTo2D(0.0);

        var rectangle = Rectangle.fromDegrees(-0.0001, -0.0001, 0.0001, 0.0001);
        scene.camera.setView({ destination : rectangle });

        var canvas = scene.canvas;
        var windowPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        expect(scene).toRenderAndCall(function() {
            var position = scene.pickPosition(windowPosition);
            expect(position).not.toBeDefined();

            var rectanglePrimitive = createRectangle(rectangle);
            rectanglePrimitive.appearance.material.uniforms.color = new Color(1.0, 0.0, 0.0, 1.0);

            var primitives = scene.primitives;
            primitives.add(rectanglePrimitive);
        });

        expect(scene).toRenderAndCall(function() {
            var position = scene.pickPosition(windowPosition);
            expect(position.x).toBeGreaterThan(Ellipsoid.WGS84.minimumRadius);
            expect(position.y).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
            expect(position.z).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
        });
    });

    it('pickPosition returns undefined when useDepthPicking is false', function() {
        if (!scene.pickPositionSupported) {
            return;
        }

        var rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);
        scene.camera.setView({
            destination : rectangle
        });

        var canvas = scene.canvas;
        var windowPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        var rectanglePrimitive = createRectangle(rectangle);
        rectanglePrimitive.appearance.material.uniforms.color = new Color(1.0, 0.0, 0.0, 1.0);

        var primitives = scene.primitives;
        primitives.add(rectanglePrimitive);

        scene.useDepthPicking = false;
        expect(scene).toRenderAndCall(function() {
            var position = scene.pickPosition(windowPosition);
            expect(position).not.toBeDefined();
        });

        scene.useDepthPicking = true;
        expect(scene).toRenderAndCall(function() {
            var position = scene.pickPosition(windowPosition);
            expect(position).toBeDefined();
        });
    });

    it('pickPosition picks translucent geometry when pickTranslucentDepth is true', function() {
        if (!scene.pickPositionSupported) {
            return;
        }

        var rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);
        scene.camera.setView({
            destination : rectangle
        });

        var canvas = scene.canvas;
        var windowPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

        var rectanglePrimitive = scene.primitives.add(createRectangle(rectangle));
        rectanglePrimitive.appearance.material.uniforms.color = new Color(1.0, 0.0, 0.0, 0.5);

        scene.useDepthPicking = true;
        scene.pickTranslucentDepth = false;
        expect(scene).toRenderAndCall(function() {
            var position = scene.pickPosition(windowPosition);
            expect(position).not.toBeDefined();
        });

        scene.pickTranslucentDepth = true;
        expect(scene).toRenderAndCall(function() {
            var position = scene.pickPosition(windowPosition);
            expect(position).toBeDefined();
        });
    });

    it('pickPosition caches results per frame',function(){
        if (!scene.pickPositionSupported) {
            return;
        }

        var rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);
        scene.camera.setView({ destination : rectangle });

        var canvas = scene.canvas;
        var windowPosition = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        spyOn(SceneTransforms, 'transformWindowToDrawingBuffer').and.callThrough();

        expect(scene).toRenderAndCall(function() {
            scene.pickPosition(windowPosition);
            expect(SceneTransforms.transformWindowToDrawingBuffer).toHaveBeenCalled();

            scene.pickPosition(windowPosition);
            expect(SceneTransforms.transformWindowToDrawingBuffer.calls.count()).toEqual(1);

            var rectanglePrimitive = createRectangle(rectangle);
            rectanglePrimitive.appearance.material.uniforms.color = new Color(1.0, 0.0, 0.0, 1.0);

            var primitives = scene.primitives;
            primitives.add(rectanglePrimitive);
        });

        expect(scene).toRenderAndCall(function() {
            scene.pickPosition(windowPosition);
            expect(SceneTransforms.transformWindowToDrawingBuffer.calls.count()).toEqual(2);

            scene.pickPosition(windowPosition);
            expect(SceneTransforms.transformWindowToDrawingBuffer.calls.count()).toEqual(2);
        });
    });

    it('pickPosition throws without windowPosition', function() {
        expect(function() {
            scene.pickPosition();
        }).toThrowDeveloperError();
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

    it('alwayas raises preUpdate event prior to updating', function() {
        var s = createScene();

        var spyListener = jasmine.createSpy('listener');
        s.preUpdate.addEventListener(spyListener);

        s.render();

        expect(spyListener.calls.count()).toBe(1);

        s.requestRenderMode = true;
        s.maximumRenderTimeChange = undefined;

        s.render();

        expect(spyListener.calls.count()).toBe(2);

        s.destroyForSpecs();
    });

    it('always raises preUpdate event after updating', function() {
        var s = createScene();

        var spyListener = jasmine.createSpy('listener');
        s.preUpdate.addEventListener(spyListener);

        s.render();

        expect(spyListener.calls.count()).toBe(1);

        s.requestRenderMode = true;
        s.maximumRenderTimeChange = undefined;

        s.render();

        expect(spyListener.calls.count()).toBe(2);

        s.destroyForSpecs();
    });

    it('raises the preRender event prior to rendering only if the scene renders', function() {
        var s = createScene();

        var spyListener = jasmine.createSpy('listener');
        s.preRender.addEventListener(spyListener);

        s.render();

        expect(spyListener.calls.count()).toBe(1);

        s.requestRenderMode = true;
        s.maximumRenderTimeChange = undefined;

        s.render();

        expect(spyListener.calls.count()).toBe(1);

        s.destroyForSpecs();
    });

    it('raises the postRender event after rendering if the scene rendered', function() {
        var s = createScene();

        var spyListener = jasmine.createSpy('listener');
        s.postRender.addEventListener(spyListener);

        s.render();

        expect(spyListener.calls.count()).toBe(1);

        s.requestRenderMode = true;
        s.maximumRenderTimeChange = undefined;

        s.render();

        expect(spyListener.calls.count()).toBe(1);

        s.destroyForSpecs();
    });

    it('raises the cameraMoveStart event after moving the camera', function() {
        var s = createScene();
        s.render();

        var spyListener = jasmine.createSpy('listener');
        s.camera.moveStart.addEventListener(spyListener);
        s._cameraStartFired = false; // reset this value after camera changes for initial render trigger the event

        s.camera.moveLeft();
        s.render();

        expect(spyListener.calls.count()).toBe(1);

        s.destroyForSpecs();
    });

    it('raises the cameraMoveEvent event when the camera stops moving', function() {
        var s = createScene();
        s.render();

        var spyListener = jasmine.createSpy('listener');
        s.camera.moveEnd.addEventListener(spyListener);

        s.cameraEventWaitTime = 0.0;
        s.camera.moveLeft();
        s.render();
        s.render();

        expect(spyListener.calls.count()).toBe(1);

        s.destroyForSpecs();
    });

    it('raises the camera changed event on direction changed', function() {
        var s = createScene();

        var spyListener = jasmine.createSpy('listener');
        s.camera.changed.addEventListener(spyListener);

        s.initializeFrame();
        s.render();

        s.camera.lookLeft(s.camera.frustum.fov * (s.camera.percentageChanged + 0.1));

        s.initializeFrame();
        s.render();

        expect(spyListener.calls.count()).toBe(1);

        var args = spyListener.calls.allArgs();
        expect(args.length).toEqual(1);
        expect(args[0].length).toEqual(1);
        expect(args[0][0]).toBeGreaterThan(s.camera.percentageChanged);

        s.destroyForSpecs();
    });

    it('raises the camera changed event on position changed', function() {
        var s = createScene();

        var spyListener = jasmine.createSpy('listener');
        s.camera.changed.addEventListener(spyListener);

        s.initializeFrame();
        s.render();

        s.camera.moveLeft(s.camera.positionCartographic.height * (s.camera.percentageChanged + 0.1));

        s.initializeFrame();
        s.render();

        expect(spyListener.calls.count()).toBe(1);

        var args = spyListener.calls.allArgs();
        expect(args.length).toEqual(1);
        expect(args[0].length).toEqual(1);
        expect(args[0][0]).toBeGreaterThan(s.camera.percentageChanged);

        s.destroyForSpecs();
    });

    it('raises the camera changed event in 2D', function() {
        var s = createScene();
        s.morphTo2D(0);

        var spyListener = jasmine.createSpy('listener');
        s.camera.changed.addEventListener(spyListener);

        s.initializeFrame();
        s.render();

        s.camera.moveLeft(s.camera.positionCartographic.height * (s.camera.percentageChanged + 0.1));

        s.initializeFrame();
        s.render();

        expect(spyListener.calls.count()).toBe(1);

        var args = spyListener.calls.allArgs();
        expect(args.length).toEqual(1);
        expect(args[0].length).toEqual(1);
        expect(args[0][0]).toBeGreaterThan(s.camera.percentageChanged);

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

    it('does not throw with debugShowCommands', function() {
        var s = createScene();
        if (s.context.drawBuffers) {
            s.debugShowCommands = true;

            var rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);

            var rectanglePrimitive = createRectangle(rectangle, 1000.0);
            rectanglePrimitive.appearance.material.uniforms.color = new Color(1.0, 0.0, 0.0, 0.5);

            var primitives = s.primitives;
            primitives.add(rectanglePrimitive);

            s.camera.setView({ destination : rectangle });

            expect(function() {
                s.renderForSpecs();
            }).not.toThrowRuntimeError();
        }
        s.destroyForSpecs();
    });

    it('does not throw with debugShowFrustums', function() {
        var s = createScene();
        if (s.context.drawBuffers) {
            s.debugShowFrustums = true;

            var rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);

            var rectanglePrimitive = createRectangle(rectangle, 1000.0);
            rectanglePrimitive.appearance.material.uniforms.color = new Color(1.0, 0.0, 0.0, 0.5);

            var primitives = s.primitives;
            primitives.add(rectanglePrimitive);

            s.camera.setView({ destination : rectangle });

            expect(function() {
                s.renderForSpecs();
            }).not.toThrowRuntimeError();
        }
        s.destroyForSpecs();
    });

    it('throws when minimumDisableDepthTestDistance is set less than 0.0', function() {
        expect(function() {
            scene.minimumDisableDepthTestDistance = -1.0;
        }).toThrowDeveloperError();
    });

    it('converts to canvas coordinates',function(){
        var mockPosition = new Cartesian3();
        spyOn(SceneTransforms, 'wgs84ToWindowCoordinates');
        scene.cartesianToCanvasCoordinates(mockPosition);

        expect(SceneTransforms.wgs84ToWindowCoordinates).toHaveBeenCalledWith(scene, mockPosition, undefined);
    });

    it('converts to canvas coordinates and return it in a variable',function(){
        var result = new Cartesian2();
        var mockPosition = new Cartesian3();
        spyOn(SceneTransforms, 'wgs84ToWindowCoordinates');
        scene.cartesianToCanvasCoordinates(mockPosition, result);

        expect(SceneTransforms.wgs84ToWindowCoordinates).toHaveBeenCalledWith(scene, mockPosition, result);
    });

    it('Gets imageryLayers', function() {
        var scene = createScene();
        var globe = scene.globe = new Globe(Ellipsoid.UNIT_SPHERE);
        expect(scene.imageryLayers).toBe(globe.imageryLayers);

        scene.globe = undefined;
        expect(scene.imageryLayers).toBeUndefined();

        scene.destroyForSpecs();
    });

    it('Gets terrainProvider', function() {
        var scene = createScene();
        var globe = scene.globe = new Globe(Ellipsoid.UNIT_SPHERE);
        expect(scene.terrainProvider).toBe(globe.terrainProvider);

        scene.globe = undefined;
        expect(scene.terrainProvider).toBeUndefined();

        scene.destroyForSpecs();
    });

    it('Sets terrainProvider', function() {
        var scene = createScene();
        var globe = scene.globe = new Globe(Ellipsoid.UNIT_SPHERE);
        scene.terrainProvider = new CesiumTerrainProvider({
            url: '//terrain/tiles'
        });

        expect(scene.terrainProvider).toBe(globe.terrainProvider);

        scene.globe = undefined;
        expect(function() {
            scene.terrainProvider = new CesiumTerrainProvider({
                url: '//newTerrain/tiles'
            });
        }).not.toThrow();

        scene.destroyForSpecs();
    });

    it('Gets terrainProviderChanged', function() {
        var scene = createScene();
        var globe = scene.globe = new Globe(Ellipsoid.UNIT_SPHERE);
        expect(scene.terrainProviderChanged).toBe(globe.terrainProviderChanged);

        scene.globe = undefined;
        expect(scene.terrainProviderChanged).toBeUndefined();

        scene.destroyForSpecs();
    });

    it('Sets material', function() {
        var scene = createScene();
        var globe = scene.globe = new Globe(Ellipsoid.UNIT_SPHERE);
        var material = Material.fromType('ElevationContour');
        globe.material = material;
        expect(globe.material).toBe(material);

        globe.material = undefined;
        expect(globe.material).toBeUndefined();

        scene.destroyForSpecs();
    });

    var scratchTime = new JulianDate();

    it('doesn\'t render scene if requestRenderMode is enabled', function() {
        var scene = createScene();

        scene.renderForSpecs();

        var lastRenderTime = JulianDate.clone(scene.lastRenderTime, scratchTime);
        expect(lastRenderTime).toBeDefined();

        scene.requestRenderMode = true;
        scene.maximumRenderTimeChange = undefined;
        scene.renderForSpecs();
        expect(scene.lastRenderTime).toEqualEpsilon(lastRenderTime, CesiumMath.EPSILON15);

        scene.destroyForSpecs();
    });

    it('requestRender causes a new frame to be rendered in requestRenderMode', function() {
        var scene = createScene();

        scene.renderForSpecs();

        var lastRenderTime = JulianDate.clone(scene.lastRenderTime, scratchTime);
        expect(lastRenderTime).toBeDefined();
        expect(scene._renderRequested).toBe(false);

        scene.requestRenderMode = true;
        scene.maximumRenderTimeChange = undefined;

        scene.requestRender();
        expect(scene._renderRequested).toBe(true);

        scene.renderForSpecs();
        expect(scene.lastRenderTime).not.toEqual(lastRenderTime);

        scene.destroyForSpecs();
    });

    it('moving the camera causes a new frame to be rendered in requestRenderMode', function() {
        var scene = createScene();

        scene.renderForSpecs();

        var lastRenderTime = JulianDate.clone(scene.lastRenderTime, scratchTime);
        expect(lastRenderTime).toBeDefined();
        expect(scene._renderRequested).toBe(false);

        scene.requestRenderMode = true;
        scene.maximumRenderTimeChange = undefined;

        scene.camera.moveLeft();

        scene.renderForSpecs();
        expect(scene.lastRenderTime).not.toEqual(lastRenderTime);

        scene.destroyForSpecs();
    });

    it('changing the camera frustum does not cause continuous rendering in requestRenderMode', function() {
        var scene = createScene();

        scene.renderForSpecs();

        var lastRenderTime = JulianDate.clone(scene.lastRenderTime, scratchTime);
        expect(lastRenderTime).toBeDefined();
        expect(scene._renderRequested).toBe(false);

        scene.requestRenderMode = true;
        scene.maximumRenderTimeChange = undefined;

        scene.camera.frustum.near *= 1.1;

        // Render once properly
        scene.renderForSpecs();
        expect(scene.lastRenderTime).not.toEqual(lastRenderTime);

        // Render again - but this time nothing should happen.
        lastRenderTime = JulianDate.clone(scene.lastRenderTime, scratchTime);
        scene.renderForSpecs();
        expect(scene.lastRenderTime).toEqual(lastRenderTime);

        scene.destroyForSpecs();
    });

    it('successful completed requests causes a new frame to be rendered in requestRenderMode', function() {
        var scene = createScene();

        scene.renderForSpecs();

        var lastRenderTime = JulianDate.clone(scene.lastRenderTime, scratchTime);
        expect(lastRenderTime).toBeDefined();
        expect(scene._renderRequested).toBe(false);

        scene.requestRenderMode = true;
        scene.maximumRenderTimeChange = undefined;

        RequestScheduler.requestCompletedEvent.raiseEvent();

        scene.renderForSpecs();

        expect(scene._renderRequested).toBe(true);

        scene.renderForSpecs();
        expect(scene.lastRenderTime).not.toEqual(lastRenderTime);

        scene.destroyForSpecs();
    });

    it('data returning from a web worker causes a new frame to be rendered in requestRenderMode', function() {
        var scene = createScene();

        scene.renderForSpecs();

        var lastRenderTime = JulianDate.clone(scene.lastRenderTime, scratchTime);
        expect(lastRenderTime).toBeDefined();
        expect(scene._renderRequested).toBe(false);

        scene.requestRenderMode = true;
        scene.maximumRenderTimeChange = undefined;

        TaskProcessor.taskCompletedEvent.raiseEvent();

        scene.renderForSpecs();

        expect(scene._renderRequested).toBe(true);

        scene.renderForSpecs();
        expect(scene.lastRenderTime).not.toEqual(lastRenderTime);

        scene.destroyForSpecs();
    });

    it('Executing an after render function causes a new frame to be rendered in requestRenderMode', function() {
        var scene = createScene();

        scene.renderForSpecs();

        var lastRenderTime = JulianDate.clone(scene.lastRenderTime, scratchTime);
        expect(lastRenderTime).toBeDefined();
        expect(scene._renderRequested).toBe(false);

        scene.requestRenderMode = true;
        scene.maximumRenderTimeChange = undefined;

        var functionCalled = false;
        scene._frameState.afterRender.push(function () {
            functionCalled = true;
        });

        scene.renderForSpecs();

        expect(functionCalled).toBe(true);
        expect(scene._renderRequested).toBe(true);

        scene.renderForSpecs();
        expect(scene.lastRenderTime).not.toEqual(lastRenderTime);

        scene.destroyForSpecs();
    });

    it('Globe tile loading triggers a new frame to be rendered in requestRenderMode', function() {
        var scene = createScene();

        scene.renderForSpecs();

        var lastRenderTime = JulianDate.clone(scene.lastRenderTime, scratchTime);
        expect(lastRenderTime).toBeDefined();
        expect(scene._renderRequested).toBe(false);

        scene.requestRenderMode = true;
        scene.maximumRenderTimeChange = undefined;

        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var globe = new Globe(ellipsoid);
        scene.globe = globe;

        scene.requestRender();
        Object.defineProperty(globe, 'tilesLoaded', { value: false });
        scene.renderForSpecs();
        lastRenderTime = JulianDate.clone(scene.lastRenderTime, scratchTime);

        expect(scene._renderRequested).toBe(true);
        scene.renderForSpecs();
        expect(scene.lastRenderTime).not.toEqual(lastRenderTime);

        scene.destroyForSpecs();
    });

    it('Globe imagery updates triggers a new frame to be rendered in requestRenderMode', function() {
        var scene = createScene();

        scene.renderForSpecs();

        var lastRenderTime = JulianDate.clone(scene.lastRenderTime, scratchTime);
        expect(lastRenderTime).toBeDefined();
        expect(scene._renderRequested).toBe(false);

        scene.requestRenderMode = true;
        scene.maximumRenderTimeChange = undefined;

        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var globe = new Globe(ellipsoid);
        scene.globe = globe;
        globe.imageryLayersUpdatedEvent.raiseEvent();

        scene.renderForSpecs();

        expect(scene._renderRequested).toBe(true);

        scene.renderForSpecs();
        expect(scene.lastRenderTime).not.toEqual(lastRenderTime);

        scene.destroyForSpecs();
    });

    it('Globe changing terrain providers triggers a new frame to be rendered in requestRenderMode', function() {
        var scene = createScene();

        scene.renderForSpecs();

        var lastRenderTime = JulianDate.clone(scene.lastRenderTime, scratchTime);
        expect(lastRenderTime).toBeDefined();
        expect(scene._renderRequested).toBe(false);

        scene.requestRenderMode = true;
        scene.maximumRenderTimeChange = undefined;

        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var globe = new Globe(ellipsoid);
        scene.globe = globe;
        globe.terrainProviderChanged.raiseEvent();

        scene.renderForSpecs();

        expect(scene._renderRequested).toBe(true);

        scene.renderForSpecs();
        expect(scene.lastRenderTime).not.toEqual(lastRenderTime);

        scene.destroyForSpecs();
    });

    it('scene morphing causes a new frame to be rendered in requestRenderMode', function() {
        var scene = createScene();
        scene.renderForSpecs();

        var lastRenderTime = JulianDate.clone(scene.lastRenderTime, scratchTime);
        expect(lastRenderTime).toBeDefined();
        expect(scene._renderRequested).toBe(false);

        scene.requestRenderMode = true;
        scene.maximumRenderTimeChange = undefined;

        scene.morphTo2D(1.0);
        scene.renderForSpecs(JulianDate.addSeconds(lastRenderTime, 0.5, new JulianDate()));
        expect(scene.lastRenderTime).not.toEqual(lastRenderTime);

        scene.completeMorph();
        scene.renderForSpecs();
        lastRenderTime = JulianDate.clone(scene.lastRenderTime, scratchTime);

        scene.renderForSpecs();
        expect(scene.lastRenderTime).toEqualEpsilon(lastRenderTime, CesiumMath.EPSILON15);
        lastRenderTime = JulianDate.clone(scene.lastRenderTime, scratchTime);

        scene.morphToColumbusView(1.0);
        scene.renderForSpecs(JulianDate.addSeconds(lastRenderTime, 0.5, new JulianDate()));
        expect(scene.lastRenderTime).not.toEqual(lastRenderTime);

        scene.completeMorph();
        scene.renderForSpecs();
        lastRenderTime = JulianDate.clone(scene.lastRenderTime, scratchTime);

        scene.renderForSpecs();
        expect(scene.lastRenderTime).toEqualEpsilon(lastRenderTime, CesiumMath.EPSILON15);
        lastRenderTime = JulianDate.clone(scene.lastRenderTime, scratchTime);

        scene.morphTo3D(1.0);
        scene.renderForSpecs(JulianDate.addSeconds(lastRenderTime, 0.5, new JulianDate()));
        expect(scene.lastRenderTime).not.toEqual(lastRenderTime);

        scene.completeMorph();
        scene.renderForSpecs();
        lastRenderTime = JulianDate.clone(scene.lastRenderTime, scratchTime);

        scene.renderForSpecs();
        expect(scene.lastRenderTime).toEqualEpsilon(lastRenderTime, CesiumMath.EPSILON15);

        scene.destroyForSpecs();
    });

    it('time change exceeding maximumRenderTimeChange causes a new frame to be rendered in requestRenderMode', function() {
        var scene = createScene();

        scene.renderForSpecs();

        var lastRenderTime = JulianDate.clone(scene.lastRenderTime, scratchTime);
        expect(lastRenderTime).toBeDefined();
        expect(scene._renderRequested).toBe(false);

        scene.requestRenderMode = true;

        scene.renderForSpecs(lastRenderTime);
        expect(scene.lastRenderTime).toEqual(lastRenderTime);

        scene.maximumRenderTimeChange = 100.0;

        scene.renderForSpecs(JulianDate.addSeconds(lastRenderTime, 50.0, new JulianDate()));
        expect(scene.lastRenderTime).toEqualEpsilon(lastRenderTime, CesiumMath.EPSILON15);

        scene.renderForSpecs(JulianDate.addSeconds(lastRenderTime, 150.0, new JulianDate()));
        expect(scene.lastRenderTime).not.toEqual(lastRenderTime);

        scene.destroyForSpecs();
    });

    it('undefined maximumRenderTimeChange will not cause a new frame to be rendered in requestRenderMode', function() {
        var scene = createScene();

        scene.renderForSpecs();

        var lastRenderTime = JulianDate.clone(scene.lastRenderTime, scratchTime);
        expect(lastRenderTime).toBeDefined();
        expect(scene._renderRequested).toBe(false);

        scene.requestRenderMode = true;
        scene.maximumRenderTimeChange = undefined;

        var farFuture = JulianDate.addDays(lastRenderTime, 10000, new JulianDate());

        scene.renderForSpecs();
        scene.renderForSpecs(farFuture);

        expect(scene.lastRenderTime).toEqual(lastRenderTime);

        scene.destroyForSpecs();
    });

    it('forceRender renders a scene regardless of whether a render was requested', function() {
        var scene = createScene();

        scene.renderForSpecs();

        var lastRenderTime = JulianDate.clone(scene.lastRenderTime, scratchTime);
        expect(lastRenderTime).toBeDefined();
        expect(scene._renderRequested).toBe(false);

        scene.requestRenderMode = true;
        scene.maximumRenderTimeChange = undefined;

        scene.forceRender();
        expect(scene.lastRenderTime).not.toEqual(lastRenderTime);

        scene.destroyForSpecs();
    });

    function getFrustumCommandsLength(scene) {
        var commandsLength = 0;
        var frustumCommandsList = scene.frustumCommandsList;
        var frustumsLength = frustumCommandsList.length;
        for (var i = 0; i < frustumsLength; ++i) {
            var frustumCommands = frustumCommandsList[i];
            for (var j = 0; j < Pass.NUMBER_OF_PASSES; ++j) {
                commandsLength += frustumCommands.indices[j];
            }
        }
        return commandsLength;
    }

    it('occludes primitive', function() {
        var scene = createScene();
        scene.globe = new Globe(Ellipsoid.WGS84);

        var rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);
        var rectanglePrimitive = createRectangle(rectangle, 10);
        scene.primitives.add(rectanglePrimitive);

        scene.camera.setView({
            destination: new Cartesian3(-588536.1057451078, -10512475.371849751, 6737159.100747835),
            orientation: new HeadingPitchRoll(6.283185307179586, -1.5688261558859757, 0.0)
        });
        scene.renderForSpecs();
        expect(getFrustumCommandsLength(scene)).toBe(1);

        scene.camera.setView({
            destination: new Cartesian3(-5754647.167415793, 14907694.100240812, -483807.2406259497),
            orientation: new HeadingPitchRoll(6.283185307179586, -1.5698869547885104, 0.0)
        });
        scene.renderForSpecs();
        expect(getFrustumCommandsLength(scene)).toBe(0);

        // Still on opposite side of globe but now show is false, the command should not be occluded anymore
        scene.globe.show = false;
        scene.renderForSpecs();
        expect(getFrustumCommandsLength(scene)).toBe(1);

        scene.destroyForSpecs();
    });

}, 'WebGL');
