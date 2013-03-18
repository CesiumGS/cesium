/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/combine',
        '../Core/destroyObject',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/EncodedCartesian3',
        '../Core/Matrix4',
        '../Core/ComponentDatatype',
        '../Core/IndexDatatype',
        '../Core/PrimitiveType',
        '../Core/Color',
        '../Core/BoundingSphere',
        '../Core/Intersect',
        '../Renderer/BlendingState',
        '../Renderer/BufferUsage',
        '../Renderer/CommandLists',
        '../Renderer/DrawCommand',
        './Material',
        './SceneMode',
        './Polyline',
        '../Shaders/Noise',
        '../Shaders/PolylineVS',
        '../Shaders/PolylineFS',
        '../Shaders/PolylineFSPick'
    ], function(
        DeveloperError,
        combine,
        destroyObject,
        Cartesian3,
        Cartesian4,
        EncodedCartesian3,
        Matrix4,
        ComponentDatatype,
        IndexDatatype,
        PrimitiveType,
        Color,
        BoundingSphere,
        Intersect,
        BlendingState,
        BufferUsage,
        CommandLists,
        DrawCommand,
        Material,
        SceneMode,
        Polyline,
        Noise,
        PolylineVS,
        PolylineFS,
        PolylineFSPick) {
    "use strict";

    var MISC_INDEX = Polyline.MISC_INDEX;
    var POSITION_INDEX = Polyline.POSITION_INDEX;
    var COLOR_INDEX = Polyline.COLOR_INDEX;
    var MATERIAL_INDEX = Polyline.MATERIAL_INDEX;
    //POSITION_SIZE_INDEX is needed for when the polyline's position array changes size.
    //When it does, we need to recreate the indicesBuffer.
    var POSITION_SIZE_INDEX = Polyline.POSITION_SIZE_INDEX;
    var NUMBER_OF_PROPERTIES = Polyline.NUMBER_OF_PROPERTIES;
    var SIXTYFOURK = 64 * 1024;

    var attributeIndices = {
        position3DHigh : 0,
        position3DLow : 1,
        position2DHigh : 2,
        position2DLow : 3,
        prev : 4,
        next : 5,
        color : 6,
        misc : 7
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
     * var polylines = new PolylineCollection(undefined);
     * polylines.add({positions:ellipsoid.cartographicDegreesToCartesians([
     *     new Cartographic2(-75.10, 39.57),
     *     new Cartographic2(-77.02, 38.53),
     *     new Cartographic2(-80.50, 35.14),
     *     new Cartographic2(-80.12, 25.46)]),
     *     width:2
     *     });
     *
     * polylines.add({positions:ellipsoid.cartographicDegreesToCartesians([
     *     new Cartographic2(-73.10, 37.57),
     *     new Cartographic2(-75.02, 36.53),
     *     new Cartographic2(-78.50, 33.14),
     *     new Cartographic2(-78.12, 23.46)]),
     *     width:4
     * });
     */
    var PolylineCollection = function() {
        /**
         * The current morph transition time between 2D/Columbus View and 3D,
         * with 0.0 being 2D or Columbus View and 1.0 being 3D.
         *
         * @type Number
         */
        this.morphTime = 1.0;

        /**
         * The 4x4 transformation matrix that transforms each polyline in this collection from model to world coordinates.
         * When this is the identity matrix, the polylines are drawn in world coordinates, i.e., Earth's WGS84 coordinates.
         * Local reference frames can be used by providing a different transformation matrix, like that returned
         * by {@link Transforms.eastNorthUpToFixedFrame}.  This matrix is available to GLSL vertex and fragment
         * shaders via {@link czm_model} and derived uniforms.
         *
         * @type Matrix4
         *
         * @see Transforms.eastNorthUpToFixedFrame
         * @see czm_model
         */
        this.modelMatrix = Matrix4.IDENTITY.clone();
        this._modelMatrix = Matrix4.IDENTITY.clone();
        this._rs = undefined;
        this._spPick = undefined;
        this._rsPick = undefined;

        this._boundingVolume = undefined;
        this._boundingVolume2D = undefined;

        this._commandLists = new CommandLists();

        this._polylinesUpdated = false;
        this._polylinesRemoved = false;
        this._createVertexArray = false;
        this._propertiesChanged = new Uint32Array(NUMBER_OF_PROPERTIES);
        this._polylines = [];
        this._polylineBuckets = {};

        // The buffer usage for each attribute is determined based on the usage of the attribute over time.
        this._buffersUsage = [
                              {bufferUsage: BufferUsage.STATIC_DRAW, frameCount:0}, // MISC_INDEX
                              {bufferUsage: BufferUsage.STATIC_DRAW, frameCount:0}, // POSITION_INDEX
                              {bufferUsage: BufferUsage.STATIC_DRAW, frameCount:0}, // COLOR_INDEX
                              {bufferUsage: BufferUsage.STATIC_DRAW, frameCount:0}  // MATERIAL_INDEX
        ];

        this._mode = undefined;
        var that = this;

        this._uniforms = {
            u_morphTime : function() {
                return that.morphTime;
            }
        };

        this._polylinesToUpdate = [];
        this._colorVertexArrays = [];
        this._pickColorVertexArrays = [];
        this._positionBuffer = undefined;
        this._adjacencyBuffer = undefined;
        this._colorBuffer = undefined;
        this._pickColorBuffer = undefined;
        this._miscBuffer = undefined;
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
     *     new Cartographic2(-75.10, 39.57),
     *     new Cartographic2(-77.02, 38.53)]),
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
     * @param {Polyline} polyline The polyline to check for.
     *
     * @return {Boolean} true if this collection contains the billboard, false otherwise.
     *
     * @see PolylineCollection#get
     */
    PolylineCollection.prototype.contains = function(polyline) {
        return typeof polyline !== 'undefined' && polyline._polylineCollection === this;
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
     * Commits changes to properties before rendering by updating the object's WebGL resources.
     *
     * @memberof PolylineCollection
     */
    PolylineCollection.prototype.update = function(context, frameState, commandList) {
        this._removePolylines();
        this._updateMode(frameState);

        var bucket;
        var polyline;
        var length;
        var buckets;
        var polylineBuckets;
        var bucketLength;
        var bucketLocator;

        var properties = this._propertiesChanged;
        if (this._createVertexArray || this._computeNewBuffersUsage()) {
            this._createVertexArrays(context);
        } else if (this._polylinesUpdated) {
            // Polylines were modified, but no polylines were added or removed.
            var polylinesToUpdate = this._polylinesToUpdate;
            if (this._mode !== SceneMode.SCENE3D) {
                var updateLength = polylinesToUpdate.length;
                for ( var i = 0; i < updateLength; ++i) {
                    polyline = polylinesToUpdate[i];
                    polyline.update();
                }
            }

            // if a polyline's positions size changes, we need to recreate the vertex arrays and vertex buffers because the indices will be different.
            // if a polyline's material changes, we need to recreate the VAOs and VBOs because they will be batched differenty.
            if (properties[POSITION_SIZE_INDEX] || properties[MATERIAL_INDEX]) {
                this._createVertexArrays(context);
            } else {
                length = polylinesToUpdate.length;
                polylineBuckets = this._polylineBuckets;
                for ( var ii = 0; ii < length; ++ii) {
                    polyline = polylinesToUpdate[ii];
                    properties = polyline._propertiesChanged;
                    bucket = polyline._bucket;
                    var index = 0;
                    for ( var x in polylineBuckets) {
                        if (polylineBuckets.hasOwnProperty(x)) {
                            if (polylineBuckets[x] === bucket) {
                                if (properties[POSITION_INDEX]) {
                                    bucket.writePositionsUpdate(index, polyline, this._positionBuffer, this._adjacencyBuffer);
                                }
                                if (properties[COLOR_INDEX]) {
                                    bucket.writeColorUpdate(index, polyline, this._colorBuffer);
                                }
                                if (properties[MISC_INDEX]) {
                                    bucket.writeMiscUpdate(index, polyline, this._miscBuffer);
                                }
                                break;
                            }
                            index += polylineBuckets[x].lengthOfPositions;
                        }
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

        var boundingVolume;
        var modelMatrix = Matrix4.IDENTITY;

        if (frameState.mode === SceneMode.SCENE3D) {
            boundingVolume = this._boundingVolume;
            modelMatrix = this.modelMatrix;
        } else if (frameState.mode === SceneMode.COLUMBUS_VIEW || frameState.mode === SceneMode.SCENE2D) {
            boundingVolume = this._boundingVolume2D;
        } else {
            boundingVolume = this._boundingVolume && this._boundingVolume2D && this._boundingVolume.union(this._boundingVolume2D);
        }

        var pass = frameState.passes;
        var commands;
        var command;
        polylineBuckets = this._polylineBuckets;
        var useDepthTest = (this.morphTime !== 0.0);
        this._commandLists.removeAll();
        if (typeof polylineBuckets !== 'undefined') {
            if (pass.color) {
                if (typeof this._rs === 'undefined') {
                    this._rs = context.createRenderState({
                        blending : BlendingState.ALPHA_BLEND
                    });
                }

                this._rs.depthMask = !useDepthTest;
                this._rs.depthTest.enabled = useDepthTest;

                length = this._colorVertexArrays.length;
                commands = this._commandLists.colorList;
                for ( var m = 0; m < length; ++m) {
                    var vaColor = this._colorVertexArrays[m];
                    buckets = vaColor.buckets;
                    bucketLength = buckets.length;
                    var p = commands.length;
                    commands.length += bucketLength;
                    for ( var n = 0; n < bucketLength; ++n, ++p) {
                        bucketLocator = buckets[n];

                        command = commands[p];
                        if (typeof command === 'undefined') {
                            command = commands[p] = new DrawCommand();
                        }

                        command.boundingVolume = boundingVolume;
                        command.modelMatrix = modelMatrix;
                        command.primitiveType = PrimitiveType.TRIANGLES;
                        command.count = bucketLocator.count;
                        command.offset = bucketLocator.offset;
                        command.shaderProgram = bucketLocator.shaderProgram;
                        command.uniformMap = combine([this._uniforms, bucketLocator.material._uniforms], false, false);
                        command.vertexArray = vaColor.va;
                        command.renderState = this._rs;
                    }
                }
            }

            if (pass.pick) {
                if (typeof this._spPick === 'undefined') {
                    this._spPick = context.getShaderCache().getShaderProgram(
                            '#define RENDER_FOR_PICK\n\n' + PolylineVS, PolylineFSPick, attributeIndices);
                }
                if (typeof this._rsPick === 'undefined') {
                    this._rsPick = context.createRenderState();
                }

                this._rsPick.depthMask = !useDepthTest;
                this._rsPick.depthTest.enabled = useDepthTest;

                length = this._colorVertexArrays.length;
                commands = this._commandLists.pickList;
                for ( var a = 0; a < length; ++a) {
                    var vaPickColor = this._pickColorVertexArrays[a];
                    buckets = vaPickColor.buckets;
                    bucketLength = buckets.length;
                    commands.length += bucketLength;
                    for ( var b = 0; b < bucketLength; ++b) {
                        bucketLocator = buckets[b];

                        command = commands[b];
                        if (typeof command === 'undefined') {
                            command = commands[b] = new DrawCommand();
                        }

                        command.boundingVolume = boundingVolume;
                        command.modelMatrix = modelMatrix;
                        command.primitiveType = PrimitiveType.TRIANGLES;
                        command.count = bucketLocator.count;
                        command.offset = bucketLocator.offset;
                        command.shaderProgram = this._spPick;
                        command.uniformMap = this._uniforms;
                        command.vertexArray = vaPickColor.va;
                        command.renderState = this._rsPick;
                    }
                }
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
        this._spPick = this._spPick && this._spPick.release();
        this._destroyVertexArrays();
        this._destroyPolylines();
        return destroyObject(this);
    };

    PolylineCollection.prototype._computeNewBuffersUsage = function() {
        var buffersUsage = this._buffersUsage;
        var usageChanged = false;

        var properties = this._propertiesChanged;
        //subtract 1 from NUMBER_OF_PROPERTIES because we don't care about POSITION_SIZE_INDEX property change.
        for ( var k = 0; k < NUMBER_OF_PROPERTIES - 1; ++k) {
            var bufferUsage = buffersUsage[k];
            if (properties[k]) {
                if (bufferUsage.bufferUsage !== BufferUsage.STREAM_DRAW) {
                    usageChanged = true;
                    bufferUsage.bufferUsage = BufferUsage.STREAM_DRAW;
                    bufferUsage.frameCount = 100;
                } else {
                    bufferUsage.frameCount = 100;
                }
            } else {
                if (bufferUsage.bufferUsage !== BufferUsage.STATIC_DRAW) {
                    if (bufferUsage.frameCount === 0) {
                        usageChanged = true;
                        bufferUsage.bufferUsage = BufferUsage.STATIC_DRAW;
                    } else {
                        bufferUsage.frameCount--;
                    }
                }
            }
        }
        return usageChanged;
    };

    PolylineCollection.prototype._createVertexArrays = function(context) {
        this._createVertexArray = false;
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
        var vertexArrayBuckets = [[]];
        var totalLength = 0;
        var polylineBuckets = this._polylineBuckets;
        var x;
        var bucket;
        for (x in polylineBuckets) {
            if (polylineBuckets.hasOwnProperty(x)) {
                bucket = polylineBuckets[x];
                bucket.updateShader(context);
                totalLength += bucket.lengthOfPositions;
            }
        }
        if (totalLength > 0) {
            var positionArray = new Float32Array(2 * totalLength * 3 * 2);
            var adjacencyArray = new Float32Array(2 * totalLength * 4 * 2);
            var colorArray = new Float32Array(totalLength * 4 * 2);
            var pickColorArray = new Uint8Array(totalLength * 4 * 2);
            var miscArray = new Float32Array(totalLength * 4 * 2);
            var position3DArray;

            var positionIndex = 0;
            var adjacencyIndex = 0;
            var colorIndex = 0;
            var miscIndex = 0;
            for (x in polylineBuckets) {
                if (polylineBuckets.hasOwnProperty(x)) {
                    bucket = polylineBuckets[x];
                    bucket.write(positionArray, adjacencyArray, colorArray, pickColorArray, miscArray, positionIndex, adjacencyIndex, colorIndex, miscIndex, context);
                    if (this._mode === SceneMode.MORPHING) {
                        if (typeof position3DArray === 'undefined') {
                            position3DArray = new Float32Array(2 * totalLength * 3 * 2);
                        }
                        bucket.writeForMorph(position3DArray, adjacencyArray, positionIndex, adjacencyIndex);
                    }
                    var bucketLength = bucket.lengthOfPositions;
                    positionIndex += 2 * bucketLength * 3 * 2;
                    adjacencyIndex += 2 * bucketLength * 4 * 2;
                    colorIndex += bucketLength * 4 * 2;
                    miscIndex += bucketLength * 4 * 2;
                    offset = bucket.updateIndices(totalIndices, vertexBufferOffset, vertexArrayBuckets, offset);
                }
            }
            this._positionBuffer = context.createVertexBuffer(positionArray, this._buffersUsage[POSITION_INDEX].bufferUsage);
            var position3DBuffer;
            if (typeof position3DArray !== 'undefined') {
                position3DBuffer = context.createVertexBuffer(position3DArray, this._buffersUsage[POSITION_INDEX].bufferUsage);
            }
            this._adjacencyBuffer = context.createVertexBuffer(adjacencyArray, this._buffersUsage[POSITION_INDEX].bufferUsage);
            this._colorBuffer = context.createVertexBuffer(colorArray, this._buffersUsage[COLOR_INDEX].bufferUsage);
            this._pickColorBuffer = context.createVertexBuffer(pickColorArray, BufferUsage.STATIC_DRAW);
            this._miscBuffer = context.createVertexBuffer(miscArray, this._buffersUsage[MISC_INDEX].bufferUsage);
            var colorSizeInBytes = 4 * Float32Array.BYTES_PER_ELEMENT;
            var pickColorSizeInBytes = 4 * Uint8Array.BYTES_PER_ELEMENT;
            var positionSizeInBytes = 3 * Float32Array.BYTES_PER_ELEMENT;
            var adjacencySizeInBytes = 4 * Float32Array.BYTES_PER_ELEMENT;
            var miscSizeInBytes = 4 * Float32Array.BYTES_PER_ELEMENT;
            var vbo = 0;
            var numberOfIndicesArrays = totalIndices.length;
            for ( var k = 0; k < numberOfIndicesArrays; ++k) {
                indices = totalIndices[k];
                if (indices.length > 0) {
                    var indicesArray = new Uint16Array(indices);
                    var indexBuffer = context.createIndexBuffer(indicesArray, BufferUsage.STATIC_DRAW, IndexDatatype.UNSIGNED_SHORT);
                    indexBuffer.setVertexArrayDestroyable(false);
                    vbo += vertexBufferOffset[k];
                    var positionHighOffset = 2 * (k * (positionSizeInBytes * SIXTYFOURK) - vbo * positionSizeInBytes);//componentsPerAttribute(3) * componentDatatype(4)
                    var positionLowOffset = positionSizeInBytes + positionHighOffset;
                    var prevOffset = 2 * (k * (adjacencySizeInBytes * SIXTYFOURK) - vbo * adjacencySizeInBytes);
                    var nextOffset = adjacencySizeInBytes + prevOffset;
                    var vertexColorBufferOffset = k * (colorSizeInBytes * SIXTYFOURK) - vbo * colorSizeInBytes;
                    var vertexPickColorBufferOffset = k * (pickColorSizeInBytes * SIXTYFOURK) - vbo * pickColorSizeInBytes;
                    var vertexMiscBufferOffset = k * (miscSizeInBytes * SIXTYFOURK) - vbo * miscSizeInBytes;
                    var attributes = [{
                        index : attributeIndices.position3DHigh,
                        componentsPerAttribute : 3,
                        componentDatatype : ComponentDatatype.FLOAT,
                        offsetInBytes : positionHighOffset,
                        strideInBytes : 2 * positionSizeInBytes
                    }, {
                        index : attributeIndices.position3DLow,
                        componentsPerAttribute : 3,
                        componentDatatype : ComponentDatatype.FLOAT,
                        offsetInBytes : positionLowOffset,
                        strideInBytes : 2 * positionSizeInBytes
                    }, {
                        index : attributeIndices.position2DHigh,
                        componentsPerAttribute : 3,
                        componentDatatype : ComponentDatatype.FLOAT,
                        offsetInBytes : positionHighOffset,
                        strideInBytes : 2 * positionSizeInBytes
                    }, {
                        index : attributeIndices.position2DLow,
                        componentsPerAttribute : 3,
                        componentDatatype : ComponentDatatype.FLOAT,
                        offsetInBytes : positionLowOffset,
                        strideInBytes : 2 * positionSizeInBytes
                    }, {
                        index : attributeIndices.prev,
                        componentsPerAttribute : 4,
                        componentDatatype : ComponentDatatype.FLOAT,
                        vertexBuffer : this._adjacencyBuffer,
                        offsetInBytes : prevOffset,
                        strideInBytes : 2 * adjacencySizeInBytes
                    }, {
                        index : attributeIndices.next,
                        componentsPerAttribute : 4,
                        componentDatatype : ComponentDatatype.FLOAT,
                        vertexBuffer : this._adjacencyBuffer,
                        offsetInBytes : nextOffset,
                        strideInBytes : 2 * adjacencySizeInBytes
                    }, {
                        index : attributeIndices.color,
                        componentsPerAttribute : 4,
                        componentDatatype : ComponentDatatype.FLOAT,
                        vertexBuffer : this._colorBuffer,
                        offsetInBytes : vertexColorBufferOffset
                    }, {
                        index : attributeIndices.misc,
                        componentsPerAttribute : 4,
                        componentDatatype : ComponentDatatype.FLOAT,
                        vertexBuffer : this._miscBuffer,
                        offsetInBytes : vertexMiscBufferOffset
                    }];

                    if (this._mode === SceneMode.SCENE3D) {
                        attributes[0].vertexBuffer = this._positionBuffer;
                        attributes[1].vertexBuffer = this._positionBuffer;
                        attributes[2].value = [0.0, 0.0, 0.0];
                        attributes[3].value = [0.0, 0.0, 0.0];
                    } else if (this._mode === SceneMode.SCENE2D || this._mode === SceneMode.COLUMBUS_VIEW) {
                        attributes[0].value = [0.0, 0.0, 0.0];
                        attributes[1].value = [0.0, 0.0, 0.0];
                        attributes[2].vertexBuffer = this._positionBuffer;
                        attributes[3].vertexBuffer = this._positionBuffer;
                    } else {
                        attributes[0].vertexBuffer = position3DBuffer;
                        attributes[1].vertexBuffer = position3DBuffer;
                        attributes[2].vertexBuffer = this._positionBuffer;
                        attributes[3].vertexBuffer = this._positionBuffer;
                    }

                    var va = context.createVertexArray(attributes, indexBuffer);
                    this._colorVertexArrays.push({
                        va : va,
                        buckets : vertexArrayBuckets[k]
                    });

                    attributes[6].componentDatatype = ComponentDatatype.UNSIGNED_BYTE;
                    attributes[6].vertexBuffer = this._pickColorBuffer;
                    attributes[6].offsetInBytes = vertexPickColorBufferOffset;
                    attributes[6].normalize = true;

                    var vaPickColor = context.createVertexArray(attributes, indexBuffer);
                    this._pickColorVertexArrays.push({
                        va : vaPickColor,
                        buckets : vertexArrayBuckets[k]
                    });
                }
            }
        }
    };

    var scratchUniformArray = [];
    PolylineCollection.prototype._createMaterialHash = function(material) {
        var uniforms = Material._uniformList[material.type];
        var length = uniforms.length;
        scratchUniformArray.length = 2.0 * length;

        var index = 0;
        for (var i = 0; i < length; ++i) {
            var uniform = uniforms[i];
            scratchUniformArray[index] = uniform;
            scratchUniformArray[index + 1] = material._uniforms[uniform]();
            index += 2;
        }

        return JSON.stringify(scratchUniformArray);
    };

    PolylineCollection.prototype._sortPolylinesIntoBuckets = function() {
        var polylineBuckets = this._polylineBuckets = {};
        var polylines = this._polylines;
        var length = polylines.length;
        for ( var i = 0; i < length; ++i) {
            var p = polylines[i];
            p.update();
            var material = p.getMaterial();
            var hash = this._createMaterialHash(material);
            var value = polylineBuckets[hash];
            if (typeof value === 'undefined') {
                value = polylineBuckets[hash] = new PolylineBucket(material, this._mode, this._projection, this._modelMatrix);
            }
            value.addPolyline(p);
        }
    };

    PolylineCollection.prototype._updateMode = function(frameState) {
        var mode = frameState.mode;
        var projection = frameState.scene2D.projection;
        if (this._mode !== mode && typeof mode.morphTime !== 'undefined') {
            this.morphTime = mode.morphTime;
        }
        if (this._mode !== mode || (this._projection !== projection) || (!this._modelMatrix.equals(this.modelMatrix))) {
            this._mode = mode;
            this._projection = projection;
            this._modelMatrix = this.modelMatrix.clone();
            this._createVertexArray = true;
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
        }
        this._colorVertexArrays.length = 0;
        this._pickColorVertexArrays.length = 0;
    };

    PolylineCollection.prototype._updatePolyline = function(polyline, propertyChanged) {
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
        this.shaderProgram = bucket.shaderProgram;
        this.material = bucket.material;
    }

    /**
     * @private
     */
    var PolylineBucket = function(material, mode, projection, modelMatrix) {
        this.polylines = [];
        this.lengthOfPositions = 0;
        this.material = material;
        this.shaderProgram = undefined;
        this.mode = mode;
        this.projection = projection;
        this.ellipsoid = projection.getEllipsoid();
        this.modelMatrix = modelMatrix;
    };

    /**
     * @private
     */
    PolylineBucket.prototype.addPolyline = function(p) {
        var polylines = this.polylines;
        polylines.push(p);
        p._actualLength = this.getPolylinePositionsLength(p);
        this.lengthOfPositions += p._actualLength;
        p._bucket = this;
    };

    /**
     * @private
     */
    PolylineBucket.prototype.updateShader = function(context) {
        if (typeof this.shaderProgram !== 'undefined') {
            return;
        }

        var fsSource =
            '#line 0\n' +
            Noise +
            '#line 0\n' +
            this.material.shaderSource +
            '#line 0\n' +
            PolylineFS;

        this.shaderProgram = context.getShaderCache().getShaderProgram(PolylineVS, fsSource, attributeIndices);
    };

    function intersectsIDL(polyline) {
        return Cartesian3.dot(Cartesian3.UNIT_X, polyline._boundingVolume.center) < 0 ||
            polyline._boundingVolume.intersect(Cartesian4.UNIT_Y) === Intersect.INTERSECTING;
    }

    /**
     * @private
     */
    PolylineBucket.prototype.getPolylinePositionsLength = function(polyline) {
        if (this.mode === SceneMode.SCENE3D || !intersectsIDL(polyline)) {
            return polyline.getPositions().length;
        }

        polyline.update();
        return polyline._segments.positions.length;
    };

    var computeAdjacencyAnglesPosition = new Cartesian3();

    function computeAdjacencyAngles(position, index, positions, result, modelMatrix) {
        // TODO handle cross idl
        if (typeof result === 'undefined') {
            result = new Cartesian4();
        }

        var prev = computeAdjacencyAnglesPosition;
        if (index === 0) {
            Cartesian3.ZERO.clone(prev);
        } else {
            prev = (typeof modelMatrix === 'undefined') ? Cartesian3.clone(positions[index - 1], prev) : Matrix4.multiplyByPoint(modelMatrix, positions[index - 1], prev);
            Cartesian3.subtract(prev, position, prev);
        }
        Cartesian3.normalize(prev, prev);
        result.x = Math.acos(prev.z);
        result.y = Math.atan2(prev.y, prev.x);

        var next = computeAdjacencyAnglesPosition;
        if (index === positions.length - 1) {
            Cartesian3.ZERO.clone(next);
        } else {
            next = (typeof modelMatrix === 'undefined') ? Cartesian3.clone(positions[index + 1], next) : Matrix4.multiplyByPoint(modelMatrix, positions[index + 1], next);
            Cartesian3.subtract(next, position, next);
        }
        Cartesian3.normalize(next, next);
        result.z = Math.acos(next.z);
        result.w = Math.atan2(next.y, next.x);

        return result;
    }

    var scratchWritePosition = new Cartesian3();
    var scratchWriteAdjacency = new Cartesian4();
    var scratchWriteColor = new Color();
    var scratchWriteColorArray = new Array(1);
    var scratchWriteOutlineColorArray = new Array(1);

    /**
     * @private
     */
    PolylineBucket.prototype.write = function(positionArray, adjacencyArray, colorArray, pickColorArray, miscArray, positionIndex, adjacencyIndex, colorIndex, miscIndex, context) {
        var polylines = this.polylines;
        var length = polylines.length;
        for ( var i = 0; i < length; ++i) {
            var polyline = polylines[i];
            var width = polyline.getWidth();
            var show = polyline.getShow();
            var positions = this._getPositions(polyline);
            var positionsLength = positions.length;

            var colors = polyline.getColors();
            var colorIncrement = 1;
            if (typeof colors === 'undefined' || colors.length !== positionsLength) {
                colors = scratchWriteColorArray;
                colors[0] = polyline.getDefaultColor();
                colorIncrement = 0;
            }

            var outlineColors = polyline.getOutlineColors();
            var outlineColorIncrement = 1;
            if (typeof outlineColors === 'undefined' || outlineColors.length !== positionsLength) {
                outlineColors = scratchWriteOutlineColorArray;
                outlineColors[0] = polyline.getDefaultOutlineColor();
                outlineColorIncrement = 0;
            }

            var pickColor = polyline.getPickId(context).unnormalizedRgb;

            var vertexColorIndex = 0;
            var vertexOutlineColorIndex = 0;

            for ( var j = 0; j < positionsLength; ++j) {
                var position = positions[j];
                scratchWritePosition.x = position.x;
                scratchWritePosition.y = position.y;
                scratchWritePosition.z = (this.mode !== SceneMode.SCENE2D) ? position.z : 0.0;

                var adjacencyAngles = computeAdjacencyAngles(position, j, positions, scratchWriteAdjacency);

                for (var k = 0; k < 2; ++k) {
                    EncodedCartesian3.writeElements(scratchWritePosition, positionArray, positionIndex);

                    if (this.mode === SceneMode.SCENE3D) {
                        adjacencyArray[adjacencyIndex] = adjacencyAngles.x;
                        adjacencyArray[adjacencyIndex + 1] = adjacencyAngles.y;
                        adjacencyArray[adjacencyIndex + 4] = adjacencyAngles.z;
                        adjacencyArray[adjacencyIndex + 5] = adjacencyAngles.w;
                    } else {
                        adjacencyArray[adjacencyIndex + 2] = adjacencyAngles.x;
                        adjacencyArray[adjacencyIndex + 3] = adjacencyAngles.y;
                        adjacencyArray[adjacencyIndex + 6] = adjacencyAngles.z;
                        adjacencyArray[adjacencyIndex + 7] = adjacencyAngles.w;
                    }

                    var color = colors[vertexColorIndex];
                    var outlineColor = outlineColors[vertexOutlineColorIndex];

                    scratchWriteColor.red = color.alpha;
                    scratchWriteColor.green = outlineColor.alpha;

                    colorArray[colorIndex] = Color.encode(color);
                    colorArray[colorIndex + 1] = Color.encode(outlineColor);
                    colorArray[colorIndex + 2] = Color.encode(scratchWriteColor);

                    pickColorArray[colorIndex] = pickColor.red;
                    pickColorArray[colorIndex + 1] = pickColor.green;
                    pickColorArray[colorIndex + 2] = pickColor.blue;
                    pickColorArray[colorIndex + 3] = 255;

                    miscArray[miscIndex] = j / (positionsLength - 1);     // s tex coord
                    miscArray[miscIndex + 1] = 2 * k - 1;           // expand direction
                    miscArray[miscIndex + 2] = width;
                    miscArray[miscIndex + 3] = show;

                    positionIndex += 6;
                    adjacencyIndex += 8;
                    colorIndex += 4;
                    miscIndex += 4;
                }

                vertexColorIndex += colorIncrement;
                vertexOutlineColorIndex += outlineColorIncrement;
            }
        }
    };

    var morphPositionScratch = new Cartesian3();

    /**
     * @private
     */
    PolylineBucket.prototype.writeForMorph = function(positionArray, adjacencyArray, positionIndex, adjacencyIndex) {
        var modelMatrix = this.modelMatrix;
        var polylines = this.polylines;
        var length = polylines.length;
        for ( var i = 0; i < length; ++i) {
            var polyline = polylines[i];
            var positions = polyline._segments.positions;
            var positionsLength = positions.length;

            for ( var j = 0; j < positionsLength; ++j) {
                var position = Matrix4.multiplyByPoint(modelMatrix, positions[j], morphPositionScratch);
                var adjacencyAngles = computeAdjacencyAngles(position, j, positions, scratchAdjacency, modelMatrix);

                for (var k = 0; k < 2; ++k) {
                    EncodedCartesian3.writeElements(position, positionArray, positionIndex);

                    adjacencyArray[adjacencyIndex] = adjacencyAngles.x;
                    adjacencyArray[adjacencyIndex + 1] = adjacencyAngles.y;
                    adjacencyArray[adjacencyIndex + 4] = adjacencyAngles.z;
                    adjacencyArray[adjacencyIndex + 5] = adjacencyAngles.w;

                    positionIndex += 6;
                    adjacencyIndex += 8;
                }
            }
        }
    };

    /**
     * @private
     */
    PolylineBucket.prototype._updateIndices3D = function(totalIndices, vertexBufferOffset, vertexArrayBuckets, offset) {
        var vaCount = vertexArrayBuckets.length - 1;
        var bucketLocator = new VertexArrayBucketLocator(0, offset, this);
        vertexArrayBuckets[vaCount].push(bucketLocator);
        var count = 0;
        var indices = totalIndices[totalIndices.length - 1];
        var indicesCount = 0;
        if (indices.length > 0) {
            indicesCount = indices[indices.length - 1] + 1;
        }
        var polylines = this.polylines;
        var length = polylines.length;
        for ( var i = 0; i < length; ++i) {
            var polyline = polylines[i];
            var positions = polyline.getPositions();
            var positionsLength = positions.length;
            if (positions.length > 0) {
                for ( var j = 0; j < positionsLength; ++j) {
                    if (j !== positionsLength - 1) {
                        if (indicesCount + 3 >= SIXTYFOURK - 1) {
                            vertexBufferOffset.push(2);
                            indices = [];
                            totalIndices.push(indices);
                            indicesCount = 0;
                            bucketLocator.count = count;
                            count = 0;
                            offset = 0;
                            bucketLocator = new VertexArrayBucketLocator(0, 0, this);
                            vertexArrayBuckets[++vaCount] = [bucketLocator];
                        }

                        indices.push(indicesCount, indicesCount + 2, indicesCount + 1);
                        indices.push(indicesCount + 1, indicesCount + 2, indicesCount + 3);

                        count += 6;
                        offset += 6;
                        indicesCount += 2;
                    }
                }
                if (indicesCount + 3 < SIXTYFOURK - 1) {
                    indicesCount += 2;
                } else {
                    vertexBufferOffset.push(0);
                    indices = [];
                    totalIndices.push(indices);
                    indicesCount = 0;
                    bucketLocator.count = count;
                    offset = 0;
                    count = 0;
                    bucketLocator = new VertexArrayBucketLocator(0, 0, this);
                    vertexArrayBuckets[++vaCount] = [bucketLocator];
                }
            }
            polyline._clean();
        }
        bucketLocator.count = count;
        return offset;
    };

    /**
     * @private
     */
    PolylineBucket.prototype._updateIndices2D = function(totalIndices, vertexBufferOffset, vertexArrayBuckets, offset) {
        var vaCount = vertexArrayBuckets.length - 1;
        var bucketLocator = new VertexArrayBucketLocator(0, offset, this);
        vertexArrayBuckets[vaCount].push(bucketLocator);
        var count = 0;
        var indices = totalIndices[totalIndices.length - 1];
        var indicesCount = 0;
        if (indices.length > 0) {
            indicesCount = indices[indices.length - 1] + 1;
        }
        var polylines = this.polylines;
        var length = polylines.length;
        for ( var i = 0; i < length; ++i) {
            var polyline = polylines[i];
            var segments = polyline._segments.lengths;
            var numberOfSegments = segments.length;
            if (numberOfSegments > 0) {
                for ( var j = 0; j < numberOfSegments; ++j) {
                    var segmentLength = segments[j];
                    for ( var k = 0; k < segmentLength; ++k) {
                        if (k !== segmentLength - 1) {
                            if (indicesCount + 3 >= SIXTYFOURK - 1) {
                                vertexBufferOffset.push(2);
                                indices = [];
                                totalIndices.push(indices);
                                indicesCount = 0;
                                bucketLocator.count = count;
                                count = 0;
                                offset = 0;
                                bucketLocator = new VertexArrayBucketLocator(0, 0, this);
                                vertexArrayBuckets[++vaCount] = [bucketLocator];
                            }

                            indices.push(indicesCount, indicesCount + 2, indicesCount + 1);
                            indices.push(indicesCount + 1, indicesCount + 2, indicesCount + 3);

                            count += 6;
                            offset += 6;
                            indicesCount += 2;
                        }
                    }
                    if (j !== numberOfSegments - 1) {
                        indicesCount += 2;
                    }
                }

                if (indicesCount + 3 < SIXTYFOURK - 1) {
                    indicesCount += 2;
                } else {
                    vertexBufferOffset.push(0);
                    indices = [];
                    totalIndices.push(indices);
                    indicesCount = 0;
                    bucketLocator.count = count;
                    offset = 0;
                    count = 0;
                    bucketLocator = new VertexArrayBucketLocator(0, 0, this);
                    vertexArrayBuckets[++vaCount] = [bucketLocator];
                }
            }
            polyline._clean();
        }
        bucketLocator.count = count;
        return offset;
    };

    /**
     * @private
     */
    PolylineBucket.prototype.updateIndices = function(totalIndices, vertexBufferOffset, vertexArrayBuckets, offset) {
        if (this.mode === SceneMode.SCENE3D) {
            return this._updateIndices3D(totalIndices, vertexBufferOffset, vertexArrayBuckets, offset);
        }
        return this._updateIndices2D(totalIndices, vertexBufferOffset, vertexArrayBuckets, offset);
    };

    /**
     * @private
     */
    PolylineBucket.prototype._getPolylineStartIndex = function(polyline) {
        var polylines = this.polylines;
        var positionIndex = 0;
        var length = polylines.length;
        for ( var i = 0; i < length; ++i) {
            var p = polylines[i];
            if (p === polyline) {
                break;
            }
            positionIndex += p._actualLength;
        }
        return positionIndex;
    };

    /**
     * @private
     */
    PolylineBucket.prototype._getPositions = function(polyline) {
        var positions = polyline.getPositions();

        if (positions.length > 0) {
            if (typeof polyline._polylineCollection._boundingVolume === 'undefined') {
                polyline._polylineCollection._boundingVolume = BoundingSphere.clone(polyline._boundingVolume);
            } else {
                polyline._polylineCollection._boundingVolume = polyline._polylineCollection._boundingVolume.union(polyline._boundingVolume, polyline._polylineCollection._boundingVolume);
            }
        }

        if (this.mode === SceneMode.SCENE3D) {
            return positions;
        }
        if (intersectsIDL(polyline)) {
            positions = polyline._segments.positions;
        }

        var ellipsoid = this.ellipsoid;
        var projection = this.projection;
        var newPositions = [];
        var modelMatrix = this.modelMatrix;
        var length = positions.length;
        var position;
        var p;

        for ( var n = 0; n < length; ++n) {
            position = positions[n];
            p = modelMatrix.multiplyByPoint(position);
            newPositions.push(projection.project(ellipsoid.cartesianToCartographic(Cartesian3.fromCartesian4(p))));
        }

        if (newPositions.length > 0) {
            polyline._boundingVolume2D = BoundingSphere.fromPoints(newPositions, polyline._boundingVolume2D);
            var center2D = polyline._boundingVolume2D.center;
            polyline._boundingVolume2D.center = new Cartesian3(center2D.z, center2D.x, center2D.y);
            if (typeof polyline._polylineCollection._boundingVolume2D === 'undefined') {
                polyline._polylineCollection._boundingVolume2D = BoundingSphere.clone(polyline._boundingVolume2D);
            } else {
                polyline._polylineCollection._boundingVolume2D = polyline._polylineCollection._boundingVolume2D.union(polyline._boundingVolume2D, polyline._polylineCollection._boundingVolume2D);
            }
        }

        return newPositions;
    };


    var scratchAdjacency = new Cartesian4();

    /**
     * @private
     */
    PolylineBucket.prototype.writePositionsUpdate = function(positionIndex, polyline, positionBuffer, adjacencyBuffer) {
        var positionsLength = polyline._actualLength;
        if (positionsLength) {
            positionIndex += this._getPolylineStartIndex(polyline);
            var positionArray = new Float32Array(2 * positionsLength * 3 * 2);
            var adjacencyArray = new Float32Array(2 * positionsLength * 4 * 2);
            var index = 0;
            var adjacencyIndex = 0;
            var positions = this._getPositions(polyline);
            for ( var i = 0; i < positionsLength; ++i) {
                var position = positions[i];
                scratchWritePosition.x = position.x;
                scratchWritePosition.y = position.y;
                scratchWritePosition.z = (this.mode !== SceneMode.SCENE2D) ? position.z : 0.0;

                var adjacencyAngles = computeAdjacencyAngles(position, i, positions, scratchAdjacency);

                for (var j = 0; j < 2; ++j) {
                    EncodedCartesian3.writeElements(scratchWritePosition, positionArray, index);

                    if (this.mode === SceneMode.SCENE3D) {
                        adjacencyArray[adjacencyIndex] = adjacencyAngles.x;
                        adjacencyArray[adjacencyIndex + 1] = adjacencyAngles.y;
                        adjacencyArray[adjacencyIndex + 4] = adjacencyAngles.z;
                        adjacencyArray[adjacencyIndex + 5] = adjacencyAngles.w;
                    } else {
                        adjacencyArray[adjacencyIndex + 2] = adjacencyAngles.x;
                        adjacencyArray[adjacencyIndex + 3] = adjacencyAngles.y;
                        adjacencyArray[adjacencyIndex + 6] = adjacencyAngles.z;
                        adjacencyArray[adjacencyIndex + 7] = adjacencyAngles.w;
                    }

                    index += 6;
                    adjacencyIndex += 8;
                }
            }

            positionBuffer.copyFromArrayView(positionArray, 2 * 3 * Float32Array.BYTES_PER_ELEMENT * positionIndex * 2);
            adjacencyBuffer.copyFromArrayView(adjacencyArray, 2 * 4 * Float32Array.BYTES_PER_ELEMENT * positionIndex * 2);
        }
    };

    var scratchColorAlpha = new Color();
    var scratchColorArray = new Array(1);
    var scratchOutlineColorArray = new Array(1);

    /**
     * @private
     */
    PolylineBucket.prototype.writeColorUpdate = function(positionIndex, polyline, buffer) {
        var positionsLength = polyline._actualLength;
        if (positionsLength) {
            positionIndex += this._getPolylineStartIndex(polyline);

            var colors = polyline.getColors();
            var colorIncrement = 1;
            if (typeof colors === 'undefined' || colors.length !== positionsLength) {
                colors = scratchColorArray;
                colors[0] = polyline.getDefaultColor();
                colorIncrement = 0;
            }

            var outlineColors = polyline.getOutlineColors();
            var outlineColorIncrement = 1;
            if (typeof outlineColors === 'undefined' || outlineColors.length !== positionsLength) {
                outlineColors = scratchOutlineColorArray;
                outlineColors[0] = polyline.getDefaultOutlineColor();
                outlineColorIncrement = 0;
            }

            var index = 0;
            var colorIndex = 0;
            var outlineColorIndex = 0;

            var colorsArray = new Float32Array(4 * positionsLength * 2);
            for ( var j = 0; j < positionsLength; ++j) {
                var color = colors[colorIndex];
                var outlineColor = outlineColors[outlineColorIndex];
                scratchColorAlpha.red = color.alpha;
                scratchColorAlpha.green = outlineColor.alpha;

                var encodedColor = Color.encode(color);
                var encodedOutlineColor = Color.encode(outlineColor);
                var encodedAlpha = Color.encode(scratchColorAlpha);

                for (var k = 0; k < 2; ++k) {
                    colorsArray[index] = encodedColor;
                    colorsArray[index + 1] = encodedOutlineColor;
                    colorsArray[index + 2] = encodedAlpha;
                    index += 4;
                }

                colorIndex += colorIncrement;
                outlineColorIndex += outlineColorIncrement;
            }
            buffer.copyFromArrayView(colorsArray, 4 * Float32Array.BYTES_PER_ELEMENT * positionIndex * 2);
        }
    };

    /**
     * @private
     */
    PolylineBucket.prototype.writeMiscUpdate = function(positionIndex, polyline, buffer) {
        var positionsLength = polyline._actualLength;
        if (positionsLength) {
            positionIndex += this._getPolylineStartIndex(polyline);
            var show = polyline.getShow();
            var width = polyline.getWidth();
            var miscArray = new Float32Array(4 * positionsLength * 2);
            var miscIndex = 0;
            for ( var j = 0; j < positionsLength; ++j) {
                for (var k = 0; k < 2; ++k) {
                    miscArray[miscIndex] = j / positionsLength;     // s tex coord
                    miscArray[miscIndex + 1] = 2 * k - 1;           // expand direction
                    miscArray[miscIndex + 2] = width;
                    miscArray[miscIndex + 3] = show;

                    miscIndex += 4;
                }
            }
            buffer.copyFromArrayView(miscArray, 4 * Float32Array.BYTES_PER_ELEMENT * positionIndex * 2);
        }
    };

    return PolylineCollection;
});