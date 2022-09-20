import { ShaderDestination } from "../../Source/Cesium.js";

describe("Renderer/ShaderDestination", function () {
  it("includesVertexShader throws for undefined destination", function () {
    expect(function () {
      return ShaderDestination.includesVertexShader(undefined);
    }).toThrowDeveloperError();
  });

  it("includesVertexShader works", function () {
    expect(
      ShaderDestination.includesVertexShader(ShaderDestination.VERTEX)
    ).toBe(true);
    expect(
      ShaderDestination.includesVertexShader(ShaderDestination.FRAGMENT)
    ).toBe(false);
    expect(ShaderDestination.includesVertexShader(ShaderDestination.BOTH)).toBe(
      true
    );
  });

  it("includesFragmentShader throws for undefined destination", function () {
    expect(function () {
      return ShaderDestination.includesFragmentShader(undefined);
    }).toThrowDeveloperError();
  });

  it("includesFragmentShader works", function () {
    expect(
      ShaderDestination.includesFragmentShader(ShaderDestination.VERTEX)
    ).toBe(false);
    expect(
      ShaderDestination.includesFragmentShader(ShaderDestination.FRAGMENT)
    ).toBe(true);
    expect(
      ShaderDestination.includesFragmentShader(ShaderDestination.BOTH)
    ).toBe(true);
  });
});
