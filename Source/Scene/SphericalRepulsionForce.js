/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/Cartesian3'
    ], function(
        DeveloperError,
        Cartesian3) {
    "use strict";

    /**
     * DOC_TBA
     * @alias SphericalRepulsionForce
     * @constructor
     */
    function SphericalRepulsionForce(template) {
        template = template || {};
        template.center = template.center || Cartesian3.ZERO;
        template.radius = (typeof template.radius === 'undefined') ? 1.0 : template.radius;

        if (template.radius < 0) {
            throw new DeveloperError('template.radius must be nonnegative.');
        }

        this.center = new Cartesian3(template.center.x, template.center.y, template.center.z);
        this.radius = template.radius;
    }

    /**
     * DOC_TBA
     * @memberof SphericalRepulsionForce
     */
    SphericalRepulsionForce.prototype.apply = function(particles) {
        if (particles) {
            var center = this.center;
            var radius = this.radius;
            var length = particles.length;
            for ( var i = 0; i < length; ++i) {
                var particle = particles[i];

                var centerToPosition = particle.position.subtract(center);
                var magnitudeDifference = radius - centerToPosition.magnitude();

                // Repel if particle is in sphere
                if (magnitudeDifference > 0) {
                    particle.force = particle.force.add(centerToPosition.normalize().multiplyByScalar(magnitudeDifference));
                }
            }
        }
    };

    return SphericalRepulsionForce;
});