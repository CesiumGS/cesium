import {
  AttributeType,
  Axis,
  BlendingState,
  Cartesian3,
  clone,
  ComponentDatatype,
  DepthFunction,
  LightingModel,
  Math as CesiumMath,
  Matrix4,
  ModelExperimentalRuntimeNode,
  ModelExperimentalRuntimePrimitive,
  ModelExperimentalType,
  PrimitiveType,
  ModelRenderResources,
  NodeRenderResources,
  PrimitiveRenderResources,
  RenderState,
  VertexAttributeSemantic,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/PrimitiveRenderResources", function () {
  const mockModel = {
    modelMatrix: Matrix4.IDENTITY,
    type: ModelExperimentalType.GLTF,
  };
  const mockNode = {};
  const mockSceneGraph = {
    computedModelMatrix: Matrix4.IDENTITY,
    components: {
      upAxis: Axis.Y,
      forwardAxis: Axis.Z,
    },
  };

  const runtimeNode = new ModelExperimentalRuntimeNode({
    node: mockNode,
    transform: Matrix4.IDENTITY,
    transformToRoot: Matrix4.fromTranslation(new Cartesian3(1, 2, 3)),
    sceneGraph: mockSceneGraph,
    children: [],
  });

  function checkShaderDefines(shaderBuilder, expectedDefines) {
    expect(shaderBuilder._fragmentShaderParts.defineLines).toEqual(
      expectedDefines
    );
  }

  const primitive = {
    indices: {
      count: 6,
    },
    primitiveType: PrimitiveType.TRIANGLES,
    featureIds: [],
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

  const primitiveWithoutIndices = {
    primitiveType: PrimitiveType.POINTS,
    featureIds: [],
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

  const defaultRenderState = clone(
    RenderState.fromCache({
      depthTest: {
        enabled: true,
        func: DepthFunction.LESS_OR_EQUAL,
      },
    }),
    true
  );

  let runtimePrimitive;
  let runtimePrimitiveWithoutIndices;
  beforeAll(function () {
    runtimePrimitive = new ModelExperimentalRuntimePrimitive({
      primitive: primitive,
      node: mockNode,
      model: mockModel,
    });

    runtimePrimitiveWithoutIndices = new ModelExperimentalRuntimePrimitive({
      primitive: primitiveWithoutIndices,
      node: mockNode,
      model: mockModel,
    });
  });

  it("throws for undefined nodeRenderResources", function () {
    expect(function () {
      return new PrimitiveRenderResources(undefined, runtimePrimitive);
    }).toThrowDeveloperError();
  });

  it("throws for undefined runtimePrimitive", function () {
    expect(function () {
      const modelResources = new ModelRenderResources(mockModel);
      const nodeResources = new NodeRenderResources(
        modelResources,
        runtimeNode
      );
      return new PrimitiveRenderResources(nodeResources, undefined);
    }).toThrowDeveloperError();
  });

  it("constructs", function () {
    const modelResources = new ModelRenderResources(mockModel);
    const nodeResources = new NodeRenderResources(modelResources, runtimeNode);
    const primitiveResources = new PrimitiveRenderResources(
      nodeResources,
      runtimePrimitive
    );

    expect(primitiveResources.runtimePrimitive).toBe(runtimePrimitive);
    expect(primitiveResources.pickId).toBeUndefined();
    expect(primitiveResources.count).toBe(6);
    expect(primitiveResources.indices).toBe(primitive.indices);
    expect(primitiveResources.primitiveType).toBe(PrimitiveType.TRIANGLES);
    expect(primitiveResources.positionMin).toEqual(new Cartesian3(-1, -1, -1));
    expect(primitiveResources.positionMax).toEqual(new Cartesian3(1, 1, 1));
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
    expect(RenderState.getState(primitiveResources.renderStateOptions)).toEqual(
      RenderState.getState(defaultRenderState)
    );
  });

  it("constructs from primitive without indices", function () {
    const modelResources = new ModelRenderResources(mockModel);
    const nodeResources = new NodeRenderResources(modelResources, runtimeNode);
    const primitiveResources = new PrimitiveRenderResources(
      nodeResources,
      runtimePrimitiveWithoutIndices
    );

    expect(primitiveResources.count).toBe(8);
    expect(primitiveResources.indices).not.toBeDefined();
    expect(primitiveResources.primitiveType).toBe(PrimitiveType.POINTS);
    expect(primitiveResources.positionMin).toEqual(new Cartesian3(-2, -2, -2));
    expect(primitiveResources.positionMax).toEqual(new Cartesian3(2, 2, 2));
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
    expect(RenderState.getState(primitiveResources.renderStateOptions)).toEqual(
      RenderState.getState(defaultRenderState)
    );
  });

  it("inherits from model render resources", function () {
    const modelResources = new ModelRenderResources(mockModel);
    modelResources.shaderBuilder.addDefine("MODEL");
    modelResources.renderStateOptions.cull = {
      enabled: true,
    };

    const nodeResources = new NodeRenderResources(modelResources, runtimeNode);
    nodeResources.shaderBuilder.addDefine("NODE");

    const primitiveResources = new PrimitiveRenderResources(
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

    // The primitive should have inherited the renderStateOptions of the model's
    expect(primitiveResources.renderStateOptions.cull).toEqual({
      enabled: true,
    });

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
    const modelResources = new ModelRenderResources(mockModel);
    modelResources.shaderBuilder.addDefine("MODEL");
    modelResources.renderStateOptions.cull = {
      enabled: true,
    };

    const nodeResources = new NodeRenderResources(modelResources, runtimeNode);
    nodeResources.shaderBuilder.addDefine("NODE");
    nodeResources.renderStateOptions.blending = BlendingState.ALPHA_BLEND;

    const primitiveResources = new PrimitiveRenderResources(
      nodeResources,
      runtimePrimitive
    );

    expect(primitiveResources.runtimeNode).toBe(runtimeNode);
    expect(primitiveResources.attributes).toEqual([]);

    // The primitive should have inherited the renderStateOptions of the node's
    expect(primitiveResources.renderStateOptions.cull).toEqual({
      enabled: true,
    });
    expect(primitiveResources.renderStateOptions.blending).toEqual(
      BlendingState.ALPHA_BLEND
    );
  });
});
