define([
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Check',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/Intersect',
        '../Core/Matrix4',
        '../Core/Plane'
    ], function(
        Cartesian3,
        Cartesian4,
        Check,
        Color,
        defaultValue,
        defined,
        defineProperties,
        Intersect,
        Matrix4,
        Plane) {
    'use strict';

    /**
     * Specifies a set of clipping planes. Clipping planes selectively disable rendering in a region on the outside of the specified list of {@link Plane} objects.
     *
     * @alias ClippingPlaneCollection
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Plane[]} [options.planes=[]] An array of up to 6 {@link Plane} objects used to selectively disable rendering on the outside of each plane.
     * @param {Boolean} [options.enabled=true] Determines whether the clipping planes are active.
     * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix specifying an additional transform relative to the clipping planes original coordinate system.
     * @param {Boolean} [options.combineClippingRegions=true] If true, the region to be clipped must be included in all planes in this collection. Otherwise, a region will be clipped if included in any plane in the collection.
     * @param {Color} [options.edgeColor=Color.WHITE] The color applied to highlight the edge along which an object is clipped.
     * @param {Number} [options.edgeWidth=0.0] The width, in pixels, of the highlight applied to the edge along which an object is clipped.
     */
    function ClippingPlaneCollection(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * An array of up to 6 {@link Plane} objects used to selectively disable rendering on the outside of each plane.
         *
         * @type {Plane[]}
         * @default []
         */
        this.planes = defaultValue(options.planes, []);

        /**
         * Determines whether the clipping planes are active.
         *
         * @type {Boolean}
         * @default true
         */
        this.enabled = defaultValue(options.enabled, true);

        /**
         * The 4x4 transformation matrix specifying an additional transform relative to the clipping planes original coordinate system.
         *
         * @type {Matrix4}
         * @default Matrix4.IDENTITY
         */
        this.modelMatrix = defaultValue(options.modelMatrix, Matrix4.clone(Matrix4.IDENTITY));

        /**
         * The color applied to highlight the edge along which an object is clipped.
         *
         * @type {Color}
         * @default Color.WHITE
         */
        this.edgeColor = defaultValue(options.edgeColor, Color.clone(Color.WHITE));

        /**
         * The width, in pixels, of the highlight applied to the edge along which an object is clipped.
         *
         * @type {Number}
         * @default 0.0
         */
        this.edgeWidth = defaultValue(options.edgeWidth, 0.0);

        this._testIntersection = undefined;
        this._combineClippingRegions = undefined;
        this.combineClippingRegions = defaultValue(options.combineClippingRegions, true);
    }

    defineProperties(ClippingPlaneCollection.prototype, {
        /**
         * If true, the region to be clipped must be included in all planes in this collection.
         * Otherwise, a region will be clipped if included in any plane in the collection.
         *
         * @memberof ClippingPlaneCollection.prototype
         * @type {Boolean}
         * @default true
         */
        combineClippingRegions : {
            get : function() {
                return this._combineClippingRegions;
            },
            set : function(value) {
                if (this._combineClippingRegions !== value) {
                    this._combineClippingRegions = value;
                    this._testIntersection = getTestIntersectionFunction(value);
                }
            }
        }
    });

    function getTestIntersectionFunction(combineClippingRegions) {
        if (combineClippingRegions) {
            return function(value) {
                return (value === Intersect.INSIDE);
            };
        }

        return function(value) {
            return (value === Intersect.OUTSIDE);
        };
    }

    var scratchPlane = new Plane(Cartesian3.UNIT_X, 0.0);
    var scratchMatrix = new Matrix4();
    /**
     * Applies the transformations to each plane and packs it into an array.
     * @private
     *
     * @param viewMatrix The 4x4 matrix to transform the plane into eyespace.
     * @param [array] The array into which the planes will be packed.
     * @returns {Cartesian4[]} The array of packed planes.
     */
    ClippingPlaneCollection.prototype.transformAndPackPlanes = function(viewMatrix, array) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('viewMatrix', viewMatrix);
        //>>includeEnd('debug');

        var planes = this.planes;
        var length = planes.length;

        var i;
        if (!defined(array) || array.length !== length) {
            array = new Array(length);

            for (i = 0; i < length; ++i) {
                array[i] = new Cartesian4();
            }
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

        var length = this.planes.length;
        var i;
        if (result.planes.length !== length) {
            result.planes = new Array(length);

            for (i = 0; i < length; ++i) {
                result.planes[i] = new Plane(Cartesian3.UNIT_X, 0.0);
            }
        }

        for (i = 0; i < length; ++i) {
            var plane = this.planes[i];
            var resultPlane = result.planes[i];
            resultPlane.normal = plane.normal;
            resultPlane.distance = plane.distance;
        }

        result.enabled = this.enabled;
        Matrix4.clone(this.modelMatrix, result.modelMatrix);
        result.combineClippingRegions = this.combineClippingRegions;
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
        var planes = this.planes;
        var length = planes.length;

        var modelMatrix = this.modelMatrix;
        if (defined(transform)) {
            modelMatrix = Matrix4.multiply(modelMatrix, transform, scratchMatrix);
        }

        // If the clipping planes are using combineClippingRegions, the volume must be outside of all planes to be considered
        // completely clipped. Otherwise, if the volume can be outside any the planes, it is considered completely clipped.
        // Lastly, if not completely clipped, if any plane is intersecting, more calculations must be performed.
        var intersection = Intersect.INSIDE;
        if (this.combineClippingRegions && length > 0) {
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

    return ClippingPlaneCollection;
});
