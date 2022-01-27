import {
  BoundingSphere,
  Cartesian3,
  Matrix4,
  Math as CesiumMath,
  ResourceCache,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import loadAndZoomToModelExperimental from "./loadAndZoomToModelExperimental.js";

describe(
  "Scene/ModelExperimental/ModelMatrixUpdateStage",
  function () {
    const airplane = "./Data/Models/CesiumAir/Cesium_Air.gltf";

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

    it("updates leaf nodes", function () {
      return loadAndZoomToModelExperimental(
        {
          gltf: airplane,
        },
        scene
      ).then(function (model) {
        const sceneGraph = model._sceneGraph;
        const node = sceneGraph._runtimeNodes[0];
        const primitive = node.runtimePrimitives[0];
        const drawCommand = primitive.drawCommands[0];

        const expectedOriginalTransform = Matrix4.clone(node.originalTransform);
        expect(node._transformDirty).toEqual(false);
        const translation = new Cartesian3(0, 5, 0);
        node.transform = Matrix4.multiplyByTranslation(
          node.transform,
          translation,
          new Matrix4()
        );
        expect(node._transformDirty).toEqual(true);
        const expectedComputedTransform = Matrix4.multiplyTransformation(
          sceneGraph.computedModelMatrix,
          node.transform,
          new Matrix4()
        );
        expect(
          Matrix4.equals(node.computedTransform, expectedComputedTransform)
        ).toBe(true);
        expect(
          Matrix4.equals(node.originalTransform, expectedOriginalTransform)
        ).toBe(true);

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

    function applyTransform(sceneGraph, node, transform) {
      const expectedOriginalTransform = Matrix4.clone(node.originalTransform);
      expect(node._transformDirty).toEqual(false);

      node.transform = Matrix4.multiplyTransformation(
        node.transform,
        transform,
        new Matrix4()
      );
      expect(node._transformDirty).toEqual(true);

      const expectedComputedTransform = Matrix4.multiplyTransformation(
        sceneGraph.computedModelMatrix,
        node.transform,
        new Matrix4()
      );
      expect(
        Matrix4.equals(node.computedTransform, expectedComputedTransform)
      ).toBe(true);
      expect(
        Matrix4.equals(node.originalTransform, expectedOriginalTransform)
      ).toBe(true);
    }

    it("updates nodes with children", function () {
      return loadAndZoomToModelExperimental(
        {
          gltf: airplane,
        },
        scene
      ).then(function (model) {
        const sceneGraph = model._sceneGraph;

        // The root node is transformed.
        const rootNode = sceneGraph._runtimeNodes[2];
        // The static child node is not transformed relative to the parent.
        const staticChildNode = sceneGraph._runtimeNodes[0];
        // The transformed child node is transformed relative to the parent.
        const transformedChildNode = sceneGraph._runtimeNodes[1];

        const childTransformation = Matrix4.fromTranslation(
          new Cartesian3(0, 5, 0)
        );
        applyTransform(sceneGraph, transformedChildNode, childTransformation);

        const rootTransformation = Matrix4.fromTranslation(
          new Cartesian3(12, 5, 0)
        );
        applyTransform(sceneGraph, rootNode, rootTransformation);

        const rootPrimitive = rootNode.runtimePrimitives[0];
        const staticChildPrimitive = staticChildNode.runtimePrimitives[0];
        const transformedChildPrimitive =
          transformedChildNode.runtimePrimitives[0];

        const rootDrawCommand = rootPrimitive.drawCommands[0];
        const staticChildDrawCommand = staticChildPrimitive.drawCommands[0];
        const transformedChildDrawCommand =
          transformedChildPrimitive.drawCommands[0];

        const expectedRootModelMatrix = Matrix4.multiplyTransformation(
          rootDrawCommand.modelMatrix,
          rootTransformation,
          new Matrix4()
        );
        const expectedStaticChildModelMatrix = Matrix4.multiplyTransformation(
          expectedRootModelMatrix,
          staticChildNode.transform,
          new Matrix4()
        );
        const expectedTransformedChildModelMatrix = Matrix4.multiplyTransformation(
          expectedRootModelMatrix,
          transformedChildNode.transform,
          new Matrix4()
        );

        scene.renderForSpecs();

        expect(
          Matrix4.equals(rootDrawCommand.modelMatrix, expectedRootModelMatrix)
        ).toBe(true);
        expect(
          Matrix4.equals(
            staticChildDrawCommand.modelMatrix,
            expectedStaticChildModelMatrix
          )
        ).toBe(true);
        expect(
          Matrix4.equals(
            transformedChildDrawCommand.modelMatrix,
            expectedTransformedChildModelMatrix
          )
        ).toBe(true);
      });
    });
  },
  "WebGL"
);
