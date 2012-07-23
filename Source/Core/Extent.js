/*global define*/
define([
        '../Core/defaultValue',
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/Math',
        '../Core/Occluder',
        '../Core/Rectangle'
    ], function(
        defaultValue,
        BoundingSphere,
        Cartesian3,
        Cartographic,
        DeveloperError,
        Ellipsoid,
        CesiumMath,
        Occluder,
        Rectangle) {
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

    function getPosition(lla, ellipsoid, time, projection) {
        if (typeof time === 'undefined' || time === 0.0 || typeof projection === 'undefined') {
            return ellipsoid.cartographicToCartesian(lla);
        }

        var twod = projection.project(lla);
        twod = new Cartesian3(0.0, twod.x, twod.y);
        return twod.lerp(ellipsoid.cartographicToCartesian(lla), time);
    }

    function computePositions(extent, ellipsoid, time, projection) {
        if (typeof extent === 'undefined') {
            throw new DeveloperError('extent is required.');
        }

        Extent.validate(extent);

        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        var positions = [];

        var lla = new Cartographic(extent.west, extent.north, 0.0);
        positions.push(getPosition(lla, ellipsoid, time, projection));
        lla.longitude = extent.east;
        positions.push(getPosition(lla, ellipsoid, time, projection));
        lla.latitude = extent.south;
        positions.push(getPosition(lla, ellipsoid, time, projection));
        lla.longitude = extent.west;
        positions.push(getPosition(lla, ellipsoid, time, projection));

        if (extent.north < 0.0) {
            lla.latitude = extent.north;
        } else if (extent.south > 0.0) {
            lla.latitude = extent.south;
        } else {
            lla.latitude = 0.0;
        }

        for ( var i = 1; i < 8; ++i) {
            var temp = -Math.PI + i * CesiumMath.PI_OVER_TWO;
            if (extent.west < temp && temp < extent.east) {
                lla.longitude = temp;
                positions.push(getPosition(lla, ellipsoid, time, projection));
            }
        }

        if (lla.latitude === 0.0) {
            lla.longitude = extent.west;
            positions.push(getPosition(lla, ellipsoid, time, projection));
            lla.longitude = extent.east;
            positions.push(getPosition(lla, ellipsoid, time, projection));
        }

        return positions;
    }

    /**
     * DOC_TBA
     *
     * @param {Extent} extent DOC_TBA
     * @param {Ellipsoid} ellipsoid DOC_TBA
     * @param {Number} time DOC_TBA
     * @param {Object} projection DOC_TBA
     *
     * @returns {BoundingSphere} DOC_TBA
     */
    Extent.computeMorphBoundingSphere = function(extent, ellipsoid, time, projection) {
        return new BoundingSphere(computePositions(extent, ellipsoid, time, projection));
    };

    /**
     * DOC_TBA
     *
     * @param {Extent} extent DOC_TBA
     * @param {Ellipsoid} ellipsoid DOC_TBA
     * @returns {BoundingSphere} DOC_TBA
     */
    Extent.compute3DBoundingSphere = function(extent, ellipsoid) {
        return new BoundingSphere(computePositions(extent, ellipsoid));
    };

    /**
     * DOC_TBA
     *
     * @param {Extent} extent DOC_TBA
     * @param {Ellipsoid} ellipsoid DOC_TBA
     *
     * @returns {Object} DOC_TBA
     */
    Extent.computeOccludeePoint = function(extent, ellipsoid) {
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        var positions = computePositions(extent, ellipsoid);
        var bs = new BoundingSphere(positions);

        // TODO: get correct ellipsoid center
        var ellipsoidCenter = Cartesian3.ZERO;
        if (!ellipsoidCenter.equals(bs.center)) {
            return Occluder.getOccludeePoint(new BoundingSphere(ellipsoidCenter, ellipsoid.getMinimumRadius()), bs.center, positions);
        }
        return {
            valid : false
        };
    };

    /**
     * DOC_TBA
     *
     * @param {Extent} extent DOC_TBA
     * @param {Object} projection DOC_TBA
     * @returns {Rectangle} DOC_TBA
     */
    Extent.computeBoundingRectangle = function(extent, projection) {
        if (typeof extent === 'undefined') {
            throw new DeveloperError('extent is required.');
        }

        Extent.validate(extent);

        if (typeof projection === 'undefined') {
            throw new DeveloperError('projection is required.');
        }

        var lla = new Cartographic(extent.west, extent.south);
        var lowerLeft = projection.project(lla);
        lla.longitude = extent.east;
        lla.latitude = extent.north;
        var upperRight = projection.project(lla);

        var diagonal = upperRight.subtract(lowerLeft);
        return new Rectangle(lowerLeft.x, lowerLeft.y, diagonal.x, diagonal.y);
    };

    /**
     * DOC_TBA
     *
     * @param {Extent} extent DOC_TBA
     * @param {Object} projection DOC_TBA
     * @returns {BoundingSphere} DOC_TBA
     */
    Extent.compute2DBoundingSphere = function(extent, projection) {
        var rect = Extent.computeBoundingRectangle(extent, projection);
        var center = new Cartesian3((2.0 * rect.x + rect.width) * 0.5, (2.0 * rect.y + rect.height) * 0.5, 0.0);
        var radius = Math.sqrt(rect.width * rect.width + rect.height * rect.height) * 0.5;
        return new BoundingSphere(center, radius);
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

    /**
     * The largest possible extent.
     */
    Extent.MAX_VALUE = Object.freeze(new Extent(-Math.PI, -CesiumMath.PI_OVER_TWO, Math.PI, CesiumMath.PI_OVER_TWO));

    return Extent;
});