import {
  Matrix4,
  ModelExperimentalSceneNode,
  ModelExperimentalSceneMeshPrimitive,
  RenderResources,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/RenderResources", function () {
  var mockModel = {};
  var mockNode = {};
  var sceneNode = new ModelExperimentalSceneNode({
    node: mockNode,
    modelMatrix: Matrix4.IDENTITY,
  });

  var mockPrimitive = {
    indices: {
      count: 3000,
    },
  };
  var scenePrimitive = new ModelExperimentalSceneMeshPrimitive({
    primitive: mockPrimitive,
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
      fail();
    });

    it("inherits from model render resources", function () {
      fail();
    });

    it("inherits from node render resources", function () {
      fail();
    });
  });
});
