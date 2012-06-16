/*global define*/
define(function() {
    "use strict";

    function Spherical(clock, cone, magnitude) {
        this.clock = clock || 0.0;
        this.cone = cone || 0.0;
        this.magnitude = magnitude || 1.0;
    }

    Spherical.clone = function(spherical) {
        return new Spherical(spherical.clock, spherical.cone, spherical.magnitude);
    };

    Spherical.prototype.clone = function() {
        return new Spherical(this.clock, this.cone, this.magnitude);
    };

    Spherical.prototype.normalize = function() {
        return new Spherical(this.clock, this.cone, 1.0);
    };

    Spherical.prototype.equals = function(other) {
        return (this.clock === other.clock) && (this.cone === other.cone) && (this.magnitude === other.magnitude);
    };

    Spherical.prototype.equalsEpsilon = function(other, epsilon) {
        epsilon = epsilon || 0.0;
        return (Math.abs(this.clock - other.clock) <= epsilon) && (Math.abs(this.cone - other.cone) <= epsilon) && (Math.abs(this.magnitude - other.magnitude) <= epsilon);
    };

    Spherical.prototype.toString = function() {
        return '(' + this.clock + ', ' + this.cone + ', ' + this.magnitude + ')';
    };

    return Spherical;
});
