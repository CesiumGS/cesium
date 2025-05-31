import { test, expect } from "./test.js";

test("renders procedural voxel in perspective camera", async ({
  cesiumPage,
}) => {
  await cesiumPage.goto();

  await cesiumPage.page.evaluate(() => {
    const viewer = new Cesium.Viewer("cesiumContainer", {
      baseLayer: Cesium.ImageryLayer.fromProviderAsync(
        Cesium.TileMapServiceImageryProvider.fromUrl(
          Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),
        ),
      ),
      baseLayerPicker: false,
      geocoder: false,
      animation: false,
      timeline: false,
      sceneModePicker: false,
      homeButton: false,
      navigationHelpButton: false,
    });

    const { scene, camera } = viewer;
    camera.setView({
      destination: new Cesium.Cartesian3(
        20463166.456674013,
        24169216.80790143,
        15536221.507601531,
      ),
      orientation: new Cesium.HeadingPitchRoll(
        6.283185307179586,
        -1.5680902263173198,
        0,
      ),
    });

    const globalTransform = Cesium.Matrix4.fromScale(
      Cesium.Cartesian3.fromElements(
        Cesium.Ellipsoid.WGS84.maximumRadius,
        Cesium.Ellipsoid.WGS84.maximumRadius,
        Cesium.Ellipsoid.WGS84.maximumRadius,
      ),
    );

    function ProceduralSingleTileVoxelProvider(shape) {
      this.shape = shape;
      this.minBounds = Cesium.VoxelShapeType.getMinBounds(shape).clone();
      this.maxBounds = Cesium.VoxelShapeType.getMaxBounds(shape).clone();
      this.dimensions = new Cesium.Cartesian3(8, 8, 8);
      this.names = ["color"];
      this.types = [Cesium.MetadataType.VEC4];
      this.componentTypes = [Cesium.MetadataComponentType.FLOAT32];
      this.globalTransform = globalTransform;
    }

    const scratchColor = new Cesium.Color();

    ProceduralSingleTileVoxelProvider.prototype.requestData = function (
      options,
    ) {
      if (options.tileLevel >= 1) {
        return Promise.reject(`No tiles available beyond level 0`);
      }

      const dimensions = this.dimensions;
      const voxelCount = dimensions.x * dimensions.y * dimensions.z;
      const type = this.types[0];
      const channelCount = Cesium.MetadataType.getComponentCount(type);
      const dataColor = new Float32Array(voxelCount * channelCount);

      const randomSeed = dimensions.y * dimensions.x + dimensions.x;
      Cesium.Math.setRandomNumberSeed(randomSeed);
      const hue = Cesium.Math.nextRandomNumber();

      for (let z = 0; z < dimensions.z; z++) {
        for (let y = 0; y < dimensions.y; y++) {
          const indexZY = z * dimensions.y * dimensions.x + y * dimensions.x;
          for (let x = 0; x < dimensions.x; x++) {
            const lerperX = x / (dimensions.x - 1);
            const lerperY = y / (dimensions.y - 1);
            const lerperZ = z / (dimensions.z - 1);

            const h = hue + lerperX * 0.5 - lerperY * 0.3 + lerperZ * 0.2;
            const s = 1.0 - lerperY * 0.2;
            const v = 0.5 + 2.0 * (lerperZ - 0.5) * 0.2;
            const color = Cesium.Color.fromHsl(h, s, v, 1.0, scratchColor);

            const index = (indexZY + x) * channelCount;
            dataColor[index + 0] = color.red;
            dataColor[index + 1] = color.green;
            dataColor[index + 2] = color.blue;
            dataColor[index + 3] = 0.75;
          }
        }
      }

      const content = Cesium.VoxelContent.fromMetadataArray([dataColor]);
      return Promise.resolve(content);
    };

    const provider = new ProceduralSingleTileVoxelProvider(
      Cesium.VoxelShapeType.BOX,
    );

    const customShader = new Cesium.CustomShader({
      fragmentShaderText: `void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)
  {
      material.diffuse = fsInput.metadata.color.rgb;
      float transparency = 1.0 - fsInput.metadata.color.a;

      // To mimic light scattering, use exponential decay
      float thickness = fsInput.voxel.travelDistance * 16.0;
      material.alpha = 1.0 - pow(transparency, thickness);
  }`,
    });

    scene.primitives.add(new Cesium.VoxelPrimitive({ provider, customShader }));
  });
  await cesiumPage.page.clock.pauseAt(new Date("2023-12-25T14:00:00"));
  await cesiumPage.page.waitForLoadState("networkidle");

  await cesiumPage.page.clock.runFor(1000);

  await expect(cesiumPage.page).toHaveScreenshot();
});

