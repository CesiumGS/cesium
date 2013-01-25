/*global define*/
define([
        '../Core/Color',
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
        '../Shaders/ViewportQuadFS',
        '../Shaders/ViewportQuadFSPick'
    ], function(
        Color,
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
        ViewportQuadFS,
        ViewportQuadFSPick) {
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
        this._shaderProgram = undefined;
        this._shaderProgramPick = undefined;
        this._pickId = undefined;

        this._va = undefined;
        this._overlayCommand = new DrawCommand();
        this._overlayCommand.primitiveType = PrimitiveType.TRIANGLE_FAN;
        this._pickCommand = new DrawCommand();
        this._pickCommand.primitiveType = PrimitiveType.TRIANGLE_FAN;
        this._commandLists = new CommandLists();
        this._commandLists.overlayList.push(this._overlayCommand);
        this._commandLists.pickList.push(this._pickCommand);

        this._vertexShaderSource = defaultValue(vertexShaderSource, ViewportQuadVS);
        this._fragmentShaderSource = defaultValue(fragmentShaderSource, ViewportQuadFS);

        this._framebuffer = undefined;
        this._destroyFramebuffer = false;

        this._rectangle = BoundingRectangle.clone(rectangle);

        this._pickUniforms = undefined;


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
        this.material.uniforms.color = new Color(1.0, 1.0, 0.0, 0.5);
        this._material = undefined;
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

        if (typeof this.material === 'undefined') {
            throw new DeveloperError('this.material must be defined.');
        }

        if (typeof this._va === 'undefined') {
            this._va = getVertexArray(context);
            this._overlayCommand.vertexArray = this._va.vertexArray;
            this._overlayCommand.renderState = context.createRenderState({
                blending : BlendingState.ALPHA_BLEND
            });

            this._pickCommand.vertexArray = this._va.vertexArray;
            this._pickCommand.renderState = context.createRenderState({
                blending : BlendingState.DISABLED
            });
        }

        var pass = frameState.passes;
        if (pass.overlay) {
            var materialChanged = typeof this._material === 'undefined' ||
            this._material !== this.material;

            // Recompile shader when material changes
            if (materialChanged) {
                this._material = this.material;

                var fsSource =
                    '#line 0\n' +
                    Noise +
                    '#line 0\n' +
                    this._material.shaderSource +
                    '#line 0\n' +
                    this._fragmentShaderSource;

                this._shaderProgram = this._shaderProgram && this._shaderProgram.release();
                this._shaderProgram = context.getShaderCache().getShaderProgram(this._vertexShaderSource, fsSource, attributeIndices);

            }

            this._overlayCommand.renderState.viewport = this._rectangle;
            this._overlayCommand.framebuffer = this._framebuffer;
            this._overlayCommand.shaderProgram = this._shaderProgram;
            this._overlayCommand.uniformMap = this._material._uniforms;
        }

        if (pass.pick) {
            if (typeof this._pickId === 'undefined') {
                this._shaderProgramPick = context.getShaderCache().getShaderProgram(this._vertexShaderSource, ViewportQuadFSPick, attributeIndices);

                this._pickId = context.createPickId(this);

                var that = this;
                this._pickUniforms = {
                    u_pickColor : function() {
                        return that._pickId.normalizedRgba;
                    }
                };
            }

            this._pickCommand.renderState.viewport = this._rectangle;
            this._pickCommand.framebuffer = this._framebuffer;
            this._pickCommand.shaderProgram = this._shaderProgramPick;
            this._pickCommand.uniformMap = this._pickUniforms;
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
        this._overlayCommand.shaderProgram = this._overlayCommand.shaderProgram && this._overlayCommand.shaderProgram.release();
        this._framebuffer = this._destroyFramebuffer && this._framebuffer && this._framebuffer.destroy();

        return destroyObject(this);
    };

    return ViewportQuad;
});
