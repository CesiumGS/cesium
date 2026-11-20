import { BlendOption, SymbologyLayer, VectorStyleRule } from "../../index.js";

describe("Scene/SymbologyLayer", () => {
  it("has default values", function () {
    const layer = new SymbologyLayer({ rules: [] });

    expect(layer.rules).toEqual([]);
    expect(layer.name).toBeUndefined();
    expect(layer.blendOption).toBe(BlendOption.TRANSLUCENT);
  });

  it("keeps values", function () {
    const rule = new VectorStyleRule({ symbolizers: [] });
    const layer = new SymbologyLayer({
      name: "labels",
      blendOption: BlendOption.OPAQUE,
      rules: [rule],
    });

    expect(layer.rules).toEqual([rule]);
    expect(layer.name).toBe("labels");
    expect(layer.blendOption).toBe(BlendOption.OPAQUE);
  });

  it("throws without rules", function () {
    expect(() => new SymbologyLayer({})).toThrowDeveloperError();
  });
});
