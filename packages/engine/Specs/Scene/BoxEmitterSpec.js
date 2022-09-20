import { BoxEmitter, Cartesian3, Particle } from "../../index.js";;

describe("Scene/BoxEmitter", function () {
  let emitter;

  it("default constructor", function () {
    emitter = new BoxEmitter();
    expect(emitter.dimensions).toEqual(new Cartesian3(1.0, 1.0, 1.0));
  });

  it("constructor", function () {
    const dimensions = new Cartesian3(2.0, 3.0, 4.0);
    emitter = new BoxEmitter(dimensions);
    expect(emitter.dimensions).toEqual(dimensions);
  });

  it("constructor throws with invalid dimensions", function () {
    expect(function () {
      emitter = new BoxEmitter(new Cartesian3(-1.0, 1.0, 1.0));
    }).toThrowDeveloperError();
    expect(function () {
      emitter = new BoxEmitter(new Cartesian3(1.0, -1.0, 1.0));
    }).toThrowDeveloperError();
    expect(function () {
      emitter = new BoxEmitter(new Cartesian3(1.0, 1.0, -1.0));
    }).toThrowDeveloperError();
  });

  it("dimensions setter", function () {
    emitter = new BoxEmitter();
    const dimensions = new Cartesian3(2.0, 3.0, 4.0);
    emitter.dimensions = dimensions;
    expect(emitter.dimensions).toEqual(dimensions);
  });

  it("dimensions setter throws with invalid value", function () {
    emitter = new BoxEmitter();
    expect(function () {
      emitter.dimensions = undefined;
    }).toThrowDeveloperError();
    expect(function () {
      emitter.dimensions = new Cartesian3(-1.0, 1.0, 1.0);
    }).toThrowDeveloperError();
    expect(function () {
      emitter.dimensions = new Cartesian3(1.0, -1.0, 1.0);
    }).toThrowDeveloperError();
    expect(function () {
      emitter.dimensions = new Cartesian3(1.0, -1.0, 1.0);
    }).toThrowDeveloperError();
  });

  it("emits", function () {
    emitter = new BoxEmitter(new Cartesian3(2.0, 3.0, 4.0));
    const particle = new Particle();

    for (let i = 0; i < 1000; ++i) {
      emitter.emit(particle);
      expect(particle.position.x).toBeLessThanOrEqual(emitter.dimensions.x);
      expect(particle.position.y).toBeLessThanOrEqual(emitter.dimensions.y);
      expect(particle.position.z).toBeLessThanOrEqual(emitter.dimensions.z);
      expect(particle.velocity).toEqual(
        Cartesian3.normalize(particle.position, new Cartesian3())
      );
    }
  });
});
