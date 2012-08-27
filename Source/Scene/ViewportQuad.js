/*global define*/
define([
        '../Core/destroyObject',
        '../Core/BoundingRectangle',
        '../Core/ComponentDatatype',
        '../Core/PrimitiveType',
        '../Renderer/BufferUsage',
        '../Renderer/BlendingState',
        '../Shaders/ViewportQuadVS',
        '../Shaders/ViewportQuadFS'
    ], function(
        destroyObject,
        BoundingRectangle,
        ComponentDatatype,
        PrimitiveType,
        BufferUsage,
        BlendingState,
        ViewportQuadVS,
        ViewportQuadFS) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias ViewportQuad
     * @constructor
     */
    var ViewportQuad = function(rectangle) {
        this.renderState = undefined;
        this._sp = undefined;
        this._va = undefined;

        this.vertexShader = ViewportQuadVS;
        this.fragmentShader = ViewportQuadFS;

        this._texture = undefined;
        this._destroyTexture = true;

        this._framebuffer = undefined;
        this._destroyFramebuffer = false;

        this._rectangle = BoundingRectangle.clone(rectangle);

        this.enableBlending = false;

        var that = this;
        this.uniforms = {
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

    /**
     * DOC_TBA
     * @memberof ViewportQuad
     */
    ViewportQuad.prototype.render = function(context) {
        if (this._texture) {
            var v = context.getViewport().clone();
            context.setViewport(this._rectangle);

            context.draw({
                primitiveType : PrimitiveType.TRIANGLE_FAN,
                shaderProgram : this._sp,
                uniformMap : this.uniforms,
                vertexArray : this._va,
                renderState : this.renderState,
                framebuffer : this._framebuffer
            });

            context.setViewport(v);
        }
    };

    ViewportQuad.prototype._update = function(context, sceneState) {
        this.renderState.blending.enabled = this.enableBlending;
    };

    /**
     * @private
     */
    ViewportQuad.prototype.update = function(context, sceneState) {
        var attributeIndices = {
            position : 0,
            textureCoordinates : 1
        };

        this._sp = context.getShaderCache().getShaderProgram(this.vertexShader, this.fragmentShader, attributeIndices);
        this.renderState = context.createRenderState({ blending : BlendingState.ALPHA_BLEND });

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

        this._va = context.createVertexArrayFromMesh({
            mesh : mesh,
            attributeIndices : attributeIndices,
            bufferUsage : BufferUsage.STATIC_DRAW
        });

        this._update(context, sceneState);
        this.update = this._update;
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
        this._va = this._va && this._va.destroy();
        this._sp = this._sp && this._sp.release();
        this._texture = this._destroyTexture && this._texture && this._texture.destroy();
        this._framebuffer = this._destroyFramebuffer && this._framebuffer && this._framebuffer.destroy();

        return destroyObject(this);
    };

    return ViewportQuad;
});