import createScene from "../../../../Specs/createScene.js";
import {
  Cartesian3,
  createWorldTerrainAsync,
  Ellipsoid,
  EllipsoidTerrainProvider,
  ImageryLayerCollection,
  QuadtreeTile,
  GeographicTilingScheme,
  Ray,
} from "../../index.js";

import MockTerrainProvider from "../../../../Specs/MockTerrainProvider.js";
import TerrainTileProcessor from "../../../../Specs/TerrainTileProcessor.js";
import GeographicProjection from "../../Source/Core/GeographicProjection.js";
import { SceneMode } from "@cesium/engine";

describe(
  "Core/TerrainPicker",
  function () {
    let frameState;
    let tilingScheme;
    let rootTiles;
    let imageryLayerCollection;
    let mockTerrain;
    let processor;
    let scene;

    beforeEach(function () {
      frameState = {
        context: {
          cache: {},
        },
      };

      tilingScheme = new GeographicTilingScheme();
      rootTiles = QuadtreeTile.createLevelZeroTiles(tilingScheme);
      imageryLayerCollection = new ImageryLayerCollection();

      mockTerrain = new MockTerrainProvider();

      processor = new TerrainTileProcessor(
        frameState,
        mockTerrain,
        imageryLayerCollection,
      );
    });

    afterEach(function () {
      for (let i = 0; i < rootTiles.length; ++i) {
        rootTiles[i].freeResources();
      }
    });

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    it("picks the correct point even when the mesh includes normals", async function () {
      const terrainProvider = await createWorldTerrainAsync({
        requestVertexNormals: true,
        requestWaterMask: false,
      });

      const tile = new QuadtreeTile({
        tilingScheme: new GeographicTilingScheme(),
        level: 11,
        x: 3788,
        y: 1336,
      });

      processor.frameState = scene.frameState;
      processor.terrainProvider = terrainProvider;

      await processor.process([tile]);
      const ray = new Ray(
        new Cartesian3(
          -5052039.459789615,
          2561172.040315167,
          -2936276.999965875,
        ),
        new Cartesian3(
          0.5036332963145244,
          0.6648033332898124,
          0.5517155343926082,
        ),
      );
      const pickResult = tile.data.pick(ray, scene.mode, undefined, true);
      const cartographic = Ellipsoid.WGS84.cartesianToCartographic(pickResult);
      expect(cartographic.height).toBeGreaterThan(-500.0);
    });

    it("picks the correct point when a closer triangle is processed after a farther triangle", function () {
      // Pick root tile (level=0, x=0, y=0) from the east side towards the west.
      // Based on heightmap triangle processing order the west triangle will be tested first, followed
      // by the east triangle. But since the east triangle is closer we expect it to be the pick result.
      const terrainProvider = new EllipsoidTerrainProvider();

      const tile = new QuadtreeTile({
        tilingScheme: new GeographicTilingScheme(),
        level: 0,
        x: 0,
        y: 0,
      });

      processor.frameState = scene.frameState;
      processor.terrainProvider = terrainProvider;

      return processor.process([tile]).then(function () {
        const origin = new Cartesian3(50000000.0, -1.0, 0.0);
        const direction = new Cartesian3(-1.0, 0.0, 0.0);
        const ray = new Ray(origin, direction);
        const cullBackFaces = false;
        const pickResult = tile.data.pick(
          ray,
          scene.mode,
          undefined,
          cullBackFaces,
        );

        expect(pickResult.x).toBeGreaterThan(0.0);
      });
    });

    it("ignores triangles that are behind the ray when picking", function () {
      // Pick root tile (level=0, x=0, y=0) from the center towards the east side (+X).
      const terrainProvider = new EllipsoidTerrainProvider();

      const tile = new QuadtreeTile({
        tilingScheme: new GeographicTilingScheme(),
        level: 0,
        x: 0,
        y: 0,
      });

      processor.frameState = scene.frameState;
      processor.terrainProvider = terrainProvider;

      return processor.process([tile]).then(function () {
        const origin = new Cartesian3(0.0, -1.0, 0.0);
        const direction = new Cartesian3(1.0, 0.0, 0.0);
        const ray = new Ray(origin, direction);
        const cullBackFaces = false;
        const pickResult = tile.data.pick(
          ray,
          scene.mode,
          undefined,
          cullBackFaces,
        );

        expect(pickResult.x).toBeGreaterThan(0.0);
      });
    });

    it("picks the same point repeatedly given the same ray", async function () {
      const terrainProvider = await createWorldTerrainAsync();

      const tile = new QuadtreeTile({
        tilingScheme: new GeographicTilingScheme(),
        level: 11,
        x: 3788,
        y: 1336,
      });

      processor.frameState = scene.frameState;
      processor.terrainProvider = terrainProvider;

      await processor.process([tile]);
      const ray = new Ray(
        new Cartesian3(
          -5052039.459789615,
          2561172.040315167,
          -2936276.999965875,
        ),
        new Cartesian3(
          0.5036332963145244,
          0.6648033332898124,
          0.5517155343926082,
        ),
      );

      // Test the same point 4x to match the maximum depth of the TerrainPicker's quadtree
      const pickResult1 = tile.data.pick(ray, scene.mode, undefined, true);
      const pickResult2 = tile.data.pick(ray, scene.mode, undefined, true);
      const pickResult3 = tile.data.pick(ray, scene.mode, undefined, true);
      const pickResult4 = tile.data.pick(ray, scene.mode, undefined, true);

      expect(Cartesian3.equals(pickResult1, pickResult2)).toBe(true);
      expect(Cartesian3.equals(pickResult1, pickResult3)).toBe(true);
      expect(Cartesian3.equals(pickResult1, pickResult4)).toBe(true);
    });

    it("picks the correct point in 2D mode", async function () {
      const terrainProvider = await createWorldTerrainAsync();

      const tile = new QuadtreeTile({
        tilingScheme: new GeographicTilingScheme(),
        level: 11,
        x: 3788,
        y: 1336,
      });

      processor.frameState = scene.frameState;
      processor.terrainProvider = terrainProvider;

      await processor.process([tile]);
      const ray = new Ray(
        new Cartesian3(
          2225176.403907301,
          -16901892.821517847,
          11980956.030684207,
        ),
        new Cartesian3(
          -0.16643384121919264,
          0.8118600130186374,
          -0.5596276402737828,
        ),
      );

      const projection = new GeographicProjection(Ellipsoid.WGS84);
      const pickResult3D = tile.data.pick(
        ray,
        SceneMode.SCENE3D,
        projection,
        true,
      );
      tile.data.updateSceneMode(SceneMode.SCENE2D);
      const pickResult2D = tile.data.pick(
        ray,
        SceneMode.SCENE2D,
        projection,
        true,
      );

      expect(Cartesian3.equals(pickResult3D, pickResult2D)).toBe(true);
    });

    it("picks the correct point in CV mode", async function () {
      const terrainProvider = await createWorldTerrainAsync();

      const tile = new QuadtreeTile({
        tilingScheme: new GeographicTilingScheme(),
        level: 11,
        x: 3788,
        y: 1336,
      });

      processor.frameState = scene.frameState;
      processor.terrainProvider = terrainProvider;

      await processor.process([tile]);
      const ray = new Ray(
        new Cartesian3(
          2225176.403907301,
          -16901892.821517847,
          11980956.030684207,
        ),
        new Cartesian3(
          -0.16643384121919264,
          0.8118600130186374,
          -0.5596276402737828,
        ),
      );

      const projection = new GeographicProjection(Ellipsoid.WGS84);
      const pickResult3D = tile.data.pick(
        ray,
        SceneMode.SCENE3D,
        projection,
        true,
      );
      tile.data.updateSceneMode(SceneMode.COLUMBUS_VIEW);
      const pickResultCV = tile.data.pick(
        ray,
        SceneMode.COLUMBUS_VIEW,
        projection,
        true,
      );

      expect(Cartesian3.equals(pickResult3D, pickResultCV)).toBe(true);
    });

    it("picks the correct point after vertical exaggeration is applied", async function () {
      const terrainProvider = await createWorldTerrainAsync({
        requestVertexNormals: true,
        requestWaterMask: false,
      });

      const tile = new QuadtreeTile({
        tilingScheme: new GeographicTilingScheme(),
        level: 11,
        x: 3788,
        y: 1336,
      });

      // scene.frameState.verticalExaggeration = 2.0;
      processor.frameState = scene.frameState;
      processor.terrainProvider = terrainProvider;

      await processor.process([tile]);
      const ray = new Ray(
        new Cartesian3(
          -5052039.459789615,
          2561172.040315167,
          -2936276.999965875,
        ),
        new Cartesian3(
          0.5036332963145244,
          0.6648033332898124,
          0.5517155343926082,
        ),
      );
      const pickResult = tile.data.pick(ray, scene.mode, undefined, true);
      const cartographic = Ellipsoid.WGS84.cartesianToCartographic(pickResult);
      expect(cartographic.height).toBeGreaterThan(100.0);
    });
  },

  "WebGL",
);
