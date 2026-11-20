import { SymbologyLayer, VectorStyle } from "../../index.js";

describe("Scene/SymbologyLayerCollection", () => {
  it("adds layers in order", function () {
    const first = new SymbologyLayer({ name: "first", rules: [] });
    const second = new SymbologyLayer({ name: "second", rules: [] });
    const layers = new VectorStyle({ symbologyLayers: [first] })
      .symbologyLayers;

    expect(layers.add(second)).toBe(second);

    expect(layers.length).toBe(2);
    expect(layers.get(0)).toBe(first);
    expect(layers.get(1)).toBe(second);
  });

  it("checks whether it contains a layer", function () {
    const layer = new SymbologyLayer({ rules: [] });
    const layers = new VectorStyle({ symbologyLayers: [layer] })
      .symbologyLayers;

    expect(layers.contains(layer)).toBe(true);
    expect(layers.contains(new SymbologyLayer({ rules: [] }))).toBe(false);
  });

  it("gets layers by name", function () {
    const first = new SymbologyLayer({ name: "labels", rules: [] });
    const second = new SymbologyLayer({ name: "labels", rules: [] });
    const layers = new VectorStyle({
      symbologyLayers: [first, new SymbologyLayer({ rules: [] }), second],
    }).symbologyLayers;

    expect(layers.getByName("labels")).toEqual([first, second]);
    expect(layers.getByName("missing")).toEqual([]);
  });

  it("throws when adding without a layer", function () {
    const layers = new VectorStyle().symbologyLayers;

    expect(() => layers.add(undefined)).toThrowDeveloperError();
  });
});
