import { VertexAttributeSemantic } from "../../Source/Cesium.js";

describe("Scene/VertexAttributeSemantic", function () {
  it("hasSetIndex", function () {
    var semantics = [
      VertexAttributeSemantic.POSITION,
      VertexAttributeSemantic.NORMAL,
      VertexAttributeSemantic.TANGENT,
      VertexAttributeSemantic.TEXCOORD,
      VertexAttributeSemantic.COLOR,
      VertexAttributeSemantic.JOINTS,
      VertexAttributeSemantic.WEIGHTS,
      VertexAttributeSemantic.FEATURE_ID,
    ];

    var hasSetIndex = [false, false, false, true, true, true, true, true];

    var semanticsLength = semantics.length;
    for (var i = 0; i < semanticsLength; ++i) {
      expect(VertexAttributeSemantic.hasSetIndex(semantics[i])).toBe(
        hasSetIndex[i]
      );
    }
  });

  it("hasSetIndex throws if semantic is undefined", function () {
    expect(function () {
      VertexAttributeSemantic.hasSetIndex(undefined);
    }).toThrowDeveloperError();
  });

  it("hasSetIndex throws if semantic is not a valid value", function () {
    expect(function () {
      VertexAttributeSemantic.hasSetIndex("OTHER");
    }).toThrowDeveloperError();
  });

  it("fromGltfSemantic", function () {
    var gltfSemantics = [
      "POSITION",
      "NORMAL",
      "TANGENT",
      "TEXCOORD_0",
      "TEXCOORD_1",
      "COLOR_0",
      "COLOR_1",
      "JOINTS_0",
      "JOINTS_1",
      "WEIGHTS_0",
      "WEIGHTS_1",
      "_FEATURE_ID_0",
      "_FEATURE_ID_1",
      "_BATCHID",
      "BATCHID",
      "_OTHER",
    ];

    var expectedSemantics = [
      VertexAttributeSemantic.POSITION,
      VertexAttributeSemantic.NORMAL,
      VertexAttributeSemantic.TANGENT,
      VertexAttributeSemantic.TEXCOORD,
      VertexAttributeSemantic.TEXCOORD,
      VertexAttributeSemantic.COLOR,
      VertexAttributeSemantic.COLOR,
      VertexAttributeSemantic.JOINTS,
      VertexAttributeSemantic.JOINTS,
      VertexAttributeSemantic.WEIGHTS,
      VertexAttributeSemantic.WEIGHTS,
      VertexAttributeSemantic.FEATURE_ID,
      VertexAttributeSemantic.FEATURE_ID,
      VertexAttributeSemantic.FEATURE_ID,
      VertexAttributeSemantic.FEATURE_ID,
      undefined,
    ];

    var semanticsLength = gltfSemantics.length;
    for (var i = 0; i < semanticsLength; ++i) {
      expect(VertexAttributeSemantic.fromGltfSemantic(gltfSemantics[i])).toBe(
        expectedSemantics[i]
      );
    }
  });

  it("fromGltfSemantic throws if gltfSemantic is undefined", function () {
    expect(function () {
      VertexAttributeSemantic.fromGltfSemantic(undefined);
    }).toThrowDeveloperError();
  });

  it("fromPntsSemantic", function () {
    var pntsSemantics = [
      "POSITION",
      "POSITION_QUANTIZED",
      "RGBA",
      "RGB",
      "RGB565",
      "NORMAL",
      "NORMAL_OCT16P",
      "BATCH_ID",
    ];

    var expectedSemantics = [
      VertexAttributeSemantic.POSITION,
      VertexAttributeSemantic.POSITION,
      VertexAttributeSemantic.COLOR,
      VertexAttributeSemantic.COLOR,
      VertexAttributeSemantic.COLOR,
      VertexAttributeSemantic.NORMAL,
      VertexAttributeSemantic.NORMAL,
      VertexAttributeSemantic.FEATURE_ID,
    ];

    var semanticsLength = pntsSemantics.length;
    for (var i = 0; i < semanticsLength; ++i) {
      expect(VertexAttributeSemantic.fromPntsSemantic(pntsSemantics[i])).toBe(
        expectedSemantics[i]
      );
    }
  });

  it("fromPntsSemantic throws if pntsSemantic is undefined", function () {
    expect(function () {
      VertexAttributeSemantic.fromPntsSemantic(undefined);
    }).toThrowDeveloperError();
  });

  it("fromPntsSemantic throws if pntsSemantic is not a valid value", function () {
    expect(function () {
      VertexAttributeSemantic.fromPntsSemantic("OTHER");
    }).toThrowDeveloperError();
  });

  it("getGlslType", function () {
    var semantics = [
      VertexAttributeSemantic.POSITION,
      VertexAttributeSemantic.NORMAL,
      VertexAttributeSemantic.TANGENT,
      VertexAttributeSemantic.TEXCOORD,
      VertexAttributeSemantic.COLOR,
      VertexAttributeSemantic.JOINTS,
      VertexAttributeSemantic.WEIGHTS,
      VertexAttributeSemantic.FEATURE_ID,
    ];

    var expectedShaderTypes = [
      "vec3",
      "vec3",
      "vec3",
      "vec2",
      "vec4",
      "ivec4",
      "vec4",
      "int",
    ];

    var semanticsLength = semantics.length;
    for (var i = 0; i < semanticsLength; ++i) {
      expect(VertexAttributeSemantic.getGlslType(semantics[i])).toBe(
        expectedShaderTypes[i]
      );
    }
  });

  it("getGlslType throws if semantic is undefined", function () {
    expect(function () {
      VertexAttributeSemantic.getGlslType(undefined);
    }).toThrowDeveloperError();
  });

  it("getGlslType throws if semantic is not a valid value", function () {
    expect(function () {
      VertexAttributeSemantic.getGlslType("OTHER");
    }).toThrowDeveloperError();
  });

  it("getVariableName", function () {
    var semantics = [
      VertexAttributeSemantic.POSITION,
      VertexAttributeSemantic.NORMAL,
      VertexAttributeSemantic.TANGENT,
      VertexAttributeSemantic.TEXCOORD,
      VertexAttributeSemantic.COLOR,
      VertexAttributeSemantic.JOINTS,
      VertexAttributeSemantic.WEIGHTS,
      VertexAttributeSemantic.FEATURE_ID,
    ];

    var expectedVariableName = [
      "positionMC",
      "normalMC",
      "tangentMC",
      "texCoord",
      "color",
      "joints",
      "weights",
      "featureId",
    ];

    var semanticsLength = semantics.length;
    for (var i = 0; i < semanticsLength; ++i) {
      expect(VertexAttributeSemantic.getVariableName(semantics[i])).toBe(
        expectedVariableName[i]
      );
    }
  });

  it("getVariableName works with set index", function () {
    expect(
      VertexAttributeSemantic.getVariableName(
        VertexAttributeSemantic.FEATURE_ID,
        0
      )
    ).toBe("featureId_0");
  });

  it("getVariableName throws if semantic is undefined", function () {
    expect(function () {
      VertexAttributeSemantic.getVariableName(undefined);
    }).toThrowDeveloperError();
  });

  it("getVariableName throws if semantic is not a valid value", function () {
    expect(function () {
      VertexAttributeSemantic.getVariableName("OTHER");
    }).toThrowDeveloperError();
  });
});
