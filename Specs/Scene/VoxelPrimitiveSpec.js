import {
  Cartesian3,
  Cesium3DTilesVoxelProvider,
  defined,
  Matrix4,
  VoxelPrimitive,
} from "../../Source/Cesium.js";
import createScene from "../createScene.js";
import pollToPromise from "../pollToPromise.js";

describe(
  "Scene/VoxelPrimitive",
  function () {
    const scene = createScene();
    let provider;

    beforeEach(function () {
      provider = new Cesium3DTilesVoxelProvider({
        url: "./Data/Cesium3DTiles/Voxel/VoxelEllipsoid3DTiles/tileset.json",
      });

      return pollToPromise(function () {
        provider.update(scene.frameState);
        return provider.ready;
      }).then(() => {
        scene.primitives.removeAll();
      });
    });

    it("constructs a primitive", function () {
      const primitive = new VoxelPrimitive();
      expect(primitive.geometryInstances).not.toBeDefined();
      expect(primitive.appearance).not.toBeDefined();
      expect(primitive.depthFailAppearance).not.toBeDefined();
      expect(primitive.modelMatrix).toEqual(Matrix4.IDENTITY);
      expect(primitive.show).toEqual(true);
    });

    it("constructs with options", function () {
      const primitive = new VoxelPrimitive({ provider });
      scene.primitives.add(primitive);
      scene.renderForSpecs();

      expect(primitive.provider).toBe(provider);
      return primitive.readyPromise.then(function () {
        expect(primitive.shape._type).toBe(provider.shape._type);
        expect(primitive.dimensions.equals(provider.dimensions)).toBe(true);
        expect(primitive._tileCount).toBe(provider._tileCount);
        expect(defined(primitive._traversal)).toBe(true);
        // TODO should we test writing glsl functions? i.e. sample functions, setting style input values for each metadata
      });
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

    it("updates step size", function () {
      const primitive = new VoxelPrimitive({ provider });
      scene.primitives.add(primitive);
      scene.renderForSpecs();

      const shape = primitive._shape;
      shape.translation = new Cartesian3(2.382, -3.643, 1.084);
      return primitive.readyPromise.then(function () {
        primitive.update(scene.frameState);
        const stepSizeUv = shape.computeApproximateStepSize(
          primitive.dimensions
        );
        expect(primitive._stepSizeUv).toBe(stepSizeUv);
      });
    });
  },
  "WebGL"
);
