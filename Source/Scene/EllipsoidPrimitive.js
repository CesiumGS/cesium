/*global define*/
define([
        '../Renderer/BlendingState',
        '../Renderer/BufferUsage',
        '../Core/BoxTessellator',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/combine',
        '../Renderer/CullFace',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        './Material',
        '../Core/MeshFilters',
        '../Shaders/Noise',
        '../Shaders/EllipsoidVS',
        '../Shaders/EllipsoidFS',
        '../Core/PrimitiveType',
        './SceneMode',
        '../Core/Transforms'
    ], function(
        BlendingState,
        BufferUsage,
        BoxTessellator,
        Cartesian3,
        Color,
        combine,
        CullFace,
        DeveloperError,
        destroyObject,
        Material,
        MeshFilters,
        Noise,
        EllipsoidVS,
        EllipsoidFS,
        PrimitiveType,
        SceneMode,
        Transforms) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias EllipsoidPrimitive
     * @constructor
     *
     * @param {Cartesian3} position TODO
     * @param {Cartesian3} radii TODO
     *
     * @example TODO
     */
    var EllipsoidPrimitive = function() {
        this.position = undefined;
        this._position = undefined;

        this.radii = undefined;
        this._radii = undefined;

        this.modelMatrix = undefined;

        /**
         * Determines if the ellipsoid primitive will be shown.
         *
         * @type Boolean
         */
        this.show = true;

        /**
         * <p>
         * Determines if the ellipsoid is affected by lighting, i.e., if the ellipsoid is bright on the
         * day side of the globe, and dark on the night side.  When <code>true</code>, the ellipsoid
         * is affected by lighting; when <code>false</code>, the ellipsoid is uniformly shaded regardless
         * of the sun position.
         * </p>
         * <p>
         * The default is <code>true</code>.
         * </p>
         */
        this.affectedByLighting = true;
        this._affectedByLighting = true;

        /**
         * DOC_TBA
         * @see Material
         */
        this.material = Material.fromType(undefined, Material.ColorType);
        this.material.uniforms.color = new Color(0.0, 1.0, 0.0, 0.5);
        this._material = undefined;

        /**
         * DOC_TBA
         *
         * @type Number
         */
        this.erosion = 1.0;

        /**
         * The usage hint for the polygon's vertex buffer.
         *
         * @type BufferUsage
         *
         * @performance If <code>bufferUsage</code> changes, the next time
         * {@link EllipsoidPrimitive#update} is called, the ellipsoid's vertex buffer
         * is rewritten - an <code>O(n)</code> operation that also incurs CPU to GPU overhead.
         * For best performance, it is important to provide the proper usage hint.  If the ellipsoid
         * will not change over several frames, use <code>BufferUsage.STATIC_DRAW</code>.
         * If the ellipsoid will change every frame, use <code>BufferUsage.STREAM_DRAW</code>.
         */
        this.bufferUsage = BufferUsage.STATIC_DRAW;
        this._bufferUsage = BufferUsage.STATIC_DRAW;

        this._sp = undefined;
        this._rs = undefined;
        this._va = undefined;

        this._pickId = null;

        this._mode = SceneMode.SCENE3D;

        /**
         * The current morph transition time between 2D/Columbus View and 3D,
         * with 0.0 being 2D or Columbus View and 1.0 being 3D.
         *
         * @type Number
         */
        this.morphTime = this._mode.morphTime;

        var that = this;
        this._uniforms = {
            u_erosion : function() {
                return that.erosion;
            },
            u_morphTime : function() {
                return that.morphTime;
            },
            u_model : function() {
                return that.modelMatrix;
            },
            u_radii : function() {
                return that.radii;
            },
            u_center : function() {
                return that.position;
            }
        };
        this._drawUniforms = undefined;
    };

    /**
     * Gets the position of the ellipsoid.
     *
     * @return {Cartesian3} The position of the ellipsoid's origin.
     *
     * @see EllipsoidPrimitive#setPosition
     */
    EllipsoidPrimitive.prototype.getPosition = function() {
        return this._position;
    };

    /**
     * TODO: decouple position & model matrix
     * Sets the position of the ellipsoid.
     *
     * @param {Cartesain3} position The position of the ellipsoid's origin.
     *
     * @exception {DeveloperErorr} <code>position</code> is required.
     *
     * @see EllipsoidPrimitive#getPosition
     */
    EllipsoidPrimitive.prototype.setPosition = function(position) {
        if (typeof position === 'undefined') {
            throw new DeveloperError('position is required.');
        }

        this.position = position;
        this.modelMatrix = Transforms.eastNorthUpToFixedFrame(position);
    };

    /**
     * Gets the radii of the ellipsoid.
     *
     * @return {Cartesian3} The ellipsoid's radius in the x, y, and z directions.
     *
     * @see EllipsoidPrimitive#setRadii
     */
    EllipsoidPrimitive.prototype.getRadii = function() {
        return this._radii;
    };

    /**
     * Sets the radii of the ellipsoid.
     * TODO: Accept an object that either has a radii property or a bounding box that we can draw dimensions from.
     *
     * @param {Cartesian3} radii The ellipsoid's radius in the x, y, and z directions.
     *
     * @exception {DeveloperErorr} <code>position</code> is required.
     *
     * @see EllipsoidPrimitive#getRadii
     */
    EllipsoidPrimitive.prototype.setRadii = function(radii) {
        if (typeof radii === 'undefined') {
            throw new DeveloperError('radii is required.');
        }

        this.radii = radii;
    };

    /**
     * Commits changes to properties before rendering by updating the object's WebGL resources.
     * This must be called before calling {@link EllipsoidPrimitive#render} in order to realize
     * changes to EllipsoidPrimitive's positions and properties.
     *
     * @memberof EllipsoidPrimitive
     *
     * @param context
     * @param sceneState
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Polygon#render
     */
    EllipsoidPrimitive.prototype.update = function(context, sceneState) {
        if (this._radii !== this.radii) {
            this._radii = this.radii;
        }

        if (this._position !== this.position) {
            this._position = this.position;
        }

        var mesh = BoxTessellator.compute({
            dimensions : this.radii
        });

        var attributeIndices = MeshFilters.createAttributeIndices(mesh);

        this._va = context.createVertexArrayFromMesh({
            mesh: mesh,
            attributeIndices: attributeIndices,
            bufferUsage: BufferUsage.STATIC_DRAW
        });

        if (typeof this._rs === 'undefined') {
            this._rs = context.createRenderState({
                depthTest : {
                    enabled : true
                },
                blending : BlendingState.ALPHA_BLEND
            });
        }

        // Recompile shader when material or lighting changes
        if (typeof this._material === 'undefined' ||
            this._material !== this.material ||
            this._affectedByLighting !== this.affectedByLighting) {

            this.material = (typeof this.material !== 'undefined') ? this.material : Material.fromType(context, Material.ColorType);
            this._material = this.material;
            this._affectedByLighting = this.affectedByLighting;

            var fsSource =
                '#line 0\n' +
                Noise +
                '#line 0\n' +
                this._material.shaderSource +
                (this._affectedByLighting ? '#define AFFECTED_BY_LIGHTING 1\n' : '') +
                '#line 0\n' +
                EllipsoidFS;

            this._sp = this._sp && this._sp.release();
            this._sp = context.getShaderCache().getShaderProgram(EllipsoidVS, fsSource, attributeIndices);

            this._drawUniforms = combine([this._uniforms, this._material._uniforms], false, false);
        }
    };

    /**
     * Renders the ellipsoid primitive. In order for changes to positions and properties to be realized,
     * {@link EllipsoidPrimitive#update} must be called before <code>render</code>.
     *
     * @memberof EllipsoidPrimitive
     *
     * @param context
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see EllipsoidPrimitive#update
     */
    EllipsoidPrimitive.prototype.render = function(context) {
        if (this.show) {
            context.draw({
                primitiveType: PrimitiveType.TRIANGLES,
                shaderProgram: this._sp,
                uniformMap: this._drawUniforms,
                vertexArray: this._va,
                renderState: this._rs
            });
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof EllipsoidPrimitive
     *
     * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see EllipsoidPrimitive#destroy
     */
    EllipsoidPrimitive.prototype.isDestroyed = function() {
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
     * @memberof EllipsoidPrimitive
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see EllipsoidPrimitive#isDestroyed
     *
     * @example
     * ellipsoidPrimitive = ellipsoidPrimitive && ellipsoidPrimitive();
     */
    EllipsoidPrimitive.prototype.destroy = function() {
        this._sp = this._sp && this._sp.release();
        this._va = this._va && this._va.destroy();
        this._pickId = this._pickId && this._pickId.destroy();
        return destroyObject(this);
    };

    return EllipsoidPrimitive;
});