import {
  BoundingSphere,
  Cartesian3,
  Matrix4,
  ResourceCache,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import loadAndZoomToModelExperimental from "./loadAndZoomToModelExperimental.js";

describe("Scene/ModelExperimental/ModelMatrixUpdateStage", function () {
  var airplane = "./Data/Models/CesiumAir/Cesium_Air.gltf";

  var scene;

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
      var sceneGraph = model._sceneGraph;
      var node = sceneGraph._runtimeNodes[0];
      var primitive = node.runtimePrimitives[0];
      var drawCommand = primitive.drawCommands[0];

      var expectedOriginalTransform = Matrix4.clone(node.originalTransform);
      expect(node._transformDirty).toEqual(false);
      var translation = new Cartesian3(0, 5, 0);
      node.transform = Matrix4.multiplyByTranslation(
        node.transform,
        translation,
        new Matrix4()
      );
      expect(node._transformDirty).toEqual(true);
      var expectedComputedTransform = Matrix4.multiplyTransformation(
        sceneGraph._computedModelMatrix,
        node.transform,
        new Matrix4()
      );
      expect(
        Matrix4.equals(node.computedTransform, expectedComputedTransform)
      ).toBe(true);
      expect(
        Matrix4.equals(node.originalTransform, expectedOriginalTransform)
      ).toBe(true);

      var expectedModelMatrix = Matrix4.multiplyByTranslation(
        drawCommand.modelMatrix,
        translation,
        new Matrix4()
      );

      var expectedBoundingSphere = BoundingSphere.transform(
        primitive.boundingSphere,
        expectedComputedTransform,
        new BoundingSphere()
      );

      scene.renderForSpecs();

      expect(Matrix4.equals(drawCommand.modelMatrix, expectedModelMatrix)).toBe(
        true
      );
      expect(
        BoundingSphere.equals(
          drawCommand.boundingVolume,
          expectedBoundingSphere
        )
      ).toBe(true);
    });
  });

  function applyTransform(sceneGraph, node, transform) {
    var expectedOriginalTransform = Matrix4.clone(node.originalTransform);
    expect(node._transformDirty).toEqual(false);

    node.transform = Matrix4.multiplyTransformation(
      node.transform,
      transform,
      new Matrix4()
    );
    expect(node._transformDirty).toEqual(true);

    var expectedComputedTransform = Matrix4.multiplyTransformation(
      sceneGraph._computedModelMatrix,
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
      var sceneGraph = model._sceneGraph;

      // The root node is transformed.
      var rootNode = sceneGraph._runtimeNodes[2];
      // The static child node is not transformed relative to the parent.
      var staticChildNode = sceneGraph._runtimeNodes[0];
      // The transformed child node is transformed relative to the parent.
      var transformedChildNode = sceneGraph._runtimeNodes[1];

      var childTransformation = Matrix4.fromTranslation(
        new Cartesian3(0, 5, 0)
      );
      applyTransform(sceneGraph, transformedChildNode, childTransformation);

      var rootTransformation = Matrix4.fromTranslation(
        new Cartesian3(12, 5, 0)
      );
      applyTransform(sceneGraph, rootNode, rootTransformation);

      var rootPrimitive = rootNode.runtimePrimitives[0];
      var staticChildPrimitive = staticChildNode.runtimePrimitives[0];
      var transformedChildPrimitive = transformedChildNode.runtimePrimitives[0];

      var rootDrawCommand = rootPrimitive.drawCommands[0];
      var staticChildDrawCommand = staticChildPrimitive.drawCommands[0];
      var transformedChildDrawCommand =
        transformedChildPrimitive.drawCommands[0];

      var expectedRootModelMatrix = Matrix4.multiplyTransformation(
        rootDrawCommand.modelMatrix,
        rootTransformation,
        new Matrix4()
      );
      var expectedStaticChildModelMatrix = Matrix4.multiplyTransformation(
        expectedRootModelMatrix,
        staticChildNode.transform,
        new Matrix4()
      );
      var expectedTransformedChildModelMatrix = Matrix4.multiplyTransformation(
        expectedRootModelMatrix,
        transformedChildNode.transform,
        new Matrix4()
      );

      var expectedRootBoundingSphere = BoundingSphere.transform(
        rootPrimitive.boundingSphere,
        rootTransformation,
        new BoundingSphere()
      );
      var expectedStaticChildBoundingSphere = BoundingSphere.transform(
        staticChildDrawCommand.boundingVolume,
        rootTransformation,
        new BoundingSphere()
      );
      var expectedTransformedChildBoundingSphere = BoundingSphere.transform(
        transformedChildDrawCommand.boundingVolume,
        Matrix4.multiplyTransformation(
          rootTransformation,
          childTransformation,
          new Matrix4()
        ),
        new BoundingSphere()
      );

      scene.renderForSpecs();

      expect(
        Matrix4.equals(rootDrawCommand.modelMatrix, expectedRootModelMatrix)
      ).toBe(true);
      expect(
        BoundingSphere.equals(
          rootDrawCommand.boundingVolume,
          expectedRootBoundingSphere
        )
      ).toBe(true);
      expect(
        Matrix4.equals(
          staticChildDrawCommand.modelMatrix,
          expectedStaticChildModelMatrix
        )
      ).toBe(true);
      expect(
        BoundingSphere.equals(
          staticChildDrawCommand.boundingVolume,
          expectedStaticChildBoundingSphere
        )
      ).toBe(true);
      expect(
        Matrix4.equals(
          transformedChildDrawCommand.modelMatrix,
          expectedTransformedChildModelMatrix
        )
      ).toBe(true);
      expect(
        BoundingSphere.equals(
          transformedChildDrawCommand.boundingVolume,
          expectedTransformedChildBoundingSphere
        )
      ).toBe(true);
    });
  });
});
