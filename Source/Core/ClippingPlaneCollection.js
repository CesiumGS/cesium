define([
        './AttributeCompression',
        './Cartesian2',
        './Cartesian3',
        './Cartesian4',
        './Math',
        './Check',
        './Color',
        './defaultValue',
        './defined',
        './defineProperties',
        './destroyObject',
        './DeveloperError',
        './FeatureDetection',
        './Intersect',
        './Matrix4',
        './PixelFormat',
        './Plane',
        '../Renderer/PixelDatatype',
        '../Renderer/Sampler',
        '../Renderer/Texture',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap'
    ], function(
        AttributeCompression,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        CesiumMath,
        Check,
        Color,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        FeatureDetection,
        Intersect,
        Matrix4,
        PixelFormat,
        Plane,
        PixelDatatype,
        Sampler,
        Texture,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap) {
    'use strict';

    /**
     * Specifies a set of clipping planes. Clipping planes selectively disable rendering in a region on the
     * outside of the specified list of {@link Plane} objects for a single gltf model, 3D Tileset, or the globe.
     *
     * @alias ClippingPlaneCollection
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Plane[]} [options.planes=[]] An array of up to 6 {@link Plane} objects used to selectively disable rendering on the outside of each plane.
     * @param {Boolean} [options.enabled=true] Determines whether the clipping planes are active.
     * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix specifying an additional transform relative to the clipping planes original coordinate system.
     * @param {Boolean} [options.unionClippingRegions=false] If true, a region will be clipped if included in any plane in the collection. Otherwise, the region to be clipped must intersect the regions defined by all planes in this collection.
     * @param {Color} [options.edgeColor=Color.WHITE] The color applied to highlight the edge along which an object is clipped.
     * @param {Number} [options.edgeWidth=0.0] The width, in pixels, of the highlight applied to the edge along which an object is clipped.
     */
    function ClippingPlaneCollection(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var planes = options.planes;
        if (defined(planes)) {
            this._planes = planes.slice(0);
        } else {
            this._planes = [];
        }

        /**
         * Determines whether the clipping planes are active.
         *
         * @type {Boolean}
         * @default true
         */
        this.enabled = defaultValue(options.enabled, true);

        /**
         * The 4x4 transformation matrix specifying an additional transform relative to the clipping planes
         * original coordinate system.
         *
         * @type {Matrix4}
         * @default Matrix4.IDENTITY
         */
        this.modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));

        /**
         * The color applied to highlight the edge along which an object is clipped.
         *
         * @type {Color}
         * @default Color.WHITE
         */
        this.edgeColor = Color.clone(defaultValue(options.edgeColor, Color.WHITE));

        /**
         * The width, in pixels, of the highlight applied to the edge along which an object is clipped.
         *
         * @type {Number}
         * @default 0.0
         */
        this.edgeWidth = defaultValue(options.edgeWidth, 0.0);

         // If this ClippingPlaneCollection has an owner, only its owner should update or destroy it.
         // This is because in a Cesium3DTileset multiple models may reference the tileset's ClippingPlaneCollection.
        this._owner = undefined;

        this._testIntersection = undefined;
        this._unionClippingRegions = undefined;
        this.unionClippingRegions = defaultValue(options.unionClippingRegions, false);

        this._uint8View = undefined;
        this._float32View = undefined;

        // Uint32 views for comparison and copy
        // Avoid wastefully re-uploading textures when the clipping planes don't change between frames
        this._previousUint32View = undefined;
        this._currentUint32View = undefined;

        this._clippingPlanesTexture = undefined;

        // Packed uniform for plane count, denormalization parameters, and clipping union (0 false, 1 true)
        this._lengthRangeUnion = new Cartesian4();
    }

    function unionIntersectFunction(value) {
        return (value === Intersect.OUTSIDE);
    }

    function defaultIntersectFunction(value) {
        return (value === Intersect.INSIDE);
    }

    defineProperties(ClippingPlaneCollection.prototype, {
        /**
         * Returns the number of planes in this collection.  This is commonly used with
         * {@link ClippingPlaneCollection#get} to iterate over all the planes
         * in the collection.
         *
         * @memberof ClippingPlaneCollection.prototype
         * @type {Number}
         * @readonly
         */
        length : {
            get : function() {
                return this._planes.length;
            }
        },

        /**
         * If true, a region will be clipped if included in any plane in the collection. Otherwise, the region
         * to be clipped must intersect the regions defined by all planes in this collection.
         *
         * @memberof ClippingPlaneCollection.prototype
         * @type {Boolean}
         * @default false
         */
        unionClippingRegions : {
            get : function() {
                return this._unionClippingRegions;
            },
            set : function(value) {
                if (this._unionClippingRegions !== value) {
                    this._unionClippingRegions = value;
                    this._testIntersection = value ? unionIntersectFunction : defaultIntersectFunction;
                }
            }
        },

        /**
         * Returns a texture containing packed, untransformed clipping planes.
         *
         * @memberof ClippingPlaneCollection.prototype
         * @type {Texture}
         * @readonly
         */
        texture : {
            get : function() {
                return this._clippingPlanesTexture;
            }
        },

        /**
         * Length of clipping plane collection, range for inflating the normalized distances in the clipping plane texture,
         * and union mode packed to a vec4 for use as a uniform.
         *
         * @type {Cartesian4}
         * @readonly
         */
        lengthRangeUnion : {
            get : function() {
                return this._lengthRangeUnion;
            }
        },

        /**
         * A reference to the ClippingPlaneCollection's owner, if any.
         *
         * @readonly
         * @private
         */
        owner : {
            get : function() {
                return this._owner;
            }
        }
    });

    /**
     * Adds the specified {@link Plane} to the collection to be used to selectively disable rendering
     * on the outside of each plane. Use {@link ClippingPlaneCollection#unionClippingRegions} to modify
     * how modify the clipping behavior of multiple planes.
     *
     * @param {Plane} plane The plane to add to the collection.
     *
     * @exception {DeveloperError} The plane added exceeds the maximum number of supported clipping planes.
     *
     * @see ClippingPlaneCollection#unionClippingRegions
     * @see ClippingPlaneCollection#remove
     * @see ClippingPlaneCollection#removeAll
     */
    ClippingPlaneCollection.prototype.add = function(plane) {
        //>>includeStart('debug', pragmas.debug);
        if (this.length >= ClippingPlaneCollection.MAX_CLIPPING_PLANES) {
            throw new DeveloperError('The maximum number of clipping planes supported is ' + ClippingPlaneCollection.MAX_CLIPPING_PLANES);
        }
        //>>includeEnd('debug');

        this._planes.push(plane);
    };

    /**
     * Returns the plane in the collection at the specified index.  Indices are zero-based
     * and increase as planes are added.  Removing a plane shifts all planes after
     * it to the left, changing their indices.  This function is commonly used with
     * {@link ClippingPlaneCollection#length} to iterate over all the planes
     * in the collection.
     *
     * @param {Number} index The zero-based index of the plane.
     * @returns {Plane} The plane at the specified index.
     *
     * @see ClippingPlaneCollection#length
     */
    ClippingPlaneCollection.prototype.get = function(index) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.number('index', index);
        //>>includeEnd('debug');

        return this._planes[index];
    };

    function indexOf(planes, plane) {
        var length = planes.length;
        for (var i = 0; i < length; ++i) {
            if (Plane.equals(planes[i], plane)) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Checks whether this collection contains the given plane.
     *
     * @param {Plane} [plane] The plane to check for.
     * @returns {Boolean} true if this collection contains the plane, false otherwise.
     *
     * @see ClippingPlaneCollection#get
     */
    ClippingPlaneCollection.prototype.contains = function(plane) {
        return indexOf(this._planes, plane) !== -1;
    };

    /**
     * Removes the first occurrence of the given plane from the collection.
     *
     * @param {Plane} plane
     * @returns {Boolean} <code>true</code> if the plane was removed; <code>false</code> if the plane was not found in the collection.
     *
     * @see ClippingPlaneCollection#add
     * @see ClippingPlaneCollection#contains
     * @see ClippingPlaneCollection#removeAll
     */
    ClippingPlaneCollection.prototype.remove = function(plane) {
        var planes = this._planes;
        var index = indexOf(planes, plane);

        if (index === -1) {
            return false;
        }

        var length = planes.length - 1;
        for (var i = index; i < length; ++i) {
            planes[i] = planes[i + 1];
        }
        planes.length = length;

        return true;
    };

    /**
     * Removes all planes from the collection.
     *
     * @see ClippingPlaneCollection#add
     * @see ClippingPlaneCollection#remove
     */
    ClippingPlaneCollection.prototype.removeAll = function() {
        this._planes = [];
    };

    // See Aras Pranckevičius' post Encoding Floats to RGBA
    // http://aras-p.info/blog/2009/07/30/encoding-floats-to-rgba-the-final/
    var floatEncode = new Cartesian4(1.0, 255.0, 65025.0, 16581375.0);
    function packNormalizedFloat(float, result) {
        Cartesian4.multiplyByScalar(floatEncode, float, result);
        result.x = result.x - Math.floor(result.x);
        result.y = result.y - Math.floor(result.y);
        result.z = result.z - Math.floor(result.z);
        result.w = result.w - Math.floor(result.w);

        result.x -= result.y / 255.0;
        result.y -= result.z / 255.0;
        result.z -= result.w / 255.0;

        return result;
    }

    var encodingScratch = new Cartesian4();
    function insertFloat(uint8Buffer, float, byteIndex) {
        packNormalizedFloat(float, encodingScratch);
        uint8Buffer[byteIndex] = encodingScratch.x * 255;
        uint8Buffer[byteIndex + 1] = encodingScratch.y * 255;
        uint8Buffer[byteIndex + 2] = encodingScratch.z * 255;
        uint8Buffer[byteIndex + 3] = encodingScratch.w * 255;
    }

    var octEncodeScratch = new Cartesian2();
    var rightShift = 1.0 / 256.0;
    /**
     * Encodes a normalized vector into 4 SNORM values in the range [0-255] following the 'oct' encoding.
     * oct32 precision is higher than the default oct16, hence the additional 2 uint16 values.
     */
    function oct32EncodeNormal(vector, result) {
        AttributeCompression.octEncodeInRange(vector, 65535, octEncodeScratch);
        result.x = octEncodeScratch.x * rightShift;
        result.y = octEncodeScratch.x;
        result.z = octEncodeScratch.y * rightShift;
        result.w = octEncodeScratch.y;
        return result;
    }

    var oct32EncodeScratch = new Cartesian4();
    function packAndReturnChangedUint8(clippingPlaneCollection) {
        var previousUint32View = clippingPlaneCollection._previousUint32View;
        var currentUint32View = clippingPlaneCollection._currentUint32View;
        var textureBytes = clippingPlaneCollection._uint8View;
        var planes = clippingPlaneCollection._planes;
        var length = planes.length;
        var dirty = false;
        var byteIndex, uint32Index;

        var lengthRangeUnion = clippingPlaneCollection._lengthRangeUnion;
        lengthRangeUnion.x = length;
        lengthRangeUnion.w = clippingPlaneCollection._unionClippingRegions ? 1.0 : 0.0;

        // Pack all plane normals and get min/max of all distances.
        // Check each normal for changes.
        var distanceMin = Number.POSITIVE_INFINITY;
        var distanceMax = Number.NEGATIVE_INFINITY;
        var i;
        for (i = 0; i < length; ++i) {
            var plane = planes[i];

            byteIndex = i * 8; // each plane is 4 bytes normal, 4 bytes distance

            var oct32Normal = oct32EncodeNormal(plane.normal, oct32EncodeScratch);
            textureBytes[byteIndex] = oct32Normal.x;
            textureBytes[byteIndex + 1] = oct32Normal.y;
            textureBytes[byteIndex + 2] = oct32Normal.z;
            textureBytes[byteIndex + 3] = oct32Normal.w;

            uint32Index = i * 2;
            dirty = dirty || previousUint32View[uint32Index] !== currentUint32View[uint32Index];
            if (dirty) {
                previousUint32View[uint32Index] = currentUint32View[uint32Index];
            }

            var distance = plane.distance;
            distanceMin = Math.min(distance, distanceMin);
            distanceMax = Math.max(distance, distanceMax);
        }

        // Expand distance range a little bit to prevent packing 1s
        distanceMax += (distanceMax - distanceMin) * CesiumMath.EPSILON3;

        // Normalize all the distances to the range and record them in the typed array.
        // Check each distance for changes.
        lengthRangeUnion.y = distanceMin;
        lengthRangeUnion.z = distanceMax;
        var distanceRangeSize = distanceMax - distanceMin;
        for (i = 0; i < length; ++i) {
            var normalizedDistance = (planes[i].distance - distanceMin) / distanceRangeSize;
            byteIndex = i * 8 + 4;
            insertFloat(textureBytes, normalizedDistance, byteIndex);

            uint32Index = i * 2 + 1;
            dirty = dirty || previousUint32View[uint32Index] !== currentUint32View[uint32Index];
            if (dirty) {
                previousUint32View[uint32Index] = currentUint32View[uint32Index];
            }
        }
        return dirty;
    }

    function packAndReturnChangedFloat(clippingPlaneCollection) {
        var previousUint32View = clippingPlaneCollection._previousUint32View;
        var currentUint32View = clippingPlaneCollection._currentUint32View;
        var float32View = clippingPlaneCollection._float32View;
        var planes = clippingPlaneCollection._planes;
        var length = planes.length;
        var dirty = false;
        var floatIndex, uint32Index;

        var lengthRangeUnion = clippingPlaneCollection._lengthRangeUnion;
        lengthRangeUnion.x = length;
        lengthRangeUnion.w = clippingPlaneCollection._unionClippingRegions ? 1.0 : 0.0;

        var i, j;
        for (i = 0; i < length; ++i) {
            var plane = planes[i];

            floatIndex = i * 4; // each plane is 4 floats

            var normal = plane.normal;
            float32View[floatIndex] = normal.x;
            float32View[floatIndex + 1] = normal.y;
            float32View[floatIndex + 2] = normal.z;
            float32View[floatIndex + 3] = plane.distance;

            for (j = 0; j < 4; ++j) {
                uint32Index = floatIndex + j;
                dirty = dirty || previousUint32View[uint32Index] !== currentUint32View[uint32Index];
                if (dirty) {
                    previousUint32View[uint32Index] = currentUint32View[uint32Index];
                }
            }
        }
        return dirty;
    }

    /**
     * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
     * build the resources for clipping planes.
     * <p>
     * Do not call this function directly.
     * </p>
     */
    ClippingPlaneCollection.prototype.update = function(frameState) {
        var clippingPlanesTexture = this._clippingPlanesTexture;
        var context = frameState.context;
        var useFloatTexture = ClippingPlaneCollection.useFloatTexture(context);

        if (!defined(clippingPlanesTexture)) {
            var sampler = new Sampler({
                wrapS : TextureWrap.CLAMP_TO_EDGE,
                wrapT : TextureWrap.CLAMP_TO_EDGE,
                minificationFilter : TextureMinificationFilter.NEAREST,
                magnificationFilter : TextureMagnificationFilter.NEAREST
            });

            var byteCount = 0;
            if (useFloatTexture) {
                clippingPlanesTexture = new Texture({
                    context : context,
                    width : ClippingPlaneCollection.TEXTURE_WIDTH,
                    height : ClippingPlaneCollection.TEXTURE_HEIGHT_FLOAT,
                    pixelFormat : PixelFormat.RGBA,
                    pixelDatatype : PixelDatatype.FLOAT,
                    sampler : sampler
                });
                byteCount = ClippingPlaneCollection.TEXTURE_WIDTH * ClippingPlaneCollection.TEXTURE_HEIGHT_FLOAT * 16; // RGBA float
            } else {
                clippingPlanesTexture = new Texture({
                    context : context,
                    width : ClippingPlaneCollection.TEXTURE_WIDTH,
                    height : ClippingPlaneCollection.TEXTURE_HEIGHT_UINT8,
                    pixelFormat : PixelFormat.RGBA,
                    pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
                    sampler : sampler
                });
                byteCount = ClippingPlaneCollection.TEXTURE_WIDTH * ClippingPlaneCollection.TEXTURE_HEIGHT_UINT8 * 4; // RGBA uint8
            }
            var previousTextureBytes = new ArrayBuffer(byteCount);
            var currentTextureBytes = new ArrayBuffer(byteCount);

            this._uint8View = new Uint8Array(currentTextureBytes);
            this._float32View = new Float32Array(currentTextureBytes);
            this._previousUint32View = new Uint32Array(previousTextureBytes);
            this._currentUint32View = new Uint32Array(currentTextureBytes);

            this._clippingPlanesTexture = clippingPlanesTexture;
        }
        // pack planes to currentTextureBytes, do a texture update if anything changed.
        var changed = useFloatTexture ? packAndReturnChangedFloat(this) : packAndReturnChangedUint8(this);
        if (changed) {
            clippingPlanesTexture.copyFrom({
                width : clippingPlanesTexture.width,
                height : clippingPlanesTexture.height,
                arrayBufferView : useFloatTexture ? this._float32View : this._uint8View
            });
        }
    };

    /**
     * Duplicates this ClippingPlaneCollection instance.
     *
     * @param {ClippingPlaneCollection} [result] The object onto which to store the result.
     * @returns {ClippingPlaneCollection} The modified result parameter or a new ClippingPlaneCollection instance if one was not provided.
     */
    ClippingPlaneCollection.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new ClippingPlaneCollection();
        }

        var length = this.length;
        var i;
        if (result.length !== length) {
            var planes = result._planes;
            var index = planes.length;

            planes.length = length;
            for (i = index; i < length; ++i) {
                result._planes[i] = new Plane(Cartesian3.UNIT_X, 0.0);
            }
        }

        for (i = 0; i < length; ++i) {
            Plane.clone(this._planes[i], result._planes[i]);
        }

        result.enabled = this.enabled;
        Matrix4.clone(this.modelMatrix, result.modelMatrix);
        result.unionClippingRegions = this.unionClippingRegions;
        Color.clone(this.edgeColor, result.edgeColor);
        result.edgeWidth = this.edgeWidth;

        return result;
    };

    var scratchMatrix = new Matrix4();
    var scratchPlane = new Plane(Cartesian3.UNIT_X, 0.0);
    /**
     * Determines the type intersection with the planes of this ClippingPlaneCollection instance and the specified {@link BoundingVolume}.
     * @private
     *
     * @param {Object} boundingVolume The volume to determine the intersection with the planes.
     * @param {Matrix4} [transform] An optional, additional matrix to transform the plane to world coordinates.
     * @returns {Intersect} {@link Intersect.INSIDE} if the entire volume is on the side of the planes
     *                      the normal is pointing and should be entirely rendered, {@link Intersect.OUTSIDE}
     *                      if the entire volume is on the opposite side and should be clipped, and
     *                      {@link Intersect.INTERSECTING} if the volume intersects the planes.
     */
    ClippingPlaneCollection.prototype.computeIntersectionWithBoundingVolume = function(boundingVolume, transform) {
        var planes = this._planes;
        var length = planes.length;

        var modelMatrix = this.modelMatrix;
        if (defined(transform)) {
            modelMatrix = Matrix4.multiply(modelMatrix, transform, scratchMatrix);
        }

        // If the collection is not set to union the clipping regions, the volume must be outside of all planes to be
        // considered completely clipped. If the collection is set to union the clipping regions, if the volume can be
        // outside any the planes, it is considered completely clipped.
        // Lastly, if not completely clipped, if any plane is intersecting, more calculations must be performed.
        var intersection = Intersect.INSIDE;
        if (!this.unionClippingRegions && length > 0) {
            intersection = Intersect.OUTSIDE;
        }

        for (var i = 0; i < length; ++i) {
            var plane = planes[i];

            Plane.transform(plane, modelMatrix, scratchPlane);

            var value = boundingVolume.intersectPlane(scratchPlane);
            if (value === Intersect.INTERSECTING) {
                intersection = value;
            } else if (this._testIntersection(value)) {
                return value;
            }
        }

        return intersection;
    };

    /**
     * The maximum number of supported clipping planes.
     * @private
     *
     * @type {number}
     * @constant
     */
    ClippingPlaneCollection.MAX_CLIPPING_PLANES = 2048; // See maxClippingPlanes.glsl

    var textureWidth = CesiumMath.nextPowerOfTwo(Math.ceil(Math.sqrt(ClippingPlaneCollection.MAX_CLIPPING_PLANES * 2)));
    /**
     * The pixel width of a power-of-two RGBA UNSIGNED_BYTE texture or power-of-two RGBA FLOAT texture.
     * with enough pixels to support MAX_CLIPPING_PLANES.
     *
     * In RGBA UNSIGNED_BYTE, A plane is a float in [0, 1) packed to RGBA and an Oct32 quantized normal, so 8 bits or 2 pixels in RGBA.
     * For odd-power PoT numbers of clipping planes, this is a PoT square.
     *
     * In RGBA FLOAT, A plane is 4 floats packed to a RGBA. For odd-power PoT numbers of clipping planes, this works out to half a PoT square.
     * @private
     *
     * @type {number}
     * @constant
     */
    ClippingPlaneCollection.TEXTURE_WIDTH = textureWidth;

    /**
     * The pixel width of a power-of-two RGBA UNSIGNED_BYTE texture.
     * with enough pixels to support MAX_CLIPPING_PLANES.
     *
     * In RGBA UNSIGNED_BYTE, A plane is a float in [0, 1) packed to RGBA and an Oct32 quantized normal, so 8 bits or 2 pixels in RGBA.
     * For odd-power PoT numbers of clipping planes, this is a PoT square.
     * @private
     *
     * @type {number}
     * @constant
     */
    ClippingPlaneCollection.TEXTURE_HEIGHT_UINT8 = (ClippingPlaneCollection.MAX_CLIPPING_PLANES * 2) / textureWidth;

    /**
     * The pixel width of a power-of-two RGBA FLOAT texture.
     * with enough pixels to support MAX_CLIPPING_PLANES.
     *
     * In RGBA FLOAT, A plane is 4 floats packed to a RGBA. For odd-power PoT numbers of clipping planes, this works out to half a PoT square.
     * @private
     *
     * @type {number}
     * @constant
     */
    ClippingPlaneCollection.TEXTURE_HEIGHT_FLOAT = ClippingPlaneCollection.MAX_CLIPPING_PLANES / textureWidth;

    /**
     * Sets the owner for the input ClippingPlaneCollection if there wasn't another owner.
     * Destroys the owner's previous ClippingPlaneCollection if setting is successful.
     *
     * @param {ClippingPlaneCollection} [clippingPlaneCollection] A ClippingPlaneCollection (or undefined) being attached to an object
     * @param {Object} owner An Object that should receive the new ClippingPlaneCollection
     * @param {String} key The Key for the Object to reference the ClippingPlaneCollection
     * @private
     */
    ClippingPlaneCollection.setOwnership = function(clippingPlaneCollection, owner, key) {
        // Don't destroy the ClippingPlaneCollection if it is already owned by newOwner
        if (clippingPlaneCollection === owner[key]) {
            return;
        }
        // Destroy the existing ClippingPlaneCollection, if any
        owner[key] = owner[key] && owner[key].destroy();
        if (defined(clippingPlaneCollection)) {
            //>>includeStart('debug', pragmas.debug);
            if (defined(clippingPlaneCollection._owner)) {
                throw new DeveloperError('ClippingPlaneCollection should only be assigned to one object');
            }
            //>>includeEnd('debug');
            clippingPlaneCollection._owner = owner;
            owner[key] = clippingPlaneCollection;
        }
    };

    /**
     * Determines if rendering with clipping planes is supported.
     *
     * @returns {Boolean} <code>true</code> if ClippingPlaneCollections are supported
     * @deprecated
     */
    ClippingPlaneCollection.isSupported = function() {
        return true;
    };

    /**
     * Function for checking if the context will allow clipping planes with floating point textures.
     *
     * @param {Context} context The Context that will contain clipped objects and clipping textures.
     * @returns {Boolean} <code>true</code> if floating point textures can be used for clipping planes.
     * @private
     */
    ClippingPlaneCollection.useFloatTexture = function(context) {
        return context.floatingPointTexture;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see ClippingPlaneCollection#destroy
     */
    ClippingPlaneCollection.prototype.isDestroyed = function() {
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
     * clippingPlanes = clippingPlanes && clippingPlanes .destroy();
     *
     * @see ClippingPlaneCollection#isDestroyed
     */
    ClippingPlaneCollection.prototype.destroy = function() {
        this._clippingPlanesTexture = this._clippingPlanesTexture && this._clippingPlanesTexture.destroy();
        return destroyObject(this);
    };

    return ClippingPlaneCollection;
});
