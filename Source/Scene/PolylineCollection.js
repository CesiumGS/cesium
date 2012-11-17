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
    var SIXTYFOURK = 64 * 1024;

    var attributeIndices = {
        position3DHigh : 0,
        position3DLow : 1,
        position2DHigh : 2,
        position2DLow : 3,
        color : 4,
        pickColor : 5,
        show : 6
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
           width:2
           });

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
        this._sp = undefined;

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
                              {bufferUsage: BufferUsage.STATIC_DRAW, frameCount:0},// SHOW_INDEX
                              {bufferUsage: BufferUsage.STATIC_DRAW, frameCount:0}, // POSITION_INDEX
                              {bufferUsage: BufferUsage.STATIC_DRAW, frameCount:0}, // COLOR_INDEX
                              {bufferUsage: BufferUsage.STATIC_DRAW, frameCount:0}, // OUTLINE_COLOR_INDEX
                              {bufferUsage: BufferUsage.STATIC_DRAW, frameCount:0}, // WIDTH_INDEX
                              {bufferUsage: BufferUsage.STATIC_DRAW, frameCount:0} // OUTLINE_WIDTH_INDEX
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
        if (typeof this._sp === 'undefined') {
            this._sp = context.getShaderCache().getShaderProgram(PolylineVS, PolylineFS, attributeIndices);
        }
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
            var createVertexArrays = false;
            if (this._mode !== SceneMode.SCENE3D) {
                var updateLength = polylinesToUpdate.length;
                for ( var i = 0; i < updateLength; ++i) {
                    polyline = polylinesToUpdate[i];
                    var changedProperties = polyline._propertiesChanged;
                    if (changedProperties[POSITION_INDEX]) {
                        if(intersectsIDL(polyline)){
                            var newSegments = polyline._createSegments(this._projection._ellipsoid);
                            if(polyline._segmentsLengthChanged(newSegments)){
                                createVertexArrays = true;
                                break;
                            }
                            polyline._setSegments(newSegments);
                        }
                    }
                }
            }
            //if a polyline's positions size changes, we need to recreate the vertex arrays and vertex buffers because the indices will be different.
            if (properties[POSITION_SIZE_INDEX] || properties[WIDTH_INDEX] || properties[OUTLINE_WIDTH_INDEX] || createVertexArrays) {
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
                                    bucket.writePositionsUpdate(index, polyline, this._positionBuffer);
                                }
                                if (properties[COLOR_INDEX]) {
                                    bucket.writeColorUpdate(index, polyline, this._colorBuffer);
                                }
                                if (properties[OUTLINE_COLOR_INDEX]) {
                                    bucket.writeColorUpdate(index, polyline, this._outlineColorBuffer);
                                }
                                if (properties[SHOW_INDEX]) {
                                    bucket.writeShowUpdate(index, polyline, this._showBuffer);
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
        var sp = this._sp;
        this._commandLists.removeAll();
        if (typeof polylineBuckets !== 'undefined') {
            if (pass.color) {
                length = this._colorVertexArrays.length;
                commands = this._commandLists.colorList;
                for (var m = 0; m < length; ++m) {
                    var vaColor = this._colorVertexArrays[m];
                    var vaOutlineColor = this._outlineColorVertexArrays[m];
                    buckets = this._colorVertexArrays[m].buckets;
                    bucketLength = buckets.length;
                    var p = commands.length;
                    commands.length += bucketLength * 3;
                    for ( var n = 0; n < bucketLength; ++n, p += 3) {
                        bucketLocator = buckets[n];

                        command = commands[p];
                        if (typeof command === 'undefined') {
                            command = commands[p] = new DrawCommand();
                        }

                        command.boundingVolume = boundingVolume;
                        command.modelMatrix = modelMatrix;
                        command.primitiveType = PrimitiveType.LINES;
                        command.count = bucketLocator.count;
                        command.offset = bucketLocator.offset;
                        command.shaderProgram = sp;
                        command.uniformMap = this._uniforms;
                        command.vertexArray = vaOutlineColor.va;
                        command.renderState = bucketLocator.rsOne;

                        command = commands[p + 1];
                        if (typeof command === 'undefined') {
                            command = commands[p + 1] = new DrawCommand();
                        }

                        command.boundingVolume = boundingVolume;
                        command.modelMatrix = modelMatrix;
                        command.primitiveType = PrimitiveType.LINES;
                        command.count = bucketLocator.count;
                        command.offset = bucketLocator.offset;
                        command.shaderProgram = sp;
                        command.uniformMap = this._uniforms;
                        command.vertexArray = vaColor.va;
                        command.renderState = bucketLocator.rsTwo;

                        command = commands[p + 2];
                        if (typeof command === 'undefined') {
                            command = commands[p + 2] = new DrawCommand();
                        }

                        command.boundingVolume = boundingVolume;
                        command.modelMatrix = modelMatrix;
                        command.primitiveType = PrimitiveType.LINES;
                        command.count = bucketLocator.count;
                        command.offset = bucketLocator.offset;
                        command.shaderProgram = sp;
                        command.uniformMap = this._uniforms;
                        command.vertexArray = vaOutlineColor.va;
                        command.renderState = bucketLocator.rsThree;
                    }
                }
            }
            if (pass.pick) {
                length = this._pickColorVertexArrays.length;
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
                        command.primitiveType = PrimitiveType.LINES;
                        command.count = bucketLocator.count;
                        command.offset = bucketLocator.offset;
                        command.shaderProgram = sp;
                        command.uniformMap = this._uniforms;
                        command.vertexArray = vaPickColor.va;
                        command.renderState = bucketLocator.rsPick;
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
            if(properties[k]){
                if(bufferUsage.bufferUsage !== BufferUsage.STREAM_DRAW){
                    usageChanged = true;
                    bufferUsage.bufferUsage = BufferUsage.STREAM_DRAW;
                    bufferUsage.frameCount = 100;
                }
                else{
                    bufferUsage.frameCount = 100;
                }
            } else {
                if(bufferUsage.bufferUsage !== BufferUsage.STATIC_DRAW){
                    if(bufferUsage.frameCount === 0){
                        usageChanged = true;
                        bufferUsage.bufferUsage = BufferUsage.STATIC_DRAW;
                    }
                    else{
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
        var useDepthTest = (this.morphTime !== 0.0);
        var vertexArrayBuckets = [[]];
        var totalLength = 0;
        var polylineBuckets = this._polylineBuckets;
        var x;
        var bucket;
        for (x in polylineBuckets) {
            if (polylineBuckets.hasOwnProperty(x)) {
                bucket = polylineBuckets[x];
                bucket.updateRenderState(context, useDepthTest);
                totalLength += bucket.lengthOfPositions;
            }
        }
        if (totalLength > 0) {
            var positionArray = new Float32Array(2 * totalLength * 3);
            var outlineColorArray = new Uint8Array(totalLength * 4);
            var colorArray = new Uint8Array(totalLength * 4);
            var pickColorArray = new Uint8Array(totalLength * 4);
            var showArray = new Uint8Array(totalLength);
            var position3DArray;

            var positionIndex = 0;
            var colorIndex = 0;
            var showIndex = 0;
            for (x in polylineBuckets) {
                if (polylineBuckets.hasOwnProperty(x)) {
                    bucket = polylineBuckets[x];
                    bucket.write(positionArray, colorArray, outlineColorArray, pickColorArray, showArray, positionIndex, showIndex, colorIndex, context);
                    if (this._mode === SceneMode.MORPHING) {
                        if (typeof position3DArray === 'undefined') {
                            position3DArray = new Float32Array(2 * totalLength * 3);
                        }
                        bucket.writeForMorph(position3DArray, positionIndex);
                    }
                    var bucketLength = bucket.lengthOfPositions;
                    positionIndex += 2 * bucketLength * 3;
                    showIndex += bucketLength;
                    colorIndex += bucketLength * 4;
                    offset = bucket.updateIndices(totalIndices, vertexBufferOffset, vertexArrayBuckets, offset);
                }
            }
            this._positionBuffer = context.createVertexBuffer(positionArray, this._buffersUsage[POSITION_INDEX].bufferUsage);
            var position3DBuffer;
            if (typeof position3DArray !== 'undefined') {
                position3DBuffer = context.createVertexBuffer(position3DArray, this._buffersUsage[POSITION_INDEX].bufferUsage);
            }
            this._outlineColorBuffer = context.createVertexBuffer(outlineColorArray, this._buffersUsage[OUTLINE_COLOR_INDEX].bufferUsage);
            this._colorBuffer = context.createVertexBuffer(colorArray, this._buffersUsage[COLOR_INDEX].bufferUsage);
            this._pickColorBuffer = context.createVertexBuffer(pickColorArray, BufferUsage.STATIC_DRAW);
            this._showBuffer = context.createVertexBuffer(showArray, this._buffersUsage[SHOW_INDEX].bufferUsage);
            var colorSizeInBytes = 4 * Uint8Array.BYTES_PER_ELEMENT;
            var positionSizeInBytes = 3 * Float32Array.BYTES_PER_ELEMENT;
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
                    var vertexColorBufferOffset = k * (colorSizeInBytes * SIXTYFOURK) - vbo * colorSizeInBytes;
                    var vertexShowBufferOffset = k * SIXTYFOURK - vbo;
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
                        attributes[1].vertexBuffer = this._positionBuffer;
                        attributes[2].value = [0.0, 0.0, 0.0];
                        attributes[3].value = [0.0, 0.0, 0.0];
                        attributesOutlineColor[0].vertexBuffer = this._positionBuffer;
                        attributesOutlineColor[1].vertexBuffer = this._positionBuffer;
                        attributesOutlineColor[2].value = [0.0, 0.0, 0.0];
                        attributesOutlineColor[3].value = [0.0, 0.0, 0.0];
                        attributesPickColor[0].vertexBuffer = this._positionBuffer;
                        attributesPickColor[1].vertexBuffer = this._positionBuffer;
                        attributesPickColor[2].value = [0.0, 0.0, 0.0];
                        attributesPickColor[3].value = [0.0, 0.0, 0.0];
                    } else if (this._mode === SceneMode.SCENE2D || this._mode === SceneMode.COLUMBUS_VIEW) {
                        attributes[0].value = [0.0, 0.0, 0.0];
                        attributes[1].value = [0.0, 0.0, 0.0];
                        attributes[2].vertexBuffer = this._positionBuffer;
                        attributes[3].vertexBuffer = this._positionBuffer;
                        attributesOutlineColor[0].value = [0.0, 0.0, 0.0];
                        attributesOutlineColor[1].value = [0.0, 0.0, 0.0];
                        attributesOutlineColor[2].vertexBuffer = this._positionBuffer;
                        attributesOutlineColor[3].vertexBuffer = this._positionBuffer;
                        attributesPickColor[0].value = [0.0, 0.0, 0.0];
                        attributesPickColor[1].value = [0.0, 0.0, 0.0];
                        attributesPickColor[2].vertexBuffer = this._positionBuffer;
                        attributesPickColor[3].vertexBuffer = this._positionBuffer;
                    } else {
                        attributes[0].vertexBuffer = position3DBuffer;
                        attributes[1].vertexBuffer = position3DBuffer;
                        attributes[2].vertexBuffer = this._positionBuffer;
                        attributes[3].vertexBuffer = this._positionBuffer;
                        attributesOutlineColor[0].vertexBuffer = position3DBuffer;
                        attributesOutlineColor[1].vertexBuffer = position3DBuffer;
                        attributesOutlineColor[2].vertexBuffer = this._positionBuffer;
                        attributesOutlineColor[3].vertexBuffer = this._positionBuffer;
                        attributesPickColor[0].vertexBuffer = position3DBuffer;
                        attributesPickColor[1].vertexBuffer = position3DBuffer;
                        attributesPickColor[2].vertexBuffer = this._positionBuffer;
                        attributesPickColor[3].vertexBuffer = this._positionBuffer;
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

    PolylineCollection.prototype._sortPolylinesIntoBuckets = function() {
        var polylineBuckets = this._polylineBuckets = {};
        var polylines = this._polylines;
        var length = polylines.length;
        for ( var i = 0; i < length; ++i) {
            var p = polylines[i];
            var outlineWidth = p.getOutlineWidth();
            var width = p.getWidth();
            var hash = 'OL' + outlineWidth + 'W' + width;
            var value = polylineBuckets[hash];
            if (typeof value === 'undefined') {
                value = polylineBuckets[hash] = new PolylineBucket(outlineWidth, width, this._mode, this._projection, this._modelMatrix);
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
            this._outlineColorVertexArrays[t].va.destroy();
        }
        this._colorVertexArrays.length = 0;
        this._pickColorVertexArrays.length = 0;
        this._outlineColorVertexArrays.length = 0;
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
        this.rsOne = bucket.rsOne;
        this.rsTwo = bucket.rsTwo;
        this.rsThree = bucket.rsThree;
        this.rsPick = bucket.rsPick;
    }

    /**
     * @private
     */
    var PolylineBucket = function(outlineWidth, width, mode, projection, modelMatrix) {
        this.width = width;
        this.outlineWidth = outlineWidth;
        this.polylines = [];
        this.lengthOfPositions = 0;
        this.rsOne = undefined;
        this.rsTwo = undefined;
        this.rsThree = undefined;
        this.rsPick = undefined;
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
    PolylineBucket.prototype.updateRenderState = function(context, useDepthTest) {
        var width = this._clampWidth(context, this.width);
        var outlineWidth = this._clampWidth(context, this.outlineWidth);
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
        rsOne.lineWidth = outlineWidth;
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
        rsTwo.lineWidth = width;
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

        var rsPick = this.rsPick || context.createRenderState();
        rsPick.depthTest.enabled = useDepthTest;
        rsPick.lineWidth = outlineWidth;
        rsPick.depthMask = !useDepthTest;
        this.rsPick = rsPick;
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
        var segments = polyline._createSegments(this.ellipsoid);
        return polyline._setSegments(segments);
    };

    var scratchWritePosition = new Cartesian3();

    /**
     * @private
     */
    PolylineBucket.prototype.write = function(positionArray, colorArray, outlineColorArray, pickColorArray, showArray, positionIndex, showIndex, colorIndex, context) {
        var polylines = this.polylines;
        var length = polylines.length;
        for ( var i = 0; i < length; ++i) {
            var polyline = polylines[i];
            var color = polyline.getColor();
            var show = polyline.getShow();
            var outlineColor = polyline.getOutlineColor();
            var pickColor = polyline.getPickId(context).unnormalizedRgb;
            var positions = this._getPositions(polyline);
            var positionsLength = positions.length;
            for ( var j = 0; j < positionsLength; ++j) {
                var position = positions[j];
                scratchWritePosition.x = position.x;
                scratchWritePosition.y = position.y;
                scratchWritePosition.z = (this.mode !== SceneMode.SCENE2D) ? position.z : 0.0;
                EncodedCartesian3.writeElements(scratchWritePosition, positionArray, positionIndex);
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
                positionIndex += 6;
                colorIndex += 4;
            }
        }
    };

    /**
     * @private
     */
    PolylineBucket.prototype.writeForMorph = function(positionArray, positionIndex) {
        var modelMatrix = this.modelMatrix;
        var position;
        var polylines = this.polylines;
        var length = polylines.length;
        for ( var i = 0; i < length; ++i) {
            var polyline = polylines[i];
            var positions = polyline.getPositions();

            var numberOfSegments;
            var j;
            if (intersectsIDL(polyline)) {
                var segments = polyline._getSegments();
                numberOfSegments = segments.length;
                for ( j = 0; j < numberOfSegments; ++j) {
                    var segment = segments[j];
                    var segmentLength = segment.length;
                    for ( var n = 0; n < segmentLength; ++n) {
                        position = positions[segment[n].index];
                        position = modelMatrix.multiplyByPoint(position);
                        EncodedCartesian3.writeElements(position, positionArray, positionIndex);
                        positionIndex += 6;
                    }
                }
            } else {
                numberOfSegments = positions.length;
                for ( j = 0; j < numberOfSegments; ++j) {
                    position = positions[j];
                    position = modelMatrix.multiplyByPoint(position);
                    EncodedCartesian3.writeElements(position, positionArray, positionIndex);
                    positionIndex += 6;
                }
            }
        }
    };

    /**
     * @private
     */
    PolylineBucket.prototype._clampWidth = function(context, value) {
        var min = context.getMinimumAliasedLineWidth();
        var max = context.getMaximumAliasedLineWidth();

        return Math.min(Math.max(value, min), max);
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
            if(positions.length > 0){
                for ( var j = 0; j < positionsLength; ++j) {
                    if (j !== positionsLength - 1) {
                        if (indicesCount === SIXTYFOURK - 1) {
                            vertexBufferOffset.push(1);
                            indices = [];
                            totalIndices.push(indices);
                            indicesCount = 0;
                            bucketLocator.count = count;
                            count = 0;
                            offset = 0;
                            bucketLocator = new VertexArrayBucketLocator(0, 0, this);
                            vertexArrayBuckets[++vaCount] = [bucketLocator];
                        }
                        count += 2;
                        offset += 2;
                        indices.push(indicesCount++);
                        indices.push(indicesCount);
                    }
                }
                if (indicesCount < SIXTYFOURK - 1) {
                    indicesCount++;
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
            if(intersectsIDL(polyline)){
                var segments = polyline._segments;
                var numberOfSegments = segments.length;
                if(numberOfSegments > 0){
                    for ( var k = 0; k < numberOfSegments; ++k) {
                        var segment = segments[k];
                        var segmentLength = segment.length;
                        for ( var n = 0; n < segmentLength; ++n) {
                            if (n !== segmentLength - 1) {
                                if (indicesCount === SIXTYFOURK - 1) {
                                    vertexBufferOffset.push(1);
                                    indices = [];
                                    totalIndices.push(indices);
                                    indicesCount = 0;
                                    bucketLocator.count = count;
                                    count = 0;
                                    offset = 0;
                                    bucketLocator = new VertexArrayBucketLocator(0, 0, this);
                                    vertexArrayBuckets[++vaCount] = [bucketLocator];
                                }
                                count += 2;
                                offset += 2;
                                indices.push(indicesCount++);
                                indices.push(indicesCount);
                            }
                        }
                        if (k !== numberOfSegments - 1) {
                            indicesCount++;
                        }
                    }

                    if (indicesCount < SIXTYFOURK - 1) {
                        indicesCount++;
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
            } else {
                var positions = polyline.getPositions();
                var positionsLength = positions.length;
                for ( var j = 0; j < positionsLength; ++j) {
                    if (j !== positionsLength - 1) {
                        if (indicesCount === SIXTYFOURK - 1) {
                            vertexBufferOffset.push(1);
                            indices = [];
                            totalIndices.push(indices);
                            indicesCount = 0;
                            bucketLocator.count = count;
                            count = 0;
                            offset = 0;
                            bucketLocator = new VertexArrayBucketLocator(0, 0, this);
                            vertexArrayBuckets[++vaCount] = [bucketLocator];
                        }
                        count += 2;
                        offset += 2;
                        indices.push(indicesCount++);
                        indices.push(indicesCount);
                    }
                }

                if (indicesCount < SIXTYFOURK - 1) {
                    indicesCount++;
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
        if(intersectsIDL(polyline)){
            positions = polyline._getPositions2D();
        }

        var ellipsoid = this.ellipsoid;
        var projection = this.projection;
        var newPositions = [];
        var modelMatrix = this.modelMatrix;
        var length = positions.length;
        var position;
        var p;

        for (var n = 0; n < length; ++n) {
            position = positions[n];
            p = modelMatrix.multiplyByPoint(position);
            newPositions.push(projection.project(ellipsoid.cartesianToCartographic(Cartesian3.fromCartesian4(p))));
        }

        if (newPositions.length > 0) {
            polyline._boundingVolume2D = BoundingSphere.fromPoints(newPositions, polyline._boundingVolume2D);
            var center2D = polyline._boundingVolume2D.center;
            polyline._boundingVolume2D.center = new Cartesian3(center2D.z,  center2D.x, center2D.y);
            if (typeof polyline._polylineCollection._boundingVolume2D === 'undefined') {
                polyline._polylineCollection._boundingVolume2D = BoundingSphere.clone(polyline._boundingVolume2D);
            } else {
                polyline._polylineCollection._boundingVolume2D = polyline._polylineCollection._boundingVolume2D.union(polyline._boundingVolume2D, polyline._polylineCollection._boundingVolume2D);
            }
        }

        return newPositions;
    };

    /**
     * @private
     */
    PolylineBucket.prototype.writePositionsUpdate = function(positionIndex, polyline, buffer) {
        var positionsLength = polyline._actualLength;
        if (positionsLength) {
            positionIndex += this._getPolylineStartIndex(polyline);
            var positionArray = new Float32Array(2 * positionsLength * 3);
            var index = 0;
            var positions = this._getPositions(polyline);
            for ( var i = 0; i < positionsLength; ++i) {
                var position = positions[i];
                scratchWritePosition.x = position.x;
                scratchWritePosition.y = position.y;
                scratchWritePosition.z = (this.mode !== SceneMode.SCENE2D) ? position.z : 0.0;
                EncodedCartesian3.writeElements(scratchWritePosition, positionArray, index);
                index += 6;
            }

            buffer.copyFromArrayView(positionArray, 2 * 12 * positionIndex);
        }
    };

    /**
     * @private
     */
    PolylineBucket.prototype.writeColorUpdate = function(positionIndex, polyline, buffer) {
        var positionsLength = polyline._actualLength;
        if (positionsLength) {
            positionIndex += this._getPolylineStartIndex(polyline);

            var index = 0;
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
            buffer.copyFromArrayView(colorsArray, 4 * positionIndex);
        }
    };

    /**
     * @private
     */
    PolylineBucket.prototype.writeShowUpdate = function(positionIndex, polyline, buffer) {
        var positionsLength = polyline._actualLength;
        if (positionsLength) {
            positionIndex += this._getPolylineStartIndex(polyline);
            var show = polyline.getShow();
            var showArray = new Uint8Array(positionsLength);
            for ( var j = 0; j < positionsLength; ++j) {
                showArray[j] = show;
            }
            buffer.copyFromArrayView(showArray, positionIndex);
        }
    };

    return PolylineCollection;
});