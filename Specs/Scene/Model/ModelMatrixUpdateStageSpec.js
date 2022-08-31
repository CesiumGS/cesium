import {
  BoundingSphere,
  Cartesian3,
  clone,
  CullFace,
  Matrix4,
  Math as CesiumMath,
  ModelDrawCommand,
  ResourceCache,
  Quaternion,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import loadAndZoomToModel from "./loadAndZoomToModel.js";

describe(
  "Scene/Model/ModelMatrixUpdateStage",
  function () {
    const simpleSkin =
      "./Data/Models/GltfLoader/SimpleSkin/glTF/SimpleSkin.gltf";

    // These functions are specific to the SimpleSkin model.
    // The child leaf node is transformed relative to its parent,
    // but the static leaf node is not affected by any parent node.
    function getStaticLeafNode(model) {
      return model.sceneGraph._runtimeNodes[0];
    }
    function getParentRootNode(model) {
      return model.sceneGraph._runtimeNodes[1];
    }
    function getChildLeafNode(model) {
      return model.sceneGraph._runtimeNodes[2];
    }

    function getDrawCommand(runtimeNode) {
      return runtimeNode.runtimePrimitives[0].drawCommand;
    }

    const rotation = Quaternion.fromAxisAngle(
      Cartesian3.UNIT_Y,
      CesiumMath.toRadians(180)
    );
    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      new Cartesian3(10, 0, 0),
      rotation,
      new Cartesian3(1, 1, 1)
    );

    let scene;

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      scene.primitives.removeAll();
      ResourceCache.clearForSpecs();
    });

    const mockPrimitive = {
      material: {
        doubleSided: false,
      },
    };

    function mockRenderResources(model) {
      return {
        model: model,
        runtimePrimitive: {
          boundingSphere: new BoundingSphere(),
          primitive: mockPrimitive,
        },
      };
    }

    function modifyModel(model) {
      // Disable axis-correction for testing simplicity.
      const sceneGraph = model.sceneGraph;
      sceneGraph._axisCorrectionMatrix = Matrix4.IDENTITY;

      // Add mock primitives and draw commands to test that
      // the draw commands are updated in-place.
      const meshNode = getStaticLeafNode(model);
      const modelDrawCommand = getDrawCommand(meshNode);
      const drawCommand = modelDrawCommand.command;

      const renderResources = mockRenderResources(model);

      const rootNode = getParentRootNode(model);
      const rootDrawCommand = clone(drawCommand);
      rootDrawCommand.modelMatrix = new Matrix4();
      rootDrawCommand.boundingVolume = new BoundingSphere();
      rootNode.runtimePrimitives.push({
        updateStages: [],
        drawCommand: new ModelDrawCommand({
          command: rootDrawCommand,
          primitiveRenderResources: renderResources,
        }),
        primitive: mockPrimitive,
      });
      rootNode._transformDirty = true;

      const leafNode = getChildLeafNode(model);
      const leafDrawCommand = clone(drawCommand);
      leafDrawCommand.modelMatrix = new Matrix4();
      leafDrawCommand.boundingVolume = new BoundingSphere();
      leafNode.runtimePrimitives.push({
        updateStages: [],
        drawCommand: new ModelDrawCommand({
          command: leafDrawCommand,
          primitiveRenderResources: renderResources,
        }),
        primitive: mockPrimitive,
      });
      leafNode._transformDirty = true;
    }

    it("updates leaf nodes using node transform setter", function () {
      return loadAndZoomToModel(
        {
          gltf: simpleSkin,
        },
        scene
      ).then(function (model) {
        const sceneGraph = model.sceneGraph;
        const node = getStaticLeafNode(model);
        const primitive = node.runtimePrimitives[0];
        const drawCommand = primitive.drawCommand;

        const expectedOriginalTransform = Matrix4.clone(node.transform);
        expect(node._transformDirty).toEqual(false);

        const translation = new Cartesian3(0, 5, 0);
        node.transform = Matrix4.multiplyByTranslation(
          node.transform,
          translation,
          new Matrix4()
        );
        expect(node._transformDirty).toEqual(true);
        expect(
          Matrix4.equals(node.originalTransform, expectedOriginalTransform)
        ).toBe(true);

        const expectedComputedTransform = Matrix4.multiplyTransformation(
          sceneGraph.computedModelMatrix,
          node.transform,
          new Matrix4()
        );

        const expectedModelMatrix = Matrix4.multiplyByTranslation(
          drawCommand.modelMatrix,
          translation,
          new Matrix4()
        );

        const expectedBoundingSphere = BoundingSphere.transform(
          primitive.boundingSphere,
          expectedComputedTransform,
          new BoundingSphere()
        );

        scene.renderForSpecs();

        expect(
          Matrix4.equalsEpsilon(
            drawCommand.modelMatrix,
            expectedModelMatrix,
            CesiumMath.EPSILON15
          )
        ).toBe(true);
        expect(
          BoundingSphere.equals(
            drawCommand.boundingVolume,
            expectedBoundingSphere
          )
        ).toBe(true);
      });
    });

    function applyTransform(node, transform) {
      const expectedOriginalTransform = Matrix4.clone(node.originalTransform);
      expect(node._transformDirty).toEqual(false);

      node.transform = Matrix4.multiplyTransformation(
        node.transform,
        transform,
        new Matrix4()
      );
      expect(node._transformDirty).toEqual(true);

      expect(
        Matrix4.equals(node.originalTransform, expectedOriginalTransform)
      ).toBe(true);
    }

    it("updates nodes with children using node transform setter", function () {
      return loadAndZoomToModel(
        {
          gltf: simpleSkin,
        },
        scene
      ).then(function (model) {
        modifyModel(model);
        scene.renderForSpecs();

        const rootNode = getParentRootNode(model);
        const staticLeafNode = getStaticLeafNode(model);
        const transformedLeafNode = getChildLeafNode(model);

        const rootDrawCommand = getDrawCommand(rootNode);
        const staticDrawCommand = getDrawCommand(staticLeafNode);
        const transformedDrawCommand = getDrawCommand(transformedLeafNode);

        const childTransformation = Matrix4.fromTranslation(
          new Cartesian3(0, 5, 0)
        );
        applyTransform(transformedLeafNode, childTransformation);

        const rootTransformation = Matrix4.fromTranslation(
          new Cartesian3(12, 5, 0)
        );
        applyTransform(rootNode, rootTransformation);

        const expectedRootModelMatrix = Matrix4.multiplyTransformation(
          rootTransformation,
          rootDrawCommand.modelMatrix,
          new Matrix4()
        );
        const expectedStaticLeafModelMatrix = Matrix4.clone(
          staticDrawCommand.modelMatrix,
          new Matrix4()
        );

        const finalTransform = new Matrix4();
        Matrix4.multiply(
          rootTransformation,
          childTransformation,
          finalTransform
        );
        const expectedTransformedLeafModelMatrix = Matrix4.multiplyTransformation(
          finalTransform,
          transformedDrawCommand.modelMatrix,
          new Matrix4()
        );

        scene.renderForSpecs();

        expect(rootDrawCommand.modelMatrix).toEqual(expectedRootModelMatrix);
        expect(staticDrawCommand.modelMatrix).toEqual(
          expectedStaticLeafModelMatrix
        );
        expect(transformedDrawCommand.modelMatrix).toEqual(
          expectedTransformedLeafModelMatrix
        );
      });
    });

    it("updates with new model matrix", function () {
      return loadAndZoomToModel(
        {
          gltf: simpleSkin,
        },
        scene
      ).then(function (model) {
        modifyModel(model);
        scene.renderForSpecs();

        const rootNode = getParentRootNode(model);
        const staticLeafNode = getStaticLeafNode(model);
        const transformedLeafNode = getChildLeafNode(model);

        const rootDrawCommand = getDrawCommand(rootNode);
        const staticDrawCommand = getDrawCommand(staticLeafNode);
        const transformedDrawCommand = getDrawCommand(transformedLeafNode);

        const expectedRootModelMatrix = Matrix4.multiplyTransformation(
          modelMatrix,
          rootDrawCommand.modelMatrix,
          new Matrix4()
        );
        const expectedStaticLeafModelMatrix = Matrix4.multiplyTransformation(
          modelMatrix,
          staticDrawCommand.modelMatrix,
          new Matrix4()
        );
        const expectedTransformedLeafModelMatrix = Matrix4.multiplyTransformation(
          modelMatrix,
          transformedDrawCommand.modelMatrix,
          new Matrix4()
        );

        model.modelMatrix = modelMatrix;
        scene.renderForSpecs();

        expect(rootDrawCommand.modelMatrix).toEqual(expectedRootModelMatrix);
        expect(staticDrawCommand.modelMatrix).toEqual(
          expectedStaticLeafModelMatrix
        );
        expect(transformedDrawCommand.modelMatrix).toEqual(
          expectedTransformedLeafModelMatrix
        );
      });
    });

    it("updates with new model matrix and model scale", function () {
      return loadAndZoomToModel(
        {
          gltf: simpleSkin,
        },
        scene
      ).then(function (model) {
        modifyModel(model);
        scene.renderForSpecs();

        const modelScale = 5.0;
        const scaledModelMatrix = Matrix4.multiplyByUniformScale(
          modelMatrix,
          modelScale,
          new Matrix4()
        );

        const rootNode = getParentRootNode(model);
        const staticLeafNode = getStaticLeafNode(model);
        const transformedLeafNode = getChildLeafNode(model);

        const rootDrawCommand = getDrawCommand(rootNode);
        const staticDrawCommand = getDrawCommand(staticLeafNode);
        const transformedDrawCommand = getDrawCommand(transformedLeafNode);

        const expectedRootModelMatrix = Matrix4.multiplyTransformation(
          scaledModelMatrix,
          rootDrawCommand.modelMatrix,
          new Matrix4()
        );
        const expectedStaticLeafModelMatrix = Matrix4.multiplyTransformation(
          scaledModelMatrix,
          staticDrawCommand.modelMatrix,
          new Matrix4()
        );
        const expectedTransformedLeafModelMatrix = Matrix4.multiplyTransformation(
          scaledModelMatrix,
          transformedDrawCommand.modelMatrix,
          new Matrix4()
        );

        model.modelMatrix = modelMatrix;
        model.scale = modelScale;
        scene.renderForSpecs();

        expect(rootDrawCommand.modelMatrix).toEqual(expectedRootModelMatrix);
        expect(staticDrawCommand.modelMatrix).toEqual(
          expectedStaticLeafModelMatrix
        );
        expect(transformedDrawCommand.modelMatrix).toEqual(
          expectedTransformedLeafModelMatrix
        );
      });
    });

    it("updates render state cull face when scale is negative", function () {
      return loadAndZoomToModel(
        {
          gltf: simpleSkin,
        },
        scene
      ).then(function (model) {
        modifyModel(model);

        const rootNode = getParentRootNode(model);
        const childNode = getChildLeafNode(model);

        const rootPrimitive = rootNode.runtimePrimitives[0];
        const childPrimitive = childNode.runtimePrimitives[0];

        const rootDrawCommand = rootPrimitive.drawCommand;
        const childDrawCommand = childPrimitive.drawCommand;

        expect(rootDrawCommand.cullFace).toBe(CullFace.BACK);
        expect(childDrawCommand.cullFace).toBe(CullFace.BACK);

        model.modelMatrix = Matrix4.fromUniformScale(-1);
        scene.renderForSpecs();

        expect(rootDrawCommand.cullFace).toBe(CullFace.FRONT);
        expect(childDrawCommand.cullFace).toBe(CullFace.FRONT);
      });
    });
  },
  "WebGL"
);
