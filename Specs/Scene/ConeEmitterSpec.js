import { Cartesian3 } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { ConeEmitter } from "../../Source/Cesium.js";
import { Particle } from "../../Source/Cesium.js";

describe("Scene/ConeEmitter", function () {
  it("default constructor", function () {
    const emitter = new ConeEmitter();
    expect(emitter.angle).toEqual(CesiumMath.toRadians(30.0));
  });

  it("constructor", function () {
    const emitter = new ConeEmitter(CesiumMath.PI_OVER_SIX);
    expect(emitter.angle).toEqual(CesiumMath.PI_OVER_SIX);
  });

  it("angle setter", function () {
    const emitter = new ConeEmitter();
    emitter.angle = CesiumMath.PI_OVER_SIX;
    expect(emitter.angle).toEqual(CesiumMath.PI_OVER_SIX);
  });

  it("angle setter throws with invalid value", function () {
    const emitter = new ConeEmitter();
    expect(function () {
      emitter.angle = undefined;
    }).toThrowDeveloperError();
  });

  it("emits", function () {
    const emitter = new ConeEmitter(CesiumMath.PI_OVER_SIX);
    const particle = new Particle();

    for (let i = 0; i < 1000; ++i) {
      emitter.emit(particle);
      expect(particle.position).toEqual(Cartesian3.ZERO);
      expect(Cartesian3.magnitude(particle.velocity)).toEqualEpsilon(
        1.0,
        CesiumMath.EPSILON14
      );

      // acos(dot(unit v, unit z)) <= angle
      expect(Math.acos(particle.velocity.z)).toBeLessThanOrEqual(emitter.angle);
    }
  });
});
