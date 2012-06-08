/*global define*/
define(['../Core/DeveloperError'], function(DeveloperError) {
    "use strict";

    /**
     * DOC_TBA
     * @name SpringForce
     * @constructor
     */
    function SpringForce(template) {
        template = template || {};

        if (!template.particleOne || !template.particleTwo) {
            throw new DeveloperError('template.particleOne and template.particleTwo are required.');
        }

        this.particleOne = template.particleOne;
        this.particleTwo = template.particleTwo;

        // TODO: Throw if these are negative

        this.restLength = (typeof template.restLength === 'undefined') ? 1.0 : template.restLength;
        this.springConstant = (typeof template.springConstant === 'undefined') ? 1.0 : template.springConstant;
        this.dampingConstant = (typeof template.dampingConstant === 'undefined') ? 1.0 : template.dampingConstant;
    }

    /**
     * DOC_TBA
     * @memberof SpringForce
     */
    SpringForce.prototype.apply = function(particles) {
        // The entire list of particles is not needed.  The force on
        // each of the two particles connected by this spring is computed.

        // Hook's law:

        var a = this.particleOne;
        var b = this.particleTwo;
        var l = a.position.subtract(b.position); // vector from b to a
        var dl = a.velocity.subtract(b.velocity); // time derivative of l
        var ml = l.magnitude(); // magnitude of l
        var nl = l.divideByScalar(ml); // normalized l vector

        var s = this.springConstant * (ml - this.restLength); // spring force magnitude
        var d = this.dampingConstant * (dl.dot(l) / ml); // damping force magnitude

        var f = nl.multiplyWithScalar(-(s + d));

        // Apply equal and opposite forces
        a.force = a.force.add(f);
        b.force = b.force.add(f.negate());
    };

    return SpringForce;
});