import {
  Cartesian3,
  Cesium3DTilesVoxelProvider,
  CullingVolume,
  KeyframeNode,
  Math as CesiumMath,
  Matrix4,
  MetadataType,
  OrientedBoundingBox,
  VoxelEllipsoidShape,
  VoxelTraversal,
  VoxelPrimitive,
} from "../../index.js";
import createScene from "../../../../Specs/createScene.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";

const towardPrimitive = Cartesian3.fromElements(1.0, 1.0, 1.0);

function turnCameraAround(scene) {
  scene.camera.direction = Cartesian3.negate(towardPrimitive, new Cartesian3());
  scene.renderForSpecs();
}

describe(
  "Scene/VoxelTraversal",
  function () {
    const keyframeCount = 3;
    const textureMemoryByteLength = 256;

    let scene;
    let provider;
    let camera;
    let primitive;
    let traversal;

    beforeEach(async function () {
      scene = createScene();
      provider = await Cesium3DTilesVoxelProvider.fromUrl(
        "./Data/Cesium3DTiles/Voxel/VoxelEllipsoid3DTiles/tileset.json",
      );

      camera = scene.camera;
      camera.position = Cartesian3.fromElements(-6378000, -6378000, -6378000);
      camera.direction = Cartesian3.fromElements(1, 1, 1);
      camera.frustum.fov = CesiumMath.PI_OVER_TWO;
      primitive = new VoxelPrimitive({
        provider: provider,
      });
      scene.primitives.add(primitive);
      scene.renderForSpecs();
      traversal = new VoxelTraversal(
        primitive,
        scene.context,
        keyframeCount,
        textureMemoryByteLength,
      );
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
        VoxelEllipsoidShape.DefaultMaxBounds,
      );
      const keyFrameLocation = 0;
      const recomputeBoundingVolumes = true;
      const pauseUpdate = false;
      traversal.update(
        scene.frameState,
        keyFrameLocation,
        recomputeBoundingVolumes,
        pauseUpdate,
      );
      const newOrientedBoundingBox = rootNode.orientedBoundingBox.clone();
      expect(
        OrientedBoundingBox.equals(
          oldOrientedBoundingBox,
          newOrientedBoundingBox,
        ),
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
        screenSpaceErrorMultiplier,
      );

      let distanceToCamera = Math.sqrt(
        rootNode.orientedBoundingBox.distanceSquaredTo(camera.positionWC),
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
        visibilityPlaneMask,
      );
      expect(visibilityWhenLookingAtRoot).toBe(CullingVolume.MASK_INSIDE);
      // expect(traversal.isRenderable(rootNode)).toBe(true);

      turnCameraAround(scene);
      const visibilityWhenLookingAway = rootNode.visibility(
        scene.frameState,
        visibilityPlaneMask,
      );
      expect(visibilityWhenLookingAway).toBe(CullingVolume.MASK_OUTSIDE);
    });

    it("destroys", function () {
      expect(traversal.isDestroyed()).toBe(false);
      traversal.destroy();
      expect(traversal.isDestroyed()).toBe(true);
    });

    it("shows texture memory allocation statistic", function () {
      expect(traversal.textureMemoryByteLength).toBe(textureMemoryByteLength);
      traversal.destroy();
      expect(traversal.textureMemoryByteLength).toBe(0);
    });

    it("loads tiles into megatexture", async function () {
      const keyFrameLocation = 0;
      const recomputeBoundingVolumes = true;
      const pauseUpdate = false;
      await pollToPromise(function () {
        traversal.update(
          scene.frameState,
          keyFrameLocation,
          recomputeBoundingVolumes,
          pauseUpdate,
        );
        scene.renderForSpecs();
        return (
          traversal.megatextures[0].occupiedCount > 0 &&
          traversal._primitive.statistics.texturesByteLength > 0
        );
      });

      const megatexture = traversal.megatextures[0];
      expect(megatexture.occupiedCount).toBe(1);
      expect(traversal.textureMemoryByteLength).toEqual(
        textureMemoryByteLength,
      );
    });

    it("tile failed event is raised", async function () {
      traversal._calculateStatistics = true;
      const keyFrameLocation = 0;
      const recomputeBoundingVolumes = true;
      const pauseUpdate = false;
      const spyFailed = jasmine.createSpy("listener");
      traversal._primitive.tileFailed.addEventListener(spyFailed);
      spyOn(traversal._primitive._provider, "requestData").and.callFake(() => {
        return Promise.reject();
      });
      let counter = 0;
      const target = 3;
      await pollToPromise(function () {
        traversal.update(
          scene.frameState,
          keyFrameLocation,
          recomputeBoundingVolumes,
          pauseUpdate,
        );
        counter++;
        return counter === target;
      });
      expect(spyFailed.calls.count()).toBeGreaterThan(1);
      expect(
        traversal._primitive.statistics.numberOfTilesWithContentReady,
      ).toEqual(0);
      expect(traversal._primitive.statistics.visited).toEqual(3);
    });

    it("finds keyframe node with expected metadata values", async function () {
      const keyFrameLocation = 0;
      const recomputeBoundingVolumes = true;
      const pauseUpdate = false;
      await pollToPromise(function () {
        traversal.update(
          scene.frameState,
          keyFrameLocation,
          recomputeBoundingVolumes,
          pauseUpdate,
        );
        scene.renderForSpecs();
        return traversal.megatextures[0].occupiedCount > 0;
      });

      const megatextureIndex = 0;
      const keyframeNode = traversal.findKeyframeNode(megatextureIndex);
      expect(keyframeNode).toBeDefined();
      expect(keyframeNode.state).toBe(KeyframeNode.LoadState.LOADED);
      const expectedMetadata = new Float32Array([0, 0, 0, 0, 1, 1, 1, 1]);
      expect(keyframeNode.content.metadata[0]).toEqual(expectedMetadata);
    });
  },
  "WebGL",
);
