/*global define*/
define([
        '../Core/destroyObject',
        '../Core/Rectangle',
        '../Core/ComponentDatatype',
        '../Core/PrimitiveType',
        '../Renderer/BufferUsage',
        '../Shaders/ViewportQuadVS',
        '../Shaders/ViewportQuadFS'
    ], function(
        destroyObject,
        Rectangle,
        ComponentDatatype,
        PrimitiveType,
        BufferUsage,
        ViewportQuadVS,
        ViewportQuadFS) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @name ViewportQuad
     * @constructor
     */
    function ViewportQuad(rectangle) {
        this.renderState = null;
        this._sp = null;
        this._va = null;

        this.vertexShader = ViewportQuadVS;
        this.fragmentShader = ViewportQuadFS;

        this._texture = null;
        this._destroyTexture = true;

        this._framebuffer = null;
        this._destroyFramebuffer = false;

        this._rectangle = rectangle; // TODO: copy?
        this._dirtyRectangle = true;

        var that = this;
        this.uniforms = {
            u_texture : function() {
                return that._texture;
            }
        };
    }

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
     * @param {Rectangle} value DOC_TBA
     */
    ViewportQuad.prototype.setRectangle = function(value) {
        if (value && !this._rectangle.equals(value)) {
            this._rectangle = new Rectangle(value.x, value.y, value.width, value.height);
            this._dirtyRectangle = true;
        }
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
            context.draw({
                primitiveType : PrimitiveType.TRIANGLE_FAN,
                shaderProgram : this._sp,
                uniformMap : this.uniforms,
                vertexArray : this._va,
                renderState : this.renderState,
                framebuffer : this._framebuffer
            });
        }
    };

    ViewportQuad._getAttributeIndices = function() {
        return {
            position : 0,
            textureCoordinates : 1
        };
    };

    ViewportQuad.prototype._update = function(context, sceneState) {
        if (this._dirtyRectangle) {
            this._dirtyRectangle = false;

            var rectangle = this._rectangle;
            var mesh = {
                attributes : {
                    position : {
                        componentDatatype : ComponentDatatype.FLOAT,
                        componentsPerAttribute : 2,
                        values : [rectangle.x, rectangle.y, rectangle.x + rectangle.width, rectangle.y, rectangle.x + rectangle.width, rectangle.y + rectangle.height, rectangle.x,
                                rectangle.y + rectangle.height]
                    },

                    textureCoordinates : {
                        componentDatatype : ComponentDatatype.FLOAT,
                        componentsPerAttribute : 2,
                        values : [0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0]
                    }
                }
            };

            this._va = context.createVertexArrayFromMesh({
                mesh : mesh,
                attributeIndices : ViewportQuad._getAttributeIndices(),
                bufferUsage : BufferUsage.STATIC_DRAW
            });
        }
    };

    /**
     * @private
     */
    ViewportQuad.prototype.update = function(context, sceneState) {
        this._sp = context.getShaderCache().getShaderProgram(this.vertexShader, this.fragmentShader, ViewportQuad._getAttributeIndices());
        this.renderState = context.createRenderState();

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
     * assign the return value (<code>null</code>) to the object as done in the example.
     *
     * @memberof ViewportQuad
     *
     * @return {null}
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