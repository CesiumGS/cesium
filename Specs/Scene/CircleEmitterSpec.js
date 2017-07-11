defineSuite([
        'Scene/CircleEmitter',
        'Core/Cartesian3',
        'Scene/Particle'
    ], function(
        CircleEmitter,
        Cartesian3,
        Particle) {
    'use strict';

    var emitter;

    it('default constructor', function() {
        emitter = new CircleEmitter();
        expect(emitter.radius).toEqual(1.0);
    });

    it('constructor', function() {
        emitter = new CircleEmitter(5.0);
        expect(emitter.radius).toEqual(5.0);
    });

    it('constructor throws with invalid radius', function() {
        expect(function() {
            emitter = new CircleEmitter(0.0);
        }).toThrowDeveloperError();
        expect(function() {
            emitter = new CircleEmitter(-1.0);
        }).toThrowDeveloperError();
    });

    it('radius setter', function() {
        emitter = new CircleEmitter();
        emitter.radius = 5.0;
        expect(emitter.radius).toEqual(5.0);
    });

    it('radius setter throws with invalid value', function() {
        emitter = new CircleEmitter();
        expect(function() {
            emitter.radius = undefined;
        }).toThrowDeveloperError();
        expect(function() {
            emitter.radius = 0.0;
        }).toThrowDeveloperError();
        expect(function() {
            emitter.radius = -1.0;
        }).toThrowDeveloperError();
    });

    it('emits', function() {
        emitter = new CircleEmitter(5.0);
        var particle = new Particle();

        for (var i = 0; i < 1000; ++i) {
            emitter.emit(particle);
            expect(Cartesian3.magnitude(particle.position)).toBeLessThanOrEqualTo(emitter.radius);
            expect(particle.position.z).toEqual(0.0);
            expect(particle.velocity).toEqual(Cartesian3.UNIT_Z);
        }
    });
});
