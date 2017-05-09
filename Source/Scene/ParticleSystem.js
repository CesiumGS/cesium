/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Event',
        '../Core/Matrix4',
        '../Core/Math',
        '../Core/JulianDate',
        '../Core/Color',
        './BillboardCollection',
        './Particle',
        './CircleEmitter'
    ], function(
        defaultValue,
        defined,
        Cartesian2,
        Cartesian3,
        Event,
        Matrix4,
        CesiumMath,
        JulianDate,
        Color,
        BillboardCollection,
        Particle,
        CircleEmitter) {
    "use strict";

    var ParticleSystem = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this.particles = defaultValue(options.particles, []);
        this.forces = defaultValue(options.forces, []);

        this.emitter = defaultValue(options.emitter, new CircleEmitter({radius: 0.5}));

        this.modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));
        this.emitterModelMatrix = Matrix4.clone(defaultValue(options.emitterModelMatrix, Matrix4.IDENTITY));

        this.startColor = defaultValue(options.startColor, Color.clone(Color.WHITE));
        this.endColor = defaultValue(options.endColor, Color.clone(Color.WHITE));

        this.startScale = defaultValue(options.startScale, 1.0);
        this.endScale = defaultValue(options.endScale, 1.0);

        this.rate = defaultValue(options.rate, 5);
        this.bursts = options.bursts;

        this.loop = defaultValue(options.loop, true);

        var speed = options.speed;
        if (speed !== undefined) {
            this.minimumSpeed = speed;
            this.maximumSpeed = speed;
        }
        else {
            this.minimumSpeed = defaultValue(options.minimumSpeed, 1.0);
            this.maximumSpeed = defaultValue(options.maximumSpeed, 1.0);
        }

        var life = options.life;
        if (life !== undefined) {
            this.minimumLife = life;
            this.maximumLife = life;
        }
        else {
            this.minimumLife = defaultValue(options.minimumLife, 5.0);
            this.maximumLife = defaultValue(options.maximumLife, 5.0);
        }

        var mass = options.mass;
        if (mass !== undefined) {
            this.minimumMass = mass;
            this.maximumMass = mass;
        }
        else {
            this.minimumMass = defaultValue(options.minimumMass, 1.0);
            this.maximumMass = defaultValue(options.maximumMass, 1.0);
        }

        this.image = defaultValue(options.image, null);

        var width = options.width;
        if (width !== undefined) {
            this.minimumWidth = width;
            this.maximumWidth = width;
        }
        else {
            this.minimumWidth = defaultValue(options.minimumWidth, 1.0);
            this.maximumWidth = defaultValue(options.maximumWidth, 1.0);
        }

        var height = options.height;
        if (height !== undefined) {
            this.minimumHeight = height;
            this.maximumHeight = height;
        }
        else {
            this.minimumHeight = defaultValue(options.minimumHeight, 1.0);
            this.maximumHeight = defaultValue(options.maximumHeight, 1.0);
        }

        this.lifeTime = defaultValue(options.lifeTime, Number.MAX_VALUE);

        this.complete = new Event();
        this.isComplete = false;

        this.show = defaultValue(options.show, true);

        this.carryOver = 0.0;
        this.currentTime = 0.0;
        this._billboardCollection = undefined;
        this._previousTime = null;
    };

    function removeBillboard(system, particle) {
        system._billboardCollection.remove(particle._billboard);
    }

    function random(a, b) {
        return CesiumMath.nextRandomNumber() * (b - a) + a;
    }

    function updateBillboard(system, particle) {
        var billboard = particle._billboard;
        if (!defined(billboard)) {
            billboard = particle._billboard = system._billboardCollection.add({
                image: particle.image
            });
        }
        billboard.width = particle.size.x;
        billboard.height = particle.size.y;
        billboard.position = particle.position;

        // Update the color
        var r = CesiumMath.lerp(particle.startColor.red, particle.endColor.red, particle.normalizedAge);
        var g = CesiumMath.lerp(particle.startColor.green, particle.endColor.green, particle.normalizedAge);
        var b = CesiumMath.lerp(particle.startColor.blue, particle.endColor.blue, particle.normalizedAge);
        var a = CesiumMath.lerp(particle.startColor.alpha, particle.endColor.alpha, particle.normalizedAge);
        billboard.color = new Color(r,g,b,a);

        // Update the scale
        var scale = CesiumMath.lerp(particle.startScale, particle.endScale, particle.normalizedAge);
        billboard.scale = scale;
    }

    ParticleSystem.prototype.add = function(particle) {
        particle.startColor = Color.clone(this.startColor);
        particle.endColor = Color.clone(this.endColor);
        particle.startScale = this.startScale;
        particle.endScale = this.endScale;
        particle.image = this.image;
        particle.life = random(this.minimumLife, this.maximumLife);
        particle.mass = random(this.minimumMass, this.maximumMass);

        particle.size = new Cartesian2(random(this.minimumWidth, this.maximumWidth), random(this.minimumHeight, this.maximumHeight));

        var speed = random(this.minimumSpeed, this.maximumSpeed);
        Cartesian3.multiplyByScalar(particle.velocity, speed, particle.velocity);

        this.particles.push(particle);
    };

    ParticleSystem.prototype.calcNumberToEmit = function(dt) {
        // This emitter is finished if it exceeds it's lifetime.
        if (this.isComplete) {
            return 0;
        }

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

        return numToEmit;
    };

    ParticleSystem.prototype.update = function(frameState) {
        if (!defined(this._billboardCollection)) {
            this._billboardCollection = new BillboardCollection();
        }

        // Compute the frame time
        var dt = 0.0;
        if (this._previousTime) {
            dt = JulianDate.secondsDifference(frameState.time, this._previousTime);
        }

        if (dt < 0.0) {
            dt = 0.0;
        }

        var i = 0;


        var particles = this.particles;
        var emitter = this.emitter;

        var particle = null;

        // update particles and remove dead particles
        var length = particles.length;
        for (i = 0; i < length; ++i) {
            particle = particles[i];
            if (!particle.update(this.forces, dt)) {
                removeBillboard(this, particle);
                particles[i] = particles[length - 1];
                --i;
                --length;
            } else {
                updateBillboard(this, particle);
            }
        }
        particles.length = length;


        var numToEmit = this.calcNumberToEmit(dt);

        if (numToEmit > 0 && emitter) {

            // Compute the final model matrix by combining the particle systems model matrix and the emitter matrix.
            var combinedMatrix = new Matrix4();
            Matrix4.multiply(this.modelMatrix, this.emitterModelMatrix, combinedMatrix);

            for (i = 0; i < numToEmit; i++) {
                // Create a new particle.
                particle = this.emitter.emit( particle );
                if (particle) {

                    //For the velocity we need to add it to the original position and then multiply by point.
                    var tmp = new Cartesian3();
                    Cartesian3.add(particle.position, particle.velocity, tmp);
                    Matrix4.multiplyByPoint(combinedMatrix, tmp, tmp);

                    // Change the position to be in world coordinates
                    particle.position = Matrix4.multiplyByPoint(combinedMatrix, particle.position, particle.position);

                    // Orient the velocity in world space as well.
                    var worldVelocity = new Cartesian3();
                    Cartesian3.subtract(tmp, particle.position, worldVelocity);
                    Cartesian3.normalize(worldVelocity, worldVelocity);
                    particle.velocity = worldVelocity;

                    // Add the particle to the system.
                    this.add(particle);
                }
            }
        }

        if (this.show) {
            this._billboardCollection.update(frameState);
        }

        this._previousTime = JulianDate.clone(frameState.time, this._previousTime);

        this.currentTime += dt;

        if (this.lifeTime !== Number.MAX_VALUE && this.currentTime > this.lifeTime) {
            if (this.loop) {
                this.currentTime = this.currentTime - this.lifeTime;
                // Reset any bursts
                for (i = 0; i < this.bursts.length; i++) {
                    this.bursts[i].complete = false;
                }
            }
            else {
                this.isComplete = true;
                this.complete.raiseEvent(this);
            }
        }
    };

    return ParticleSystem;
});
