/*global define*/
define([
        './Cartographic',
        './DeveloperError',
        './freezeObject',
        './Math'
    ], function(
        Cartographic,
        DeveloperError,
        freezeObject,
        CesiumMath) {
    "use strict";

    /**
     * A two dimensional region specified as longitude and latitude coordinates.
     *
     * @alias Extent
     * @constructor
     *
     * @param {Number} west The westernmost longitude in the range [-Pi, Pi].
     * @param {Number} south The southernmost latitude in the range [-Pi/2, Pi/2].
     * @param {Number} east The easternmost longitude in the range [-Pi, Pi].
     * @param {Number} north The northernmost latitude in the range [-Pi/2, Pi/2].
     *
     * @exception {DeveloperError} One of the parameters is out of range.
     */
    var Extent = function(west, south, east, north) {
        /**
         * The northernmost latitude.
         *
         * @type Number
         */
        this.north = north;

        /**
         * The southernmost latitude.
         *
         * @type Number
         */
        this.south = south;

        /**
         * The westernmost longitude.
         *
         * @type Number
         */
        this.west = west;

        /**
         * The easternmost longitude.
         *
         * @type Number
         */
        this.east = east;

        Extent.validate(this);
    };

    /**
     * Returns a duplicate of this Extent.
     *
     * @return {Extent} A new Extent instance.
     */
    Extent.prototype.clone = function() {
        return new Extent(this.west, this.south, this.east, this.north);
    };

    /**
     * Checks that an {@link Extent}'s members are in the proper ranges, north is greater than
     * south and east is greater than west.
     *
     * @param {Extent} extent The extent to be checked for validity.
     *
     * @exception {DeveloperError} <code>extent</code> is required and must have north, south, east and west attributes.
     * @exception {DeveloperError} <code>extent.north</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
     * @exception {DeveloperError} <code>extent.south</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
     * @exception {DeveloperError} <code>extent.east</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
     * @exception {DeveloperError} <code>extent.west</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
     */
    Extent.validate = function(extent) {
        if (typeof extent === 'undefined') {
            throw new DeveloperError('extent is required.');
        }

        var north = extent.north;
        if (typeof north === 'undefined') {
            throw new DeveloperError('extent.north is required.');
        }

        if (north < -CesiumMath.PI_OVER_TWO || north > CesiumMath.PI_OVER_TWO) {
            throw new DeveloperError('extent.north must be in the interval [-Pi/2, Pi/2].');
        }

        var south = extent.south;
        if (typeof south === 'undefined') {
            throw new DeveloperError('extent.south is required.');
        }

        if (south < -CesiumMath.PI_OVER_TWO || south > CesiumMath.PI_OVER_TWO) {
            throw new DeveloperError('extent.south must be in the interval [-Pi/2, Pi/2].');
        }

        var west = extent.west;
        if (typeof west === 'undefined') {
            throw new DeveloperError('extent.west is required.');
        }

        if (west < -Math.PI || west > Math.PI) {
            throw new DeveloperError('extent.west must be in the interval [-Pi, Pi].');
        }

        var east = extent.east;
        if (typeof east === 'undefined') {
            throw new DeveloperError('extent.east is required.');
        }

        if (east < -Math.PI || east > Math.PI) {
            throw new DeveloperError('extent.east must be in the interval [-Pi, Pi].');
        }
    };

    /**
     * Gets a {@link Cartographic} containing the southwest corner of this extent.
     */
    Extent.prototype.getSouthwest = function() {
        return new Cartographic(this.west, this.south);
    };

    /**
     * Gets a {@link Cartographic} containing the northwest corner of this extent.
     */
    Extent.prototype.getNorthwest = function() {
        return new Cartographic(this.west, this.north);
    };

    /**
     * Gets a {@link Cartographic} containing the northeast corner of this extent.
     */
    Extent.prototype.getNortheast = function() {
        return new Cartographic(this.east, this.north);
    };

    /**
     * Gets a {@link Cartographic} containing the southeast corner of this extent.
     */
    Extent.prototype.getSoutheast = function() {
        return new Cartographic(this.east, this.south);
    };

    Extent.prototype.subsample = function(ellipsoid) {
        var positions = [];

        var lla = new Cartographic(this.west, this.north);
        positions.push(ellipsoid.cartographicToCartesian(lla));
        lla.longitude = this.east;
        positions.push(ellipsoid.cartographicToCartesian(lla));
        lla.latitude = this.south;
        positions.push(ellipsoid.cartographicToCartesian(lla));
        lla.longitude = this.west;
        positions.push(ellipsoid.cartographicToCartesian(lla));

        if (this.north < 0.0) {
            lla.latitude = this.north;
        } else if (this.south > 0.0) {
            lla.latitude = this.south;
        } else {
            lla.latitude = 0.0;
        }

        for ( var i = 1; i < 8; ++i) {
            var temp = -Math.PI + i * CesiumMath.PI_OVER_TWO;
            if (this.west < temp && temp < this.east) {
                lla.longitude = temp;
                positions.push(ellipsoid.cartographicToCartesian(lla));
            }
        }

        if (lla.latitude === 0.0) {
            lla.longitude = this.west;
            positions.push(ellipsoid.cartographicToCartesian(lla));
            lla.longitude = this.east;
            positions.push(ellipsoid.cartographicToCartesian(lla));
        }

        return positions;
    };

    /**
     * Gets a {@link Cartographic} containing the center of this extent.
     */
    Extent.prototype.getCenter = function() {
        return new Cartographic((this.west + this.east) / 2.0, (this.south + this.north) / 2.0);
    };

    Extent.prototype.contains = function(cartographicPosition) {
        return cartographicPosition.longitude >= this.west &&
               cartographicPosition.longitude <= this.east &&
               cartographicPosition.latitude >= this.south &&
               cartographicPosition.latitude <= this.north;
    };

    Extent.prototype.intersectWith = function(otherExtent) {
        var north = Math.min(this.north, otherExtent.north);
        var east = Math.min(this.east, otherExtent.east);
        var south = Math.max(this.south, otherExtent.south);
        var west = Math.max(this.west, otherExtent.west);
        return new Extent(west, south, east, north);
    };

    /**
     * The largest possible extent.
     */
    Extent.MAX_VALUE = freezeObject(new Extent(-Math.PI, -CesiumMath.PI_OVER_TWO, Math.PI, CesiumMath.PI_OVER_TWO));

    return Extent;
});
