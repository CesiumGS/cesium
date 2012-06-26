/*global define*/
/**
 * @exports Scene/GravityForce
 */
define(['../Core/Ellipsoid'], function(Ellipsoid) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias GravityForce
     * @constructor
     */
    var GravityForce = function(template) {
        template = template || {};
        this.ellipsoid = template.ellipsoid || Ellipsoid.WGS84;
        this.gravitationalConstant = template.gravitationalConstant || 1.0;
    };

    /**
     * DOC_TBA
     * @memberof GravityForce
     */
    GravityForce.prototype.apply = function(particles) {
        if (particles) {
            var ellipsoid = this.ellipsoid;
            var gravitationalConstant = this.gravitationalConstant;

            var length = particles.length;
            for ( var i = 0; i < length; ++i) {
                var particle = particles[i];

                var positionOnSurface = ellipsoid.scaleToGeodeticSurface(particle.position);
                var upNormal = ellipsoid.geodeticSurfaceNormal(positionOnSurface);
                var downNormal = upNormal.negate();
                var force = downNormal.multiplyWithScalar(gravitationalConstant);

                particle.force = particle.force.add(force.multiplyWithScalar(particle.mass)); // f += m * g
            }
        }
    };

    return GravityForce;
});