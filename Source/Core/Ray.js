/*global define*/
define(['./Cartesian3', './DeveloperError'], function(Cartesian3, DeveloperError) {
    "use strict";

    /**
     * Represents a ray that has an origin and extends infinitely in a given direction.
     *
     * @alias Ray
     * @constructor
     *
     * @param {Cartesian3} origin The origin of the ray.
     * @param {Cartesian3} direction The unit length direction of the ray.
     *
     * @exception {DeveloperError} origin is required.
     * @exception {DeveloperError} direction is required.
     */
    var Ray = function(origin, direction) {
        if (typeof origin === 'undefined') {
            throw new DeveloperException('origin is required');
        }

        if (typeof direction === 'undefined') {
            throw new DeveloperError('direction is required');
        }

        this.origin = origin;
        this.direction = direction.normalize();
    };

    /**
     * Returns a point along the ray given by r(t) = o + t*d, where o is the origin of the ray
     * and d is the direction.
     *
     * @memberof Ray
     *
     * @param {Number} [t=0.0] A scalar value.
     *
     * @returns {Cartesian3} The point along the ray.
     */
    Ray.prototype.getPoint = function(t) {
        t = (typeof t === 'undefined') ? 0.0 : t;
        return this.origin.add(this.direction.multiplyWithScalar(t));
    };

    return Ray;
});