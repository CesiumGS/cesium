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
     * Returns a duplicate of a Spherical.
     *
     * @param {Spherical} spherical The spherical to clone.
     * @return {Spherical} A new Spherical instance identical to the supplied instance.
     */
    Spherical.clone = function(spherical) {
        return new Spherical(spherical.clock, spherical.cone, spherical.magnitude);
    };

    /**
     * Modifies the provided spherical so that it is normalized.
     *
     * @param {Spherical} spherical The spherical to be normalized.
     * @return {Spherical} The instances passed in, now normalized.
     */
    Spherical.prototype.normalize = function(spherical) {
        spherical.magnitude = 1.0;
        return spherical;
    };

    /**
     * Returns a duplicate of this Spherical.
     *
     * @return {Spherical} A new Spherical instance identical to this instance.
     */
    Spherical.prototype.clone = function() {
        return Spherical.clone(this);
    };

    /**
     * Returns a new instance which represents this spherical, normalized.
     *
     * @return {Spherical} A new, normalized, instance.
     */
    Spherical.prototype.normalize = function() {
        return Spherical.normalize(Spherical.clone(this));
    };

    /**
     * Returns true if this spherical is equal to the provided spherical, false otherwise.
     *
     * @param {Spherical} other The Spherical to be compared.
     *
     * @return {Boolean} true if this spherical is equal to the provided spherical, false otherwise.
     */
    Spherical.prototype.equals = function(other) {
        return (this.clock === other.clock) && (this.cone === other.cone) && (this.magnitude === other.magnitude);
    };

    /**
     * Returns true if this spherical is within the provided epsilon of the provided spherical, false otherwise.
     *
     * @param {Spherical} other The Spherical to be compared.
     * @param {Number} epsilon The epsilon to compare against.
     *
     * @return {Boolean} true if this spherical is within the provided epsilon of the provided spherical, false otherwise.
     */
    Spherical.prototype.equalsEpsilon = function(other, epsilon) {
        epsilon = epsilon || 0.0;
        return (Math.abs(this.clock - other.clock) <= epsilon) && (Math.abs(this.cone - other.cone) <= epsilon) && (Math.abs(this.magnitude - other.magnitude) <= epsilon);
    };

    /**
     * Returns a string representing this instance in the format (clock, cone, magnitude).
     *
     * @memberof Spherical
     * @return {String} A string representing this instance.
     */
    Spherical.prototype.toString = function() {
        return '(' + this.clock + ', ' + this.cone + ', ' + this.magnitude + ')';
    };

    return Spherical;
});
