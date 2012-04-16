/*global define*/
define(function() {
    "use strict";

    function ViscousDrag(coefficientOfDrag) {
        // TODO:  throw if coefficient is negative?  Zero (no drag) is OK, I guess.
        this.coefficientOfDrag = coefficientOfDrag || 1.0;
    }

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