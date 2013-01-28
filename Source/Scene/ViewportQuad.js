/*global define*/
define([
        '../Core/Color',
        '../Core/combine',
        '../Core/destroyObject',
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/BoundingRectangle',
        '../Core/ComponentDatatype',
        '../Core/PrimitiveType',
        './Material',
        '../Renderer/BufferUsage',
        '../Renderer/BlendEquation',
        '../Renderer/BlendFunction',
        '../Renderer/BlendingState',
        '../Renderer/CommandLists',
        '../Renderer/DrawCommand',
        '../Shaders/Noise',
        '../Shaders/ViewportQuadVS',
        '../Shaders/ViewportQuadFSMaterial',
        '../Shaders/ViewportQuadFSTexture',
    ], function(
        Color,
        combine,
        destroyObject,
        defaultValue,
        DeveloperError,
        BoundingRectangle,
        ComponentDatatype,
        PrimitiveType,
        Material,
        BufferUsage,
        BlendEquation,
        BlendFunction,
        BlendingState,
        CommandLists,
        DrawCommand,
        Noise,
        ViewportQuadVS,
        ViewportQuadFSMaterial,
        ViewportQuadFSTexture) {
    "use strict";

    /**
     * A viewport aligned quad.
     *
     * @alias ViewportQuad
     * @constructor
     *
     * @param {BoundingRectangle} rectangle The BoundingRectangle defining the quad's position within the viewport.
     *
     * @example
     * var boundingRectangle = new BoundingRectangle(0, 0, 80, 40);
     * var viewportQuad = new ViewportQuad(boundingRectangle);
     * viewportQuad.material.uniforms.color = new Color(1.0, 0.0, 0.0, 1.0);
     */
    var ViewportQuad = function(rectangle) {
        /**
         * DOC_TBA
         */
        this._shaderProgramMaterial = undefined;
        this._shaderProgramTexture = undefined;

        this._va = undefined;
        this._overlayCommand = new DrawCommand();
        this._overlayCommand.primitiveType = PrimitiveType.TRIANGLE_FAN;
        this._commandLists = new CommandLists();
        this._commandLists.overlayList.push(this._overlayCommand);

        this._rectangle = BoundingRectangle.clone(rectangle);

        this._texture = undefined;
        this._destroyTexture = true;
        this._useMaterial = true;


        /**
         * The surface appearance of the viewport quad.  This can be one of several built-in {@link Material} objects or a custom material, scripted with
         * <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric'>Fabric</a>.
         * <p>
         * The default material is <code>Material.ColorType</code>.
         * </p>
         *
         * @type Material
         *
         * @example
         * // 1. Change the color of the default material to yellow
         * polygon.material.uniforms.color = new Color(1.0, 1.0, 0.0, 1.0);
         *
         * // 2. Change material to horizontal stripes
         * polygon.material = Material.fromType(scene.getContext(), Material.StripeType);
         *
         * @see <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric'>Fabric</a>
         */
        this.material = Material.fromType(undefined, Material.ColorType);
        this.material.uniforms.color = new Color(1.0, 1.0, 1.0, 1.0);
        this._material = undefined;

        var that = this;
        this._textureUniform = {
            u_texture : function() {
                return that._texture;
            }
        };

        this._pickUniforms = undefined;
    };

    /**
     * Get the location of the quad within the viewport.
     *
     * @memberof ViewportQuad
     *
     * @see Polygon#setRectangle
     *
     * @return {BoundingRectangle} The quad's position within the viewport.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    ViewportQuad.prototype.getRectangle = function() {
        return this._rectangle;
    };


    /**
     * Sets the location of the quad within the viewport.
     *
     * @see Polygon#getRectangle
     *
     * @param {BoundingRectangle} value The BoundingRectangle defining the quad's position within the viewport.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @example
     * var boundingRectangle = new BoundingRectangle(0, 0, 80, 40);
     * viewportQuad.setRectangle(boundingRectangle);
     */
    ViewportQuad.prototype.setRectangle = function(value) {
        BoundingRectangle.clone(value, this._rectangle);
    };

    /**
     * Get the texture to be used when rendering the viewport quad.
     *
     * @memberof ViewportQuad
     *
     * @return {Texture} texture The texture to use use when rendering the viewport quad.
     *
     * @see Polygon#setTexture
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    ViewportQuad.prototype.getTexture = function() {
        return this._texture;
    };

    /**
     * Explicitly set the texture to be used when rendering the viewport quad.
     * Setting the texture explicitly will cause the material settings to be ignored.
     *
     * @memberof ViewportQuad
     *
     * @param {Texture} texture The texture to use use when rendering the viewport quad.
     *
     * @see Polygon#getTexture
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    ViewportQuad.prototype.setTexture = function(texture) {
        if (this._texture !== texture) {
            this._texture = this._destroyTexture && this._texture && this._texture.destroy();
            this._texture = texture;
        }

        this._useMaterial = this._texture === 'undefined';
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
     * Commits changes to properties before rendering by updating the object's WebGL resources.
     *
     * @memberof ViewportQuad
     *
     * @exception {DeveloperError} this.material must be defined.
     */
    ViewportQuad.prototype.update = function(context, frameState, commandList) {

        if (typeof this.material === 'undefined') {
            throw new DeveloperError('this.material must be defined.');
        }

        if (typeof this._va === 'undefined') {
            this._va = getVertexArray(context);
            this._overlayCommand.vertexArray = this._va.vertexArray;
            this._overlayCommand.renderState = context.createRenderState({
                blending : BlendingState.ALPHA_BLEND
            });
        }

        var pass = frameState.passes;
        if (pass.overlay) {
            var materialChanged = typeof this._material === 'undefined' ||
                this._material !== this.material;


            if(!this._useMaterial && typeof this._shaderProgramTexture === 'undefined') {
                this._shaderProgramTexture = context.getShaderCache().getShaderProgram(ViewportQuadVS, ViewportQuadFSTexture, attributeIndices);
            }
            else if (materialChanged) {
             // Recompile shader when material changes
                this._material = this.material;

                var fsSource =
                    '#line 0\n' +
                    Noise +
                    '#line 0\n' +
                    this._material.shaderSource +
                    '#line 0\n' +
                    ViewportQuadFSMaterial;

                this._shaderProgramMaterial = this._shaderProgramMaterial && this._shaderProgramMaterial.release();
                this._shaderProgramMaterial = context.getShaderCache().getShaderProgram(ViewportQuadVS, fsSource, attributeIndices);
            }

            this._overlayCommand.renderState.viewport = this._rectangle;

            if(this._useMaterial) {
                this._overlayCommand.shaderProgram = this._shaderProgramMaterial;
                this._overlayCommand.uniformMap = this._material._uniforms;
            }
            else {
                this._overlayCommand.shaderProgram = this._shaderProgramTexture;
                this._overlayCommand.uniformMap = this._textureUniform;
            }
        }

        if (!this._commandLists.empty()) {
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
        this._shaderProgramMaterial = this._shaderProgramMaterial && this._shaderProgramMaterial.release();
        this._shaderProgramTexture = this._shaderProgramTexture && this._shaderProgramTexture.release();

        return destroyObject(this);
    };

    return ViewportQuad;
});
