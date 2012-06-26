/*global define*/
/**
 * @exports Scene/Particle
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
     * @alias Particle
     * @constructor
     */
    var Particle = function(template) {
        template = template || {};
        template.position = template.position || Cartesian3.ZERO;
        template.velocity = template.velocity || Cartesian3.ZERO; // initial velocity
        template.mass = (typeof template.mass === 'undefined') ? 1.0 : template.mass;

        if (template.mass < 0) {
            throw new DeveloperError('template.mass must be positive.');
        }

        this.position = new Cartesian3(template.position.x, template.position.y, template.position.z);
        this.velocity = new Cartesian3(template.velocity.x, template.velocity.y, template.velocity.z);
        this.mass = template.mass;
        this.force = Cartesian3.ZERO; // force accumulator
    };

    return Particle;
});