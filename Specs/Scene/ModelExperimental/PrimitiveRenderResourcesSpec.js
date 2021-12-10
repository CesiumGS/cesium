import {
  AttributeType,
  BlendingState,
  Cartesian3,
  ComponentDatatype,
  DepthFunction,
  LightingModel,
  Math as CesiumMath,
  Matrix4,
  ModelExperimentalNode,
  ModelExperimentalPrimitive,
  PrimitiveType,
  ModelRenderResources,
  NodeRenderResources,
  PrimitiveRenderResources,
  VertexAttributeSemantic,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/PrimitiveRenderResources", function () {
  var mockModel = {
    modelMatrix: Matrix4.IDENTITY,
  };
  var mockNode = {};
  var runtimeNode = new ModelExperimentalNode({
    node: mockNode,
    modelMatrix: Matrix4.IDENTITY,
  });

  function checkShaderDefines(shaderBuilder, expectedDefines) {
    expect(shaderBuilder._fragmentShaderParts.defineLines).toEqual(
      expectedDefines
    );
  }

  var primitive = {
    indices: {
      count: 6,
    },
    primitiveType: PrimitiveType.TRIANGLES,
    featureIdAttributes: [],
    featureIdTextures: [],
    attributes: [
      {
        semantic: VertexAttributeSemantic.POSITION,
        buffer: new Float32Array([0, 1, 2, 3, 4, 5]).buffer,
        type: AttributeType.VEC3,
        componentDatatype: ComponentDatatype.FLOAT,
        min: new Cartesian3(-1, -1, -1),
        max: new Cartesian3(1, 1, 1),
      },
    ],
  };

  var primitiveWithoutIndices = {
    primitiveType: PrimitiveType.POINTS,
    featureIdAttributes: [],
    featureIdTextures: [],
    attributes: [
      {
        semantic: VertexAttributeSemantic.POSITION,
        buffer: new Float32Array([0, 1, 2, 3, 4, 5, 6, 7, 8]).buffer,
        type: AttributeType.VEC3,
        componentDatatype: ComponentDatatype.FLOAT,
        count: 8,
        min: new Cartesian3(-2, -2, -2),
        max: new Cartesian3(2, 2, 2),
      },
    ],
  };

  var runtimePrimitive = new ModelExperimentalPrimitive({
    primitive: primitive,
    node: mockNode,
    model: mockModel,
  });

  var runtimePrimitiveWithoutIndices = new ModelExperimentalPrimitive({
    primitive: primitiveWithoutIndices,
    node: mockNode,
    model: mockModel,
  });

  var expectedDepthTest = {
    depthTest: {
      enabled: true,
      func: DepthFunction.LESS_OR_EQUAL,
    },
    blending: BlendingState.DISABLED,
  };

  it("throws for undefined nodeRenderResources", function () {
    expect(function () {
      return new PrimitiveRenderResources(undefined, runtimePrimitive);
    }).toThrowDeveloperError();
  });

  it("throws for undefined runtimePrimitive", function () {
    expect(function () {
      var modelResources = new ModelRenderResources(mockModel);
      var nodeResources = new NodeRenderResources(modelResources, runtimeNode);
      return new PrimitiveRenderResources(nodeResources, undefined);
    }).toThrowDeveloperError();
  });

  it("constructs", function () {
    var modelResources = new ModelRenderResources(mockModel);
    var nodeResources = new NodeRenderResources(modelResources, runtimeNode);
    var primitiveResources = new PrimitiveRenderResources(
      nodeResources,
      runtimePrimitive
    );

    expect(primitiveResources.runtimePrimitive).toBe(runtimePrimitive);
    expect(primitiveResources.pickId).toBeUndefined();
    expect(primitiveResources.count).toBe(6);
    expect(primitiveResources.indices).toBe(primitive.indices);
    expect(primitiveResources.primitiveType).toBe(PrimitiveType.TRIANGLES);
    // The points are in a cube from -1, -1, -1 to 1, 1, 1. The center is
    // (0, 0, 0). The full diagonal is 2 * sqrt(3), so half is sqrt(3)
    expect(primitiveResources.boundingSphere.center).toEqualEpsilon(
      Cartesian3.ZERO,
      CesiumMath.EPSILON9
    );
    expect(primitiveResources.boundingSphere.radius).toEqualEpsilon(
      Math.sqrt(3),
      CesiumMath.EPSILON9
    );
    expect(primitiveResources.uniformMap).toEqual({});
    expect(primitiveResources.lightingOptions.lightingModel).toEqual(
      LightingModel.UNLIT
    );
    expect(primitiveResources.renderStateOptions).toEqual(expectedDepthTest);
  });

  it("constructs from primitive without indices", function () {
    var modelResources = new ModelRenderResources(mockModel);
    var nodeResources = new NodeRenderResources(modelResources, runtimeNode);
    var primitiveResources = new PrimitiveRenderResources(
      nodeResources,
      runtimePrimitiveWithoutIndices
    );

    expect(primitiveResources.count).toBe(8);
    expect(primitiveResources.indices).not.toBeDefined();
    expect(primitiveResources.primitiveType).toBe(PrimitiveType.POINTS);

    // The points are in a cube from -2, -2, -2 to 2, 2, 2. The center is
    // (0, 0, 0). The full diagonal is 4 * sqrt(3), so half is 2 * sqrt(3)
    expect(primitiveResources.boundingSphere.center).toEqualEpsilon(
      Cartesian3.ZERO,
      CesiumMath.EPSILON9
    );
    expect(primitiveResources.boundingSphere.radius).toEqualEpsilon(
      2.0 * Math.sqrt(3),
      CesiumMath.EPSILON9
    );
    expect(primitiveResources.uniformMap).toEqual({});
    expect(primitiveResources.lightingOptions.lightingModel).toEqual(
      LightingModel.UNLIT
    );
    expect(primitiveResources.renderStateOptions).toEqual(expectedDepthTest);
  });

  it("inherits from model render resources", function () {
    var modelResources = new ModelRenderResources(mockModel);
    modelResources.shaderBuilder.addDefine("MODEL");
    var nodeResources = new NodeRenderResources(modelResources, runtimeNode);
    nodeResources.shaderBuilder.addDefine("NODE");
    var primitiveResources = new PrimitiveRenderResources(
      nodeResources,
      runtimePrimitive
    );
    primitiveResources.shaderBuilder.addDefine("PRIMITIVE");

    expect(primitiveResources.model).toBe(mockModel);

    // The primitive's shader builder should be a clone of the node's
    expect(primitiveResources.shaderBuilder).not.toBe(
      modelResources.shaderBuilder
    );
    expect(primitiveResources.shaderBuilder).not.toBe(
      modelResources.shaderBuilder
    );

    // The defines should cascade through the three levels
    checkShaderDefines(modelResources.shaderBuilder, ["MODEL"]);
    checkShaderDefines(nodeResources.shaderBuilder, ["MODEL", "NODE"]);
    checkShaderDefines(primitiveResources.shaderBuilder, [
      "MODEL",
      "NODE",
      "PRIMITIVE",
    ]);
  });

  it("inherits from node render resources", function () {
    var modelResources = new ModelRenderResources(mockModel);
    modelResources.shaderBuilder.addDefine("MODEL");
    var nodeResources = new NodeRenderResources(modelResources, runtimeNode);
    nodeResources.shaderBuilder.addDefine("NODE");
    var primitiveResources = new PrimitiveRenderResources(
      nodeResources,
      runtimePrimitive
    );
    expect(primitiveResources.runtimeNode).toBe(runtimeNode);
    expect(primitiveResources.modelMatrix).toEqual(runtimeNode.modelMatrix);
    expect(primitiveResources.attributes).toEqual([]);
  });
});
