import {
  AttributeType,
  Axis,
  BlendingState,
  Cartesian3,
  ComponentDatatype,
  DepthFunction,
  LightingModel,
  Math as CesiumMath,
  Matrix4,
  ModelRuntimeNode,
  ModelRuntimePrimitive,
  ModelType,
  PrimitiveType,
  ModelRenderResources,
  NodeRenderResources,
  PrimitiveRenderResources,
  RenderState,
  VertexAttributeSemantic,
} from "../../../index.js";
import ShaderBuilderTester from "../../../../../Specs/ShaderBuilderTester.js";

describe(
  "Scene/Model/PrimitiveRenderResources",
  function () {
    const mockModel = {
      modelMatrix: Matrix4.IDENTITY,
      type: ModelType.GLTF,
    };
    const mockNode = {};
    const mockSceneGraph = {
      computedModelMatrix: Matrix4.IDENTITY,
      components: {
        upAxis: Axis.Y,
        forwardAxis: Axis.Z,
      },
    };

    const runtimeNode = new ModelRuntimeNode({
      node: mockNode,
      transform: Matrix4.IDENTITY,
      transformToRoot: Matrix4.fromTranslation(new Cartesian3(1, 2, 3)),
      sceneGraph: mockSceneGraph,
      children: [],
    });

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

    const defaultRenderState = RenderState.getState(
      RenderState.fromCache({
        depthTest: {
          enabled: true,
          func: DepthFunction.LESS_OR_EQUAL,
        },
      })
    );

    let runtimePrimitive;
    let runtimePrimitiveWithoutIndices;
    beforeAll(function () {
      runtimePrimitive = new ModelRuntimePrimitive({
        primitive: primitive,
        node: mockNode,
        model: mockModel,
      });

      runtimePrimitiveWithoutIndices = new ModelRuntimePrimitive({
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
      const nodeResources = new NodeRenderResources(
        modelResources,
        runtimeNode
      );
      const primitiveResources = new PrimitiveRenderResources(
        nodeResources,
        runtimePrimitive
      );

      expect(primitiveResources.runtimePrimitive).toBe(runtimePrimitive);
      expect(primitiveResources.pickId).toBeUndefined();
      expect(primitiveResources.count).toBe(6);
      expect(primitiveResources.indices).toBe(primitive.indices);
      expect(primitiveResources.primitiveType).toBe(PrimitiveType.TRIANGLES);
      expect(primitiveResources.positionMin).toEqual(
        new Cartesian3(-1, -1, -1)
      );
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
      expect(
        RenderState.getState(primitiveResources.renderStateOptions)
      ).toEqual(defaultRenderState);

      expect(primitiveResources.hasSilhouette).toBe(false);
      expect(primitiveResources.hasSkipLevelOfDetail).toBe(false);
    });

    it("constructs from primitive without indices", function () {
      const modelResources = new ModelRenderResources(mockModel);
      const nodeResources = new NodeRenderResources(
        modelResources,
        runtimeNode
      );
      const primitiveResources = new PrimitiveRenderResources(
        nodeResources,
        runtimePrimitiveWithoutIndices
      );

      expect(primitiveResources.count).toBe(8);
      expect(primitiveResources.indices).not.toBeDefined();
      expect(primitiveResources.primitiveType).toBe(PrimitiveType.POINTS);
      expect(primitiveResources.positionMin).toEqual(
        new Cartesian3(-2, -2, -2)
      );
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
      expect(
        RenderState.getState(primitiveResources.renderStateOptions)
      ).toEqual(defaultRenderState);
    });

    it("inherits from model render resources", function () {
      const modelResources = new ModelRenderResources(mockModel);
      modelResources.shaderBuilder.addDefine("MODEL");
      modelResources.renderStateOptions.cull = {
        enabled: true,
      };
      modelResources.hasSilhouette = true;
      modelResources.hasSkipLevelOfDetail = true;

      const nodeResources = new NodeRenderResources(
        modelResources,
        runtimeNode
      );
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

      // The primitive should have inherited the command flags from the model.
      expect(primitiveResources.hasSilhouette).toBe(true);
      expect(primitiveResources.hasSkipLevelOfDetail).toBe(true);

      // The defines should cascade through the three levels
      ShaderBuilderTester.expectHasFragmentDefines(
        modelResources.shaderBuilder,
        ["MODEL"]
      );
      ShaderBuilderTester.expectHasFragmentDefines(
        nodeResources.shaderBuilder,
        ["MODEL", "NODE"]
      );
      ShaderBuilderTester.expectHasFragmentDefines(
        primitiveResources.shaderBuilder,
        ["MODEL", "NODE", "PRIMITIVE"]
      );
    });

    it("inherits from node render resources", function () {
      const modelResources = new ModelRenderResources(mockModel);
      modelResources.shaderBuilder.addDefine("MODEL");
      modelResources.renderStateOptions.cull = {
        enabled: true,
      };

      const nodeResources = new NodeRenderResources(
        modelResources,
        runtimeNode
      );
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
  },
  "WebGL"
);
