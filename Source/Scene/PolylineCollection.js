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

    var SHOW_INDEX = Polyline.SHOW_INDEX;
    var WIDTH_INDEX = Polyline.WIDTH_INDEX;
    var POSITION_INDEX = Polyline.POSITION_INDEX;
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
        prevPosition3DHigh : 4,
        prevPosition3DLow : 5,
        prevPosition2DHigh : 6,
        prevPosition2DLow : 7,
        nextPosition3DHigh : 8,
        nextPosition3DLow : 9,
        nextPosition2DHigh : 10,
        nextPosition2DLow : 11,
        texCoordExpandWidthAndShow : 12,
        pickColor : 13
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
     *
     * @demo <a href="http://cesium.agi.com/Cesium/Apps/Sandcastle/index.html?src=Polylines.html">Cesium Sandcastle Polyline Demo</a>
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
        this._colorCommands = [];
        this._pickCommands = [];

        this._polylinesUpdated = false;
        this._polylinesRemoved = false;
        this._createVertexArray = false;
        this._propertiesChanged = new Uint32Array(NUMBER_OF_PROPERTIES);
        this._polylines = [];
        this._polylineBuckets = {};

        // The buffer usage for each attribute is determined based on the usage of the attribute over time.
        this._buffersUsage = [
                              {bufferUsage: BufferUsage.STATIC_DRAW, frameCount:0}, // SHOW_INDEX
                              {bufferUsage: BufferUsage.STATIC_DRAW, frameCount:0}, // WIDTH_INDEX
                              {bufferUsage: BufferUsage.STATIC_DRAW, frameCount:0}  // POSITION_INDEX
        ];

        this._mode = undefined;
        var that = this;

        this._uniforms = {
            u_morphTime : function() {
                return that.morphTime;
            }
        };

        this._polylinesToUpdate = [];
        this._vertexArrays = [];
        this._positionBuffer = undefined;
        this._pickColorBuffer = undefined;
        this._texCoordExpandWidthAndShowBuffer = undefined;
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
     *     width : 1
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
            if (typeof polyline._bucket !== 'undefined') {
                var bucket = polyline._bucket;
                bucket.shaderProgram = bucket.shaderProgram && bucket.shaderProgram.release();
            }
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
        releaseShaders(this);
        destroyPolylines(this);
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

        removePolylines(this);
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
        removePolylines(this);
        return this._polylines.length;
    };

    var emptyArray = [];

    /**
     * @private
     */
    PolylineCollection.prototype.update = function(context, frameState, commandList) {
        removePolylines(this);

        if (this._polylines.length === 0) {
            return;
        }

        updateMode(this, frameState);

        var polyline;
        var properties = this._propertiesChanged;

        if (this._createVertexArray || computeNewBuffersUsage(this)) {
            createVertexArrays(this, context);
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
                createVertexArrays(this, context);
            } else {
                var length = polylinesToUpdate.length;
                var polylineBuckets = this._polylineBuckets;
                for ( var ii = 0; ii < length; ++ii) {
                    polyline = polylinesToUpdate[ii];
                    properties = polyline._propertiesChanged;
                    var bucket = polyline._bucket;
                    var index = 0;
                    for ( var x in polylineBuckets) {
                        if (polylineBuckets.hasOwnProperty(x)) {
                            if (polylineBuckets[x] === bucket) {
                                if (properties[POSITION_INDEX] || properties[SHOW_INDEX] || properties[WIDTH_INDEX]) {
                                    bucket.writeUpdate(index, polyline, this._positionBuffer, this._texCoordExpandWidthAndShowBuffer);
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
        var useDepthTest = (this.morphTime !== 0.0);
        var commandLists = this._commandLists;
        commandLists.colorList = emptyArray;
        commandLists.pickList = emptyArray;

        if (pass.color) {
            if (typeof this._rs === 'undefined') {
                this._rs = context.createRenderState({
                    blending : BlendingState.ALPHA_BLEND
                });
            }

            this._rs.depthMask = !useDepthTest;
            this._rs.depthTest.enabled = useDepthTest;

            var colorList = this._colorCommands;
            commandLists.colorList = colorList;

            createCommandLists(colorList, boundingVolume, modelMatrix, this._vertexArrays, this._rs, this._uniforms, true);
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

            var pickList = this._pickCommands;
            commandLists.pickList = pickList;

            createCommandLists(pickList, boundingVolume, modelMatrix, this._vertexArrays, this._rsPick, this._uniforms, false, this._spPick);
        }

        if (!this._commandLists.empty()) {
            commandList.push(this._commandLists);
        }
    };

    function createCommandLists(commands, boundingVolume, modelMatrix, vertexArrays, renderState, uniforms, combineUniforms, shaderProgram) {
        var length = vertexArrays.length;

        var commandsLength = commands.length;
        var commandIndex = 0;

        for ( var m = 0; m < length; ++m) {
            var va = vertexArrays[m];
            var buckets = va.buckets;
            var bucketLength = buckets.length;

            for ( var n = 0; n < bucketLength; ++n) {
                var bucketLocator = buckets[n];

                var offset = bucketLocator.offset;
                var sp = (typeof shaderProgram !== 'undefined') ? shaderProgram : bucketLocator.bucket.shaderProgram;

                var polylines = bucketLocator.bucket.polylines;
                var polylineLength = polylines.length;
                var currentId;
                var currentMaterial;
                var count = 0;
                var command;

                for (var s = 0; s < polylineLength; ++s) {
                    var polyline = polylines[s];
                    var mId = createMaterialId(polyline._material);
                    if (mId !== currentId) {
                        if (typeof currentId !== 'undefined') {
                            if (commandIndex >= commandsLength) {
                                command = new DrawCommand();
                                commands.push(command);
                            } else {
                                command = commands[commandIndex];
                            }

                            ++commandIndex;

                            command.boundingVolume = boundingVolume;
                            command.modelMatrix = modelMatrix;
                            command.primitiveType = PrimitiveType.TRIANGLES;
                            command.shaderProgram = sp;
                            command.vertexArray = va.va;
                            command.renderState = renderState;

                            command.uniformMap = combineUniforms ? combine([uniforms, currentMaterial._uniforms], false, false) : uniforms;
                            command.count = count;
                            command.offset = offset;

                            offset += count;
                            count = 0;
                        }

                        currentMaterial = polyline._material;
                        currentId = mId;
                    }

                    var locators = polyline._locatorBuckets;
                    var locatorLength = locators.length;
                    for (var t = 0; t < locatorLength; ++t) {
                        var locator = locators[t];
                        if (locator.locator === bucketLocator) {
                            count += locator.count;
                        }
                    }
                }

                if (typeof currentId !== 'undefined' && count > 0) {
                    if (commandIndex >= commandsLength) {
                        command = new DrawCommand();
                        commands.push(command);
                    } else {
                        command = commands[commandIndex];
                    }

                    ++commandIndex;

                    command.boundingVolume = boundingVolume;
                    command.modelMatrix = modelMatrix;
                    command.primitiveType = PrimitiveType.TRIANGLES;
                    command.shaderProgram = sp;
                    command.vertexArray = va.va;
                    command.renderState = renderState;

                    command.uniformMap = combineUniforms ? combine([uniforms, currentMaterial._uniforms], false, false) : uniforms;
                    command.count = count;
                    command.offset = offset;
                }

                currentId = undefined;
            }
        }

        commands.length = commandIndex;
    }

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
        this._spPick = this._spPick && this._spPick.release();
        destroyVertexArrays(this);
        releaseShaders(this);
        destroyPolylines(this);
        return destroyObject(this);
    };

    function computeNewBuffersUsage(collection) {
        var buffersUsage = collection._buffersUsage;
        var usageChanged = false;

        var properties = collection._propertiesChanged;
        //subtract 2 from NUMBER_OF_PROPERTIES because we don't care about POSITION_SIZE_INDEX or MATERIAL_INDEX property change.
        for ( var k = 0; k < NUMBER_OF_PROPERTIES - 2; ++k) {
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
    }

    var emptyVertexBuffer = [0.0, 0.0, 0.0];

    function createVertexArrays(collection, context) {
        collection._createVertexArray = false;
        releaseShaders(collection);
        destroyVertexArrays(collection);
        sortPolylinesIntoBuckets(collection);

        //stores all of the individual indices arrays.
        var totalIndices = [[]];
        var indices = totalIndices[0];

        //used to determine the vertexBuffer offset if the indicesArray goes over 64k.
        //if it's the same polyline while it goes over 64k, the offset needs to backtrack componentsPerAttribute * componentDatatype bytes
        //so that the polyline looks contiguous.
        //if the polyline ends at the 64k mark, then the offset is just 64k * componentsPerAttribute * componentDatatype
        var vertexBufferOffset = [0];
        var offset = 0;
        var vertexArrayBuckets = [[]];
        var totalLength = 0;
        var polylineBuckets = collection._polylineBuckets;
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
            var mode = collection._mode;

            var positionArray = new Float32Array(6 * totalLength * 3);
            var pickColorArray = new Uint8Array(totalLength * 4);
            var texCoordExpandWidthAndShowArray = new Float32Array(totalLength * 4);
            var position3DArray;

            var positionIndex = 0;
            var colorIndex = 0;
            var texCoordExpandWidthAndShowIndex = 0;
            for (x in polylineBuckets) {
                if (polylineBuckets.hasOwnProperty(x)) {
                    bucket = polylineBuckets[x];
                    bucket.write(positionArray, pickColorArray, texCoordExpandWidthAndShowArray, positionIndex, colorIndex, texCoordExpandWidthAndShowIndex, context);

                    if (mode === SceneMode.MORPHING) {
                        if (typeof position3DArray === 'undefined') {
                            position3DArray = new Float32Array(6 * totalLength * 3);
                        }
                        bucket.writeForMorph(position3DArray, positionIndex);
                    }

                    var bucketLength = bucket.lengthOfPositions;
                    positionIndex += 6 * bucketLength * 3;
                    colorIndex += bucketLength * 4;
                    texCoordExpandWidthAndShowIndex += bucketLength * 4;
                    offset = bucket.updateIndices(totalIndices, vertexBufferOffset, vertexArrayBuckets, offset);
                }
            }

            var positionBufferUsage = collection._buffersUsage[POSITION_INDEX].bufferUsage;
            var showBufferUsage = collection._buffersUsage[SHOW_INDEX].bufferUsage;
            var widthBufferUsage = collection._buffersUsage[WIDTH_INDEX].bufferUsage;
            var texCoordExpandWidthAndShowBufferUsage = (showBufferUsage === BufferUsage.STREAM_DRAW || widthBufferUsage === BufferUsage.STREAM_DRAW) ? BufferUsage.STREAM_DRAW : BufferUsage.STATIC_DRAW;

            collection._positionBuffer = context.createVertexBuffer(positionArray, positionBufferUsage);
            var position3DBuffer;
            if (typeof position3DArray !== 'undefined') {
                position3DBuffer = context.createVertexBuffer(position3DArray, positionBufferUsage);
            }
            collection._pickColorBuffer = context.createVertexBuffer(pickColorArray, BufferUsage.STATIC_DRAW);
            collection._texCoordExpandWidthAndShowBuffer = context.createVertexBuffer(texCoordExpandWidthAndShowArray, texCoordExpandWidthAndShowBufferUsage);

            var pickColorSizeInBytes = 4 * Uint8Array.BYTES_PER_ELEMENT;
            var positionSizeInBytes = 3 * Float32Array.BYTES_PER_ELEMENT;
            var texCoordExpandWidthAndShowSizeInBytes = 4 * Float32Array.BYTES_PER_ELEMENT;

            var vbo = 0;
            var numberOfIndicesArrays = totalIndices.length;
            for ( var k = 0; k < numberOfIndicesArrays; ++k) {
                indices = totalIndices[k];

                if (indices.length > 0) {
                    var indicesArray = new Uint16Array(indices);
                    var indexBuffer = context.createIndexBuffer(indicesArray, BufferUsage.STATIC_DRAW, IndexDatatype.UNSIGNED_SHORT);

                    vbo += vertexBufferOffset[k];

                    var positionHighOffset = 6 * (k * (positionSizeInBytes * SIXTYFOURK) - vbo * positionSizeInBytes);//componentsPerAttribute(3) * componentDatatype(4)
                    var positionLowOffset = positionSizeInBytes + positionHighOffset;
                    var prevPositionHighOffset =  positionSizeInBytes + positionLowOffset;
                    var prevPositionLowOffset = positionSizeInBytes + prevPositionHighOffset;
                    var nextPositionHighOffset = positionSizeInBytes + prevPositionLowOffset;
                    var nextPositionLowOffset = positionSizeInBytes + nextPositionHighOffset;
                    var vertexPickColorBufferOffset = k * (pickColorSizeInBytes * SIXTYFOURK) - vbo * pickColorSizeInBytes;
                    var vertexTexCoordExpandWidthAndShowBufferOffset = k * (texCoordExpandWidthAndShowSizeInBytes * SIXTYFOURK) - vbo * texCoordExpandWidthAndShowSizeInBytes;

                    var attributes = [{
                        index : attributeIndices.position3DHigh,
                        componentsPerAttribute : 3,
                        componentDatatype : ComponentDatatype.FLOAT,
                        offsetInBytes : positionHighOffset,
                        strideInBytes : 6 * positionSizeInBytes
                    }, {
                        index : attributeIndices.position3DLow,
                        componentsPerAttribute : 3,
                        componentDatatype : ComponentDatatype.FLOAT,
                        offsetInBytes : positionLowOffset,
                        strideInBytes : 6 * positionSizeInBytes
                    }, {
                        index : attributeIndices.position2DHigh,
                        componentsPerAttribute : 3,
                        componentDatatype : ComponentDatatype.FLOAT,
                        offsetInBytes : positionHighOffset,
                        strideInBytes : 6 * positionSizeInBytes
                    }, {
                        index : attributeIndices.position2DLow,
                        componentsPerAttribute : 3,
                        componentDatatype : ComponentDatatype.FLOAT,
                        offsetInBytes : positionLowOffset,
                        strideInBytes : 6 * positionSizeInBytes
                    }, {
                        index : attributeIndices.prevPosition3DHigh,
                        componentsPerAttribute : 3,
                        componentDatatype : ComponentDatatype.FLOAT,
                        offsetInBytes : prevPositionHighOffset,
                        strideInBytes : 6 * positionSizeInBytes
                    }, {
                        index : attributeIndices.prevPosition3DLow,
                        componentsPerAttribute : 3,
                        componentDatatype : ComponentDatatype.FLOAT,
                        offsetInBytes : prevPositionLowOffset,
                        strideInBytes : 6 * positionSizeInBytes
                    }, {
                        index : attributeIndices.prevPosition2DHigh,
                        componentsPerAttribute : 3,
                        componentDatatype : ComponentDatatype.FLOAT,
                        offsetInBytes : prevPositionHighOffset,
                        strideInBytes : 6 * positionSizeInBytes
                    }, {
                        index : attributeIndices.prevPosition2DLow,
                        componentsPerAttribute : 3,
                        componentDatatype : ComponentDatatype.FLOAT,
                        offsetInBytes : prevPositionLowOffset,
                        strideInBytes : 6 * positionSizeInBytes
                    }, {
                        index : attributeIndices.nextPosition3DHigh,
                        componentsPerAttribute : 3,
                        componentDatatype : ComponentDatatype.FLOAT,
                        offsetInBytes : nextPositionHighOffset,
                        strideInBytes : 6 * positionSizeInBytes
                    }, {
                        index : attributeIndices.nextPosition3DLow,
                        componentsPerAttribute : 3,
                        componentDatatype : ComponentDatatype.FLOAT,
                        offsetInBytes : nextPositionLowOffset,
                        strideInBytes : 6 * positionSizeInBytes
                    }, {
                        index : attributeIndices.nextPosition2DHigh,
                        componentsPerAttribute : 3,
                        componentDatatype : ComponentDatatype.FLOAT,
                        offsetInBytes : nextPositionHighOffset,
                        strideInBytes : 6 * positionSizeInBytes
                    }, {
                        index : attributeIndices.nextPosition2DLow,
                        componentsPerAttribute : 3,
                        componentDatatype : ComponentDatatype.FLOAT,
                        offsetInBytes : nextPositionLowOffset,
                        strideInBytes : 6 * positionSizeInBytes
                    }, {
                        index : attributeIndices.texCoordExpandWidthAndShow,
                        componentsPerAttribute : 4,
                        componentDatatype : ComponentDatatype.FLOAT,
                        vertexBuffer : collection._texCoordExpandWidthAndShowBuffer,
                        offsetInBytes : vertexTexCoordExpandWidthAndShowBufferOffset
                    }, {
                        index : attributeIndices.pickColor,
                        componentsPerAttribute : 4,
                        componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                        vertexBuffer : collection._pickColorBuffer,
                        offsetInBytes : vertexPickColorBufferOffset,
                        normalize : true
                    }];

                    var buffer3D;
                    var bufferProperty3D;
                    var buffer2D;
                    var bufferProperty2D;

                    if (mode === SceneMode.SCENE3D) {
                        buffer3D = collection._positionBuffer;
                        bufferProperty3D = 'vertexBuffer';
                        buffer2D = emptyVertexBuffer;
                        bufferProperty2D = 'value';
                    } else if (mode === SceneMode.SCENE2D || mode === SceneMode.COLUMBUS_VIEW) {
                        buffer3D = emptyVertexBuffer;
                        bufferProperty3D = 'value';
                        buffer2D = collection._positionBuffer;
                        bufferProperty2D = 'vertexBuffer';
                    } else {
                        buffer3D = position3DBuffer;
                        bufferProperty3D = 'vertexBuffer';
                        buffer2D = collection._positionBuffer;
                        bufferProperty2D = 'vertexBuffer';
                    }

                    attributes[0][bufferProperty3D] = buffer3D;
                    attributes[1][bufferProperty3D] = buffer3D;
                    attributes[2][bufferProperty2D] = buffer2D;
                    attributes[3][bufferProperty2D] = buffer2D;
                    attributes[4][bufferProperty3D] = buffer3D;
                    attributes[5][bufferProperty3D] = buffer3D;
                    attributes[6][bufferProperty2D] = buffer2D;
                    attributes[7][bufferProperty2D] = buffer2D;
                    attributes[8][bufferProperty3D] = buffer3D;
                    attributes[9][bufferProperty3D] = buffer3D;
                    attributes[10][bufferProperty2D] = buffer2D;
                    attributes[11][bufferProperty2D] = buffer2D;

                    var va = context.createVertexArray(attributes, indexBuffer);
                    collection._vertexArrays.push({
                        va : va,
                        buckets : vertexArrayBuckets[k]
                    });
                }
            }
        }
    }

    var scratchUniformArray = [];
    function createMaterialId(material) {
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

        return material.type + ':' + JSON.stringify(scratchUniformArray);
    }

    function sortPolylinesIntoBuckets(collection) {
        var mode = collection._mode;
        var projection = collection._projection;
        var modelMatrix = collection._modelMatrix;

        var polylineBuckets = collection._polylineBuckets = {};
        var polylines = collection._polylines;
        var length = polylines.length;
        for ( var i = 0; i < length; ++i) {
            var p = polylines[i];
            p.update();
            var material = p.getMaterial();
            var value = polylineBuckets[material.type];
            if (typeof value === 'undefined') {
                value = polylineBuckets[material.type] = new PolylineBucket(material, mode, projection, modelMatrix);
            }
            value.addPolyline(p);
        }
    }

    function updateMode(collection, frameState) {
        var mode = frameState.mode;
        var projection = frameState.scene2D.projection;
        if (collection._mode !== mode && typeof mode.morphTime !== 'undefined') {
            collection.morphTime = mode.morphTime;
        }
        if (collection._mode !== mode || (collection._projection !== projection) || (!collection._modelMatrix.equals(collection.modelMatrix))) {
            collection._mode = mode;
            collection._projection = projection;
            collection._modelMatrix = collection.modelMatrix.clone();
            collection._createVertexArray = true;
        }
    }

    function removePolylines(collection) {
        if (collection._polylinesRemoved) {
            collection._polylinesRemoved = false;

            var polylines = [];

            var length = collection._polylines.length;
            for ( var i = 0, j = 0; i < length; ++i) {
                var polyline = collection._polylines[i];
                if (polyline) {
                    polyline._index = j++;
                    polylines.push(polyline);
                }
            }

            collection._polylines = polylines;
        }
    }

    function releaseShaders(collection) {
        var polylines = collection._polylines;
        var length = polylines.length;
        for (var i = 0; i < length; ++i) {
            var bucket = polylines[i]._bucket;
            if (typeof bucket !== 'undefined') {
                bucket.shaderProgram = bucket.shaderProgram && bucket.shaderProgram.release();
            }
        }
    }

    function destroyVertexArrays(collection) {
        var length = collection._vertexArrays.length;
        for ( var t = 0; t < length; ++t) {
            collection._vertexArrays[t].va.destroy();
        }
        collection._vertexArrays.length = 0;
    }

    PolylineCollection.prototype._updatePolyline = function(polyline, propertyChanged) {
        this._polylinesUpdated = true;
        this._polylinesToUpdate.push(polyline);
        ++this._propertiesChanged[propertyChanged];
    };

    function destroyPolylines(collection) {
        var polylines = collection._polylines;
        var length = polylines.length;
        for ( var i = 0; i < length; ++i) {
            if (polylines[i]) {
                polylines[i]._destroy();
            }
        }
    }

    function VertexArrayBucketLocator(count, offset, bucket) {
        this.count = count;
        this.offset = offset;
        this.bucket = bucket;
    }

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

    PolylineBucket.prototype.addPolyline = function(p) {
        var polylines = this.polylines;
        polylines.push(p);
        p._actualLength = this.getPolylinePositionsLength(p);
        this.lengthOfPositions += p._actualLength;
        p._bucket = this;
    };

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

    PolylineBucket.prototype.getPolylinePositionsLength = function(polyline) {
        var length;
        if (this.mode === SceneMode.SCENE3D || !intersectsIDL(polyline)) {
            length = polyline.getPositions().length;
            return (length > 1.0) ? length * 4.0 - 4.0 : 0.0;
        }

        var count = 0;
        var segmentLengths = polyline._segments.lengths;
        length = segmentLengths.length;
        for (var i = 0; i < length; ++i) {
            count += segmentLengths[i] * 4.0 - 4.0;
        }

        return count;
    };

    var scratchWritePosition = new Cartesian3();
    var scratchWritePrevPosition = new Cartesian3();
    var scratchWriteNextPosition = new Cartesian3();

    PolylineBucket.prototype.write = function(positionArray, pickColorArray, texCoordExpandWidthAndShowArray, positionIndex, colorIndex, texCoordExpandWidthAndShowIndex, context) {
        var mode = this.mode;
        var polylines = this.polylines;
        var length = polylines.length;
        for ( var i = 0; i < length; ++i) {
            var polyline = polylines[i];
            var width = polyline.getWidth();
            var show = polyline.getShow();
            var segments = this.getSegments(polyline);
            var positions = segments.positions;
            var lengths = segments.lengths;
            var positionsLength = positions.length;

            var pickColor = polyline.getPickId(context).unnormalizedRgb;

            var segmentIndex = 0;
            var count = 0;

            for ( var j = 0; j < positionsLength; ++j) {
                var position = (j !== 0) ? positions[j - 1] : positions[j];
                scratchWritePrevPosition.x = position.x;
                scratchWritePrevPosition.y = position.y;
                scratchWritePrevPosition.z = (mode !== SceneMode.SCENE2D) ? position.z : 0.0;

                position = positions[j];
                scratchWritePosition.x = position.x;
                scratchWritePosition.y = position.y;
                scratchWritePosition.z = (mode !== SceneMode.SCENE2D) ? position.z : 0.0;

                position = (j !== positionsLength - 1) ? positions[j + 1] : positions[j];
                scratchWriteNextPosition.x = position.x;
                scratchWriteNextPosition.y = position.y;
                scratchWriteNextPosition.z = (mode !== SceneMode.SCENE2D) ? position.z : 0.0;

                var segmentLength = lengths[segmentIndex];
                if (j === count + segmentLength) {
                    count += segmentLength;
                    ++segmentIndex;
                }

                var segmentStart = j - count === 0;
                var segmentEnd = j === count + lengths[segmentIndex] - 1;

                var startK = (segmentStart) ? 2 : 0;
                var endK = (segmentEnd) ? 2 : 4;

                for (var k = startK; k < endK; ++k) {
                    EncodedCartesian3.writeElements(scratchWritePosition, positionArray, positionIndex);
                    EncodedCartesian3.writeElements(scratchWritePrevPosition, positionArray, positionIndex + 6);
                    EncodedCartesian3.writeElements(scratchWriteNextPosition, positionArray, positionIndex + 12);

                    pickColorArray[colorIndex] = pickColor.red;
                    pickColorArray[colorIndex + 1] = pickColor.green;
                    pickColorArray[colorIndex + 2] = pickColor.blue;
                    pickColorArray[colorIndex + 3] = 255;

                    var direction = (k - 2 < 0) ? -1.0 : 1.0;
                    texCoordExpandWidthAndShowArray[texCoordExpandWidthAndShowIndex] = j / (positionsLength - 1); // s tex coord
                    texCoordExpandWidthAndShowArray[texCoordExpandWidthAndShowIndex + 1] = 2 * (k % 2) - 1;       // expand direction
                    texCoordExpandWidthAndShowArray[texCoordExpandWidthAndShowIndex + 2] = direction * width;
                    texCoordExpandWidthAndShowArray[texCoordExpandWidthAndShowIndex + 3] = show;

                    positionIndex += 6 * 3;
                    colorIndex += 4;
                    texCoordExpandWidthAndShowIndex += 4;
                }
            }
        }
    };

    var morphPositionScratch = new Cartesian3();
    var morphPrevPositionScratch = new Cartesian3();
    var morphNextPositionScratch = new Cartesian3();

    PolylineBucket.prototype.writeForMorph = function(positionArray, positionIndex) {
        var modelMatrix = this.modelMatrix;
        var polylines = this.polylines;
        var length = polylines.length;
        for ( var i = 0; i < length; ++i) {
            var polyline = polylines[i];
            var positions = polyline._segments.positions;
            var lengths = polyline._segments.lengths;
            var positionsLength = positions.length;

            var segmentIndex = 0;
            var count = 0;

            for ( var j = 0; j < positionsLength; ++j) {
                var prevPosition = (j !== 0) ? positions[j - 1] : positions[j];
                prevPosition = Matrix4.multiplyByPoint(modelMatrix, prevPosition, morphPrevPositionScratch);

                var position = Matrix4.multiplyByPoint(modelMatrix, positions[j], morphPositionScratch);

                var nextPosition = (j !== positionsLength - 1) ? positions[j + 1] : positions[j];
                nextPosition = Matrix4.multiplyByPoint(modelMatrix, nextPosition, morphNextPositionScratch);

                var segmentLength = lengths[segmentIndex];
                if (j === count + segmentLength) {
                    count += segmentLength;
                    ++segmentIndex;
                }

                var segmentStart = j - count === 0;
                var segmentEnd = j === count + lengths[segmentIndex] - 1;

                var startK = (segmentStart) ? 2 : 0;
                var endK = (segmentEnd) ? 2 : 4;

                for (var k = startK; k < endK; ++k) {
                    EncodedCartesian3.writeElements(position, positionArray, positionIndex);
                    EncodedCartesian3.writeElements(prevPosition, positionArray, positionIndex + 6);
                    EncodedCartesian3.writeElements(nextPosition, positionArray, positionIndex + 12);

                    positionIndex += 6 * 3;
                }
            }
        }
    };

    var scratchSegmentLengths = new Array(1);

    PolylineBucket.prototype.updateIndices = function(totalIndices, vertexBufferOffset, vertexArrayBuckets, offset) {
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
            polyline._locatorBuckets = [];

            var segments;
            if (this.mode === SceneMode.SCENE3D) {
                segments = scratchSegmentLengths;
                var positionsLength = polyline.getPositions().length;
                if (positionsLength > 0) {
                    segments[0] = positionsLength;
                } else {
                    continue;
                }
            } else {
                segments = polyline._segments.lengths;
            }

            var numberOfSegments = segments.length;
            if (numberOfSegments > 0) {
                var segmentIndexCount = 0;
                for ( var j = 0; j < numberOfSegments; ++j) {
                    var segmentLength = segments[j] - 1.0;
                    for ( var k = 0; k < segmentLength; ++k) {
                        if (indicesCount + 4 >= SIXTYFOURK - 1) {
                            polyline._locatorBuckets.push({
                                locator : bucketLocator,
                                count : segmentIndexCount
                            });
                            segmentIndexCount = 0;
                            vertexBufferOffset.push(4);
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

                        segmentIndexCount += 6;
                        count += 6;
                        offset += 6;
                        indicesCount += 4;
                    }
                }

                polyline._locatorBuckets.push({
                    locator : bucketLocator,
                    count : segmentIndexCount
                });

                if (indicesCount + 4 >= SIXTYFOURK - 1) {
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

    PolylineBucket.prototype.getPolylineStartIndex = function(polyline) {
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

    var scratchSegments = {
        positions : undefined,
        lengths : undefined
    };
    var scratchLengths = new Array(1);

    PolylineBucket.prototype.getSegments = function(polyline) {
        var positions = polyline.getPositions();

        if (positions.length > 0) {
            if (typeof polyline._polylineCollection._boundingVolume === 'undefined') {
                polyline._polylineCollection._boundingVolume = BoundingSphere.clone(polyline._boundingVolume);
            } else {
                polyline._polylineCollection._boundingVolume = polyline._polylineCollection._boundingVolume.union(polyline._boundingVolume, polyline._polylineCollection._boundingVolume);
            }
        }

        if (this.mode === SceneMode.SCENE3D) {
            scratchLengths[0] = positions.length;
            scratchSegments.positions = positions;
            scratchSegments.lengths = scratchLengths;
            return scratchSegments;
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

        scratchSegments.positions = newPositions;
        scratchSegments.lengths = polyline._segments.lengths;
        return scratchSegments;
    };

    PolylineBucket.prototype.writeUpdate = function(index, polyline, positionBuffer, texCoordExpandWidthAndShowBuffer) {
        var mode = this.mode;
        var positionsLength = polyline._actualLength;
        if (positionsLength) {
            index += this.getPolylineStartIndex(polyline);
            var positionArray = new Float32Array(6 * positionsLength * 3);
            var texCoordExpandWidthAndShowArray = new Float32Array(positionsLength * 4);

            var positionIndex = 0;
            var texCoordExpandWidthAndShowIndex = 0;

            var segments = this.getSegments(polyline);
            var positions = segments.positions;
            var lengths = segments.lengths;

            var segmentIndex = 0;
            var count = 0;

            var width = polyline.getWidth();
            var show = polyline.getShow();

            positionsLength = positions.length;
            for ( var i = 0; i < positionsLength; ++i) {
                var position = (i !== 0) ? positions[i - 1] : positions[i];
                scratchWritePrevPosition.x = position.x;
                scratchWritePrevPosition.y = position.y;
                scratchWritePrevPosition.z = (mode !== SceneMode.SCENE2D) ? position.z : 0.0;

                position = positions[i];
                scratchWritePosition.x = position.x;
                scratchWritePosition.y = position.y;
                scratchWritePosition.z = (mode !== SceneMode.SCENE2D) ? position.z : 0.0;

                position = (i !== positionsLength - 1) ? positions[i + 1] : positions[i];
                scratchWriteNextPosition.x = position.x;
                scratchWriteNextPosition.y = position.y;
                scratchWriteNextPosition.z = (mode !== SceneMode.SCENE2D) ? position.z : 0.0;

                var segmentLength = lengths[segmentIndex];
                if (i === count + segmentLength) {
                    count += segmentLength;
                    ++segmentIndex;
                }

                var segmentStart = i - count === 0;
                var segmentEnd = i === count + lengths[segmentIndex] - 1;

                var startJ = (segmentStart) ? 2 : 0;
                var endJ = (segmentEnd) ? 2 : 4;

                for (var j = startJ; j < endJ; ++j) {
                    EncodedCartesian3.writeElements(scratchWritePosition, positionArray, positionIndex);
                    EncodedCartesian3.writeElements(scratchWritePrevPosition, positionArray, positionIndex + 6);
                    EncodedCartesian3.writeElements(scratchWriteNextPosition, positionArray, positionIndex + 12);

                    var direction = (j - 2 < 0) ? -1.0 : 1.0;
                    texCoordExpandWidthAndShowArray[texCoordExpandWidthAndShowIndex] = i / (positionsLength - 1);  // s tex coord
                    texCoordExpandWidthAndShowArray[texCoordExpandWidthAndShowIndex + 1] = 2 * (j % 2) - 1;        // expand direction
                    texCoordExpandWidthAndShowArray[texCoordExpandWidthAndShowIndex + 2] = direction * width;
                    texCoordExpandWidthAndShowArray[texCoordExpandWidthAndShowIndex + 3] = show;

                    positionIndex += 6 * 3;
                    texCoordExpandWidthAndShowIndex += 4;
                }
            }

            positionBuffer.copyFromArrayView(positionArray, 6 * 3 * Float32Array.BYTES_PER_ELEMENT * index);
            texCoordExpandWidthAndShowBuffer.copyFromArrayView(texCoordExpandWidthAndShowArray, 4 * Float32Array.BYTES_PER_ELEMENT * index);
        }
    };

    return PolylineCollection;
});
