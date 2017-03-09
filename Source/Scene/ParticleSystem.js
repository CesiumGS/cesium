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
        './Particle'
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
        Particle) {
    "use strict";

    var ParticleSystem = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this.particles = defaultValue(options.particles, []);
        this.forces = defaultValue(options.forces, []);

        this.emitter = defaultValue(options.emitter, undefined);

        this.modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));

        this.startColor = defaultValue(options.startColor, Color.clone(Color.WHITE));
        this.endColor = defaultValue(options.endColor, Color.clone(Color.WHITE));

        this.startScale = defaultValue(options.startScale, 1.0);
        this.endScale = defaultValue(options.endScale, 1.0);

        this.rate = defaultValue(options.rate, 5);
        this.bursts = defaultValue(options.bursts, null);

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

        var mass = defaultValue(options.mass, undefined);
        if (mass) {
            this.minMass = mass;
            this.maxMass = mass;
        }
        else {
            this.minMass = defaultValue(options.minMass, 1.0);
            this.maxMass = defaultValue(options.maxMass, 1.0);
        }

        this.image = defaultValue(options.image, null);

        var width = defaultValue(options.width, undefined);
        if (width) {
            this.minWidth = width;
            this.maxWidth = width;
        }
        else {
            this.minWidth = defaultValue(options.minWidth, 1.0);
            this.maxWidth = defaultValue(options.maxWidth, 1.0);
        }

        var height = defaultValue(options.height, undefined);
        if (height) {
            this.minHeight = height;
            this.maxHeight = height;
        }
        else {
            this.minHeight = defaultValue(options.minHeight, 1.0);
            this.maxHeight = defaultValue(options.maxHeight, 1.0);
        }

        this.lifeTime = defaultValue(options.lifeTime, Number.MAX_VALUE);

        this.complete = new Event();
        this.isComplete = false;

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
        var r = particle.startColor.red + particle.normalizedAge * (particle.endColor.red - particle.startColor.red);
        var g = particle.startColor.green + particle.normalizedAge * (particle.endColor.green - particle.startColor.green);
        var b = particle.startColor.blue + particle.normalizedAge * (particle.endColor.blue - particle.startColor.blue);
        var a = particle.startColor.alpha + particle.normalizedAge * (particle.endColor.alpha - particle.startColor.alpha);
        billboard.color = new Color(r,g,b,a);

        // Update the scale
        var scale = particle.startScale + particle.normalizedAge * (particle.endScale - particle.startScale);
        billboard.scale = scale;
    }

    ParticleSystem.prototype.add = function(particle) {
        particle.startColor = Color.clone(this.startColor);
        particle.endColor = Color.clone(this.endColor);
        particle.startScale = this.startScale;
        particle.endScale = this.endScale;
        particle.image = this.image;
        particle.life = random(this.minLife, this.maxLife);
        particle.mass = random(this.minMass, this.maxMass);

        particle.size = new Cartesian2(random(this.minWidth, this.maxWidth), random(this.minHeight, this.maxHeight));

        var speed = random(this.minSpeed, this.maxSpeed);
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

        // update particles and remove dead particles
        var length = particles.length;
        for (i = 0; i < length; ++i) {
            var particle = particles[i];
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
            for (i = 0; i < numToEmit; i++) {
                // Create a new particle.
                var particle = this.emitter.emit( particle );
                if (particle) {

                    //For the velocity we need to add it to the original position and then multiply by point.
                    var tmp = new Cartesian3();
                    Cartesian3.add(particle.position, particle.velocity, tmp);
                    Matrix4.multiplyByPoint(this.modelMatrix, tmp, tmp);

                    // Change the position to be in world coordinates
                    particle.position = Matrix4.multiplyByPoint(this.modelMatrix, particle.position, particle.position);

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

        this._billboardCollection.update(frameState);

        this._previousTime = JulianDate.clone(frameState.time, this._previousTime);

        this.currentTime += dt;

        if (this.lifeTime !== Number.MAX_VALUE && this.currentTime > this.lifeTime) {
            this.isComplete = true;
            this.complete.raiseEvent(this);
        }
    };

    return ParticleSystem;
});