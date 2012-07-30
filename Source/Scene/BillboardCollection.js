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
        './Billboard',
        '../Shaders/BillboardCollectionVS',
        '../Shaders/BillboardCollectionFS'
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
        Billboard,
        BillboardCollectionVS,
        BillboardCollectionFS) {
    "use strict";

    var SHOW_INDEX = Billboard.SHOW_INDEX;
    var POSITION_INDEX = Billboard.POSITION_INDEX;
    var PIXEL_OFFSET_INDEX = Billboard.PIXEL_OFFSET_INDEX;
    var EYE_OFFSET_INDEX = Billboard.EYE_OFFSET_INDEX;
    var HORIZONTAL_ORIGIN_INDEX = Billboard.HORIZONTAL_ORIGIN_INDEX;
    var VERTICAL_ORIGIN_INDEX = Billboard.VERTICAL_ORIGIN_INDEX;
    var SCALE_INDEX = Billboard.SCALE_INDEX;
    var IMAGE_INDEX_INDEX = Billboard.IMAGE_INDEX_INDEX;
    var COLOR_INDEX = Billboard.COLOR_INDEX;
    var NUMBER_OF_PROPERTIES = Billboard.NUMBER_OF_PROPERTIES;

    // PERFORMANCE_IDEA:  Use vertex compression so we don't run out of
    // vec4 attributes (WebGL minimum: 8)
    var attributeIndices = {
        position : 0,
        pixelOffset : 1,
        eyeOffsetAndScale : 2,
        textureCoordinatesAndImageSize : 3,
        pickColor : 4,
        color : 5,
        originAndShow : 6,
        direction : 7
    };

    /**
     * A renderable collection of billboards.  Billboards are viewport-aligned
     * images positioned in the 3D scene.
     * <br /><br />
     * <div align='center'>
     * <img src='images/Billboard.png' width='400' height='300' /><br />
     * Example billboards
     * </div>
     * <br /><br />
     * Billboards are added and removed from the collection using {@link BillboardCollection#add}
     * and {@link BillboardCollection#remove}.  All billboards in a collection reference images
     * from the same texture atlas, which is assigned using {@link BillboardCollection#setTextureAtlas}.
     *
     * @alias BillboardCollection
     * @constructor
     *
     * @performance For best performance, prefer a few collections, each with many billboards, to
     * many collections with only a few billboards each.  Organize collections so that billboards
     * with the same update frequency are in the same collection, i.e., billboards that do not
     * change should be in one collection; billboards that change every frame should be in another
     * collection; and so on.
     *
     * @see BillboardCollection#add
     * @see BillboardCollection#remove
     * @see BillboardCollection#setTextureAtlas
     * @see Billboard
     * @see TextureAtlas
     * @see LabelCollection
     *
     * @example
     * // Create a billboard collection with two billboards
     * var billboards = new BillboardCollection();
     * var atlas = context.createTextureAtlas({images : images});
     * billboards.setTextureAtlas(atlas);
     * billboards.add({
     *   position : { x : 1.0, y : 2.0, z : 3.0 }
     * });
     * billboards.add({
     *   position : { x : 4.0, y : 5.0, z : 6.0 }
     * });
     */
    var BillboardCollection = function() {
        this._textureAtlas = undefined;
        this._textureAtlasGUID = undefined;
        this._destroyTextureAtlas = true;
        this._sp = undefined;
        this._rs = undefined;
        this._vaf = undefined;
        this._rsPick = undefined;
        this._spPick = undefined;

        this._billboards = [];
        this._billboardsToUpdate = [];
        this._billboardsRemoved = false;
        this._createVertexArray = false;

        this._propertiesChanged = new Uint32Array(NUMBER_OF_PROPERTIES);

        /**
         * The 4x4 transformation matrix that transforms each billboard in this collection from model to world coordinates.
         * When this is the identity matrix, the billboards are drawn in world coordinates, i.e., Earth's WGS84 coordinates.
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
         * var center = ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883));
         * billboards.modelMatrix = Transforms.eastNorthUpToFixedFrame(center);
         * billboards.add({ position : new Cartesian3(0.0, 0.0, 0.0) }); // center
         * billboards.add({ position : new Cartesian3(1000000.0, 0.0, 0.0) }); // east
         * billboards.add({ position : new Cartesian3(0.0, 1000000.0, 0.0) }); // north
         * billboards.add({ position : new Cartesian3(0.0, 0.0, 1000000.0) }); // up
         * ]);
         */
        this.modelMatrix = Matrix4.IDENTITY;
        this._modelMatrix = Matrix4.IDENTITY;

        this._mode = SceneMode.SCENE3D;
        this._projection = undefined;

        /**
         * The current morph transition time between 2D/Columbus View and 3D,
         * with 0.0 being 2D or Columbus View and 1.0 being 3D.
         *
         * @type Number
         */
        this.morphTime = this._mode.morphTime;

        // The buffer usage for each attribute is determined based on the usage of the attribute over time.
        this._buffersUsage = [
                              BufferUsage.STATIC_DRAW, // SHOW_INDEX
                              BufferUsage.STATIC_DRAW, // POSITION_INDEX
                              BufferUsage.STATIC_DRAW, // PIXEL_OFFSET_INDEX
                              BufferUsage.STATIC_DRAW, // EYE_OFFSET_INDEX
                              BufferUsage.STATIC_DRAW, // HORIZONTAL_ORIGIN_INDEX
                              BufferUsage.STATIC_DRAW, // VERTICAL_ORIGIN_INDEX
                              BufferUsage.STATIC_DRAW, // SCALE_INDEX
                              BufferUsage.STATIC_DRAW, // IMAGE_INDEX_INDEX
                              BufferUsage.STATIC_DRAW // COLOR_INDEX
                          ];

        var that = this;
        var uniforms = {
            u_atlas : function() {
                return that._textureAtlas.getTexture();
            },
            u_atlasSize : function() {
                return that._textureAtlas.getTexture().getDimensions();
            }
        };

        this._uniforms3D = combine(uniforms, {
            u_model : function() {
                return that.modelMatrix;
            }
        });
        this._uniforms2D = combine(uniforms, {
            u_model : function() {
                return Matrix4.IDENTITY;
            }
        });
        this._uniforms = undefined;
    };

    /**
     * Creates and adds a billboard with the specified initial properties to the collection.
     * The added billboard is returned so it can be modified or removed from the collection later.
     *
     * @memberof BillboardCollection
     *
     * @param {Object}[billboard=undefined] A template describing the billboard's properties as shown in Example 1.
     *
     * @return {Billboard} The billboard that was added to the collection.
     *
     * @performance Calling <code>add</code> is expected constant time.  However, when
     * {@link BillboardCollection#update} is called, the collection's vertex buffer
     * is rewritten - an <code>O(n)</code> operation that also incurs CPU to GPU overhead.  For
     * best performance, add as many billboards as possible before calling <code>update</code>.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see BillboardCollection#remove
     * @see BillboardCollection#removeAll
     * @see BillboardCollection#update
     *
     * @example
     * // Example 1:  Add a billboard, specifying all the default values.
     * var b = billboards.add({
     *   show : true,
     *   position : new Cartesian3(0.0, 0.0, 0.0),
     *   pixelOffset : new Cartesian2(0.0, 0.0),
     *   eyeOffset : new Cartesian3(0.0, 0.0, 0.0),
     *   horizontalOrigin : HorizontalOrigin.CENTER,
     *   verticalOrigin : VerticalOrigin.CENTER,
     *   scale : 1.0,
     *   imageIndex : 0,
     *   color : new Color(1.0, 1.0, 1.0, 1.0)
     * });
     *
     * // Example 2:  Specify only the billboard's cartographic position.
     * var b = billboards.add({
     *   position : ellipsoid.cartographicToCartesian(new Cartographic(longitude, latitude, height))
     * });
     */
    BillboardCollection.prototype.add = function(billboard) {
        var b = new Billboard(billboard, this);
        b._index = this._billboards.length;

        this._billboards.push(b);
        this._createVertexArray = true;

        return b;
    };

    /**
     * Removes a billboard from the collection.
     *
     * @memberof BillboardCollection
     *
     * @param {Billboard} billboard The billboard to remove.
     *
     * @return {Boolean} <code>true</code> if the billboard was removed; <code>false</code> if the billboard was not found in the collection.
     *
     * @performance Calling <code>remove</code> is expected constant time.  However, when
     * {@link BillboardCollection#update} is called, the collection's vertex buffer
     * is rewritten - an <code>O(n)</code> operation that also incurs CPU to GPU overhead.  For
     * best performance, remove as many billboards as possible before calling <code>update</code>.
     * If you intend to temporarily hide a billboard, it is usually more efficient to call
     * {@link Billboard#setShow} instead of removing and re-adding the billboard.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see BillboardCollection#add
     * @see BillboardCollection#removeAll
     * @see BillboardCollection#update
     * @see Billboard#setShow
     *
     * @example
     * var b = billboards.add(...);
     * billboards.remove(b);  // Returns true
     */
    BillboardCollection.prototype.remove = function(billboard) {
        if (this.contains(billboard)) {
            this._billboards[billboard._index] = null; // Removed later
            this._billboardsRemoved = true;
            this._createVertexArray = true;
            billboard._destroy();
            return true;
        }

        return false;
    };

    /**
     * Removes all billboards from the collection.
     *
     * @performance <code>O(n)</code>.  It is more efficient to remove all the billboards
     * from a collection and then add new ones than to create a new collection entirely.
     *
     * @memberof BillboardCollection
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see BillboardCollection#add
     * @see BillboardCollection#remove
     * @see BillboardCollection#update
     *
     * @example
     * billboards.add(...);
     * billboards.add(...);
     * billboards.removeAll();
     */
    BillboardCollection.prototype.removeAll = function() {
        this._destroyBillboards();
        this._billboards = [];
        this._billboardsToUpdate = [];
        this._billboardsRemoved = false;

        this._createVertexArray = true;
    };

    BillboardCollection.prototype._removeBillboards = function() {
        if (this._billboardsRemoved) {
            this._billboardsRemoved = false;

            var billboards = [];

            var length = this._billboards.length;
            for ( var i = 0, j = 0; i < length; ++i) {
                var billboard = this._billboards[i];
                if (billboard) {
                    billboard._index = j++;
                    billboards.push(billboard);
                }
            }

            this._billboards = billboards;
        }
    };

    BillboardCollection.prototype._updateBillboard = function(billboard, propertyChanged) {
        if (!billboard._isDirty()) {
            this._billboardsToUpdate.push(billboard);
        }

        ++this._propertiesChanged[propertyChanged];
    };

    /**
     * DOC_TBA
     *
     * @memberof BillboardCollection
     *
     * @param {Object} billboard DOC_TBA
     *
     * @see BillboardCollection#get
     */
    BillboardCollection.prototype.contains = function(billboard) {
        return (billboard && (billboard._getCollection() === this));
    };

    /**
     * Returns the billboard in the collection at the specified index.  Indices are zero-based
     * and increase as billboards are added.  Removing a billboard shifts all billboards after
     * it to the left, changing their indices.  This function is commonly used with
     * {@link BillboardCollection#getLength} to iterate over all the billboards
     * in the collection.
     *
     * @memberof BillboardCollection
     *
     * @param {Number} index The zero-based index of the billboard.
     *
     * @return {Billboard} The billboard at the specified index.
     *
     * @performance Expected constant time.  If billboards were removed from the collection and
     * {@link BillboardCollection#update} was not called, an implicit <code>O(n)</code>
     * operation is performed.
     *
     * @exception {DeveloperError} index is required.
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see BillboardCollection#getLength
     *
     * @example
     * // Toggle the show property of every billboard in the collection
     * var len = billboards.getLength();
     * for (var i = 0; i < len; ++i) {
     *   var b = billboards.get(i);
     *   b.setShow(!b.getShow());
     * }
     */
    BillboardCollection.prototype.get = function(index) {
        if (typeof index === 'undefined') {
            throw new DeveloperError('index is required.');
        }

        this._removeBillboards();
        return this._billboards[index];
    };

    /**
     * Returns the number of billboards in this collection.  This is commonly used with
     * {@link BillboardCollection#get} to iterate over all the billboards
     * in the collection.
     *
     * @memberof BillboardCollection
     *
     * @return {Number} The number of billboards in this collection.
     *
     * @performance Expected constant time.  If billboards were removed from the collection and
     * {@link BillboardCollection#update} was not called, an implicit <code>O(n)</code>
     * operation is performed.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see BillboardCollection#get
     *
     * @example
     * // Toggle the show property of every billboard in the collection
     * var len = billboards.getLength();
     * for (var i = 0; i < len; ++i) {
     *   var b = billboards.get(i);
     *   b.setShow(!b.getShow());
     * }
     */
    BillboardCollection.prototype.getLength = function() {
        this._removeBillboards();
        return this._billboards.length;
    };

    /**
     * DOC_TBA
     *
     * @memberof BillboardCollection
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see BillboardCollection#setTextureAtlas
     * @see Billboard#setImageIndex
     */
    BillboardCollection.prototype.getTextureAtlas = function() {
        return this._textureAtlas;
    };

    /**
     * DOC_TBA
     *
     * @memberof BillboardCollection
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see BillboardCollection#getTextureAtlas
     * @see Billboard#setImageIndex
     *
     * @example
     * // Assigns a texture atlas with two images to a billboard collection.
     * // Two billboards, each referring to one of the images, are then
     * // added to the collection.
     * var billboards = new BillboardCollection();
     * var images = [image0, image1];
     * var atlas = context.createTextureAtlas({images : images});
     * billboards.setTextureAtlas(atlas);
     * billboards.add({
     *   // ...
     *   imageIndex : 0
     * });
     * billboards.add({
     *   // ...
     *   imageIndex : 1
     * });
     */
    BillboardCollection.prototype.setTextureAtlas = function(value) {
        if (this._textureAtlas !== value) {
            this._textureAtlas = this._destroyTextureAtlas && this._textureAtlas && this._textureAtlas.destroy();
            this._textureAtlas = value;
            this._createVertexArray = true; // New per-billboard texture coordinates
        }
    };

    /**
     * Returns <code>true</code> if the texture atlas is destroyed when the collection is
     * destroyed; otherwise, <code>false</code>.
     *
     * @memberof BillboardCollection
     *
     * @return <code>true</code> if the texture atlas is destroyed when the collection is
     * destroyed; otherwise, <code>false</code>.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see BillboardCollection#setDestroyTextureAtlas
     */
    BillboardCollection.prototype.getDestroyTextureAtlas = function() {
        return this._destroyTextureAtlas;
    };

    /**
     * Determines if the texture atlas is destroyed when the collection is destroyed.  If the texture
     * atlas is used by more than one collection, set this to <code>false</code>, and explicitly
     * destroy the atlas to avoid attempting to destroy it multiple times.
     *
     * @memberof BillboardCollection
     *
     * @param {Boolean} value Indicates if the texture atlas is destroyed when the collection is destroyed.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see BillboardCollection#getDestroyTextureAtlas
     * @see BillboardCollection#setTextureAtlas
     * @see BillboardCollection#destroy
     *
     * @example
     * // Destroy a billboard collection but not its texture atlas.
     *
     * var atlas = context.createTextureAtlas({images : images});
     * billboards.setTextureAtlas(atlas);
     * billboards.setDestroyTextureAtlas(false);
     * billboards = billboards.destroy();
     * console.log(atlas.isDestroyed()); // False
     */
    BillboardCollection.prototype.setDestroyTextureAtlas = function(value) {
        this._destroyTextureAtlas = value;
    };

    BillboardCollection._getDirectionsVertexBuffer = function(context) {
        var sixteenK = 16 * 1024;

        // Per-context cache for billboard collections
        context._primitivesCache = context._primitivesCache || {};
        var primitivesCache = context._primitivesCache;
        primitivesCache._billboardCollection = primitivesCache._billboardCollection || {};
        var c = primitivesCache._billboardCollection;

        if (c.directionsVertexBuffer) {
            return c.directionsVertexBuffer;
        }

        c.directionsVertexBuffer = c.directionsVertexBuffer && c.directionsVertexBuffer.destroy();

        var directions = new Uint8Array(sixteenK * 4 * 2);
        for ( var i = 0, j = 0; i < sixteenK; ++i) {
            directions[j++] = 0;
            directions[j++] = 0;

            directions[j++] = 255;
            directions[j++] = 0.0;

            directions[j++] = 255;
            directions[j++] = 255;

            directions[j++] = 0.0;
            directions[j++] = 255;
        }

        // PERFORMANCE_IDEA:  Should we reference count billboard collections, and eventually delete this?
        // Is this too much memory to allocate up front?  Should we dynamically grow it?
        c.directionsVertexBuffer = context.createVertexBuffer(directions, BufferUsage.STATIC_DRAW);
        c.directionsVertexBuffer.setVertexArrayDestroyable(false);
        return c.directionsVertexBuffer;
    };

    BillboardCollection._getIndexBuffer = function(context) {
        var sixteenK = 16 * 1024;

        // Per-context cache for billboard collections
        context._primitivesCache = context._primitivesCache || {};
        var primitivesCache = context._primitivesCache;
        primitivesCache._billboardCollection = primitivesCache._billboardCollection || {};
        var c = primitivesCache._billboardCollection;

        if (c.indexBuffer) {
            return c.indexBuffer;
        }

        var length = sixteenK * 6;
        var indices = new Uint16Array(length);
        for ( var i = 0, j = 0; i < length; i += 6, j += 4) {
            indices[i + 0] = j + 0;
            indices[i + 1] = j + 1;
            indices[i + 2] = j + 2;

            indices[i + 3] = j + 0;
            indices[i + 4] = j + 2;
            indices[i + 5] = j + 3;
        }

        // PERFORMANCE_IDEA:  Should we reference count billboard collections, and eventually delete this?
        // Is this too much memory to allocate up front?  Should we dynamically grow it?
        c.indexBuffer = context.createIndexBuffer(indices, BufferUsage.STATIC_DRAW, IndexDatatype.UNSIGNED_SHORT);
        c.indexBuffer.setVertexArrayDestroyable(false);
        return c.indexBuffer;
    };

    /**
     * Renders the billboards.  In order for changes to properties to be realized,
     * {@link BillboardCollection#update} must be called before <code>render</code>.
     * <br /><br />
     * A texture atlas must be assigned to the billboard collection using
     * {@link BillboardCollection#setTextureAtlas}, otherwise no billboards will be rendered.
     * <br /><br />
     * Billboards are rendered in a single pass using an uber-shader.
     *
     * @memberof BillboardCollection
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see BillboardCollection#update
     * @see BillboardCollection#setTextureAtlas
     */
    BillboardCollection.prototype.render = function(context) {
        if (this._vaf && this._vaf.va && this._textureAtlas) {
            var va = this._vaf.va;
            var length = va.length;
            for ( var i = 0; i < length; ++i) {
                context.draw({
                    primitiveType : PrimitiveType.TRIANGLES,
                    count : va[i].indicesCount,
                    shaderProgram : this._sp,
                    uniformMap : this._uniforms,
                    vertexArray : va[i].va,
                    renderState : this._rs
                });
            }
        }
    };

    /**
     * DOC_TBA
     * @memberof BillboardCollection
     */
    BillboardCollection.prototype.renderForPick = function(context, framebuffer) {
        if (this._vaf && this._vaf.va && this._textureAtlas) {
            var va = this._vaf.va;
            var length = va.length;
            for ( var i = 0; i < length; ++i) {
                context.draw({
                    primitiveType : PrimitiveType.TRIANGLES,
                    count : va[i].indicesCount,
                    shaderProgram : this._spPick,
                    uniformMap : this._uniforms,
                    vertexArray : va[i].va,
                    renderState : this._rsPick,
                    framebuffer : framebuffer
                });
            }
        }
    };

    /**
     * @private
     */
    BillboardCollection.prototype.update = function(context, sceneState) {
        // First update:  create render state and shader program
        this._rs = context.createRenderState({
            depthTest : {
                enabled : true
            },
            blending : BlendingState.ALPHA_BLEND
        });

        this._sp = context.getShaderCache().getShaderProgram(BillboardCollectionVS, BillboardCollectionFS, attributeIndices);

        this._update(context, sceneState);
        this.update = this._update;
    };

    BillboardCollection.prototype.computeNewBuffersUsage = function() {
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

    BillboardCollection._createVAF = function(context, numberOfBillboards, buffersUsage) {
        // Different billboard collections share the same vertex buffer for directions.
        var directionVertexBuffer = BillboardCollection._getDirectionsVertexBuffer(context);

        return new VertexArrayFacade(context, [{
            index : attributeIndices.position,
            componentsPerAttribute : 3,
            componentDatatype : ComponentDatatype.FLOAT,
            usage : buffersUsage[POSITION_INDEX]
        }, {
            index : attributeIndices.pixelOffset,
            componentsPerAttribute : 2,
            componentDatatype : ComponentDatatype.FLOAT,
            usage : buffersUsage[PIXEL_OFFSET_INDEX]
        }, {
            index : attributeIndices.eyeOffsetAndScale,
            componentsPerAttribute : 4,
            componentDatatype : ComponentDatatype.FLOAT,
            usage : buffersUsage[SCALE_INDEX] // buffersUsage[EYE_OFFSET_INDEX] ignored
        }, {
            index : attributeIndices.textureCoordinatesAndImageSize,
            componentsPerAttribute : 4,
            normalize : true,
            componentDatatype : ComponentDatatype.UNSIGNED_SHORT,
            usage : buffersUsage[IMAGE_INDEX_INDEX]
        }, {
            index : attributeIndices.pickColor,
            componentsPerAttribute : 4,
            normalize : true,
            componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
            usage : BufferUsage.STATIC_DRAW
        }, {
            index : attributeIndices.color,
            componentsPerAttribute : 4,
            normalize : true,
            componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
            usage : buffersUsage[COLOR_INDEX]
        }, {
            index : attributeIndices.originAndShow,
            componentsPerAttribute : 3,
            componentDatatype : ComponentDatatype.BYTE,
            usage : buffersUsage[SHOW_INDEX] // buffersUsage[HORIZONTAL_ORIGIN_INDEX] and buffersUsage[VERTICAL_ORIGIN_INDEX] ignored
        }, {
            index : attributeIndices.direction,
            vertexBuffer : directionVertexBuffer,
            componentsPerAttribute : 2,
            normalize : true,
            componentDatatype : ComponentDatatype.UNSIGNED_BYTE
        }], 4 * numberOfBillboards); // 4 vertices per billboard
    };

    ///////////////////////////////////////////////////////////////////////////

    // Four vertices per billboard.  Each has the same position, etc., but a different screen-space direction vector.

    // PERFORMANCE_IDEA:  Save memory if a property is the same for all billboards, use a latched attribute state,
    // instead of storing it in a vertex buffer.

    BillboardCollection.prototype._writePosition = function(context, textureAtlasCoordinates, vafWriters, billboard) {
        var i = (billboard._index * 4);
        var position = billboard._getActualPosition();

        vafWriters[attributeIndices.position](i + 0, position.x, position.y, position.z);
        vafWriters[attributeIndices.position](i + 1, position.x, position.y, position.z);
        vafWriters[attributeIndices.position](i + 2, position.x, position.y, position.z);
        vafWriters[attributeIndices.position](i + 3, position.x, position.y, position.z);
    };

    BillboardCollection.prototype._writePixelOffset = function(context, textureAtlasCoordinates, vafWriters, billboard) {
        var i = (billboard._index * 4);
        var pixelOffset = billboard.getPixelOffset();

        vafWriters[attributeIndices.pixelOffset](i + 0, pixelOffset.x, pixelOffset.y);
        vafWriters[attributeIndices.pixelOffset](i + 1, pixelOffset.x, pixelOffset.y);
        vafWriters[attributeIndices.pixelOffset](i + 2, pixelOffset.x, pixelOffset.y);
        vafWriters[attributeIndices.pixelOffset](i + 3, pixelOffset.x, pixelOffset.y);
    };

    BillboardCollection.prototype._writeEyeOffsetAndScale = function(context, textureAtlasCoordinates, vafWriters, billboard) {
        var i = (billboard._index * 4);
        var eyeOffset = billboard.getEyeOffset();
        var scale = billboard.getScale();

        vafWriters[attributeIndices.eyeOffsetAndScale](i + 0, eyeOffset.x, eyeOffset.y, eyeOffset.z, scale);
        vafWriters[attributeIndices.eyeOffsetAndScale](i + 1, eyeOffset.x, eyeOffset.y, eyeOffset.z, scale);
        vafWriters[attributeIndices.eyeOffsetAndScale](i + 2, eyeOffset.x, eyeOffset.y, eyeOffset.z, scale);
        vafWriters[attributeIndices.eyeOffsetAndScale](i + 3, eyeOffset.x, eyeOffset.y, eyeOffset.z, scale);
    };

    BillboardCollection.prototype._writePickColor = function(context, textureAtlasCoordinates, vafWriters, billboard) {
        var i = (billboard._index * 4);
        var pickColor = billboard.getPickId(context).unnormalizedRgb;

        vafWriters[attributeIndices.pickColor](i + 0, pickColor.red, pickColor.green, pickColor.blue, 255);
        vafWriters[attributeIndices.pickColor](i + 1, pickColor.red, pickColor.green, pickColor.blue, 255);
        vafWriters[attributeIndices.pickColor](i + 2, pickColor.red, pickColor.green, pickColor.blue, 255);
        vafWriters[attributeIndices.pickColor](i + 3, pickColor.red, pickColor.green, pickColor.blue, 255);
    };

    BillboardCollection.prototype._writeColor = function(context, textureAtlasCoordinates, vafWriters, billboard) {
        var i = (billboard._index * 4);
        var color = billboard.getColor();

        vafWriters[attributeIndices.color](i + 0, color.red * 255, color.green * 255, color.blue * 255, color.alpha * 255);
        vafWriters[attributeIndices.color](i + 1, color.red * 255, color.green * 255, color.blue * 255, color.alpha * 255);
        vafWriters[attributeIndices.color](i + 2, color.red * 255, color.green * 255, color.blue * 255, color.alpha * 255);
        vafWriters[attributeIndices.color](i + 3, color.red * 255, color.green * 255, color.blue * 255, color.alpha * 255);
    };

    BillboardCollection.prototype._writeOriginAndShow = function(context, textureAtlasCoordinates, vafWriters, billboard) {
        var i = (billboard._index * 4);
        var horizontalOrigin = billboard.getHorizontalOrigin().value;
        var verticalOrigin = billboard.getVerticalOrigin().value;
        var show = billboard.getShow();

        vafWriters[attributeIndices.originAndShow](i + 0, horizontalOrigin, verticalOrigin, show);
        vafWriters[attributeIndices.originAndShow](i + 1, horizontalOrigin, verticalOrigin, show);
        vafWriters[attributeIndices.originAndShow](i + 2, horizontalOrigin, verticalOrigin, show);
        vafWriters[attributeIndices.originAndShow](i + 3, horizontalOrigin, verticalOrigin, show);
    };

    BillboardCollection.prototype._writeTextureCoordinatesAndImageSize = function(context, textureAtlasCoordinates, vafWriters, billboard) {
        var i = (billboard._index * 4);
        var imageRectangle = textureAtlasCoordinates[billboard.getImageIndex()];
        var bottomLeftX = imageRectangle.x;
        var bottomLeftY = imageRectangle.y;
        var topRightX = imageRectangle.x + imageRectangle.width;
        var topRightY = imageRectangle.y + imageRectangle.height;
        vafWriters[attributeIndices.textureCoordinatesAndImageSize](i + 0, bottomLeftX * 65535, bottomLeftY * 65535, imageRectangle.width * 65535, imageRectangle.height * 65535); // Lower Left
        vafWriters[attributeIndices.textureCoordinatesAndImageSize](i + 1, topRightX * 65535, bottomLeftY * 65535, imageRectangle.width * 65535, imageRectangle.height * 65535); // Lower Right
        vafWriters[attributeIndices.textureCoordinatesAndImageSize](i + 2, topRightX * 65535, topRightY * 65535, imageRectangle.width * 65535, imageRectangle.height * 65535); // Upper Right
        vafWriters[attributeIndices.textureCoordinatesAndImageSize](i + 3, bottomLeftX * 65535, topRightY * 65535, imageRectangle.width * 65535, imageRectangle.height * 65535); // Upper Left
    };

    BillboardCollection.prototype._writeBillboard = function(context, textureAtlasCoordinates, vafWriters, billboard) {
        this._writePosition(context, textureAtlasCoordinates, vafWriters, billboard);
        this._writePixelOffset(context, textureAtlasCoordinates, vafWriters, billboard);
        this._writeEyeOffsetAndScale(context, textureAtlasCoordinates, vafWriters, billboard);
        this._writePickColor(context, textureAtlasCoordinates, vafWriters, billboard);
        this._writeColor(context, textureAtlasCoordinates, vafWriters, billboard);
        this._writeOriginAndShow(context, textureAtlasCoordinates, vafWriters, billboard);
        this._writeTextureCoordinatesAndImageSize(context, textureAtlasCoordinates, vafWriters, billboard);
    };

    BillboardCollection.prototype._updateScene2D = function(projection, billboards) {
        var length = billboards.length;

        for ( var i = 0; i < length; ++i) {
            var b = billboards[i];
            var p = this.modelMatrix.multiplyByVector(new Cartesian4(b.getPosition().x, b.getPosition().y, b.getPosition().z, 1.0));
            var projectedPoint = projection.project(projection.getEllipsoid().cartesianToCartographic(new Cartesian3(p.x, p.y, p.z)));
            b._setActualPosition({
                x : 0.0,
                y : projectedPoint.x,
                z : projectedPoint.y
            });
        }
    };

    BillboardCollection.prototype._updateColumbusView = function(projection, billboards) {
        var length = billboards.length;

        for ( var i = 0; i < length; ++i) {
            var b = billboards[i];
            var p = this.modelMatrix.multiplyByVector(new Cartesian4(b.getPosition().x, b.getPosition().y, b.getPosition().z, 1.0));
            var projectedPoint = projection.project(projection.getEllipsoid().cartesianToCartographic(new Cartesian3(p.x, p.y, p.z)));
            b._setActualPosition({
                x : projectedPoint.z,
                y : projectedPoint.x,
                z : projectedPoint.y
            });
        }
    };

    BillboardCollection.prototype._updateMode = function(sceneState) {
        var mode = sceneState.mode;
        var projection = sceneState.scene2D.projection;

        var billboards;
        var length;
        var i;
        var b;

        if ((this._mode !== mode) ||
            (this._projection !== projection) ||
            (mode !== SceneMode.SCENE3D) &&
            (!this._modelMatrix.equals(this.modelMatrix))) {

            this._mode = mode;
            this._projection = projection;
            this._modelMatrix = this.modelMatrix.clone();

            billboards = this._billboards;
            length = billboards.length;

            switch (mode) {
            case SceneMode.SCENE3D:
                for (i = 0; i < length; ++i) {
                    b = billboards[i];
                    b._setActualPosition(b.getPosition());
                }
                break;

            case SceneMode.SCENE2D:
                this._updateScene2D(projection, this._billboards);
                break;

            case SceneMode.COLUMBUS_VIEW:
                this._updateColumbusView(projection, this._billboards);
                break;
            }
        } else if (mode === SceneMode.MORPHING) {
            billboards = this._billboards;
            length = billboards.length;

            for (i = 0; i < length; ++i) {
                b = billboards[i];
                var p = b.getPosition();
                var projectedPoint = projection.project(projection.getEllipsoid().cartesianToCartographic(p));

                b._setActualPosition({
                    x : CesiumMath.lerp(projectedPoint.z, p.x, this.morphTime),
                    y : CesiumMath.lerp(projectedPoint.x, p.y, this.morphTime),
                    z : CesiumMath.lerp(projectedPoint.y, p.z, this.morphTime)
                });
            }
        } else if (mode === SceneMode.SCENE2D) {
            this._updateScene2D(projection, this._billboardsToUpdate);
        } else if (mode === SceneMode.COLUMBUS_VIEW) {
            this._updateColumbusView(projection, this._billboardsToUpdate);
        }
    };

    BillboardCollection.prototype._update = function(context, sceneState) {
        var textureAtlas = this._textureAtlas;
        if (typeof textureAtlas === 'undefined') {
            // Can't write billboard vertices until we have texture coordinates
            // provided by a texture atlas
            return;
        }

        var textureAtlasCoordinates = textureAtlas.getTextureCoordinates();
        if (textureAtlasCoordinates.length === 0) {
            // Can't write billboard vertices until we have texture coordinates
            // provided by a texture atlas
            return;
        }

        this._removeBillboards();

        this._updateMode(sceneState);

        var billboards = this._billboards;
        var length = billboards.length;
        var properties = this._propertiesChanged;

        var textureAtlasGUID = textureAtlas.getGUID();
        var createVertexArray = this._createVertexArray || this._textureAtlasGUID !== textureAtlasGUID;
        this._textureAtlasGUID = textureAtlasGUID;

        var vafWriters;

        // PERFORMANCE_IDEA: Round robin multiple buffers.
        if (createVertexArray || this.computeNewBuffersUsage()) {
            this._createVertexArray = false;

            this._vaf = this._vaf && this._vaf.destroy();

            if (length > 0) {
                // PERFORMANCE_IDEA:  Instead of creating a new one, resize like std::vector.
                this._vaf = BillboardCollection._createVAF(context, billboards.length, this._buffersUsage);
                vafWriters = this._vaf.writers;

                // Rewrite entire buffer if billboards were added or removed.
                for ( var i = 0; i < length; ++i) {
                    var billboard = this._billboards[i];
                    billboard._clean(); // In case it needed an update.
                    this._writeBillboard(context, textureAtlasCoordinates, vafWriters, billboard);
                }

                // Different billboard collections share the same index buffer.
                this._vaf.commit(BillboardCollection._getIndexBuffer(context));
            }

            this._billboardsToUpdate = [];
        } else {
            // Billboards were modified, but none were added or removed.

            var billboardsToUpdate = this._billboardsToUpdate;
            var updateLength = billboardsToUpdate.length;

            if (updateLength) {
                var writers = [];

                if (properties[POSITION_INDEX]) {
                    writers.push(this._writePosition);
                }

                if (properties[PIXEL_OFFSET_INDEX]) {
                    writers.push(this._writePixelOffset);
                }

                if (properties[EYE_OFFSET_INDEX] || properties[SCALE_INDEX]) {
                    writers.push(this._writeEyeOffsetAndScale);
                }

                if (properties[IMAGE_INDEX_INDEX]) {
                    writers.push(this._writeTextureCoordinatesAndImageSize);
                }

                if (properties[COLOR_INDEX]) {
                    writers.push(this._writeColor);
                }

                if (properties[HORIZONTAL_ORIGIN_INDEX] || properties[VERTICAL_ORIGIN_INDEX] || properties[SHOW_INDEX]) {
                    writers.push(this._writeOriginAndShow);
                }

                vafWriters = this._vaf.writers;

                if ((updateLength / length) > 0.1) {
                    // If more than 10% of billboard change, rewrite the entire buffer.

                    // PERFORMANCE_IDEA:  I totally made up 10% :).

                    for ( var m = 0; m < updateLength; ++m) {
                        var b = billboardsToUpdate[m];
                        b._clean();

                        for ( var n = 0; n < writers.length; ++n) {
                            writers[n](context, textureAtlasCoordinates, vafWriters, b);
                        }
                    }
                    this._vaf.commit(BillboardCollection._getIndexBuffer(context));
                } else {
                    for ( var h = 0; h < updateLength; ++h) {
                        var bb = billboardsToUpdate[h];
                        bb._clean();

                        for ( var o = 0; o < writers.length; ++o) {
                            writers[o](context, textureAtlasCoordinates, vafWriters, bb);
                        }
                        this._vaf.subCommit(bb._index * 4, 4);
                    }
                    this._vaf.endSubCommits();
                }

                this._billboardsToUpdate = [];
            }
        }

        for ( var k = 0; k < NUMBER_OF_PROPERTIES; ++k) {
            properties[k] = 0;
        }

        this._uniforms = (sceneState.mode === SceneMode.SCENE3D) ? this._uniforms3D : this._uniforms2D;
    };

    /**
     * @private
     */
    BillboardCollection.prototype.updateForPick = function(context) {
        // First update:  create render state and shader program
        this._rsPick = context.createRenderState({
            depthTest : {
                enabled : true
            }
        });

        this._spPick = context.getShaderCache().getShaderProgram(
                BillboardCollectionVS,
                '#define RENDER_FOR_PICK 1\n' + BillboardCollectionFS,
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
     * @memberof BillboardCollection
     *
     * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see BillboardCollection#destroy
     */
    BillboardCollection.prototype.isDestroyed = function() {
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
     * @memberof BillboardCollection
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see BillboardCollection#isDestroyed
     *
     * @example
     * billboards = billboards && billboards.destroy();
     */
    BillboardCollection.prototype.destroy = function() {
        this._textureAtlas = this._destroyTextureAtlas && this._textureAtlas && this._textureAtlas.destroy();
        this._sp = this._sp && this._sp.release();
        this._spPick = this._spPick && this._spPick.release();
        this._vaf = this._vaf && this._vaf.destroy();
        this._destroyBillboards();

        return destroyObject(this);
    };

    BillboardCollection.prototype._destroyBillboards = function() {
        var billboards = this._billboards;
        var length = billboards.length;
        for ( var i = 0; i < length; ++i) {
            if (billboards[i]) {
                billboards[i]._destroy();
            }
        }
    };

    return BillboardCollection;
});