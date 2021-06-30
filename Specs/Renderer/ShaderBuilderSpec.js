import {
  ShaderBuilder,
  ShaderDestination,
  ShaderSource,
} from "../../Source/Cesium.js";
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

    function checkVertexShader(
      shaderProgram,
      expectedDefines,
      expectedSources
    ) {
      // the ShaderBuilder joins the generated lines with \n
      // to avoid creating #line 0 at every line. We need to do the same here
      expectedSources = [expectedSources.join("\n")];
      var expectedText = new ShaderSource({
        defines: expectedDefines,
        sources: expectedSources,
      }).createCombinedVertexShader(context);
      expect(shaderProgram._vertexShaderText).toEqual(expectedText);
    }

    function checkFragmentShader(
      shaderProgram,
      expectedDefines,
      expectedSources
    ) {
      // the ShaderBuilder joins the generated lines with \n
      // to avoid creating #line 0 at every line. We need to do the same here
      expectedSources = [expectedSources.join("\n")];
      var expectedText = new ShaderSource({
        defines: expectedDefines,
        sources: expectedSources,
      }).createCombinedFragmentShader(context);
      expect(shaderProgram._fragmentShaderText).toEqual(expectedText);
    }

    it("creates an empty shader by default", function () {
      var shaderBuilder = new ShaderBuilder();
      var shaderProgram = shaderBuilder.buildShaderProgram(context);
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
      var shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addDefine(42);
      }).toThrowDeveloperError();
    });

    it("addDefine defines macros without values", function () {
      var shaderBuilder = new ShaderBuilder();
      shaderBuilder.addDefine("USE_SHADOWS");
      var shaderProgram = shaderBuilder.buildShaderProgram(context);
      checkVertexShader(shaderProgram, ["USE_SHADOWS"], []);
      checkFragmentShader(shaderProgram, ["USE_SHADOWS"], []);
    });

    it("addDefine defines macros with values", function () {
      var shaderBuilder = new ShaderBuilder();
      shaderBuilder.addDefine("PI", 3.1415);
      var shaderProgram = shaderBuilder.buildShaderProgram(context);
      checkVertexShader(shaderProgram, ["PI 3.1415"], []);
      checkFragmentShader(shaderProgram, ["PI 3.1415"], []);
    });

    it("addDefine puts the define in the destination shader(s)", function () {
      var shaderBuilder = new ShaderBuilder();
      shaderBuilder.addDefine("POINT_SIZE", 2, ShaderDestination.VERTEX);
      shaderBuilder.addDefine("PI", 3.1415, ShaderDestination.FRAGMENT);
      shaderBuilder.addDefine(
        "USE_FRAGMENT_SHADING",
        1,
        ShaderDestination.BOTH
      );
      var shaderProgram = shaderBuilder.buildShaderProgram(context);
      checkVertexShader(
        shaderProgram,
        ["POINT_SIZE 2", "USE_FRAGMENT_SHADING 1"],
        []
      );
      checkFragmentShader(
        shaderProgram,
        ["PI 3.1415", "USE_FRAGMENT_SHADING 1"],
        []
      );
    });

    it("addDefine defaults to both shaders", function () {
      var shaderBuilder = new ShaderBuilder();
      shaderBuilder.addDefine("PI", 3.1415);
      var shaderProgram = shaderBuilder.buildShaderProgram(context);
      checkVertexShader(shaderProgram, ["PI 3.1415"], []);
      checkFragmentShader(shaderProgram, ["PI 3.1415"], []);
    });

    it("addUniform throws for undefined type", function () {
      var shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addUniform(undefined, "u_time");
      }).toThrowDeveloperError();
    });

    it("addUniform throws for invalid type", function () {
      var shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addUniform(10, "u_time");
      }).toThrowDeveloperError();
    });

    it("addUniform throws for undefined identifier", function () {
      var shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addUniform("vec3");
      }).toThrowDeveloperError();
    });

    it("addUniform throws for invalid identifier", function () {
      var shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addUniform("vec3", 0);
      }).toThrowDeveloperError();
    });

    it("addUniform puts the uniform in the destination shader(s)", function () {
      var shaderBuilder = new ShaderBuilder();
      shaderBuilder.addUniform(
        "vec3",
        "u_gridDimensions",
        ShaderDestination.VERTEX
      );
      shaderBuilder.addUniform(
        "vec2",
        "u_mousePosition",
        ShaderDestination.FRAGMENT
      );
      shaderBuilder.addUniform("float", "u_time", ShaderDestination.BOTH);
      var shaderProgram = shaderBuilder.buildShaderProgram(context);
      checkVertexShader(
        shaderProgram,
        [],
        ["uniform vec3 u_gridDimensions;", "uniform float u_time;"]
      );
      checkFragmentShader(
        shaderProgram,
        [],
        ["uniform vec2 u_mousePosition;", "uniform float u_time;"]
      );
    });

    it("addUniform defaults to both shaders", function () {
      var shaderBuilder = new ShaderBuilder();
      shaderBuilder.addUniform("float", "u_time");
      var shaderProgram = shaderBuilder.buildShaderProgram(context);
      checkVertexShader(shaderProgram, [], ["uniform float u_time;"]);
      checkFragmentShader(shaderProgram, [], ["uniform float u_time;"]);
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
      var shaderProgram = shaderBuilder.buildShaderProgram(context);
      var expectedAttributes = [
        "attribute vec3 a_position;",
        "attribute vec3 a_normal;",
      ];
      checkVertexShader(shaderProgram, [], expectedAttributes);
      checkFragmentShader(shaderProgram, [], []);

      var expectedLocations = {
        a_position: 0,
        a_normal: 1,
      };
      expect(shaderBuilder.attributeLocations).toEqual(expectedLocations);
      expect(shaderProgram._attributeLocations).toEqual(expectedLocations);
    });

    it("setPositionAttribute throws if called twice", function () {
      var shaderBuilder = new ShaderBuilder();
      var positionLocation = shaderBuilder.setPositionAttribute(
        "vec3",
        "a_position"
      );
      expect(positionLocation).toBe(0);
      expect(function () {
        return shaderBuilder.setPositionAttribute("vec3", "a_position2");
      }).toThrowDeveloperError();
    });

    it("addAttribute throws for undefined type", function () {
      var shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addAttribute(undefined, "a_position");
      }).toThrowDeveloperError();
    });

    it("addAttribute throws for invalid type", function () {
      var shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addAttribute(0, "a_position");
      }).toThrowDeveloperError();
    });

    it("addAttribute throws for undefined identifier", function () {
      var shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addAttribute("vec2", undefined);
      }).toThrowDeveloperError();
    });

    it("addAttribute throws for invalid identifier", function () {
      var shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addAttribute("vec2", 0);
      }).toThrowDeveloperError();
    });

    it("addAttribute creates an attribute in the vertex shader", function () {
      var shaderBuilder = new ShaderBuilder();

      // even though these are declared out of order, the results to
      var colorLocation = shaderBuilder.addAttribute("vec4", "a_color");
      var normalLocation = shaderBuilder.addAttribute("vec3", "a_normal");
      expect(colorLocation).toBe(1);
      expect(normalLocation).toBe(2);
      var shaderProgram = shaderBuilder.buildShaderProgram(context);
      var expectedAttributes = [
        "attribute vec4 a_color;",
        "attribute vec3 a_normal;",
      ];
      checkVertexShader(shaderProgram, [], expectedAttributes);
      checkFragmentShader(shaderProgram, [], []);
      var expectedLocations = {
        a_color: 1,
        a_normal: 2,
      };
      expect(shaderBuilder.attributeLocations).toEqual(expectedLocations);
      expect(shaderProgram._attributeLocations).toEqual(expectedLocations);
    });

    it("addVertexLines throws for undefined lines", function () {
      var shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addVertexLines(undefined);
      }).toThrowDeveloperError();
    });

    it("addVertexLines throws for invalid lines", function () {
      var shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addVertexLines("v_uv = a_uv;");
      }).toThrowDeveloperError();
    });

    it("addVertexLines appends lines to the vertex shader", function () {
      var shaderBuilder = new ShaderBuilder();
      var vertexLines = [
        "void main()",
        "{",
        "    gl_Position = vec4(0.0, 0.0, 0.0, 1.0);",
        "}",
      ];
      shaderBuilder.addVertexLines(vertexLines);
      var shaderProgram = shaderBuilder.buildShaderProgram(context);
      checkVertexShader(shaderProgram, [], vertexLines);
    });

    it("addFragmentLines throws for undefined lines", function () {
      var shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addFragmentLines(undefined);
      }).toThrowDeveloperError();
    });

    it("addFragmentLines throws for invalid lines", function () {
      var shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addFragmentLines("gl_FragColor = vec4(1.0);");
      }).toThrowDeveloperError();
    });

    it("addFragmentLines appends lines to the vertex shader", function () {
      var shaderBuilder = new ShaderBuilder();
      var fragmentLines = [
        "void main()",
        "{",
        "    gl_FragColor = vec4(1.0, 0.5, 0.0, 1.0);",
        "}",
      ];
      shaderBuilder.addFragmentLines(fragmentLines);
      var shaderProgram = shaderBuilder.buildShaderProgram(context);
      checkFragmentShader(shaderProgram, [], fragmentLines);
    });

    it("buildShaderProgram throws for undefined context", function () {
      var shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.buildShaderProgram(undefined);
      }).toThrowDeveloperError();
    });

    it("buildShaderProgram creates a shaderProgram", function () {
      var shaderBuilder = new ShaderBuilder();
      shaderBuilder.setPositionAttribute("vec3", "a_position");
      shaderBuilder.addAttribute("vec3", "a_uv");
      shaderBuilder.addDefine("BLUE_TINT", 0.5, ShaderDestination.FRAGMENT);
      var vertexLines = [
        "void main()",
        "{",
        "    v_uv = a_uv",
        "    gl_Position = vec4(a_position, 1.0);",
        "}",
      ];
      shaderBuilder.addVertexLines(vertexLines);

      var fragmentLines = [
        "void main()",
        "{",
        "    gl_FragColor = vec4(v_uv, BLUE_TINT, 1.0);",
        "}",
      ];
      shaderBuilder.addFragmentLines(fragmentLines);

      var expectedAttributes = [
        "attribute vec3 a_position;",
        "attribute vec3 a_uv;",
      ];

      var shaderProgram = shaderBuilder.buildShaderProgram(context);
      checkVertexShader(
        shaderProgram,
        [],
        expectedAttributes.concat(vertexLines)
      );
      checkFragmentShader(shaderProgram, ["BLUE_TINT 0.5"], fragmentLines);
    });
  },
  "WebGL"
);
