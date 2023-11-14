import { ShaderStruct } from "../../Source/Cesium.js";

describe("Renderer/ShaderStruct", function () {
  it("constructs", function () {
    const struct = new ShaderStruct("TestStruct");
    expect(struct.name).toEqual("TestStruct");
    expect(struct.fields).toEqual([]);
  });

  it("addField adds fields", function () {
    const struct = new ShaderStruct("TestStruct");
    struct.addField("vec3", "positionMC");
    struct.addField("float", "weights[4]");
    struct.addField("OtherStruct", "complex");
    expect(struct.fields).toEqual([
      "    vec3 positionMC;",
      "    float weights[4];",
      "    OtherStruct complex;",
    ]);
  });

  it("generateGlslLines generates a struct definition", function () {
    const struct = new ShaderStruct("TestStruct");
    struct.addField("vec3", "positionMC");
    struct.addField("float", "weights[4]");
    struct.addField("OtherStruct", "complex");
    expect(struct.generateGlslLines()).toEqual([
      "struct TestStruct",
      "{",
      "    vec3 positionMC;",
      "    float weights[4];",
      "    OtherStruct complex;",
      "};",
    ]);
  });

  it("generateGlslLines pads an empty struct definition", function () {
    const struct = new ShaderStruct("Nothing");
    expect(struct.generateGlslLines()).toEqual([
      "struct Nothing",
      "{",
      "    float _empty;",
      "};",
    ]);
  });
});
