import { VertexAttributeSemantic } from "../../Source/Cesium.js";

describe("Scene/VertexAttributeSemantic", function () {
  it("hasSetIndex", function () {
    const semantics = [
      VertexAttributeSemantic.POSITION,
      VertexAttributeSemantic.NORMAL,
      VertexAttributeSemantic.TANGENT,
      VertexAttributeSemantic.TEXCOORD,
      VertexAttributeSemantic.COLOR,
      VertexAttributeSemantic.JOINTS,
      VertexAttributeSemantic.WEIGHTS,
      VertexAttributeSemantic.FEATURE_ID,
    ];

    const hasSetIndex = [false, false, false, true, true, true, true, true];

    const semanticsLength = semantics.length;
    for (let i = 0; i < semanticsLength; ++i) {
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
    const gltfSemantics = [
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
      "_OTHER",
    ];

    const expectedSemantics = [
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
      undefined,
    ];

    const semanticsLength = gltfSemantics.length;
    for (let i = 0; i < semanticsLength; ++i) {
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
    const pntsSemantics = [
      "POSITION",
      "POSITION_QUANTIZED",
      "RGBA",
      "RGB",
      "RGB565",
      "NORMAL",
      "NORMAL_OCT16P",
      "BATCH_ID",
    ];

    const expectedSemantics = [
      VertexAttributeSemantic.POSITION,
      VertexAttributeSemantic.POSITION,
      VertexAttributeSemantic.COLOR,
      VertexAttributeSemantic.COLOR,
      VertexAttributeSemantic.COLOR,
      VertexAttributeSemantic.NORMAL,
      VertexAttributeSemantic.NORMAL,
      VertexAttributeSemantic.FEATURE_ID,
    ];

    const semanticsLength = pntsSemantics.length;
    for (let i = 0; i < semanticsLength; ++i) {
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
    const semantics = [
      VertexAttributeSemantic.POSITION,
      VertexAttributeSemantic.NORMAL,
      VertexAttributeSemantic.TANGENT,
      VertexAttributeSemantic.TEXCOORD,
      VertexAttributeSemantic.COLOR,
      VertexAttributeSemantic.JOINTS,
      VertexAttributeSemantic.WEIGHTS,
      VertexAttributeSemantic.FEATURE_ID,
    ];

    const expectedShaderTypes = [
      "vec3",
      "vec3",
      "vec3",
      "vec2",
      "vec4",
      "ivec4",
      "vec4",
      "int",
    ];

    const semanticsLength = semantics.length;
    for (let i = 0; i < semanticsLength; ++i) {
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
    const semantics = [
      VertexAttributeSemantic.POSITION,
      VertexAttributeSemantic.NORMAL,
      VertexAttributeSemantic.TANGENT,
      VertexAttributeSemantic.TEXCOORD,
      VertexAttributeSemantic.COLOR,
      VertexAttributeSemantic.JOINTS,
      VertexAttributeSemantic.WEIGHTS,
      VertexAttributeSemantic.FEATURE_ID,
    ];

    const expectedVariableName = [
      "positionMC",
      "normalMC",
      "tangentMC",
      "texCoord",
      "color",
      "joints",
      "weights",
      "featureId",
    ];

    const semanticsLength = semantics.length;
    for (let i = 0; i < semanticsLength; ++i) {
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
