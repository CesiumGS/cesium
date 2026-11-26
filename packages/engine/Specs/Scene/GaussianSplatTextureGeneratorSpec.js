import { defined } from "@cesium/core";
import GaussianSplatTextureGenerator from "../../Source/Scene/GaussianSplatTextureGenerator.js";

import pollToPromise from "../../../../Specs/pollToPromise.js";

describe("Scene/GaussianSplatTextureGenerator", function () {
  it("returns the attribute arrays alongside the generated texture", async function () {
    const positions = [0.0, 0.0, 0.0, 1.0, 0.0, 0.0];
    const scales = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
    const rotations = [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0];
    const colors = [255, 255, 255, 255, 255, 255, 255, 255];
    const parameters = {
      attributes: {
        positions: new Float32Array(positions),
        scales: new Float32Array(scales),
        rotations: new Float32Array(rotations),
        colors: new Uint8Array(colors),
      },
      count: 2,
    };

    // Undefined until the worker's wasm module is ready; nothing is
    // transferred by a call that schedules nothing.
    let promise;
    await pollToPromise(function () {
      promise =
        GaussianSplatTextureGenerator.generateFromAttributes(parameters);
      return defined(promise);
    });
    const result = await promise;

    expect(result.data.length).toBeGreaterThan(0);

    // GaussianSplatPrimitive pools these to stage the next texture, so the
    // worker has to hand all four back.
    expect(result.attributes.positions).toEqual(new Float32Array(positions));
    expect(result.attributes.scales).toEqual(new Float32Array(scales));
    expect(result.attributes.rotations).toEqual(new Float32Array(rotations));
    expect(result.attributes.colors).toEqual(new Uint8Array(colors));
  });
});
