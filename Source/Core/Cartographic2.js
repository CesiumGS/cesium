/*global define*/
define(function() {
    "use strict";

    /**
     * A position defined by longitude and latitude; height is assumed to be zero.
     * <p>
     * When called with no arguments, the position is initialized to (0.0, 0.0).
     * When called with one Cartographic3 argument, p, the position is initialized to (p.longitude, g.latitude); p.height is ignored.
     * When called with two numeric arguments, longitude and latitude, the position is initialized to (longitude, latitude).
     * </p>
     *
     * @name Cartographic2
     * @constructor
     * @see Cartographic3
     */
    function Cartographic2() {
        var longitude = 0.0;
        var latitude = 0.0;

        if (arguments.length === 1) {
            longitude = arguments[0].longitude;
            latitude = arguments[0].latitude;
        } else if (arguments.length > 1) {
            longitude = arguments[0];
            latitude = arguments[1];
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
    }

    /**
     * An immutable Cartographic2 instance initialized to (0.0, 0.0).
     *
     * @memberof Cartographic2
     */
    Cartographic2.ZERO = Object.freeze(new Cartographic2(0.0, 0.0));

    /**
     * Returns a duplicate of a Cartographic2 instance.
     *
     * @memberof Cartographic2
     * @return {Cartographic2} A new copy of the Cartographic2 instance received as an argument.
     */
    Cartographic2.prototype.clone = function() {
        return new Cartographic2(this.longitude, this.latitude);
    };

    /**
     * Returns <code>true</code> if this instance equals other.
     *
     * @memberof Cartographic2
     *
     * @param {Cartographic2} other The cartographic position to compare for equality.
     *
     * @return {Boolean} <code>true</code> if the positions are equal; otherwise, false.
     */
    Cartographic2.prototype.equals = function(other) {
        return (this.longitude === other.longitude) && (this.latitude === other.latitude);
    };

    /**
     * Returns <code>true</code> if this instance equals other within the specified epsilon.
     *
     * @memberof Cartographic2
     *
     * @param {Cartographic2} other The cartographic position to compare for equality.
     * @param {Number} [epsilon=0.0] The epsilon to use for equality testing.
     *
     * @return {Boolean} <code>true</code> if the position are equal within the specified epsilon; otherwise, <code>false</code>.
     */
    Cartographic2.prototype.equalsEpsilon = function(other, epsilon) {
        epsilon = epsilon || 0.0;
        return (Math.abs(this.longitude - other.longitude) <= epsilon) && (Math.abs(this.latitude - other.latitude) <= epsilon);
    };

    /**
     * Returns a string representing this instance in the format (longitude, latitude).
     *
     * @memberof Cartographic2
     * @return {String} Returns a string representing this instance.
     */
    Cartographic2.prototype.toString = function() {
        return '(' + this.longitude + ', ' + this.latitude + ')';
    };

    return Cartographic2;
});
