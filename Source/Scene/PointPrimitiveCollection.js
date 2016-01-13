/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/EncodedCartesian3',
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/PrimitiveType',
        '../Renderer/BufferUsage',
        '../Renderer/ContextLimits',
        '../Renderer/DrawCommand',
        '../Renderer/RenderState',
        '../Renderer/ShaderProgram',
        '../Renderer/ShaderSource',
        '../Renderer/VertexArrayFacade',
        '../Shaders/PointPrimitiveCollectionFS',
        '../Shaders/PointPrimitiveCollectionVS',
        './BlendingState',
        './Pass',
        './PointPrimitive',
        './SceneMode'
    ], function(
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Color,
        ComponentDatatype,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        EncodedCartesian3,
        CesiumMath,
        Matrix4,
        PrimitiveType,
        BufferUsage,
        ContextLimits,
        DrawCommand,
        RenderState,
        ShaderProgram,
        ShaderSource,
        VertexArrayFacade,
        PointPrimitiveCollectionFS,
        PointPrimitiveCollectionVS,
        BlendingState,
        Pass,
        PointPrimitive,
        SceneMode) {
    "use strict";

    var SHOW_INDEX = PointPrimitive.SHOW_INDEX;
    var POSITION_INDEX = PointPrimitive.POSITION_INDEX;
    var COLOR_INDEX = PointPrimitive.COLOR_INDEX;
    var OUTLINE_COLOR_INDEX = PointPrimitive.OUTLINE_COLOR_INDEX;
    var OUTLINE_WIDTH_INDEX = PointPrimitive.OUTLINE_WIDTH_INDEX;
    var PIXEL_SIZE_INDEX = PointPrimitive.PIXEL_SIZE_INDEX;
    var SCALE_BY_DISTANCE_INDEX = PointPrimitive.SCALE_BY_DISTANCE_INDEX;
    var TRANSLUCENCY_BY_DISTANCE_INDEX = PointPrimitive.TRANSLUCENCY_BY_DISTANCE_INDEX;
    var NUMBER_OF_PROPERTIES = PointPrimitive.NUMBER_OF_PROPERTIES;

    var attributeLocations = {
        positionHighAndSize : 0,
        positionLowAndOutline : 1,
        compressedAttribute0 : 2,        // color, outlineColor, pick color
        compressedAttribute1 : 3,        // show, translucency by distance, some free space
        scaleByDistance : 4
    };

    /**
     * A renderable collection of points.
     * <br /><br />
     * Points are added and removed from the collection using {@link PointPrimitiveCollection#add}
     * and {@link PointPrimitiveCollection#remove}.
     *
     * @alias PointPrimitiveCollection
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms each point from model to world coordinates.
     * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Determines if this primitive's commands' bounding spheres are shown.
     *
     * @performance For best performance, prefer a few collections, each with many points, to
     * many collections with only a few points each.  Organize collections so that points
     * with the same update frequency are in the same collection, i.e., points that do not
     * change should be in one collection; points that change every frame should be in another
     * collection; and so on.
     *
     *
     * @example
     * // Create a pointPrimitive collection with two points
     * var points = scene.primitives.add(new Cesium.PointPrimitiveCollection());
     * points.add({
     *   position : new Cesium.Cartesian3(1.0, 2.0, 3.0),
     *   color : Cesium.Color.YELLOW
     * });
     * points.add({
     *   position : new Cesium.Cartesian3(4.0, 5.0, 6.0),
     *   color : Cesium.Color.CYAN
     * });
     * 
     * @see PointPrimitiveCollection#add
     * @see PointPrimitiveCollection#remove
     * @see PointPrimitive
     */
    function PointPrimitiveCollection(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._sp = undefined;
        this._rs = undefined;
        this._vaf = undefined;
        this._spPick = undefined;

        this._pointPrimitives = [];
        this._pointPrimitivesToUpdate = [];
        this._pointPrimitivesToUpdateIndex = 0;
        this._pointPrimitivesRemoved = false;
        this._createVertexArray = false;

        this._shaderScaleByDistance = false;
        this._compiledShaderScaleByDistance = false;
        this._compiledShaderScaleByDistancePick = false;

        this._shaderTranslucencyByDistance = false;
        this._compiledShaderTranslucencyByDistance = false;
        this._compiledShaderTranslucencyByDistancePick = false;

        this._propertiesChanged = new Uint32Array(NUMBER_OF_PROPERTIES);

        this._maxPixelSize = 1.0;

        this._baseVolume = new BoundingSphere();
        this._baseVolumeWC = new BoundingSphere();
        this._baseVolume2D = new BoundingSphere();
        this._boundingVolume = new BoundingSphere();
        this._boundingVolumeDirty = false;

        this._colorCommands = [];
        this._pickCommands = [];

        /**
         * The 4x4 transformation matrix that transforms each point in this collection from model to world coordinates.
         * When this is the identity matrix, the pointPrimitives are drawn in world coordinates, i.e., Earth's WGS84 coordinates.
         * Local reference frames can be used by providing a different transformation matrix, like that returned
         * by {@link Transforms.eastNorthUpToFixedFrame}.
         *
         * @type {Matrix4}
         * @default {@link Matrix4.IDENTITY}
         *
         *
         * @example
         * var center = Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883);
         * pointPrimitives.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(center);
         * pointPrimitives.add({
         *   color : Cesium.Color.ORANGE,
         *   position : new Cesium.Cartesian3(0.0, 0.0, 0.0) // center
         * });
         * pointPrimitives.add({
         *   color : Cesium.Color.YELLOW,
         *   position : new Cesium.Cartesian3(1000000.0, 0.0, 0.0) // east
         * });
         * pointPrimitives.add({
         *   color : Cesium.Color.GREEN,
         *   position : new Cesium.Cartesian3(0.0, 1000000.0, 0.0) // north
         * });
         * pointPrimitives.add({
         *   color : Cesium.Color.CYAN,
         *   position : new Cesium.Cartesian3(0.0, 0.0, 1000000.0) // up
         * });
         * 
         * @see Transforms.eastNorthUpToFixedFrame
         */
        this.modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));
        this._modelMatrix = Matrix4.clone(Matrix4.IDENTITY);

        /**
         * This property is for debugging only; it is not for production use nor is it optimized.
         * <p>
         * Draws the bounding sphere for each draw command in the primitive.
         * </p>
         *
         * @type {Boolean}
         *
         * @default false
         */
        this.debugShowBoundingVolume = defaultValue(options.debugShowBoundingVolume, false);

        this._mode = SceneMode.SCENE3D;
        this._maxTotalPointSize = 1;

        // The buffer usage for each attribute is determined based on the usage of the attribute over time.
        this._buffersUsage = [
                              BufferUsage.STATIC_DRAW, // SHOW_INDEX
                              BufferUsage.STATIC_DRAW, // POSITION_INDEX
                              BufferUsage.STATIC_DRAW, // COLOR_INDEX
                              BufferUsage.STATIC_DRAW, // OUTLINE_COLOR_INDEX
                              BufferUsage.STATIC_DRAW, // OUTLINE_WIDTH_INDEX
                              BufferUsage.STATIC_DRAW, // PIXEL_SIZE_INDEX
                              BufferUsage.STATIC_DRAW, // SCALE_BY_DISTANCE_INDEX
                              BufferUsage.STATIC_DRAW  // TRANSLUCENCY_BY_DISTANCE_INDEX
                          ];

        var that = this;
        this._uniforms = {
            u_maxTotalPointSize : function() {
                return that._maxTotalPointSize;
            }
        };
    }

    defineProperties(PointPrimitiveCollection.prototype, {
        /**
         * Returns the number of points in this collection.  This is commonly used with
         * {@link PointPrimitiveCollection#get} to iterate over all the points
         * in the collection.
         * @memberof PointPrimitiveCollection.prototype
         * @type {Number}
         */
        length : {
            get : function() {
                removePointPrimitives(this);
                return this._pointPrimitives.length;
            }
        }
    });

    function destroyPointPrimitives(pointPrimitives) {
        var length = pointPrimitives.length;
        for (var i = 0; i < length; ++i) {
            if (pointPrimitives[i]) {
                pointPrimitives[i]._destroy();
            }
        }
    }

    /**
     * Creates and adds a point with the specified initial properties to the collection.
     * The added point is returned so it can be modified or removed from the collection later.
     *
     * @param {Object}[pointPrimitive] A template describing the point's properties as shown in Example 1.
     * @returns {PointPrimitive} The point that was added to the collection.
     *
     * @performance Calling <code>add</code> is expected constant time.  However, the collection's vertex buffer
     * is rewritten - an <code>O(n)</code> operation that also incurs CPU to GPU overhead.  For
     * best performance, add as many pointPrimitives as possible before calling <code>update</code>.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     *
     * @example
     * // Example 1:  Add a point, specifying all the default values.
     * var p = pointPrimitives.add({
     *   show : true,
     *   position : Cesium.Cartesian3.ZERO,
     *   pixelSize : 10.0,
     *   color : Cesium.Color.WHITE,
     *   outlineColor : Cesium.Color.TRANSPARENT,
     *   outlineWidth : 0.0,
     *   id : undefined
     * });
     *
     * @example
     * // Example 2:  Specify only the point's cartographic position.
     * var p = pointPrimitives.add({
     *   position : Cesium.Cartesian3.fromDegrees(longitude, latitude, height)
     * });
     * 
     * @see PointPrimitiveCollection#remove
     * @see PointPrimitiveCollection#removeAll
     */
    PointPrimitiveCollection.prototype.add = function(pointPrimitive) {
        var p = new PointPrimitive(pointPrimitive, this);
        p._index = this._pointPrimitives.length;

        this._pointPrimitives.push(p);
        this._createVertexArray = true;

        return p;
    };

    /**
     * Removes a point from the collection.
     *
     * @param {PointPrimitive} pointPrimitive The point to remove.
     * @returns {Boolean} <code>true</code> if the point was removed; <code>false</code> if the point was not found in the collection.
     *
     * @performance Calling <code>remove</code> is expected constant time.  However, the collection's vertex buffer
     * is rewritten - an <code>O(n)</code> operation that also incurs CPU to GPU overhead.  For
     * best performance, remove as many points as possible before calling <code>update</code>.
     * If you intend to temporarily hide a point, it is usually more efficient to call
     * {@link PointPrimitive#show} instead of removing and re-adding the point.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     *
     * @example
     * var p = pointPrimitives.add(...);
     * pointPrimitives.remove(p);  // Returns true
     * 
     * @see PointPrimitiveCollection#add
     * @see PointPrimitiveCollection#removeAll
     * @see PointPrimitive#show
     */
    PointPrimitiveCollection.prototype.remove = function(pointPrimitive) {
        if (this.contains(pointPrimitive)) {
            this._pointPrimitives[pointPrimitive._index] = null; // Removed later
            this._pointPrimitivesRemoved = true;
            this._createVertexArray = true;
            pointPrimitive._destroy();
            return true;
        }

        return false;
    };

    /**
     * Removes all points from the collection.
     *
     * @performance <code>O(n)</code>.  It is more efficient to remove all the points
     * from a collection and then add new ones than to create a new collection entirely.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     *
     * @example
     * pointPrimitives.add(...);
     * pointPrimitives.add(...);
     * pointPrimitives.removeAll();
     * 
     * @see PointPrimitiveCollection#add
     * @see PointPrimitiveCollection#remove
     */
    PointPrimitiveCollection.prototype.removeAll = function() {
        destroyPointPrimitives(this._pointPrimitives);
        this._pointPrimitives = [];
        this._pointPrimitivesToUpdate = [];
        this._pointPrimitivesToUpdateIndex = 0;
        this._pointPrimitivesRemoved = false;

        this._createVertexArray = true;
    };

    function removePointPrimitives(pointPrimitiveCollection) {
        if (pointPrimitiveCollection._pointPrimitivesRemoved) {
            pointPrimitiveCollection._pointPrimitivesRemoved = false;

            var newPointPrimitives = [];
            var pointPrimitives = pointPrimitiveCollection._pointPrimitives;
            var length = pointPrimitives.length;
            for (var i = 0, j = 0; i < length; ++i) {
                var pointPrimitive = pointPrimitives[i];
                if (pointPrimitive) {
                    pointPrimitive._index = j++;
                    newPointPrimitives.push(pointPrimitive);
                }
            }

            pointPrimitiveCollection._pointPrimitives = newPointPrimitives;
        }
    }

    PointPrimitiveCollection.prototype._updatePointPrimitive = function(pointPrimitive, propertyChanged) {
        if (!pointPrimitive._dirty) {
            this._pointPrimitivesToUpdate[this._pointPrimitivesToUpdateIndex++] = pointPrimitive;
        }

        ++this._propertiesChanged[propertyChanged];
    };

    /**
     * Check whether this collection contains a given point.
     *
     * @param {PointPrimitive} [pointPrimitive] The point to check for.
     * @returns {Boolean} true if this collection contains the point, false otherwise.
     *
     * @see PointPrimitiveCollection#get
     */
    PointPrimitiveCollection.prototype.contains = function(pointPrimitive) {
        return defined(pointPrimitive) && pointPrimitive._pointPrimitiveCollection === this;
    };

    /**
     * Returns the point in the collection at the specified index.  Indices are zero-based
     * and increase as points are added.  Removing a point shifts all points after
     * it to the left, changing their indices.  This function is commonly used with
     * {@link PointPrimitiveCollection#length} to iterate over all the points
     * in the collection.
     *
     * @param {Number} index The zero-based index of the point.
     * @returns {PointPrimitive} The point at the specified index.
     *
     * @performance Expected constant time.  If points were removed from the collection and
     * {@link PointPrimitiveCollection#update} was not called, an implicit <code>O(n)</code>
     * operation is performed.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     *
     * @example
     * // Toggle the show property of every point in the collection
     * var len = pointPrimitives.length;
     * for (var i = 0; i < len; ++i) {
     *   var p = pointPrimitives.get(i);
     *   p.show = !p.show;
     * }
     * 
     * @see PointPrimitiveCollection#length
     */
    PointPrimitiveCollection.prototype.get = function(index) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(index)) {
            throw new DeveloperError('index is required.');
        }
        //>>includeEnd('debug');

        removePointPrimitives(this);
        return this._pointPrimitives[index];
    };

    PointPrimitiveCollection.prototype.computeNewBuffersUsage = function() {
        var buffersUsage = this._buffersUsage;
        var usageChanged = false;

        var properties = this._propertiesChanged;
        for ( var k = 0; k < NUMBER_OF_PROPERTIES; ++k) {
            var newUsage = (properties[k] === 0) ? BufferUsage.STATIC_DRAW : BufferUsage.STREAM_DRAW;
            usageChanged = usageChanged || (buffersUsage[k] !== newUsage);
            buffersUsage[k] = newUsage;
        }

        return usageChanged;
    };

    function createVAF(context, numberOfPointPrimitives, buffersUsage) {
        return new VertexArrayFacade(context, [{
            index : attributeLocations.positionHighAndSize,
            componentsPerAttribute : 4,
            componentDatatype : ComponentDatatype.FLOAT,
            usage : buffersUsage[POSITION_INDEX]
        }, {
            index : attributeLocations.positionLowAndShow,
            componentsPerAttribute : 4,
            componentDatatype : ComponentDatatype.FLOAT,
            usage : buffersUsage[POSITION_INDEX]
        }, {
            index : attributeLocations.compressedAttribute0,
            componentsPerAttribute : 4,
            componentDatatype : ComponentDatatype.FLOAT,
            usage : buffersUsage[COLOR_INDEX]
        }, {
            index : attributeLocations.compressedAttribute1,
            componentsPerAttribute : 4,
            componentDatatype : ComponentDatatype.FLOAT,
            usage : buffersUsage[TRANSLUCENCY_BY_DISTANCE_INDEX]
        }, {
            index : attributeLocations.scaleByDistance,
            componentsPerAttribute : 4,
            componentDatatype : ComponentDatatype.FLOAT,
            usage : buffersUsage[SCALE_BY_DISTANCE_INDEX]
        }], numberOfPointPrimitives); // 1 vertex per pointPrimitive
    }

    ///////////////////////////////////////////////////////////////////////////

    // PERFORMANCE_IDEA:  Save memory if a property is the same for all pointPrimitives, use a latched attribute state,
    // instead of storing it in a vertex buffer.

    var writePositionScratch = new EncodedCartesian3();

    function writePositionSizeAndOutline(pointPrimitiveCollection, context, vafWriters, pointPrimitive) {
        var i = pointPrimitive._index;
        var position = pointPrimitive._getActualPosition();

        if (pointPrimitiveCollection._mode === SceneMode.SCENE3D) {
            BoundingSphere.expand(pointPrimitiveCollection._baseVolume, position, pointPrimitiveCollection._baseVolume);
            pointPrimitiveCollection._boundingVolumeDirty = true;
        }

        EncodedCartesian3.fromCartesian(position, writePositionScratch);
        var pixelSize = pointPrimitive.pixelSize;
        var outlineWidth = pointPrimitive.outlineWidth;

        pointPrimitiveCollection._maxPixelSize = Math.max(pointPrimitiveCollection._maxPixelSize, pixelSize + outlineWidth);

        var positionHighWriter = vafWriters[attributeLocations.positionHighAndSize];
        var high = writePositionScratch.high;
        positionHighWriter(i, high.x, high.y, high.z, pixelSize);

        var positionLowWriter = vafWriters[attributeLocations.positionLowAndOutline];
        var low = writePositionScratch.low;
        positionLowWriter(i, low.x, low.y, low.z, outlineWidth);
    }

    var LEFT_SHIFT16 = 65536.0; // 2^16
    var LEFT_SHIFT8 = 256.0;    // 2^8

    function writeCompressedAttrib0(pointPrimitiveCollection, context, vafWriters, pointPrimitive) {
        var i = pointPrimitive._index;

        var color = pointPrimitive.color;
        var pickColor = pointPrimitive.getPickId(context).color;
        var outlineColor = pointPrimitive.outlineColor;

        var red = Color.floatToByte(color.red);
        var green = Color.floatToByte(color.green);
        var blue = Color.floatToByte(color.blue);
        var compressed0 = red * LEFT_SHIFT16 + green * LEFT_SHIFT8 + blue;

        red = Color.floatToByte(outlineColor.red);
        green = Color.floatToByte(outlineColor.green);
        blue = Color.floatToByte(outlineColor.blue);
        var compressed1 = red * LEFT_SHIFT16 + green * LEFT_SHIFT8 + blue;

        red = Color.floatToByte(pickColor.red);
        green = Color.floatToByte(pickColor.green);
        blue = Color.floatToByte(pickColor.blue);
        var compressed2 = red * LEFT_SHIFT16 + green * LEFT_SHIFT8 + blue;

        var compressed3 =
            Color.floatToByte(color.alpha) * LEFT_SHIFT16 +
            Color.floatToByte(outlineColor.alpha) * LEFT_SHIFT8 +
            Color.floatToByte(pickColor.alpha);

        var writer = vafWriters[attributeLocations.compressedAttribute0];
        writer(i, compressed0, compressed1, compressed2, compressed3);
    }

    function writeCompressedAttrib1(pointPrimitiveCollection, context, vafWriters, pointPrimitive) {
        var i = pointPrimitive._index;

        var near = 0.0;
        var nearValue = 1.0;
        var far = 1.0;
        var farValue = 1.0;

        var translucency = pointPrimitive.translucencyByDistance;
        if (defined(translucency)) {
            near = translucency.near;
            nearValue = translucency.nearValue;
            far = translucency.far;
            farValue = translucency.farValue;

            if (nearValue !== 1.0 || farValue !== 1.0) {
                // translucency by distance calculation in shader need not be enabled
                // until a pointPrimitive with near and far !== 1.0 is found
                pointPrimitiveCollection._shaderTranslucencyByDistance = true;
            }
        }

        var show = pointPrimitive.show;

        // If the color alphas are zero, do not show this pointPrimitive.  This lets us avoid providing
        // color during the pick pass and also eliminates a discard in the fragment shader.
        if (pointPrimitive.color.alpha === 0.0 && pointPrimitive.outlineColor.alpha === 0.0) {
            show = false;
        }

        nearValue = CesiumMath.clamp(nearValue, 0.0, 1.0);
        nearValue = nearValue === 1.0 ? 255.0 : (nearValue * 255.0) | 0;
        var compressed0 = (show ? 1.0 : 0.0) * LEFT_SHIFT8 + nearValue;

        farValue = CesiumMath.clamp(farValue, 0.0, 1.0);
        farValue = farValue === 1.0 ? 255.0 : (farValue * 255.0) | 0;
        var compressed1 = farValue;

        var writer = vafWriters[attributeLocations.compressedAttribute1];
        writer(i, compressed0, compressed1, near, far);
    }

    function writeScaleByDistance(pointPrimitiveCollection, context, vafWriters, pointPrimitive) {
        var i = pointPrimitive._index;
        var writer = vafWriters[attributeLocations.scaleByDistance];
        var near = 0.0;
        var nearValue = 1.0;
        var far = 1.0;
        var farValue = 1.0;

        var scale = pointPrimitive.scaleByDistance;
        if (defined(scale)) {
            near = scale.near;
            nearValue = scale.nearValue;
            far = scale.far;
            farValue = scale.farValue;

            if (nearValue !== 1.0 || farValue !== 1.0) {
                // scale by distance calculation in shader need not be enabled
                // until a pointPrimitive with near and far !== 1.0 is found
                pointPrimitiveCollection._shaderScaleByDistance = true;
            }
        }

        writer(i, near, nearValue, far, farValue);
    }

    function writePointPrimitive(pointPrimitiveCollection, context, vafWriters, pointPrimitive) {
        writePositionSizeAndOutline(pointPrimitiveCollection, context, vafWriters, pointPrimitive);
        writeCompressedAttrib0(pointPrimitiveCollection, context, vafWriters, pointPrimitive);
        writeCompressedAttrib1(pointPrimitiveCollection, context, vafWriters, pointPrimitive);
        writeScaleByDistance(pointPrimitiveCollection, context, vafWriters, pointPrimitive);
    }

    function recomputeActualPositions(pointPrimitiveCollection, pointPrimitives, length, frameState, modelMatrix, recomputeBoundingVolume) {
        var boundingVolume;
        if (frameState.mode === SceneMode.SCENE3D) {
            boundingVolume = pointPrimitiveCollection._baseVolume;
            pointPrimitiveCollection._boundingVolumeDirty = true;
        } else {
            boundingVolume = pointPrimitiveCollection._baseVolume2D;
        }

        var positions = [];
        for ( var i = 0; i < length; ++i) {
            var pointPrimitive = pointPrimitives[i];
            var position = pointPrimitive.position;
            var actualPosition = PointPrimitive._computeActualPosition(position, frameState, modelMatrix);
            if (defined(actualPosition)) {
                pointPrimitive._setActualPosition(actualPosition);

                if (recomputeBoundingVolume) {
                    positions.push(actualPosition);
                } else {
                    BoundingSphere.expand(boundingVolume, actualPosition, boundingVolume);
                }
            }
        }

        if (recomputeBoundingVolume) {
            BoundingSphere.fromPoints(positions, boundingVolume);
        }
    }

    function updateMode(pointPrimitiveCollection, frameState) {
        var mode = frameState.mode;

        var pointPrimitives = pointPrimitiveCollection._pointPrimitives;
        var pointPrimitivesToUpdate = pointPrimitiveCollection._pointPrimitivesToUpdate;
        var modelMatrix = pointPrimitiveCollection._modelMatrix;

        if (pointPrimitiveCollection._createVertexArray ||
            pointPrimitiveCollection._mode !== mode ||
            mode !== SceneMode.SCENE3D &&
            !Matrix4.equals(modelMatrix, pointPrimitiveCollection.modelMatrix)) {

            pointPrimitiveCollection._mode = mode;
            Matrix4.clone(pointPrimitiveCollection.modelMatrix, modelMatrix);
            pointPrimitiveCollection._createVertexArray = true;

            if (mode === SceneMode.SCENE3D || mode === SceneMode.SCENE2D || mode === SceneMode.COLUMBUS_VIEW) {
                recomputeActualPositions(pointPrimitiveCollection, pointPrimitives, pointPrimitives.length, frameState, modelMatrix, true);
            }
        } else if (mode === SceneMode.MORPHING) {
            recomputeActualPositions(pointPrimitiveCollection, pointPrimitives, pointPrimitives.length, frameState, modelMatrix, true);
        } else if (mode === SceneMode.SCENE2D || mode === SceneMode.COLUMBUS_VIEW) {
            recomputeActualPositions(pointPrimitiveCollection, pointPrimitivesToUpdate, pointPrimitiveCollection._pointPrimitivesToUpdateIndex, frameState, modelMatrix, false);
        }
    }

    function updateBoundingVolume(collection, frameState, boundingVolume) {
        var pixelSize = frameState.camera.getPixelSize(boundingVolume, frameState.context.drawingBufferWidth, frameState.context.drawingBufferHeight);
        var size = pixelSize * collection._maxPixelSize;
        boundingVolume.radius += size;
    }

    var scratchWriterArray = [];

    /**
     * @private
     */
    PointPrimitiveCollection.prototype.update = function(frameState) {
        removePointPrimitives(this);

        this._maxTotalPointSize = ContextLimits.maximumAliasedPointSize;

        updateMode(this, frameState);

        var pointPrimitives = this._pointPrimitives;
        var pointPrimitivesLength = pointPrimitives.length;
        var pointPrimitivesToUpdate = this._pointPrimitivesToUpdate;
        var pointPrimitivesToUpdateLength = this._pointPrimitivesToUpdateIndex;

        var properties = this._propertiesChanged;

        var createVertexArray = this._createVertexArray;

        var vafWriters;
        var context = frameState.context;
        var pass = frameState.passes;
        var picking = pass.pick;

        // PERFORMANCE_IDEA: Round robin multiple buffers.
        if (createVertexArray || (!picking && this.computeNewBuffersUsage())) {
            this._createVertexArray = false;

            for (var k = 0; k < NUMBER_OF_PROPERTIES; ++k) {
                properties[k] = 0;
            }

            this._vaf = this._vaf && this._vaf.destroy();

            if (pointPrimitivesLength > 0) {
                // PERFORMANCE_IDEA:  Instead of creating a new one, resize like std::vector.
                this._vaf = createVAF(context, pointPrimitivesLength, this._buffersUsage);
                vafWriters = this._vaf.writers;

                // Rewrite entire buffer if pointPrimitives were added or removed.
                for (var i = 0; i < pointPrimitivesLength; ++i) {
                    var pointPrimitive = this._pointPrimitives[i];
                    pointPrimitive._dirty = false; // In case it needed an update.
                    writePointPrimitive(this, context, vafWriters, pointPrimitive);
                }

                this._vaf.commit();
            }

            this._pointPrimitivesToUpdateIndex = 0;
        } else {
            // PointPrimitives were modified, but none were added or removed.
            if (pointPrimitivesToUpdateLength > 0) {
                var writers = scratchWriterArray;
                writers.length = 0;

                if (properties[POSITION_INDEX] || properties[OUTLINE_WIDTH_INDEX] || properties[PIXEL_SIZE_INDEX]) {
                    writers.push(writePositionSizeAndOutline);
                }

                if (properties[COLOR_INDEX] || properties[OUTLINE_COLOR_INDEX]) {
                    writers.push(writeCompressedAttrib0);
                }

                if (properties[SHOW_INDEX] || properties[TRANSLUCENCY_BY_DISTANCE_INDEX]) {
                    writers.push(writeCompressedAttrib1);
                }

                if (properties[SCALE_BY_DISTANCE_INDEX]) {
                    writers.push(writeScaleByDistance);
                }

                var numWriters = writers.length;

                vafWriters = this._vaf.writers;

                if ((pointPrimitivesToUpdateLength / pointPrimitivesLength) > 0.1) {
                    // If more than 10% of pointPrimitive change, rewrite the entire buffer.

                    // PERFORMANCE_IDEA:  I totally made up 10% :).

                    for (var m = 0; m < pointPrimitivesToUpdateLength; ++m) {
                        var b = pointPrimitivesToUpdate[m];
                        b._dirty = false;

                        for ( var n = 0; n < numWriters; ++n) {
                            writers[n](this, context, vafWriters, b);
                        }
                    }
                    this._vaf.commit();
                } else {
                    for (var h = 0; h < pointPrimitivesToUpdateLength; ++h) {
                        var bb = pointPrimitivesToUpdate[h];
                        bb._dirty = false;

                        for ( var o = 0; o < numWriters; ++o) {
                            writers[o](this, context, vafWriters, bb);
                        }
                        this._vaf.subCommit(bb._index, 1);
                    }
                    this._vaf.endSubCommits();
                }

                this._pointPrimitivesToUpdateIndex = 0;
            }
        }

        // If the number of total pointPrimitives ever shrinks considerably
        // Truncate pointPrimitivesToUpdate so that we free memory that we're
        // not going to be using.
        if (pointPrimitivesToUpdateLength > pointPrimitivesLength * 1.5) {
            pointPrimitivesToUpdate.length = pointPrimitivesLength;
        }

        if (!defined(this._vaf) || !defined(this._vaf.va)) {
            return;
        }

        if (this._boundingVolumeDirty) {
            this._boundingVolumeDirty = false;
            BoundingSphere.transform(this._baseVolume, this.modelMatrix, this._baseVolumeWC);
        }

        var boundingVolume;
        var modelMatrix = Matrix4.IDENTITY;
        if (frameState.mode === SceneMode.SCENE3D) {
            modelMatrix = this.modelMatrix;
            boundingVolume = BoundingSphere.clone(this._baseVolumeWC, this._boundingVolume);
        } else {
            boundingVolume = BoundingSphere.clone(this._baseVolume2D, this._boundingVolume);
        }
        updateBoundingVolume(this, frameState, boundingVolume);

        var va;
        var vaLength;
        var command;
        var j;
        var vs;
        var fs;

        var commandList = frameState.commandList;

        if (pass.render) {
            var colorList = this._colorCommands;

            if (!defined(this._rs)) {
                this._rs = RenderState.fromCache({
                    depthTest : {
                        enabled : true
                    },
                    blending : BlendingState.ALPHA_BLEND
                });
            }

            if (!defined(this._sp) ||
                    (this._shaderScaleByDistance && !this._compiledShaderScaleByDistance) ||
                    (this._shaderTranslucencyByDistance && !this._compiledShaderTranslucencyByDistance)) {

                vs = new ShaderSource({
                    sources : [PointPrimitiveCollectionVS]
                });
                if (this._shaderScaleByDistance) {
                    vs.defines.push('EYE_DISTANCE_SCALING');
                }
                if (this._shaderTranslucencyByDistance) {
                    vs.defines.push('EYE_DISTANCE_TRANSLUCENCY');
                }

                this._sp = ShaderProgram.replaceCache({
                    context : context,
                    shaderProgram : this._sp,
                    vertexShaderSource : vs,
                    fragmentShaderSource : PointPrimitiveCollectionFS,
                    attributeLocations : attributeLocations
                });

                this._compiledShaderScaleByDistance = this._shaderScaleByDistance;
                this._compiledShaderTranslucencyByDistance = this._shaderTranslucencyByDistance;
            }

            va = this._vaf.va;
            vaLength = va.length;

            colorList.length = vaLength;
            for (j = 0; j < vaLength; ++j) {
                command = colorList[j];
                if (!defined(command)) {
                    command = colorList[j] = new DrawCommand({
                        primitiveType : PrimitiveType.POINTS,
                        pass : Pass.OPAQUE,
                        owner : this
                    });
                }

                command.boundingVolume = boundingVolume;
                command.modelMatrix = modelMatrix;
                command.shaderProgram = this._sp;
                command.uniformMap = this._uniforms;
                command.vertexArray = va[j].va;
                command.renderState = this._rs;
                command.debugShowBoundingVolume = this.debugShowBoundingVolume;

                commandList.push(command);
            }
        }

        if (picking) {
            var pickList = this._pickCommands;

            if (!defined(this._spPick) ||
                    (this._shaderScaleByDistance && !this._compiledShaderScaleByDistancePick) ||
                    (this._shaderTranslucencyByDistance && !this._compiledShaderTranslucencyByDistancePick)) {

                vs = new ShaderSource({
                    defines : ['RENDER_FOR_PICK'],
                    sources : [PointPrimitiveCollectionVS]
                });

                if (this._shaderScaleByDistance) {
                    vs.defines.push('EYE_DISTANCE_SCALING');
                }
                if (this._shaderTranslucencyByDistance) {
                    vs.defines.push('EYE_DISTANCE_TRANSLUCENCY');
                }

                fs = new ShaderSource({
                    defines : ['RENDER_FOR_PICK'],
                    sources : [PointPrimitiveCollectionFS]
                });

                this._spPick = ShaderProgram.replaceCache({
                    context : context,
                    shaderProgram : this._spPick,
                    vertexShaderSource : vs,
                    fragmentShaderSource : fs,
                    attributeLocations : attributeLocations
                });

                this._compiledShaderScaleByDistancePick = this._shaderScaleByDistance;
                this._compiledShaderTranslucencyByDistancePick = this._shaderTranslucencyByDistance;
            }

            va = this._vaf.va;
            vaLength = va.length;

            pickList.length = vaLength;
            for (j = 0; j < vaLength; ++j) {
                command = pickList[j];
                if (!defined(command)) {
                    command = pickList[j] = new DrawCommand({
                        primitiveType : PrimitiveType.POINTS,
                        pass : Pass.OPAQUE,
                        owner : this
                    });
                }

                command.boundingVolume = boundingVolume;
                command.modelMatrix = modelMatrix;
                command.shaderProgram = this._spPick;
                command.uniformMap = this._uniforms;
                command.vertexArray = va[j].va;
                command.renderState = this._rs;

                commandList.push(command);
            }
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see PointPrimitiveCollection#destroy
     */
    PointPrimitiveCollection.prototype.isDestroyed = function() {
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
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     *
     * @example
     * pointPrimitives = pointPrimitives && pointPrimitives.destroy();
     * 
     * @see PointPrimitiveCollection#isDestroyed
     */
    PointPrimitiveCollection.prototype.destroy = function() {
        this._sp = this._sp && this._sp.destroy();
        this._spPick = this._spPick && this._spPick.destroy();
        this._vaf = this._vaf && this._vaf.destroy();
        destroyPointPrimitives(this._pointPrimitives);

        return destroyObject(this);
    };

    return PointPrimitiveCollection;
});
