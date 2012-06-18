/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/combine',
        '../Core/destroyObject',
        '../Core/Math',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Matrix4',
        '../Core/ComponentDatatype',
        '../Core/IndexDatatype',
        '../Core/PrimitiveType',
        '../Renderer/BlendingState',
        '../Renderer/BufferUsage',
        '../Renderer/VertexArrayFacade',
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
        CesiumMath,
        Cartesian3,
        Cartesian4,
        Matrix4,
        ComponentDatatype,
        IndexDatatype,
        PrimitiveType,
        BlendingState,
        BufferUsage,
        VertexArrayFacade,
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
    var WIDTH_INDEX = Polyline.WIDTH_INDEX;
    var OUTLINE_WIDTH_INDEX = Polyline.OUTLINE_WIDTH_INDEX;
    var OUTLINE_COLOR_INDEX = Polyline.OUTLINE_COLOR_INDEX;
    var NUMBER_OF_PROPERTIES = Polyline.NUMBER_OF_PROPERTIES;

    // PERFORMANCE_IDEA:  Use vertex compression so we don't run out of
    // vec4 attributes (WebGL minimum: 8)
    var attributeIndices = {
        position3D : 0,
        color : 1,
        position2D : 2,
        pickColor : 3,
        outlineColor : 4
    };

    /**
     * A renderable collection of polylines.  Polylines are viewport-aligned
     * images positioned in the 3D scene.
     * <br /><br />
     * <div align="center">
     * <img src="images/Polyline.png" width="400" height="300" /><br />
     * Example polylines
     * </div>
     * <br /><br />
     * Polylines are added and removed from the collection using {@link PolylineCollection#add}
     * and {@link PolylineCollection#remove}.
     *
     * @name PolylineCollection
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
     * var polylines = new PolylineCollection();
     * polylines.add({
     *   position : { x : 1.0, y : 2.0, z : 3.0 }
     * });
     * polylines.add({
     *   position : { x : 4.0, y : 5.0, z : 6.0 }
     * });
     */
    function PolylineCollection() {
        this._polylines = [];
        this._polylinesToUpdate = [];
        this._polylinesRemoved = false;
        this._createVertexArray = false;
        this._morphTime = 0.0;
        this._propertiesChanged = new Uint32Array(NUMBER_OF_PROPERTIES);
        this._cachedVertices = [];
        /**
         * The 4x4 transformation matrix that transforms each polyline in this collection from model to world coordinates.
         * When this is the identity matrix, the polylines are drawn in world coordinates, i.e., Earth's WGS84 coordinates.
         * Local reference frames can be used by providing a different transformation matrix, like that returned
         * by {@link Transforms.eastNorthUpToFixedFrame}.  This matrix is available to GLSL vertex and fragment
         * shaders via {@link agi_model} and derived uniforms.
         *
         * @type Matrix4
         *
         * @see Transforms.eastNorthUpToFixedFrame
         * @see agi_model
         *
         * @example
         * var center = ellipsoid.cartographicDegreesToCartesian(new Cartographic2(-75.59777, 40.03883));
         * polylines.modelMatrix = Transforms.eastNorthUpToFixedFrame(center);
         * polylines.add({ position : new Cartesian3(0.0, 0.0, 0.0) }); // center
         * polylines.add({ position : new Cartesian3(1000000.0, 0.0, 0.0) }); // east
         * polylines.add({ position : new Cartesian3(0.0, 1000000.0, 0.0) }); // north
         * polylines.add({ position : new Cartesian3(0.0, 0.0, 1000000.0) }); // up
         * ]);
         */
        this.modelMatrix = Matrix4.IDENTITY;
        this._modelMatrix = Matrix4.IDENTITY;

        /**
         * The usage hint for the polyline's vertex buffer.
         *
         * @type BufferUsage
         *
         * @performance If <code>bufferUsage</code> changes, the next time
         * {@link Polyline#update} is called, the polyline's vertex buffer
         * is rewritten - an <code>O(n)</code> operation that also incurs CPU to GPU overhead.
         * For best performance, it is important to provide the proper usage hint.  If the polyline
         * will not change over several frames, use <code>BufferUsage.STATIC_DRAW</code>.
         * If the polyline will change every frame, use <code>BufferUsage.STREAM_DRAW</code>.
         */
        this.bufferUsage = BufferUsage.STATIC_DRAW;
        // The buffer usage for each attribute is determined based on the usage of the attribute over time.
        this._buffersUsage = [
                              BufferUsage.STATIC_DRAW, // SHOW_INDEX
                              BufferUsage.STATIC_DRAW, // POSITION_INDEX
                              BufferUsage.STATIC_DRAW, // COLOR_INDEX
                              BufferUsage.STATIC_DRAW, // WIDTH_INDEX
                              BufferUsage.STATIC_DRAW, // OUTLINE_WIDTH_INDEX
                              BufferUsage.STATIC_DRAW // OUTLINE_COLOR_INDEX
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
            u_morphTime : function(){
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
            u_model : function(){
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
        this._vaf = null;
        this._writePositions = undefined;
    }

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
     * @performance Calling <code>add</code> is expected constant time.  However, when
     * {@link PolylineCollection#update} is called, the collection's vertex buffer
     * is rewritten - an <code>O(n)</code> operation that also incurs CPU to GPU overhead.  For
     * best performance, add as many polylines as possible before calling <code>update</code>.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see PolylineCollection#remove
     * @see PolylineCollection#removeAll
     * @see PolylineCollection#update
     *
     * @example
     * // Example 1:  Add a polyline, specifying all the default values.
     * var b = polylines.add({
     *   show : true,
     *   position : new Cartesian3(0.0, 0.0, 0.0),
     *   color : { red : 1.0, green : 1.0, blue : 1.0, alpha : 1.0 }
     * });
     *
     * // Example 2:  Specify only the polyline's cartographic position.
     * var b = polylines.add({
     *   position : ellipsoid.toCartesian(
     *     CesiumMath.cartographic3ToRadians(
     *       new Cartographic3(longitude, latitude, height)))
     * });
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
     * @performance Calling <code>remove</code> is expected constant time.  However, when
     * {@link PolylineCollection#update} is called, the collection's vertex buffer
     * is rewritten - an <code>O(n)</code> operation that also incurs CPU to GPU overhead.  For
     * best performance, remove as many polylines as possible before calling <code>update</code>.
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
     * var b = polylines.add(...);
     * polylines.remove(b);  // Returns true
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
        this._polylines = [];
        this._polylinesToUpdate = [];
        this._polylinesRemoved = false;

        this._createVertexArray = true;
    };



    /**
     * DOC_TBA
     *
     * @memberof PolylineCollection
     *
     * @param {Object} polyline DOC_TBA
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
     * @performance Expected constant time.  If polylines were removed from the collection and
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
     *   var b = polylines.get(i);
     *   b.setShow(!b.getShow());
     * }
     */
    PolylineCollection.prototype.get = function(index) {
        if (typeof index === "undefined") {
            throw new DeveloperError("index is required.", "index");
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
     * @performance Expected constant time.  If polylines were removed from the collection and
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
     *   var b = polylines.get(i);
     *   b.setShow(!b.getShow());
     * }
     */
    PolylineCollection.prototype.getLength = function() {
        this._removePolylines();
        return this._polylines.length;
    };

    PolylineCollection.prototype.computeNewBuffersUsage = function() {
        var buffersUsage = this._buffersUsage;
        var usageChanged = false;

        // PERFORMANCE_IDEA: Better heuristic to avoid ping-ponging.  What about DYNAMIC_STREAM?
        var properties = this._propertiesChanged;
        for ( var k = 0; k < NUMBER_OF_PROPERTIES; ++k) {
            var newUsage = (properties[k] === 0) ? BufferUsage.STATIC_DRAW : BufferUsage.STREAM_DRAW;
            usageChanged = usageChanged || (buffersUsage[k] !== newUsage);
            buffersUsage[k] = newUsage;
        }

        return usageChanged;
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
        if (this._vaf && this._vaf.va) {
            var va = this._vaf.va;
            var length = va.length;
            for ( var i = 0; i < length; ++i) {
                context.draw({
                    primitiveType : PrimitiveType.LINES,
                    count : va[i].indicesCount,
                    shaderProgram : this._sp,
                    uniformMap : this._drawUniformsOne,
                    vertexArray : va[i].va,
                    renderState : this._rsOne
                });
                context.draw({
                    primitiveType : PrimitiveType.LINES,
                    count : va[i].indicesCount,
                    shaderProgram : this._sp,
                    uniformMap : this._drawUniformsTwo,
                    vertexArray : va[i].va,
                    renderState : this._rsTwo
                });
                context.draw({
                    primitiveType : PrimitiveType.LINES,
                    count : va[i].indicesCount,
                    shaderProgram : this._sp,
                    uniformMap : this._drawUniformsThree,
                    vertexArray : va[i].va,
                    renderState : this._rsThree
                });
            }
        }
    };

    /**
     * DOC_TBA
     * @memberof PolylineCollection
     */
    PolylineCollection.prototype.renderForPick = function(context, framebuffer) {
        if (this._vaf && this._vaf.va) {
            var va = this._vaf.va;
            var length = va.length;
            for ( var i = 0; i < length; ++i) {
                context.draw({
                    primitiveType : PrimitiveType.LINES,
                    //count : va[i].indicesCount,
                    shaderProgram : this._spPick,
                    uniformMap : this._drawUniformsOne,
                    vertexArray : va[i].va,
                    renderState : this._rsOnePick
                });
                context.draw({
                    primitiveType : PrimitiveType.LINES,
                    shaderProgram : this._spPick,
                    uniformMap : this._drawUniformsTwo,
                    vertexArray : va[i].va,
                    renderState : this._rsTwoPick
                });
                context.draw({
                    primitiveType : PrimitiveType.LINES,
                    shaderProgram : this._spPick,
                    uniformMap : this._drawUniformsThree,
                    vertexArray : va[i].va,
                    renderState : this._rsThreePick
                });
            }
        }
    };

    PolylineCollection.prototype.update = function(context, sceneState) {
        if (!this._sp) {
            this._sp = context.getShaderCache().getShaderProgram(PolylineVS, PolylineFS, attributeIndices);

            this._rsOne = context.createRenderState({
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

            this._rsTwo = context.createRenderState({
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

            this._rsThree = context.createRenderState({
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
        }

        this._removePolylines();
        this._updateMode(sceneState);

        if (this._createVertexArray || this.computeNewBuffersUsage()){
            this._update(context, sceneState);
        }else{
            var polylinesToUpdate = this._polylinesToUpdate;
            var updateLength = polylinesToUpdate.length;
            if(updateLength){
                var properties = this._propertiesChanged;
                for ( var k = 0; k < NUMBER_OF_PROPERTIES; ++k) {
                    properties[k] = 0;
                }
            }
        }
    };

    PolylineCollection.prototype.updateForPick = function(context) {
        this._rsOnePick = context.createRenderState({

        });

        this._rsTwoPick = context.createRenderState({

        });

        this._rsThreePick = context.createRenderState({

        });

        this._spPick = context.getShaderCache().getShaderProgram(
                PolylineVS,
                "#define RENDER_FOR_PICK 1\n" + PolylineFS,
                attributeIndices);

        this.updateForPick = function(context) {
        };
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
        this._destroyPolylines();

        return destroyObject(this);
    };

    /**
     * @private
     */
    PolylineCollection.prototype._update = function(context, sceneState) {
        this._createVertexArray = false;
        this._vaf = this._vaf && this._vaf.destroy();
        var polylines = this._polylines;
        var length = polylines.length;
        if(length > 0){
            var sizeInVertices = 0;
            for(var j = 0; j < length; j++){
                sizeInVertices += polylines[j].getPositions().length;
            }
            this._vaf = new VertexArrayFacade(context,[{
                index : attributeIndices.position3D,
                componentsPerAttribute : 3,
                componentDatatype : ComponentDatatype.FLOAT,
                usage : this._buffersUsage[POSITION_INDEX]
            }, {
                index : attributeIndices.color,
                componentsPerAttribute : 4,
                normalize:true,
                componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                usage : this._buffersUsage[COLOR_INDEX]
            }, {
                index : attributeIndices.position2D,
                componentsPerAttribute : 3,
                componentDatatype : ComponentDatatype.FLOAT,
                usage : this._buffersUsage[POSITION_INDEX]
            }, {
                index : attributeIndices.pickColor,
                componentsPerAttribute : 4,
                normalize:true,
                componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                usage : BufferUsage.STATIC_DRAW
            }], sizeInVertices);

            var buffer = this._getIndexBuffer(context);
            var vafWriters = this._vaf.writers;

            for(var t = 0; t < this._cachedVertices.length; t++){
                var vertex = this._cachedVertices[t];
                var position = vertex._position;
                var color = vertex._color;
                var pickColor = vertex._pickId;
                this._writePositions(vafWriters, t, position, this);
                vafWriters[attributeIndices.color](t, color.red * 255, color.green * 255, color.blue * 255, color.alpha * 255);
                vafWriters[attributeIndices.pickColor](t, pickColor.red, pickColor.green, pickColor.blue, 255);
            }
            this._vaf.commit(buffer, buffer.getNumberOfIndices());
        }
        this._polylinesToUpdate = [];
    };

    PolylineCollection.prototype._write3D = function(vafWriters, index, position){
        vafWriters[attributeIndices.position3D](index, position.x, position.y, position.z);
    };

    PolylineCollection.prototype._write2D = function(vafWriters, index, position, collection){
        var modelMatrix = collection._modelMatrix;
        var ellipsoid = collection._projection.getEllipsoid();
        var p = modelMatrix.multiplyWithVector(new Cartesian4(position.x, position.y, position.z, 1.0));
        p = collection._projection.project(ellipsoid.toCartographic3(p.getXYZ()));
        vafWriters[attributeIndices.position2D](index, p.x, p.y, p.z);
    };

    PolylineCollection.prototype._updateMode = function(sceneState) {
        var mode = sceneState.mode;
        var projection = sceneState.scene2D.projection;

        if(this._mode !== mode ||
          (this._projection !== projection) ||
          (!this._modelMatrix.equals(this.modelMatrix))){
            this._syncMorphTime(mode);
            this._mode = mode;
            this._projection = projection;
            this._modelMatrix = this.modelMatrix.clone();
            switch(mode){
                case SceneMode.SCENE3D:
                    this._drawUniformsOne = this._drawUniformsOne3D;
                    this._drawUniformsTwo = this._drawUniformsTwo3D;
                    this._drawUniformsThree = this._drawUniformsThree3D;
                    this._pickUniforms = this._pickUniforms3D;
                    this._writePositions = this._write3D;
                    break;
                case SceneMode.SCENE2D:
                case SceneMode.COLUMBUS_VIEW:
                    this._drawUniformsOne = this._drawUniformsOne2D;
                    this._drawUniformsTwo = this._drawUniformsTwo2D;
                    this._drawUniformsThree = this._drawUniformsThree2D;
                    this._pickUniforms = this._pickUniforms2D;
                    this._writePositions = this._write2D;
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

    PolylineCollection.prototype._clampWidth = function(context, value) {
        var min = context.getMinimumAliasedLineWidth();
        var max = context.getMaximumAliasedLineWidth();

        return Math.min(Math.max(value, min), max);
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
                if(typeof mode.morphTime !== 'undefined') {
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

    PolylineCollection.prototype._updatePolyline = function(polyline, propertyChanged) {
        if (!polyline._isDirty()) {
            this._polylinesToUpdate.push(polyline);
        }

        ++this._propertiesChanged[propertyChanged];
    };

    PolylineCollection.prototype._getIndexBuffer = function(context) {
        var c = {};
        this._cachedVertices.length = 0;
        var polylines = this._polylines;
        var polylineIndices = [];
        var length = polylines.length;
        for(var i = 0; i < length; ++i){
            var polyline = polylines[i];
            var positions = polyline.getPositions();
            var posLength = positions.length;
            for(var j = 0; j < posLength - 1; ++j){
                var position1 = positions[j];
                var position2 = positions[j + 1];
                var index1 = PolylineCollection._getVerticesIndex(position1, polyline, this._cachedVertices, context);
                var index2 = PolylineCollection._getVerticesIndex(position2, polyline, this._cachedVertices, context);
                polylineIndices.push(index1);
                polylineIndices.push(index2);
            }
        }

        var indices = new Uint16Array(polylineIndices);
        c.indexBuffer = context.createIndexBuffer(indices, BufferUsage.STATIC_DRAW, IndexDatatype.UNSIGNED_SHORT);
        c.indexBuffer.setVertexArrayDestroyable(false);
        return c.indexBuffer;
    };

    PolylineCollection._getVerticesIndex = function(position, polyline, vertices, context) {
        var temp = new VertexData({
            color : polyline.getColor(),
            outlineColor : polyline.getOutlineColor(),
            pickId : polyline.getPickId(context).unnormalizedRgb,
            position : position
        });
        var length = vertices.length;
        for(var i = 0; i < length; ++i){
            var cached = vertices[i];
            if(temp.equals(cached)){
                return i;
            }
        }
        vertices.push(temp);
        return length;
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

    function VertexData(template){
        this._color = template.color;
        this._outlineColor = template.outlineColor;
        this._position = template.position;
        this._pickId = template.pickId;
    }

    VertexData.prototype.equals = function(other){
        var position = this._position;
        var otherPosition = other._position;
        return this._color === other._color &&
               this._outlineColor === other._outlineColor &&
               position.x === otherPosition.x && position.y === otherPosition.y && position.z === otherPosition.z;
    };

    return PolylineCollection;
});