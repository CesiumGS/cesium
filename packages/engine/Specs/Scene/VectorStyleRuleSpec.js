import { CircleSymbolizer, VectorStyleRule } from "../../index.js";

describe("Scene/VectorStyleRule", () => {
  it("throws without symbolizers", function () {
    expect(() => new VectorStyleRule({})).toThrowDeveloperError();
  });

  it("defaults the condition to true", function () {
    const rule = new VectorStyleRule({ symbolizers: [] });

    expect(rule.condition).toBe(true);
  });

  it("copies the symbolizers", function () {
    const symbolizers = [new CircleSymbolizer()];
    const rule = new VectorStyleRule({ condition: "${a} > 1", symbolizers });

    symbolizers.push(new CircleSymbolizer());

    expect(rule.condition).toBe("${a} > 1");
    expect(rule.symbolizers.length).toBe(1);
  });
});
