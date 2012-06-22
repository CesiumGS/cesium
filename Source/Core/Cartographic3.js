/*global define*/
define(function() {
    "use strict";

    /**
     * A position defined by longitude, latitude, and height.
     * <p>
     * When called with no arguments, the position is initialized to (0.0, 0.0, 0.0).
     * When called with one Cartographic2 argument, p, the position is initialized to (p.longitude, g.latitude, 0.0).
     * When called with two numeric arguments, longitude and latitude, the position is initialized to (longitude, latitude, 0.0).
     * When called with two numeric arguments; longitude, latitude, and height; the position is initialized to (longitude, latitude, height).
     * </p>
     *
     * @name Cartographic3
     * @constructor
     *
     * @see Cartographic2
     */
    function Cartographic3() {
        var longitude = 0.0;
        var latitude = 0.0;
        var height = 0.0;

        if (arguments.length === 1) {
            longitude = arguments[0].longitude;
            latitude = arguments[0].latitude;
        } else if (arguments.length === 2) {
            longitude = arguments[0];
            latitude = arguments[1];
        } else if (arguments.length > 2) {
            longitude = arguments[0];
            latitude = arguments[1];
            height = arguments[2];
        }

        /**
         * DOC_TBA
         *
         * @type Number
         *
         * @see Cartographic2#latitude
         */
        this.longitude = longitude;

        /**
         * DOC_TBA
         *
         * @type Number
         *
         * @see Cartographic2#longitude
         */
        this.latitude = latitude;

        /**
         * DOC_TBA
         *
         * @type Number
         */
        this.height = height;
    }

    /**
     * An immutable Cartographic3 instance initialized to (0.0, 0.0, 0.0).
     *
     * @memberof Cartographic3
     */
    Cartographic3.ZERO = Object.freeze(new Cartographic3(0.0, 0.0, 0.0));

    /**
     * Returns a duplicate of a Cartographic3 instance.
     *
     * @memberof Cartographic3
     * @return {Cartographic3} A new copy of the Cartographic3 instance received as an argument.
     */
    Cartographic3.prototype.clone = function() {
        return new Cartographic3(this.longitude, this.latitude, this.height);
    };

    /**
     * Returns <code>true</code> if this instance equals other.
     *
     * @memberof Cartographic3
     *
     * @param {Cartographic3} other The cartographic position to compare for equality.
     *
     * @return {Boolean} <code>true</code> if the positions are equal; otherwise, false.
     */
    Cartographic3.prototype.equals = function(other) {
        return (this.longitude === other.longitude) && (this.latitude === other.latitude) && (this.height === other.height);
    };

    /**
     * Returns <code>true</code> if this instance equals other within the specified epsilon.
     *
     * @memberof Cartographic3
     *
     * @param {Cartographic3} other The cartographic position to compare for equality.
     * @param {Number} [epsilon=0.0] The epsilon to use for equality testing.
     *
     * @return {Boolean} <code>true</code> if the position are equal within the specified epsilon; otherwise, <code>false</code>.
     */
    Cartographic3.prototype.equalsEpsilon = function(other, epsilon) {
        epsilon = epsilon || 0.0;
        return (Math.abs(this.longitude - other.longitude) <= epsilon) &&
               (Math.abs(this.latitude - other.latitude) <= epsilon) &&
               (Math.abs(this.height - other.height) <= epsilon);
    };

    /**
     * Returns a string representing this instance in the format (longitude, latitude, height).
     *
     * @memberof Cartographic3
     *
     * @return {String} Returns a string representing this instance.
     */
    Cartographic3.prototype.toString = function() {
        return '(' + this.longitude + ', ' + this.latitude + ', ' + this.height + ')';
    };

    return Cartographic3;
});
