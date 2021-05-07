import { defaultValue } from "../../Source/Cesium.js";

describe("Core/defaultValue", function () {
  it("Works with first parameter undefined", function () {
    expect(defaultValue(undefined, 5)).toEqual(5);
  });

  it("Works with first parameter null", function () {
    expect(defaultValue(null, 5)).toEqual(5);
  });

  it("Works with first parameter not undefined and not null", function () {
    expect(defaultValue(1, 5)).toEqual(1);
  });
});
