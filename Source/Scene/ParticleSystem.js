/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/Cartesian3',
        '../Core/Matrix4',
        '../Core/Math',
        '../Core/JulianDate',
        '../Core/Color',
        './BillboardCollection',
        './Particle'
    ], function(
        defaultValue,
        defined,
        Cartesian3,
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
        particle.life = this.minLife + (this.maxLife - this.minLife) * random(0.0, 1.0);
        particle.mass = this.minMass + (this.maxMass - this.minMass) * random(0.0, 1.0);
        var speed = this.minSpeed + (this.maxSpeed - this.minSpeed) * random(0.0, 1.0);
        Cartesian3.multiplyByScalar(particle.velocity, speed, particle.velocity);

        this.particles.push(particle);
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


        var particles = this.particles;
        var emitter = this.emitter;

        // update particles and remove dead particles
        var length = particles.length;
        for (var i = 0; i < length; ++i) {
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

        // emit new particles if an emitter is attached.
        // the emission counts as the particle "update"
        emitter.modelMatrix = this.modelMatrix;
        emitter.emit(this, dt);

        this._billboardCollection.update(frameState);

        this._previousTime = JulianDate.clone(frameState.time, this._previousTime);
    };

    return ParticleSystem;
});