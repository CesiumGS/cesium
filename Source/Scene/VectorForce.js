/*global define*/
/**
 * @exports Scene/VectorForce
 */
define([
        '../Core/DeveloperError',
        '../Core/Cartesian3'
    ], function(
        DeveloperError,
        Cartesian3) {
    "use strict";

    /**
     * DOC_TBA
     * @alias VectorForce
     * @constructor
     */
    var VectorForce = function(template) {
        template = template || {};
        template.vector = template.vector || Cartesian3.UNIT_Z.negate();

        if (!template.particle) {
            throw new DeveloperError('template.particle is required.');
        }

        this.vector = new Cartesian3(template.vector.x, template.vector.y, template.vector.z);
        this.particle = template.particle;
    };

    /**
     * DOC_TBA
     * @memberof VectorForce
     */
    VectorForce.prototype.apply = function(particles) {
        var particle = this.particle;
        particle.force = particle.force.add(this.vector);
    };

    return VectorForce;
});