import {
  Cartesian3,
  Cesium3DTilesVoxelProvider,
  CustomShader,
  Matrix4,
  VoxelPrimitive,
} from "../../index.js";
import createScene from "../../../../Specs/createScene.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";

describe(
  "Scene/VoxelPrimitive",
  function () {
    let scene;
    let provider;

    beforeEach(async function () {
      scene = createScene();

      const camera = scene.camera;
      camera.position = Cartesian3.fromElements(-10, -10, -10);
      camera.direction = Cartesian3.fromElements(1, 1, 1);

      provider = await Cesium3DTilesVoxelProvider.fromUrl(
        "./Data/Cesium3DTiles/Voxel/VoxelEllipsoid3DTiles/tileset.json",
      );
      return provider;
    });

    afterEach(function () {
      scene.destroyForSpecs();
    });

    it("constructs a primitive", function () {
      const primitive = new VoxelPrimitive();
      expect(primitive.geometryInstances).not.toBeDefined();
      expect(primitive.appearance).not.toBeDefined();
      expect(primitive.depthFailAppearance).not.toBeDefined();
      expect(primitive.modelMatrix).toEqual(Matrix4.IDENTITY);
      expect(primitive.show).toEqual(true);
    });

    it("constructs with options", async function () {
      const primitive = new VoxelPrimitive({ provider });
      scene.primitives.add(primitive);

      expect(primitive.provider).toBe(provider);
      await pollToPromise(() => {
        scene.renderForSpecs();
        return primitive.ready;
      });

      expect(primitive.shape._type).toBe(provider.shape._type);
      expect(primitive.dimensions.equals(provider.dimensions)).toBe(true);
      expect(primitive._tileCount).toBe(provider._tileCount);
      expect(primitive._traversal).toBeDefined();
      expect(primitive.minimumValues).toBe(provider.minimumValues);
      expect(primitive.maximumValues).toBe(provider.maximumValues);
    });

    it("loads tiles from a minimal procedural provider", async function () {
      const spyUpdate = jasmine.createSpy("listener");
      const primitive = new VoxelPrimitive();
      primitive.initialTilesLoaded.addEventListener(spyUpdate);
      scene.primitives.add(primitive);
      await pollToPromise(() => {
        scene.renderForSpecs();
        return primitive._traversal._initialTilesLoaded;
      });
      expect(spyUpdate.calls.count()).toEqual(1);
    });

    it("initial tiles loaded and all tiles loaded events are raised", async function () {
      const spyUpdate1 = jasmine.createSpy("listener");
      const spyUpdate2 = jasmine.createSpy("listener");
      const primitive = new VoxelPrimitive({ provider });
      primitive.allTilesLoaded.addEventListener(spyUpdate1);
      primitive.initialTilesLoaded.addEventListener(spyUpdate2);
      scene.primitives.add(primitive);
      await pollToPromise(() => {
        scene.renderForSpecs();
        return primitive._traversal._initialTilesLoaded;
      });
      expect(spyUpdate1.calls.count()).toEqual(1);
      expect(spyUpdate2.calls.count()).toEqual(1);
    });

    it("statistics are updated when event listeners are assigned", async function () {
      const spyUpdate1 = jasmine.createSpy("listener");
      const spyUpdate2 = jasmine.createSpy("listener");
      const primitive = new VoxelPrimitive({ provider });
      scene.primitives.add(primitive);
      primitive.allTilesLoaded.addEventListener(spyUpdate1);
      primitive.initialTilesLoaded.addEventListener(spyUpdate2);
      await pollToPromise(() => {
        scene.renderForSpecs();
        return primitive._traversal._initialTilesLoaded;
      });
      expect(primitive.statistics.numberOfTilesWithContentReady).toEqual(1);
      expect(primitive.statistics.visited).toEqual(1);
      expect(primitive.statistics.texturesByteLength).toEqual(67108864);
    });

    it("statistics are updated when constructor option is true", async function () {
      const primitive = new VoxelPrimitive({
        provider,
        calculateStatistics: true,
      });
      scene.primitives.add(primitive);
      await pollToPromise(() => {
        scene.renderForSpecs();
        return primitive.ready;
      });
      await pollToPromise(() => {
        scene.renderForSpecs();
        return primitive._traversal._initialTilesLoaded;
      });
      expect(primitive.statistics.numberOfTilesWithContentReady).toEqual(1);
      expect(primitive.statistics.visited).toEqual(1);
    });

    it("statistics are not updated when constructor option is false", async function () {
      const primitive = new VoxelPrimitive({ provider });
      scene.primitives.add(primitive);
      await pollToPromise(() => {
        scene.renderForSpecs();
        return primitive.ready;
      });
      for (let i = 0; i < 10; i++) {
        scene.renderForSpecs();
      }
      expect(primitive.statistics.numberOfTilesWithContentReady).toEqual(0);
      expect(primitive.statistics.visited).toEqual(0);
    });

    it("tile load, load progress and tile visible events are raised", async function () {
      const spyUpdate1 = jasmine.createSpy("listener");
      const spyUpdate2 = jasmine.createSpy("listener");
      const spyUpdate3 = jasmine.createSpy("listener");
      const primitive = new VoxelPrimitive({ provider });
      primitive.tileLoad.addEventListener(spyUpdate1);
      primitive.loadProgress.addEventListener(spyUpdate2);
      primitive.tileVisible.addEventListener(spyUpdate3);
      scene.primitives.add(primitive);
      await pollToPromise(() => {
        scene.renderForSpecs();
        return primitive._traversal._initialTilesLoaded;
      });
      expect(spyUpdate1.calls.count()).toEqual(1);
      expect(spyUpdate2.calls.count()).toBeGreaterThan(0);
      expect(spyUpdate3.calls.count()).toEqual(1);
    });

    it("toggles render options that require shader rebuilds", async function () {
      const primitive = new VoxelPrimitive({ provider });
      scene.primitives.add(primitive);

      function toggleOption(option, defaultValue, newValue) {
        expect(primitive[option]).toBe(defaultValue);
        primitive[option] = newValue;
        expect(primitive._shaderDirty).toBe(true);
        primitive.update(scene.frameState);
        expect(primitive[option]).toBe(newValue);
        expect(primitive._shaderDirty).toBe(false);
      }

      await pollToPromise(function () {
        scene.renderForSpecs();
        const traversal = primitive._traversal;
        return traversal.isRenderable(traversal.rootNode);
      });

      toggleOption("depthTest", true, false);
      toggleOption("nearestSampling", false, true);
    });

    it("sets render parameters", async function () {
      const primitive = new VoxelPrimitive({ provider });
      scene.primitives.add(primitive);

      function setParameter(parameter, defaultValue, newValue) {
        expect(primitive[parameter]).toBe(defaultValue);
        primitive[parameter] = newValue;
        primitive.update(scene.frameState);
        expect(primitive[parameter]).toBe(newValue);
      }

      await pollToPromise(function () {
        scene.renderForSpecs();
        const traversal = primitive._traversal;
        return traversal.isRenderable(traversal.rootNode);
      });

      setParameter("levelBlendFactor", 0.0, 0.5);
      setParameter("screenSpaceError", 4.0, 2.0);
      setParameter("stepSize", 1.0, 0.5);
      setParameter("debugDraw", false, true);
    });

    it("sets clipping range extrema when given valid range between 0 and 1", function () {
      const primitive = new VoxelPrimitive({ provider });
      scene.primitives.add(primitive);
      scene.renderForSpecs();

      const setValue = Cartesian3.fromElements(0.1, 0.5, 0.3);
      expect(primitive.minClippingBounds.equals(setValue)).toBe(false);
      primitive.minClippingBounds = setValue;
      expect(primitive.minClippingBounds.equals(setValue)).toBe(true);
      expect(primitive.maxClippingBounds.equals(setValue)).toBe(false);
      primitive.maxClippingBounds = setValue;
      expect(primitive.maxClippingBounds.equals(setValue)).toBe(true);
    });

    it("vertically exaggerates height bounds for ellipsoid-shaped voxels", function () {
      const primitive = new VoxelPrimitive({ provider });
      scene.primitives.add(primitive);
      scene.renderForSpecs();

      const { minBounds, maxBounds } = primitive;
      expect(primitive._exaggeratedMinBounds).toEqual(minBounds);
      expect(primitive._exaggeratedMaxBounds).toEqual(maxBounds);

      const exaggerationFactor = 2.0;
      scene.verticalExaggeration = exaggerationFactor;
      scene.renderForSpecs();
      const expectedMinBounds = minBounds.clone();
      expectedMinBounds.z *= exaggerationFactor;
      const expectedMaxBounds = maxBounds.clone();
      expectedMaxBounds.z *= exaggerationFactor;
      expect(primitive._exaggeratedMinBounds).toEqual(expectedMinBounds);
      expect(primitive._exaggeratedMaxBounds).toEqual(expectedMaxBounds);
    });

    it("applies vertical exaggeration to box-shaped voxels by scaling the model matrix", async function () {
      const boxProvider = await Cesium3DTilesVoxelProvider.fromUrl(
        "./Data/Cesium3DTiles/Voxel/VoxelBox3DTiles/tileset.json",
      );
      const primitive = new VoxelPrimitive({ provider: boxProvider });
      scene.primitives.add(primitive);
      scene.renderForSpecs();

      const modelMatrix = primitive.modelMatrix.clone();
      expect(primitive._exaggeratedModelMatrix).toEqual(modelMatrix);

      const exaggerationFactor = 2.0;
      scene.verticalExaggeration = exaggerationFactor;
      scene.renderForSpecs();
      const scalar = Cartesian3.fromElements(1.0, 1.0, exaggerationFactor);
      const expectedModelMatrix = Matrix4.multiplyByScale(
        modelMatrix,
        scalar,
        new Matrix4(),
      );
      expect(primitive._exaggeratedModelMatrix).toEqual(expectedModelMatrix);
    });

    it("applies vertical exaggeration to cylinder-shaped voxels by scaling the model matrix", async function () {
      const boxProvider = await Cesium3DTilesVoxelProvider.fromUrl(
        "./Data/Cesium3DTiles/Voxel/VoxelCylinder3DTiles/tileset.json",
      );
      const primitive = new VoxelPrimitive({ provider: boxProvider });
      scene.primitives.add(primitive);
      scene.renderForSpecs();

      const modelMatrix = primitive.modelMatrix.clone();
      expect(primitive._exaggeratedModelMatrix).toEqual(modelMatrix);

      const exaggerationFactor = 2.0;
      scene.verticalExaggeration = exaggerationFactor;
      scene.renderForSpecs();
      const scalar = Cartesian3.fromElements(1.0, 1.0, exaggerationFactor);
      const expectedModelMatrix = Matrix4.multiplyByScale(
        modelMatrix,
        scalar,
        new Matrix4(),
      );
      expect(primitive._exaggeratedModelMatrix).toEqual(expectedModelMatrix);
    });

    it("uses default style", function () {
      const primitive = new VoxelPrimitive({ provider });
      scene.primitives.add(primitive);
      scene.renderForSpecs();
      primitive.style = undefined;
      expect(primitive.style).toBe(VoxelPrimitive.DefaultStyle);
    });

    it("accepts a new Custom Shader", async function () {
      const primitive = new VoxelPrimitive({ provider });
      scene.primitives.add(primitive);
      scene.renderForSpecs();

      await pollToPromise(() => {
        scene.renderForSpecs();
        return primitive.ready;
      });

      expect(primitive.customShader).toBe(VoxelPrimitive.DefaultCustomShader);

      // If new shader is undefined, we should get DefaultCustomShader again
      primitive.customShader = undefined;
      scene.renderForSpecs();
      expect(primitive.customShader).toBe(VoxelPrimitive.DefaultCustomShader);

      const modifiedShader = new CustomShader({
        fragmentShaderText: `void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)
{
    material.diffuse = vec3(1.0, 1.0, 0.0);
    material.alpha = 0.8;
}`,
      });
      primitive.customShader = modifiedShader;
      scene.renderForSpecs();
      expect(primitive.customShader).toBe(modifiedShader);
    });

    it("destroys", async function () {
      const primitive = new VoxelPrimitive({ provider });
      scene.primitives.add(primitive);
      scene.renderForSpecs();
      expect(primitive.isDestroyed()).toBe(false);

      await pollToPromise(() => {
        scene.renderForSpecs();
        return primitive.ready;
      });

      primitive.update(scene.frameState);
      expect(primitive.isDestroyed()).toBe(false);
      expect(primitive._pickId).toBeDefined();
      expect(primitive._traversal).toBeDefined();

      scene.primitives.remove(primitive);
      expect(primitive.isDestroyed()).toBe(true);
      expect(primitive._pickId).toBeUndefined();
      expect(primitive._traversal).toBeUndefined();
      expect(primitive.statistics).toBeDefined();
    });
  },
  "WebGL",
);
