/*global define*/
define([
        '../Core/Color',
        '../Core/destroyObject',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/BoundingRectangle',
        '../Core/ComponentDatatype',
        '../Core/PrimitiveType',
        '../Core/Geometry',
        '../Core/GeometryAttribute',
        './Material',
        '../Renderer/BufferUsage',
        '../Renderer/BlendingState',
        '../Renderer/DrawCommand',
        '../Renderer/createShaderSource',
        '../Renderer/Pass',
        '../Shaders/ViewportQuadVS',
        '../Shaders/ViewportQuadFS'
    ], function(
        Color,
        destroyObject,
        defined,
        DeveloperError,
        BoundingRectangle,
        ComponentDatatype,
        PrimitiveType,
        Geometry,
        GeometryAttribute,
        Material,
        BufferUsage,
        BlendingState,
        DrawCommand,
        createShaderSource,
        Pass,
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
     * var viewportQuad = new Cesium.ViewportQuad(new Cesium.BoundingRectangle(0, 0, 80, 40));
     * viewportQuad.material.uniforms.color = new Cesium.Color(1.0, 0.0, 0.0, 1.0);
     */
    var ViewportQuad = function(rectangle, material) {

        this._va = undefined;
        this._overlayCommand = new DrawCommand();
        this._overlayCommand.primitiveType = PrimitiveType.TRIANGLE_FAN;
        this._overlayCommand.pass = Pass.OVERLAY;
        this._overlayCommand.owner = this;

        /**
         * Determines if the viewport quad primitive will be shown.
         *
         * @type {Boolean}
         * @default true
         */
        this.show = true;

        if (!defined(rectangle)) {
            rectangle = new BoundingRectangle();
        }

        /**
         * The BoundingRectangle defining the quad's position within the viewport.
         *
         * @type {BoundingRectangle}
         *
         * @example
         * viewportQuad.rectangle = new Cesium.BoundingRectangle(0, 0, 80, 40);
         */
        this.rectangle = BoundingRectangle.clone(rectangle);

        if (!defined(material)) {
            material = Material.fromType(Material.ColorType, {
                color : new Color(1.0, 1.0, 1.0, 1.0)
            });
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
         * viewportQuad.material.uniforms.color = new Cesium.Color(1.0, 1.0, 0.0, 1.0);
         *
         * // 2. Change material to horizontal stripes
         * viewportQuad.material = Cesium.Material.fromType(Material.StripeType);
         *
         * @see <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric'>Fabric</a>
         */
        this.material = material;
        this._material = undefined;
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

    /**
     * Commits changes to properties before rendering by updating the object's WebGL resources.
     *
     * @memberof ViewportQuad
     *
     * @exception {DeveloperError} this.material must be defined.
     * @exception {DeveloperError} this.rectangle must be defined.
     */
    ViewportQuad.prototype.update = function(context, frameState, commandList) {
        if (!this.show) {
            return;
        }

        //>>includeStart('debug', pragmas.debug);
        if (!defined(this.material)) {
            throw new DeveloperError('this.material must be defined.');
        }
        if (!defined(this.rectangle)) {
            throw new DeveloperError('this.rectangle must be defined.');
        }
        //>>includeEnd('debug');

        if (!defined(this._va)) {
            this._va = getVertexArray(context);
            this._overlayCommand.vertexArray = this._va;
        }

        var rs = this._overlayCommand.renderState;
        if ((!defined(rs)) || !BoundingRectangle.equals(rs.viewport, this.rectangle)) {
            this._overlayCommand.renderState = context.createRenderState({
                blending : BlendingState.ALPHA_BLEND,
                viewport : this.rectangle
            });
        }

        var pass = frameState.passes;
        if (pass.render) {
            if (this._material !== this.material) {
                // Recompile shader when material changes
                this._material = this.material;

                var fsSource = createShaderSource({ sources : [this._material.shaderSource, ViewportQuadFS] });
                this._overlayCommand.shaderProgram = context.getShaderCache().replaceShaderProgram(
                    this._overlayCommand.shaderProgram, ViewportQuadVS, fsSource, attributeLocations);
            }

            this._material.update(context);

            this._overlayCommand.uniformMap = this._material._uniforms;
            commandList.push(this._overlayCommand);
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
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
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
     * @returns {undefined}
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
