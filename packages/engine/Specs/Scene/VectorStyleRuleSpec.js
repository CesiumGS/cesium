import {
  CircleSymbolizer,
  SymbologyLayer,
  VectorStyleRule,
} from "../../index.js";

describe("Scene/VectorStyleRule", () => {
  it("throws without symbology layers or symbolizers", function () {
    expect(() => new VectorStyleRule({})).toThrowDeveloperError();
  });

  it("throws with both symbology layers and symbolizers", function () {
    expect(
      () => new VectorStyleRule({ symbologyLayers: [], symbolizers: [] }),
    ).toThrowDeveloperError();
  });

  it("defaults the condition to true", function () {
    const rule = new VectorStyleRule({ symbolizers: [] });

    expect(rule.condition).toBe(true);
  });

  it("creates a single symbology layer from symbolizers", function () {
    const symbolizer = new CircleSymbolizer();
    const rule = new VectorStyleRule({
      condition: "${a} > 1",
      symbolizers: [symbolizer],
    });

    expect(rule.condition).toBe("${a} > 1");
    expect(rule.symbologyLayers.length).toBe(1);
    expect(rule.symbologyLayers.get(0).symbolizers).toEqual([symbolizer]);
    expect(rule.symbologyLayers.get(0).zIndex).toBe(0);
  });

  it("keeps symbology layers in order", function () {
    const icons = new SymbologyLayer({ symbolizers: [] });
    const labels = new SymbologyLayer({ symbolizers: [], zIndex: 1 });
    const rule = new VectorStyleRule({ symbologyLayers: [icons, labels] });

    expect(rule.symbologyLayers.get(0)).toBe(icons);
    expect(rule.symbologyLayers.get(1)).toBe(labels);
  });
});
