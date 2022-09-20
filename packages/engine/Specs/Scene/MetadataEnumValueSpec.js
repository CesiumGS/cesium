import { MetadataEnumValue } from "../../index.js";

describe("Scene/MetadataEnumValue", function () {
  it("creates enum value", function () {
    const extras = {
      gain: 0.5,
      offset: 0.1,
    };
    const extensions = {
      EXT_other_extension: {},
    };

    const enumValue = new MetadataEnumValue({
      name: "RED",
      description: "Red color",
      value: 0,
      extras: extras,
      extensions: extensions,
    });

    expect(enumValue.name).toBe("RED");
    expect(enumValue.description).toBe("Red color");
    expect(enumValue.value).toBe(0);
    expect(enumValue.extras).toBe(extras);
    expect(enumValue.extensions).toBe(extensions);
  });

  it("constructor throws without value", function () {
    expect(function () {
      return new MetadataEnumValue();
    }).toThrowDeveloperError();
  });
});
