defineSuite([
        'Scene/ConeEmitter',
        'Core/Cartesian3',
        'Core/Math',
        'Scene/Particle'
    ], function(
        ConeEmitter,
        Cartesian3,
        CesiumMath,
        Particle) {
    'use strict';

    it('default constructor', function() {
        var emitter = new ConeEmitter();
        expect(emitter.angle).toEqual(CesiumMath.toRadians(30.0));
    });

    it('constructor', function() {
        var emitter = new ConeEmitter(CesiumMath.PI_OVER_SIX);
        expect(emitter.angle).toEqual(CesiumMath.PI_OVER_SIX);
    });

    it('angle setter', function() {
        var emitter = new ConeEmitter();
        emitter.angle = CesiumMath.PI_OVER_SIX;
        expect(emitter.angle).toEqual(CesiumMath.PI_OVER_SIX);
    });

    it('angle setter throws with invalid value', function() {
        var emitter = new ConeEmitter();
        expect(function() {
            emitter.angle = undefined;
        }).toThrowDeveloperError();
    });

    it('emits', function() {
        var emitter = new ConeEmitter(CesiumMath.PI_OVER_SIX);
        var particle = new Particle();

        for (var i = 0; i < 1000; ++i) {
            emitter.emit(particle);
            expect(particle.position).toEqual(Cartesian3.ZERO);
            expect(Cartesian3.magnitude(particle.velocity)).toEqualEpsilon(1.0, CesiumMath.EPSILON14);

            // acos(dot(unit v, unit z)) <= angle
            expect(Math.acos(particle.velocity.z)).toBeLessThanOrEqualTo(emitter.angle);
        }
    });
});
