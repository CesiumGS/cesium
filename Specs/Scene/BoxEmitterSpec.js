defineSuite([
        'Scene/BoxEmitter',
        'Core/Cartesian3',
        'Scene/Particle'
    ], function(
        BoxEmitter,
        Cartesian3,
        Particle) {
    'use strict';

    var emitter;

    it('default constructor', function() {
        emitter = new BoxEmitter();
        expect(emitter.dimensions).toEqual(new Cartesian3(1.0, 1.0, 1.0));
    });

    it('constructor', function() {
        var dimensions = new Cartesian3(2.0, 3.0, 4.0);
        emitter = new BoxEmitter(dimensions);
        expect(emitter.dimensions).toEqual(dimensions);
    });

    it('constructor throws with invalid dimensions', function() {
        expect(function() {
            emitter = new BoxEmitter(new Cartesian3(-1.0, 1.0, 1.0));
        }).toThrowDeveloperError();
        expect(function() {
            emitter = new BoxEmitter(new Cartesian3(1.0, -1.0, 1.0));
        }).toThrowDeveloperError();
        expect(function() {
            emitter = new BoxEmitter(new Cartesian3(1.0, 1.0, -1.0));
        }).toThrowDeveloperError();
    });

    it('dimensions setter', function() {
        emitter = new BoxEmitter();
        var dimensions = new Cartesian3(2.0, 3.0, 4.0);
        emitter.dimensions = dimensions;
        expect(emitter.dimensions).toEqual(dimensions);
    });

    it('dimensions setter throws with invalid value', function() {
        emitter = new BoxEmitter();
        expect(function() {
            emitter.dimensions = undefined;
        }).toThrowDeveloperError();
        expect(function() {
            emitter.dimensions = new Cartesian3(-1.0, 1.0, 1.0);
        }).toThrowDeveloperError();
        expect(function() {
            emitter.dimensions = new Cartesian3(1.0, -1.0, 1.0);
        }).toThrowDeveloperError();
        expect(function() {
            emitter.dimensions = new Cartesian3(1.0, -1.0, 1.0);
        }).toThrowDeveloperError();
    });

    it('emits', function() {
        emitter = new BoxEmitter(new Cartesian3(2.0, 3.0, 4.0));
        var particle = new Particle();

        for (var i = 0; i < 1000; ++i) {
            emitter.emit(particle);
            expect(particle.position.x).toBeLessThanOrEqualTo(emitter.dimensions.x);
            expect(particle.position.y).toBeLessThanOrEqualTo(emitter.dimensions.y);
            expect(particle.position.z).toBeLessThanOrEqualTo(emitter.dimensions.z);
            expect(particle.velocity).toEqual(Cartesian3.normalize(particle.position, new Cartesian3()));
        }
    });
});
