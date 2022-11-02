import {
  Cartesian3,
  GltfVoxelProvider,
  Matrix4,
  MetadataComponentType,
  MetadataType,
  ResourceCache,
  VoxelProvider,
  VoxelShapeType,
} from "../../Source/Cesium.js";
import createScene from "../createScene.js";
import pollToPromise from "../pollToPromise.js";

describe(
  "Scene/GltfVoxelProvider",
  function () {
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

    it("conforms to VoxelProvider interface", function () {
      expect(GltfVoxelProvider).toConformToInterface(VoxelProvider);
    });

    it("constructor works", function () {
      const url =
        "./Data/Cesium3DTiles/Voxel/VoxelEllipsoid3DTiles/0/0/0/0/tile.gltf";
      const provider = new GltfVoxelProvider({
        gltf: url,
      });

      return pollToPromise(function () {
        provider.update(scene.frameState);
        return provider.ready;
      }).then(function () {
        expect(provider).toBeDefined();
        expect(provider.ready).toBeTrue();
        expect(provider.modelMatrix).toEqual(Matrix4.IDENTITY);
        expect(provider.shape).toEqual(VoxelShapeType.ELLIPSOID);
        expect(provider.minBounds).toEqual(new Cartesian3(0.0, 0.0, -1.0));
        expect(provider.maxBounds).toEqual(new Cartesian3(1.0, 1.0, 0.0));
        expect(provider.dimensions).toEqual(new Cartesian3(2, 2, 2));
        expect(provider.paddingBefore).toBeUndefined();
        expect(provider.paddingAfter).toBeUndefined();
        expect(provider.names).toEqual(["a"]);
        expect(provider.types).toEqual([MetadataType.SCALAR]);
        expect(provider.componentTypes).toEqual([
          MetadataComponentType.FLOAT32,
        ]);
        expect(provider.minimumValues).toBeUndefined();
        expect(provider.maximumValues).toBeUndefined();
        expect(provider.maximumTileCount).toEqual(1);
      });
    });

    it("constructor throws when gltf option is missing", function () {
      expect(function () {
        return new GltfVoxelProvider({
          gltf: undefined,
        });
      }).toThrowDeveloperError();
    });

    it("requestData works", function () {
      const url =
        "./Data/Cesium3DTiles/Voxel/VoxelEllipsoid3DTiles/0/0/0/0/tile.gltf";
      const provider = new GltfVoxelProvider({
        gltf: url,
      });

      return pollToPromise(function () {
        provider.update(scene.frameState);
        return provider.ready;
      }).then(function () {
        const requestTilePromise = provider.requestData();

        // need to call update until the promise is ready
        return pollToPromise(function () {
          provider.update(scene.frameState);
          return provider.doneLoading();
        })
          .then(function () {
            return requestTilePromise;
          })
          .then(function (data) {
            expect(data.length).toEqual(1);

            const dimensions = provider.dimensions;
            const voxelCount = dimensions.x * dimensions.y * dimensions.z;
            const componentCount = MetadataType.getComponentCount(
              provider.types[0]
            );
            const expectedLength = voxelCount * componentCount;
            expect(data[0].length).toEqual(expectedLength);
          });
      });
    });

    it("requestData throws for non-root tiles", function () {
      const url =
        "./Data/Cesium3DTiles/Voxel/VoxelEllipsoid3DTiles/0/0/0/0/tile.gltf";
      const provider = new GltfVoxelProvider({
        gltf: url,
      });
      expect(function () {
        return provider.requestData({
          x: 0,
          y: 0,
          z: 0,
          level: 1,
        });
      }).toThrowDeveloperError();
    });

    it("requestData throws if the provider is not ready", function () {
      const url =
        "./Data/Cesium3DTiles/Voxel/VoxelEllipsoid3DTiles/tileset.json";
      const provider = new GltfVoxelProvider({
        gltf: url,
      });
      expect(function () {
        return provider.requestData();
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
