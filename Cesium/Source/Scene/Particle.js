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
     * @name Particle
     * @constructor
     */
    function Particle(template) {
        template = template || {};
        template.position = template.position || Cartesian3.getZero();
        template.velocity = template.velocity || Cartesian3.getZero(); // initial velocity
        template.mass = (typeof template.mass === "undefined") ? 1.0 : template.mass;

        if (template.mass < 0) {
            throw new DeveloperError("template.mass must be positive.", "template");
        }

        this.position = new Cartesian3(template.position.x, template.position.y, template.position.z);
        this.velocity = new Cartesian3(template.velocity.x, template.velocity.y, template.velocity.z);
        this.mass = template.mass;
        this.force = Cartesian3.getZero(); // force accumulator
    }

    return Particle;
});