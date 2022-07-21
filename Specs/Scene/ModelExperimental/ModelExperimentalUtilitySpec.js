import {
  AttributeType,
  Axis,
  Cartesian3,
  CullFace,
  InstanceAttributeSemantic,
  Matrix4,
  ModelExperimentalUtility,
  PrimitiveType,
  Quaternion,
  VertexAttributeSemantic,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelExperimentalUtility", function () {
  it("getNodeTransform works when node has a matrix", function () {
    const nodeWithMatrix = {
      matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    };

    const computedTransform = ModelExperimentalUtility.getNodeTransform(
      nodeWithMatrix
    );
    expect(Matrix4.equals(computedTransform, Matrix4.IDENTITY)).toEqual(true);
  });

  it("getNodeTransform works when node has translation, rotation, scale", function () {
    const nodeWithTRS = {
      translation: new Cartesian3(0, 0, 0),
      rotation: new Quaternion(0, 0, 0, 1),
      scale: new Cartesian3(1, 1, 1),
    };

    const computedTransform = ModelExperimentalUtility.getNodeTransform(
      nodeWithTRS
    );
    expect(Matrix4.equals(computedTransform, Matrix4.IDENTITY)).toEqual(true);
  });

  it("hasQuantizedAttributes returns false for undefined attributes", function () {
    expect(ModelExperimentalUtility.hasQuantizedAttributes()).toBe(false);
  });

  it("hasQuantizedAttributes detects quantized attributes", function () {
    const attributes = [
      {
        semantic: "POSITION",
        max: new Cartesian3(0.5, 0.5, 0.5),
        min: new Cartesian3(-0.5, -0.5, -0.5),
      },
      {
        semantic: "NORMAL",
      },
    ];

    expect(ModelExperimentalUtility.hasQuantizedAttributes(attributes)).toBe(
      false
    );

    attributes[1].quantization = {};
    expect(ModelExperimentalUtility.hasQuantizedAttributes(attributes)).toBe(
      true
    );
  });

  it("getAttributeInfo works for built-in attributes", function () {
    const attribute = {
      semantic: "POSITION",
      type: AttributeType.VEC3,
      max: new Cartesian3(0.5, 0.5, 0.5),
      min: new Cartesian3(-0.5, -0.5, -0.5),
    };

    expect(ModelExperimentalUtility.getAttributeInfo(attribute)).toEqual({
      attribute: attribute,
      isQuantized: false,
      variableName: "positionMC",
      hasSemantic: true,
      glslType: "vec3",
      quantizedGlslType: undefined,
    });
  });

  it("getAttributeInfo works for attributes with a set index", function () {
    const attribute = {
      semantic: "TEXCOORD",
      setIndex: 0,
      type: AttributeType.VEC2,
    };

    expect(ModelExperimentalUtility.getAttributeInfo(attribute)).toEqual({
      attribute: attribute,
      isQuantized: false,
      variableName: "texCoord_0",
      hasSemantic: true,
      glslType: "vec2",
      quantizedGlslType: undefined,
    });
  });

  it("getAttributeInfo promotes vertex colors to vec4 for GLSL", function () {
    const attribute = {
      semantic: "COLOR",
      setIndex: 0,
      type: AttributeType.VEC3,
    };

    expect(ModelExperimentalUtility.getAttributeInfo(attribute)).toEqual({
      attribute: attribute,
      isQuantized: false,
      variableName: "color_0",
      hasSemantic: true,
      glslType: "vec4",
      quantizedGlslType: undefined,
    });
  });

  it("getAttributeInfo works for custom attributes", function () {
    const attribute = {
      name: "_TEMPERATURE",
      type: AttributeType.SCALAR,
    };

    expect(ModelExperimentalUtility.getAttributeInfo(attribute)).toEqual({
      attribute: attribute,
      isQuantized: false,
      variableName: "temperature",
      hasSemantic: false,
      glslType: "float",
      quantizedGlslType: undefined,
    });
  });

  it("getAttributeInfo works for quantized attributes", function () {
    let attribute = {
      semantic: "POSITION",
      type: AttributeType.VEC3,
      max: new Cartesian3(0.5, 0.5, 0.5),
      min: new Cartesian3(-0.5, -0.5, -0.5),
      quantization: {
        type: AttributeType.VEC3,
      },
    };

    expect(ModelExperimentalUtility.getAttributeInfo(attribute)).toEqual({
      attribute: attribute,
      isQuantized: true,
      variableName: "positionMC",
      hasSemantic: true,
      glslType: "vec3",
      quantizedGlslType: "vec3",
    });

    attribute = {
      semantic: "NORMAL",
      type: AttributeType.VEC3,
      quantization: {
        type: AttributeType.VEC2,
      },
    };

    expect(ModelExperimentalUtility.getAttributeInfo(attribute)).toEqual({
      attribute: attribute,
      isQuantized: true,
      variableName: "normalMC",
      hasSemantic: true,
      glslType: "vec3",
      quantizedGlslType: "vec2",
    });
  });

  it("getAttributeInfo handles quantized vertex colors correctly", function () {
    const attribute = {
      semantic: "COLOR",
      setIndex: 0,
      type: AttributeType.VEC3,
      quantization: {
        type: AttributeType.VEC3,
      },
    };

    expect(ModelExperimentalUtility.getAttributeInfo(attribute)).toEqual({
      attribute: attribute,
      isQuantized: true,
      variableName: "color_0",
      hasSemantic: true,
      glslType: "vec4",
      quantizedGlslType: "vec4",
    });
  });

  it("getPositionMinMax works", function () {
    const attributes = [
      {
        semantic: "POSITION",
        max: new Cartesian3(0.5, 0.5, 0.5),
        min: new Cartesian3(-0.5, -0.5, -0.5),
      },
    ];
    const mockPrimitive = {
      attributes: attributes,
    };

    const minMax = ModelExperimentalUtility.getPositionMinMax(mockPrimitive);

    expect(minMax.min).toEqual(attributes[0].min);
    expect(minMax.max).toEqual(attributes[0].max);
  });

  it("getPositionMinMax works with instancing", function () {
    const attributes = [
      {
        semantic: "POSITION",
        max: new Cartesian3(0.5, 0.5, 0.5),
        min: new Cartesian3(-0.5, -0.5, -0.5),
      },
    ];
    const mockPrimitive = {
      attributes: attributes,
    };

    const minMax = ModelExperimentalUtility.getPositionMinMax(
      mockPrimitive,
      new Cartesian3(-5, -5, -5),
      new Cartesian3(5, 5, 5)
    );

    const expectedMin = new Cartesian3(-5.5, -5.5, -5.5);
    const expectedMax = new Cartesian3(5.5, 5.5, 5.5);
    expect(minMax.min).toEqual(expectedMin);
    expect(minMax.max).toEqual(expectedMax);
  });

  it("getAxisCorrectionMatrix works", function () {
    const expectedYToZMatrix = Axis.Y_UP_TO_Z_UP;
    const expectedXToZMatrix = Axis.X_UP_TO_Z_UP;
    const expectedCombinedMatrix = Matrix4.multiplyTransformation(
      expectedYToZMatrix,
      Axis.Z_UP_TO_X_UP,
      new Matrix4()
    );

    // If already in ECEF, this should return identity
    let resultMatrix = ModelExperimentalUtility.getAxisCorrectionMatrix(
      Axis.Z,
      Axis.X,
      new Matrix4()
    );
    expect(Matrix4.equals(resultMatrix, Matrix4.IDENTITY)).toBe(true);

    // This is the most common case, glTF uses y-up, z-forward
    resultMatrix = ModelExperimentalUtility.getAxisCorrectionMatrix(
      Axis.Y,
      Axis.Z,
      new Matrix4()
    );
    expect(Matrix4.equals(resultMatrix, expectedCombinedMatrix)).toBe(true);

    // Other cases
    resultMatrix = ModelExperimentalUtility.getAxisCorrectionMatrix(
      Axis.Y,
      Axis.X,
      new Matrix4()
    );
    expect(Matrix4.equals(resultMatrix, expectedYToZMatrix)).toBe(true);

    resultMatrix = ModelExperimentalUtility.getAxisCorrectionMatrix(
      Axis.X,
      Axis.Y,
      new Matrix4()
    );
    expect(Matrix4.equals(resultMatrix, expectedXToZMatrix)).toBe(true);
  });

  it("getAttributeBySemantic works", function () {
    const nodeIntanceAttributes = {
      attributes: [
        { semantic: InstanceAttributeSemantic.TRANSLATION },
        { semantic: InstanceAttributeSemantic.ROTATION },
        { semantic: InstanceAttributeSemantic.SCALE },
        { semantic: InstanceAttributeSemantic.FEATURE_ID },
      ],
    };

    expect(
      ModelExperimentalUtility.getAttributeBySemantic(
        nodeIntanceAttributes,
        InstanceAttributeSemantic.TRANSLATION
      )
    ).toBeDefined();
    expect(
      ModelExperimentalUtility.getAttributeBySemantic(
        nodeIntanceAttributes,
        InstanceAttributeSemantic.ROTATION
      )
    ).toBeDefined();
    expect(
      ModelExperimentalUtility.getAttributeBySemantic(
        nodeIntanceAttributes,
        InstanceAttributeSemantic.SCALE
      )
    ).toBeDefined();
    expect(
      ModelExperimentalUtility.getAttributeBySemantic(
        nodeIntanceAttributes,
        InstanceAttributeSemantic.FEATURE_ID
      )
    ).toBeDefined();
    expect(
      ModelExperimentalUtility.getAttributeBySemantic(
        nodeIntanceAttributes,
        "UNKNOWN"
      )
    ).toBeUndefined();

    const primitiveAttributes = {
      attributes: [
        { semantic: VertexAttributeSemantic.POSITION },
        { semantic: VertexAttributeSemantic.NORMAL },
        { semantic: VertexAttributeSemantic.TANGENT },
        { semantic: VertexAttributeSemantic.TEXCOORD, setIndex: 0 },
        { semantic: VertexAttributeSemantic.TEXCOORD, setIndex: 1 },
      ],
    };

    expect(
      ModelExperimentalUtility.getAttributeBySemantic(
        primitiveAttributes,
        VertexAttributeSemantic.POSITION
      )
    ).toBeDefined();
    expect(
      ModelExperimentalUtility.getAttributeBySemantic(
        primitiveAttributes,
        VertexAttributeSemantic.NORMAL
      )
    ).toBeDefined();
    expect(
      ModelExperimentalUtility.getAttributeBySemantic(
        primitiveAttributes,
        VertexAttributeSemantic.TANGENT
      )
    ).toBeDefined();
    expect(
      ModelExperimentalUtility.getAttributeBySemantic(
        primitiveAttributes,
        VertexAttributeSemantic.TEXCOORD,
        0
      )
    ).toBeDefined();
    expect(
      ModelExperimentalUtility.getAttributeBySemantic(
        primitiveAttributes,
        VertexAttributeSemantic.TEXCOORD,
        1
      )
    ).toBeDefined();
    expect(
      ModelExperimentalUtility.getAttributeBySemantic(
        primitiveAttributes,
        "UNKNOWN"
      )
    ).toBeUndefined();
  });

  it("getFeatureIdsByLabel gets feature ID sets by label", function () {
    const featureIds = [{ label: "perVertex" }, { label: "perFace" }];

    expect(
      ModelExperimentalUtility.getFeatureIdsByLabel(featureIds, "perVertex")
    ).toBe(featureIds[0]);
    expect(
      ModelExperimentalUtility.getFeatureIdsByLabel(featureIds, "perFace")
    ).toBe(featureIds[1]);
  });

  it("getFeatureIdsByLabel gets feature ID sets by positional label", function () {
    const featureIds = [
      { positionalLabel: "featureId_0" },
      { positionalLabel: "featureId_1" },
    ];

    expect(
      ModelExperimentalUtility.getFeatureIdsByLabel(featureIds, "featureId_0")
    ).toBe(featureIds[0]);
    expect(
      ModelExperimentalUtility.getFeatureIdsByLabel(featureIds, "featureId_1")
    ).toBe(featureIds[1]);
  });

  it("getFeatureIdsByLabel returns undefined for unknown label", function () {
    const featureIds = [{ label: "perVertex" }, { label: "perFace" }];

    expect(
      ModelExperimentalUtility.getFeatureIdsByLabel(featureIds, "other")
    ).not.toBeDefined();
  });

  function expectCullFace(matrix, primitiveType, cullFace) {
    expect(ModelExperimentalUtility.getCullFace(matrix, primitiveType)).toBe(
      cullFace
    );
  }

  it("getCullFace returns CullFace.BACK when primitiveType is not triangles", function () {
    const matrix = Matrix4.fromUniformScale(-1.0);
    expectCullFace(matrix, PrimitiveType.POINTS, CullFace.BACK);
    expectCullFace(matrix, PrimitiveType.LINES, CullFace.BACK);
    expectCullFace(matrix, PrimitiveType.LINE_LOOP, CullFace.BACK);
    expectCullFace(matrix, PrimitiveType.LINE_STRIP, CullFace.BACK);
  });

  it("getCullFace return CullFace.BACK when determinant is greater than zero", function () {
    const matrix = Matrix4.IDENTITY;
    expectCullFace(matrix, PrimitiveType.TRIANGLES, CullFace.BACK);
    expectCullFace(matrix, PrimitiveType.TRIANGLE_STRIP, CullFace.BACK);
    expectCullFace(matrix, PrimitiveType.TRIANGLE_FAN, CullFace.BACK);
  });

  it("getCullFace return CullFace.FRONT when determinant is less than zero", function () {
    const matrix = Matrix4.fromUniformScale(-1.0);
    expectCullFace(matrix, PrimitiveType.TRIANGLES, CullFace.FRONT);
    expectCullFace(matrix, PrimitiveType.TRIANGLE_STRIP, CullFace.FRONT);
    expectCullFace(matrix, PrimitiveType.TRIANGLE_FAN, CullFace.FRONT);
  });

  it("sanitizeGlslIdentifier removes non-alphanumeric characters", function () {
    const identifier = "temperature ℃";
    const result = ModelExperimentalUtility.sanitizeGlslIdentifier(identifier);
    expect(result).toEqual("temperature_");
  });
  it("sanitizeGlslIdentifier removes consecutive underscores", function () {
    const identifier = "custom__property";
    const result = ModelExperimentalUtility.sanitizeGlslIdentifier(identifier);
    expect(result).toEqual("custom_property");
  });

  it("sanitizeGlslIdentifier removes gl_ prefix", function () {
    const identifier = "gl_customProperty";
    const result = ModelExperimentalUtility.sanitizeGlslIdentifier(identifier);
    expect(result).toEqual("customProperty");
  });

  it("sanitizeGlslIdentifier adds underscore to digit identifier", function () {
    const identifier = "1234";
    const result = ModelExperimentalUtility.sanitizeGlslIdentifier(identifier);
    expect(result).toEqual("_1234");
  });

  it("sanitizeGlslIdentifier handles all cases", function () {
    const identifier = "gl_1st__test℃_variable";
    const result = ModelExperimentalUtility.sanitizeGlslIdentifier(identifier);
    expect(result).toEqual("_1st_test_variable");
  });
});
