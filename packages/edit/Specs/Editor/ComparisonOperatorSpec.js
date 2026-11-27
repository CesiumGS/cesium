import { AttributeComparison } from "@cesium/mesh-editor";
import { ComparisonOperator } from "../../index.js";

describe("Editor/ComparisonOperator", function () {
  it("matches the wasm editor's comparisons", function () {
    expect(ComparisonOperator.EQUAL).toBe(AttributeComparison.Equal);
    expect(ComparisonOperator.NOT_EQUAL).toBe(AttributeComparison.NotEqual);
    expect(ComparisonOperator.LESS).toBe(AttributeComparison.Less);
    expect(ComparisonOperator.LESS_OR_EQUAL).toBe(
      AttributeComparison.LessOrEqual,
    );
    expect(ComparisonOperator.GREATER).toBe(AttributeComparison.Greater);
    expect(ComparisonOperator.GREATER_OR_EQUAL).toBe(
      AttributeComparison.GreaterOrEqual,
    );
  });
});
