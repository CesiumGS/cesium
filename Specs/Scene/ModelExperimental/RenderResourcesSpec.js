import {
  AttributeType,
  Cartesian3,
  ComponentDatatype,
  DepthFunction,
  LightingModel,
  Math as CesiumMath,
  Matrix4,
  ModelExperimentalSceneNode,
  ModelExperimentalSceneMeshPrimitive,
  PrimitiveType,
  RenderResources,
  VertexAttributeSemantic,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/RenderResources", function () {
  var mockModel = {};
  var mockNode = {};
  var sceneNode = new ModelExperimentalSceneNode({
    node: mockNode,
    modelMatrix: Matrix4.IDENTITY,
  });

  function checkShaderDefines(shaderBuilder, expectedDefines) {
    expect(shaderBuilder._fragmentShaderParts.defineLines).toEqual(
      expectedDefines
    );
  }

  describe("ModelRenderResources", function () {
    it("throws for undefined model", function () {
      expect(function () {
        return new RenderResources.ModelRenderResources(undefined);
      }).toThrowDeveloperError();
    });

    it("constructs", function () {
      var modelResources = new RenderResources.ModelRenderResources(mockModel);

      expect(modelResources.model).toBe(mockModel);
      expect(modelResources.shaderBuilder).toBeDefined();
      checkShaderDefines(modelResources.shaderBuilder, []);
    });
  });

  describe("NodeRenderResources", function () {
    it("throws for undefined modelRenderResources", function () {
      expect(function () {
        return new RenderResources.NodeRenderResources(undefined, sceneNode);
      }).toThrowDeveloperError();
    });

    it("throws for undefined sceneNode", function () {
      expect(function () {
        var modelResources = new RenderResources.ModelRenderResources(
          mockModel
        );
        return new RenderResources.NodeRenderResources(
          modelResources,
          undefined
        );
      }).toThrowDeveloperError();
    });

    it("constructs", function () {
      var modelResources = new RenderResources.ModelRenderResources(mockModel);
      var nodeResources = new RenderResources.NodeRenderResources(
        modelResources,
        sceneNode
      );

      expect(nodeResources.sceneNode).toBe(sceneNode);
      expect(nodeResources.modelMatrix).toBe(sceneNode.modelMatrix);
      expect(nodeResources.attributes).toEqual([]);
    });

    it("inherits from model render resources", function () {
      var modelResources = new RenderResources.ModelRenderResources(mockModel);
      modelResources.shaderBuilder.addDefine("MODEL");
      var nodeResources = new RenderResources.NodeRenderResources(
        modelResources,
        sceneNode
      );
      nodeResources.shaderBuilder.addDefine("NODE");

      expect(nodeResources.model).toBe(mockModel);

      // The node's shader builder should be a clone of the model's
      expect(nodeResources.shaderBuilder).not.toBe(
        modelResources.shaderBuilder
      );

      // The model shader must not be modified by the node...
      checkShaderDefines(modelResources.shaderBuilder, ["MODEL"]);

      // ...but the node shader will be updated.
      checkShaderDefines(nodeResources.shaderBuilder, ["MODEL", "NODE"]);
    });
  });

  describe("MeshPrimitiveRenderResources", function () {
    var primitive = {
      indices: {
        count: 6,
      },
      primitiveType: PrimitiveType.TRIANGLES,
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

    var scenePrimitive = new ModelExperimentalSceneMeshPrimitive({
      primitive: primitive,
    });

    var scenePrimitiveWithoutIndices = new ModelExperimentalSceneMeshPrimitive({
      primitive: primitiveWithoutIndices,
    });

    var expectedDepthTest = {
      depthTest: {
        enabled: true,
        func: DepthFunction.LESS_OR_EQUAL,
      },
    };

    it("throws for undefined nodeRenderResources", function () {
      expect(function () {
        return new RenderResources.MeshPrimitiveRenderResources(
          undefined,
          scenePrimitive
        );
      }).toThrowDeveloperError();
    });

    it("throws for undefined sceneMeshPrimitive", function () {
      expect(function () {
        var modelResources = new RenderResources.ModelRenderResources(
          mockModel
        );
        var nodeResources = new RenderResources.NodeRenderResources(
          modelResources,
          sceneNode
        );
        return new RenderResources.MeshPrimitiveRenderResources(
          nodeResources,
          undefined
        );
      }).toThrowDeveloperError();
    });

    it("constructs", function () {
      var modelResources = new RenderResources.ModelRenderResources(mockModel);
      var nodeResources = new RenderResources.NodeRenderResources(
        modelResources,
        sceneNode
      );
      var primitiveResources = new RenderResources.MeshPrimitiveRenderResources(
        nodeResources,
        scenePrimitive
      );

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
      var modelResources = new RenderResources.ModelRenderResources(mockModel);
      var nodeResources = new RenderResources.NodeRenderResources(
        modelResources,
        sceneNode
      );
      var primitiveResources = new RenderResources.MeshPrimitiveRenderResources(
        nodeResources,
        scenePrimitiveWithoutIndices
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
      var modelResources = new RenderResources.ModelRenderResources(mockModel);
      modelResources.shaderBuilder.addDefine("MODEL");
      var nodeResources = new RenderResources.NodeRenderResources(
        modelResources,
        sceneNode
      );
      nodeResources.shaderBuilder.addDefine("NODE");
      var primitiveResources = new RenderResources.MeshPrimitiveRenderResources(
        nodeResources,
        scenePrimitive
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
      var modelResources = new RenderResources.ModelRenderResources(mockModel);
      modelResources.shaderBuilder.addDefine("MODEL");
      var nodeResources = new RenderResources.NodeRenderResources(
        modelResources,
        sceneNode
      );
      nodeResources.shaderBuilder.addDefine("NODE");
      var primitiveResources = new RenderResources.MeshPrimitiveRenderResources(
        nodeResources,
        scenePrimitive
      );
      expect(primitiveResources.sceneNode).toBe(sceneNode);
      expect(primitiveResources.modelMatrix).toEqual(sceneNode.modelMatrix);
      expect(primitiveResources.attributes).toEqual([]);
    });
  });
});
