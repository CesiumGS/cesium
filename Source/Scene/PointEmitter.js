/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/Matrix4',
        '../Core/Math',
        './Particle',
        './PointPlacer'
    ], function(
        defaultValue,
        defined,
        Cartesian2,
        Cartesian3,
        Color,
        Matrix4,
        CesiumMath,
        Particle,
        PointPlacer
        ) {
    "use strict";

    var PointEmitter = function(options) {
        this.modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));

        this.placer = defaultValue(options.placer, new PointPlacer({}));
    };

    function random(a, b) {
        return CesiumMath.nextRandomNumber() * (b - a) + a;
    }

    PointEmitter.prototype.emit = function(system, numToEmit) {

        for (var i = 0; i < numToEmit; ++i) {
            // Create the new particle.
            var particle = new Particle({
            });

            // Place the particle with the placer.
            this.placer.place( particle );

            //For the velocity we need to add it to the original position and then multiply by point.
            var tmp = new Cartesian3();
            Cartesian3.add(particle.position, particle.velocity, tmp);
            Matrix4.multiplyByPoint(this.modelMatrix, tmp, tmp);

            // Change the position to be in world coordinates
            particle.position = Matrix4.multiplyByPoint(this.modelMatrix, particle.position, particle.position);

            var worldVelocity = new Cartesian3();
            Cartesian3.subtract(tmp, particle.position, worldVelocity);
            Cartesian3.normalize(worldVelocity, worldVelocity);
            particle.velocity = worldVelocity;

            // Add the particle to the particle system.
            system.add(particle);
        }
    };

    return PointEmitter;
});