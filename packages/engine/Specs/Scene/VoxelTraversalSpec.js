import {
  Matrix4,
  VoxelEllipsoidShape,
  VoxelTraversal,
  VoxelPrimitive,
  Cartesian3,
  OrientedBoundingBox,
  Math as CesiumMath,
  MetadataType,
  CullingVolume,
  Cesium3DTilesVoxelProvider,
} from "../../index.js";
import createScene from "../../../../Specs/createScene.js";

const towardPrimitive = Cartesian3.fromElements(1.0, 1.0, 1.0);

function turnCameraAround(scene) {
  scene.camera.direction = Cartesian3.negate(towardPrimitive, new Cartesian3());
  scene.renderForSpecs();
}

describe(
  "Scene/VoxelTraversal",
  function () {
    const keyframeCount = 3;
    const textureMemory = 500;

    let scene;
    let provider;
    let camera;
    let primitive;
    let traversal;

    beforeEach(function () {
      scene = createScene();
      provider = new Cesium3DTilesVoxelProvider({
        url: "./Data/Cesium3DTiles/Voxel/VoxelEllipsoid3DTiles/tileset.json",
      });

      camera = scene.camera;
      camera.position = Cartesian3.fromElements(-10, -10, -10);
      camera.direction = Cartesian3.fromElements(1, 1, 1);
      camera.frustum.fov = CesiumMath.PI_OVER_TWO;
      primitive = new VoxelPrimitive({
        voxelProvider: provider,
      });
      scene.primitives.add(primitive);
      scene.renderForSpecs();
      return provider.readyPromise.then(function () {
        traversal = new VoxelTraversal(
          primitive,
          scene.context,
          provider.dimensions,
          provider.types,
          provider.componentTypes,
          keyframeCount,
          textureMemory
        );
      });
    });

    afterEach(function () {
      scene.destroyForSpecs();
    });

    it("constructs with arguments", function () {
      expect(traversal._primitive).toBe(primitive);
      expect(traversal.megatextures.length).toBe(1);
      const megatexture = traversal.megatextures[0];
      expect(megatexture.datatype).toBe(MetadataType.FLOAT);
    });

    it("recomputes bounding volume when shape moves", function () {
      const rootNode = traversal.rootNode;
      const oldOrientedBoundingBox = rootNode.orientedBoundingBox.clone();
      const shape = traversal._primitive._shape;
      const translation = Cartesian3.fromElements(1, 1, 1);
      shape.translation = translation;
      const modelMatrix = Matrix4.fromTranslation(translation);
      shape.update(
        modelMatrix,
        VoxelEllipsoidShape.DefaultMinBounds,
        VoxelEllipsoidShape.DefaultMaxBounds
      );
      const keyFrameLocation = 0;
      const recomputeBoundingVolumes = true;
      const pauseUpdate = false;
      traversal.update(
        scene.frameState,
        keyFrameLocation,
        recomputeBoundingVolumes,
        pauseUpdate
      );
      const newOrientedBoundingBox = rootNode.orientedBoundingBox.clone();
      expect(
        OrientedBoundingBox.equals(
          oldOrientedBoundingBox,
          newOrientedBoundingBox
        )
      ).toBe(false);
      expect(newOrientedBoundingBox.center.equals(translation)).toBe(true);
    });

    it("computes screen space error for root tile", function () {
      const { context, pixelRatio } = scene.frameState;
      const screenHeight = context.drawingBufferHeight / pixelRatio;
      const screenSpaceErrorMultiplier =
        screenHeight / camera.frustum.sseDenominator;
      const rootNode = traversal.rootNode;
      rootNode.computeScreenSpaceError(
        camera.positionWC,
        screenSpaceErrorMultiplier
      );

      let distanceToCamera = Math.sqrt(
        rootNode.orientedBoundingBox.distanceSquaredTo(camera.positionWC)
      );
      distanceToCamera = Math.max(distanceToCamera, CesiumMath.EPSILON7);
      const error =
        screenSpaceErrorMultiplier *
        (rootNode.approximateVoxelSize / distanceToCamera);
      expect(rootNode.screenSpaceError).toBe(error);
    });

    it("computes visibility for root tile", function () {
      const rootNode = traversal.rootNode;
      const visibilityPlaneMask = CullingVolume.MASK_INDETERMINATE;

      const visibilityWhenLookingAtRoot = rootNode.visibility(
        scene.frameState,
        visibilityPlaneMask
      );
      expect(visibilityWhenLookingAtRoot).toBe(CullingVolume.MASK_INSIDE);
      // expect(traversal.isRenderable(rootNode)).toBe(true);

      turnCameraAround(scene);
      const visibilityWhenLookingAway = rootNode.visibility(
        scene.frameState,
        visibilityPlaneMask
      );
      expect(visibilityWhenLookingAway).toBe(CullingVolume.MASK_OUTSIDE);
    });

    it("destroys", function () {
      expect(traversal.isDestroyed()).toBe(false);
      traversal.destroy();
      expect(traversal.isDestroyed()).toBe(true);
    });

    xit("loads tiles into megatexture", function () {
      const keyFrameLocation = 0;
      const recomputeBoundingVolumes = true;
      const pauseUpdate = false;
      traversal.update(
        scene.frameState,
        keyFrameLocation,
        recomputeBoundingVolumes,
        pauseUpdate
      );

      const megatexture = traversal.megatextures[0];
      let tilesInMegatextureCount = megatexture.occupiedCount;
      const tileInQueueWhenLookingAtRoot = tilesInMegatextureCount === 1;
      expect(tileInQueueWhenLookingAtRoot).toBe(true);

      turnCameraAround(scene);
      traversal.update(
        scene.frameState,
        keyFrameLocation,
        recomputeBoundingVolumes,
        pauseUpdate
      );
      tilesInMegatextureCount = traversal.megatextures[0].occupiedCount;
      const tileNotInQueueWhenLookingAway = tilesInMegatextureCount === 0;
      expect(tileNotInQueueWhenLookingAway).toBe(true);
    });

    xit("unloads tiles in megatexture", function () {
      const keyFrameLocation = 0;
      const recomputeBoundingVolumes = true;
      const pauseUpdate = false;
      function updateTraversalTenTimes() {
        // to fully fetch data and copy to texture
        function updateTraversal() {
          traversal.update(
            scene.frameState,
            keyFrameLocation,
            recomputeBoundingVolumes,
            pauseUpdate
          );
        }
        for (let i = 0; i < 10; i++) {
          updateTraversal();
        }
      }

      const eps = CesiumMath.EPSILON7;
      const bottomLeftNearCorner = Cartesian3.fromElements(
        -0.5 - eps,
        -0.5 - eps,
        -0.5 - eps
      );
      const topRightFarCorner = Cartesian3.fromElements(
        0.5 + eps,
        0.5 + eps,
        0.5 + eps
      );
      scene.camera.position = bottomLeftNearCorner;
      updateTraversalTenTimes();
      const numberOfNodesOnGPU = traversal._keyframeNodesInMegatexture.length;
      const deepestNode =
        traversal._keyframeNodesInMegatexture[numberOfNodesOnGPU - 1];
      const deepestSpatialNode = deepestNode.spatialNode;
      const nodeIsInMegatexture =
        deepestNode.state === VoxelTraversal.LoadState.LOADED;
      expect(nodeIsInMegatexture).toBe(true);

      scene.camera.position = topRightFarCorner;
      turnCameraAround(scene);
      updateTraversalTenTimes();
      const nodeNoLongerInMegatexture =
        traversal._keyframeNodesInMegatexture.filter(function (keyFrameNode) {
          const spatialNode = keyFrameNode.spatialNode;
          return (
            spatialNode.level === deepestSpatialNode.level &&
            spatialNode.x === deepestSpatialNode.x &&
            spatialNode.y === deepestSpatialNode.y &&
            spatialNode.x === deepestSpatialNode.z
          );
        }).length === 0;
      expect(nodeNoLongerInMegatexture).toBe(true);
    });
  },
  "WebGL"
);
