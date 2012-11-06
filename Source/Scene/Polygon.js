/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/defaultValue',
        '../Core/Color',
        '../Core/combine',
        '../Core/destroyObject',
        '../Core/Cartesian2',
        '../Core/Math',
        '../Core/Ellipsoid',
        '../Core/BoundingRectangle',
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/ComponentDatatype',
        '../Core/MeshFilters',
        '../Core/PrimitiveType',
        '../Core/EllipsoidTangentPlane',
        '../Core/PolygonPipeline',
        '../Core/WindingOrder',
        '../Core/ExtentTessellator',
        '../Core/Queue',
        '../Renderer/BlendingState',
        '../Renderer/BufferUsage',
        '../Renderer/CommandLists',
        '../Renderer/CullFace',
        '../Renderer/DrawCommand',
        '../Renderer/VertexLayout',
        './Material',
        './SceneMode',
        '../Shaders/Noise',
        '../Shaders/PolygonVS',
        '../Shaders/PolygonFS',
        '../Shaders/PolygonVSPick',
        '../Shaders/PolygonFSPick'
    ], function(
        DeveloperError,
        defaultValue,
        Color,
        combine,
        destroyObject,
        Cartesian2,
        CesiumMath,
        Ellipsoid,
        BoundingRectangle,
        BoundingSphere,
        Cartesian3,
        Cartographic,
        ComponentDatatype,
        MeshFilters,
        PrimitiveType,
        EllipsoidTangentPlane,
        PolygonPipeline,
        WindingOrder,
        ExtentTessellator,
        Queue,
        BlendingState,
        BufferUsage,
        CommandLists,
        CullFace,
        DrawCommand,
        VertexLayout,
        Material,
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
        this._va = undefined;
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
        if (typeof va !== 'undefined') {
            this._va = undefined;

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
     * polygon.material.uniforms.color = {
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
        this._pickId = undefined;

        this._boundingVolume = new BoundingSphere();
        this._boundingVolume2D = new BoundingSphere();

        this._commandLists = new CommandLists();

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
        this._polygonHierarchy = undefined;
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
         * The surface appearance of the polygon.  This can be one of several built-in {@link Material} objects or a custom material, scripted with
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
        this.height = defaultValue(height, 0.0);
        this._extent = undefined;
        this._polygonHierarchy = undefined;
        this._positions = positions;
        this._createVertexArray = true;
    };

    /**
     * Create a set of polygons with holes from a nested hierarchy.
     *
     * @memberof Polygon
     *
     * @param {Object} hierarchy An object defining the vertex positions of each nested polygon.
     * For example, the following polygon has two holes, and one hole has a hole. <code>holes</code> is optional.
     * Leaf nodes only have <code>positions</code>.
     * <pre>
     * <code>
     * {
     *  positions : [ ... ],    // The polygon's outer boundary
     *  holes : [               // The polygon's inner holes
     *    {
     *      positions : [ ... ]
     *    },
     *    {
     *      positions : [ ... ],
     *      holes : [           // A polygon within a hole
     *       {
     *         positions : [ ... ]
     *       }
     *      ]
     *    }
     *  ]
     * }
     * </code>
     * </pre>
     * @param {double} [height=0.0] The height of the polygon.
     *
     * @exception {DeveloperError} At least three positions are required.
     *
     * @example
     * // A triangle within a triangle
     * var hierarchy = {
     *     positions : [new Cartesian3(-634066.5629045101,-4608738.034138676,4348640.761750969),
     *                  new Cartesian3(-1321523.0597310204,-5108871.981065817,3570395.2500986718),
     *                  new Cartesian3(46839.74837473363,-5303481.972379478,3530933.5841716)],
     *     holes : [{
     *         positions :[new Cartesian3(-646079.44483647,-4811233.11175887,4123187.2266941597),
     *                     new Cartesian3(-1024015.4454943262,-5072141.413164587,3716492.6173834214),
     *                     new Cartesian3(-234678.22583880965,-5189078.820849883,3688809.059214336)]
     *      }]
     *  };
     */
    Polygon.prototype.configureFromPolygonHierarchy  = function(hierarchy, height) {
        // Algorithm adapted from http://www.geometrictools.com/Documentation/TriangulationByEarClipping.pdf
        var polygons = [];
        var queue = new Queue();
        queue.enqueue(hierarchy);

        while (queue.length !== 0) {
            var outerNode = queue.dequeue();
            var outerRing = outerNode.positions;

            if (outerRing.length < 3) {
                throw new DeveloperError('At least three positions are required.');
            }

            var numChildren = outerNode.holes ? outerNode.holes.length : 0;
            if (numChildren === 0) {
                // The outer polygon is a simple polygon with no nested inner polygon.
                polygons.push(outerNode.positions);
            } else {
                // The outer polygon contains inner polygons
                var holes = [];
                for ( var i = 0; i < numChildren; i++) {
                    var hole = outerNode.holes[i];
                    holes.push(hole.positions);

                    var numGrandchildren = 0;
                    if (hole.holes) {
                        numGrandchildren = hole.holes.length;
                    }

                    for ( var j = 0; j < numGrandchildren; j++) {
                        queue.enqueue(hole.holes[j]);
                    }
                }
                var combinedPolygon = PolygonPipeline.eliminateHoles(outerRing, holes);
                polygons.push(combinedPolygon);
            }
        }

        this.height = defaultValue(height, 0.0);
        this._positions = undefined;
        this._extent = undefined;
        this._polygonHierarchy = polygons;
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
        this.height = defaultValue(height, 0.0);
        this._positions = undefined;
        this._polygonHierarchy = undefined;
        this._createVertexArray = true;
    };

    var appendTextureCoordinatesCartesian2 = new Cartesian2();
    var appendTextureCoordinatesCartesian3 = new Cartesian3();

    function appendTextureCoordinates(tangentPlane, positions2D, mesh) {
        var boundingRectangle = new BoundingRectangle.fromPoints(positions2D);
        var origin = new Cartesian2(boundingRectangle.x, boundingRectangle.y);

        var positions = mesh.attributes.position.values;
        var length = positions.length;

        var textureCoordinates = new Float32Array(2 * (length / 3));
        var j = 0;

        // PERFORMANCE_IDEA:  Instead of storing texture coordinates per-vertex, we could
        // save memory by computing them in the fragment shader.  However, projecting
        // the point onto the plane may have precision issues.
        for ( var i = 0; i < length; i += 3) {
            var p = appendTextureCoordinatesCartesian3;
            p.x = positions[i];
            p.y = positions[i + 1];
            p.z = positions[i + 2];
            var st = tangentPlane.projectPointOntoPlane(p, appendTextureCoordinatesCartesian2);
            st.subtract(origin, st);

            textureCoordinates[j++] = st.x / boundingRectangle.width;
            textureCoordinates[j++] = st.y / boundingRectangle.height;
        }

        mesh.attributes.textureCoordinates = {
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 2,
            values : textureCoordinates
        };

        return mesh;
    }

    var createMeshFromPositionsPositions = [];

    function createMeshFromPositions(polygon, positions, outerPositions2D) {
        var cleanedPositions = PolygonPipeline.cleanUp(positions);
        if (cleanedPositions.length < 3) {
            // Duplicate positions result in not enough positions to form a polygon.
            return undefined;
        }

        var tangentPlane = EllipsoidTangentPlane.fromPoints(cleanedPositions, polygon.ellipsoid);
        var positions2D = tangentPlane.projectPointsOntoPlane(cleanedPositions, createMeshFromPositionsPositions);

        var originalWindingOrder = PolygonPipeline.computeWindingOrder2D(positions2D);
        if (originalWindingOrder === WindingOrder.CLOCKWISE) {
            positions2D.reverse();
            cleanedPositions.reverse();
        }
        var indices = PolygonPipeline.earClip2D(positions2D);
        var mesh = PolygonPipeline.computeSubdivision(cleanedPositions, indices, polygon._granularity);
        var boundary2D = outerPositions2D || positions2D;
        mesh = appendTextureCoordinates(tangentPlane, boundary2D, mesh);
        return mesh;
    }

    var createMeshesOuterPositions2D = [];

    function createMeshes(polygon) {
        // PERFORMANCE_IDEA:  Move this to a web-worker.
        var i;
        var meshes = [];
        var mesh;

        if ((typeof polygon._extent !== 'undefined') && !polygon._extent.isEmpty()) {
            meshes.push(ExtentTessellator.compute({extent: polygon._extent, generateTextureCoordinates:true}));

            polygon._boundingVolume = BoundingSphere.fromExtent3D(polygon._extent, polygon._ellipsoid, polygon._boundingVolume);
            if (polygon._mode !== SceneMode.SCENE3D) {
                polygon._boundingVolume2D = BoundingSphere.fromExtent2D(polygon._extent, polygon._projection, polygon._boundingVolume2D);
                var center2D = polygon._boundingVolume2D.center;
                polygon._boundingVolume2D.center = new Cartesian3(0.0, center2D.x, center2D.y);
            }
        } else if (typeof polygon._positions !== 'undefined') {
            mesh = createMeshFromPositions(polygon, polygon._positions);
            if (typeof mesh !== 'undefined') {
                meshes.push(mesh);
                polygon._boundingVolume = BoundingSphere.fromPoints(polygon._positions, polygon._boundingVolume);
            }
        } else if (typeof polygon._polygonHierarchy !== 'undefined') {
            var outerPositions =  polygon._polygonHierarchy[0];
            var tangentPlane = EllipsoidTangentPlane.fromPoints(outerPositions, polygon.ellipsoid);
            var outerPositions2D = tangentPlane.projectPointsOntoPlane(outerPositions, createMeshesOuterPositions2D);
            for (i = 0; i < polygon._polygonHierarchy.length; i++) {
                mesh = createMeshFromPositions(polygon, polygon._polygonHierarchy[i], outerPositions2D);
                if (typeof mesh !== 'undefined') {
                    meshes.push(mesh);
                }
            }

            if (meshes.length > 0) {
                // The bounding volume is just around the boundary points, so there could be cases for
                // contrived polygons on contrived ellipsoids - very oblate ones - where the bounding
                // volume doesn't cover the polygon.
                polygon._boundingVolume = BoundingSphere.fromPoints(outerPositions, polygon._boundingVolume);
            }
        }

        if (meshes.length === 0) {
            return undefined;
        }

        var processedMeshes = [];
        for (i = 0; i < meshes.length; i++) {
            mesh = meshes[i];
            mesh = PolygonPipeline.scaleToGeodeticHeight(mesh, polygon.height, polygon.ellipsoid);
            mesh = MeshFilters.reorderForPostVertexCache(mesh);
            mesh = MeshFilters.reorderForPreVertexCache(mesh);

            if (polygon._mode === SceneMode.SCENE3D) {
                mesh.attributes.position2D = { // Not actually used in shader
                        value : [0.0, 0.0]
                    };
                mesh.attributes.position3D = mesh.attributes.position;
                delete mesh.attributes.position;
            } else {
                mesh = MeshFilters.projectTo2D(mesh, polygon._projection);
            }
            processedMeshes = processedMeshes.concat(MeshFilters.fitToUnsignedShortIndices(mesh));
        }

        if (polygon._mode !== SceneMode.SCENE3D) {
            mesh = meshes[0];
            var projectedPositions = mesh.attributes.position2D.values;
            var positions = [];

            for (i = 0; i < projectedPositions.length; i += 2) {
                positions.push(new Cartesian3(projectedPositions[i], projectedPositions[i + 1], 0.0));
            }

            polygon._boundingVolume2D = BoundingSphere.fromPoints(positions, polygon._boundingVolume2D);
            var center2DPositions = polygon._boundingVolume2D.center;
            polygon._boundingVolume2D.center = new Cartesian3(0.0, center2DPositions.x, center2DPositions.y);
        }

        return processedMeshes;
    }

    function getGranularity(polygon, mode) {
        if (mode === SceneMode.SCENE3D) {
            return polygon.scene3D.granularity || polygon.granularity;
        }

        return polygon.scene2D.granularity || polygon.granularity;
    }

    /**
     * Commits changes to properties before rendering by updating the object's WebGL resources.
     *
     * @memberof Polygon
     *
     * @exception {DeveloperError} this.ellipsoid must be defined.
     * @exception {DeveloperError} this.material must be defined.
     * @exception {DeveloperError} this.granularity must be greater than zero.
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    Polygon.prototype.update = function(context, frameState, commandList) {
        if (typeof this.ellipsoid === 'undefined') {
            throw new DeveloperError('this.ellipsoid must be defined.');
        }

        if (typeof this.material === 'undefined') {
            throw new DeveloperError('this.material must be defined.');
        }

        var mode = frameState.mode;
        var granularity = getGranularity(this, mode);

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

        var projection = frameState.scene2D.projection;
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
            this._vertices.update(context, createMeshes(this), this.bufferUsage);
        }

        if (typeof this._vertices.getVertexArrays() === 'undefined') {
            return;
        }

        var boundingVolume;
        if (mode === SceneMode.SCENE3D) {
            boundingVolume = this._boundingVolume;
        } else if (mode === SceneMode.COLUMBUS_VIEW || mode === SceneMode.SCENE2D) {
            boundingVolume = this._boundingVolume2D;
        } else {
            boundingVolume = this._boundingVolume.union(this._boundingVolume2D);
        }

        var pass = frameState.passes;
        var vas = this._vertices.getVertexArrays();
        var length = vas.length;
        var commands;
        var command;

        this._commandLists.removeAll();
        if (pass.color) {
            if (typeof this._rs === 'undefined') {
                // TODO: Should not need this in 2D/columbus view, but is hiding a triangulation issue.
                this._rs = context.createRenderState({
                    cull : {
                        enabled : true,
                        face : CullFace.BACK
                    },
                    blending : BlendingState.ALPHA_BLEND
                });
            }

            var materialChanged = typeof this._material === 'undefined' ||
                this._material !== this.material ||
                this._affectedByLighting !== this.affectedByLighting;

            // Recompile shader when material or lighting changes
            if (materialChanged) {
                this._material = this.material;
                this._affectedByLighting = this.affectedByLighting;

                var fsSource =
                    '#line 0\n' +
                    Noise +
                    '#line 0\n' +
                    this._material.shaderSource +
                    (this._affectedByLighting ? '#define AFFECTED_BY_LIGHTING 1\n' : '') +
                    '#line 0\n' +
                    PolygonFS;

                this._sp = this._sp && this._sp.release();
                this._sp = context.getShaderCache().getShaderProgram(PolygonVS, fsSource, attributeIndices);

                this._drawUniforms = combine([this._uniforms, this._material._uniforms], false, false);
            }

            commands = this._commandLists.colorList;
            commands.length = length;

            for (var i = 0; i < length; ++i) {
                command = commands[i];
                if (typeof command === 'undefined') {
                    command = commands[i] = new DrawCommand();
                }

                command.boundingVolume = boundingVolume;
                command.primitiveType = PrimitiveType.TRIANGLES;
                command.shaderProgram = this._sp,
                command.uniformMap = this._drawUniforms;
                command.vertexArray = vas[i];
                command.renderState = this._rs;
            }
        }

        if (pass.pick) {
            if (typeof this._pickId === 'undefined') {
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
            }

            commands = this._commandLists.pickList;
            commands.length = length;

            for (var j = 0; j < length; ++j) {
                command = commands[j];
                if (typeof command === 'undefined') {
                    command = commands[j] = new DrawCommand();
                }

                command.boundingVolume = boundingVolume;
                command.primitiveType = PrimitiveType.TRIANGLES;
                command.shaderProgram = this._spPick,
                command.uniformMap = this._pickUniforms;
                command.vertexArray = vas[j];
                command.renderState = this._rsPick;
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
