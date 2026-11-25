import { BlendOption, CircleSymbolizer, SymbologyLayer } from "../../index.js";

describe("Scene/SymbologyLayer", () => {
  it("has default values", function () {
    const layer = new SymbologyLayer({ symbolizers: [] });

    expect(layer.symbolizers).toEqual([]);
    expect(layer.name).toBeUndefined();
    expect(layer.zIndex).toBe(0);
    expect(layer.blendOption).toBe(BlendOption.TRANSLUCENT);
  });

  it("keeps values", function () {
    const symbolizer = new CircleSymbolizer();
    const layer = new SymbologyLayer({
      name: "labels",
      zIndex: 2,
      blendOption: BlendOption.OPAQUE,
      symbolizers: [symbolizer],
    });

    expect(layer.symbolizers).toEqual([symbolizer]);
    expect(layer.name).toBe("labels");
    expect(layer.zIndex).toBe(2);
    expect(layer.blendOption).toBe(BlendOption.OPAQUE);
  });

  it("copies the symbolizers", function () {
    const symbolizers = [new CircleSymbolizer()];
    const layer = new SymbologyLayer({ symbolizers });

    symbolizers.push(new CircleSymbolizer());

    expect(layer.symbolizers.length).toBe(1);
  });

  it("throws without symbolizers", function () {
    expect(() => new SymbologyLayer({})).toThrowDeveloperError();
  });
});
