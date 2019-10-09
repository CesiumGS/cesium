import { Cartesian2 } from '../../Source/Cesium.js';
import { Cartesian3 } from '../../Source/Cesium.js';
import { Color } from '../../Source/Cesium.js';
import { Particle } from '../../Source/Cesium.js';

describe('Scene/Particle', function() {

    it('default constructor', function() {
        var p = new Particle();
        expect(p.mass).toEqual(1.0);
        expect(p.position).toEqual(Cartesian3.ZERO);
        expect(p.velocity).toEqual(Cartesian3.ZERO);
        expect(p.life).toEqual(Number.MAX_VALUE);
        expect(p.image).toBeUndefined();
        expect(p.startColor).toEqual(Color.WHITE);
        expect(p.endColor).toEqual(Color.WHITE);
        expect(p.startScale).toEqual(1.0);
        expect(p.endScale).toEqual(1.0);
        expect(p.imageSize).toEqual(new Cartesian2(1.0, 1.0));
    });

    it('constructor', function() {
        var options = {
            mass : 10.0,
            position : new Cartesian3(1.0, 2.0, 3.0),
            velocity : new Cartesian3(4.0, 5.0, 6.0),
            life : 15.0,
            image : 'url/to/image',
            startColor : Color.MAGENTA,
            endColor : Color.LIME,
            startScale : 0.5,
            endScale : 20.0,
            imageSize : new Cartesian2(7.0, 8.0)
        };
        var p = new Particle(options);
        expect(p.mass).toEqual(options.mass);
        expect(p.position).toEqual(options.position);
        expect(p.velocity).toEqual(options.velocity);
        expect(p.life).toEqual(options.life);
        expect(p.image).toEqual(options.image);
        expect(p.startColor).toEqual(options.startColor);
        expect(p.endColor).toEqual(options.endColor);
        expect(p.startScale).toEqual(options.startScale);
        expect(p.endScale).toEqual(options.endScale);
        expect(p.imageSize).toEqual(options.imageSize);
    });

    it('update without update function', function() {
        var position = new Cartesian3(1.0, 2.0, 3.0);
        var velocity = Cartesian3.normalize(new Cartesian3(-1.0, 1.0, 1.0), new Cartesian3());
        var p = new Particle({
            life : 15.0,
            position : position,
            velocity : velocity
        });

        var dt = 10.0;
        var expectedPosition = Cartesian3.add(p.position, Cartesian3.multiplyByScalar(p.velocity, dt, new Cartesian3()), new Cartesian3());

        expect(p.update(dt)).toEqual(true);
        expect(p.position).toEqual(expectedPosition);
        expect(p.velocity).toEqual(velocity);
        expect(p.age).toEqual(dt);
        expect(p.normalizedAge).toEqual(dt / p.life);
        expect(p.update(dt)).toEqual(false);
    });

    it('update with updateFunction', function() {
        var increaseMass = function(particle, dt) {
            particle.mass++;
        };
        var forces = increaseMass;

        var position = new Cartesian3(1.0, 2.0, 3.0);
        var velocity = Cartesian3.normalize(new Cartesian3(-1.0, 1.0, 1.0), new Cartesian3());
        var p = new Particle({
            life : 15.0,
            position : position,
            velocity : velocity
        });

        var dt = 10.0;
        var expectedMass = p.mass + 1;
        var expectedPosition = Cartesian3.add(p.position, Cartesian3.multiplyByScalar(p.velocity, dt, new Cartesian3()), new Cartesian3());

        expect(p.update(dt, forces)).toEqual(true);
        expect(p.position).toEqual(expectedPosition);
        expect(p.velocity).toEqual(velocity);
        expect(p.age).toEqual(dt);
        expect(p.normalizedAge).toEqual(dt / p.life);
        expect(p.mass).toEqual(expectedMass);
        expect(p.update(dt)).toEqual(false);
    });
});
