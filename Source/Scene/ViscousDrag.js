/*global define*/
/**
 * @exports Scene/ViscousDrag
 */
define(function() {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias ViscousDrag
     * @constructor
     *
     * @param {Number} coefficientOfDrag
     */
    var ViscousDrag = function(coefficientOfDrag) {
        // TODO:  throw if coefficient is negative?  Zero (no drag) is OK, I guess.
        this.coefficientOfDrag = coefficientOfDrag || 1.0;
    };

    /**
     * DOC_TBA
     * @memberof ViscousDrag
     *
     * @param particles
     */
    ViscousDrag.prototype.apply = function(particles) {
        if (particles) {
            var negativeCoefficientOfDrag = -this.coefficientOfDrag;
            var length = particles.length;
            for ( var i = 0; i < length; ++i) {
                var particle = particles[i];

                particle.force = particle.force.add(particle.velocity.multiplyWithScalar(negativeCoefficientOfDrag)); // f = -(kd)(v)
            }
        }
    };

    return ViscousDrag;
});