import {
  defined,
  GeometryInstance,
  Rectangle,
  RectangleGeometry,
  WebMercatorTilingScheme,
  EllipsoidSurfaceAppearance,
  Globe,
  GlobeSurfaceTile,
  Primitive,
  QuadtreeTile,
  Math as CesiumMath ,
} from "../../../engine/index.js";

import {CesiumInspectorViewModel } from "../../index.js"

import createScene from "../../../../Specs/createScene.js";

describe(
  "Widgets/CesiumInspector/CesiumInspectorViewModel",
  function () {
    let scene;
    let performanceContainer;

    function createRectangle(rectangle, rotation) {
      return new Primitive({
        geometryInstances: new GeometryInstance({
          geometry: new RectangleGeometry({
            rectangle: rectangle,
            vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
            rotation: rotation,
          }),
        }),
        appearance: new EllipsoidSurfaceAppearance({
          aboveGround: false,
        }),
      });
    }

    beforeAll(function () {
      scene = createScene();
      performanceContainer = document.createElement("div");
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      scene.globe = new Globe();
      scene.initializeFrame();
    });

    afterEach(function () {
      scene.primitives.removeAll();
    });

    it("can create and destroy", function () {
      const viewModel = new CesiumInspectorViewModel(
        scene,
        performanceContainer
      );
      expect(viewModel.scene).toBe(scene);
      expect(viewModel.performanceContainer).toBe(performanceContainer);
      expect(viewModel.isDestroyed()).toEqual(false);
      viewModel.destroy();
      expect(viewModel.isDestroyed()).toEqual(true);
    });

    it("throws if scene is undefined", function () {
      expect(function () {
        return new CesiumInspectorViewModel();
      }).toThrowDeveloperError();
    });

    it("throws if performanceContainer is undefined", function () {
      expect(function () {
        return new CesiumInspectorViewModel(scene);
      }).toThrowDeveloperError();
    });

    it("show frustums", function () {
      const viewModel = new CesiumInspectorViewModel(
        scene,
        performanceContainer
      );
      viewModel.frustums = true;
      expect(viewModel.scene.debugShowFrustums).toBe(true);

      scene.render();

      viewModel.frustums = false;
      expect(viewModel.scene.debugShowFrustums).toBe(false);
    });

    it("show performance", function () {
      const viewModel = new CesiumInspectorViewModel(
        scene,
        performanceContainer
      );
      viewModel.performance = true;
      scene.render();
      expect(performanceContainer.innerHTML).not.toEqual("");

      viewModel.performance = false;
      scene.render();
      expect(performanceContainer.innerHTML).toEqual("");
    });

    it("primitive bounding sphere", function () {
      const p = scene.primitives.add(
        createRectangle(
          new Rectangle(
            CesiumMath.toRadians(-110.0),
            CesiumMath.toRadians(0.0),
            CesiumMath.toRadians(-90.0),
            CesiumMath.toRadians(20.0)
          ),
          CesiumMath.toRadians(45)
        )
      );
      const viewModel = new CesiumInspectorViewModel(
        scene,
        performanceContainer
      );
      scene.render();
      viewModel.primitive = p;
      viewModel.primitiveBoundingSphere = true;
      expect(p.debugShowBoundingVolume).toEqual(true);

      viewModel.primitiveBoundingSphere = false;
      scene.render();
      expect(p.debugShowBoundingVolume).toEqual(false);
    });

    it("primitive filter", function () {
      const p = scene.primitives.add(
        createRectangle(
          new Rectangle(
            CesiumMath.toRadians(-110.0),
            CesiumMath.toRadians(0.0),
            CesiumMath.toRadians(-90.0),
            CesiumMath.toRadians(20.0)
          ),
          CesiumMath.toRadians(45)
        )
      );

      const q = scene.primitives.add(
        createRectangle(
          new Rectangle(
            CesiumMath.toRadians(-10.0),
            CesiumMath.toRadians(0.0),
            CesiumMath.toRadians(-9.0),
            CesiumMath.toRadians(20.0)
          )
        )
      );

      const viewModel = new CesiumInspectorViewModel(
        scene,
        performanceContainer
      );
      scene.render();
      viewModel.primitive = p;
      viewModel.filterPrimitive = true;
      expect(defined(scene.debugCommandFilter)).toEqual(true);
      expect(scene.debugCommandFilter({ owner: p })).toEqual(true);
      expect(scene.debugCommandFilter({ owner: q })).toEqual(false);

      viewModel.filterPrimitive = false;
      expect(defined(scene.debugCommandFilter)).toEqual(false);
    });

    it("primitive reference frame", function () {
      const p = scene.primitives.add(
        createRectangle(
          new Rectangle(
            CesiumMath.toRadians(-110.0),
            CesiumMath.toRadians(0.0),
            CesiumMath.toRadians(-90.0),
            CesiumMath.toRadians(20.0)
          ),
          CesiumMath.toRadians(45)
        )
      );

      const viewModel = new CesiumInspectorViewModel(
        scene,
        performanceContainer
      );
      scene.render();
      viewModel.primitive = p;
      viewModel.primitiveReferenceFrame = true;
      expect(scene.primitives.length).toEqual(2);

      viewModel.primitiveReferenceFrame = false;
      scene.render();
      expect(scene.primitives.length).toEqual(1);
    });

    it("show wireframe", function () {
      const viewModel = new CesiumInspectorViewModel(
        scene,
        performanceContainer
      );
      viewModel.wireframe = true;
      expect(viewModel.scene.globe._surface.tileProvider._debug.wireframe).toBe(
        true
      );

      viewModel.wireframe = false;
      expect(viewModel.scene.globe._surface.tileProvider._debug.wireframe).toBe(
        false
      );
    });

    it("suspend updates", function () {
      const viewModel = new CesiumInspectorViewModel(
        scene,
        performanceContainer
      );
      viewModel.suspendUpdates = true;
      expect(viewModel.scene.globe._surface._debug.suspendLodUpdate).toBe(true);

      viewModel.suspendUpdates = false;
      expect(viewModel.scene.globe._surface._debug.suspendLodUpdate).toBe(
        false
      );
    });

    it("show tile coords", function () {
      const viewModel = new CesiumInspectorViewModel(
        scene,
        performanceContainer
      );
      expect(viewModel.scene.imageryLayers.length).toBe(0);

      viewModel.tileCoordinates = true;
      expect(viewModel.scene.imageryLayers.length).toBe(1);

      viewModel.tileCoordinates = false;
      expect(viewModel.scene.imageryLayers.length).toBe(0);
    });

    it("show tile bounding sphere", function () {
      const viewModel = new CesiumInspectorViewModel(
        scene,
        performanceContainer
      );
      const tile = new QuadtreeTile({
        tilingScheme: new WebMercatorTilingScheme(),
        x: 0,
        y: 0,
        level: 0,
      });
      tile.data = new GlobeSurfaceTile();
      viewModel.tile = tile;

      viewModel.tileBoundingSphere = true;
      expect(
        viewModel.scene.globe._surface.tileProvider._debug.boundingSphereTile
      ).toBe(tile);

      viewModel.tileBoundingSphere = false;
      expect(
        viewModel.scene.globe._surface.tileProvider._debug.boundingSphereTile
      ).toBe(undefined);
    });

    it("filter tile", function () {
      const viewModel = new CesiumInspectorViewModel(
        scene,
        performanceContainer
      );
      const tile = new QuadtreeTile({
        tilingScheme: new WebMercatorTilingScheme(),
        x: 0,
        y: 0,
        level: 0,
      });
      tile.data = new GlobeSurfaceTile();
      tile.renderable = true;
      viewModel.tile = tile;

      viewModel.filterTile = true;
      expect(viewModel.scene.globe._surface._tilesToRender[0]).toBe(tile);
      expect(viewModel.suspendUpdates).toBe(true);

      viewModel.filterTile = false;
      expect(viewModel.suspendUpdates).toBe(false);
    });

    it("does not try to render a non-renderable tile", function () {
      const viewModel = new CesiumInspectorViewModel(
        scene,
        performanceContainer
      );
      const tile = new QuadtreeTile({
        tilingScheme: new WebMercatorTilingScheme(),
        x: 0,
        y: 0,
        level: 0,
      });
      tile.data = new GlobeSurfaceTile();
      viewModel.tile = tile;

      viewModel.filterTile = true;
      expect(viewModel.scene.globe._surface._tilesToRender.length).toBe(0);
      expect(viewModel.suspendUpdates).toBe(true);

      viewModel.filterTile = false;
      expect(viewModel.suspendUpdates).toBe(false);
    });
  },
  "WebGL"
);
