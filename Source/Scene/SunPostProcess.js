/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/Cartesian2',
        '../Core/Cartesian4',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/PixelFormat',
        '../Core/Transforms',
        '../Renderer/ClearCommand',
        '../Renderer/Framebuffer',
        '../Renderer/PassState',
        '../Renderer/PixelDatatype',
        '../Renderer/Renderbuffer',
        '../Renderer/RenderbufferFormat',
        '../Renderer/RenderState',
        '../Renderer/Texture',
        '../Shaders/PostProcessFilters/AdditiveBlend',
        '../Shaders/PostProcessFilters/BrightPass',
        '../Shaders/PostProcessFilters/GaussianBlur1D',
        '../Shaders/PostProcessFilters/PassThrough'
    ], function(
        BoundingRectangle,
        Cartesian2,
        Cartesian4,
        Color,
        defaultValue,
        defined,
        destroyObject,
        CesiumMath,
        Matrix4,
        PixelFormat,
        Transforms,
        ClearCommand,
        Framebuffer,
        PassState,
        PixelDatatype,
        Renderbuffer,
        RenderbufferFormat,
        RenderState,
        Texture,
        AdditiveBlend,
        BrightPass,
        GaussianBlur1D,
        PassThrough) {
    'use strict';

    function SunPostProcess() {
        this._fbo = undefined;

        this._downSampleFBO1 = undefined;
        this._downSampleFBO2 = undefined;

        this._clearFBO1Command = undefined;
        this._clearFBO2Command = undefined;

        this._downSampleCommand = undefined;
        this._brightPassCommand = undefined;
        this._blurXCommand = undefined;
        this._blurYCommand = undefined;
        this._blendCommand = undefined;
        this._fullScreenCommand = undefined;

        this._downSamplePassState = new PassState();
        this._downSamplePassState.scissorTest = {
            enable : true,
            rectangle : new BoundingRectangle()
        };

        this._upSamplePassState = new PassState();
        this._upSamplePassState.scissorTest = {
            enabled : true,
            rectangle : new BoundingRectangle()
        };

        this._uCenter = new Cartesian2();
        this._uRadius = undefined;

        this._blurStep = new Cartesian2();
    }

    SunPostProcess.prototype.clear = function(context, color) {
        var clear = this._clearFBO1Command;
        Color.clone(defaultValue(color, Color.BLACK), clear.color);
        clear.execute(context);

        clear = this._clearFBO2Command;
        Color.clone(defaultValue(color, Color.BLACK), clear.color);
        clear.execute(context);
    };

    SunPostProcess.prototype.execute = function(context, framebuffer) {
        this._downSampleCommand.execute(context, this._downSamplePassState);
        this._brightPassCommand.execute(context, this._downSamplePassState);
        this._blurXCommand.execute(context, this._downSamplePassState);
        this._blurYCommand.execute(context, this._downSamplePassState);

        this._fullScreenCommand.framebuffer = framebuffer;
        this._blendCommand.framebuffer = framebuffer;

        this._fullScreenCommand.execute(context);
        this._blendCommand.execute(context, this._upSamplePassState);
    };

    var viewportBoundingRectangle  = new BoundingRectangle();
    var downSampleViewportBoundingRectangle = new BoundingRectangle();
    var sunPositionECScratch = new Cartesian4();
    var sunPositionWCScratch = new Cartesian2();
    var sizeScratch = new Cartesian2();
    var postProcessMatrix4Scratch= new Matrix4();

    SunPostProcess.prototype.update = function(passState) {
        var context = passState.context;
        var viewport = passState.viewport;
        var width = context.drawingBufferWidth;
        var height = context.drawingBufferHeight;

        var that = this;

        if (!defined(this._downSampleCommand)) {
            this._clearFBO1Command = new ClearCommand({
                color : new Color()
            });
            this._clearFBO2Command = new ClearCommand({
                color : new Color()
            });

            var uniformMap = {};

            this._downSampleCommand = context.createViewportQuadCommand(PassThrough, {
                uniformMap : uniformMap,
                owner : this
            });

            uniformMap = {
                u_avgLuminance : function() {
                    // A guess at the average luminance across the entire scene
                    return 0.5;
                },
                u_threshold : function() {
                    return 0.25;
                },
                u_offset : function() {
                    return 0.1;
                }
            };

            this._brightPassCommand = context.createViewportQuadCommand(BrightPass, {
                uniformMap : uniformMap,
                owner : this
            });

            var delta = 1.0;
            var sigma = 2.0;

            uniformMap = {
                delta : function() {
                    return delta;
                },
                sigma : function() {
                    return sigma;
                },
                direction : function() {
                    return 0.0;
                }
            };

            this._blurXCommand = context.createViewportQuadCommand(GaussianBlur1D, {
                uniformMap : uniformMap,
                owner : this
            });

            uniformMap = {
                delta : function() {
                    return delta;
                },
                sigma : function() {
                    return sigma;
                },
                direction : function() {
                    return 1.0;
                }
            };

            this._blurYCommand = context.createViewportQuadCommand(GaussianBlur1D, {
                uniformMap : uniformMap,
                owner : this
            });

            uniformMap = {
                u_center : function() {
                    return that._uCenter;
                },
                u_radius : function() {
                    return that._uRadius;
                }
            };

            this._blendCommand = context.createViewportQuadCommand(AdditiveBlend, {
                uniformMap : uniformMap,
                owner : this
            });

            uniformMap = {};

            this._fullScreenCommand = context.createViewportQuadCommand(PassThrough, {
                uniformMap : uniformMap,
                owner : this
            });
        }

        var downSampleWidth = Math.pow(2.0, Math.ceil(Math.log(width) / Math.log(2)) - 2.0);
        var downSampleHeight = Math.pow(2.0, Math.ceil(Math.log(height) / Math.log(2)) - 2.0);
        var downSampleSize = Math.max(downSampleWidth, downSampleHeight);

        var downSampleViewport = downSampleViewportBoundingRectangle;
        downSampleViewport.width = downSampleSize;
        downSampleViewport.height = downSampleSize;

        var fbo = this._fbo;
        var colorTexture = (defined(fbo) && fbo.getColorTexture(0)) || undefined;
        if (!defined(colorTexture) || colorTexture.width !== width || colorTexture.height !== height) {
            fbo = fbo && fbo.destroy();
            this._downSampleFBO1 = this._downSampleFBO1 && this._downSampleFBO1.destroy();
            this._downSampleFBO2 = this._downSampleFBO2 && this._downSampleFBO2.destroy();

            this._blurStep.x = this._blurStep.y = 1.0 / downSampleSize;

            var colorTextures = [new Texture({
                context : context,
                width : width,
                height : height
            })];

            if (context.depthTexture) {
                fbo = this._fbo = new Framebuffer({
                    context : context,
                    colorTextures :colorTextures,
                    depthTexture : new Texture({
                        context : context,
                        width : width,
                        height : height,
                        pixelFormat : PixelFormat.DEPTH_COMPONENT,
                        pixelDatatype : PixelDatatype.UNSIGNED_SHORT
                    })
                });
            } else {
                fbo = this._fbo = new Framebuffer({
                    context : context,
                    colorTextures : colorTextures,
                    depthRenderbuffer : new Renderbuffer({
                        context : context,
                        format : RenderbufferFormat.DEPTH_COMPONENT16
                    })
                });
            }

            this._downSampleFBO1 = new Framebuffer({
                context : context,
                colorTextures : [new Texture({
                    context : context,
                    width : downSampleSize,
                    height : downSampleSize
                })]
            });
            this._downSampleFBO2 = new Framebuffer({
                context : context,
                colorTextures : [new Texture({
                    context : context,
                    width : downSampleSize,
                    height : downSampleSize
                })]
            });

            this._clearFBO1Command.framebuffer = this._downSampleFBO1;
            this._clearFBO2Command.framebuffer = this._downSampleFBO2;
            this._downSampleCommand.framebuffer = this._downSampleFBO1;
            this._brightPassCommand.framebuffer = this._downSampleFBO2;
            this._blurXCommand.framebuffer = this._downSampleFBO1;
            this._blurYCommand.framebuffer = this._downSampleFBO2;

            var downSampleRenderState = RenderState.fromCache({
                viewport : downSampleViewport
            });

            this._downSampleCommand.uniformMap.u_texture = function() {
                return fbo.getColorTexture(0);
            };
            this._downSampleCommand.renderState = downSampleRenderState;

            this._brightPassCommand.uniformMap.u_texture = function() {
                return that._downSampleFBO1.getColorTexture(0);
            };
            this._brightPassCommand.renderState = downSampleRenderState;

            this._blurXCommand.uniformMap.u_texture = function() {
                return that._downSampleFBO2.getColorTexture(0);
            };
            this._blurXCommand.uniformMap.u_step = function() {
                return that._blurStep;
            };
            this._blurXCommand.renderState = downSampleRenderState;

            this._blurYCommand.uniformMap.u_texture = function() {
                return that._downSampleFBO1.getColorTexture(0);
            };
            this._blurYCommand.uniformMap.u_step = function() {
                return that._blurStep;
            };
            this._blurYCommand.renderState = downSampleRenderState;

            var upSampledViewport = viewportBoundingRectangle;
            upSampledViewport.width = width;
            upSampledViewport.height = height;

            var upSampleRenderState = RenderState.fromCache({ viewport : upSampledViewport });

            this._blendCommand.uniformMap.u_texture0 = function() {
                return fbo.getColorTexture(0);
            };
            this._blendCommand.uniformMap.u_texture1 = function() {
                return that._downSampleFBO2.getColorTexture(0);
            };
            this._blendCommand.renderState = upSampleRenderState;

            this._fullScreenCommand.uniformMap.u_texture = function() {
                return fbo.getColorTexture(0);
            };
            this._fullScreenCommand.renderState = upSampleRenderState;
        }

        var us = context.uniformState;
        var sunPosition = us.sunPositionWC;
        var viewMatrix = us.view;
        var viewProjectionMatrix = us.viewProjection;
        var projectionMatrix = us.projection;

        // create up sampled render state
        var viewportTransformation = Matrix4.computeViewportTransformation(viewport, 0.0, 1.0, postProcessMatrix4Scratch);
        var sunPositionEC = Matrix4.multiplyByPoint(viewMatrix, sunPosition, sunPositionECScratch);
        var sunPositionWC = Transforms.pointToGLWindowCoordinates(viewProjectionMatrix, viewportTransformation, sunPosition, sunPositionWCScratch);

        sunPositionEC.x += CesiumMath.SOLAR_RADIUS;
        var limbWC = Transforms.pointToGLWindowCoordinates(projectionMatrix, viewportTransformation, sunPositionEC, sunPositionEC);
        var sunSize = Cartesian2.magnitude(Cartesian2.subtract(limbWC, sunPositionWC, limbWC)) * 30.0 * 2.0;

        var size = sizeScratch;
        size.x = sunSize;
        size.y = sunSize;

        var scissorRectangle = this._upSamplePassState.scissorTest.rectangle;
        scissorRectangle.x = Math.max(sunPositionWC.x - size.x * 0.5, 0.0);
        scissorRectangle.y = Math.max(sunPositionWC.y - size.y * 0.5, 0.0);
        scissorRectangle.width = Math.min(size.x, width);
        scissorRectangle.height = Math.min(size.y, height);

        this._uCenter = Cartesian2.clone(sunPositionWC, this._uCenter);
        this._uRadius = Math.max(size.x, size.y) * 0.5;

        // create down sampled render state
        viewportTransformation = Matrix4.computeViewportTransformation(downSampleViewport, 0.0, 1.0, postProcessMatrix4Scratch);
        sunPositionWC = Transforms.pointToGLWindowCoordinates(viewProjectionMatrix, viewportTransformation, sunPosition, sunPositionWCScratch);

        size.x *= downSampleWidth / width;
        size.y *= downSampleHeight / height;

        scissorRectangle = this._downSamplePassState.scissorTest.rectangle;
        scissorRectangle.x = Math.max(sunPositionWC.x - size.x * 0.5, 0.0);
        scissorRectangle.y = Math.max(sunPositionWC.y - size.y * 0.5, 0.0);
        scissorRectangle.width = Math.min(size.x, width);
        scissorRectangle.height = Math.min(size.y, height);

        this._downSamplePassState.context = context;
        this._upSamplePassState.context = context;

        return this._fbo;
    };

    SunPostProcess.prototype.isDestroyed = function() {
        return false;
    };

    SunPostProcess.prototype.destroy = function() {
        this._fbo = this._fbo && this._fbo.destroy();
        this._downSampleFBO1 = this._downSampleFBO1 && this._downSampleFBO1.destroy();
        this._downSampleFBO2 = this._downSampleFBO2 && this._downSampleFBO2.destroy();
        this._downSampleCommand = this._downSampleCommand && this._downSampleCommand.shaderProgram && this._downSampleCommand.shaderProgram.destroy();
        this._brightPassCommand = this._brightPassCommand && this._brightPassCommand.shaderProgram && this._brightPassCommand.shaderProgram.destroy();
        this._blurXCommand = this._blurXCommand && this._blurXCommand.shaderProgram && this._blurXCommand.shaderProgram.destroy();
        this._blurYCommand = this._blurYCommand && this._blurYCommand.shaderProgram && this._blurYCommand.shaderProgram.destroy();
        this._blendCommand = this._blendCommand && this._blendCommand.shaderProgram && this._blendCommand.shaderProgram.destroy();
        this._fullScreenCommand = this._fullScreenCommand && this._fullScreenCommand.shaderProgram && this._fullScreenCommand.shaderProgram.destroy();
        return destroyObject(this);
    };

    return SunPostProcess;
});
