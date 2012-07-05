/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/combine',
        '../Core/destroyObject',
        '../Core/Cartesian4',
        '../Core/Matrix4',
        '../Core/ComponentDatatype',
        '../Core/IndexDatatype',
        '../Core/PrimitiveType',
        '../Core/PolylinePipeline',
        '../Core/Color',
        '../Renderer/BlendingState',
        '../Renderer/BufferUsage',
        './SceneMode',
        './Polyline',
        '../Shaders/PolylineVS',
        '../Shaders/PolylineFS',
        '../Renderer/StencilFunction',
        '../Renderer/StencilOperation'
    ], function(
        DeveloperError,
        combine,
        destroyObject,
        Cartesian4,
        Matrix4,
        ComponentDatatype,
        IndexDatatype,
        PrimitiveType,
        PolylinePipeline,
        Color,
        BlendingState,
        BufferUsage,
        SceneMode,
        Polyline,
        PolylineVS,
        PolylineFS,
        StencilFunction,
        StencilOperation) {
    "use strict";

    var SHOW_INDEX = Polyline.SHOW_INDEX;
    var POSITION_INDEX = Polyline.POSITION_INDEX;
    var COLOR_INDEX = Polyline.COLOR_INDEX;
    var OUTLINE_COLOR_INDEX = Polyline.OUTLINE_COLOR_INDEX;
    var WIDTH_INDEX = Polyline.WIDTH_INDEX;
    var OUTLINE_WIDTH_INDEX = Polyline.OUTLINE_WIDTH_INDEX;
    //POSITION_SIZE_INDEX is needed for when the polyline's position array changes size.
    //When it does, we need to recreate the indicesBuffer.
    var POSITION_SIZE_INDEX = Polyline.POSITION_SIZE_INDEX;
    var NUMBER_OF_PROPERTIES = Polyline.NUMBER_OF_PROPERTIES;

    var attributeIndices = {
        position3D : 0,
        position2D : 1,
        color : 2,
        pickColor : 3,
        show : 4
    };

    /**
     * A renderable collection of polylines.
     * <br /><br />
     * <div align="center">
     * <img src="images/Polyline.png" width="400" height="300" /><br />
     * Example polylines
     * </div>
     * <br /><br />
     * Polylines are added and removed from the collection using {@link PolylineCollection#add}
     * and {@link PolylineCollection#remove}.
     *
     * @alias PolylineCollection
     * @constructor
     *
     * @performance For best performance, prefer a few collections, each with many polylines, to
     * many collections with only a few polylines each.  Organize collections so that polylines
     * with the same update frequency are in the same collection, i.e., polylines that do not
     * change should be in one collection; polylines that change every frame should be in another
     * collection; and so on.
     *
     * @see PolylineCollection#add
     * @see PolylineCollection#remove
     * @see Polyline
     * @see LabelCollection
     *
     * @example
     * // Create a polyline collection with two polylines
     * var polylines = new Cesium.PolylineCollection(undefined);
     * polylines.add({positions:ellipsoid.cartographicDegreesToCartesians([
     *     new Cesium.Cartographic2(-75.10, 39.57),
     *     new Cesium.Cartographic2(-77.02, 38.53),
     *     new Cesium.Cartographic2(-80.50, 35.14),
     *     new Cesium.Cartographic2(-80.12, 25.46)]),
           width:2
           });

     * polylines.add({positions:ellipsoid.cartographicDegreesToCartesians([
     *     new Cesium.Cartographic2(-73.10, 37.57),
     *     new Cesium.Cartographic2(-75.02, 36.53),
     *     new Cesium.Cartographic2(-78.50, 33.14),
     *     new Cesium.Cartographic2(-78.12, 23.46)]),
     *     width:4
     * });
     */
    var PolylineCollection = function() {
        this._polylinesUpdated = false;
        this._polylinesRemoved = false;
        this._createVertexArray = false;
        this._morphTime = 0.0;
        this._propertiesChanged = new Uint32Array(NUMBER_OF_PROPERTIES);
        this._polylines = [];
        this._polylineBuckets = {};

        this.modelMatrix = Matrix4.IDENTITY;
        this._modelMatrix = Matrix4.IDENTITY;

        /**
         * The usage hint for the polyline's vertex buffer.
         *
         * @type BufferUsage
         *
         * @performance If <code>bufferUsage</code> changes, the next time
         * {@link PolylineCollection#update} is called, the polylineCollection's vertex buffer
         * is rewritten - an <code>O(n)</code> operation that also incurs CPU to GPU overhead.
         * For best performance, it is important to provide the proper usage hint.  If the polylineCollection
         * will not change over several frames, use <code>BufferUsage.STATIC_DRAW</code>.
         * If the PolylineCollection will change every frame, use <code>BufferUsage.STREAM_DRAW</code>.
         */
        // The buffer usage for each attribute is determined based on the usage of the attribute over time.
        this._buffersUsage = [
                              BufferUsage.STATIC_DRAW, // SHOW_INDEX
                              BufferUsage.STATIC_DRAW, // POSITION_INDEX
                              BufferUsage.STATIC_DRAW, // COLOR_INDEX
                              BufferUsage.STATIC_DRAW, // OUTLINE_COLOR_INDEX
                              BufferUsage.STATIC_DRAW, // WIDTH_INDEX
                              BufferUsage.STATIC_DRAW  // OUTLINE_WIDTH_INDEX
                             ];

        this._mode = undefined;
        var that = this;

        var drawUniformsOne = {
            u_morphTime : function() {
                return that._morphTime;
            }
        };
        var drawUniformsTwo = {
            u_morphTime : function() {
                return that._morphTime;
            }
        };
        var drawUniformsThree = {
            u_morphTime : function() {
                return that._morphTime;
            }
        };
        var pickUniforms = {
            u_morphTime : function() {
                return that._morphTime;
            }
        };

        this._drawUniformsOne3D = combine(drawUniformsOne, {
            u_model : function() {
                return that._getModelMatrix(that._mode);
            }
        });

        this._drawUniformsTwo3D = combine(drawUniformsTwo, {
            u_model : function() {
                return that._getModelMatrix(that._mode);
            }
        });
        this._drawUniformsThree3D = combine(drawUniformsThree, {
            u_model : function() {
                return that._getModelMatrix(that._mode);
            }
        });
        this._pickUniforms3D = combine(pickUniforms, {
            u_model : function() {
                return that._getModelMatrix(that._mode);
            }
        });

        this._drawUniformsOne2D = combine(drawUniformsOne, {
            u_model : function() {
                return Matrix4.IDENTITY;
            }
        });
        this._drawUniformsTwo2D = combine(drawUniformsTwo, {
            u_model : function() {
                return Matrix4.IDENTITY;
            }
        });
        this._drawUniformsThree2D = combine(drawUniformsThree, {
            u_model : function() {
                return Matrix4.IDENTITY;
            }
        });
        this._pickUniforms2D = combine(pickUniforms, {
            u_model : function() {
                return Matrix4.IDENTITY;
            }
        });

        this._drawUniformsOne = undefined;
        this._drawUniformsTwo = undefined;
        this._drawUniformsThree = undefined;
        this._polylinesToUpdate = [];
        this._colorVertexArrays = [];
        this._outlineColorVertexArrays = [];
        this._pickColorVertexArrays = [];
        this._positionBuffer = undefined;
        this._outlineColorBuffer = undefined;
        this._colorBuffer = undefined;
        this._pickColorBuffer = undefined;
        this._showBuffer = undefined;
    };

    /**
     * Creates and adds a polyline with the specified initial properties to the collection.
     * The added polyline is returned so it can be modified or removed from the collection later.
     *
     * @memberof PolylineCollection
     *
     * @param {Object}[polyline=undefined] A template describing the polyline's properties as shown in Example 1.
     *
     * @return {Polyline} The polyline that was added to the collection.
     *
     * @performance After calling <code>add</code>, {@link PolylineCollection#update} is called and
     * the collection's vertex buffer is rewritten - an <code>O(n)</code> operation that also incurs CPU to GPU overhead.
     * For best performance, add as many polylines as possible before calling <code>update</code>.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see PolylineCollection#remove
     * @see PolylineCollection#removeAll
     * @see PolylineCollection#update
     *
     * @example
     * // Example 1:  Add a polyline, specifying all the default values.
     * var p = polylines.add({
     *   show : true,
     *   positions : ellipsoid.cartographicDegreesToCartesians([
     *     new Cesium.Cartographic2(-75.10, 39.57),
     *     new Cesium.Cartographic2(-77.02, 38.53)]),
     *     color : { red : 1.0, green : 1.0, blue : 1.0, alpha : 1.0 },
     *     width : 1,
     *     outlineWidth : 2
     * });
     *
     */
    PolylineCollection.prototype.add = function(polyline) {
        var p = new Polyline(polyline, this);
        p._index = this._polylines.length;
        this._polylines.push(p);
        this._createVertexArray = true;
        return p;
    };

    /**
     * Removes a polyline from the collection.
     *
     * @memberof PolylineCollection
     *
     * @param {Polyline} polyline The polyline to remove.
     *
     * @return {Boolean} <code>true</code> if the polyline was removed; <code>false</code> if the polyline was not found in the collection.
     *
     * @performance After calling <code>remove</code>, {@link PolylineCollection#update} is called and
     * the collection's vertex buffer is rewritten - an <code>O(n)</code> operation that also incurs CPU to GPU overhead.
     * For best performance, remove as many polylines as possible before calling <code>update</code>.
     * If you intend to temporarily hide a polyline, it is usually more efficient to call
     * {@link Polyline#setShow} instead of removing and re-adding the polyline.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see PolylineCollection#add
     * @see PolylineCollection#removeAll
     * @see PolylineCollection#update
     * @see Polyline#setShow
     *
     * @example
     * var p = polylines.add(...);
     * polylines.remove(p);  // Returns true
     */
    PolylineCollection.prototype.remove = function(polyline) {
        if (this.contains(polyline)) {
            this._polylines[polyline._index] = null; // Removed later
            this._polylinesRemoved = true;
            this._createVertexArray = true;
            polyline._destroy();
            return true;
        }

        return false;
    };

    /**
     * Removes all polylines from the collection.
     *
     * @performance <code>O(n)</code>.  It is more efficient to remove all the polylines
     * from a collection and then add new ones than to create a new collection entirely.
     *
     * @memberof PolylineCollection
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see PolylineCollection#add
     * @see PolylineCollection#remove
     * @see PolylineCollection#update
     *
     * @example
     * polylines.add(...);
     * polylines.add(...);
     * polylines.removeAll();
     */
    PolylineCollection.prototype.removeAll = function() {
        this._destroyPolylines();
        this._polylineBuckets = {};
        this._polylinesRemoved = false;
        this._polylines.length = 0;
        this._polylinesToUpdate.length = 0;
        this._createVertexArray = true;
    };

    /**
     * Determines if this collection contains the specified polyline.
     *
     * @memberof PolylineCollection
     *
     * @param {Object} polyline
     *
     * @see PolylineCollection#get
     */
    PolylineCollection.prototype.contains = function(polyline) {
        return (polyline && (polyline._getCollection() === this));
    };

    /**
     * Returns the polyline in the collection at the specified index.  Indices are zero-based
     * and increase as polylines are added.  Removing a polyline shifts all polylines after
     * it to the left, changing their indices.  This function is commonly used with
     * {@link PolylineCollection#getLength} to iterate over all the polylines
     * in the collection.
     *
     * @memberof PolylineCollection
     *
     * @param {Number} index The zero-based index of the polyline.
     *
     * @return {Polyline} The polyline at the specified index.
     *
     * @performance If polylines were removed from the collection and
     * {@link PolylineCollection#update} was not called, an implicit <code>O(n)</code>
     * operation is performed.
     *
     * @exception {DeveloperError} index is required.
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see PolylineCollection#getLength
     *
     * @example
     * // Toggle the show property of every polyline in the collection
     * var len = polylines.getLength();
     * for (var i = 0; i < len; ++i) {
     *   var p = polylines.get(i);
     *   p.setShow(!p.getShow());
     * }
     */
    PolylineCollection.prototype.get = function(index) {
        if (typeof index === 'undefined') {
            throw new DeveloperError('index is required.');
        }

        this._removePolylines();
        return this._polylines[index];
    };

    /**
     * Returns the number of polylines in this collection.  This is commonly used with
     * {@link PolylineCollection#get} to iterate over all the polylines
     * in the collection.
     *
     * @memberof PolylineCollection
     *
     * @return {Number} The number of polylines in this collection.
     *
     * @performance If polylines were removed from the collection and
     * {@link PolylineCollection#update} was not called, an implicit <code>O(n)</code>
     * operation is performed.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see PolylineCollection#get
     *
     * @example
     * // Toggle the show property of every polyline in the collection
     * var len = polylines.getLength();
     * for (var i = 0; i < len; ++i) {
     *   var p = polylines.get(i);
     *   p.setShow(!p.getShow());
     * }
     */
    PolylineCollection.prototype.getLength = function() {
        this._removePolylines();
        return this._polylines.length;
    };

    /**
     * Renders the polylines.  In order for changes to properties to be realized,
     * {@link PolylineCollection#update} must be called before <code>render</code>.
     * <br /><br />
     * <br /><br />
     * Polylines are rendered in a single pass using an uber-shader.
     *
     * @memberof PolylineCollection
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see PolylineCollection#update
     */
    PolylineCollection.prototype.render = function(context) {
        var polylineBuckets = this._polylineBuckets;
        if (polylineBuckets) {
            var length = this._colorVertexArrays.length;
            for ( var i = 0; i < length; ++i) {
                var vaColor = this._colorVertexArrays[i];
                var vaOutlineColor = this._outlineColorVertexArrays[i];
                var buckets = this._colorVertexArrays[i].buckets;
                var bucketLength = buckets.length;
                for ( var j = 0; j < bucketLength; ++j) {
                    var bucketLocator = buckets[j];
                    context.draw({
                        primitiveType : PrimitiveType.LINES,
                        count : bucketLocator.count,
                        offset : bucketLocator.offset,
                        shaderProgram : this._sp,
                        uniformMap : this._drawUniformsOne,
                        vertexArray : vaOutlineColor.va,
                        renderState : bucketLocator.bucket.rsOne
                    });
                    context.draw({
                        primitiveType : PrimitiveType.LINES,
                        count : bucketLocator.count,
                        offset : bucketLocator.offset,
                        shaderProgram : this._sp,
                        uniformMap : this._drawUniformsTwo,
                        vertexArray : vaColor.va,
                        renderState : bucketLocator.bucket.rsTwo
                    });
                    context.draw({
                        primitiveType : PrimitiveType.LINES,
                        count : bucketLocator.count,
                        offset : bucketLocator.offset,
                        shaderProgram : this._sp,
                        uniformMap : this._drawUniformsThree,
                        vertexArray : vaOutlineColor.va,
                        renderState : bucketLocator.bucket.rsThree
                    });
                }
            }
        }
    };

    /**
     * DOC_TBA
     * @memberof PolylineCollection
     */
    PolylineCollection.prototype.renderForPick = function(context, framebuffer) {
        var polylineBuckets = this._polylineBuckets;
        if (polylineBuckets) {
            var length = this._pickColorVertexArrays.length;
            for ( var i = 0; i < length; ++i) {
                var vaPickColor = this._pickColorVertexArrays[i];
                var buckets = vaPickColor.buckets;
                var bucketLength = buckets.length;
                for ( var j = 0; j < bucketLength; ++j) {
                    var bucketLocator = buckets[j];
                    context.draw({
                        primitiveType : PrimitiveType.LINES,
                        count : bucketLocator.count,
                        offset : bucketLocator.offset,
                        shaderProgram : this._sp,
                        uniformMap : this._pickUniforms,
                        vertexArray : vaPickColor.va,
                        renderState : bucketLocator.bucket.rsPick,
                        framebuffer : framebuffer
                    });
                }
            }
        }
    };

    /**
     * Commits changes to properties before rendering by updating the object's WebGL resources.
     * This must be called before calling {@link PolylineCollection#render} in order to realize
     * changes to PolylineCollection positions and properties.
     *
     *
     * @memberof PolylineCollection
     *
     */
    PolylineCollection.prototype.update = function(context, sceneState) {
        if (!this._sp) {
            this._sp = context.getShaderCache().getShaderProgram(PolylineVS, PolylineFS, attributeIndices);
        }
        this._removePolylines();
        this._updateMode(sceneState);
        var properties = this._propertiesChanged;
        if (this._createVertexArray || this._computeNewBuffersUsage() || properties[WIDTH_INDEX] || properties[OUTLINE_WIDTH_INDEX]) {
            this._createVertexArray = false;
            this._createVertexArrays(context);
        } else if (this._polylinesUpdated) {
            // Polylines were modified, but no polylines were added or removed.
            var createVertex = false;
            var polylinesToUpdate = this._polylinesToUpdate;
            if(properties[POSITION_INDEX] && this._mode != SceneMode.SCENE3D){
                var length = polylinesToUpdate.length;
                for ( var i = 0; i < length; ++i) {
                    var polyline = polylinesToUpdate[i];
                    var positionLength = polyline._bucket.getLengthOfPositions(this._mode, this._projection);
                    if(positionLength !== polyline._bucket.lengthOfPositions){
                        createVertex = true;
                        break;
                    }
                }
            }
          //if a polyline's size changes, we need to recompute the indicesBuffer
            if (properties[POSITION_SIZE_INDEX] || createVertex) {
                this._createVertexArrays(context);
            } else {
                var length = polylinesToUpdate.length;
                for ( var i = 0; i < length; ++i) {
                    var polyline = polylinesToUpdate[i];
                    properties = polyline._getChangedProperties();
                    var bucket = polyline._bucket;
                    var positionIndex = 0;
                    for ( var x in this._polylineBuckets) {
                        if (this._polylineBuckets[x] === bucket)
                            break;
                        positionIndex += this._polylineBuckets[x].getLengthOfPositions(this._mode, this._projection);
                    }
                    var index = 0;
                    var positions = polyline._getActualPositions();
                    var positionsLength = positions.length;
                    if (properties[POSITION_INDEX]) {
                        var positionsArray = new Float32Array(positionsLength * 3);
                        for ( var j = 0; j < positionsLength; ++j) {
                            var position = positions[j];
                            positionsArray[index] = position.x;
                            positionsArray[index + 1] = position.y;
                            positionsArray[index + 2] = position.z;
                            index += 3;
                        }
                        var vb = this._positionBuffer;
                        vb.copyFromArrayView(positionsArray, 12 * positionIndex);
                    }
                    index = 0;
                    if (properties[COLOR_INDEX]) {
                        var color = polyline.getColor();
                        var red = Color.floatToByte(color.red);
                        var green = Color.floatToByte(color.green);
                        var blue = Color.floatToByte(color.blue);
                        var alpha = Color.floatToByte(color.alpha);
                        var colorsArray = new Uint8Array(positionsLength * 4);
                        for ( var j = 0; j < positionsLength; ++j) {
                            colorsArray[index] = red;
                            colorsArray[index + 1] = green;
                            colorsArray[index + 2] = blue;
                            colorsArray[index + 3] = alpha;
                            index += 4;
                        }
                        var vb = this._colorBuffer;
                        vb.copyFromArrayView(colorsArray, 4 * positionIndex);
                    }
                    index = 0;
                    if (properties[OUTLINE_COLOR_INDEX]) {
                        var color = polyline.getOutlineColor();
                        var red = Color.floatToByte(color.red);
                        var green = Color.floatToByte(color.green);
                        var blue = Color.floatToByte(color.blue);
                        var alpha = Color.floatToByte(color.alpha);
                        var colorsArray = new Uint8Array(positionsLength * 4);
                        for ( var j = 0; j < positionsLength; ++j) {
                            colorsArray[index] = red;
                            colorsArray[index + 1] = green;
                            colorsArray[index + 2] = blue;
                            colorsArray[index + 3] = alpha;
                            index += 4;
                        }
                        var vb = this._outlineColorBuffer;
                        vb.copyFromArrayView(colorsArray, 4 * positionIndex);
                    }
                    if (properties[SHOW_INDEX]) {
                        var show = polyline.getShow();
                        var showArray = new Uint8Array(positionsLength);
                        for ( var j = 0; j < positionsLength; ++j) {
                            showArray[j] = show;
                        }
                        var vb = this._showBuffer;
                        vb.copyFromArrayView(showArray, positionIndex);
                    }
                    polyline._clean();
                }
            }
            polylinesToUpdate.length = 0;
            this._polylinesUpdated = false;
        }
        for ( var k = 0; k < NUMBER_OF_PROPERTIES; ++k) {
            properties[k] = 0;
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof PolylineCollection
     */
    PolylineCollection.prototype.updateForPick = function(context) {
        var useDepthTest = (this._morphTime !== 0.0);
        var polylineBuckets = this._polylineBuckets;
        for ( var x in polylineBuckets) {
            var obj = polylineBuckets[x];
            var rs = obj.rsPick || context.createRenderState();
            rs.depthTest.enabled = useDepthTest;
            rs.lineWidth = obj.width;
            rs.depthMask = !useDepthTest;
            obj.rsPick = rs;
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof PolylineCollection
     *
     * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see PolylineCollection#destroy
     */
    PolylineCollection.prototype.isDestroyed = function() {
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
     * @memberof PolylineCollection
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see PolylineCollection#isDestroyed
     *
     * @example
     * polylines = polylines && polylines.destroy();
     */
    PolylineCollection.prototype.destroy = function() {
        this._sp = this._sp && this._sp.release();
        this._destroyVertexArrays();
        this._destroyPolylines();
        return destroyObject(this);
    };

    PolylineCollection.prototype._addToMap = function(p) {
        var outlineWidth = p.getOutlineWidth();
        var width = p.getWidth();
        var hash = 'OL' + outlineWidth + 'W' + width;
        var value = this._polylineBuckets[hash];
        if (typeof value === 'undefined') {
            value = this._polylineBuckets[hash] = new PolylineBucket(outlineWidth, width);
        }
        value.addPolyline(p);
    };

    PolylineCollection.prototype._computeNewBuffersUsage = function() {
        var buffersUsage = this._buffersUsage;
        var usageChanged = false;

        // PERFORMANCE_IDEA: Better heuristic to avoid ping-ponging.  What about DYNAMIC_STREAM?
        var properties = this._propertiesChanged;
        //subtract 1 from NUMBER_OF_PROPERTIES because we don't care about POSITION_SIZE_INDEX property change.
        for ( var k = 0; k < NUMBER_OF_PROPERTIES - 1; ++k) {
            var newUsage = (properties[k] === 0) ? buffersUsage[k] : BufferUsage.STREAM_DRAW;
            usageChanged = usageChanged || (buffersUsage[k] !== newUsage);
            buffersUsage[k] = newUsage;
        }

        return usageChanged;
    };

    PolylineCollection.prototype._createVertexArrays = function(context) {
        this._destroyVertexArrays();
        this._sortPolylinesIntoBuckets();
        //stores all of the individual indices arrays.
        var totalIndices = [];
        var indices = [];

        //used to determine the vertexBuffer offset if the indicesArray goes over 64k.
        //if it's the same polyline while it goes over 64k, the offset needs to backtrack componentsPerAttribute * componentDatatype bytes
        //so that the polyline looks contiguous.
        //if the polyline ends at the 64k mark, then the offset is just 64k * componentsPerAttribute * componentDatatype
        var vertexBufferOffset = [0];
        totalIndices.push(indices);
        var offset = 0;
        var sixtyFourK = 64 * 1024;
        var useDepthTest = (this._morphTime !== 0.0);
        var vertexArrayBuckets = [[]];
        var vaCount = 0;
        var indicesCount = 0;
        var totalLength = 0;
        for ( var x in this._polylineBuckets) {
            var bucket = this._polylineBuckets[x];
            bucket.updateRenderState(context, useDepthTest);
            var lengthOfPositions = bucket.getLengthOfPositions(this._mode, this._projection);
            bucket.lengthOfPositions = lengthOfPositions;
            totalLength += lengthOfPositions;
        }
        if (totalLength > 0) {
            var positionArray = new Float32Array(totalLength * 3);
            var outlineColorArray = new Uint8Array(totalLength * 4);
            var colorArray = new Uint8Array(totalLength * 4);
            var pickColorArray = new Uint8Array(totalLength * 4);
            var showArray = new Uint8Array(totalLength);
            var positionIndex = 0;
            var colorIndex = 0;
            var showIndex = 0;
            for ( var x in this._polylineBuckets) {
                var bucket = this._polylineBuckets[x];
                var polylines = bucket.getPolylines(this._mode, this._projection, this._modelMatrix);
                var count = 0;
                var bucketLocator = new VertexArrayBucketLocator(count, offset, bucket);
                vertexArrayBuckets[vaCount].push(bucketLocator);
                var length = polylines.length;
                for ( var i = 0; i < length; ++i) {
                    var polyline = polylines[i];
                    var color = polyline.getColor();
                    var show = polyline.getShow();
                    var positions = polyline._getActualPositions();
                    var outlineColor = polyline.getOutlineColor();
                    var pickColor = polyline.getPickId(context).unnormalizedRgb;
                    var positionsLength = positions.length;
                    for ( var j = 0; j < positionsLength; ++j) {
                        var position = positions[j];
                        positionArray[positionIndex] = position.x;
                        positionArray[positionIndex + 1] = position.y;
                        positionArray[positionIndex + 2] = position.z;
                        outlineColorArray[colorIndex] = Color.floatToByte(outlineColor.red);
                        outlineColorArray[colorIndex + 1] = Color.floatToByte(outlineColor.green);
                        outlineColorArray[colorIndex + 2] = Color.floatToByte(outlineColor.blue);
                        outlineColorArray[colorIndex + 3] = Color.floatToByte(outlineColor.alpha);
                        colorArray[colorIndex] = Color.floatToByte(color.red);
                        colorArray[colorIndex + 1] = Color.floatToByte(color.green);
                        colorArray[colorIndex + 2] = Color.floatToByte(color.blue);
                        colorArray[colorIndex + 3] = Color.floatToByte(color.alpha);
                        pickColorArray[colorIndex] = pickColor.red;
                        pickColorArray[colorIndex + 1] = pickColor.green;
                        pickColorArray[colorIndex + 2] = pickColor.blue;
                        pickColorArray[colorIndex + 3] = 255;
                        showArray[showIndex++] = show;
                        positionIndex += 3;
                        colorIndex += 4;
                        if (j !== positionsLength - 1) {
                            if (indicesCount === sixtyFourK - 1) {
                                vertexBufferOffset.push(1);
                                indicesCount = 0;
                                indices = [];
                                totalIndices.push(indices);
                                vaCount++;
                                bucketLocator.count = count;
                                count = 0;
                                offset = 0;
                                bucketLocator = new VertexArrayBucketLocator(0, 0, bucket);
                                vertexArrayBuckets[vaCount] = [bucketLocator];
                            }
                            count += 2;
                            indices.push(indicesCount++);
                            indices.push(indicesCount);
                        }
                    }
                    indicesCount++;
                    polyline._clean();
                    offset += count;
                }
                if (indicesCount >= sixtyFourK - 1) {
                    offset = 0;
                    vertexBufferOffset.push(0);
                    indicesCount = 0;
                    indices = [];
                    vaCount++;
                    vertexArrayBuckets[vaCount] = [];
                    totalIndices.push(indices);
                }
                bucketLocator.count = count;
            }
            this._positionBuffer = context.createVertexBuffer(positionArray, this._buffersUsage[POSITION_INDEX]);
            this._outlineColorBuffer = context.createVertexBuffer(outlineColorArray, this._buffersUsage[OUTLINE_COLOR_INDEX]);
            this._colorBuffer = context.createVertexBuffer(colorArray, this._buffersUsage[COLOR_INDEX]);
            this._pickColorBuffer = context.createVertexBuffer(pickColorArray, BufferUsage.STATIC_DRAW);
            this._showBuffer = context.createVertexBuffer(showArray, this._buffersUsage[SHOW_INDEX]);
            var colorSizeInBytes = 4 * Uint8Array.BYTES_PER_ELEMENT;
            var positionSizeInBytes = 3 * Float32Array.BYTES_PER_ELEMENT;
            var vbo = 0;
            var numberOfIndicesArrays = totalIndices.length;
            for ( var k = 0; k < numberOfIndicesArrays; ++k) {
                var indices = totalIndices[k];
                if (indices.length > 0) {
                    var indicesArray = new Uint16Array(indices);
                    var indexBuffer = context.createIndexBuffer(indicesArray, BufferUsage.STATIC_DRAW, IndexDatatype.UNSIGNED_SHORT);
                    indexBuffer.setVertexArrayDestroyable(false);
                    vbo += vertexBufferOffset[k];
                    var vertexPositionBufferOffset = k * (positionSizeInBytes * sixtyFourK) - vbo * positionSizeInBytes;//componentsPerAttribute(3) * componentDatatype(4)
                    var vertexColorBufferOffset = k * (colorSizeInBytes * sixtyFourK) - vbo * colorSizeInBytes;
                    var vertexShowBufferOffset = k * sixtyFourK - vbo;
                    var attributes = [{
                        index : attributeIndices.position3D,
                        componentsPerAttribute : 3,
                        componentDatatype : ComponentDatatype.FLOAT,
                        offsetInBytes : vertexPositionBufferOffset
                    }, {
                        index : attributeIndices.position2D,
                        componentsPerAttribute : 3,
                        componentDatatype : ComponentDatatype.FLOAT,
                        offsetInBytes : vertexPositionBufferOffset
                    }, {
                        index : attributeIndices.color,
                        componentsPerAttribute : 4,
                        normalize : true,
                        componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                        vertexBuffer : this._colorBuffer,
                        offsetInBytes : vertexColorBufferOffset
                    }, {
                        index : attributeIndices.show,
                        componentsPerAttribute : 1,
                        componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                        vertexBuffer : this._showBuffer,
                        offsetInBytes : vertexShowBufferOffset
                    }];

                    var attributesOutlineColor = [{
                        index : attributeIndices.position3D,
                        componentsPerAttribute : 3,
                        componentDatatype : ComponentDatatype.FLOAT,
                        offsetInBytes : vertexPositionBufferOffset
                    }, {
                        index : attributeIndices.position2D,
                        componentsPerAttribute : 3,
                        componentDatatype : ComponentDatatype.FLOAT,
                        offsetInBytes : vertexPositionBufferOffset
                    }, {
                        index : attributeIndices.color,
                        componentsPerAttribute : 4,
                        normalize : true,
                        componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                        vertexBuffer : this._outlineColorBuffer,
                        offsetInBytes : vertexColorBufferOffset
                    }, {
                        index : attributeIndices.show,
                        componentsPerAttribute : 1,
                        componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                        vertexBuffer : this._showBuffer,
                        offsetInBytes : vertexShowBufferOffset
                    }];

                    var attributesPickColor = [{
                        index : attributeIndices.position3D,
                        componentsPerAttribute : 3,
                        componentDatatype : ComponentDatatype.FLOAT,
                        offsetInBytes : vertexPositionBufferOffset
                    }, {
                        index : attributeIndices.position2D,
                        componentsPerAttribute : 3,
                        componentDatatype : ComponentDatatype.FLOAT,
                        offsetInBytes : vertexPositionBufferOffset
                    }, {
                        index : attributeIndices.color,
                        componentsPerAttribute : 4,
                        normalize : true,
                        componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                        vertexBuffer : this._pickColorBuffer,
                        offsetInBytes : vertexColorBufferOffset
                    }, {
                        index : attributeIndices.show,
                        componentsPerAttribute : 1,
                        componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                        vertexBuffer : this._showBuffer,
                        offsetInBytes : vertexShowBufferOffset
                    }];

                    if (this._mode === SceneMode.SCENE3D) {
                        attributes[0].vertexBuffer = this._positionBuffer;
                        attributes[1].value = [0.0, 0.0];
                        attributesOutlineColor[0].vertexBuffer = this._positionBuffer;
                        attributesOutlineColor[1].value = [0.0, 0.0];
                        attributesPickColor[0].vertexBuffer = this._positionBuffer;
                        attributesPickColor[1].value = [0.0, 0.0];
                    } else {
                        attributes[0].value = [0.0, 0.0, 0.0];
                        attributes[1].vertexBuffer = this._positionBuffer;
                        attributesOutlineColor[0].value = [0.0, 0.0, 0.0];
                        attributesOutlineColor[1].vertexBuffer = this._positionBuffer;
                        attributesPickColor[0].value = [0.0, 0.0, 0.0];
                        attributesPickColor[1].vertexBuffer = this._positionBuffer;
                    }
                    var va = context.createVertexArray(attributes, indexBuffer);
                    var vaOutlineColor = context.createVertexArray(attributesOutlineColor, indexBuffer);
                    var vaPickColor = context.createVertexArray(attributesPickColor, indexBuffer);

                    this._colorVertexArrays.push({
                        va : va,
                        buckets : vertexArrayBuckets[k]
                    });
                    this._outlineColorVertexArrays.push({
                        va : vaOutlineColor,
                        buckets : vertexArrayBuckets[k]
                    });
                    this._pickColorVertexArrays.push({
                        va : vaPickColor,
                        buckets : vertexArrayBuckets[k]
                    });
                }
            }
        }
    };

    PolylineCollection.prototype._sortPolylinesIntoBuckets = function(){
        this._polylineBuckets = {};
        var polylines = this._polylines;
        var length = polylines.length;
        for(var i = 0; i < length; ++i){
            this._addToMap(polylines[i]);
        }
    };

    PolylineCollection.prototype._updateMode = function(sceneState) {
        var mode = sceneState.mode;
        var projection = sceneState.scene2D.projection;

        if (this._mode !== mode || (this._projection !== projection) || (!this._modelMatrix.equals(this.modelMatrix))) {
            this._syncMorphTime(mode);
            this._mode = mode;
            this._projection = projection;
            this._modelMatrix = this.modelMatrix.clone();
            switch (mode) {
            case SceneMode.SCENE3D:
                this._drawUniformsOne = this._drawUniformsOne3D;
                this._drawUniformsTwo = this._drawUniformsTwo3D;
                this._drawUniformsThree = this._drawUniformsThree3D;
                this._pickUniforms = this._pickUniforms3D;
                break;
            case SceneMode.SCENE2D:
            case SceneMode.COLUMBUS_VIEW:
                this._drawUniformsOne = this._drawUniformsOne2D;
                this._drawUniformsTwo = this._drawUniformsTwo2D;
                this._drawUniformsThree = this._drawUniformsThree2D;
                this._pickUniforms = this._pickUniforms2D;
                break;
            }
            this._createVertexArray = true;
        }
    };

    PolylineCollection.prototype._getModelMatrix = function(mode) {
        switch (mode) {
        case SceneMode.SCENE3D:
            return this.modelMatrix;

        case SceneMode.SCENE2D:
        case SceneMode.COLUMBUS_VIEW:
            return this.modelMatrix;

        case SceneMode.MORPHING:
            return Matrix4.IDENTITY;
        }
    };

    PolylineCollection.prototype._syncMorphTime = function(mode) {
        switch (mode) {
        case SceneMode.SCENE3D:
            this._morphTime = 1.0;
            break;

        case SceneMode.SCENE2D:
        case SceneMode.COLUMBUS_VIEW:
            this._morphTime = 0.0;
            break;
        case SceneMode.MORPHING:
            if (typeof mode.morphTime !== 'undefined') {
                this._morphTime = mode.morphTime;
            }
            break;
        }
    };

    PolylineCollection.prototype._removePolylines = function() {
        if (this._polylinesRemoved) {
            this._polylinesRemoved = false;

            var polylines = [];

            var length = this._polylines.length;
            for ( var i = 0, j = 0; i < length; ++i) {
                var polyline = this._polylines[i];
                if (polyline) {
                    polyline._index = j++;
                    polylines.push(polyline);
                }
            }

            this._polylines = polylines;
        }
    };

    PolylineCollection.prototype._destroyVertexArrays = function() {
        var length = this._colorVertexArrays.length;
        for ( var t = 0; t < length; ++t) {
            this._colorVertexArrays[t].va.destroy();
            this._pickColorVertexArrays[t].va.destroy();
            this._outlineColorVertexArrays[t].va.destroy();
        }
        this._colorVertexArrays.length = 0;
        this._pickColorVertexArrays.length = 0;
        this._outlineColorVertexArrays.length = 0;
    };

    PolylineCollection.prototype._updatePolyline = function(propertyChanged, polyline) {
        this._polylinesUpdated = true;
        this._polylinesToUpdate.push(polyline);
        ++this._propertiesChanged[propertyChanged];
    };

    PolylineCollection.prototype._destroyPolylines = function() {
        var polylines = this._polylines;
        var length = polylines.length;
        for ( var i = 0; i < length; ++i) {
            if (polylines[i]) {
                polylines[i]._destroy();
            }
        }
    };

    /**
     * @private
     */
    function VertexArrayBucketLocator(count, offset, bucket) {
        this.count = count;
        this.offset = offset;
        this.bucket = bucket;
    }

    /**
     * @private
     */
    var PolylineBucket = function(outlineWidth, width) {
        this.width = width;
        this.outlineWidth = outlineWidth;
        this.polylines = [];
        this.lengthOfPositions = 0;
        this.rsOne = undefined;
        this.rsTwo = undefined;
        this.rsThree = undefined;
        this.rsPick = undefined;
    };

    /**
     * @private
     */
    PolylineBucket.prototype.addPolyline = function(p) {
        var polylines = this.polylines;
        polylines.push(p);
        p._bucket = this;
    };

    /**
     * @private
     */
    PolylineBucket.prototype.updateRenderState = function(context, useDepthTest) {
        var rsOne = this.rsOne || context.createRenderState({
            colorMask : {
                red : false,
                green : false,
                blue : false,
                alpha : false
            },
            lineWidth : 1,
            blending : BlendingState.ALPHA_BLEND,
            stencilTest : {
                enabled : true,
                frontFunction : StencilFunction.ALWAYS,
                backFunction : StencilFunction.ALWAYS,
                reference : 0,
                mask : ~0,
                frontOperation : {
                    fail : StencilOperation.REPLACE,
                    zFail : StencilOperation.REPLACE,
                    zPass : StencilOperation.REPLACE
                },
                backOperation : {
                    fail : StencilOperation.REPLACE,
                    zFail : StencilOperation.REPLACE,
                    zPass : StencilOperation.REPLACE
                }
            }
        });
        rsOne.depthMask = !useDepthTest;
        rsOne.depthTest.enabled = useDepthTest;
        rsOne.lineWidth = this.outlineWidth;
        this.rsOne = rsOne;
        var rsTwo = this.rsTwo || context.createRenderState({
            lineWidth : 1,
            depthMask : false,
            blending : BlendingState.ALPHA_BLEND,
            stencilTest : {
                enabled : true,
                frontFunction : StencilFunction.ALWAYS,
                backFunction : StencilFunction.ALWAYS,
                reference : 1,
                mask : ~0,
                frontOperation : {
                    fail : StencilOperation.KEEP,
                    zFail : StencilOperation.KEEP,
                    zPass : StencilOperation.REPLACE
                },
                backOperation : {
                    fail : StencilOperation.KEEP,
                    zFail : StencilOperation.KEEP,
                    zPass : StencilOperation.REPLACE
                }
            }
        });
        rsTwo.depthTest.enabled = useDepthTest;
        rsTwo.lineWidth = this.width;
        this.rsTwo = rsTwo;
        var rsThree = this.rsThree || context.createRenderState({
            lineWidth : 1,
            depthMask : false,
            blending : BlendingState.ALPHA_BLEND,
            stencilTest : {
                enabled : true,
                frontFunction : StencilFunction.NOT_EQUAL,
                backFunction : StencilFunction.NOT_EQUAL,
                reference : 1,
                mask : ~0,
                frontOperation : {
                    fail : StencilOperation.KEEP,
                    zFail : StencilOperation.KEEP,
                    zPass : StencilOperation.KEEP
                },
                backOperation : {
                    fail : StencilOperation.KEEP,
                    zFail : StencilOperation.KEEP,
                    zPass : StencilOperation.KEEP
                }
            }
        });
        rsThree.lineWidth = this.outlineWidth;
        rsThree.depthTest.enabled = useDepthTest;
        this.rsThree = rsThree;
    };

    PolylineBucket.prototype.getLengthOfPositions = function(mode, projection){
        var totalLength = 0;
        var polylines = this.polylines;
        if(mode === SceneMode.SCENE3D){
            var length = this.polylines.length;
            for(var i = 0; i < length; ++i){
               totalLength += polylines[i].getPositions().length;
            }
        }
        else{
            var length = polylines.length;
            for(var j = 0; j < length; ++j){
                var polyline = polylines[j];
                var positions = polyline.getPositions();
                var segments = PolylinePipeline.wrapLongitude(projection.getEllipsoid(), positions);
                if(segments.length === 1){
                    totalLength += positions.length;
                }else{
                    var numberOfSegments = segments.length;
                    for ( var i = 0; i < numberOfSegments; ++i) {
                        var startN = ((i === 0) || (segmentLength === 2)) ? 0 : 1;
                        totalLength += segmentLength - startN;
                    }
                }
            }
        }
        this.totalLength = totalLength;
        return totalLength;
    };

    /**
     * @private
     */
    PolylineBucket.prototype.getPolylines = function(mode, projection, modelMatrix) {
        var polylines = this.polylines;
        var length = polylines.length;
        if (mode === SceneMode.SCENE3D) {
            for(var i = 0; i < length; ++i){
                polylines[i]._resetActualPositions();
            }
        }
        else{
            var ellipsoid = projection.getEllipsoid();
            for ( var j = 0; j < length; ++j) {
                var polyline = polylines[j];
                var segments = PolylinePipeline.wrapLongitude(projection.getEllipsoid(), polyline.getPositions());
                var numberOfSegments = segments.length;
                var positions = [];
                for ( var i = 0; i < numberOfSegments; ++i) {
                    var segment = segments[i];
                    var segmentLength = segment.length;
                    var startN = ((i === 0) || (segmentLength === 2)) ? 0 : 1;
                    for ( var n = startN; n < segmentLength; ++n) {
                        var position = segment[n].cartesian;
                        var p = modelMatrix.multiplyWithVector(new Cartesian4(position.x, position.y, position.z, 1.0));
                        positions.push(projection.project(ellipsoid.toCartographic3(p.getXYZ())));
                    }
                }
                polyline._setActualPositions(positions);
            }
        }
        return polylines;
    };

    return PolylineCollection;
});