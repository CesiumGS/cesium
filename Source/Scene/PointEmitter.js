/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Matrix4',
        '../Core/Math',
        './Particle'
    ], function(
        defaultValue,
        defined,
        Cartesian2,
        Cartesian3,
        Matrix4,
        CesiumMath,
        Particle) {
    "use strict";

    var PointEmitter = function(options) {
        this.initialMass = defaultValue(options.initialMass, 1.0);
        this.massVariance = defaultValue(options.massVariance, 0.0);

        this.initialDirection = Cartesian3.clone(defaultValue(options.initialDirection, Cartesian3.UNIT_Z));
        this.directionVariance = Cartesian3.clone(defaultValue(options.directionVariance, Cartesian3.ZERO));

        this.initialSpeed = defaultValue(options.initialSpeed, 1.0);
        this.speedVariance = defaultValue(options.speedVariance, 0.0);

        this.initialLife = defaultValue(options.initialLife, Number.MAX_VALUE);
        this.lifeVariance = defaultValue(options.lifeVariance, 0.0);

        this.modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));

        this.image = defaultValue(options.image, null);

        var initialSize = Cartesian2.clone(options.initialSize);
        if (!defined(initialSize)) {
            initialSize = new Cartesian2(1.0, 1.0);
        }

        this.initialSize = initialSize;
        this.sizeVariance = Cartesian2.clone(defaultValue(options.sizeVariance, Cartesian2.ZERO));

        this.maximumToEmit = defaultValue(options.maximumToEmit, Number.MAX_VALUE);

        this.rate = defaultValue(options.rate, 5);

        this.carryOver = 0.0;
    };

    function random(a, b) {
        return CesiumMath.nextRandomNumber() * (b - a) + a;
    }

    PointEmitter.prototype.emit = function(system, dt) {
        var particles = system.particles;


        // Compute the number of particles to emit based on the rate.
        var v = dt * this.rate;
        var numToEmit = Math.floor(v);
        this.carryOver += (v-numToEmit);
        if (this.carryOver>1.0)
        {
            numToEmit++;
            this.carryOver -= 1.0;
        }


        for (var i = 0; i < numToEmit; ++i) {
            var velocity = Cartesian3.clone(this.initialDirection);
            velocity.x += this.directionVariance.x * random(-1.0, 1.0);
            velocity.y += this.directionVariance.y * random(-1.0, 1.0);
            velocity.y += this.directionVariance.z * random(-1.0, 1.0);
            Cartesian3.normalize(velocity, velocity);

            var speed = this.initialSpeed + this.speedVariance * random(0.0, 1.0);
            Cartesian3.multiplyByScalar(velocity, speed, velocity);

            var size = Cartesian2.clone(this.initialSize);
            size.x += this.sizeVariance.x * random(0.0, 1.0);
            size.y += this.sizeVariance.y * random(0.0, 1.0);

            var position = Cartesian3.clone( Cartesian3.ZERO );
            // Change the position to be in world coordinates
            position = Matrix4.multiplyByPoint(this.modelMatrix, position, position);

            particles.push(new Particle({
                position: position,
                image: this.image,
                mass : this.initialMass + this.massVariance * random(0.0, 1.0),
                life : this.initialLife + this.lifeVariance * random(0.0, 1.0),
                velocity :  velocity,
                size : size
            }));
        }
    };

    return PointEmitter;
});