test("renders procedural voxel in orthographic camera", async ({
  cesiumPage,
}) => {
  await cesiumPage.goto();

  await cesiumPage.page.evaluate(() => {
    const viewer = new Cesium.Viewer("cesiumContainer", {
      baseLayer: Cesium.ImageryLayer.fromProviderAsync(
        Cesium.TileMapServiceImageryProvider.fromUrl(
          Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),
        ),
      ),
      baseLayerPicker: false,
      geocoder: false,
      animation: false,
      timeline: false,
      sceneModePicker: false,
      homeButton: false,
      navigationHelpButton: false,
    });

    const { scene, camera } = viewer;
    camera.setView({
      destination: new Cesium.Cartesian3(
        20463166.456674013,
        24169216.80790143,
        15536221.507601531,
      ),
      orientation: new Cesium.HeadingPitchRoll(
        6.283185307179586,
        -1.5680902263173198,
        0,
      ),
    });
    camera.switchToOrthographicFrustum();

    const globalTransform = Cesium.Matrix4.fromScale(
      Cesium.Cartesian3.fromElements(
        Cesium.Ellipsoid.WGS84.maximumRadius,
        Cesium.Ellipsoid.WGS84.maximumRadius,
        Cesium.Ellipsoid.WGS84.maximumRadius,
      ),
    );

    function ProceduralSingleTileVoxelProvider(shape) {
      this.shape = shape;
      this.minBounds = Cesium.VoxelShapeType.getMinBounds(shape).clone();
      this.maxBounds = Cesium.VoxelShapeType.getMaxBounds(shape).clone();
      this.dimensions = new Cesium.Cartesian3(8, 8, 8);
      this.names = ["color"];
      this.types = [Cesium.MetadataType.VEC4];
      this.componentTypes = [Cesium.MetadataComponentType.FLOAT32];
      this.globalTransform = globalTransform;
    }

    const scratchColor = new Cesium.Color();

    ProceduralSingleTileVoxelProvider.prototype.requestData = function (
      options,
    ) {
      if (options.tileLevel >= 1) {
        return Promise.reject(`No tiles available beyond level 0`);
      }

      const dimensions = this.dimensions;
      const voxelCount = dimensions.x * dimensions.y * dimensions.z;
      const type = this.types[0];
      const channelCount = Cesium.MetadataType.getComponentCount(type);
      const dataColor = new Float32Array(voxelCount * channelCount);

      const randomSeed = dimensions.y * dimensions.x + dimensions.x;
      Cesium.Math.setRandomNumberSeed(randomSeed);
      const hue = Cesium.Math.nextRandomNumber();

      for (let z = 0; z < dimensions.z; z++) {
        for (let y = 0; y < dimensions.y; y++) {
          const indexZY = z * dimensions.y * dimensions.x + y * dimensions.x;
          for (let x = 0; x < dimensions.x; x++) {
            const lerperX = x / (dimensions.x - 1);
            const lerperY = y / (dimensions.y - 1);
            const lerperZ = z / (dimensions.z - 1);

            const h = hue + lerperX * 0.5 - lerperY * 0.3 + lerperZ * 0.2;
            const s = 1.0 - lerperY * 0.2;
            const v = 0.5 + 2.0 * (lerperZ - 0.5) * 0.2;
            const color = Cesium.Color.fromHsl(h, s, v, 1.0, scratchColor);

            const index = (indexZY + x) * channelCount;
            dataColor[index + 0] = color.red;
            dataColor[index + 1] = color.green;
            dataColor[index + 2] = color.blue;
            dataColor[index + 3] = 0.75;
          }
        }
      }

      const content = Cesium.VoxelContent.fromMetadataArray([dataColor]);
      return Promise.resolve(content);
    };

    const provider = new ProceduralSingleTileVoxelProvider(
      Cesium.VoxelShapeType.BOX,
    );

    const customShader = new Cesium.CustomShader({
      fragmentShaderText: `void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)
  {
      material.diffuse = fsInput.metadata.color.rgb;
      float transparency = 1.0 - fsInput.metadata.color.a;

      // To mimic light scattering, use exponential decay
      float thickness = fsInput.voxel.travelDistance * 16.0;
      material.alpha = 1.0 - pow(transparency, thickness);
  }`,
    });

    scene.primitives.add(new Cesium.VoxelPrimitive({ provider, customShader }));
  });
  await cesiumPage.page.clock.pauseAt(new Date("2023-12-25T14:00:00"));
  await cesiumPage.page.waitForLoadState("networkidle");

  await cesiumPage.page.clock.runFor(1000);

  await expect(cesiumPage.page).toHaveScreenshot();
});
