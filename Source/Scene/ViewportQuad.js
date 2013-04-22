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
        '../Renderer/BlendingState',
        '../Renderer/CommandLists',
        '../Renderer/DrawCommand',
        '../Shaders/ViewportQuadVS',
        '../Shaders/ViewportQuadFS'
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
        BlendingState,
        CommandLists,
        DrawCommand,
        ViewportQuadVS,
        ViewportQuadFS) {
    "use strict";

    /**
     * A viewport aligned quad.
     *
     * @alias ViewportQuad
     * @constructor
     *
     * @param {BoundingRectangle} [rectangle] The {@link BoundingRectangle} defining the quad's position within the viewport.
     * @param {Material} [material] The {@link Material} defining the surface appearance of the viewport quad.
     *
     * @example
     * var viewportQuad = new ViewportQuad(new BoundingRectangle(0, 0, 80, 40));
     * viewportQuad.material.uniforms.color = new Color(1.0, 0.0, 0.0, 1.0);
     */
    var ViewportQuad = function(rectangle, material) {

        this._va = undefined;
        this._overlayCommand = new DrawCommand();
        this._overlayCommand.primitiveType = PrimitiveType.TRIANGLE_FAN;
        this._commandLists = new CommandLists();
        this._commandLists.overlayList.push(this._overlayCommand);

        /**
         * Determines if the viewport quad primitive will be shown.
         * <p>
         * The default is <code>true</code>.
         * </p>
         *
         * @type Boolean
        */
        this.show = true;

        if (typeof rectangle === 'undefined') {
            rectangle = new BoundingRectangle();
        }

        /**
         * The BoundingRectangle defining the quad's position within the viewport.
         *
         * @type BoundingRectangle
         *
         * @example
         * viewportQuad.rectangle = new BoundingRectangle(0, 0, 80, 40);
         */
        this.rectangle = BoundingRectangle.clone(rectangle);

        if (typeof material === 'undefined') {
            material = Material.fromType(undefined, Material.ColorType);
            material.uniforms.color = new Color(1.0, 1.0, 1.0, 1.0);
        }

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
         * viewportQuad.material.uniforms.color = new Color(1.0, 1.0, 0.0, 1.0);
         *
         * // 2. Change material to horizontal stripes
         * viewportQuad.material = Material.fromType(scene.getContext(), Material.StripeType);
         *
         * @see <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric'>Fabric</a>
         */
        this.material = material;
        this._material = undefined;
    };

    var attributeIndices = {
        position : 0,
        textureCoordinates : 1
    };

    function getVertexArray(context) {
        // Per-context cache for viewport quads
        var vertexArray = context.cache.viewportQuad_vertexArray;

        if (typeof vertexArray !== 'undefined') {
            return vertexArray;
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

        vertexArray = context.createVertexArrayFromMesh({
            mesh : mesh,
            attributeIndices : attributeIndices,
            bufferUsage : BufferUsage.STATIC_DRAW
        });

        context.cache.viewportQuad_vertexArray = vertexArray;
        return vertexArray;
    }

    /**
     * Commits changes to properties before rendering by updating the object's WebGL resources.
     *
     * @memberof ViewportQuad
     *
     * @exception {DeveloperError} this.material must be defined.
     * @exception {DeveloperError} this.rectangle must be defined.
     */
    ViewportQuad.prototype.update = function(context, frameState, commandList) {
        if (!this.show)
        {
            return;
        }

        if (typeof this.material === 'undefined') {
            throw new DeveloperError('this.material must be defined.');
        }

        if (typeof this.rectangle === 'undefined') {
            throw new DeveloperError('this.rectangle must be defined.');
        }

        if (typeof this._va === 'undefined') {
            this._va = getVertexArray(context);
            this._overlayCommand.vertexArray = this._va;
            this._overlayCommand.renderState = context.createRenderState({
                blending : BlendingState.ALPHA_BLEND
            });
        }

        var pass = frameState.passes;
        if (pass.overlay) {
            if (this._material !== this.material) {
                // Recompile shader when material changes
                this._material = this.material;

                var fsSource =
                    '#line 0\n' +
                    this._material.shaderSource +
                    '#line 0\n' +
                    ViewportQuadFS;

                this._overlayCommand.shaderProgram = context.getShaderCache().replaceShaderProgram(
                    this._overlayCommand.shaderProgram, ViewportQuadVS, fsSource, attributeIndices);
            }

            this._overlayCommand.renderState.viewport = this.rectangle;
            this._overlayCommand.uniformMap = this._material._uniforms;
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
        this._overlayCommand.shaderProgram = this._overlayCommand.shaderProgram && this._overlayCommand.shaderProgram.release();

        return destroyObject(this);
    };

    return ViewportQuad;
});
