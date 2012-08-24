/*global define*/
define([
        '../Core/BoxTessellator',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Color',
        '../Core/combine',
        '../Core/ComponentDatatype',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Ellipsoid',
        '../Core/Matrix4',
        '../Core/MeshFilters',
        '../Renderer/CullFace',
        '../Renderer/BlendingState',
        '../Renderer/BufferUsage',
        './Material',
        './SceneMode',
        '../Shaders/Noise',
        '../Shaders/EllipsoidVS',
        '../Shaders/EllipsoidFS',
        '../Core/PrimitiveType'
    ], function(
        BoxTessellator,
        Cartesian3,
        Cartesian4,
        Color,
        combine,
        ComponentDatatype,
        DeveloperError,
        destroyObject,
        Ellipsoid,
        Matrix4,
        MeshFilters,
        CullFace,
        BlendingState,
        BufferUsage,
        Material,
        SceneMode,
        Noise,
        EllipsoidVS,
        EllipsoidFS,
        PrimitiveType) {
    "use strict";

    var attributeIndices = {
        position2D : 0,
        position3D : 1
    };

    /**
     * DOC_TBA
     *
     * @alias EllipsoidPrimitive
     * @constructor
     */
    var EllipsoidPrimitive = function() {
        this._sp = undefined;
        this._rs = undefined;
        this._va = undefined;
        this._pickId = undefined;

        // TODO: Sensible defaults for position and radii?  Undefined is probably sensible.  Or take them with the constructor?

        /**
         * DOC_TBA
         *
         * @type Cartesian3
         */
        this.position = undefined;
        this._position = undefined;

        /**
         * DOC_TBA
         *
         * @type Cartesian3
         */
        this.radii = undefined;
        this._radii = undefined;

        /**
         * DOC_TBA
         *
         * @type Matrix4
         */
        this.modelMatrix = Matrix4.IDENTITY.clone();
        this._computedModelMatrix = Matrix4.IDENTITY.clone();

        this._mode = undefined;
        this._projection = undefined;

        /**
         * The current morph transition time between 2D/Columbus View and 3D,
         * with 0.0 being 2D or Columbus View and 1.0 being 3D.
         *
         * @type Number
         */
        this.morphTime = 1.0;

        /**
         * Determines if the ellipsoid primitive will be shown.
         *
         * @type Boolean
         */
        this.show = true;

        /**
         * DOC_TBA
         * @see Material
         */
        this.material = Material.fromType(undefined, Material.ColorType);
        this.material.uniforms.color = new Color(0.0, 1.0, 0.0, 0.5);
        this._material = undefined;

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

        var that = this;
        this._uniforms = {
            u_morphTime : function() {
                return that.morphTime;
            },

            // TODO: Change engine so u_model isn't required.
            u_model : function() {
                return (that._mode === SceneMode.SCENE3D) ? that._computedModelMatrix : Matrix4.IDENTITY;
            },
            u_radii : function() {
                return that.radii;
            }
        };
        this._pickUniforms = undefined;
        this._drawUniforms = undefined;
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
        if (!this.show ||
            (typeof this.position === undefined) ||
            (typeof this.radii === undefined)) {
            return undefined;
        }

        if (typeof this._rs === 'undefined') {
            this._rs = context.createRenderState({
                // Cull front faces - not back faces - so the ellipsoid doesn't
                // disappear if the viewer enters the bounding box.
                cull : {
                    enabled : true,
                    face : CullFace.FRONT
                },
                depthTest : {
                    enabled : true
                },
                // Do not write depth since the depth for the bounding box is
                // wrong; it is not the true of the ray casted ellipsoid.
                // Once WebGL has the extension for writing gl_FragDepth,
                // we can write the correct depth.  For now, most ellipsoids
                // will be translucent so we don't want to write depth anyway.
                depthMask : false,
                blending : BlendingState.ALPHA_BLEND
            });
        }

        var mode = sceneState.mode;
        var projection = sceneState.scene2D.projection;

        // TODO: Really care if _position changes?  Just uniform/matrix?
        // TODO: Need to check modelMatrix?

        if ((!Cartesian3.equals(this._position, this.position)) ||
            (!Cartesian3.equals(this._radii, this.radii)) ||
            (this._bufferUsage !== this.bufferUsage) ||
            (this._mode !== mode) ||
            (this._projection !== projection)) {

            this._position = Cartesian3.clone(this.position);
            this._radii = Cartesian3.clone(this.radii);
            this._bufferUsage = this.bufferUsage;
            this._mode = mode;
            this._projection = projection;

            if (typeof mode.morphTime !== 'undefined') {
                this.morphTime = mode.morphTime;
            }

            var mesh = BoxTessellator.compute({
                dimensions : this.radii.multiplyByScalar(2.0)
            });

            mesh.attributes.position3D = mesh.attributes.position;
            delete mesh.attributes.position;

            if (this._mode === SceneMode.SCENE3D) {
                mesh.attributes.position2D = {
                    value : [0.0, 0.0, 0.0]
                };
            } else {
/*
                var positions = mesh.attributes.position3D.values;
                var projectedPositions = [];
                var projectedPositionsFlat = [];
                for (var i = 0; i < positions.length; i += 3) {
                    var p = new Cartesian4(positions[i], positions[i + 1], positions[i + 2], 1.0);
                    p = this.modelMatrix.multiplyByVector(p);

                    positions[i] = p.x;
                    positions[i + 1] = p.y;
                    positions[i + 2] = p.z;

                    p = projection.project(this._ellipsoid.cartesianToCartographic(Cartesian3.fromCartesian4(p)));

                    projectedPositions.push(p);
                    projectedPositionsFlat.push(p.z, p.x, p.y);
                }

                mesh.attributes.position2D = {
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : projectedPositionsFlat
                };
 */
            }

            this._va = context.createVertexArrayFromMesh({
                mesh: mesh,
                attributeIndices: attributeIndices,
                bufferUsage: this._bufferUsage
            });
        }

        // Recompile shader when material changes
        if (typeof this._material === 'undefined' ||
            this._material !== this.material) {

            this.material = (typeof this.material !== 'undefined') ? this.material : Material.fromType(context, Material.ColorType);
            this._material = this.material;

            var fsSource =
                '#line 0\n' +
                Noise +
                '#line 0\n' +
                this._material.shaderSource +
                '#line 0\n' +
                EllipsoidFS;

            this._sp = this._sp && this._sp.release();
            this._sp = context.getShaderCache().getShaderProgram(EllipsoidVS, fsSource, attributeIndices);

            this._drawUniforms = combine([this._uniforms, this._material._uniforms], false, false);
        }

        Matrix4.multiplyByTranslation(this.modelMatrix, this._position, this._computedModelMatrix);

        return {
            modelMatrix : (sceneState.mode === SceneMode.SCENE3D) ? this._computedModelMatrix : Matrix4.IDENTITY
        };
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

    // TODO: Picking

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