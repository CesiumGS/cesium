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
        "./Data/Cesium3DTiles/Voxel/VoxelEllipsoid3DTiles/tileset.json"
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
      toggleOption("jitter", true, false);
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

    it("uses default style", function () {
      const primitive = new VoxelPrimitive({ provider });
      scene.primitives.add(primitive);
      scene.renderForSpecs();
      primitive.style = undefined;
      expect(primitive.style).toBe(VoxelPrimitive.DefaultStyle);
    });

    it("updates step size", async function () {
      const primitive = new VoxelPrimitive({ provider });
      scene.primitives.add(primitive);
      scene.renderForSpecs();

      const shape = primitive._shape;
      shape.translation = new Cartesian3(2.382, -3.643, 1.084);

      await pollToPromise(() => {
        scene.renderForSpecs();
        return primitive.ready;
      });

      primitive.update(scene.frameState);
      const stepSizeUv = shape.computeApproximateStepSize(primitive.dimensions);
      expect(primitive._stepSizeUv).toBe(stepSizeUv);
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
    });
  },
  "WebGL"
);
