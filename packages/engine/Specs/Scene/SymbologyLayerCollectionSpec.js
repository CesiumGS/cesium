import { SymbologyLayer, VectorStyleRule } from "../../index.js";

describe("Scene/SymbologyLayerCollection", () => {
  it("adds layers in order", function () {
    const first = new SymbologyLayer({ name: "first", symbolizers: [] });
    const second = new SymbologyLayer({ name: "second", symbolizers: [] });
    const layers = new VectorStyleRule({ symbologyLayers: [first] })
      .symbologyLayers;

    expect(layers.add(second)).toBe(second);

    expect(layers.length).toBe(2);
    expect(layers.get(0)).toBe(first);
    expect(layers.get(1)).toBe(second);
  });

  it("checks whether it contains a layer", function () {
    const layer = new SymbologyLayer({ symbolizers: [] });
    const layers = new VectorStyleRule({ symbologyLayers: [layer] })
      .symbologyLayers;

    expect(layers.contains(layer)).toBe(true);
    expect(layers.contains(new SymbologyLayer({ symbolizers: [] }))).toBe(
      false,
    );
  });

  it("gets layers by name", function () {
    const first = new SymbologyLayer({ name: "labels", symbolizers: [] });
    const second = new SymbologyLayer({ name: "labels", symbolizers: [] });
    const layers = new VectorStyleRule({
      symbologyLayers: [first, new SymbologyLayer({ symbolizers: [] }), second],
    }).symbologyLayers;

    expect(layers.getByName("labels")).toEqual([first, second]);
    expect(layers.getByName("missing")).toEqual([]);
  });

  it("throws when adding without a layer", function () {
    const layers = new VectorStyleRule({ symbologyLayers: [] }).symbologyLayers;

    expect(() => layers.add(undefined)).toThrowDeveloperError();
  });
});
