define([
        '../Core/BoundingRectangle',
        '../Core/Cartesian2',
        '../Core/Cartesian4',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/Transforms',
        '../Shaders/PostProcessFilters/AdditiveBlend',
        '../Shaders/PostProcessFilters/BrightPass',
        '../Shaders/PostProcessFilters/GaussianBlur1D',
        '../Shaders/PostProcessFilters/PassThrough',
        './PostProcess',
        './PostProcessComposite',
        './PostProcessSampleMode',
        './PostProcessTextureCache',
        './SceneFramebuffer'
    ], function(
        BoundingRectangle,
        Cartesian2,
        Cartesian4,
        defined,
        destroyObject,
        CesiumMath,
        Matrix4,
        Transforms,
        AdditiveBlend,
        BrightPass,
        GaussianBlur1D,
        PassThrough,
        PostProcess,
        PostProcessComposite,
        PostProcessSampleMode,
        PostProcessTextureCache,
        SceneFramebuffer) {
    'use strict';

    function SunPostProcess() {
        this._sceneFramebuffer = new SceneFramebuffer();

        var scale = 0.125;
        var processes = new Array(6);

        processes[0] = new PostProcess({
            fragmentShader : PassThrough,
            textureScale : scale,
            forcePowerOfTwo : true,
            samplingMode : PostProcessSampleMode.LINEAR
        });

        var brightPass = processes[1] = new PostProcess({
            fragmentShader : BrightPass,
            uniformValues : {
                avgLuminance : 0.5, // A guess at the average luminance across the entire scene
                threshold : 0.25,
                offset : 0.1
            },
            textureScale : scale,
            forcePowerOfTwo : true
        });

        var that = this;
        this._delta = 1.0;
        this._sigma = 2.0;
        this._blurStep = new Cartesian2();

        processes[2] = new PostProcess({
            fragmentShader : GaussianBlur1D,
            uniformValues : {
                step : function() {
                    that._blurStep.x = that._blurStep.y = 1.0 / brightPass.outputTexture.width;
                    return that._blurStep;
                },
                delta : function() {
                    return that._delta;
                },
                sigma : function() {
                    return that._sigma;
                },
                direction : 0.0
            },
            textureScale : scale,
            forcePowerOfTwo : true
        });

        processes[3] = new PostProcess({
            fragmentShader : GaussianBlur1D,
            uniformValues : {
                step : function() {
                    that._blurStep.x = that._blurStep.y = 1.0 / brightPass.outputTexture.width;
                    return that._blurStep;
                },
                delta : function() {
                    return that._delta;
                },
                sigma : function() {
                    return that._sigma;
                },
                direction : 1.0
            },
            textureScale : scale,
            forcePowerOfTwo : true
        });

        processes[4] = new PostProcess({
            fragmentShader : PassThrough,
            samplingMode : PostProcessSampleMode.LINEAR
        });

        this._uCenter = new Cartesian2();
        this._uRadius = undefined;

        processes[5] = new PostProcess({
            fragmentShader : AdditiveBlend,
            uniformValues : {
                center : function() {
                    return that._uCenter;
                },
                radius : function() {
                    return that._uRadius;
                },
                colorTexture2 : function() {
                    return that._sceneFramebuffer.getFramebuffer().getColorTexture(0);
                }
            }
        });

        this._processes = new PostProcessComposite({
            processes : processes
        });

        var length = processes.length;
        for (var i = 0; i < length; ++i) {
            processes[i]._collection = this;
        }

        this._textureCache = new PostProcessTextureCache(this);

        this.length = processes.length;
    }

    SunPostProcess.prototype.get = function(index) {
        return this._processes.get(index);
    };

    SunPostProcess.prototype.getProcessByName = function(name) {
        var length = this._processes.length;
        for (var i = 0; i < length; ++i) {
            var process = this._processes.get(i);
            if (process.name === name) {
                return process;
            }
        }
        return undefined;
    };

    SunPostProcess.prototype.getFramebuffer = function(name) {
        return this._textureCache.getFramebuffer(name);
    };

    var sunPositionECScratch = new Cartesian4();
    var sunPositionWCScratch = new Cartesian2();
    var sizeScratch = new Cartesian2();
    var postProcessMatrix4Scratch= new Matrix4();

    function updateSunPosition(postProcess, context, viewport) {
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

        postProcess._uCenter = Cartesian2.clone(sunPositionWC, postProcess._uCenter);
        postProcess._uRadius = Math.max(size.x, size.y) * 0.15;

        var width = context.drawingBufferWidth;
        var height = context.drawingBufferHeight;

        var processes = postProcess._processes;
        var firstProcess = processes.get(0);

        var downSampleWidth = firstProcess.outputTexture.width;
        var downSampleHeight = firstProcess.outputTexture.height;

        var downSampleViewport = new BoundingRectangle();
        downSampleViewport.width = downSampleWidth;
        downSampleViewport.height = downSampleHeight;

        // create down sampled render state
        viewportTransformation = Matrix4.computeViewportTransformation(downSampleViewport, 0.0, 1.0, postProcessMatrix4Scratch);
        sunPositionWC = Transforms.pointToGLWindowCoordinates(viewProjectionMatrix, viewportTransformation, sunPosition, sunPositionWCScratch);

        size.x *= downSampleWidth / width;
        size.y *= downSampleHeight / height;

        var scissorRectangle = firstProcess.scissorRectangle;
        scissorRectangle.x = Math.max(sunPositionWC.x - size.x * 0.5, 0.0);
        scissorRectangle.y = Math.max(sunPositionWC.y - size.y * 0.5, 0.0);
        scissorRectangle.width = Math.min(size.x, width);
        scissorRectangle.height = Math.min(size.y, height);

        for (var i = 1; i < 4; ++i) {
            BoundingRectangle.clone(scissorRectangle, processes.get(i).scissorRectangle);
        }
    }

    SunPostProcess.prototype.clear = function(context, passState, clearColor) {
        this._sceneFramebuffer.clear(context, passState, clearColor);
        this._textureCache.clear(context);
    };

    SunPostProcess.prototype.update = function(passState) {
        var context = passState.context;

        var sceneFramebuffer = this._sceneFramebuffer;
        sceneFramebuffer.update(context);
        var framebuffer = sceneFramebuffer.getFramebuffer();

        this._textureCache.update(context);

        var processes = this._processes;
        processes.update(context);

        var viewport = passState.viewport;
        updateSunPosition(this, context, viewport);

        return framebuffer;
    };

    SunPostProcess.prototype.execute = function(context) {
        var colorTexture = this._sceneFramebuffer.getFramebuffer().getColorTexture(0);
        var length = this._processes.length;
        this._processes.get(0).execute(context, colorTexture);
        for (var i = 1; i < length; ++i) {
            this._processes.get(i).execute(context, this._processes.get(i - 1).outputTexture);
        }
    };

    SunPostProcess.prototype.copy = function(context, framebuffer) {
        if (!defined(this._copyColorCommand)) {
            var that = this;
            this._copyColorCommand = context.createViewportQuadCommand(PassThrough, {
                uniformMap : {
                    colorTexture : function() {
                        return that._processes.get(that._processes.length - 1).outputTexture;
                    }
                },
                owner : this
            });
        }

        this._copyColorCommand.framebuffer = framebuffer;
        this._copyColorCommand.execute(context);
    };

    SunPostProcess.prototype.isDestroyed = function() {
        return false;
    };

    SunPostProcess.prototype.destroy = function() {
        this._processes.destroy();
        return destroyObject(this);
    };

    return SunPostProcess;
});
