/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/combine',
        '../Core/destroyObject',
        '../Core/Math',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Matrix4',
        '../Core/ComponentDatatype',
        '../Core/IndexDatatype',
        '../Core/PrimitiveType',
        '../Core/BoundingSphere',
        '../Renderer/BlendingState',
        '../Renderer/BufferUsage',
        '../Renderer/CommandLists',
        '../Renderer/DrawCommand',
        '../Renderer/VertexArrayFacade',
        './SceneMode',
        './Billboard',
        './HorizontalOrigin',
        '../Shaders/BillboardCollectionVS',
        '../Shaders/BillboardCollectionFS'
    ], function(
        DeveloperError,
        combine,
        destroyObject,
        CesiumMath,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Matrix4,
        ComponentDatatype,
        IndexDatatype,
        PrimitiveType,
        BoundingSphere,
        BlendingState,
        BufferUsage,
        CommandLists,
        DrawCommand,
        VertexArrayFacade,
        SceneMode,
        Billboard,
        HorizontalOrigin,
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
     *   position : { x : 1.0, y : 2.0, z : 3.0 },
     *   imageIndex : 0
     * });
     * billboards.add({
     *   position : { x : 4.0, y : 5.0, z : 6.0 },
     *   imageIndex : 1
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

        this._maxSize = 0.0;
        this._maxEyeOffset = 0.0;
        this._maxScale = 1.0;
        this._maxPixelOffset = 0.0;
        this._allHorizontalCenter = true;

        this._baseVolume = new BoundingSphere();
        this._baseVolume2D = new BoundingSphere();
        this._boundingVolume = new BoundingSphere();

        this._commandLists = new CommandLists();

        /**
         * The 4x4 transformation matrix that transforms each billboard in this collection from model to world coordinates.
         * When this is the identity matrix, the billboards are drawn in world coordinates, i.e., Earth's WGS84 coordinates.
         * Local reference frames can be used by providing a different transformation matrix, like that returned
         * by {@link Transforms.eastNorthUpToFixedFrame}.  This matrix is available to GLSL vertex and fragment
         * shaders via {@link czm_model} and derived uniforms.
         *
         * @type Matrix4
         *
         * @see Transforms.eastNorthUpToFixedFrame
         * @see czm_model
         *
         * @example
         * var center = ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883));
         * billboards.modelMatrix = Transforms.eastNorthUpToFixedFrame(center);
         * billboards.add({ imageIndex: 0, position : new Cartesian3(0.0, 0.0, 0.0) }); // center
         * billboards.add({ imageIndex: 0, position : new Cartesian3(1000000.0, 0.0, 0.0) }); // east
         * billboards.add({ imageIndex: 0, position : new Cartesian3(0.0, 1000000.0, 0.0) }); // north
         * billboards.add({ imageIndex: 0, position : new Cartesian3(0.0, 0.0, 1000000.0) }); // up
         * ]);
         */
        this.modelMatrix = Matrix4.IDENTITY.clone();
        this._modelMatrix = Matrix4.IDENTITY.clone();

        this._mode = SceneMode.SCENE3D;
        this._projection = undefined;

        /**
         * If true, aligns all billboards to a pixel in screen space,
         * providing a crisper image at the cost of jumpier motion.
         * Defaults to false.
         *
         * @type Boolean
         */
        this.clampToPixel = false;

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
        this._uniforms = {
            u_atlas : function() {
                return that._textureAtlas.getTexture();
            },
            u_atlasSize : function() {
                return that._textureAtlas.getTexture().getDimensions();
            },
            u_clampToPixel : function() {
                return that.clampToPixel ? 1.0 : 0.0;
            }
        };
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

    function removeBillboards(billboardCollection) {
        if (billboardCollection._billboardsRemoved) {
            billboardCollection._billboardsRemoved = false;

            var newBillboards = [];
            var billboards = billboardCollection._billboards;
            var length = billboards.length;
            for (var i = 0, j = 0; i < length; ++i) {
                var billboard = billboards[i];
                if (billboard) {
                    billboard._index = j++;
                    newBillboards.push(billboard);
                }
            }

            billboardCollection._billboards = newBillboards;
        }
    }

    BillboardCollection.prototype._updateBillboard = function(billboard, propertyChanged) {
        if (!billboard._dirty) {
            this._billboardsToUpdate.push(billboard);
        }

        ++this._propertiesChanged[propertyChanged];
    };

    /**
     * Check whether this collection contains a given billboard.
     *
     * @memberof BillboardCollection
     *
     * @param {Billboard} billboard The billboard to check for.
     *
     * @return {Boolean} true if this collection contains the billboard, false otherwise.
     *
     * @see BillboardCollection#get
     */
    BillboardCollection.prototype.contains = function(billboard) {
        return typeof billboard !== 'undefined' && billboard._billboardCollection === this;
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

        removeBillboards(this);
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
        removeBillboards(this);
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

    function getDirectionsVertexBuffer(context) {
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
        for (var i = 0, j = 0; i < sixteenK; ++i) {
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
    }

    function getIndexBuffer(context) {
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
        for (var i = 0, j = 0; i < length; i += 6, j += 4) {
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
    }

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

    function createVAF(context, numberOfBillboards, buffersUsage) {
        // Different billboard collections share the same vertex buffer for directions.
        var directionVertexBuffer = getDirectionsVertexBuffer(context);

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
    }

    ///////////////////////////////////////////////////////////////////////////

    // Four vertices per billboard.  Each has the same position, etc., but a different screen-space direction vector.

    // PERFORMANCE_IDEA:  Save memory if a property is the same for all billboards, use a latched attribute state,
    // instead of storing it in a vertex buffer.

    function writePosition(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard) {
        var i = (billboard._index * 4);
        var position = billboard._getActualPosition();

        if (billboardCollection._mode === SceneMode.SCENE3D) {
            billboardCollection._baseVolume.expand(position, billboardCollection._baseVolume);
        }

        vafWriters[attributeIndices.position](i + 0, position.x, position.y, position.z);
        vafWriters[attributeIndices.position](i + 1, position.x, position.y, position.z);
        vafWriters[attributeIndices.position](i + 2, position.x, position.y, position.z);
        vafWriters[attributeIndices.position](i + 3, position.x, position.y, position.z);
    }

    function writePixelOffset(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard) {
        var i = (billboard._index * 4);
        var pixelOffset = billboard.getPixelOffset();
        billboardCollection._maxPixelOffset = Math.max(billboardCollection._maxPixelOffset, pixelOffset.x, pixelOffset.y);

        vafWriters[attributeIndices.pixelOffset](i + 0, pixelOffset.x, pixelOffset.y);
        vafWriters[attributeIndices.pixelOffset](i + 1, pixelOffset.x, pixelOffset.y);
        vafWriters[attributeIndices.pixelOffset](i + 2, pixelOffset.x, pixelOffset.y);
        vafWriters[attributeIndices.pixelOffset](i + 3, pixelOffset.x, pixelOffset.y);
    }

    function writeEyeOffsetAndScale(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard) {
        var i = (billboard._index * 4);
        var eyeOffset = billboard.getEyeOffset();
        var scale = billboard.getScale();
        billboardCollection._maxEyeOffset = Math.max(billboardCollection._maxEyeOffset, Math.abs(eyeOffset.x), Math.abs(eyeOffset.y), Math.abs(eyeOffset.z));
        billboardCollection._maxScale = Math.max(billboardCollection._maxScale, scale);

        vafWriters[attributeIndices.eyeOffsetAndScale](i + 0, eyeOffset.x, eyeOffset.y, eyeOffset.z, scale);
        vafWriters[attributeIndices.eyeOffsetAndScale](i + 1, eyeOffset.x, eyeOffset.y, eyeOffset.z, scale);
        vafWriters[attributeIndices.eyeOffsetAndScale](i + 2, eyeOffset.x, eyeOffset.y, eyeOffset.z, scale);
        vafWriters[attributeIndices.eyeOffsetAndScale](i + 3, eyeOffset.x, eyeOffset.y, eyeOffset.z, scale);
    }

    function writePickColor(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard) {
        var i = (billboard._index * 4);
        var pickColor = billboard.getPickId(context).unnormalizedRgb;

        vafWriters[attributeIndices.pickColor](i + 0, pickColor.red, pickColor.green, pickColor.blue, 255);
        vafWriters[attributeIndices.pickColor](i + 1, pickColor.red, pickColor.green, pickColor.blue, 255);
        vafWriters[attributeIndices.pickColor](i + 2, pickColor.red, pickColor.green, pickColor.blue, 255);
        vafWriters[attributeIndices.pickColor](i + 3, pickColor.red, pickColor.green, pickColor.blue, 255);
    }

    function writeColor(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard) {
        var i = (billboard._index * 4);
        var color = billboard.getColor();

        vafWriters[attributeIndices.color](i + 0, color.red * 255, color.green * 255, color.blue * 255, color.alpha * 255);
        vafWriters[attributeIndices.color](i + 1, color.red * 255, color.green * 255, color.blue * 255, color.alpha * 255);
        vafWriters[attributeIndices.color](i + 2, color.red * 255, color.green * 255, color.blue * 255, color.alpha * 255);
        vafWriters[attributeIndices.color](i + 3, color.red * 255, color.green * 255, color.blue * 255, color.alpha * 255);
    }

    function writeOriginAndShow(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard) {
        var i = (billboard._index * 4);
        var horizontalOrigin = billboard.getHorizontalOrigin().value;
        var verticalOrigin = billboard.getVerticalOrigin().value;
        var show = billboard.getShow();

        billboardCollection._allHorizontalCenter = billboardCollection._allHorizontalCenter && horizontalOrigin === HorizontalOrigin.CENTER.value;

        vafWriters[attributeIndices.originAndShow](i + 0, horizontalOrigin, verticalOrigin, show);
        vafWriters[attributeIndices.originAndShow](i + 1, horizontalOrigin, verticalOrigin, show);
        vafWriters[attributeIndices.originAndShow](i + 2, horizontalOrigin, verticalOrigin, show);
        vafWriters[attributeIndices.originAndShow](i + 3, horizontalOrigin, verticalOrigin, show);
    }

    function writeTextureCoordinatesAndImageSize(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard) {
        var i = (billboard._index * 4);
        var bottomLeftX = 0;
        var bottomLeftY = 0;
        var width = 0;
        var height = 0;
        var index = billboard.getImageIndex();
        if (index !== -1) {
            var imageRectangle = textureAtlasCoordinates[index];
            if (typeof imageRectangle === 'undefined') {
                throw new DeveloperError('Invalid billboard image index: ' + index);
            }
            bottomLeftX = imageRectangle.x;
            bottomLeftY = imageRectangle.y;
            width = imageRectangle.width;
            height = imageRectangle.height;
        }
        var topRightX = bottomLeftX + width;
        var topRightY = bottomLeftY + height;

        billboardCollection._maxSize = Math.max(billboardCollection._maxSize, width, height);

        vafWriters[attributeIndices.textureCoordinatesAndImageSize](i + 0, bottomLeftX * 65535, bottomLeftY * 65535, width * 65535, height * 65535); // Lower Left
        vafWriters[attributeIndices.textureCoordinatesAndImageSize](i + 1, topRightX * 65535, bottomLeftY * 65535, width * 65535, height * 65535); // Lower Right
        vafWriters[attributeIndices.textureCoordinatesAndImageSize](i + 2, topRightX * 65535, topRightY * 65535, width * 65535, height * 65535); // Upper Right
        vafWriters[attributeIndices.textureCoordinatesAndImageSize](i + 3, bottomLeftX * 65535, topRightY * 65535, width * 65535, height * 65535); // Upper Left
    }

    function writeBillboard(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard) {
        writePosition(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard);
        writePixelOffset(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard);
        writeEyeOffsetAndScale(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard);
        writePickColor(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard);
        writeColor(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard);
        writeOriginAndShow(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard);
        writeTextureCoordinatesAndImageSize(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard);
    }

    function recomputeActualPositions(billboardCollection, billboards, frameState, morphTime, modelMatrix, recomputeBoundingVolume) {
        var boundingVolume;
        if (frameState.mode === SceneMode.SCENE3D) {
            boundingVolume = billboardCollection._baseVolume;
        } else {
            boundingVolume = billboardCollection._baseVolume2D;
        }

        var length = billboards.length;
        var positions = new Array(length);
        for (var i = 0; i < length; ++i) {
            var billboard = billboards[i];
            var position = billboard.getPosition();
            var actualPosition = Billboard._computeActualPosition(position, frameState, morphTime, modelMatrix);
            billboard._setActualPosition(actualPosition);

            if (recomputeBoundingVolume) {
                positions[i] = actualPosition;
            } else {
                boundingVolume.expand(actualPosition, boundingVolume);
            }
        }

        if (recomputeBoundingVolume) {
            BoundingSphere.fromPoints(positions, boundingVolume);
        }
    }

    function updateMode(billboardCollection, frameState) {
        var mode = frameState.mode;
        var projection = frameState.scene2D.projection;

        var billboards = billboardCollection._billboards;
        var billboardsToUpdate = billboardCollection._billboardsToUpdate;
        var morphTime = billboardCollection.morphTime;
        var modelMatrix = billboardCollection._modelMatrix;

        if (billboardCollection._mode !== mode ||
                billboardCollection._projection !== projection ||
            mode !== SceneMode.SCENE3D &&
            !modelMatrix.equals(billboardCollection.modelMatrix)) {

            billboardCollection._mode = mode;
            billboardCollection._projection = projection;
            billboardCollection.modelMatrix.clone(modelMatrix);

            if (mode === SceneMode.SCENE3D || mode === SceneMode.SCENE2D || mode === SceneMode.COLUMBUS_VIEW) {
                recomputeActualPositions(billboardCollection, billboards, frameState, morphTime, modelMatrix, true);
            }
        } else if (mode === SceneMode.MORPHING) {
            recomputeActualPositions(billboardCollection, billboards, frameState, morphTime, modelMatrix, true);
        } else if (mode === SceneMode.SCENE2D || mode === SceneMode.COLUMBUS_VIEW) {
            recomputeActualPositions(billboardCollection, billboardsToUpdate, frameState, morphTime, modelMatrix, false);
        }
    }

    var scratchCanvasDimensions = new Cartesian2();
    var scratchToCenter = new Cartesian3();
    var scratchProj = new Cartesian3();
    function updateBoundingVolume(collection, context, frameState, boundingVolume) {
        var camera = frameState.camera;
        var frustum = camera.frustum;

        var textureDimensions = collection._textureAtlas.getTexture().getDimensions();
        var textureSize = Math.max(textureDimensions.x, textureDimensions.y);

        var pixelScale;
        var size;
        var offset;

        var toCenter = camera.getPositionWC().subtract(boundingVolume.center, scratchToCenter);
        var proj = camera.getDirectionWC().multiplyByScalar(toCenter.dot(camera.getDirectionWC()), scratchProj);
        var distance = Math.max(0.0, proj.magnitude() - boundingVolume.radius);

        var canvas = context.getCanvas();
        scratchCanvasDimensions.x = canvas.clientWidth;
        scratchCanvasDimensions.y = canvas.clientHeight;
        var pixelSize = frustum.getPixelSize(scratchCanvasDimensions, distance);
        pixelScale = Math.max(pixelSize.x, pixelSize.y);

        size = pixelScale * collection._maxScale * collection._maxSize * textureSize;
        if (collection._allHorizontalCenter) {
            size *= 0.5;
        }

        offset = pixelScale * collection._maxPixelOffset + collection._maxEyeOffset;
        boundingVolume.radius += size + offset;
    }

    /**
     * @private
     */
    BillboardCollection.prototype.update = function(context, frameState, commandList) {
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

        removeBillboards(this);
        updateMode(this, frameState);

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
                this._vaf = createVAF(context, billboards.length, this._buffersUsage);
                vafWriters = this._vaf.writers;

                // Rewrite entire buffer if billboards were added or removed.
                for (var i = 0; i < length; ++i) {
                    var billboard = this._billboards[i];
                    billboard._dirty = false; // In case it needed an update.
                    writeBillboard(this, context, textureAtlasCoordinates, vafWriters, billboard);
                }

                // Different billboard collections share the same index buffer.
                this._vaf.commit(getIndexBuffer(context));
            }

            this._billboardsToUpdate = [];
        } else {
            // Billboards were modified, but none were added or removed.

            var billboardsToUpdate = this._billboardsToUpdate;
            var updateLength = billboardsToUpdate.length;

            if (updateLength) {
                var writers = [];

                if (properties[POSITION_INDEX]) {
                    writers.push(writePosition);
                }

                if (properties[PIXEL_OFFSET_INDEX]) {
                    writers.push(writePixelOffset);
                }

                if (properties[EYE_OFFSET_INDEX] || properties[SCALE_INDEX]) {
                    writers.push(writeEyeOffsetAndScale);
                }

                if (properties[IMAGE_INDEX_INDEX]) {
                    writers.push(writeTextureCoordinatesAndImageSize);
                }

                if (properties[COLOR_INDEX]) {
                    writers.push(writeColor);
                }

                if (properties[HORIZONTAL_ORIGIN_INDEX] || properties[VERTICAL_ORIGIN_INDEX] || properties[SHOW_INDEX]) {
                    writers.push(writeOriginAndShow);
                }

                vafWriters = this._vaf.writers;

                if ((updateLength / length) > 0.1) {
                    // If more than 10% of billboard change, rewrite the entire buffer.

                    // PERFORMANCE_IDEA:  I totally made up 10% :).

                    for (var m = 0; m < updateLength; ++m) {
                        var b = billboardsToUpdate[m];
                        b._dirty = false;

                        for ( var n = 0; n < writers.length; ++n) {
                            writers[n](this, context, textureAtlasCoordinates, vafWriters, b);
                        }
                    }
                    this._vaf.commit(getIndexBuffer(context));
                } else {
                    for (var h = 0; h < updateLength; ++h) {
                        var bb = billboardsToUpdate[h];
                        bb._dirty = false;

                        for ( var o = 0; o < writers.length; ++o) {
                            writers[o](this, context, textureAtlasCoordinates, vafWriters, bb);
                        }
                        this._vaf.subCommit(bb._index * 4, 4);
                    }
                    this._vaf.endSubCommits();
                }

                this._billboardsToUpdate = [];
            }
        }

        for (var k = 0; k < NUMBER_OF_PROPERTIES; ++k) {
            properties[k] = 0;
        }

        if (typeof this._vaf === 'undefined' || typeof this._vaf.va === 'undefined') {
            return;
        }

        var boundingVolume;
        var modelMatrix = Matrix4.IDENTITY;
        if (frameState.mode === SceneMode.SCENE3D) {
            modelMatrix = this.modelMatrix;
            boundingVolume = BoundingSphere.clone(this._baseVolume, this._boundingVolume);
        } else if (typeof this._baseVolume2D !== 'undefined') {
            boundingVolume = BoundingSphere.clone(this._baseVolume2D, this._boundingVolume);
        }
        updateBoundingVolume(this, context, frameState, boundingVolume);

        var pass = frameState.passes;
        var va = this._vaf.va;
        var vaLength = va.length;
        var commands;
        var command;
        var j;
        this._commandLists.removeAll();
        if (pass.color) {
            if (typeof this._sp === 'undefined') {
                this._rs = context.createRenderState({
                    depthTest : {
                        enabled : true
                    },
                    blending : BlendingState.ALPHA_BLEND
                });

                this._sp = context.getShaderCache().getShaderProgram(BillboardCollectionVS, BillboardCollectionFS, attributeIndices);
            }

            commands = this._commandLists.colorList;
            commands.length = vaLength;
            for (j = 0; j < vaLength; ++j) {
                command = commands[j];
                if (typeof command === 'undefined') {
                    command = commands[j] = new DrawCommand();
                }

                command.boundingVolume = boundingVolume;
                command.modelMatrix = modelMatrix;
                command.primitiveType = PrimitiveType.TRIANGLES;
                command.count = va[j].indicesCount;
                command.shaderProgram = this._sp;
                command.uniformMap = this._uniforms;
                command.vertexArray = va[j].va;
                command.renderState = this._rs;
            }
        }
        if (pass.pick) {
            if (typeof this._spPick === 'undefined') {
                this._rsPick = context.createRenderState({
                    depthTest : {
                        enabled : true
                    }
                });

                this._spPick = context.getShaderCache().getShaderProgram(
                        BillboardCollectionVS,
                        '#define RENDER_FOR_PICK 1\n' + BillboardCollectionFS,
                        attributeIndices);
            }

            commands = this._commandLists.pickList;
            commands.length = vaLength;
            for (j = 0; j < vaLength; ++j) {
                command = commands[j];
                if (typeof command === 'undefined') {
                    command = commands[j] = new DrawCommand();
                }

                command.boundingVolume = boundingVolume;
                command.modelMatrix = modelMatrix;
                command.primitiveType = PrimitiveType.TRIANGLES;
                command.count = va[j].indicesCount;
                command.shaderProgram = this._spPick;
                command.uniformMap = this._uniforms;
                command.vertexArray = va[j].va;
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
        for (var i = 0; i < length; ++i) {
            if (billboards[i]) {
                billboards[i]._destroy();
            }
        }
    };

    return BillboardCollection;
});
