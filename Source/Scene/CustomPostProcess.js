/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/Geometry',
        '../Core/GeometryAttribute',
        '../Core/PrimitiveType',
        '../Renderer/BufferUsage',
        '../Renderer/DrawCommand',
        '../Renderer/PixelDatatype',
        '../Core/PixelFormat',
        '../Renderer/RenderbufferFormat',
        '../Scene/BlendingState',
        '../Shaders/PostProcessFilters/PassThrough',
        '../Shaders/ViewportQuadVS'
    ], function(
        Cartesian2,
        ComponentDatatype,
        defaultValue,
        defined,
        destroyObject,
        Geometry,
        GeometryAttribute,
        PrimitiveType,
        BufferUsage,
        DrawCommand,
        PixelDatatype,
        PixelFormat,
        RenderbufferFormat,
        BlendingState,
        PassThrough,
        ViewportQuadVS) {
    "use strict";

    /**
     * Sets up a custom post process using the given post process filter.
     *
     * @alias CustomPostProcess
     * @constructor
     *
     * @param {Object} [filter=PassThrough] The post-process filter to be used.
     * @param {Object} [customUniforms={}] Any custom uniforms used in the filter must be passed as functions returning the value in <code>customUnforms</code>.
     */
    var CustomPostProcess = function(filter, customUniforms) {
        this._filterCommand = undefined;

        this._colorTexture = undefined;
        this._depthTexture = undefined;
        this._depthRenderbuffer = undefined;

        this._colorStep = new Cartesian2();

        this._customUniforms = defaultValue(customUniforms, {});

        this.framebuffer = undefined;
        // Set the filter if it is defined otherwise, use passthrough filter.
        this.postProcessFilter = defaultValue(filter, PassThrough);
    };

    /**
     * Executes the filter command.
     *
     * @memberof CustomPostProcess
     *
     * @param {Context} Specifies the context where the filter is being applied.
     */
    CustomPostProcess.prototype.execute = function(context) {
        this._filterCommand.execute(context);
    };

    var attributeIndices = {
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
            attributeIndices : attributeIndices,
            bufferUsage : BufferUsage.STATIC_DRAW
        });

        context.cache.viewportQuad_vertexArray = vertexArray;
        return vertexArray;
    }

    /**
     * Updates the filter and framebuffer attributes if required.
     *
     * @memberof CustomPostProcess
     *
     * @param {Context} Specifies the context where the filter is being applied.
     */
    CustomPostProcess.prototype.update = function(context) {
        var width = context.drawingBufferWidth;
        var height = context.drawingBufferHeight;

        var that = this;

        // Setup the framebuffer if not defined, and the colortexture.
        if (!defined(this.framebuffer) ||
                this.framebuffer.getColorTexture(0).width !== width ||
                this.framebuffer.getColorTexture(0).height !== height ) {
//            this.freeResources();

            var colorTexture = context.createTexture2D({
                width : width,
                height : height
            });

            var depthTexture;
            var depthRenderbuffer;

            if (context.depthTexture) {
                depthTexture = context.createTexture2D({
                    width : width,
                    height : height,
                    pixelFormat : PixelFormat.DEPTH_COMPONENT,
                    pixelDatatype : PixelDatatype.UNSIGNED_SHORT
                });
            } else {
                depthRenderbuffer = context.createRenderbuffer({
                    format : RenderbufferFormat.DEPTH_COMPONENT16
                });
            }

            // Only depthTexture or depthRenderbuffer will be defined
            this.framebuffer = context.createFramebuffer({
                colorTextures : [colorTexture],
                depthTexture : depthTexture,
                depthRenderbuffer : depthRenderbuffer,
                destroyAttachments : false
            });

            this._colorTexture = colorTexture;
            this._depthTexture = depthTexture;
            this._depthRenderbuffer = depthRenderbuffer;
            this._colorStep.x = 1.0 / colorTexture.width;
            this._colorStep.y = 1.0 / colorTexture.height;
        }

        // Setup the filter command.
        if (typeof this._filterCommand === 'undefined') {
            var filterCommand = this._filterCommand = new DrawCommand();
            filterCommand.owner = this;
            filterCommand.primitiveType = PrimitiveType.TRIANGLE_FAN;
            filterCommand.vertexArray = getVertexArray(context);
            filterCommand.shaderProgram = context.shaderCache.getShaderProgram(ViewportQuadVS, this.postProcessFilter, attributeIndices);
            filterCommand.renderState = context.createRenderState({
                blending : BlendingState.ALPHA_BLEND
            });
            filterCommand.uniformMap = {
                    u_texture : function() {
                        return that._colorTexture;},
                    u_postprocessColorStep : function() {
                        return that._colorStep;
                    }
            };

            // Add extra custom uniforms to the filter command.
            // The passed in uniform values are assumed to be functions.
            for (var uniform in this._customUniforms) {
                if (this._customUniforms.hasOwnProperty(uniform)) {
                    filterCommand.uniformMap[uniform] = this._customUniforms[uniform];
                }
            }
        }

        return this.framebuffer;
    };

    /**
     * Frees all resources associated with this object.
     *
     * @memberof CustomPostProcess
     */
    CustomPostProcess.prototype.freeResources = function() {
        this._colorTexture = this._colorTexture && this._colorTexture.destroy();
        this._depthTexture = this._depthTexture && this._depthTexture.destroy();
        this._depthRenderbuffer = this._depthRenderbuffer && this._depthRenderbuffer.destroy();

        this.framebuffer = this.framebuffer && this.framebuffer.destroy();
    };


    /**
     * Checks if this object has been destroyed.
     *
     * @memberof CustomPostProcess
     */
    CustomPostProcess.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys this object, freeing all resources.
     *
     * @memberof CustomPostProcess
     */
    CustomPostProcess.prototype.destroy = function() {
        this.freeResources();
        return destroyObject(this);
    };

    return CustomPostProcess;
});