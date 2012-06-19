/*global define*/
define(function() {
    "use strict";

    /**
     * A set of curvilinear 3-dimensional coordinates.
     *
     * @name Spherical
     * @constructor
     *
     * @param {Number} [clock=0.0] The angular coordinate lying in the xy-plane measured from the positive x-axis and toward the positive y-axis.
     * @param {Number} [cone=0.0] The angular coordinate measured from the positive z-axis and toward the negative z-axis.
     * @param {Number} [magnitude=1.0] The linear coordinate measured from the origin.
     */
    function Spherical(clock, cone, magnitude) {
        this.clock = clock || 0.0;
        this.cone = cone || 0.0;
        this.magnitude = magnitude || 1.0;
    }

    /**
     * Creates a duplicate of a Spherical.
     * @memberof Spherical
     *
     * @param {Spherical} spherical The spherical to clone.
     * @param {Spherical} [result] The object to store the result into, if undefined a new instance will be created.
     *
     * @return The modified result parameter or a new instance if result was undefined.
     */
    Spherical.clone = function(spherical, result) {
        if (typeof result === 'undefined') {
            result = new Spherical();
        }
        result.clock = spherical.clock;
        result.cone = spherical.cone;
        result.magnitude = spherical.magnitude;
        return result;
    };

    /**
     * Computes the normalized version of the provided spherical.
     * @memberof Spherical
     *
     * @param {Spherical} spherical The spherical to be normalized.
     * @param {Spherical} [result] The object to store the result into, if undefined a new instance will be created.
     *
     * @return The modified result parameter or a new instance if result was undefined.
     */
    Spherical.normalize = function(spherical, result) {
        if (typeof result === 'undefined') {
            result = new Spherical();
        }
        result.clock = spherical.clock;
        result.cone = spherical.cone;
        result.magnitude = 1.0;
        return result;
    };

    /**
     * Returns true if the first spherical is equal to the second spherical, false otherwise.
     * @memberof Spherical
     *
     * @param {Spherical} lhs The first Spherical to be compared.
     * @param {Spherical} rhs The second Spherical to be compared.
     *
     * @return true if the first spherical is equal to the second spherical, false otherwise.
     */
    Spherical.equals = function(lhs, rhs) {
        return (lhs === rhs) ||
               ((typeof lhs !== 'undefined') &&
                (typeof rhs !== 'undefined') &&
                (lhs.clock === rhs.clock) &&
                (lhs.cone === rhs.cone) &&
                (lhs.magnitude === rhs.magnitude));
    };

    /**
     * Returns true if the first spherical is within the provided epsilon of the second spherical, false otherwise.
     * @memberof Spherical
     *
     * @param {Spherical} lhs The first Spherical to be compared.
     * @param {Spherical} rhs The second Spherical to be compared.
     * @param {Number} [epsilon=0.0] The epsilon to compare against.
     *
     * @return true if the first spherical is within the provided epsilon of the second spherical, false otherwise.
     */
    Spherical.equalsEpsilon = function(lhs, rhs, epsilon) {
        epsilon = epsilon || 0.0;
        return (lhs === rhs) ||
               ((typeof lhs !== 'undefined') &&
                (typeof rhs !== 'undefined') &&
                (Math.abs(lhs.clock - rhs.clock) <= epsilon) &&
                (Math.abs(lhs.cone - rhs.cone) <= epsilon) &&
                (Math.abs(lhs.magnitude - rhs.magnitude) <= epsilon));
    };

    /**
     * Returns a string representing the provided instance in the format (clock, cone, magnitude).
     * @memberof Spherical
     *
     * @param {Spherical} spherical The object to be converted.
     *
     * @return A string representing the provided instance.
     */
    Spherical.toString = function(spherical) {
        return '(' + spherical.clock + ', ' + spherical.cone + ', ' + spherical.magnitude + ')';
    };

    /**
     * Creates a duplicate of this Spherical.
     * @memberof Spherical
     *
     * @param {Spherical} [result] The object to store the result into, if undefined a new instance will be created.
     *
     * @return The modified result parameter or a new instance if result was undefined.
     */
    Spherical.prototype.clone = function(result) {
        return Spherical.clone(this, result);
    };

    /**
     * Computes the normalized version of this spherical.
     * @memberof Spherical
     *
     * @param {Spherical} [result] The object to store the result into, if undefined a new instance will be created.
     *
     * @return The modified result parameter or a new instance if result was undefined.
     */
    Spherical.prototype.normalize = function(result) {
        return Spherical.normalize(this, result);
    };

    /**
     * Returns true if this spherical is equal to the provided spherical, false otherwise.
     * @memberof Spherical
     *
     * @param {Spherical} other The Spherical to be compared.
     *
     * @return true if this spherical is equal to the provided spherical, false otherwise.
     */
    Spherical.prototype.equals = function(other) {
        return Spherical.equals(this, other);
    };

    /**
     * Returns true if this spherical is within the provided epsilon of the provided spherical, false otherwise.
     * @memberof Spherical
     *
     * @param {Spherical} other The Spherical to be compared.
     * @param {Number} epsilon The epsilon to compare against.
     *
     * @return true if this spherical is within the provided epsilon of the provided spherical, false otherwise.
     */
    Spherical.prototype.equalsEpsilon = function(other, epsilon) {
        return Spherical.equalsEpsilon(this, other, epsilon);
    };

    /**
     * Returns a string representing this instance in the format (clock, cone, magnitude).
     * @memberof Spherical
     *
     * @return A string representing this instance.
     */
    Spherical.prototype.toString = function() {
        return Spherical.toString(this);
    };

    return Spherical;
});
