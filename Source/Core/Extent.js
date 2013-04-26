/*global define*/
define([
        './freezeObject',
        './defaultValue',
        './Ellipsoid',
        './Cartographic',
        './DeveloperError',
        './Math'
    ], function(
        freezeObject,
        defaultValue,
        Ellipsoid,
        Cartographic,
        DeveloperError,
        CesiumMath) {
    "use strict";

    /**
     * A two dimensional region specified as longitude and latitude coordinates.
     * @alias Extent
     * @constructor
     *
     * @param {Number} [west=0.0] The westernmost longitude in the range [-Pi, Pi].
     * @param {Number} [south=0.0] The southernmost latitude in the range [-Pi/2, Pi/2].
     * @param {Number} [east=0.0] The easternmost longitude in the range [-Pi, Pi].
     * @param {Number} [north=0.0] The northernmost latitude in the range [-Pi/2, Pi/2].
     */
    var Extent = function(west, south, east, north) {
        /**
         * The westernmost longitude in the range [-Pi, Pi].
         * @type Number
         */
        this.west = defaultValue(west, 0.0);

        /**
         * The southernmost latitude in the range [-Pi/2, Pi/2].
         * @type Number
         */
        this.south = defaultValue(south, 0.0);

        /**
         * The easternmost longitude in the range [-Pi, Pi].
         * @type Number
         */
        this.east = defaultValue(east, 0.0);

        /**
         * The northernmost latitude in the range [-Pi/2, Pi/2].
         * @type Number
         */
        this.north = defaultValue(north, 0.0);
    };

    /**
     * Creates the smallest possible Extent that encloses all positions in the provided array.
     * @memberof Extent
     *
     * @param {Array} cartographics The list of Cartographic instances.
     * @param {Extent} [result] The object onto which to store the result, or undefined if a new instance should be created.
     * @return {Extent} The modified result parameter or a new Extent instance if none was provided.
     */
    Extent.fromCartographicArray = function(cartographics, result) {
        if (typeof cartographics === 'undefined') {
            throw new DeveloperError('cartographics is required.');
        }

        var minLon = Number.MAX_VALUE;
        var maxLon = -Number.MAX_VALUE;
        var minLat = Number.MAX_VALUE;
        var maxLat = -Number.MAX_VALUE;

        for ( var i = 0, len = cartographics.length; i < len; i++) {
            var position = cartographics[i];
            minLon = Math.min(minLon, position.longitude);
            maxLon = Math.max(maxLon, position.longitude);
            minLat = Math.min(minLat, position.latitude);
            maxLat = Math.max(maxLat, position.latitude);
        }

        if (typeof result === 'undefined') {
            return new Extent(minLon, minLat, maxLon, maxLat);
        }

        result.west = minLon;
        result.south = minLat;
        result.east = maxLon;
        result.north = maxLat;
        return result;
    };

    /**
     * Duplicates an Extent.
     *
     * @memberof Extent
     *
     * @param {Extent} extent The extent to clone.
     * @param {Extent} [result] The object onto which to store the result, or undefined if a new instance should be created.
     * @return {Extent} The modified result parameter or a new Extent instance if none was provided.
     */
    Extent.clone = function(extent, result) {
        if (typeof result === 'undefined') {
            return new Extent(extent.west, extent.south, extent.east, extent.north);
        }
        result.west = extent.west;
        result.south = extent.south;
        result.east = extent.east;
        result.north = extent.north;
        return result;
    };

    /**
     * Duplicates this Extent.
     *
     * @memberof Extent
     *
     * @param {Extent} [result] The object onto which to store the result.
     * @return {Extent} The modified result parameter or a new Extent instance if none was provided.
     */
    Extent.prototype.clone = function(result) {
        return Extent.clone(this, result);
    };

    /**
     * Compares the provided Extent with this Extent componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof Extent
     *
     * @param {Extent} [other] The Extent to compare.
     * @return {Boolean} <code>true</code> if the Extents are equal, <code>false</code> otherwise.
     */
    Extent.prototype.equals = function(other) {
        return typeof other !== 'undefined' &&
               this.west === other.west &&
               this.south === other.south &&
               this.east === other.east &&
               this.north === other.north;
    };

    /**
     * Compares the provided Extent with this Extent componentwise and returns
     * <code>true</code> if they are within the provided epsilon,
     * <code>false</code> otherwise.
     * @memberof Extent
     *
     * @param {Extent} [other] The Extent to compare.
     * @param {Number} epsilon The epsilon to use for equality testing.
     * @return {Boolean} <code>true</code> if the Extents are within the provided epsilon, <code>false</code> otherwise.
     *
     * @exception {DeveloperError} epsilon is required and must be a number.
     */
    Extent.prototype.equalsEpsilon = function(other, epsilon) {
        if (typeof epsilon !== 'number') {
            throw new DeveloperError('epsilon is required and must be a number.');
        }

        return typeof other !== 'undefined' &&
               (Math.abs(this.west - other.west) <= epsilon) &&
               (Math.abs(this.south - other.south) <= epsilon) &&
               (Math.abs(this.east - other.east) <= epsilon) &&
               (Math.abs(this.north - other.north) <= epsilon);
    };

    /**
     * Checks this Extent's properties and throws if they are not in valid ranges.
     *
     * @exception {DeveloperError} <code>north</code> is required to be a number.
     * @exception {DeveloperError} <code>south</code> is required to be a number.
     * @exception {DeveloperError} <code>east</code> is required to be a number.
     * @exception {DeveloperError} <code>west</code> is required to be a number.
     * @exception {DeveloperError} <code>north</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
     * @exception {DeveloperError} <code>south</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
     * @exception {DeveloperError} <code>east</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
     * @exception {DeveloperError} <code>west</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
     */
    Extent.prototype.validate = function() {
        var north = this.north;
        if (typeof north !== 'number') {
            throw new DeveloperError('north is required to be a number.');
        }

        if (north < -CesiumMath.PI_OVER_TWO || north > CesiumMath.PI_OVER_TWO) {
            throw new DeveloperError('north must be in the interval [-Pi/2, Pi/2].');
        }

        var south = this.south;
        if (typeof south !== 'number') {
            throw new DeveloperError('south is required to be a number.');
        }

        if (south < -CesiumMath.PI_OVER_TWO || south > CesiumMath.PI_OVER_TWO) {
            throw new DeveloperError('south must be in the interval [-Pi/2, Pi/2].');
        }

        var west = this.west;
        if (typeof west !== 'number') {
            throw new DeveloperError('west is required to be a number.');
        }

        if (west < -Math.PI || west > Math.PI) {
            throw new DeveloperError('west must be in the interval [-Pi, Pi].');
        }

        var east = this.east;
        if (typeof east !== 'number') {
            throw new DeveloperError('east is required to be a number.');
        }

        if (east < -Math.PI || east > Math.PI) {
            throw new DeveloperError('east must be in the interval [-Pi, Pi].');
        }
    };

    /**
     * Computes the southwest corner of this extent.
     * @memberof Extent
     *
     * @param {Cartographic} [result] The object onto which to store the result.
     * @return {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
     */
    Extent.prototype.getSouthwest = function(result) {
        if (typeof result === 'undefined') {
            return new Cartographic(this.west, this.south);
        }
        result.longitude = this.west;
        result.latitude = this.south;
        result.height = 0.0;
        return result;
    };

    /**
     * Computes the northwest corner of this extent.
     * @memberof Extent
     *
     * @param {Cartographic} [result] The object onto which to store the result.
     * @return {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
     */
    Extent.prototype.getNorthwest = function(result) {
        if (typeof result === 'undefined') {
            return new Cartographic(this.west, this.north);
        }
        result.longitude = this.west;
        result.latitude = this.north;
        result.height = 0.0;
        return result;
    };

    /**
     * Computes the northeast corner of this extent.
     * @memberof Extent
     *
     * @param {Cartographic} [result] The object onto which to store the result.
     * @return {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
     */
    Extent.prototype.getNortheast = function(result) {
        if (typeof result === 'undefined') {
            return new Cartographic(this.east, this.north);
        }
        result.longitude = this.east;
        result.latitude = this.north;
        result.height = 0.0;
        return result;
    };

    /**
     * Computes the southeast corner of this extent.
     * @memberof Extent
     *
     * @param {Cartographic} [result] The object onto which to store the result.
     * @return {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
     */
    Extent.prototype.getSoutheast = function(result) {
        if (typeof result === 'undefined') {
            return new Cartographic(this.east, this.south);
        }
        result.longitude = this.east;
        result.latitude = this.south;
        result.height = 0.0;
        return result;
    };

    /**
     * Computes the center of this extent.
     * @memberof Extent
     *
     * @param {Cartographic} [result] The object onto which to store the result.
     * @return {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
     */
    Extent.prototype.getCenter = function(result) {
        if (typeof result === 'undefined') {
            return new Cartographic((this.west + this.east) * 0.5, (this.south + this.north) * 0.5);
        }
        result.longitude = (this.west + this.east) * 0.5;
        result.latitude = (this.south + this.north) * 0.5;
        result.height = 0.0;
        return result;
    };

    /**
     * Computes the intersection of this extent with the provided extent.
     * @memberof Extent
     *
     * @param otherExtent The extent to intersect with this extent.
     * @param {Extent} [result] The object onto which to store the result.
     * @return {Extent} The modified result parameter or a new Extent instance if none was provided.
     *
     * @exception {DeveloperError} otherExtent is required.
     */
    Extent.prototype.intersectWith = function(otherExtent, result) {
        if (typeof otherExtent === 'undefined') {
            throw new DeveloperError('otherExtent is required.');
        }
        var west = Math.max(this.west, otherExtent.west);
        var south = Math.max(this.south, otherExtent.south);
        var east = Math.min(this.east, otherExtent.east);
        var north = Math.min(this.north, otherExtent.north);
        if (typeof result === 'undefined') {
            return new Extent(west, south, east, north);
        }
        result.west = west;
        result.south = south;
        result.east = east;
        result.north = north;
        return result;
    };

    /**
     * Returns true if the provided cartographic is on or inside the extent, false otherwise.
     * @memberof Extent
     *
     * @param {Cartographic} cartographic The cartographic to test.
     * @returns {Boolean} true if the provided cartographic is inside the extent, false otherwise.
     *
     * @exception {DeveloperError} cartographic is required.
     */
    Extent.prototype.contains = function(cartographic) {
        if (typeof cartographic === 'undefined') {
            throw new DeveloperError('cartographic is required.');
        }
        return cartographic.longitude >= this.west &&
               cartographic.longitude <= this.east &&
               cartographic.latitude >= this.south &&
               cartographic.latitude <= this.north;
    };

    /**
     * Determines if the extent is empty, i.e., if <code>west >= east</code>
     * or <code>south >= north</code>.
     *
     * @memberof Extent
     *
     * @return {Boolean} True if the extent is empty; otherwise, false.
     */
    Extent.prototype.isEmpty = function() {
        return this.west >= this.east || this.south >= this.north;
    };

    var subsampleLlaScratch = new Cartographic();
    /**
     * Samples this Extent so that it includes a list of Cartesian points suitable for passing to
     * {@link BoundingSphere#fromPoints}.  Sampling is necessary to account
     * for extents that cover the poles or cross the equator.
     *
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to use.
     * @param {Array} [result] The array of Cartesians onto which to store the result.
     * @return {Array} The modified result parameter or a new Array of Cartesians instances if none was provided.
     */
    Extent.prototype.subsample = function(ellipsoid, result) {
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

        if (typeof result === 'undefined') {
            result = [];
        }
        var length = 0;

        var north = this.north;
        var south = this.south;
        var east = this.east;
        var west = this.west;

        var lla = subsampleLlaScratch;
        lla.longitude = west;
        lla.latitude = north;
        result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
        length++;

        lla.longitude = east;
        result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
        length++;

        lla.latitude = south;
        result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
        length++;

        lla.longitude = west;
        result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
        length++;

        if (north < 0.0) {
            lla.latitude = north;
        } else if (south > 0.0) {
            lla.latitude = south;
        } else {
            lla.latitude = 0.0;
        }

        for ( var i = 1; i < 8; ++i) {
            var temp = -Math.PI + i * CesiumMath.PI_OVER_TWO;
            if (west < temp && temp < east) {
                lla.longitude = temp;
                result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
                length++;
            }
        }

        if (lla.latitude === 0.0) {
            lla.longitude = west;
            result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
            length++;
            lla.longitude = east;
            result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
            length++;
        }
        result.length = length;
        return result;
    };

    /**
     * The largest possible extent.
     * @memberof Extent
     * @type Extent
    */
    Extent.MAX_VALUE = freezeObject(new Extent(-Math.PI, -CesiumMath.PI_OVER_TWO, Math.PI, CesiumMath.PI_OVER_TWO));

    return Extent;
});
