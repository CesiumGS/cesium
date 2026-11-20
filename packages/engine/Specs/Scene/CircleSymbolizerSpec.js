import { Color } from "@cesium/core";
import { CircleSymbolizer } from "../../index.js";

describe("Scene/CircleSymbolizer", () => {
  it("has default values", function () {
    const symbolizer = new CircleSymbolizer();

    expect(symbolizer.radius).toBe(5.0);
    expect(symbolizer.color).toEqual(Color.WHITE);
    expect(symbolizer.outlineColor).toEqual(Color.BLACK);
    expect(symbolizer.outlineWidth).toBe(0.0);
  });

  it("keeps values and expressions", function () {
    const symbolizer = new CircleSymbolizer({
      radius: "${size}",
      color: "color('red')",
      outlineColor: Color.BLUE,
      outlineWidth: 2.0,
    });

    expect(symbolizer.radius).toBe("${size}");
    expect(symbolizer.color).toBe("color('red')");
    expect(symbolizer.outlineColor).toEqual(Color.BLUE);
    expect(symbolizer.outlineWidth).toBe(2.0);
  });

  it("throws for an invalid expression", function () {
    expect(() => new CircleSymbolizer({ radius: "${size" })).toThrowError();
  });
});
