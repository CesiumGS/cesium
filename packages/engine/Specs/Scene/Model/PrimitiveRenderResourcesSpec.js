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
      }),
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
          runtimeNode,
        );
        return new PrimitiveRenderResources(nodeResources, undefined);
      }).toThrowDeveloperError();
    });

    it("constructs", function () {
      const modelResources = new ModelRenderResources(mockModel);
      const nodeResources = new NodeRenderResources(
        modelResources,
        runtimeNode,
      );
      const primitiveResources = new PrimitiveRenderResources(
        nodeResources,
        runtimePrimitive,
      );

      expect(primitiveResources.runtimePrimitive).toBe(runtimePrimitive);
      expect(primitiveResources.pickId).toBeUndefined();
      expect(primitiveResources.count).toBe(6);
      expect(primitiveResources.indices).toBe(primitive.indices);
      expect(primitiveResources.primitiveType).toBe(PrimitiveType.TRIANGLES);
      expect(primitiveResources.positionMin).toEqual(
        new Cartesian3(-1, -1, -1),
      );
      expect(primitiveResources.positionMax).toEqual(new Cartesian3(1, 1, 1));
      // The points are in a cube from -1, -1, -1 to 1, 1, 1. The center is
      // (0, 0, 0). The full diagonal is 2 * sqrt(3), so half is sqrt(3)
      expect(primitiveResources.boundingSphere.center).toEqualEpsilon(
        Cartesian3.ZERO,
        CesiumMath.EPSILON9,
      );
      expect(primitiveResources.boundingSphere.radius).toEqualEpsilon(
        Math.sqrt(3),
        CesiumMath.EPSILON9,
      );
      expect(primitiveResources.uniformMap).toEqual({});
      expect(primitiveResources.lightingOptions.lightingModel).toEqual(
        LightingModel.UNLIT,
      );
      expect(
        RenderState.getState(primitiveResources.renderStateOptions),
      ).toEqual(defaultRenderState);

      expect(primitiveResources.hasSilhouette).toBe(false);
      expect(primitiveResources.hasSkipLevelOfDetail).toBe(false);
    });

    function createInstancedResources(instancingNode) {
      const nodeResources = new NodeRenderResources(
        new ModelRenderResources(mockModel),
        instancingNode,
      );
      return new PrimitiveRenderResources(nodeResources, runtimePrimitive);
    }

    function expectCornersInside(resources, transforms) {
      const sphere = resources.boundingSphere;
      for (const transform of transforms) {
        for (let i = 0; i < 8; i++) {
          const corner = new Cartesian3(
            i & 1 ? 1 : -1,
            i & 2 ? 1 : -1,
            i & 4 ? 1 : -1,
          );
          Matrix4.multiplyByPoint(transform, corner, corner);
          expect(
            Cartesian3.distance(sphere.center, corner),
          ).toBeLessThanOrEqual(sphere.radius + CesiumMath.EPSILON10);
          expect(corner.x).toBeGreaterThanOrEqual(
            resources.positionMin.x - CesiumMath.EPSILON10,
          );
          expect(corner.y).toBeGreaterThanOrEqual(
            resources.positionMin.y - CesiumMath.EPSILON10,
          );
          expect(corner.z).toBeGreaterThanOrEqual(
            resources.positionMin.z - CesiumMath.EPSILON10,
          );
          expect(corner.x).toBeLessThanOrEqual(
            resources.positionMax.x + CesiumMath.EPSILON10,
          );
          expect(corner.y).toBeLessThanOrEqual(
            resources.positionMax.y + CesiumMath.EPSILON10,
          );
          expect(corner.z).toBeLessThanOrEqual(
            resources.positionMax.z + CesiumMath.EPSILON10,
          );
        }
      }
    }

    it("uses cached primitive instance bounds when rebuilding resources", function () {
      const instancedPrimitive = new ModelRuntimePrimitive({
        primitive: primitive,
        node: mockNode,
        model: mockModel,
      });
      instancedPrimitive.instancedPositionMin = new Cartesian3(90, -11, -12);
      instancedPrimitive.instancedPositionMax = new Cartesian3(150, 12, 15);
      const nodeResources = new NodeRenderResources(
        new ModelRenderResources(mockModel),
        runtimeNode,
      );
      for (let rebuild = 0; rebuild < 2; rebuild++) {
        const resources = new PrimitiveRenderResources(
          nodeResources,
          instancedPrimitive,
        );
        expect(resources.positionMin).toEqual(
          instancedPrimitive.instancedPositionMin,
        );
        expect(resources.positionMax).toEqual(
          instancedPrimitive.instancedPositionMax,
        );
        expect(resources.positionMin).not.toBe(
          instancedPrimitive.instancedPositionMin,
        );
        expect(resources.positionMax).not.toBe(
          instancedPrimitive.instancedPositionMax,
        );
        expect(resources.boundingSphere.center).toEqual(
          new Cartesian3(120, 0.5, 1.5),
        );
        expect(resources.boundingSphere.radius).toEqualEpsilon(
          Cartesian3.distance(resources.positionMin, resources.positionMax) / 2,
          CesiumMath.EPSILON10,
        );
      }
      expect(primitive.attributes[0].min).toEqual(new Cartesian3(-1, -1, -1));
      expect(primitive.attributes[0].max).toEqual(new Cartesian3(1, 1, 1));
    });

    it("bounds every translation-only instance corner", function () {
      const translations = [
        new Cartesian3(100, -3, 2),
        new Cartesian3(120, 4, -5),
        new Cartesian3(140, 0, 0),
      ];
      const resources = createInstancedResources({
        node: { instances: {} },
        instancingTranslationMin: new Cartesian3(100, -3, -5),
        instancingTranslationMax: new Cartesian3(140, 4, 2),
      });
      expect(resources.positionMin).toEqual(new Cartesian3(99, -4, -6));
      expect(resources.positionMax).toEqual(new Cartesian3(141, 5, 3));
      expectCornersInside(
        resources,
        translations.map((translation) => Matrix4.fromTranslation(translation)),
      );
    });

    it("preserves legacy world-space instance bounds", function () {
      const resources = createInstancedResources({
        node: { instances: { transformInWorldSpace: true } },
        instancingTranslationMin: new Cartesian3(100, 0, 0),
        instancingTranslationMax: new Cartesian3(140, 0, 0),
      });
      expect(resources.positionMin).toEqual(new Cartesian3(99, -1, -1));
      expect(resources.positionMax).toEqual(new Cartesian3(141, 1, 1));
      expect(resources.boundingSphere.center).toEqual(
        new Cartesian3(120, 0, 0),
      );
      expect(resources.boundingSphere.radius).toEqualEpsilon(
        Math.sqrt(443),
        CesiumMath.EPSILON10,
      );
    });

    it("constructs from primitive without indices", function () {
      const modelResources = new ModelRenderResources(mockModel);
      const nodeResources = new NodeRenderResources(
        modelResources,
        runtimeNode,
      );
      const primitiveResources = new PrimitiveRenderResources(
        nodeResources,
        runtimePrimitiveWithoutIndices,
      );

      expect(primitiveResources.count).toBe(8);
      expect(primitiveResources.indices).not.toBeDefined();
      expect(primitiveResources.primitiveType).toBe(PrimitiveType.POINTS);
      expect(primitiveResources.positionMin).toEqual(
        new Cartesian3(-2, -2, -2),
      );
      expect(primitiveResources.positionMax).toEqual(new Cartesian3(2, 2, 2));
      // The points are in a cube from -2, -2, -2 to 2, 2, 2. The center is
      // (0, 0, 0). The full diagonal is 4 * sqrt(3), so half is 2 * sqrt(3)
      expect(primitiveResources.boundingSphere.center).toEqualEpsilon(
        Cartesian3.ZERO,
        CesiumMath.EPSILON9,
      );
      expect(primitiveResources.boundingSphere.radius).toEqualEpsilon(
        2.0 * Math.sqrt(3),
        CesiumMath.EPSILON9,
      );
      expect(primitiveResources.uniformMap).toEqual({});
      expect(primitiveResources.lightingOptions.lightingModel).toEqual(
        LightingModel.UNLIT,
      );
      expect(
        RenderState.getState(primitiveResources.renderStateOptions),
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
        runtimeNode,
      );
      nodeResources.shaderBuilder.addDefine("NODE");

      const primitiveResources = new PrimitiveRenderResources(
        nodeResources,
        runtimePrimitive,
      );
      primitiveResources.shaderBuilder.addDefine("PRIMITIVE");

      expect(primitiveResources.model).toBe(mockModel);

      // The primitive's shader builder should be a clone of the node's
      expect(primitiveResources.shaderBuilder).not.toBe(
        modelResources.shaderBuilder,
      );
      expect(primitiveResources.shaderBuilder).not.toBe(
        modelResources.shaderBuilder,
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
        ["MODEL"],
      );
      ShaderBuilderTester.expectHasFragmentDefines(
        nodeResources.shaderBuilder,
        ["MODEL", "NODE"],
      );
      ShaderBuilderTester.expectHasFragmentDefines(
        primitiveResources.shaderBuilder,
        ["MODEL", "NODE", "PRIMITIVE"],
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
        runtimeNode,
      );
      nodeResources.shaderBuilder.addDefine("NODE");
      nodeResources.renderStateOptions.blending = BlendingState.ALPHA_BLEND;

      const primitiveResources = new PrimitiveRenderResources(
        nodeResources,
        runtimePrimitive,
      );

      expect(primitiveResources.runtimeNode).toBe(runtimeNode);
      expect(primitiveResources.attributes).toEqual([]);

      // The primitive should have inherited the renderStateOptions of the node's
      expect(primitiveResources.renderStateOptions.cull).toEqual({
        enabled: true,
      });
      expect(primitiveResources.renderStateOptions.blending).toEqual(
        BlendingState.ALPHA_BLEND,
      );
    });
  },
  "WebGL",
);
