define([
        './Cartesian3',
        './Cartesian4',
        './Check',
        './Color',
        './defaultValue',
        './defined',
        './defineProperties',
        './DeveloperError',
        './Intersect',
        './Matrix4',
        './Plane'
    ], function(
        Cartesian3,
        Cartesian4,
        Check,
        Color,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Intersect,
        Matrix4,
        Plane) {
    'use strict';

    /**
     * Specifies a set of clipping planes. Clipping planes selectively disable rendering in a region on the
     * outside of the specified list of {@link Plane} objects.
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

        this._testIntersection = undefined;
        this._unionClippingRegions = undefined;
        this.unionClippingRegions = defaultValue(options.unionClippingRegions, false);
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
         * @default true
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

    var scratchPlane = new Plane(Cartesian3.UNIT_X, 0.0);
    var scratchMatrix = new Matrix4();
    /**
     * Applies the transformations to each plane and packs it into an array.
     * @private
     *
     * @param {Matrix4} viewMatrix The 4x4 matrix to transform the plane into eyespace.
     * @param {Cartesian4[]} [array] The array into which the planes will be packed.
     * @returns {Cartesian4[]} The array of packed planes.
     */
    ClippingPlaneCollection.prototype.transformAndPackPlanes = function(viewMatrix, array) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('viewMatrix', viewMatrix);
        //>>includeEnd('debug');

        var planes = this._planes;
        var length = planes.length;

        var index = 0;
        if (!defined(array)) {
            array = new Array(length);
        } else {
            index = array.length;
            array.length = length;
        }

        var i;
        for (i = index; i < length; ++i) {
            array[i] = new Cartesian4();
        }

        var transform = Matrix4.multiply(viewMatrix, this.modelMatrix, scratchMatrix);

        for (i = 0; i < length; ++i) {
            var plane = planes[i];
            var packedPlane = array[i];

            Plane.transform(plane, transform, scratchPlane);

            Cartesian3.clone(scratchPlane.normal, packedPlane);
            packedPlane.w = scratchPlane.distance;
        }

        return array;
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
     *
     * @type {number}
     * @constant
     */
    ClippingPlaneCollection.MAX_CLIPPING_PLANES = 6;

    return ClippingPlaneCollection;
});
