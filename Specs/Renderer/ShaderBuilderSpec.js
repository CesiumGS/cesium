import { ShaderBuilder, ShaderSource } from "../../Source/Cesium.js";
import createContext from "../createContext.js";

describe(
  "Renderer/ShaderBuilder",
  function () {
    var context;
    beforeAll(function () {
      context = createContext();
    });

    afterAll(function () {
      context.destroyForSpecs();
    });

    function checkVertexShader(shaderProgram, expectedDefines, expecedSources) {
      var expectedText = new ShaderSource({
        defines: expectedDefines,
        sources: expecedSources,
      }).createCombinedVertexShader(context);
      expect(shaderProgram._vertexShaderText).toEqual(expectedText);
    }

    function checkFragmentShader(
      shaderProgram,
      expectedDefines,
      expecedSources
    ) {
      var expectedText = new ShaderSource({
        defines: expectedDefines,
        sources: expecedSources,
      }).createCombinedFragmentShader(context);
      expect(shaderProgram._fragmentShaderText).toEqual(expectedText);
    }

    it("creates an empty shader by default", function () {
      var shaderBuilder = new ShaderBuilder();
      var shaderProgram = shaderBuilder.build(context);
      checkVertexShader(shaderProgram, [], []);
      checkFragmentShader(shaderProgram, [], []);
    });

    it("addDefine throws for undefined identifier", function () {
      var shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addDefine(undefined);
      }).toThrowDeveloperError();
    });

    it("addDefine throws for invalid identifier", function () {
      fail();
    });

    it("addDefine defines macros without values", function () {
      fail();
    });

    it("addDefine defines macros with values", function () {
      fail();
    });

    it("addDefine puts the define in the destination shader(s)", function () {
      fail();
    });

    it("addDefine defaults to both shaders", function () {
      fail();
    });

    it("addUniform throws for undefined type", function () {
      var shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addUniform(undefined, "u_time");
      }).toThrowDeveloperError();
    });

    it("addUniform throws for invalid type", function () {
      fail();
    });

    it("addUniform throws for undefined identifier", function () {
      var shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addUniform("vec3");
      }).toThrowDeveloperError();
    });

    it("addUniform throws for invalid identifier", function () {
      fail();
    });

    it("addUniform puts the uniform in the destination shader(s)", function () {
      fail();
    });

    it("addUniform defaults to both shaders", function () {
      fail();
    });

    it("setPositionAttribute throws for undefined type", function () {
      var shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.setPositionAttribute(undefined, "a_position");
      }).toThrowDeveloperError();
    });

    it("setPositionAttribute throws for invalid type", function () {
      var shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.setPositionAttribute(0, "a_position");
      }).toThrowDeveloperError();
    });

    it("setPositionAttribute throws for undefined identifier", function () {
      var shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.setPositionAttribute("vec3", undefined);
      }).toThrowDeveloperError();
    });

    it("setPositionAttribute throws for invalid identifier", function () {
      var shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.setPositionAttribute("vec3", 0);
      }).toThrowDeveloperError();
    });

    it("setPositionAttribute creates a position attribute in location 0", function () {
      var shaderBuilder = new ShaderBuilder();

      // even though these are declared out of order, the results to
      var normalLocation = shaderBuilder.addAttribute("vec3", "a_normal");
      var positionLocation = shaderBuilder.setPositionAttribute(
        "vec3",
        "a_position"
      );
      expect(positionLocation).toBe(0);
      expect(normalLocation).toBe(1);
    });

    it("addAttribute throws for undefined type", function () {
      fail();
    });

    it("addAttribute throws for invalid type", function () {
      fail();
    });

    it("addAttribute throws for undefined identifier", function () {
      fail();
    });

    it("addAttribute throws for invalid identifier", function () {
      fail();
    });

    it("setPositionAttribute creates an attribute in the vertex shader", function () {
      fail();
    });

    it("addVertexLines throws for undefined lines", function () {
      fail();
    });

    it("addVertexLines throws for invalid lines", function () {
      fail();
    });

    it("addVertexLines appends lines to the vertex shader", function () {
      fail();
    });

    it("addFragmentLines throws for undefined lines", function () {
      fail();
    });

    it("addFragmentLines throws for invalid lines", function () {
      fail();
    });

    it("addFragmentLines appends lines to the vertex shader", function () {
      fail();
    });

    it("build throws for undefined context", function () {
      var shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.build(undefined);
      }).toThrowDeveloperError();
    });

    it("build creates a shaderProgram", function () {
      fail();
    });

    /*
ShaderBuilder.prototype.addDefine = function (identifier, value, destination) {
ShaderBuilder.prototype.addUniform = function (type, identifier, destination) {
ShaderBuilder.prototype.setPositionAttribute = function (type, identifier) {
ShaderBuilder.prototype.addAttribute = function (type, identifier) {

ShaderBuilder.prototype.addVertexLines = function (lines) {
ShaderBuilder.prototype.addFragmentLines = function (lines) {
ShaderBuilder.prototype.build = function (context) {
  */
  },
  "WebGL"
);
