import {
  Cartesian3,
  Cesium3DTileset,
  Cesium3DTileStyle,
  ClassificationType,
  Color,
  ColorGeometryInstanceAttribute,
  destroyObject,
  Ellipsoid,
  GeometryInstance,
  MetadataClass,
  Math as CesiumMath,
  GroupMetadata,
  Pass,
  PerInstanceColorAppearance,
  Primitive,
  Rectangle,
  RectangleGeometry,
  RenderState,
  StencilConstants,
} from "../../Source/Cesium.js";
import Cesium3DTilesTester from "../Cesium3DTilesTester.js";
import createScene from "../createScene.js";

describe(
  "Scene/Vector3DTileContent",
  function () {
    const tilesetRectangle = Rectangle.fromDegrees(-0.01, -0.01, 0.01, 0.01);
    const combinedRectangle = Rectangle.fromDegrees(-0.02, -0.01, 0.02, 0.01);

    const vectorPoints =
      "./Data/Cesium3DTiles/Vector/VectorTilePoints/tileset.json";
    const vectorPointsBatchedChildren =
      "./Data/Cesium3DTiles/Vector/VectorTilePointsBatchedChildren/tileset.json";
    const vectorPointsBatchedChildrenWithBatchTable =
      "./Data/Cesium3DTiles/Vector/VectorTilePointsBatchedChildrenWithBatchTable/tileset.json";
    const vectorPointsWithBatchTable =
      "./Data/Cesium3DTiles/Vector/VectorTilePointsWithBatchTable/tileset.json";
    const vectorPointsWithBatchIds =
      "./Data/Cesium3DTiles/Vector/VectorTilePointsWithBatchIds/tileset.json";

    const vectorPolygons =
      "./Data/Cesium3DTiles/Vector/VectorTilePolygons/tileset.json";
    const vectorPolygonsBatchedChildren =
      "./Data/Cesium3DTiles/Vector/VectorTilePolygonsBatchedChildren/tileset.json";
    const vectorPolygonsBatchedChildrenWithBatchTable =
      "./Data/Cesium3DTiles/Vector/VectorTilePolygonsBatchedChildrenWithBatchTable/tileset.json";
    const vectorPolygonsWithBatchTable =
      "./Data/Cesium3DTiles/Vector/VectorTilePolygonsWithBatchTable/tileset.json";
    const vectorPolygonsWithBatchIds =
      "./Data/Cesium3DTiles/Vector/VectorTilePolygonsWithBatchIds/tileset.json";

    const vectorPolylines =
      "./Data/Cesium3DTiles/Vector/VectorTilePolylines/tileset.json";
    const vectorPolylinesBatchedChildren =
      "./Data/Cesium3DTiles/Vector/VectorTilePolylinesBatchedChildren/tileset.json";
    const vectorPolylinesBatchedChildrenWithBatchTable =
      "./Data/Cesium3DTiles/Vector/VectorTilePolylinesBatchedChildrenWithBatchTable/tileset.json";
    const vectorPolylinesWithBatchTable =
      "./Data/Cesium3DTiles/Vector/VectorTilePolylinesWithBatchTable/tileset.json";
    const vectorPolylinesWithBatchIds =
      "./Data/Cesium3DTiles/Vector/VectorTilePolylinesWithBatchIds/tileset.json";

    const vectorCombined =
      "./Data/Cesium3DTiles/Vector/VectorTileCombined/tileset.json";
    const vectorCombinedWithBatchIds =
      "./Data/Cesium3DTiles/Vector/VectorTileCombinedWithBatchIds/tileset.json";

    let scene;
    let rectangle;
    let tileset;
    let globePrimitive;
    let tilesetPrimitive;
    let reusableGlobePrimitive;
    let reusableTilesetPrimitive;
    let depthColor;

    const ellipsoid = Ellipsoid.WGS84;

    function createPrimitive(rectangle, pass) {
      let renderState;
      if (pass === Pass.CESIUM_3D_TILE) {
        renderState = RenderState.fromCache({
          stencilTest: StencilConstants.setCesium3DTileBit(),
          stencilMask: StencilConstants.CESIUM_3D_TILE_MASK,
          depthTest: {
            enabled: true,
          },
        });
      }
      const depthColorAttribute = ColorGeometryInstanceAttribute.fromColor(
        new Color(1.0, 0.0, 0.0, 1.0)
      );
      depthColor = depthColorAttribute.value;
      return new Primitive({
        geometryInstances: new GeometryInstance({
          geometry: new RectangleGeometry({
            ellipsoid: Ellipsoid.WGS84,
            rectangle: rectangle,
          }),
          id: "depth rectangle",
          attributes: {
            color: depthColorAttribute,
          },
        }),
        appearance: new PerInstanceColorAppearance({
          translucent: false,
          flat: true,
          renderState: renderState,
        }),
        asynchronous: false,
      });
    }

    function MockPrimitive(primitive, pass) {
      this._primitive = primitive;
      this._pass = pass;
      this.show = true;
    }

    MockPrimitive.prototype.update = function (frameState) {
      if (!this.show) {
        return;
      }

      const commandList = frameState.commandList;
      const startLength = commandList.length;
      this._primitive.update(frameState);

      for (let i = startLength; i < commandList.length; ++i) {
        const command = commandList[i];
        command.pass = this._pass;
      }
    };

    MockPrimitive.prototype.isDestroyed = function () {
      return false;
    };

    MockPrimitive.prototype.destroy = function () {
      return destroyObject(this);
    };

    beforeAll(function () {
      scene = createScene();

      rectangle = Rectangle.fromDegrees(-40.0, -40.0, 40.0, 40.0);
      reusableGlobePrimitive = createPrimitive(rectangle, Pass.GLOBE);
      reusableTilesetPrimitive = createPrimitive(
        rectangle,
        Pass.CESIUM_3D_TILE
      );
    });

    afterAll(function () {
      reusableGlobePrimitive.destroy();
      reusableTilesetPrimitive.destroy();
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      // wrap rectangle primitive so it gets executed during the globe pass and 3D Tiles pass to lay down depth
      globePrimitive = new MockPrimitive(reusableGlobePrimitive, Pass.GLOBE);
      tilesetPrimitive = new MockPrimitive(
        reusableTilesetPrimitive,
        Pass.CESIUM_3D_TILE
      );
      scene.camera.lookAt(
        ellipsoid.cartographicToCartesian(Rectangle.center(tilesetRectangle)),
        new Cartesian3(0.0, 0.0, 0.01)
      );
    });

    afterEach(function () {
      scene.primitives.removeAll();
      globePrimitive =
        globePrimitive &&
        !globePrimitive.isDestroyed() &&
        globePrimitive.destroy();
      tilesetPrimitive =
        tilesetPrimitive &&
        !tilesetPrimitive.isDestroyed() &&
        tilesetPrimitive.destroy();
      tileset = tileset && !tileset.isDestroyed() && tileset.destroy();
    });

    function expectPick(scene) {
      expect(scene).toPickAndCall(function (result) {
        expect(result).toBeDefined();

        result.color = Color.clone(Color.YELLOW, result.color);

        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba[0]).toBeGreaterThan(0);
          expect(rgba[1]).toBeGreaterThan(0);
          expect(rgba[2]).toEqual(0);
          expect(rgba[3]).toEqual(255);
        });

        // Turn show off and on
        result.show = false;
        expect(scene).toRender([255, 0, 0, 255]);
        result.show = true;
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba[0]).toBeGreaterThan(0);
          expect(rgba[1]).toBeGreaterThan(0);
          expect(rgba[2]).toEqual(0);
          expect(rgba[3]).toEqual(255);
        });
      });
    }

    function verifyPick(scene) {
      const center = Rectangle.center(tilesetRectangle);
      const ulRect = new Rectangle(
        tilesetRectangle.west,
        center.latitude,
        center.longitude,
        tilesetRectangle.north
      );
      const urRect = new Rectangle(
        center.longitude,
        center.longitude,
        tilesetRectangle.east,
        tilesetRectangle.north
      );
      const llRect = new Rectangle(
        tilesetRectangle.west,
        tilesetRectangle.south,
        center.longitude,
        center.latitude
      );
      const lrRect = new Rectangle(
        center.longitude,
        tilesetRectangle.south,
        tilesetRectangle.east,
        center.latitude
      );

      scene.camera.lookAt(
        ellipsoid.cartographicToCartesian(Rectangle.center(ulRect)),
        new Cartesian3(0.0, 0.0, 5.0)
      );
      expectPick(scene);
      scene.camera.lookAt(
        ellipsoid.cartographicToCartesian(Rectangle.center(urRect)),
        new Cartesian3(0.0, 0.0, 5.0)
      );
      expectPick(scene);
      scene.camera.lookAt(
        ellipsoid.cartographicToCartesian(Rectangle.center(llRect)),
        new Cartesian3(0.0, 0.0, 5.0)
      );
      expectPick(scene);
      scene.camera.lookAt(
        ellipsoid.cartographicToCartesian(Rectangle.center(lrRect)),
        new Cartesian3(0.0, 0.0, 5.0)
      );
      expectPick(scene);
    }

    function expectRender(scene, color) {
      const center = Rectangle.center(tilesetRectangle);
      const ulRect = new Rectangle(
        tilesetRectangle.west,
        center.latitude,
        center.longitude,
        tilesetRectangle.north
      );
      const urRect = new Rectangle(
        center.longitude,
        center.longitude,
        tilesetRectangle.east,
        tilesetRectangle.north
      );
      const llRect = new Rectangle(
        tilesetRectangle.west,
        tilesetRectangle.south,
        center.longitude,
        center.latitude
      );
      const lrRect = new Rectangle(
        center.longitude,
        tilesetRectangle.south,
        tilesetRectangle.east,
        center.latitude
      );

      scene.camera.lookAt(
        ellipsoid.cartographicToCartesian(Rectangle.center(ulRect)),
        new Cartesian3(0.0, 0.0, 5.0)
      );
      expect(scene).toRender(color);
      scene.camera.lookAt(
        ellipsoid.cartographicToCartesian(Rectangle.center(urRect)),
        new Cartesian3(0.0, 0.0, 5.0)
      );
      expect(scene).toRender(color);
      scene.camera.lookAt(
        ellipsoid.cartographicToCartesian(Rectangle.center(llRect)),
        new Cartesian3(0.0, 0.0, 5.0)
      );
      expect(scene).toRender(color);
      scene.camera.lookAt(
        ellipsoid.cartographicToCartesian(Rectangle.center(lrRect)),
        new Cartesian3(0.0, 0.0, 5.0)
      );
      expect(scene).toRender(color);
    }

    function verifyRender(tileset, scene) {
      tileset.style = undefined;
      expectRender(scene, [255, 255, 255, 255]);

      tileset.style = new Cesium3DTileStyle({
        show: "false",
      });
      expectRender(scene, [255, 0, 0, 255]);
      tileset.style = new Cesium3DTileStyle({
        show: "true",
      });
      expectRender(scene, [255, 255, 255, 255]);

      tileset.style = new Cesium3DTileStyle({
        color: "rgba(0, 0, 255, 1.0)",
      });
      expectRender(scene, [0, 0, 255, 255]);
    }

    function expectPickPoints(scene) {
      expect(scene).toPickAndCall(function (result) {
        expect(result).toBeDefined();

        result.color = Color.clone(Color.YELLOW, result.color);

        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba[0]).toBeGreaterThan(0);
          expect(rgba[1]).toBeGreaterThan(0);
          expect(rgba[2]).toEqual(0);
          expect(rgba[3]).toEqual(255);
        });

        // Turn show off and on
        result.show = false;
        expect(scene).toRender([0, 0, 0, 255]);
        result.show = true;
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba[0]).toBeGreaterThan(0);
          expect(rgba[1]).toBeGreaterThan(0);
          expect(rgba[2]).toEqual(0);
          expect(rgba[3]).toEqual(255);
        });
      });
    }

    function verifyPickPoints(scene) {
      const center = Rectangle.center(tilesetRectangle);
      const ulRect = new Rectangle(
        tilesetRectangle.west,
        center.latitude,
        center.longitude,
        tilesetRectangle.north
      );
      const urRect = new Rectangle(
        center.longitude,
        center.longitude,
        tilesetRectangle.east,
        tilesetRectangle.north
      );
      const llRect = new Rectangle(
        tilesetRectangle.west,
        tilesetRectangle.south,
        center.longitude,
        center.latitude
      );
      const lrRect = new Rectangle(
        center.longitude,
        tilesetRectangle.south,
        tilesetRectangle.east,
        center.latitude
      );

      scene.camera.lookAt(
        ellipsoid.cartographicToCartesian(Rectangle.center(ulRect)),
        new Cartesian3(0.0, 0.0, 5.0)
      );
      expectPickPoints(scene);
      scene.camera.lookAt(
        ellipsoid.cartographicToCartesian(Rectangle.center(urRect)),
        new Cartesian3(0.0, 0.0, 5.0)
      );
      expectPickPoints(scene);
      scene.camera.lookAt(
        ellipsoid.cartographicToCartesian(Rectangle.center(llRect)),
        new Cartesian3(0.0, 0.0, 5.0)
      );
      expectPickPoints(scene);
      scene.camera.lookAt(
        ellipsoid.cartographicToCartesian(Rectangle.center(lrRect)),
        new Cartesian3(0.0, 0.0, 5.0)
      );
      expectPickPoints(scene);
    }

    function expectRenderPoints(scene, callback) {
      const center = Rectangle.center(tilesetRectangle);
      const ulRect = new Rectangle(
        tilesetRectangle.west,
        center.latitude,
        center.longitude,
        tilesetRectangle.north
      );
      const urRect = new Rectangle(
        center.longitude,
        center.longitude,
        tilesetRectangle.east,
        tilesetRectangle.north
      );
      const llRect = new Rectangle(
        tilesetRectangle.west,
        tilesetRectangle.south,
        center.longitude,
        center.latitude
      );
      const lrRect = new Rectangle(
        center.longitude,
        tilesetRectangle.south,
        tilesetRectangle.east,
        center.latitude
      );

      scene.camera.lookAt(
        ellipsoid.cartographicToCartesian(Rectangle.center(ulRect)),
        new Cartesian3(0.0, 0.0, 5.0)
      );
      expect(scene).toRenderAndCall(callback);
      scene.camera.lookAt(
        ellipsoid.cartographicToCartesian(Rectangle.center(urRect)),
        new Cartesian3(0.0, 0.0, 5.0)
      );
      expect(scene).toRenderAndCall(callback);
      scene.camera.lookAt(
        ellipsoid.cartographicToCartesian(Rectangle.center(llRect)),
        new Cartesian3(0.0, 0.0, 5.0)
      );
      expect(scene).toRenderAndCall(callback);
      scene.camera.lookAt(
        ellipsoid.cartographicToCartesian(Rectangle.center(lrRect)),
        new Cartesian3(0.0, 0.0, 5.0)
      );
      expect(scene).toRenderAndCall(callback);
    }

    function verifyRenderPoints(tileset, scene) {
      tileset.style = undefined;
      expectRenderPoints(scene, function (rgba) {
        expect(rgba[0]).toBeGreaterThan(0);
        expect(rgba[1]).toBeGreaterThan(0);
        expect(rgba[2]).toBeGreaterThan(0);
        expect(rgba[3]).toEqual(255);
      });

      tileset.style = new Cesium3DTileStyle({
        show: "false",
      });
      expectRender(scene, [0, 0, 0, 255]);
      tileset.style = new Cesium3DTileStyle({
        show: "true",
      });
      expectRenderPoints(scene, function (rgba) {
        expect(rgba[0]).toBeGreaterThan(0);
        expect(rgba[1]).toBeGreaterThan(0);
        expect(rgba[2]).toBeGreaterThan(0);
        expect(rgba[3]).toEqual(255);
      });

      tileset.style = new Cesium3DTileStyle({
        color: "rgba(0, 0, 255, 1.0)",
      });
      expectRenderPoints(scene, function (rgba) {
        expect(rgba[0]).toEqual(0);
        expect(rgba[1]).toEqual(0);
        expect(rgba[2]).toBeGreaterThan(0);
        expect(rgba[3]).toEqual(255);
      });
    }

    function expectRenderPolylines(scene, color) {
      const center = Rectangle.center(tilesetRectangle);
      const ulRect = new Rectangle(
        tilesetRectangle.west,
        center.latitude,
        center.longitude,
        tilesetRectangle.north
      );
      const urRect = new Rectangle(
        center.longitude,
        center.longitude,
        tilesetRectangle.east,
        tilesetRectangle.north
      );
      const llRect = new Rectangle(
        tilesetRectangle.west,
        tilesetRectangle.south,
        center.longitude,
        center.latitude
      );
      const lrRect = new Rectangle(
        center.longitude,
        tilesetRectangle.south,
        tilesetRectangle.east,
        center.latitude
      );

      scene.camera.lookAt(
        ellipsoid.cartographicToCartesian(Rectangle.northwest(ulRect)),
        new Cartesian3(0.0, 0.0, 5.0)
      );
      expect(scene).toRender(color);
      scene.camera.lookAt(
        ellipsoid.cartographicToCartesian(Rectangle.northeast(urRect)),
        new Cartesian3(0.0, 0.0, 5.0)
      );
      expect(scene).toRender(color);
      scene.camera.lookAt(
        ellipsoid.cartographicToCartesian(Rectangle.southwest(llRect)),
        new Cartesian3(0.0, 0.0, 5.0)
      );
      expect(scene).toRender(color);
      scene.camera.lookAt(
        ellipsoid.cartographicToCartesian(Rectangle.southeast(lrRect)),
        new Cartesian3(0.0, 0.0, 5.0)
      );
      expect(scene).toRender(color);
    }

    function verifyRenderPolylines(tileset, scene) {
      tileset.style = undefined;
      expectRenderPolylines(scene, [255, 255, 255, 255]);

      tileset.style = new Cesium3DTileStyle({
        show: "false",
      });
      expectRenderPolylines(scene, [0, 0, 0, 255]);
      tileset.style = new Cesium3DTileStyle({
        show: "true",
      });
      expectRenderPolylines(scene, [255, 255, 255, 255]);

      tileset.style = new Cesium3DTileStyle({
        color: "rgba(0, 0, 255, 1.0)",
      });
      expectRenderPolylines(scene, [0, 0, 255, 255]);
    }

    function expectRenderCombined(scene, color) {
      const width = combinedRectangle.width;
      const step = width / 3;

      const west = combinedRectangle.west;
      const north = combinedRectangle.north;
      const south = combinedRectangle.south;

      const polygonRect = new Rectangle(west, south, west + step, north);
      const polylineRect = new Rectangle(
        west + step,
        south,
        west + step * 2,
        north
      );
      const pointRect = new Rectangle(
        west + step * 2,
        south,
        west + step * 3,
        north
      );

      scene.camera.lookAt(
        ellipsoid.cartographicToCartesian(Rectangle.center(polygonRect)),
        new Cartesian3(0.0, 0.0, 5.0)
      );
      expect(scene).toRender(color);
      scene.camera.lookAt(
        ellipsoid.cartographicToCartesian(Rectangle.northeast(polylineRect)),
        new Cartesian3(0.0, 0.0, 5.0)
      );
      expect(scene).toRenderAndCall(function (rgba) {
        for (let i = 0; i < color.length; ++i) {
          if (color[i] === 0) {
            expect(rgba[i]).toEqual(0);
          } else {
            expect(rgba[i]).toBeGreaterThan(0);
          }
        }
      });
      scene.camera.lookAt(
        ellipsoid.cartographicToCartesian(Rectangle.center(pointRect)),
        new Cartesian3(0.0, 0.0, 5.0)
      );
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba).not.toEqual([0, 0, 0, 255]);
        if (
          !(
            color[0] === 255 &&
            color[1] === 0 &&
            color[2] === 0 &&
            color[3] === 255
          )
        ) {
          expect(rgba).not.toEqual([255, 0, 0, 255]);
        }
      });
    }

    function verifyRenderCombined(tileset, scene) {
      tileset.style = undefined;
      expectRenderCombined(scene, [255, 255, 255, 255]);

      tileset.style = new Cesium3DTileStyle({
        show: "false",
      });
      expectRenderCombined(scene, [255, 0, 0, 255]);
      tileset.style = new Cesium3DTileStyle({
        show: "true",
      });
      expectRenderCombined(scene, [255, 255, 255, 255]);

      tileset.style = new Cesium3DTileStyle({
        color: "rgba(0, 0, 255, 1.0)",
      });
      expectRenderCombined(scene, [0, 0, 255, 255]);
    }

    it("renders points", function () {
      return Cesium3DTilesTester.loadTileset(scene, vectorPoints).then(
        function (tileset) {
          verifyRenderPoints(tileset, scene);
          verifyPickPoints(scene);
        }
      );
    });

    it("renders batched points", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorPointsBatchedChildren
      ).then(function (tileset) {
        verifyRenderPoints(tileset, scene);
        verifyPickPoints(scene);
      });
    });

    it("renders points with a batch table", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorPointsWithBatchTable
      ).then(function (tileset) {
        verifyRenderPoints(tileset, scene);
        verifyPickPoints(scene);
      });
    });

    it("renders batched points with a batch table", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorPointsBatchedChildrenWithBatchTable
      ).then(function (tileset) {
        verifyRenderPoints(tileset, scene);
        verifyPickPoints(scene);
      });
    });

    it("renders points with batch ids", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorPointsWithBatchIds
      ).then(function (tileset) {
        verifyRenderPoints(tileset, scene);
        verifyPickPoints(scene);
      });
    });

    it("renders polygons", function () {
      scene.primitives.add(globePrimitive);
      return Cesium3DTilesTester.loadTileset(scene, vectorPolygons).then(
        function (tileset) {
          verifyRender(tileset, scene);
          verifyPick(scene);
        }
      );
    });

    it("renders batched polygons", function () {
      scene.primitives.add(globePrimitive);
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorPolygonsBatchedChildren
      ).then(function (tileset) {
        verifyRender(tileset, scene);
        verifyPick(scene);
      });
    });

    it("renders polygons with a batch table", function () {
      scene.primitives.add(globePrimitive);
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorPolygonsWithBatchTable
      ).then(function (tileset) {
        verifyRender(tileset, scene);
        verifyPick(scene);
      });
    });

    it("renders batched polygons with a batch table", function () {
      scene.primitives.add(globePrimitive);
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorPolygonsBatchedChildrenWithBatchTable
      ).then(function (tileset) {
        verifyRender(tileset, scene);
        verifyPick(scene);
      });
    });

    it("renders polygons with batch ids", function () {
      scene.primitives.add(globePrimitive);
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorPolygonsWithBatchIds
      ).then(function (tileset) {
        verifyRender(tileset, scene);
        verifyPick(scene);
      });
    });

    it("renders polylines", function () {
      return Cesium3DTilesTester.loadTileset(scene, vectorPolylines).then(
        function (tileset) {
          verifyRenderPolylines(tileset, scene);
        }
      );
    });

    it("renders batched polylines", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorPolylinesBatchedChildren
      ).then(function (tileset) {
        verifyRenderPolylines(tileset, scene);
      });
    });

    it("renders polylines with a batch table", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorPolylinesWithBatchTable
      ).then(function (tileset) {
        verifyRenderPolylines(tileset, scene);
      });
    });

    it("renders batched polylines with a batch table", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorPolylinesBatchedChildrenWithBatchTable
      ).then(function (tileset) {
        verifyRenderPolylines(tileset, scene);
      });
    });

    it("renders polylines with batch ids", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorPolylinesWithBatchIds
      ).then(function (tileset) {
        verifyRenderPolylines(tileset, scene);
      });
    });

    it("renders combined tile", function () {
      scene.primitives.add(globePrimitive);
      return Cesium3DTilesTester.loadTileset(scene, vectorCombined).then(
        function (tileset) {
          verifyRenderCombined(tileset, scene);
        }
      );
    });

    it("renders combined tile with batch ids", function () {
      scene.primitives.add(globePrimitive);
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorCombinedWithBatchIds
      ).then(function (tileset) {
        verifyRenderCombined(tileset, scene);
      });
    });

    it("renders with debug color", function () {
      scene.primitives.add(globePrimitive);
      return Cesium3DTilesTester.loadTileset(scene, vectorCombined, {
        debugColorizeTiles: true,
      }).then(function () {
        const width = combinedRectangle.width;
        const step = width / 3;

        const west = combinedRectangle.west;
        const north = combinedRectangle.north;
        const south = combinedRectangle.south;
        const rect = new Rectangle(west, south, west + step, north);

        scene.camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(rect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual([255, 255, 255, 255]);
          expect(rgba).not.toEqual([255, 0, 0, 255]);
        });
      });
    });

    it("renders on 3D Tiles", function () {
      scene.primitives.add(globePrimitive);
      scene.primitives.add(tilesetPrimitive);
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorPolygonsBatchedChildren,
        {
          classificationType: ClassificationType.CESIUM_3D_TILE,
        }
      ).then(function (tileset) {
        globePrimitive.show = false;
        tilesetPrimitive.show = true;
        verifyRender(tileset, scene);
        verifyPick(scene);
        globePrimitive.show = true;
        tilesetPrimitive.show = false;
        expectRender(scene, depthColor);
        globePrimitive.show = true;
        tilesetPrimitive.show = true;
      });
    });

    it("renders on globe", function () {
      scene.primitives.add(globePrimitive);
      scene.primitives.add(tilesetPrimitive);
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorPolygonsBatchedChildren,
        {
          classificationType: ClassificationType.TERRAIN,
        }
      ).then(function (tileset) {
        globePrimitive.show = false;
        tilesetPrimitive.show = true;
        expectRender(scene, depthColor);
        globePrimitive.show = true;
        tilesetPrimitive.show = false;
        verifyRender(tileset, scene);
        verifyPick(scene);
        globePrimitive.show = true;
        tilesetPrimitive.show = true;
      });
    });

    it("renders on 3D Tiles and globe", function () {
      scene.primitives.add(globePrimitive);
      scene.primitives.add(tilesetPrimitive);
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorPolygonsBatchedChildren,
        {
          classificationType: ClassificationType.BOTH,
        }
      ).then(function (tileset) {
        globePrimitive.show = false;
        tilesetPrimitive.show = true;
        verifyRender(tileset, scene);
        verifyPick(scene);
        globePrimitive.show = true;
        tilesetPrimitive.show = false;
        verifyRender(tileset, scene);
        verifyPick(scene);
        globePrimitive.show = true;
        tilesetPrimitive.show = true;
      });
    });

    it("can get features and properties", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorPolygonsWithBatchTable
      ).then(function (tileset) {
        const content = tileset.root.content;
        expect(content.featuresLength).toBe(1);
        expect(content.innerContents).toBeUndefined();
        expect(content.hasProperty(0, "name")).toBe(true);
        expect(content.getFeature(0)).toBeDefined();
      });
    });

    it("gets polyline positions", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorPolylinesWithBatchIds,
        {
          vectorKeepDecodedPositions: true,
        }
      ).then(function (tileset) {
        const content = tileset.root.content;
        const polylinePositions = content.getPolylinePositions(0);
        expect(polylinePositions.length).toBe(60);
        expect(polylinePositions[0]).toEqualEpsilon(
          6378136.806372941,
          CesiumMath.EPSILON7
        );
        expect(polylinePositions[1]).toEqualEpsilon(
          -1113.194885441724,
          CesiumMath.EPSILON7
        );
        expect(polylinePositions[2]).toEqualEpsilon(
          1105.675261474196,
          CesiumMath.EPSILON7
        );
      });
    });

    it("gets polyline positions for individual polylines in a batch", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorPolylinesBatchedChildren,
        {
          vectorKeepDecodedPositions: true,
        }
      ).then(function (tileset) {
        const content = tileset.root.children[0].content;
        expect(content.getPolylinePositions(0).length).toBe(60);
        expect(content.getPolylinePositions(1).length).toBe(60);
        expect(content.getPolylinePositions(2).length).toBe(60);
        expect(content.getPolylinePositions(3).length).toBe(60);
      });
    });

    it("gets polyline positions for clamped polylines", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorPolylinesWithBatchIds,
        {
          vectorKeepDecodedPositions: true,
          classificationType: ClassificationType.TERRAIN,
        }
      ).then(function (tileset) {
        const content = tileset.root.content;
        const polylinePositions = content.getPolylinePositions(0);
        expect(polylinePositions.length).toBe(54); // duplicate positions are removed
        expect(polylinePositions[0]).toEqualEpsilon(
          6378136.806372941,
          CesiumMath.EPSILON7
        );
        expect(polylinePositions[1]).toEqualEpsilon(
          -1113.194885441724,
          CesiumMath.EPSILON7
        );
        expect(polylinePositions[2]).toEqualEpsilon(
          1105.675261474196,
          CesiumMath.EPSILON7
        );
      });
    });

    it("getPolylinePositions returns undefined if there are no positions associated with the given batchId", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorPolylinesWithBatchIds,
        {
          vectorKeepDecodedPositions: true,
        }
      ).then(function (tileset) {
        const content = tileset.root.content;
        const polylinePositions = content.getPolylinePositions(1);
        expect(polylinePositions).toBeUndefined();
      });
    });

    it("getPolylinePositions returns undefined if there are no polylines", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorPolygonsWithBatchIds,
        {
          vectorKeepDecodedPositions: true,
        }
      ).then(function (tileset) {
        const content = tileset.root.content;
        const polylinePositions = content.getPolylinePositions(0);
        expect(polylinePositions).toBeUndefined();
      });
    });

    it("getPolylinePositions returns undefined if tileset.vectorKeepDecodedPositions is false", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorPolylinesWithBatchIds,
        {
          vectorKeepDecodedPositions: false,
        }
      ).then(function (tileset) {
        const content = tileset.root.content;
        const polylinePositions = content.getPolylinePositions(0);
        expect(polylinePositions).toBeUndefined();
      });
    });

    it("throws when calling getFeature with invalid index", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorPolygonsWithBatchTable
      ).then(function (tileset) {
        const content = tileset.root.content;
        expect(function () {
          content.getFeature(-1);
        }).toThrowDeveloperError();
        expect(function () {
          content.getFeature(1000);
        }).toThrowDeveloperError();
        expect(function () {
          content.getFeature();
        }).toThrowDeveloperError();
      });
    });

    it("throws with invalid version", function () {
      const arrayBuffer = Cesium3DTilesTester.generateVectorTileBuffer({
        version: 2,
      });
      Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, "vctr");
    });

    it("throws with empty feature table", function () {
      const arrayBuffer = Cesium3DTilesTester.generateVectorTileBuffer({
        defineFeatureTable: false,
      });
      Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, "vctr");
    });

    it("throws without region", function () {
      const arrayBuffer = Cesium3DTilesTester.generateVectorTileBuffer({
        defineRegion: false,
        polygonsLength: 1,
      });
      Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, "vctr");
    });

    it("throws without all batch ids", function () {
      const arrayBuffer = Cesium3DTilesTester.generateVectorTileBuffer({
        polygonsLength: 1,
        pointsLength: 1,
        polylinesLength: 1,
        polygonBatchIds: [1],
        pointBatchIds: [0],
      });
      Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, "vctr");
    });

    it("destroys", function () {
      const tileset = new Cesium3DTileset({
        url: vectorCombined,
      });
      expect(tileset.isDestroyed()).toEqual(false);
      tileset.destroy();
      expect(tileset.isDestroyed()).toEqual(true);
    });

    describe("3DTILES_metadata", function () {
      const metadataClass = new MetadataClass({
        id: "test",
        class: {
          properties: {
            name: {
              componentType: "STRING",
            },
            height: {
              componentType: "FLOAT32",
            },
          },
        },
      });
      const groupMetadata = new GroupMetadata({
        id: "testGroup",
        group: {
          properties: {
            name: "Test Group",
            height: 35.6,
          },
        },
        class: metadataClass,
      });

      it("assigns groupMetadata", function () {
        return Cesium3DTilesTester.loadTileset(scene, vectorPoints).then(
          function (tileset) {
            const content = tileset.root.content;
            content.groupMetadata = groupMetadata;
            expect(content.groupMetadata).toBe(groupMetadata);
          }
        );
      });
    });
  },
  "WebGL"
);
