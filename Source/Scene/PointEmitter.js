/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/Event',
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
        Event,
        Matrix4,
        CesiumMath,
        Particle,
        PointPlacer
        ) {
    "use strict";

    var PointEmitter = function(options) {
        this.initialMass = defaultValue(options.initialMass, 1.0);
        this.massVariance = defaultValue(options.massVariance, 0.0);

        this.initialDirection = Cartesian3.clone(defaultValue(options.initialDirection, Cartesian3.UNIT_Z));
        this.directionVariance = Cartesian3.clone(defaultValue(options.directionVariance, Cartesian3.ZERO));

        var speed = defaultValue(options.speed, undefined);
        if (speed) {
            this.minSpeed = speed;
            this.maxSpeed = speed;
        }
        else {
            this.minSpeed = defaultValue(options.minSpeed, 1.0);
            this.maxSpeed = defaultValue(options.maxSpeed, 1.0);
        }

        var life = defaultValue(options.life, undefined);
        if (life) {
            this.minLife = life;
            this.maxLife = life;
        }
        else {
            this.minLife = defaultValue(options.minLife, 5.0);
            this.maxLife = defaultValue(options.maxLife, 5.0);
        }

        this.modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));

        this.image = defaultValue(options.image, null);

        var initialSize = Cartesian2.clone(options.initialSize);
        if (!defined(initialSize)) {
            initialSize = new Cartesian2(1.0, 1.0);
        }

        this.initialSize = initialSize;
        this.sizeVariance = Cartesian2.clone(defaultValue(options.sizeVariance, Cartesian2.ZERO));

        this.rate = defaultValue(options.rate, 5);

        this.carryOver = 0.0;

        this.currentTime = 0.0;

        this.bursts = defaultValue(options.bursts, null);

        this.placer = defaultValue(options.placer, new PointPlacer({}));

        this.lifeTime = defaultValue(options.lifeTime, Number.MAX_VALUE);

        this.startColor = defaultValue(options.startColor, Color.clone(Color.WHITE));
        this.endColor = defaultValue(options.endColor, Color.clone(Color.WHITE));

        this.startScale = defaultValue(options.startScale);
        this.endScale = defaultValue(options.endScale);

        this.complete = new Event();
        this.isComplete = false;
    };

    function random(a, b) {
        return CesiumMath.nextRandomNumber() * (b - a) + a;
    }

    PointEmitter.prototype.emit = function(system, dt) {

        // This emitter is finished if it exceeds it's lifetime.
        if (this.isComplete) {
            return;
        }


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


        var i = 0;

        // Apply any bursts
        if (this.bursts) {
            for (i = 0; i < this.bursts.length; i++) {
                var burst = this.bursts[i];
                if ((!defined(burst, "complete") || !burst.complete) && this.currentTime > burst.time) {
                    var count = burst.min + random(0.0, 1.0) * burst.max;
                    numToEmit += count;
                    burst.complete = true;
                }
            }
        }


        for (var i = 0; i < numToEmit; ++i) {
            var velocity = Cartesian3.clone(this.initialDirection);

            velocity.x += this.directionVariance.x * random(-1.0, 1.0);
            velocity.y += this.directionVariance.y * random(-1.0, 1.0);
            velocity.y += this.directionVariance.z * random(-1.0, 1.0);
            velocity = Matrix4.multiplyByPoint(this.modelMatrix, velocity, velocity);
            Cartesian3.normalize(velocity, velocity);


            var speed = this.minSpeed + (this.maxSpeed - this.minSpeed) * random(0.0, 1.0);
            Cartesian3.multiplyByScalar(velocity, speed, velocity);

            var size = Cartesian2.clone(this.initialSize);
            size.x += this.sizeVariance.x * random(0.0, 1.0);
            size.y += this.sizeVariance.y * random(0.0, 1.0);

            // Create the new particle.
            var particle = new Particle({
                image: this.image,
                mass : this.initialMass + this.massVariance * random(0.0, 1.0),
                life : this.minLife + (this.maxLife - this.minLife) * random(0.0, 1.0),
                velocity :  velocity,
                size : size,
                startColor: this.startColor,
                endColor: this.endColor,
                startScale: this.startScale,
                endScale: this.endScale
            })

            // Place the particle with the placer.
            this.placer.place( particle );

            // Change the position to be in world coordinates
            particle.position = Matrix4.multiplyByPoint(this.modelMatrix, particle.position, particle.position);

            // Add the particle to the particle system.
            particles.push(particle);
        }


        this.currentTime += dt;

        if (this.lifeTime !== Number.MAX_VALUE && this.currentTime > this.lifeTime) {
            this.isComplete = true;
            this.complete.raiseEvent(this);
        }

    };

    return PointEmitter;
});