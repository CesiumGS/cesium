/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/Color',
        '../Core/combine',
        '../Core/destroyObject',
        '../Core/Cartesian2',
        '../Core/Math',
        '../Core/Ellipsoid',
        '../Core/Rectangle',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/ComponentDatatype',
        '../Core/MeshFilters',
        '../Core/PrimitiveType',
        '../Core/EllipsoidTangentPlane',
        '../Core/PolygonPipeline',
        '../Core/WindingOrder',
        '../Core/ExtentTessellator',
        '../Renderer/BlendingState',
        '../Renderer/BufferUsage',
        '../Renderer/CullFace',
        '../Renderer/VertexLayout',
        './ColorMaterial',
        './SceneMode',
        '../Shaders/Noise',
        '../Shaders/PolygonVS',
        '../Shaders/PolygonFS',
        '../Shaders/PolygonVSPick',
        '../Shaders/PolygonFSPick'
    ], function(
        DeveloperError,
        Color,
        combine,
        destroyObject,
        Cartesian2,
        CesiumMath,
        Ellipsoid,
        Rectangle,
        Cartesian3,
        Cartographic,
        ComponentDatatype,
        MeshFilters,
        PrimitiveType,
        EllipsoidTangentPlane,
        PolygonPipeline,
        WindingOrder,
        ExtentTessellator,
        BlendingState,
        BufferUsage,
        CullFace,
        VertexLayout,
        ColorMaterial,
        SceneMode,
        Noise,
        PolygonVS,
        PolygonFS,
        PolygonVSPick,
        PolygonFSPick) {
    "use strict";

    var attributeIndices = {
        position2D : 0,
        position3D : 1,
        textureCoordinates : 2
    };

    function PositionVertices() {
        this._va = null;
    }

    PositionVertices.prototype.getVertexArrays = function() {
        return this._va;
    };

    PositionVertices.prototype.update = function(context, meshes, bufferUsage) {
        if (typeof meshes !== 'undefined') {
            // Initially create or recreate vertex array and buffers
            this._destroyVA();

            var va = [];

            var length = meshes.length;
            for ( var i = 0; i < length; ++i) {
                va.push(context.createVertexArrayFromMesh({
                    mesh : meshes[i],
                    attributeIndices : attributeIndices,
                    bufferUsage : bufferUsage,
                    vertexLayout : VertexLayout.INTERLEAVED
                }));
            }

            this._va = va;
        } else {
            this._destroyVA();
        }
    };

    PositionVertices.prototype._destroyVA = function() {
        var va = this._va;
        if (va) {
            this._va = null;

            var length = va.length;
            for ( var i = 0; i < length; ++i) {
                va[i].destroy();
            }
        }
    };

    PositionVertices.prototype.isDestroyed = function() {
        return false;
    };

    PositionVertices.prototype.destroy = function() {
        this._destroyVA();
        return destroyObject(this);
    };

    /**
     * DOC_TBA
     *
     * @alias Polygon
     * @constructor
     *
     * @example
     * var polygon = new Polygon();
     * polygon.material.color = {
     *   red   : 1.0,
     *   green : 0.0,
     *   blue  : 0.0,
     *   alpha : 1.0
     * };
     * polygon.setPositions([
     *   ellipsoid.cartographicToCartesian(new Cartographic(...)),
     *   ellipsoid.cartographicToCartesian(new Cartographic(...)),
     *   ellipsoid.cartographicToCartesian(new Cartographic(...))
     * ]);
     */
    var Polygon = function() {
        this._sp = undefined;
        this._rs = undefined;

        this._spPick = undefined;
        this._rsPick = undefined;

        this._vertices = new PositionVertices();
        this._pickId = null;

        /**
         * DOC_TBA
         */
        this.ellipsoid = Ellipsoid.WGS84;
        this._ellipsoid = undefined;

        /**
         * DOC_TBA
         */
        this.height = 0.0;
        this._height = undefined;

        /**
         * DOC_TBA
         */
        this.granularity = CesiumMath.toRadians(1.0);
        this._granularity = undefined;

        /**
         * DOC_TBA
         */
        this.scene2D = {
            /**
             * DOC_TBA
             */
            granularity : CesiumMath.toRadians(30.0)
        };

        /**
         * DOC_TBA
         */
        this.scene3D = {
        /**
         * DOC_TBA
         *
         * granularity can override object-level granularity
         */
        };

        this._positions = undefined;
        this._extent = undefined;
        this._createVertexArray = false;

        /**
         * Determines if this polygon will be shown.
         *
         * @type Boolean
         */
        this.show = true;

        /**
         * The usage hint for the polygon's vertex buffer.
         *
         * @type BufferUsage
         *
         * @performance If <code>bufferUsage</code> changes, the next time
         * {@link Polygon#update} is called, the polygon's vertex buffer
         * is rewritten - an <code>O(n)</code> operation that also incurs CPU to GPU overhead.
         * For best performance, it is important to provide the proper usage hint.  If the polygon
         * will not change over several frames, use <code>BufferUsage.STATIC_DRAW</code>.
         * If the polygon will change every frame, use <code>BufferUsage.STREAM_DRAW</code>.
         */
        this.bufferUsage = BufferUsage.STATIC_DRAW;
        this._bufferUsage = BufferUsage.STATIC_DRAW;

        /**
         * <p>
         * Determines if the polygon is affected by lighting, i.e., if the polygon is bright on the
         * day side of the globe, and dark on the night side.  When <code>true</code>, the polygon
         * is affected by lighting; when <code>false</code>, the polygon is uniformly shaded regardless
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
         */
        this.material = new ColorMaterial({
            color : new Color(1.0, 1.0, 0.0, 0.5)
        });
        this._material = undefined;

        /**
         * DOC_TBA
         *
         * @type Number
         */
        this.erosion = 1.0;

        this._mode = SceneMode.SCENE3D;
        this._projection = undefined;

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
            u_height : function() {
                return (that._mode !== SceneMode.SCENE2D) ? that.height : 0.0;
            }
        };
        this._pickUniforms = undefined;
        this._drawUniforms = undefined;
    };

    /**
     * DOC_TBA
     *
     * @memberof Polygon
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Polygon#setPositions
     */
    Polygon.prototype.getPositions = function() {
        return this._positions;
    };

    /**
     * DOC_TBA
     *
     * @memberof Polygon
     *
     * @exception {DeveloperError} At least three positions are required.
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Polygon#getPositions
     *
     * @param {Array} positions. The cartesian positions of the polygon.
     * @param {double} [height=0.0]. The height of the polygon.
     *
     * @example
     * polygon.setPositions([
     *   ellipsoid.cartographicToCartesian(new Cartographic(...)),
     *   ellipsoid.cartographicToCartesian(new Cartographic(...)),
     *   ellipsoid.cartographicToCartesian(new Cartographic(...))
     * ], 10.0);
     */
    Polygon.prototype.setPositions = function(positions, height) {
        // positions can be undefined
        if (typeof positions !== 'undefined' && (positions.length < 3)) {
            throw new DeveloperError('At least three positions are required.');
        }
        this.height = height || 0.0;
        this._extent = undefined;
        this._positions = positions;
        this._createVertexArray = true;
    };

    /**
     * DOC_TBA
     *
     * @memberof Polygon
     *
     * @param {extent} extent. The cartographic extent of the tile, with north, south, east and
     * west properties in radians.
     *
     * @param {double} [height=0.0]. The height of the cartographic extent.
     * @example
     * polygon.configureExtent(new Extent(
     *     CesiumMath.toRadians(0.0),
     *     CesiumMath.toRadians(0.0),
     *     CesiumMath.toRadians(10.0),
     *     CesiumMath.toRadians(10.0)
     * ));
     */
    Polygon.prototype.configureExtent = function(extent, height){
        this._extent = extent;
        this.height = height || 0.0;
        this._positions = undefined;
        this._createVertexArray = true;
    };

    Polygon._appendTextureCoordinates = function(tangentPlane, positions2D, mesh) {
        var boundingRectangle = new Rectangle.createAxisAlignedBoundingRectangle(positions2D);
        var origin = new Cartesian2(boundingRectangle.x, boundingRectangle.y);

        var positions = mesh.attributes.position.values;
        var length = positions.length;

        var textureCoordinates = new Float32Array(2 * (length / 3));
        var j = 0;

        // PERFORMANCE_IDEA:  Instead of storing texture coordinates per-vertex, we could
        // save memory by computing them in the fragment shader.  However, projecting
        // the point onto the plane may have precision issues.
        for ( var i = 0; i < length; i += 3) {
            var p = new Cartesian3(positions[i], positions[i + 1], positions[i + 2]);
            var st = tangentPlane.projectPointOntoPlane(p);
            st = st.subtract(origin);

            textureCoordinates[j++] = st.x / boundingRectangle.width;
            textureCoordinates[j++] = st.y / boundingRectangle.height;
        }

        mesh.attributes.textureCoordinates = {
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 2,
            values : textureCoordinates
        };

        return mesh;
    };

    Polygon.prototype._createMeshes = function() {
        // PERFORMANCE_IDEA:  Move this to a web-worker.
        var mesh;
        var meshes = null;

        if(typeof this._extent !== 'undefined'){
            mesh = ExtentTessellator.compute({extent: this._extent, generateTextureCoords:true});
        }
        else if(typeof this._positions !== 'undefined'){
            var cleanedPositions = PolygonPipeline.cleanUp(this._positions);
            var tangentPlane = EllipsoidTangentPlane.create(this.ellipsoid, cleanedPositions);
            var positions2D = tangentPlane.projectPointsOntoPlane(cleanedPositions);

            var originalWindingOrder = PolygonPipeline.computeWindingOrder2D(positions2D);
            if (originalWindingOrder === WindingOrder.CLOCKWISE) {
                positions2D.reverse();
                cleanedPositions.reverse();
            }
            var indices = PolygonPipeline.earClip2D(positions2D);
            mesh = PolygonPipeline.computeSubdivision(cleanedPositions, indices, this._granularity);
            // PERFORMANCE_IDEA:  Only compute texture coordinates if the material requires them.
            mesh = Polygon._appendTextureCoordinates(tangentPlane, positions2D, mesh);
        }
        else {
            return undefined;
        }
        mesh = PolygonPipeline.scaleToGeodeticHeight(this.ellipsoid, mesh, this.height);
        mesh = MeshFilters.reorderForPostVertexCache(mesh);
        mesh = MeshFilters.reorderForPreVertexCache(mesh);

        if (this._mode === SceneMode.SCENE3D) {
            mesh.attributes.position2D = { // Not actually used in shader
                    value : [0.0, 0.0]
                };
            mesh.attributes.position3D = mesh.attributes.position;
            delete mesh.attributes.position;
        } else {
            mesh = MeshFilters.projectTo2D(mesh, this._projection);
        }
        meshes = MeshFilters.fitToUnsignedShortIndices(mesh);

        return meshes;
    };

    Polygon.prototype._getGranularity = function(mode) {
        if (mode === SceneMode.SCENE3D) {
            return this.scene3D.granularity || this.granularity;
        }

        return this.scene2D.granularity || this.granularity;
    };

    /**
     * Commits changes to properties before rendering by updating the object's WebGL resources.
     * This must be called before calling {@link Polygon#render} in order to realize
     * changes to polygon's positions and properties.
     *
     * @memberof Polygon
     *
     * @exception {DeveloperError} this.ellipsoid must be defined.
     * @exception {DeveloperError} this.granularity must be greater than zero.
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Polygon#render
     */
    Polygon.prototype.update = function(context, sceneState) {
        if (!this.ellipsoid) {
            throw new DeveloperError('this.ellipsoid must be defined.');
        }

        var mode = sceneState.mode;
        var granularity = this._getGranularity(mode);

        if (granularity < 0.0) {
            throw new DeveloperError('this.granularity and scene2D/scene3D overrides must be greater than zero.');
        }

        if (!this.show) {
            return;
        }

        if (this._ellipsoid !== this.ellipsoid) {
            this._createVertexArray = true;
            this._ellipsoid = this.ellipsoid;
        }

        if (this._height !== this.height) {
            this._createVertexArray = true;
            this._height = this.height;
        }

        if (this._granularity !== granularity) {
            this._createVertexArray = true;
            this._granularity = granularity;
        }

        if (this._bufferUsage !== this.bufferUsage) {
            this._createVertexArray = true;
            this._bufferUsage = this.bufferUsage;
        }

        var projection = sceneState.scene2D.projection;
        if (this._projection !== projection) {
            this._createVertexArray = true;
            this._projection = projection;
        }

        if (this._mode !== mode) {
            // SCENE2D, COLUMBUS_VIEW, and MORPHING use the same rendering path, so a
            // transition only occurs when switching from/to SCENE3D
            this._createVertexArray = this._mode === SceneMode.SCENE3D || mode === SceneMode.SCENE3D;
            this._mode = mode;

            if (typeof mode.morphTime !== 'undefined') {
                this.morphTime = mode.morphTime;
            }
        }

        if (this._createVertexArray) {
            this._createVertexArray = false;
            this._vertices.update(context, this._createMeshes(), this.bufferUsage);
        }

        if (!this._rs) {
            // TODO: Should not need this in 2D/columbus view, but is hiding a triangulation issue.
            this._rs = context.createRenderState({
                cull : {
                    enabled : true,
                    face : CullFace.BACK
                },
                blending : BlendingState.ALPHA_BLEND
            });
        }

        // Recompile shader when material or lighting changes
        if (typeof this._material === 'undefined' ||
            this._material !== this.material ||
            this._affectedByLighting !== this.affectedByLighting) {

            this.material = this.material || new ColorMaterial();
            this._material = this.material;
            this._affectedByLighting = this.affectedByLighting;

            var fsSource =
                '#line 0\n' +
                Noise +
                '#line 0\n' +
                this._material._getShaderSource() +
                (this._affectedByLighting ? '#define AFFECTED_BY_LIGHTING 1\n' : '') +
                '#line 0\n' +
                PolygonFS;

            this._sp = this._sp && this._sp.release();
            this._sp = context.getShaderCache().getShaderProgram(PolygonVS, fsSource, attributeIndices);

            this._drawUniforms = combine(this._uniforms, this._material._uniforms);
        }
    };

    /**
     * Renders the polygon.  In order for changes to positions and properties to be realized,
     * {@link Polygon#update} must be called before <code>render</code>.
     *
     * @memberof Polygon
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Polygon#update
     * @see Polygon#setTextureAtlas
     */
    Polygon.prototype.render = function(context) {
        if (this.show) {
            var vas = this._vertices.getVertexArrays();
            var length = vas.length;
            for ( var j = 0; j < length; ++j) {
                context.draw({
                    primitiveType : PrimitiveType.TRIANGLES,
                    shaderProgram : this._sp,
                    uniformMap : this._drawUniforms,
                    vertexArray : vas[j],
                    renderState : this._rs
                });
            }
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof Polygon
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    Polygon.prototype.updateForPick = function(context) {
        if (this.show) {
            this._spPick = context.getShaderCache().getShaderProgram(PolygonVSPick, PolygonFSPick, attributeIndices);

            this._rsPick = context.createRenderState({
                // TODO: Should not need this in 2D/columbus view, but is hiding a triangulation issue.
                cull : {
                    enabled : true,
                    face : CullFace.BACK
                }
            });

            this._pickId = context.createPickId(this);

            var that = this;
            this._pickUniforms = {
                u_pickColor : function() {
                    return that._pickId.normalizedRgba;
                },
                u_morphTime : function() {
                    return that.morphTime;
                },
                u_height : function() {
                    return that.height;
                }
            };

            this.updateForPick = function(context) {
            };
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof Polygon
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    Polygon.prototype.renderForPick = function(context, framebuffer) {
        if (this.show) {
            var vas = this._vertices.getVertexArrays();
            var length = vas.length;
            for ( var j = 0; j < length; ++j) {
                context.draw({
                    primitiveType : PrimitiveType.TRIANGLES,
                    shaderProgram : this._spPick,
                    uniformMap : this._pickUniforms,
                    vertexArray : vas[j],
                    renderState : this._rsPick,
                    framebuffer : framebuffer
                });
            }
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof Polygon
     *
     * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see Polygon#destroy
     */
    Polygon.prototype.isDestroyed = function() {
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
     * @memberof Polygon
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Polygon#isDestroyed
     *
     * @example
     * polygon = polygon && polygon.destroy();
     */
    Polygon.prototype.destroy = function() {
        this._sp = this._sp && this._sp.release();
        this._spPick = this._spPick && this._spPick.release();
        this._vertices = this._vertices.destroy();
        this._pickId = this._pickId && this._pickId.destroy();
        return destroyObject(this);
    };

    return Polygon;
});
