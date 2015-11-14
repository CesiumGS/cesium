/*global define*/
define([
        '../Core/AttributeCompression',
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
        '../Core/IndexDatatype',
        '../Core/Math',
        '../Core/Matrix4',
        '../Renderer/Buffer',
        '../Renderer/BufferUsage',
        '../Renderer/DrawCommand',
        '../Renderer/RenderState',
        '../Renderer/ShaderProgram',
        '../Renderer/ShaderSource',
        '../Renderer/VertexArrayFacade',
        '../Shaders/BillboardCollectionFS',
        '../Shaders/BillboardCollectionVS',
        './Billboard',
        './BlendingState',
        './HorizontalOrigin',
        './Pass',
        './SceneMode',
        './TextureAtlas'
    ], function(
        AttributeCompression,
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
        IndexDatatype,
        CesiumMath,
        Matrix4,
        Buffer,
        BufferUsage,
        DrawCommand,
        RenderState,
        ShaderProgram,
        ShaderSource,
        VertexArrayFacade,
        BillboardCollectionFS,
        BillboardCollectionVS,
        Billboard,
        BlendingState,
        HorizontalOrigin,
        Pass,
        SceneMode,
        TextureAtlas) {
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
    var ROTATION_INDEX = Billboard.ROTATION_INDEX;
    var ALIGNED_AXIS_INDEX = Billboard.ALIGNED_AXIS_INDEX;
    var SCALE_BY_DISTANCE_INDEX = Billboard.SCALE_BY_DISTANCE_INDEX;
    var TRANSLUCENCY_BY_DISTANCE_INDEX = Billboard.TRANSLUCENCY_BY_DISTANCE_INDEX;
    var PIXEL_OFFSET_SCALE_BY_DISTANCE_INDEX = Billboard.PIXEL_OFFSET_SCALE_BY_DISTANCE_INDEX;
    var NUMBER_OF_PROPERTIES = Billboard.NUMBER_OF_PROPERTIES;

    var attributeLocations;

    var attributeLocationsBatched = {
        positionHighAndScale : 0,
        positionLowAndRotation : 1,
        compressedAttribute0 : 2,        // pixel offset, translate, horizontal origin, vertical origin, show, direction, texture coordinates
        compressedAttribute1 : 3,        // aligned axis, translucency by distance, image width
        compressedAttribute2 : 4,        // image height, color, pick color, 15 bits free
        eyeOffset : 5,                   // 4 bytes free
        scaleByDistance : 6,
        pixelOffsetScaleByDistance : 7
    };

    var attributeLocationsInstanced = {
        direction : 0,
        positionHighAndScale : 1,
        positionLowAndRotation : 2,     // texture offset in w
        compressedAttribute0 : 3,
        compressedAttribute1 : 4,
        compressedAttribute2 : 5,
        eyeOffset : 6,                  // texture range in w
        scaleByDistance : 7,
        pixelOffsetScaleByDistance : 8
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
     * and {@link BillboardCollection#remove}.  Billboards in a collection automatically share textures
     * for images with the same identifier.
     *
     * @alias BillboardCollection
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms each billboard from model to world coordinates.
     * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Determines if this primitive's commands' bounding spheres are shown.
     * @param {Scene} [options.scene] Must be passed in for billboards that use the height reference property or will be depth tested against the globe.
     *
     * @performance For best performance, prefer a few collections, each with many billboards, to
     * many collections with only a few billboards each.  Organize collections so that billboards
     * with the same update frequency are in the same collection, i.e., billboards that do not
     * change should be in one collection; billboards that change every frame should be in another
     * collection; and so on.
     *
     * @see BillboardCollection#add
     * @see BillboardCollection#remove
     * @see Billboard
     * @see LabelCollection
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Billboards.html|Cesium Sandcastle Billboard Demo}
     *
     * @example
     * // Create a billboard collection with two billboards
     * var billboards = scene.primitives.add(new Cesium.BillboardCollection());
     * billboards.add({
     *   position : new Cesium.Cartesian3(1.0, 2.0, 3.0),
     *   image : 'url/to/image'
     * });
     * billboards.add({
     *   position : new Cesium.Cartesian3(4.0, 5.0, 6.0),
     *   image : 'url/to/another/image'
     * });
     */
    var BillboardCollection = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._scene = options.scene;

        this._textureAtlas = undefined;
        this._textureAtlasGUID = undefined;
        this._destroyTextureAtlas = true;
        this._sp = undefined;
        this._rs = undefined;
        this._vaf = undefined;
        this._spPick = undefined;

        this._billboards = [];
        this._billboardsToUpdate = [];
        this._billboardsToUpdateIndex = 0;
        this._billboardsRemoved = false;
        this._createVertexArray = false;

        this._shaderRotation = false;
        this._compiledShaderRotation = false;
        this._compiledShaderRotationPick = false;

        this._shaderAlignedAxis = false;
        this._compiledShaderAlignedAxis = false;
        this._compiledShaderAlignedAxisPick = false;

        this._shaderScaleByDistance = false;
        this._compiledShaderScaleByDistance = false;
        this._compiledShaderScaleByDistancePick = false;

        this._shaderTranslucencyByDistance = false;
        this._compiledShaderTranslucencyByDistance = false;
        this._compiledShaderTranslucencyByDistancePick = false;

        this._shaderPixelOffsetScaleByDistance = false;
        this._compiledShaderPixelOffsetScaleByDistance = false;
        this._compiledShaderPixelOffsetScaleByDistancePick = false;

        this._propertiesChanged = new Uint32Array(NUMBER_OF_PROPERTIES);

        this._maxSize = 0.0;
        this._maxEyeOffset = 0.0;
        this._maxScale = 1.0;
        this._maxPixelOffset = 0.0;
        this._allHorizontalCenter = true;
        this._allVerticalCenter = true;
        this._allSizedInMeters = true;

        this._baseVolume = new BoundingSphere();
        this._baseVolumeWC = new BoundingSphere();
        this._baseVolume2D = new BoundingSphere();
        this._boundingVolume = new BoundingSphere();
        this._boundingVolumeDirty = false;

        this._colorCommands = [];
        this._pickCommands = [];

        /**
         * The 4x4 transformation matrix that transforms each billboard in this collection from model to world coordinates.
         * When this is the identity matrix, the billboards are drawn in world coordinates, i.e., Earth's WGS84 coordinates.
         * Local reference frames can be used by providing a different transformation matrix, like that returned
         * by {@link Transforms.eastNorthUpToFixedFrame}.
         *
         * @type {Matrix4}
         * @default {@link Matrix4.IDENTITY}
         *
         * @see Transforms.eastNorthUpToFixedFrame
         *
         * @example
         * var center = Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883);
         * billboards.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(center);
         * billboards.add({
         *   image : 'url/to/image',
         *   position : new Cesium.Cartesian3(0.0, 0.0, 0.0) // center
         * });
         * billboards.add({
         *   image : 'url/to/image',
         *   position : new Cesium.Cartesian3(1000000.0, 0.0, 0.0) // east
         * });
         * billboards.add({
         *   image : 'url/to/image',
         *   position : new Cesium.Cartesian3(0.0, 1000000.0, 0.0) // north
         * });
         * billboards.add({
         *   image : 'url/to/image',
         *   position : new Cesium.Cartesian3(0.0, 0.0, 1000000.0) // up
         * });
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
                              BufferUsage.STATIC_DRAW, // COLOR_INDEX
                              BufferUsage.STATIC_DRAW, // ROTATION_INDEX
                              BufferUsage.STATIC_DRAW, // ALIGNED_AXIS_INDEX
                              BufferUsage.STATIC_DRAW, // SCALE_BY_DISTANCE_INDEX
                              BufferUsage.STATIC_DRAW, // TRANSLUCENCY_BY_DISTANCE_INDEX
                              BufferUsage.STATIC_DRAW  // PIXEL_OFFSET_SCALE_BY_DISTANCE_INDEX
                          ];

        var that = this;
        this._uniforms = {
            u_atlas : function() {
                return that._textureAtlas.texture;
            }
        };
    };

    defineProperties(BillboardCollection.prototype, {
        /**
         * Returns the number of billboards in this collection.  This is commonly used with
         * {@link BillboardCollection#get} to iterate over all the billboards
         * in the collection.
         * @memberof BillboardCollection.prototype
         * @type {Number}
         */
        length : {
            get : function() {
                removeBillboards(this);
                return this._billboards.length;
            }
        },

        /**
         * Gets or sets the textureAtlas.
         * @memberof BillboardCollection.prototype
         * @type {TextureAtlas}
         * @private
         */
        textureAtlas : {
            get : function() {
                return this._textureAtlas;
            },
            set : function(value) {
                if (this._textureAtlas !== value) {
                    this._textureAtlas = this._destroyTextureAtlas && this._textureAtlas && this._textureAtlas.destroy();
                    this._textureAtlas = value;
                    this._createVertexArray = true; // New per-billboard texture coordinates
                }
            }
        },

        /**
         * Gets or sets a value which determines if the texture atlas is
         * destroyed when the collection is destroyed.
         *
         * If the texture atlas is used by more than one collection, set this to <code>false</code>,
         * and explicitly destroy the atlas to avoid attempting to destroy it multiple times.
         *
         * @memberof BillboardCollection.prototype
         * @type {Boolean}
         * @private
         *
         * @example
         * // Set destroyTextureAtlas
         * // Destroy a billboard collection but not its texture atlas.
         *
         * var atlas = new TextureAtlas({
         *   scene : scene,
         *   images : images
         * });
         * billboards.textureAtlas = atlas;
         * billboards.destroyTextureAtlas = false;
         * billboards = billboards.destroy();
         * console.log(atlas.isDestroyed()); // False
         */
        destroyTextureAtlas : {
            get : function() {
                return this._destroyTextureAtlas;
            },
            set : function(value) {
                this._destroyTextureAtlas = value;
            }
        }
    });

    function destroyBillboards(billboards) {
        var length = billboards.length;
        for (var i = 0; i < length; ++i) {
            if (billboards[i]) {
                billboards[i]._destroy();
            }
        }
    }

    /**
     * Creates and adds a billboard with the specified initial properties to the collection.
     * The added billboard is returned so it can be modified or removed from the collection later.
     *
     * @param {Object}[billboard] A template describing the billboard's properties as shown in Example 1.
     * @returns {Billboard} The billboard that was added to the collection.
     *
     * @performance Calling <code>add</code> is expected constant time.  However, the collection's vertex buffer
     * is rewritten - an <code>O(n)</code> operation that also incurs CPU to GPU overhead.  For
     * best performance, add as many billboards as possible before calling <code>update</code>.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see BillboardCollection#remove
     * @see BillboardCollection#removeAll
     *
     * @example
     * // Example 1:  Add a billboard, specifying all the default values.
     * var b = billboards.add({
     *   show : true,
     *   position : Cesium.Cartesian3.ZERO,
     *   pixelOffset : Cesium.Cartesian2.ZERO,
     *   eyeOffset : Cesium.Cartesian3.ZERO,
     *   horizontalOrigin : Cesium.HorizontalOrigin.CENTER,
     *   verticalOrigin : Cesium.VerticalOrigin.CENTER,
     *   scale : 1.0,
     *   image : 'url/to/image',
     *   color : Cesium.Color.WHITE,
     *   id : undefined
     * });
     *
     * @example
     * // Example 2:  Specify only the billboard's cartographic position.
     * var b = billboards.add({
     *   position : Cesium.Cartesian3.fromDegrees(longitude, latitude, height)
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
     * @param {Billboard} billboard The billboard to remove.
     * @returns {Boolean} <code>true</code> if the billboard was removed; <code>false</code> if the billboard was not found in the collection.
     *
     * @performance Calling <code>remove</code> is expected constant time.  However, the collection's vertex buffer
     * is rewritten - an <code>O(n)</code> operation that also incurs CPU to GPU overhead.  For
     * best performance, remove as many billboards as possible before calling <code>update</code>.
     * If you intend to temporarily hide a billboard, it is usually more efficient to call
     * {@link Billboard#show} instead of removing and re-adding the billboard.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see BillboardCollection#add
     * @see BillboardCollection#removeAll
     * @see Billboard#show
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
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see BillboardCollection#add
     * @see BillboardCollection#remove
     *
     * @example
     * billboards.add(...);
     * billboards.add(...);
     * billboards.removeAll();
     */
    BillboardCollection.prototype.removeAll = function() {
        destroyBillboards(this._billboards);
        this._billboards = [];
        this._billboardsToUpdate = [];
        this._billboardsToUpdateIndex = 0;
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
            this._billboardsToUpdate[this._billboardsToUpdateIndex++] = billboard;
        }

        ++this._propertiesChanged[propertyChanged];
    };

    /**
     * Check whether this collection contains a given billboard.
     *
     * @param {Billboard} [billboard] The billboard to check for.
     * @returns {Boolean} true if this collection contains the billboard, false otherwise.
     *
     * @see BillboardCollection#get
     */
    BillboardCollection.prototype.contains = function(billboard) {
        return defined(billboard) && billboard._billboardCollection === this;
    };

    /**
     * Returns the billboard in the collection at the specified index.  Indices are zero-based
     * and increase as billboards are added.  Removing a billboard shifts all billboards after
     * it to the left, changing their indices.  This function is commonly used with
     * {@link BillboardCollection#length} to iterate over all the billboards
     * in the collection.
     *
     * @param {Number} index The zero-based index of the billboard.
     * @returns {Billboard} The billboard at the specified index.
     *
     * @performance Expected constant time.  If billboards were removed from the collection and
     * {@link BillboardCollection#update} was not called, an implicit <code>O(n)</code>
     * operation is performed.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see BillboardCollection#length
     *
     * @example
     * // Toggle the show property of every billboard in the collection
     * var len = billboards.length;
     * for (var i = 0; i < len; ++i) {
     *   var b = billboards.get(i);
     *   b.show = !b.show;
     * }
     */
    BillboardCollection.prototype.get = function(index) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(index)) {
            throw new DeveloperError('index is required.');
        }
        //>>includeEnd('debug');

        removeBillboards(this);
        return this._billboards[index];
    };

    var getIndexBuffer;

    function getIndexBufferBatched(context) {
        var sixteenK = 16 * 1024;

        var indexBuffer = context.cache.billboardCollection_indexBufferBatched;
        if (defined(indexBuffer)) {
            return indexBuffer;
        }

        // Subtract 6 because the last index is reserverd for primitive restart.
        // https://www.khronos.org/registry/webgl/specs/latest/2.0/#5.18
        var length = sixteenK * 6 - 6;
        var indices = new Uint16Array(length);
        for (var i = 0, j = 0; i < length; i += 6, j += 4) {
            indices[i] = j;
            indices[i + 1] = j + 1;
            indices[i + 2] = j + 2;

            indices[i + 3] = j + 0;
            indices[i + 4] = j + 2;
            indices[i + 5] = j + 3;
        }

        // PERFORMANCE_IDEA:  Should we reference count billboard collections, and eventually delete this?
        // Is this too much memory to allocate up front?  Should we dynamically grow it?
        indexBuffer = Buffer.createIndexBuffer({
            context : context,
            typedArray : indices,
            usage : BufferUsage.STATIC_DRAW,
            indexDatatype : IndexDatatype.UNSIGNED_SHORT
        });
        indexBuffer.vertexArrayDestroyable = false;
        context.cache.billboardCollection_indexBufferBatched = indexBuffer;
        return indexBuffer;
    }

    function getIndexBufferInstanced(context) {
        var indexBuffer = context.cache.billboardCollection_indexBufferInstanced;
        if (defined(indexBuffer)) {
            return indexBuffer;
        }

        indexBuffer = Buffer.createIndexBuffer({
            context : context,
            typedArray : new Uint16Array([0, 1, 2, 0, 2, 3]),
            usage : BufferUsage.STATIC_DRAW,
            indexDatatype : IndexDatatype.UNSIGNED_SHORT
        });

        indexBuffer.vertexArrayDestroyable = false;
        context.cache.billboardCollection_indexBufferInstanced = indexBuffer;
        return indexBuffer;
    }

    function getVertexBufferInstanced(context) {
        var vertexBuffer = context.cache.billboardCollection_vertexBufferInstanced;
        if (defined(vertexBuffer)) {
            return vertexBuffer;
        }

        vertexBuffer = Buffer.createVertexBuffer({
            context : context,
            typedArray : new Float32Array([0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0]),
            usage : BufferUsage.STATIC_DRAW
        });

        vertexBuffer.vertexArrayDestroyable = false;
        context.cache.billboardCollection_vertexBufferInstanced = vertexBuffer;
        return vertexBuffer;
    }

    BillboardCollection.prototype.computeNewBuffersUsage = function() {
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

    function createVAF(context, numberOfBillboards, buffersUsage, instanced) {
        var attributes = [{
            index : attributeLocations.positionHighAndScale,
            componentsPerAttribute : 4,
            componentDatatype : ComponentDatatype.FLOAT,
            usage : buffersUsage[POSITION_INDEX]
        }, {
            index : attributeLocations.positionLowAndRotation,
            componentsPerAttribute : 4,
            componentDatatype : ComponentDatatype.FLOAT,
            usage : buffersUsage[POSITION_INDEX]
        }, {
            index : attributeLocations.compressedAttribute0,
            componentsPerAttribute : 4,
            componentDatatype : ComponentDatatype.FLOAT,
            usage : buffersUsage[PIXEL_OFFSET_INDEX]
        }, {
            index : attributeLocations.compressedAttribute1,
            componentsPerAttribute : 4,
            componentDatatype : ComponentDatatype.FLOAT,
            usage : buffersUsage[TRANSLUCENCY_BY_DISTANCE_INDEX]
        }, {
            index : attributeLocations.compressedAttribute2,
            componentsPerAttribute : 4,
            componentDatatype : ComponentDatatype.FLOAT,
            usage : buffersUsage[COLOR_INDEX]
        }, {
            index : attributeLocations.eyeOffset,
            componentsPerAttribute : 4,
            componentDatatype : ComponentDatatype.FLOAT,
            usage : buffersUsage[EYE_OFFSET_INDEX]
        }, {
            index : attributeLocations.scaleByDistance,
            componentsPerAttribute : 4,
            componentDatatype : ComponentDatatype.FLOAT,
            usage : buffersUsage[SCALE_BY_DISTANCE_INDEX]
        }, {
            index : attributeLocations.pixelOffsetScaleByDistance,
            componentsPerAttribute : 4,
            componentDatatype : ComponentDatatype.FLOAT,
            usage : buffersUsage[PIXEL_OFFSET_SCALE_BY_DISTANCE_INDEX]
        }];

        // Instancing requires one non-instanced attribute.
        if (instanced) {
            attributes.push({
                index : attributeLocations.direction,
                componentsPerAttribute : 2,
                componentDatatype : ComponentDatatype.FLOAT,
                vertexBuffer : getVertexBufferInstanced(context)
            });
        }

        // When instancing is enabled, only one vertex is needed for each billboard.
        var sizeInVertices = instanced ? numberOfBillboards : 4 * numberOfBillboards;
        return new VertexArrayFacade(context, attributes, sizeInVertices, instanced);
    }

    ///////////////////////////////////////////////////////////////////////////

    // Four vertices per billboard.  Each has the same position, etc., but a different screen-space direction vector.

    // PERFORMANCE_IDEA:  Save memory if a property is the same for all billboards, use a latched attribute state,
    // instead of storing it in a vertex buffer.

    var writePositionScratch = new EncodedCartesian3();

    function writePositionScaleAndRotation(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard) {
        var i;
        var positionHighWriter = vafWriters[attributeLocations.positionHighAndScale];
        var positionLowWriter = vafWriters[attributeLocations.positionLowAndRotation];
        var position = billboard._getActualPosition();

        if (billboardCollection._mode === SceneMode.SCENE3D) {
            BoundingSphere.expand(billboardCollection._baseVolume, position, billboardCollection._baseVolume);
            billboardCollection._boundingVolumeDirty = true;
        }

        EncodedCartesian3.fromCartesian(position, writePositionScratch);
        var scale = billboard.scale;
        var rotation = billboard.rotation;

        if (rotation !== 0.0) {
            billboardCollection._shaderRotation = true;
        }

        billboardCollection._maxScale = Math.max(billboardCollection._maxScale, scale);

        var high = writePositionScratch.high;
        var low = writePositionScratch.low;

        if (billboardCollection._instanced) {
            i = billboard._index;
            positionHighWriter(i, high.x, high.y, high.z, scale);
            positionLowWriter(i, low.x, low.y, low.z, rotation);
        } else {
            i = billboard._index * 4;
            positionHighWriter(i + 0, high.x, high.y, high.z, scale);
            positionHighWriter(i + 1, high.x, high.y, high.z, scale);
            positionHighWriter(i + 2, high.x, high.y, high.z, scale);
            positionHighWriter(i + 3, high.x, high.y, high.z, scale);

            positionLowWriter(i + 0, low.x, low.y, low.z, rotation);
            positionLowWriter(i + 1, low.x, low.y, low.z, rotation);
            positionLowWriter(i + 2, low.x, low.y, low.z, rotation);
            positionLowWriter(i + 3, low.x, low.y, low.z, rotation);
        }
    }

    var scratchCartesian2 = new Cartesian2();

    var UPPER_BOUND = 32768.0;  // 2^15

    var LEFT_SHIFT16 = 65536.0; // 2^16
    var LEFT_SHIFT8 = 256.0;    // 2^8
    var LEFT_SHIFT7 = 128.0;
    var LEFT_SHIFT5 = 32.0;
    var LEFT_SHIFT3 = 8.0;
    var LEFT_SHIFT2 = 4.0;

    var RIGHT_SHIFT8 = 1.0 / 256.0;

    var LOWER_LEFT = 0.0;
    var LOWER_RIGHT = 2.0;
    var UPPER_RIGHT = 3.0;
    var UPPER_LEFT = 1.0;

    function writeCompressedAttrib0(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard) {
        var i;
        var writer = vafWriters[attributeLocations.compressedAttribute0];
        var pixelOffset = billboard.pixelOffset;
        var pixelOffsetX = pixelOffset.x;
        var pixelOffsetY = pixelOffset.y;

        var translate = billboard._translate;
        var translateX = translate.x;
        var translateY = translate.y;

        billboardCollection._maxPixelOffset = Math.max(billboardCollection._maxPixelOffset, Math.abs(pixelOffsetX + translateX), Math.abs(-pixelOffsetY + translateY));

        var horizontalOrigin = billboard.horizontalOrigin;
        var verticalOrigin = billboard.verticalOrigin;
        var show = billboard.show;

        // If the color alpha is zero, do not show this billboard.  This lets us avoid providing
        // color during the pick pass and also eliminates a discard in the fragment shader.
        if (billboard.color.alpha === 0.0) {
            show = false;
        }

        billboardCollection._allHorizontalCenter = billboardCollection._allHorizontalCenter && horizontalOrigin === HorizontalOrigin.CENTER;
        billboardCollection._allVerticalCenter = billboardCollection._allVerticalCenter && verticalOrigin === HorizontalOrigin.CENTER;

        var bottomLeftX = 0;
        var bottomLeftY = 0;
        var width = 0;
        var height = 0;
        var index = billboard._imageIndex;
        if (index !== -1) {
            var imageRectangle = textureAtlasCoordinates[index];

            //>>includeStart('debug', pragmas.debug);
            if (!defined(imageRectangle)) {
                throw new DeveloperError('Invalid billboard image index: ' + index);
            }
            //>>includeEnd('debug');

            bottomLeftX = imageRectangle.x;
            bottomLeftY = imageRectangle.y;
            width = imageRectangle.width;
            height = imageRectangle.height;
        }
        var topRightX = bottomLeftX + width;
        var topRightY = bottomLeftY + height;

        var compressed0 = Math.floor(CesiumMath.clamp(pixelOffsetX, -UPPER_BOUND, UPPER_BOUND) + UPPER_BOUND) * LEFT_SHIFT7;
        compressed0 += (horizontalOrigin + 1.0) * LEFT_SHIFT5;
        compressed0 += (verticalOrigin + 1.0) * LEFT_SHIFT3;
        compressed0 += (show ? 1.0 : 0.0) * LEFT_SHIFT2;

        var compressed1 = Math.floor(CesiumMath.clamp(pixelOffsetY, -UPPER_BOUND, UPPER_BOUND) + UPPER_BOUND) * LEFT_SHIFT8;
        var compressed2 = Math.floor(CesiumMath.clamp(translateX, -UPPER_BOUND, UPPER_BOUND) + UPPER_BOUND) * LEFT_SHIFT8;

        var tempTanslateY = (CesiumMath.clamp(translateY, -UPPER_BOUND, UPPER_BOUND) + UPPER_BOUND) * RIGHT_SHIFT8;
        var upperTranslateY = Math.floor(tempTanslateY);
        var lowerTranslateY = Math.floor((tempTanslateY - upperTranslateY) * LEFT_SHIFT8);

        compressed1 += upperTranslateY;
        compressed2 += lowerTranslateY;

        scratchCartesian2.x = bottomLeftX;
        scratchCartesian2.y = bottomLeftY;
        var compressedTexCoordsLL = AttributeCompression.compressTextureCoordinates(scratchCartesian2);
        scratchCartesian2.x = topRightX;
        var compressedTexCoordsLR = AttributeCompression.compressTextureCoordinates(scratchCartesian2);
        scratchCartesian2.y = topRightY;
        var compressedTexCoordsUR = AttributeCompression.compressTextureCoordinates(scratchCartesian2);
        scratchCartesian2.x = bottomLeftX;
        var compressedTexCoordsUL = AttributeCompression.compressTextureCoordinates(scratchCartesian2);

        if (billboardCollection._instanced) {
            i = billboard._index;
            writer(i, compressed0, compressed1, compressed2, compressedTexCoordsLL);
        } else {
            i = billboard._index * 4;
            writer(i + 0, compressed0 + LOWER_LEFT, compressed1, compressed2, compressedTexCoordsLL);
            writer(i + 1, compressed0 + LOWER_RIGHT, compressed1, compressed2, compressedTexCoordsLR);
            writer(i + 2, compressed0 + UPPER_RIGHT, compressed1, compressed2, compressedTexCoordsUR);
            writer(i + 3, compressed0 + UPPER_LEFT, compressed1, compressed2, compressedTexCoordsUL);
        }
    }

    function writeCompressedAttrib1(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard) {
        var i;
        var writer = vafWriters[attributeLocations.compressedAttribute1];
        var alignedAxis = billboard.alignedAxis;
        if (!Cartesian3.equals(alignedAxis, Cartesian3.ZERO)) {
            billboardCollection._shaderAlignedAxis = true;
        }

        var near = 0.0;
        var nearValue = 1.0;
        var far = 1.0;
        var farValue = 1.0;

        var translucency = billboard.translucencyByDistance;
        if (defined(translucency)) {
            near = translucency.near;
            nearValue = translucency.nearValue;
            far = translucency.far;
            farValue = translucency.farValue;

            if (nearValue !== 1.0 || farValue !== 1.0) {
                // translucency by distance calculation in shader need not be enabled
                // until a billboard with near and far !== 1.0 is found
                billboardCollection._shaderTranslucencyByDistance = true;
            }
        }

        var width = 0;
        var index = billboard._imageIndex;
        if (index !== -1) {
            var imageRectangle = textureAtlasCoordinates[index];

            //>>includeStart('debug', pragmas.debug);
            if (!defined(imageRectangle)) {
                throw new DeveloperError('Invalid billboard image index: ' + index);
            }
            //>>includeEnd('debug');

            width = imageRectangle.width;
        }

        var textureWidth = billboardCollection._textureAtlas.texture.width;
        var imageWidth = Math.ceil(defaultValue(billboard.width, textureWidth * width) * 0.5);
        billboardCollection._maxSize = Math.max(billboardCollection._maxSize, imageWidth);

        var compressed0 = CesiumMath.clamp(imageWidth, 0.0, LEFT_SHIFT16);
        var compressed1 = 0.0;

        if (Math.abs(Cartesian3.magnitudeSquared(alignedAxis) - 1.0) < CesiumMath.EPSILON6) {
            compressed1 = AttributeCompression.octEncodeFloat(alignedAxis);
        }

        nearValue = CesiumMath.clamp(nearValue, 0.0, 1.0);
        nearValue = nearValue === 1.0 ? 255.0 : (nearValue * 255.0) | 0;
        compressed0 = compressed0 * LEFT_SHIFT8 + nearValue;

        farValue = CesiumMath.clamp(farValue, 0.0, 1.0);
        farValue = farValue === 1.0 ? 255.0 : (farValue * 255.0) | 0;
        compressed1 = compressed1 * LEFT_SHIFT8 + farValue;

        if (billboardCollection._instanced) {
            i = billboard._index;
            writer(i, compressed0, compressed1, near, far);
        } else {
            i = billboard._index * 4;
            writer(i + 0, compressed0, compressed1, near, far);
            writer(i + 1, compressed0, compressed1, near, far);
            writer(i + 2, compressed0, compressed1, near, far);
            writer(i + 3, compressed0, compressed1, near, far);
        }
    }

    function writeCompressedAttrib2(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard) {
        var i;
        var writer = vafWriters[attributeLocations.compressedAttribute2];
        var color = billboard.color;
        var pickColor = billboard.getPickId(context).color;
        var sizeInMeters = billboard.sizeInMeters ? 1.0 : 0.0;

        billboardCollection._allSizedInMeters = billboardCollection._allSizedInMeters && sizeInMeters === 1.0;

        var height = 0;
        var index = billboard._imageIndex;
        if (index !== -1) {
            var imageRectangle = textureAtlasCoordinates[index];

            //>>includeStart('debug', pragmas.debug);
            if (!defined(imageRectangle)) {
                throw new DeveloperError('Invalid billboard image index: ' + index);
            }
            //>>includeEnd('debug');

            height = imageRectangle.height;
        }

        var dimensions = billboardCollection._textureAtlas.texture.dimensions;
        var imageHeight = Math.ceil(defaultValue(billboard.height, dimensions.y * height) * 0.5);
        billboardCollection._maxSize = Math.max(billboardCollection._maxSize, imageHeight);

        var red = Color.floatToByte(color.red);
        var green = Color.floatToByte(color.green);
        var blue = Color.floatToByte(color.blue);
        var compressed0 = red * LEFT_SHIFT16 + green * LEFT_SHIFT8 + blue;

        red = Color.floatToByte(pickColor.red);
        green = Color.floatToByte(pickColor.green);
        blue = Color.floatToByte(pickColor.blue);
        var compressed1 = red * LEFT_SHIFT16 + green * LEFT_SHIFT8 + blue;

        var compressed2 = Color.floatToByte(color.alpha) * LEFT_SHIFT16 + Color.floatToByte(pickColor.alpha) * LEFT_SHIFT8 + sizeInMeters;

        if (billboardCollection._instanced) {
            i = billboard._index;
            writer(i, compressed0, compressed1, compressed2, imageHeight);
        } else {
            i = billboard._index * 4;
            writer(i + 0, compressed0, compressed1, compressed2, imageHeight);
            writer(i + 1, compressed0, compressed1, compressed2, imageHeight);
            writer(i + 2, compressed0, compressed1, compressed2, imageHeight);
            writer(i + 3, compressed0, compressed1, compressed2, imageHeight);
        }
    }

    function writeEyeOffset(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard) {
        var i;
        var writer = vafWriters[attributeLocations.eyeOffset];
        var eyeOffset = billboard.eyeOffset;
        billboardCollection._maxEyeOffset = Math.max(billboardCollection._maxEyeOffset, Math.abs(eyeOffset.x), Math.abs(eyeOffset.y), Math.abs(eyeOffset.z));

        if (billboardCollection._instanced) {
            var width = 0;
            var height = 0;
            var index = billboard._imageIndex;
            if (index !== -1) {
                var imageRectangle = textureAtlasCoordinates[index];

                //>>includeStart('debug', pragmas.debug);
                if (!defined(imageRectangle)) {
                    throw new DeveloperError('Invalid billboard image index: ' + index);
                }
                //>>includeEnd('debug');

                width = imageRectangle.width;
                height = imageRectangle.height;
            }

            scratchCartesian2.x = width;
            scratchCartesian2.y = height;
            var compressedTexCoordsRange = AttributeCompression.compressTextureCoordinates(scratchCartesian2);

            i = billboard._index;
            writer(i, eyeOffset.x, eyeOffset.y, eyeOffset.z, compressedTexCoordsRange);
        } else {
            i = billboard._index * 4;
            writer(i + 0, eyeOffset.x, eyeOffset.y, eyeOffset.z, 0.0);
            writer(i + 1, eyeOffset.x, eyeOffset.y, eyeOffset.z, 0.0);
            writer(i + 2, eyeOffset.x, eyeOffset.y, eyeOffset.z, 0.0);
            writer(i + 3, eyeOffset.x, eyeOffset.y, eyeOffset.z, 0.0);
        }
    }

    function writeScaleByDistance(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard) {
        var i;
        var writer = vafWriters[attributeLocations.scaleByDistance];
        var near = 0.0;
        var nearValue = 1.0;
        var far = 1.0;
        var farValue = 1.0;

        var scale = billboard.scaleByDistance;
        if (defined(scale)) {
            near = scale.near;
            nearValue = scale.nearValue;
            far = scale.far;
            farValue = scale.farValue;

            if (nearValue !== 1.0 || farValue !== 1.0) {
                // scale by distance calculation in shader need not be enabled
                // until a billboard with near and far !== 1.0 is found
                billboardCollection._shaderScaleByDistance = true;
            }
        }

        if (billboardCollection._instanced) {
            i = billboard._index;
            writer(i, near, nearValue, far, farValue);
        } else {
            i = billboard._index * 4;
            writer(i + 0, near, nearValue, far, farValue);
            writer(i + 1, near, nearValue, far, farValue);
            writer(i + 2, near, nearValue, far, farValue);
            writer(i + 3, near, nearValue, far, farValue);
        }
    }

    function writePixelOffsetScaleByDistance(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard) {
        var i;
        var writer = vafWriters[attributeLocations.pixelOffsetScaleByDistance];
        var near = 0.0;
        var nearValue = 1.0;
        var far = 1.0;
        var farValue = 1.0;

        var pixelOffsetScale = billboard.pixelOffsetScaleByDistance;
        if (defined(pixelOffsetScale)) {
            near = pixelOffsetScale.near;
            nearValue = pixelOffsetScale.nearValue;
            far = pixelOffsetScale.far;
            farValue = pixelOffsetScale.farValue;

            if (nearValue !== 1.0 || farValue !== 1.0) {
                // pixelOffsetScale by distance calculation in shader need not be enabled
                // until a billboard with near and far !== 1.0 is found
                billboardCollection._shaderPixelOffsetScaleByDistance = true;
            }
        }

        if (billboardCollection._instanced) {
            i = billboard._index;
            writer(i, near, nearValue, far, farValue);
        } else {
            i = billboard._index * 4;
            writer(i + 0, near, nearValue, far, farValue);
            writer(i + 1, near, nearValue, far, farValue);
            writer(i + 2, near, nearValue, far, farValue);
            writer(i + 3, near, nearValue, far, farValue);
        }
    }

    function writeBillboard(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard) {
        writePositionScaleAndRotation(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard);
        writeCompressedAttrib0(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard);
        writeCompressedAttrib1(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard);
        writeCompressedAttrib2(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard);
        writeEyeOffset(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard);
        writeScaleByDistance(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard);
        writePixelOffsetScaleByDistance(billboardCollection, context, textureAtlasCoordinates, vafWriters, billboard);
    }

    function recomputeActualPositions(billboardCollection, billboards, length, frameState, modelMatrix, recomputeBoundingVolume) {
        var boundingVolume;
        if (frameState.mode === SceneMode.SCENE3D) {
            boundingVolume = billboardCollection._baseVolume;
            billboardCollection._boundingVolumeDirty = true;
        } else {
            boundingVolume = billboardCollection._baseVolume2D;
        }

        var positions = [];
        for ( var i = 0; i < length; ++i) {
            var billboard = billboards[i];
            var position = billboard.position;
            var actualPosition = Billboard._computeActualPosition(billboard, position, frameState, modelMatrix);
            if (defined(actualPosition)) {
                billboard._setActualPosition(actualPosition);

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

    function updateMode(billboardCollection, frameState) {
        var mode = frameState.mode;

        var billboards = billboardCollection._billboards;
        var billboardsToUpdate = billboardCollection._billboardsToUpdate;
        var modelMatrix = billboardCollection._modelMatrix;

        if (billboardCollection._createVertexArray ||
            billboardCollection._mode !== mode ||
            mode !== SceneMode.SCENE3D &&
            !Matrix4.equals(modelMatrix, billboardCollection.modelMatrix)) {

            billboardCollection._mode = mode;
            Matrix4.clone(billboardCollection.modelMatrix, modelMatrix);
            billboardCollection._createVertexArray = true;

            if (mode === SceneMode.SCENE3D || mode === SceneMode.SCENE2D || mode === SceneMode.COLUMBUS_VIEW) {
                recomputeActualPositions(billboardCollection, billboards, billboards.length, frameState, modelMatrix, true);
            }
        } else if (mode === SceneMode.MORPHING) {
            recomputeActualPositions(billboardCollection, billboards, billboards.length, frameState, modelMatrix, true);
        } else if (mode === SceneMode.SCENE2D || mode === SceneMode.COLUMBUS_VIEW) {
            recomputeActualPositions(billboardCollection, billboardsToUpdate, billboardCollection._billboardsToUpdateIndex, frameState, modelMatrix, false);
        }
    }

    function updateBoundingVolume(collection, frameState, boundingVolume) {
        var pixelScale = 1.0;
        if (!collection._allSizedInMeters || collection._maxPixelOffset !== 0.0) {
            pixelScale = frameState.camera.getPixelSize(boundingVolume, frameState.context.drawingBufferWidth, frameState.context.drawingBufferHeight);
        }

        var size = pixelScale * collection._maxScale * collection._maxSize * 2.0;
        if (collection._allHorizontalCenter && collection._allVerticalCenter ) {
            size *= 0.5;
        }

        var offset = pixelScale * collection._maxPixelOffset + collection._maxEyeOffset;
        boundingVolume.radius += size + offset;
    }

    var scratchWriterArray = [];

    /**
     * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
     * get the draw commands needed to render this primitive.
     * <p>
     * Do not call this function directly.  This is documented just to
     * list the exceptions that may be propagated when the scene is rendered:
     * </p>
     *
     * @exception {RuntimeError} image with id must be in the atlas.
     */
    BillboardCollection.prototype.update = function(frameState) {
        removeBillboards(this);
        var billboards = this._billboards;
        var billboardsLength = billboards.length;

        var context = frameState.context;
        this._instanced = context.instancedArrays;
        attributeLocations = this._instanced ? attributeLocationsInstanced : attributeLocationsBatched;
        getIndexBuffer = this._instanced ? getIndexBufferInstanced : getIndexBufferBatched;

        var textureAtlas = this._textureAtlas;
        if (!defined(textureAtlas)) {
            textureAtlas = this._textureAtlas = new TextureAtlas({
                context : context
            });

            for (var ii = 0; ii < billboardsLength; ++ii) {
                billboards[ii]._loadImage();
            }
        }

        var textureAtlasCoordinates = textureAtlas.textureCoordinates;
        if (textureAtlasCoordinates.length === 0) {
            // Can't write billboard vertices until we have texture coordinates
            // provided by a texture atlas
            return;
        }

        updateMode(this, frameState);

        billboards = this._billboards;
        billboardsLength = billboards.length;
        var billboardsToUpdate = this._billboardsToUpdate;
        var billboardsToUpdateLength = this._billboardsToUpdateIndex;

        var properties = this._propertiesChanged;

        var textureAtlasGUID = textureAtlas.guid;
        var createVertexArray = this._createVertexArray || this._textureAtlasGUID !== textureAtlasGUID;
        this._textureAtlasGUID = textureAtlasGUID;

        var vafWriters;
        var pass = frameState.passes;
        var picking = pass.pick;

        // PERFORMANCE_IDEA: Round robin multiple buffers.
        if (createVertexArray || (!picking && this.computeNewBuffersUsage())) {
            this._createVertexArray = false;

            for (var k = 0; k < NUMBER_OF_PROPERTIES; ++k) {
                properties[k] = 0;
            }

            this._vaf = this._vaf && this._vaf.destroy();

            if (billboardsLength > 0) {
                // PERFORMANCE_IDEA:  Instead of creating a new one, resize like std::vector.
                this._vaf = createVAF(context, billboardsLength, this._buffersUsage, this._instanced);
                vafWriters = this._vaf.writers;

                // Rewrite entire buffer if billboards were added or removed.
                for (var i = 0; i < billboardsLength; ++i) {
                    var billboard = this._billboards[i];
                    billboard._dirty = false; // In case it needed an update.
                    writeBillboard(this, context, textureAtlasCoordinates, vafWriters, billboard);
                }

                // Different billboard collections share the same index buffer.
                this._vaf.commit(getIndexBuffer(context));
            }

            this._billboardsToUpdateIndex = 0;
        } else {
            // Billboards were modified, but none were added or removed.
            if (billboardsToUpdateLength > 0) {
                var writers = scratchWriterArray;
                writers.length = 0;

                if (properties[POSITION_INDEX] || properties[ROTATION_INDEX] || properties[SCALE_INDEX]) {
                    writers.push(writePositionScaleAndRotation);
                }

                if (properties[IMAGE_INDEX_INDEX] || properties[PIXEL_OFFSET_INDEX] || properties[HORIZONTAL_ORIGIN_INDEX] || properties[VERTICAL_ORIGIN_INDEX] || properties[SHOW_INDEX]) {
                    writers.push(writeCompressedAttrib0);
                    if (this._instanced) {
                        writers.push(writeEyeOffset);
                    }
                }

                if (properties[IMAGE_INDEX_INDEX] || properties[ALIGNED_AXIS_INDEX] || properties[TRANSLUCENCY_BY_DISTANCE_INDEX]) {
                    writers.push(writeCompressedAttrib1);
                }

                if (properties[IMAGE_INDEX_INDEX] || properties[COLOR_INDEX]) {
                    writers.push(writeCompressedAttrib2);
                }

                if (properties[EYE_OFFSET_INDEX]) {
                    writers.push(writeEyeOffset);
                }

                if (properties[SCALE_BY_DISTANCE_INDEX]) {
                    writers.push(writeScaleByDistance);
                }

                if (properties[PIXEL_OFFSET_SCALE_BY_DISTANCE_INDEX]) {
                    writers.push(writePixelOffsetScaleByDistance);
                }

                var numWriters = writers.length;
                vafWriters = this._vaf.writers;

                if ((billboardsToUpdateLength / billboardsLength) > 0.1) {
                    // If more than 10% of billboard change, rewrite the entire buffer.

                    // PERFORMANCE_IDEA:  I totally made up 10% :).

                    for (var m = 0; m < billboardsToUpdateLength; ++m) {
                        var b = billboardsToUpdate[m];
                        b._dirty = false;

                        for ( var n = 0; n < numWriters; ++n) {
                            writers[n](this, context, textureAtlasCoordinates, vafWriters, b);
                        }
                    }
                    this._vaf.commit(getIndexBuffer(context));
                } else {
                    for (var h = 0; h < billboardsToUpdateLength; ++h) {
                        var bb = billboardsToUpdate[h];
                        bb._dirty = false;

                        for ( var o = 0; o < numWriters; ++o) {
                            writers[o](this, context, textureAtlasCoordinates, vafWriters, bb);
                        }

                        if (this._instanced) {
                            this._vaf.subCommit(bb._index, 1);
                        } else {
                            this._vaf.subCommit(bb._index * 4, 4);
                        }
                    }
                    this._vaf.endSubCommits();
                }

                this._billboardsToUpdateIndex = 0;
            }
        }

        // If the number of total billboards ever shrinks considerably
        // Truncate billboardsToUpdate so that we free memory that we're
        // not going to be using.
        if (billboardsToUpdateLength > billboardsLength * 1.5) {
            billboardsToUpdate.length = billboardsLength;
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
        var vs;
        var fs;
        var j;

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
                    (this._shaderRotation !== this._compiledShaderRotation) ||
                    (this._shaderAlignedAxis !== this._compiledShaderAlignedAxis) ||
                    (this._shaderScaleByDistance !== this._compiledShaderScaleByDistance) ||
                    (this._shaderTranslucencyByDistance !== this._compiledShaderTranslucencyByDistance) ||
                    (this._shaderPixelOffsetScaleByDistance !== this._compiledShaderPixelOffsetScaleByDistance)) {

                vs = new ShaderSource({
                    sources : [BillboardCollectionVS]
                });
                if (this._instanced) {
                    vs.defines.push('INSTANCED');
                }
                if (this._shaderRotation) {
                    vs.defines.push('ROTATION');
                }
                if (this._shaderAlignedAxis) {
                    vs.defines.push('ALIGNED_AXIS');
                }
                if (this._shaderScaleByDistance) {
                    vs.defines.push('EYE_DISTANCE_SCALING');
                }
                if (this._shaderTranslucencyByDistance) {
                    vs.defines.push('EYE_DISTANCE_TRANSLUCENCY');
                }
                if (this._shaderPixelOffsetScaleByDistance) {
                    vs.defines.push('EYE_DISTANCE_PIXEL_OFFSET');
                }
                if (defined(this._scene)) {
                    vs.defines.push('CLAMPED_TO_GROUND');
                }

                this._sp = ShaderProgram.replaceCache({
                    context : context,
                    shaderProgram : this._sp,
                    vertexShaderSource : vs,
                    fragmentShaderSource : BillboardCollectionFS,
                    attributeLocations : attributeLocations
                });

                this._compiledShaderRotation = this._shaderRotation;
                this._compiledShaderAlignedAxis = this._shaderAlignedAxis;
                this._compiledShaderScaleByDistance = this._shaderScaleByDistance;
                this._compiledShaderTranslucencyByDistance = this._shaderTranslucencyByDistance;
                this._compiledShaderPixelOffsetScaleByDistance = this._shaderPixelOffsetScaleByDistance;
            }

            va = this._vaf.va;
            vaLength = va.length;

            colorList.length = vaLength;
            for (j = 0; j < vaLength; ++j) {
                command = colorList[j];
                if (!defined(command)) {
                    command = colorList[j] = new DrawCommand({
                        pass : Pass.OPAQUE,
                        owner : this
                    });
                }

                command.boundingVolume = boundingVolume;
                command.modelMatrix = modelMatrix;
                command.count = va[j].indicesCount;
                command.shaderProgram = this._sp;
                command.uniformMap = this._uniforms;
                command.vertexArray = va[j].va;
                command.renderState = this._rs;
                command.debugShowBoundingVolume = this.debugShowBoundingVolume;

                if (this._instanced) {
                    command.count = 6;
                    command.instanceCount = billboardsLength;
                }

                commandList.push(command);
            }
        }

        if (picking) {
            var pickList = this._pickCommands;

            if (!defined(this._spPick) ||
                    (this._shaderRotation !== this._compiledShaderRotationPick) ||
                    (this._shaderAlignedAxis !== this._compiledShaderAlignedAxisPick) ||
                    (this._shaderScaleByDistance !== this._compiledShaderScaleByDistancePick) ||
                    (this._shaderTranslucencyByDistance !== this._compiledShaderTranslucencyByDistancePick) ||
                    (this._shaderPixelOffsetScaleByDistance !== this._compiledShaderPixelOffsetScaleByDistancePick)) {

                vs = new ShaderSource({
                    defines : ['RENDER_FOR_PICK'],
                    sources : [BillboardCollectionVS]
                });

                if(this._instanced) {
                    vs.defines.push('INSTANCED');
                }
                if (this._shaderRotation) {
                    vs.defines.push('ROTATION');
                }
                if (this._shaderAlignedAxis) {
                    vs.defines.push('ALIGNED_AXIS');
                }
                if (this._shaderScaleByDistance) {
                    vs.defines.push('EYE_DISTANCE_SCALING');
                }
                if (this._shaderTranslucencyByDistance) {
                    vs.defines.push('EYE_DISTANCE_TRANSLUCENCY');
                }
                if (this._shaderPixelOffsetScaleByDistance) {
                    vs.defines.push('EYE_DISTANCE_PIXEL_OFFSET');
                }
                if (defined(this._scene)) {
                    vs.defines.push('CLAMPED_TO_GROUND');
                }

                fs = new ShaderSource({
                    defines : ['RENDER_FOR_PICK'],
                    sources : [BillboardCollectionFS]
                });

                this._spPick = ShaderProgram.replaceCache({
                    context : context,
                    shaderProgram : this._spPick,
                    vertexShaderSource : vs,
                    fragmentShaderSource : fs,
                    attributeLocations : attributeLocations
                });
                this._compiledShaderRotationPick = this._shaderRotation;
                this._compiledShaderAlignedAxisPick = this._shaderAlignedAxis;
                this._compiledShaderScaleByDistancePick = this._shaderScaleByDistance;
                this._compiledShaderTranslucencyByDistancePick = this._shaderTranslucencyByDistance;
                this._compiledShaderPixelOffsetScaleByDistancePick = this._shaderPixelOffsetScaleByDistance;
            }

            va = this._vaf.va;
            vaLength = va.length;

            pickList.length = vaLength;
            for (j = 0; j < vaLength; ++j) {
                command = pickList[j];
                if (!defined(command)) {
                    command = pickList[j] = new DrawCommand({
                        pass : Pass.OPAQUE,
                        owner : this
                    });
                }

                command.boundingVolume = boundingVolume;
                command.modelMatrix = modelMatrix;
                command.count = va[j].indicesCount;
                command.shaderProgram = this._spPick;
                command.uniformMap = this._uniforms;
                command.vertexArray = va[j].va;
                command.renderState = this._rs;

                if (this._instanced) {
                    command.count = 6;
                    command.instanceCount = billboardsLength;
                }

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
     * @returns {undefined}
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
        this._sp = this._sp && this._sp.destroy();
        this._spPick = this._spPick && this._spPick.destroy();
        this._vaf = this._vaf && this._vaf.destroy();
        destroyBillboards(this._billboards);

        return destroyObject(this);
    };

    return BillboardCollection;
});
