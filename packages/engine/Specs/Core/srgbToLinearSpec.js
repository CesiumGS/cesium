import { srgbToLinear } from "../../index.js";

describe("Core/srgbToLinear", function () {
  it("converts 0 to 0", function () {
    expect(srgbToLinear(0)).toEqual(0);
  });

  it("converts value less than 0.04045", function () {
    expect(srgbToLinear(0.0386).toFixed(3)).toEqual("0.003");
  });

  it("converts value greater than 0.04045", function () {
    expect(srgbToLinear(0.5).toFixed(3)).toEqual("0.214");
  });

  it("converts 1 to 1", function () {
    expect(srgbToLinear(1)).toEqual(1);
  });
});
