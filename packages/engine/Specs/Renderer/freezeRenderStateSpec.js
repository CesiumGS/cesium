import { freezeRenderState } from "../../index.js";

describe("Renderer/freezeRenderState", function () {
  it("works as expected", function () {
    const fresh = {
      a: 1,
      b: {
        c: "c",
      },
      _applyFunctions: [function () {}],
    };

    const frozen = freezeRenderState(fresh);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.a)).toBe(true);
    expect(Object.isFrozen(frozen.b)).toBe(true);
    expect(Object.isFrozen(frozen.c)).toBe(true);
    expect(Object.isFrozen(frozen._applyFunctions)).toBe(false);
  });
});
