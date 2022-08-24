import {
  ShaderBuilder,
  ShaderDestination,
  ShaderSource,
} from "../../Source/Cesium.js";
import createContext from "../createContext.js";

describe(
  "Renderer/ShaderBuilder",
  function () {
    let context;
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
      const expectedText = new ShaderSource({
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
      const expectedText = new ShaderSource({
        defines: expectedDefines,
        sources: expectedSources,
      }).createCombinedFragmentShader(context);
      expect(shaderProgram._fragmentShaderText).toEqual(expectedText);
    }

    it("creates an empty shader by default", function () {
      const shaderBuilder = new ShaderBuilder();
      const shaderProgram = shaderBuilder.buildShaderProgram(context);
      checkVertexShader(shaderProgram, [], []);
      checkFragmentShader(shaderProgram, [], []);
    });

    it("addDefine throws for undefined identifier", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addDefine(undefined);
      }).toThrowDeveloperError();
    });

    it("addDefine throws for invalid identifier", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addDefine(42);
      }).toThrowDeveloperError();
    });

    it("addDefine defines macros without values", function () {
      const shaderBuilder = new ShaderBuilder();
      shaderBuilder.addDefine("USE_SHADOWS");
      const shaderProgram = shaderBuilder.buildShaderProgram(context);
      checkVertexShader(shaderProgram, ["USE_SHADOWS"], []);
      checkFragmentShader(shaderProgram, ["USE_SHADOWS"], []);
    });

    it("addDefine defines macros with values", function () {
      const shaderBuilder = new ShaderBuilder();
      shaderBuilder.addDefine("PI", 3.1415);
      const shaderProgram = shaderBuilder.buildShaderProgram(context);
      checkVertexShader(shaderProgram, ["PI 3.1415"], []);
      checkFragmentShader(shaderProgram, ["PI 3.1415"], []);
    });

    it("addDefine puts the define in the destination shader(s)", function () {
      const shaderBuilder = new ShaderBuilder();
      shaderBuilder.addDefine("POINT_SIZE", 2, ShaderDestination.VERTEX);
      shaderBuilder.addDefine("PI", 3.1415, ShaderDestination.FRAGMENT);
      shaderBuilder.addDefine(
        "USE_FRAGMENT_SHADING",
        1,
        ShaderDestination.BOTH
      );
      const shaderProgram = shaderBuilder.buildShaderProgram(context);
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
      const shaderBuilder = new ShaderBuilder();
      shaderBuilder.addDefine("PI", 3.1415);
      const shaderProgram = shaderBuilder.buildShaderProgram(context);
      checkVertexShader(shaderProgram, ["PI 3.1415"], []);
      checkFragmentShader(shaderProgram, ["PI 3.1415"], []);
    });

    it("addStruct throws for undefined structId", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addStruct(
          undefined,
          "TestStruct",
          ShaderDestination.FRAGMENT
        );
      }).toThrowDeveloperError();
    });

    it("addStruct throws for invalid structId", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addStruct(
          {},
          "TestStruct",
          ShaderDestination.FRAGMENT
        );
      }).toThrowDeveloperError();
    });

    it("addStruct throws for undefined structName", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addStruct(
          "testStruct",
          undefined,
          ShaderDestination.FRAGMENT
        );
      }).toThrowDeveloperError();
    });

    it("addStruct throws for invalid structId", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addStruct(
          "testStruct",
          {},
          ShaderDestination.FRAGMENT
        );
      }).toThrowDeveloperError();
    });

    it("addStruct throws for undefined destination", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addStruct("testStruct", "TestStruct", undefined);
      }).toThrowDeveloperError();
    });

    it("addStruct throws for invalid structId", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addStruct("testStruct", "TestStruct", "vertex");
      }).toThrowDeveloperError();
    });

    it("addStruct adds a struct to the shader", function () {
      const shaderBuilder = new ShaderBuilder();
      shaderBuilder.addStruct(
        "structVS",
        "TestStruct",
        ShaderDestination.VERTEX
      );
      shaderBuilder.addStruct(
        "structFS",
        "TestStruct",
        ShaderDestination.FRAGMENT
      );

      const shaderProgram = shaderBuilder.buildShaderProgram(context);
      checkVertexShader(
        shaderProgram,
        [],
        ["struct TestStruct", "{", "    float _empty;", "};"]
      );
      checkFragmentShader(
        shaderProgram,
        [],
        ["struct TestStruct", "{", "    float _empty;", "};"]
      );
    });

    it("addStructField throws for undefined structId", function () {
      const shaderBuilder = new ShaderBuilder();
      shaderBuilder.addStruct(
        "structVS",
        "TestStruct",
        ShaderDestination.VERTEX
      );
      expect(function () {
        return shaderBuilder.addStructField(undefined, "vec3", "positionMC");
      }).toThrowDeveloperError();
    });

    it("addStructField throws for invalid structId", function () {
      const shaderBuilder = new ShaderBuilder();
      shaderBuilder.addStruct(
        "structVS",
        "TestStruct",
        ShaderDestination.VERTEX
      );
      expect(function () {
        return shaderBuilder.addStructField(-1, "vec3", "positionMC");
      }).toThrowDeveloperError();
    });

    it("addStructField throws for undefined type", function () {
      const shaderBuilder = new ShaderBuilder();
      shaderBuilder.addStruct(
        "structVS",
        "TestStruct",
        ShaderDestination.VERTEX
      );
      expect(function () {
        return shaderBuilder.addStructField(
          "structVS",
          undefined,
          "positionMC"
        );
      }).toThrowDeveloperError();
    });

    it("addStructField throws for invalid type", function () {
      const shaderBuilder = new ShaderBuilder();
      shaderBuilder.addStruct(
        "structVS",
        "TestStruct",
        ShaderDestination.VERTEX
      );
      expect(function () {
        return shaderBuilder.addStructField("structVS", -1, "positionMC");
      }).toThrowDeveloperError();
    });

    it("addStructField throws for undefined identifier", function () {
      const shaderBuilder = new ShaderBuilder();
      shaderBuilder.addStruct(
        "structVS",
        "TestStruct",
        ShaderDestination.VERTEX
      );
      expect(function () {
        return shaderBuilder.addStructField("structVS", "vec3", undefined);
      }).toThrowDeveloperError();
    });

    it("addStructField throws for invalid identifier", function () {
      const shaderBuilder = new ShaderBuilder();
      shaderBuilder.addStruct(
        "structVS",
        "TestStruct",
        ShaderDestination.VERTEX
      );
      expect(function () {
        return shaderBuilder.addStructField("structVS", "vec3", -1);
      }).toThrowDeveloperError();
    });

    it("addStructField adds a struct field to the shader", function () {
      const shaderBuilder = new ShaderBuilder();
      shaderBuilder.addStruct(
        "structVS",
        "TestStruct",
        ShaderDestination.VERTEX
      );
      shaderBuilder.addStruct(
        "structFS",
        "TestStruct",
        ShaderDestination.FRAGMENT
      );

      shaderBuilder.addStructField("structVS", "vec3", "positionMC");
      shaderBuilder.addStructField("structFS", "vec3", "positionMC");
      shaderBuilder.addStructField("structFS", "float", "temperature");

      const shaderProgram = shaderBuilder.buildShaderProgram(context);
      checkVertexShader(
        shaderProgram,
        [],
        ["struct TestStruct", "{", "    vec3 positionMC;", "};"]
      );
      checkFragmentShader(
        shaderProgram,
        [],
        [
          "struct TestStruct",
          "{",
          "    vec3 positionMC;",
          "    float temperature;",
          "};",
        ]
      );
    });

    const signature = "float circleMask(float radius)";
    it("addFunction throws for undefined functionName", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addFunction(
          undefined,
          signature,
          ShaderDestination.FRAGMENT
        );
      }).toThrowDeveloperError();
    });

    it("addFunction throws for invalid functionName", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addFunction(
          {},
          signature,
          ShaderDestination.FRAGMENT
        );
      }).toThrowDeveloperError();
    });

    it("addFunction throws for undefined signature", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addFunction(
          "testFunction",
          undefined,
          ShaderDestination.FRAGMENT
        );
      }).toThrowDeveloperError();
    });

    it("addFunction throws for invalid signature", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addFunction(
          "testFunction",
          -1,
          ShaderDestination.FRAGMENT
        );
      }).toThrowDeveloperError();
    });

    it("addFunction throws for undefined destination", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addFunction("testFunction", signature, undefined);
      }).toThrowDeveloperError();
    });

    it("addFunction throws for invalid structId", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addFunction("testFunction", signature, "fragment");
      }).toThrowDeveloperError();
    });

    it("addFunction adds a struct to the shader", function () {
      const shaderBuilder = new ShaderBuilder();
      shaderBuilder.addFunction(
        "testFunctionVS",
        signature,
        ShaderDestination.VERTEX
      );
      shaderBuilder.addFunction(
        "testFunctionFS",
        signature,
        ShaderDestination.FRAGMENT
      );

      const shaderProgram = shaderBuilder.buildShaderProgram(context);
      checkVertexShader(shaderProgram, [], [signature, "{", "}"]);
      checkFragmentShader(shaderProgram, [], [signature, "{", "}"]);
    });

    it("addFunctionLines throws for undefined functionName", function () {
      const shaderBuilder = new ShaderBuilder();
      shaderBuilder.addFunction(
        "testFunctionVS",
        signature,
        ShaderDestination.VERTEX
      );
      expect(function () {
        return shaderBuilder.addFunctionLines(undefined, "return 1.0;");
      }).toThrowDeveloperError();
    });

    it("addFunctionLines throws for invalid functionName", function () {
      const shaderBuilder = new ShaderBuilder();
      shaderBuilder.addFunction(
        "testFunctionVS",
        signature,
        ShaderDestination.VERTEX
      );
      expect(function () {
        return shaderBuilder.addFunctionLines(-1, "return 1.0;");
      }).toThrowDeveloperError();
    });

    it("addFunctionLines throws for undefined lines", function () {
      const shaderBuilder = new ShaderBuilder();
      shaderBuilder.addFunction(
        "testFunctionVS",
        signature,
        ShaderDestination.VERTEX
      );
      expect(function () {
        return shaderBuilder.addFunctionLines("testFunctionVS", undefined);
      }).toThrowDeveloperError();
    });

    it("addFunctionLines throws for invalid lines", function () {
      const shaderBuilder = new ShaderBuilder();
      shaderBuilder.addFunction(
        "testFunctionVS",
        signature,
        ShaderDestination.VERTEX
      );
      expect(function () {
        return shaderBuilder.addFunctionLines("testFunctionVS", -1);
      }).toThrowDeveloperError();
    });

    it("addFunctionLines adds lines to the body of a function", function () {
      const shaderBuilder = new ShaderBuilder();
      shaderBuilder.addFunction(
        "testFunctionVS",
        signature,
        ShaderDestination.VERTEX
      );
      shaderBuilder.addFunction(
        "testFunctionFS",
        signature,
        ShaderDestination.FRAGMENT
      );

      shaderBuilder.addFunctionLines("testFunctionVS", [
        "v_color = vec3(0.0);",
        "return 1.0;",
      ]);
      shaderBuilder.addFunctionLines("testFunctionFS", [
        "return 1.0 - step(0.3, radius);",
      ]);

      const shaderProgram = shaderBuilder.buildShaderProgram(context);
      checkVertexShader(
        shaderProgram,
        [],
        [signature, "{", "    v_color = vec3(0.0);", "    return 1.0;", "}"]
      );
      checkFragmentShader(
        shaderProgram,
        [],
        [signature, "{", "    return 1.0 - step(0.3, radius);", "}"]
      );
    });

    it("addFunctionLines adds a single line to the body of the function", function () {
      const shaderBuilder = new ShaderBuilder();
      shaderBuilder.addFunction(
        "testFunctionVS",
        signature,
        ShaderDestination.VERTEX
      );
      shaderBuilder.addFunction(
        "testFunctionFS",
        signature,
        ShaderDestination.FRAGMENT
      );

      shaderBuilder.addFunctionLines("testFunctionVS", "return 1.0;");
      shaderBuilder.addFunctionLines("testFunctionFS", "return 2.0;");

      const shaderProgram = shaderBuilder.buildShaderProgram(context);
      checkVertexShader(
        shaderProgram,
        [],
        [signature, "{", "    return 1.0;", "}"]
      );
      checkFragmentShader(
        shaderProgram,
        [],
        [signature, "{", "    return 2.0;", "}"]
      );
    });

    it("addUniform throws for undefined type", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addUniform(undefined, "u_time");
      }).toThrowDeveloperError();
    });

    it("addUniform throws for invalid type", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addUniform(10, "u_time");
      }).toThrowDeveloperError();
    });

    it("addUniform throws for undefined identifier", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addUniform("vec3");
      }).toThrowDeveloperError();
    });

    it("addUniform throws for invalid identifier", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addUniform("vec3", 0);
      }).toThrowDeveloperError();
    });

    it("addUniform puts the uniform in the destination shader(s)", function () {
      const shaderBuilder = new ShaderBuilder();
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
      const shaderProgram = shaderBuilder.buildShaderProgram(context);
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
      const shaderBuilder = new ShaderBuilder();
      shaderBuilder.addUniform("float", "u_time");
      const shaderProgram = shaderBuilder.buildShaderProgram(context);
      checkVertexShader(shaderProgram, [], ["uniform float u_time;"]);
      checkFragmentShader(shaderProgram, [], ["uniform float u_time;"]);
    });

    it("setPositionAttribute throws for undefined type", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.setPositionAttribute(undefined, "a_position");
      }).toThrowDeveloperError();
    });

    it("setPositionAttribute throws for invalid type", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.setPositionAttribute(0, "a_position");
      }).toThrowDeveloperError();
    });

    it("setPositionAttribute throws for undefined identifier", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.setPositionAttribute("vec3", undefined);
      }).toThrowDeveloperError();
    });

    it("setPositionAttribute throws for invalid identifier", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.setPositionAttribute("vec3", 0);
      }).toThrowDeveloperError();
    });

    it("setPositionAttribute creates a position attribute in location 0", function () {
      const shaderBuilder = new ShaderBuilder();

      // Even though these are declared out of order, position will always
      // be assigned to location 0, and other attributes are assigned to
      // locations 1 or greater.
      const normalLocation = shaderBuilder.addAttribute("vec3", "a_normal");
      const positionLocation = shaderBuilder.setPositionAttribute(
        "vec3",
        "a_position"
      );
      expect(positionLocation).toBe(0);
      expect(normalLocation).toBe(1);
      const shaderProgram = shaderBuilder.buildShaderProgram(context);
      const expectedAttributes = [
        "attribute vec3 a_position;",
        "attribute vec3 a_normal;",
      ];
      checkVertexShader(shaderProgram, [], expectedAttributes);
      checkFragmentShader(shaderProgram, [], []);

      const expectedLocations = {
        a_position: 0,
        a_normal: 1,
      };
      expect(shaderBuilder.attributeLocations).toEqual(expectedLocations);
      expect(shaderProgram._attributeLocations).toEqual(expectedLocations);
    });

    it("setPositionAttribute throws if called twice", function () {
      const shaderBuilder = new ShaderBuilder();
      const positionLocation = shaderBuilder.setPositionAttribute(
        "vec3",
        "a_position"
      );
      expect(positionLocation).toBe(0);
      expect(function () {
        return shaderBuilder.setPositionAttribute("vec3", "a_position2");
      }).toThrowDeveloperError();
    });

    it("addAttribute throws for undefined type", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addAttribute(undefined, "a_position");
      }).toThrowDeveloperError();
    });

    it("addAttribute throws for invalid type", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addAttribute(0, "a_position");
      }).toThrowDeveloperError();
    });

    it("addAttribute throws for undefined identifier", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addAttribute("vec2", undefined);
      }).toThrowDeveloperError();
    });

    it("addAttribute throws for invalid identifier", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addAttribute("vec2", 0);
      }).toThrowDeveloperError();
    });

    it("addAttribute creates an attribute in the vertex shader", function () {
      const shaderBuilder = new ShaderBuilder();

      const colorLocation = shaderBuilder.addAttribute("vec4", "a_color");
      const normalLocation = shaderBuilder.addAttribute("vec3", "a_normal");
      expect(colorLocation).toBe(1);
      expect(normalLocation).toBe(2);
      const shaderProgram = shaderBuilder.buildShaderProgram(context);
      const expectedAttributes = [
        "attribute vec4 a_color;",
        "attribute vec3 a_normal;",
      ];
      checkVertexShader(shaderProgram, [], expectedAttributes);
      checkFragmentShader(shaderProgram, [], []);
      const expectedLocations = {
        a_color: 1,
        a_normal: 2,
      };
      expect(shaderBuilder.attributeLocations).toEqual(expectedLocations);
      expect(shaderProgram._attributeLocations).toEqual(expectedLocations);
    });

    it("addAttribute handles matrix attribute locations correctly", function () {
      const shaderBuilder = new ShaderBuilder();

      const matrixLocation = shaderBuilder.addAttribute("mat3", "a_warpMatrix");
      const colorLocation = shaderBuilder.addAttribute("vec3", "a_color");
      expect(matrixLocation).toBe(1);

      // this is 4 because the mat3 takes up locations 1, 2 and 3
      expect(colorLocation).toBe(4);
      const shaderProgram = shaderBuilder.buildShaderProgram(context);
      const expectedAttributes = [
        "attribute mat3 a_warpMatrix;",
        "attribute vec3 a_color;",
      ];
      checkVertexShader(shaderProgram, [], expectedAttributes);
      checkFragmentShader(shaderProgram, [], []);
      const expectedLocations = {
        a_warpMatrix: 1,
        a_color: 4,
      };
      expect(shaderBuilder.attributeLocations).toEqual(expectedLocations);
      expect(shaderProgram._attributeLocations).toEqual(expectedLocations);
    });

    it("addVarying throws for undefined type", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addVarying(undefined, "v_uv");
      }).toThrowDeveloperError();
    });

    it("addVarying throws for invalid type", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addVarying(0, "v_uv");
      }).toThrowDeveloperError();
    });

    it("addVarying throws for undefined identifier", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addVarying("vec2", undefined);
      }).toThrowDeveloperError();
    });

    it("addVarying throws for invalid identifier", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addVarying("vec2", 0);
      }).toThrowDeveloperError();
    });

    it("addVarying adds varyings to both shaders", function () {
      const shaderBuilder = new ShaderBuilder();
      shaderBuilder.addVarying("vec2", "v_uv");
      const expectedLines = ["varying vec2 v_uv;"];
      const shaderProgram = shaderBuilder.buildShaderProgram(context);
      checkVertexShader(shaderProgram, [], expectedLines);
      checkFragmentShader(shaderProgram, [], expectedLines);
    });

    it("addVertexLines throws for undefined lines", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addVertexLines(undefined);
      }).toThrowDeveloperError();
    });

    it("addVertexLines throws for invalid lines", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addVertexLines(-1);
      }).toThrowDeveloperError();
    });

    it("addVertexLines appends lines to the vertex shader", function () {
      const shaderBuilder = new ShaderBuilder();
      const vertexLines = [
        "void main()",
        "{",
        "    gl_Position = vec4(0.0, 0.0, 0.0, 1.0);",
        "}",
      ];
      shaderBuilder.addVertexLines(vertexLines);
      const shaderProgram = shaderBuilder.buildShaderProgram(context);
      checkVertexShader(shaderProgram, [], vertexLines);
    });

    it("addVertexLines appends a single line to the shader", function () {
      const shaderBuilder = new ShaderBuilder();
      shaderBuilder.addVertexLines("float sum;");
      const shaderProgram = shaderBuilder.buildShaderProgram(context);
      checkVertexShader(shaderProgram, [], ["float sum;"]);
    });

    it("addFragmentLines throws for undefined lines", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addFragmentLines(undefined);
      }).toThrowDeveloperError();
    });

    it("addFragmentLines throws for invalid lines", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.addFragmentLines(-1);
      }).toThrowDeveloperError();
    });

    it("addFragmentLines appends lines to the fragment shader", function () {
      const shaderBuilder = new ShaderBuilder();
      const fragmentLines = [
        "void main()",
        "{",
        "    gl_FragColor = vec4(1.0, 0.5, 0.0, 1.0);",
        "}",
      ];
      shaderBuilder.addFragmentLines(fragmentLines);
      const shaderProgram = shaderBuilder.buildShaderProgram(context);
      checkFragmentShader(shaderProgram, [], fragmentLines);
    });

    it("addFragmentLines appends a single line to the fragment shader", function () {
      const shaderBuilder = new ShaderBuilder();
      shaderBuilder.addFragmentLines("float sum;");
      const shaderProgram = shaderBuilder.buildShaderProgram(context);
      checkFragmentShader(shaderProgram, [], ["float sum;"]);
    });

    it("buildShaderProgram throws for undefined context", function () {
      const shaderBuilder = new ShaderBuilder();
      expect(function () {
        return shaderBuilder.buildShaderProgram(undefined);
      }).toThrowDeveloperError();
    });

    it("buildShaderProgram creates a shaderProgram", function () {
      const shaderBuilder = new ShaderBuilder();
      shaderBuilder.setPositionAttribute("vec3", "a_position");
      shaderBuilder.addAttribute("vec3", "a_uv");
      shaderBuilder.addVarying("vec2", "v_uv");
      shaderBuilder.addDefine("BLUE_TINT", 0.5, ShaderDestination.FRAGMENT);
      const vertexLines = [
        "void main()",
        "{",
        "    v_uv = a_uv",
        "    gl_Position = vec4(a_position, 1.0);",
        "}",
      ];
      shaderBuilder.addVertexLines(vertexLines);

      const fragmentLines = [
        "void main()",
        "{",
        "    gl_FragColor = vec4(v_uv, BLUE_TINT, 1.0);",
        "}",
      ];
      shaderBuilder.addFragmentLines(fragmentLines);

      const expectedAttributes = [
        "attribute vec3 a_position;",
        "attribute vec3 a_uv;",
      ];

      const expectedVaryings = ["varying vec2 v_uv;"];

      const shaderProgram = shaderBuilder.buildShaderProgram(context);
      checkVertexShader(
        shaderProgram,
        [],
        expectedAttributes.concat(expectedVaryings, vertexLines)
      );
      checkFragmentShader(
        shaderProgram,
        ["BLUE_TINT 0.5"],
        expectedVaryings.concat(fragmentLines)
      );
    });
  },
  "WebGL"
);
