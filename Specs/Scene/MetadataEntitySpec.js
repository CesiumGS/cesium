import { MetadataEntity } from "../../Source/Cesium.js";

describe("Scene/MetadataEntity", function () {
  it("throws when using MetadataEntity directly", function () {
    var entity = new MetadataEntity();
    expect(function () {
      return entity.class;
    }).toThrowDeveloperError();
    expect(function () {
      entity.hasProperty();
    }).toThrowDeveloperError();
    expect(function () {
      entity.getPropertyIds();
    }).toThrowDeveloperError();
    expect(function () {
      entity.getProperty();
    }).toThrowDeveloperError();
    expect(function () {
      entity.setProperty();
    }).toThrowDeveloperError();
    expect(function () {
      entity.getPropertyBySemantic();
    }).toThrowDeveloperError();
    expect(function () {
      entity.setPropertyBySemantic();
    }).toThrowDeveloperError();
  });
});
