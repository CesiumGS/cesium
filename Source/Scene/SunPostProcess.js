/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/Cartesian2',
        '../Core/Cartesian4',
        '../Core/Color',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/Geometry',
        '../Core/GeometryAttribute',
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/PrimitiveType',
        '../Core/Transforms',
        '../Renderer/BufferUsage',
        '../Renderer/ClearCommand',
        '../Renderer/DrawCommand',
        '../Renderer/PassState',
        '../Renderer/PixelDatatype',
        '../Renderer/PixelFormat',
        '../Renderer/RenderbufferFormat',
        '../Shaders/PostProcessFilters/AdditiveBlend',
        '../Shaders/PostProcessFilters/BrightPass',
        '../Shaders/PostProcessFilters/GaussianBlur1D',
        '../Shaders/PostProcessFilters/PassThrough',
        '../Shaders/ViewportQuadVS'
    ], function(
        BoundingRectangle,
        Cartesian2,
        Cartesian4,
        Color,
        ComponentDatatype,
        defaultValue,
        defined,
        destroyObject,
        Geometry,
        GeometryAttribute,
        CesiumMath,
        Matrix4,
        PrimitiveType,
        Transforms,
        BufferUsage,
        ClearCommand,
        DrawCommand,
        PassState,
        PixelDatatype,
        PixelFormat,
        RenderbufferFormat,
        AdditiveBlend,
        BrightPass,
        GaussianBlur1D,
        PassThrough,
        ViewportQuadVS) {
    "use strict";

    var SunPostProcess = function() {
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
    };

    SunPostProcess.prototype.clear = function(context, color) {
        var clear = this._clearFBO1Command;
        Color.clone(defaultValue(color, Color.BLACK), clear.color);
        clear.execute(context);

        clear = this._clearFBO2Command;
        Color.clone(defaultValue(color, Color.BLACK), clear.color);
        clear.execute(context);
    };

    SunPostProcess.prototype.execute = function(context) {
        this._downSampleCommand.execute(context, this._downSamplePassState);
        this._brightPassCommand.execute(context, this._downSamplePassState);
        this._blurXCommand.execute(context, this._downSamplePassState);
        this._blurYCommand.execute(context, this._downSamplePassState);
        this._fullScreenCommand.execute(context);
        this._blendCommand.execute(context, this._upSamplePassState);
    };

    var attributeLocations = {
        position : 0,
        textureCoordinates : 1
    };

    function getVertexArray(context) {
        // Per-context cache for viewport quads
        var vertexArray = context.cache.viewportQuad_vertexArray;

        if (defined(vertexArray)) {
            return vertexArray;
        }

        var geometry = new Geometry({
            attributes : {
                position : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 2,
                    values : [
                       -1.0, -1.0,
                        1.0, -1.0,
                        1.0,  1.0,
                       -1.0,  1.0
                    ]
                }),

                textureCoordinates : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 2,
                    values : [
                        0.0, 0.0,
                        1.0, 0.0,
                        1.0, 1.0,
                        0.0, 1.0
                    ]
                })
            },
            primitiveType : PrimitiveType.TRIANGLES
        });

        vertexArray = context.createVertexArrayFromGeometry({
            geometry : geometry,
            attributeLocations : attributeLocations,
            bufferUsage : BufferUsage.STATIC_DRAW
        });

        context.cache.viewportQuad_vertexArray = vertexArray;
        return vertexArray;
    }

    var viewportBoundingRectangle  = new BoundingRectangle();
    var downSampleViewportBoundingRectangle = new BoundingRectangle();
    var sunPositionECScratch = new Cartesian4();
    var sunPositionWCScratch = new Cartesian2();
    var sizeScratch = new Cartesian2();
    var postProcessMatrix4Scratch= new Matrix4();
    SunPostProcess.prototype.update = function(context) {
        var width = context.getDrawingBufferWidth();
        var height = context.getDrawingBufferHeight();

        var that = this;

        if (!defined(this._downSampleCommand)) {
            this._clearFBO1Command = new ClearCommand();
            this._clearFBO1Command.color = new Color();

            this._clearFBO2Command = new ClearCommand();
            this._clearFBO2Command.color = new Color();

            var primitiveType = PrimitiveType.TRIANGLE_FAN;
            var vertexArray = getVertexArray(context);

            var downSampleCommand = this._downSampleCommand = new DrawCommand();
            downSampleCommand.owner = this;
            downSampleCommand.primitiveType = primitiveType;
            downSampleCommand.vertexArray = vertexArray;
            downSampleCommand.shaderProgram = context.getShaderCache().getShaderProgram(ViewportQuadVS, PassThrough, attributeLocations);
            downSampleCommand.uniformMap = {};

            var brightPassCommand = this._brightPassCommand = new DrawCommand();
            brightPassCommand.owner = this;
            brightPassCommand.primitiveType = primitiveType;
            brightPassCommand.vertexArray = vertexArray;
            brightPassCommand.shaderProgram = context.getShaderCache().getShaderProgram(ViewportQuadVS, BrightPass, attributeLocations);
            brightPassCommand.uniformMap = {
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

            var delta = 1.0;
            var sigma = 2.0;

            var blurXCommand = this._blurXCommand = new DrawCommand();
            blurXCommand.owner = this;
            blurXCommand.primitiveType = primitiveType;
            blurXCommand.vertexArray = vertexArray;
            blurXCommand.shaderProgram = context.getShaderCache().getShaderProgram(ViewportQuadVS, GaussianBlur1D, attributeLocations);
            blurXCommand.uniformMap = {
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

            var blurYCommand = this._blurYCommand = new DrawCommand();
            blurYCommand.owner = this;
            blurYCommand.primitiveType = primitiveType;
            blurYCommand.vertexArray = vertexArray;
            blurYCommand.shaderProgram = context.getShaderCache().getShaderProgram(ViewportQuadVS, GaussianBlur1D, attributeLocations);
            blurYCommand.uniformMap = {
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

            var additiveBlendCommand = this._blendCommand = new DrawCommand();
            additiveBlendCommand.owner = this;
            additiveBlendCommand.primitiveType = primitiveType;
            additiveBlendCommand.vertexArray = vertexArray;
            additiveBlendCommand.shaderProgram = context.getShaderCache().getShaderProgram(ViewportQuadVS, AdditiveBlend, attributeLocations);
            additiveBlendCommand.uniformMap = {
                u_center : function() {
                    return that._uCenter;
                },
                u_radius : function() {
                    return that._uRadius;
                }
            };

            var fullScreenCommand = this._fullScreenCommand = new DrawCommand();
            fullScreenCommand.owner = this;
            fullScreenCommand.primitiveType = primitiveType;
            fullScreenCommand.vertexArray = vertexArray;
            fullScreenCommand.shaderProgram = context.getShaderCache().getShaderProgram(ViewportQuadVS, PassThrough, attributeLocations);
            fullScreenCommand.uniformMap = {};
        }

        var downSampleWidth = Math.pow(2.0, Math.ceil(Math.log(width) / Math.log(2)) - 2.0);
        var downSampleHeight = Math.pow(2.0, Math.ceil(Math.log(height) / Math.log(2)) - 2.0);
        var downSampleSize = Math.max(downSampleWidth, downSampleHeight);

        var viewport = viewportBoundingRectangle;
        viewport.width = width;
        viewport.height = height;

        var downSampleViewport = downSampleViewportBoundingRectangle;
        downSampleViewport.width = downSampleSize;
        downSampleViewport.height = downSampleSize;

        var fbo = this._fbo;
        var colorTexture = (defined(fbo) && fbo.getColorTexture(0)) || undefined;
        if (!defined(colorTexture) || colorTexture.getWidth() !== width || colorTexture.getHeight() !== height) {
            fbo = fbo && fbo.destroy();
            this._downSampleFBO1 = this._downSampleFBO1 && this._downSampleFBO1.destroy();
            this._downSampleFBO2 = this._downSampleFBO2 && this._downSampleFBO2.destroy();

            this._blurStep.x = this._blurStep.y = 1.0 / downSampleSize;

            var colorTextures = [context.createTexture2D({
                width : width,
                height : height
            })];

            if (context.getDepthTexture()) {
                fbo = this._fbo = context.createFramebuffer({
                    colorTextures :colorTextures,
                    depthTexture : context.createTexture2D({
                        width : width,
                        height : height,
                        pixelFormat : PixelFormat.DEPTH_COMPONENT,
                        pixelDatatype : PixelDatatype.UNSIGNED_SHORT
                    })
                });
            } else {
                fbo = this._fbo = context.createFramebuffer({
                    colorTextures : colorTextures,
                    depthRenderbuffer : context.createRenderbuffer({
                        format : RenderbufferFormat.DEPTH_COMPONENT16
                    })
                });
            }

            this._downSampleFBO1 = context.createFramebuffer({
                colorTextures : [context.createTexture2D({
                    width : downSampleSize,
                    height : downSampleSize
                })]
            });
            this._downSampleFBO2 = context.createFramebuffer({
                colorTextures : [context.createTexture2D({
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

            var downSampleRenderState = context.createRenderState({
                viewport : downSampleViewport
            });
            var upSampleRenderState = context.createRenderState();

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

        var us = context.getUniformState();
        var sunPosition = us.getSunPositionWC();
        var viewMatrix = us.getView();
        var viewProjectionMatrix = us.getViewProjection();
        var projectionMatrix = us.getProjection();

        // create up sampled render state
        var viewportTransformation = Matrix4.computeViewportTransformation(viewport, 0.0, 1.0, postProcessMatrix4Scratch);
        var sunPositionEC = Matrix4.multiplyByPoint(viewMatrix, sunPosition, sunPositionECScratch);
        var sunPositionWC = Transforms.pointToWindowCoordinates(viewProjectionMatrix, viewportTransformation, sunPosition, sunPositionWCScratch);

        sunPositionEC.x += CesiumMath.SOLAR_RADIUS;
        var limbWC = Transforms.pointToWindowCoordinates(projectionMatrix, viewportTransformation, sunPositionEC, sunPositionEC);
        var sunSize = Cartesian2.magnitude(Cartesian2.subtract(limbWC, sunPositionWC, limbWC)) * 30.0 * 2.0;

        var size = sizeScratch;
        size.x = sunSize;
        size.y = sunSize;

        var scissorRectangle = this._upSamplePassState.scissorTest.rectangle;
        scissorRectangle.x = Math.max(sunPositionWC.x - size.x * 0.5, 0.0);
        scissorRectangle.y = Math.max(sunPositionWC.y - size.y * 0.5, 0.0);
        scissorRectangle.width = Math.min(size.x, width);
        scissorRectangle.height = Math.min(size.y, height);

        Cartesian2.clone(sunPositionWC, this._uCenter);
        this._uRadius = Math.max(size.x, size.y) * 0.5;

        // create down sampled render state
        viewportTransformation = Matrix4.computeViewportTransformation(downSampleViewport, 0.0, 1.0, postProcessMatrix4Scratch);
        sunPositionWC = Transforms.pointToWindowCoordinates(viewProjectionMatrix, viewportTransformation, sunPosition, sunPositionWCScratch);

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
        this._downSampleCommand = this._downSampleCommand && this._downSampleCommand.shaderProgram && this._downSampleCommand.shaderProgram.release();
        this._brightPassCommand = this._brightPassCommand && this._brightPassCommand.shaderProgram && this._brightPassCommand.shaderProgram.release();
        this._blurXCommand = this._blurXCommand && this._blurXCommand.shaderProgram && this._blurXCommand.shaderProgram.release();
        this._blurYCommand = this._blurYCommand && this._blurYCommand.shaderProgram && this._blurYCommand.shaderProgram.release();
        this._blendCommand = this._blendCommand && this._blendCommand.shaderProgram && this._blendCommand.shaderProgram.release();
        this._fullScreenCommand = this._fullScreenCommand && this._fullScreenCommand.shaderProgram && this._fullScreenCommand.shaderProgram.release();
        return destroyObject(this);
    };

    return SunPostProcess;
});