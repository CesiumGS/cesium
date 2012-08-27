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

        /**
         * DOC_TBA
         *
         * @type Cartesian3
         */
        this.radii = undefined;
        this._oneOverEllipsoidRadiiSquared = new Cartesian3();

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
         * <p>
         * Determines if the ellipsoid is affected by lighting, i.e., if the ellipsoid is bright on the
         * side facing the sun, and dark on the other side.  When <code>true</code>, the ellipsoid
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
        this._material = undefined;

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
            },
            u_oneOverEllipsoidRadiiSquared : function() {
                var radii = that.radii;
                var r = that._oneOverEllipsoidRadiiSquared;
                r.x = 1.0 / (radii.x * radii.x);
                r.y = 1.0 / (radii.y * radii.y);
                r.z = 1.0 / (radii.z * radii.z);

                return r;
            }
        };
        this._pickUniforms = undefined;
        this._drawUniforms = undefined;
    };

    var vertexArrayCache = {};

    function getVertexArray(context) {
        // Per-context cache for ellipsoids

        var c = vertexArrayCache[context.getId()];

        if (typeof c !== 'undefined' &&
            typeof c.vertexArray !== 'undefined') {

            ++c.referenceCount;
            return c.vertexArray;
        }

        var mesh = BoxTessellator.compute({
            dimensions : new Cartesian3(2.0, 2.0, 2.0)
        });

        mesh.attributes.position3D = mesh.attributes.position;
        delete mesh.attributes.position;

//        if (this._mode === SceneMode.SCENE3D) {
            mesh.attributes.position2D = {
                value : [0.0, 0.0, 0.0]
            };
/*
        } else {
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
        }
*/

        var va = context.createVertexArrayFromMesh({
            mesh: mesh,
            attributeIndices: attributeIndices,
            bufferUsage: BufferUsage.STATIC_DRAW
        });

        vertexArrayCache[context.getId()] = {
            vertexArray : va,
            referenceCount : 1
        };

        return va;
    }

    function releaseVertexArray(context) {
        // TODO: Schedule this for a few 100 frames later so we don't thrash the cache
        var c = vertexArrayCache[context.getId()];
        if (typeof c !== 'undefined' &&
            typeof c.vertexArray !== 'undefined' &&
            --c.referenceCount === 0) {

            c.vertexArray = c.vertexArray.destroy();
        }

        return undefined;
    }

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
            (typeof this.position === 'undefined') ||
            (typeof this.radii === 'undefined')) {
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

        // TODO: When do we really need to rewrite?
        if ((typeof this._va === 'undefined') ||
            (this._mode !== mode) ||
            (this._projection !== projection)) {

            this._mode = mode;
            this._projection = projection;

            if (typeof mode.morphTime !== 'undefined') {
                this.morphTime = mode.morphTime;
            }

            this._va = getVertexArray(context);
        }

        // Recompile shader when material changes
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

        // Translate model coordinates used for rendering such that the origin is the center of the ellipsoid.
        Matrix4.multiplyByTranslation(this.modelMatrix, this.position, this._computedModelMatrix);

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
        context.draw({
            primitiveType: PrimitiveType.TRIANGLES,
            shaderProgram: this._sp,
            uniformMap: this._drawUniforms,
            vertexArray: this._va,
            renderState: this._rs
        });
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
        this._va = this._va && releaseVertexArray(context);
        this._pickId = this._pickId && this._pickId.destroy();
        return destroyObject(this);
    };

    return EllipsoidPrimitive;
});