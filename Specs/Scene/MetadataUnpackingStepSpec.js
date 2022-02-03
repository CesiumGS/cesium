import { MetadataUnpackingStep } from "../../Source/Cesium.js";

describe("Scene/MetadataUnpackingStep", function () {
  it("unsignedToSigned throws for undefined expression", function () {
    expect(function () {
      return MetadataUnpackingStep.unsignedToSigned();
    }).toThrowDeveloperError();
  });

  it("unsignedToSigned works", function () {
    expect(MetadataUnpackingStep.unsignedToSigned("0.0")).toEqual(
      "2.0 * (0.0) - 1.0"
    );
  });

  it("unnormalizeU8 throws for undefined expression", function () {
    expect(function () {
      return MetadataUnpackingStep.unnormalizeU8();
    }).toThrowDeveloperError();
  });

  it("unnormalizeU8 works", function () {
    expect(MetadataUnpackingStep.unnormalize("1.0")).toEqual("255.0 * (1.0)");
  });

  it("unnormalizeI8 throws for undefined expression", function () {
    expect(function () {
      return MetadataUnpackingStep.unnormalizeI8();
    }).toThrowDeveloperError();
  });

  it("unnormalizeI8 works", function () {
    expect(MetadataUnpackingStep.unnormalize("1.0")).toEqual(
      "255.0 * (1.0) - 128.0"
    );
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
    expect(MetadataUnpackingStep.cast("int")("1.0")).toEqual("int(1.0)");
  });
});
