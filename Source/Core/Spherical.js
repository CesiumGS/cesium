/*global define*/
define([
        'require'
       ], function(
         require) {
    "use strict";

    var Cartesian3 = {};
    Cartesian3.fromSpherical = function(spherical) {
        //because of the circular reference between Spherical and Cartesian3,
        //we need to require Cartesian3 later and replace our reference
        Cartesian3 = require('./Cartesian3');
        return Cartesian3.fromSpherical(spherical);
    };

    function Spherical(clock, cone, magnitude) {
        this.clock = clock || 0.0;
        this.cone = cone || 0.0;
        this.magnitude = magnitude || 1.0;
    }

    Spherical.fromCartesian3 = function(cartesian3) {
        var x = cartesian3.x;
        var y = cartesian3.y;
        var z = cartesian3.z;
        var radialSquared = x * x + y * y;
        var clock = Math.atan2(y, x);
        var cone = Math.atan2(Math.sqrt(radialSquared), z);
        var magnitude = Math.sqrt(radialSquared + z * z);
        return new Spherical(clock, cone, magnitude);
    };

    Spherical.clone = function(spherical) {
        return new Spherical(spherical.clock, spherical.cone, spherical.magnitude);
    };

    Spherical.toCartesian3 = function(spherical) {
        return Cartesian3.fromSpherical(spherical);
    };

    Spherical.prototype.clone = function() {
        return new Spherical(this.clock, this.cone, this.magnitude);
    };

    Spherical.prototype.toCartesian = function() {
        return Spherical.fromSpherical(this);
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
