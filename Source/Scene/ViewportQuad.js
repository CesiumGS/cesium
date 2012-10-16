/*global define*/
define([
        '../Core/destroyObject',
        '../Core/defaultValue',
        '../Core/BoundingRectangle',
        '../Core/ComponentDatatype',
        '../Core/PrimitiveType',
        '../Renderer/BufferUsage',
        '../Renderer/BlendEquation',
        '../Renderer/BlendFunction',
        '../Renderer/CommandLists',
        '../Renderer/DrawCommand',
        '../Shaders/ViewportQuadVS',
        '../Shaders/ViewportQuadFS'
    ], function(
        destroyObject,
        defaultValue,
        BoundingRectangle,
        ComponentDatatype,
        PrimitiveType,
        BufferUsage,
        BlendEquation,
        BlendFunction,
        CommandLists,
        DrawCommand,
        ViewportQuadVS,
        ViewportQuadFS) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias ViewportQuad
     * @constructor
     */
    var ViewportQuad = function(rectangle, vertexShaderSource, fragmentShaderSource) {
        /**
         * DOC_TBA
         */
        this.renderState = undefined;

        /**
         * DOC_TBA
         */
        this.enableBlending = false;

        this._va = undefined;
        this._overlayCommand = new DrawCommand();
        this._overlayCommand.primitiveType = PrimitiveType.TRIANGLE_FAN;
        this._commandLists = new CommandLists();
        this._commandLists.overlayList.push(this._overlayCommand);

        this._vertexShaderSource = defaultValue(vertexShaderSource, ViewportQuadVS);
        this._fragmentShaderSource = defaultValue(fragmentShaderSource, ViewportQuadFS);

        this._texture = undefined;
        this._destroyTexture = true;

        this._framebuffer = undefined;
        this._destroyFramebuffer = false;

        this._rectangle = BoundingRectangle.clone(rectangle);

        var that = this;
        this._overlayCommand.uniformMap = this.uniforms = {
            u_texture : function() {
                return that._texture;
            }
        };
    };

    /**
     * DOC_TBA
     * @memberof ViewportQuad
     */
    ViewportQuad.prototype.getRectangle = function() {
        return this._rectangle;
    };

    /**
     * DOC_TBA
     *
     * @memberof ViewportQuad
     *
     * @param {BoundingRectangle} value DOC_TBA
     */
    ViewportQuad.prototype.setRectangle = function(value) {
        BoundingRectangle.clone(value, this._rectangle);
    };

    /**
     * DOC_TBA
     * @memberof ViewportQuad
     */
    ViewportQuad.prototype.getTexture = function() {
        return this._texture;
    };

    /**
     * DOC_TBA
     * @memberof ViewportQuad
     */
    ViewportQuad.prototype.setTexture = function(value) {
        if (this._texture !== value) {
            this._texture = this._destroyTexture && this._texture && this._texture.destroy();
            this._texture = value;
        }
    };

    /**
     * DOC_TBA
     * @memberof ViewportQuad
     */
    ViewportQuad.prototype.getDestroyTexture = function() {
        return this._destroyTexture;
    };

    /**
     * DOC_TBA
     * @memberof ViewportQuad
     */
    ViewportQuad.prototype.setDestroyTexture = function(value) {
        this._destroyTexture = value;
    };

    /**
     * DOC_TBA
     * @memberof ViewportQuad
     */
    ViewportQuad.prototype.getFramebuffer = function() {
        return this._framebuffer;
    };

    /**
     * DOC_TBA
     * @memberof ViewportQuad
     */
    ViewportQuad.prototype.setFramebuffer = function(value) {
        if (this._framebuffer !== value) {
            this._framebuffer = this._destroyFramebuffer && this._framebuffer && this._framebuffer.destroy();
            this._framebuffer = value;
        }
    };

    /**
     * DOC_TBA
     * @memberof ViewportQuad
     */
    ViewportQuad.prototype.getDestroyFramebuffer = function() {
        return this._destroyFramebuffer;
    };

    /**
     * DOC_TBA
     * @memberof ViewportQuad
     */
    ViewportQuad.prototype.setDestroyFramebuffer = function(value) {
        this._destroyFramebuffer = value;
    };

    var attributeIndices = {
        position : 0,
        textureCoordinates : 1
    };

    var vertexArrayCache = {};

    function getVertexArray(context) {
        // Per-context cache for viewport quads
        var c = vertexArrayCache[context.getId()];

        if (typeof c !== 'undefined' &&
            typeof c.vertexArray !== 'undefined') {

            ++c.referenceCount;
            return c;
        }

        var mesh = {
            attributes : {
                position : {
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 2,
                    values : [
                       -1.0, -1.0,
                        1.0, -1.0,
                        1.0,  1.0,
                       -1.0,  1.0
                    ]
                },

                textureCoordinates : {
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 2,
                    values : [
                        0.0, 0.0,
                        1.0, 0.0,
                        1.0, 1.0,
                        0.0, 1.0
                    ]
                }
            }
        };

        var va = context.createVertexArrayFromMesh({
            mesh : mesh,
            attributeIndices : attributeIndices,
            bufferUsage : BufferUsage.STATIC_DRAW
        });

        var cachedVA = {
            vertexArray : va,
            referenceCount : 1,

            release : function() {
                if (typeof this.vertexArray !== 'undefined' &&
                    --this.referenceCount === 0) {

                    // TODO: Schedule this for a few hundred frames later so we don't thrash the cache
                    this.vertexArray = this.vertexArray.destroy();
                }

                return undefined;
            }
        };

        vertexArrayCache[context.getId()] = cachedVA;
        return cachedVA;
    }

    /**
     * @private
     */
    ViewportQuad.prototype.update = function(context, frameState, commandList) {
        if (typeof this._texture === 'undefined') {
            return;
        }

        if (typeof this._overlayCommand.shaderProgram === 'undefined') {
            this._overlayCommand.shaderProgram = context.getShaderCache().getShaderProgram(this._vertexShaderSource, this._fragmentShaderSource, attributeIndices);
            this._va = getVertexArray(context);
            this._overlayCommand.vertexArray = this._va.vertexArray;
            this.renderState = context.createRenderState({
                blending : {
                    enabled : true,
                    equationRgb : BlendEquation.ADD,
                    equationAlpha : BlendEquation.ADD,
                    functionSourceRgb : BlendFunction.SOURCE_ALPHA,
                    functionSourceAlpha : BlendFunction.SOURCE_ALPHA,
                    functionDestinationRgb : BlendFunction.ONE_MINUS_SOURCE_ALPHA,
                    functionDestinationAlpha : BlendFunction.ONE_MINUS_SOURCE_ALPHA
                }
            });
        }

        this.renderState.blending.enabled = this.enableBlending;
        this.renderState.viewport = this._rectangle;
        this._overlayCommand.renderState = this.renderState;
        this._overlayCommand.framebuffer = this._framebuffer;

        if (frameState.passes.overlay) {
            commandList.push(this._commandLists);
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof ViewportQuad
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see ViewportQuad#destroy
     */
    ViewportQuad.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof ViewportQuad
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see ViewportQuad#isDestroyed
     *
     * @example
     * quad = quad && quad.destroy();
     */
    ViewportQuad.prototype.destroy = function() {
        this._va = this._va && this._va.release();
        this._overlayCommand.shaderProgram = this._overlayCommand.shaderProgram && this._overlayCommand.shaderProgram.release();
        this._texture = this._destroyTexture && this._texture && this._texture.destroy();
        this._framebuffer = this._destroyFramebuffer && this._framebuffer && this._framebuffer.destroy();

        return destroyObject(this);
    };

    return ViewportQuad;
});
