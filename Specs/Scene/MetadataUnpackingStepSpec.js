import { MetadataUnpackingStep } from "../../Source/Cesium.js";

describe("Scene/MetadataUnpackingStep", function () {
  it("unsignedToSigned throws for undefined expression", function () {
    expect(function () {
      return MetadataUnpackingStep.unsignedToSigned();
    }).toThrowDeveloperError();
  });

  it("unsignedToSigned works", function () {
    expect(MetadataUnpackingStep.unsignedToSigned("x")).toEqual(
      "2.0 * (x) - 1.0"
    );
  });

  it("unnormalizeU8 throws for undefined expression", function () {
    expect(function () {
      return MetadataUnpackingStep.unnormalizeU8();
    }).toThrowDeveloperError();
  });

  it("unnormalizeU8 works", function () {
    expect(MetadataUnpackingStep.unnormalize("x")).toEqual("255.0 * (x)");
  });

  it("cast throws for undefined castType", function () {
    expect(function () {
      return MetadataUnpackingStep.cast();
    }).toThrowDeveloperError();
  });

  it("cast result throws for undefined expression", function () {
    expect(function () {
      return MetadataUnpackingStep.cast("int");
    }).toThrowDeveloperError();
  });

  it("cast works", function () {
    expect(MetadataUnpackingStep.cast("int")("x")).toEqual("int(x)");
  });
});
