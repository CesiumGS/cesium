import { Cartesian3, Particle, SphereEmitter } from "../../../Source/Cesium.js";

describe("Scene/SphereEmitter", function () {
  let emitter;

  it("default constructor", function () {
    emitter = new SphereEmitter();
    expect(emitter.radius).toEqual(1.0);
  });

  it("constructor", function () {
    emitter = new SphereEmitter(5.0);
    expect(emitter.radius).toEqual(5.0);
  });

  it("constructor throws with invalid radius", function () {
    expect(function () {
      emitter = new SphereEmitter(0.0);
    }).toThrowDeveloperError();
    expect(function () {
      emitter = new SphereEmitter(-1.0);
    }).toThrowDeveloperError();
  });

  it("radius setter", function () {
    emitter = new SphereEmitter();
    emitter.radius = 5.0;
    expect(emitter.radius).toEqual(5.0);
  });

  it("radius setter throws with invalid value", function () {
    emitter = new SphereEmitter();
    expect(function () {
      emitter.radius = undefined;
    }).toThrowDeveloperError();
    expect(function () {
      emitter.radius = 0.0;
    }).toThrowDeveloperError();
    expect(function () {
      emitter.radius = -1.0;
    }).toThrowDeveloperError();
  });

  it("emits", function () {
    emitter = new SphereEmitter(5.0);
    const particle = new Particle();

    for (let i = 0; i < 1000; ++i) {
      emitter.emit(particle);
      expect(Cartesian3.magnitude(particle.position)).toBeLessThanOrEqual(
        emitter.radius
      );
      expect(particle.velocity).toEqual(
        Cartesian3.normalize(particle.position, new Cartesian3())
      );
    }
  });
});
