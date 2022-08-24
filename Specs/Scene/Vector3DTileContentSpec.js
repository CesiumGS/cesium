import createScene from "../createScene.js";
import Cesium3DTilesTester from "../Cesium3DTilesTester.js";
import {
  Cartesian3,
  Cesium3DTileFeature,
  Cesium3DTilePointFeature,
  Cesium3DTileset,
  ClassificationType,
  Color,
  ColorGeometryInstanceAttribute,
  destroyObject,
  Ellipsoid,
  GeometryInstance,
  Math as CesiumMath,
  Pass,
  PerInstanceColorAppearance,
  Primitive,
  Rectangle,
  RectangleGeometry,
  RenderState,
  StencilConstants,
} from "../../Source/Cesium.js";

describe("Scene/Vector3DTileContent", () => {
  let scene;
  let camera;
  let ellipsoid;

  let globeMockPrimitive;
  let tilesetMockPrimitive;

  let globePrimitive;
  let tilesetPrimitive;

  let depthColor;
  const whitePixel = [255, 255, 255, 255];

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
          ellipsoid: ellipsoid,
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

  const tilesetRectangle = Rectangle.fromDegrees(-0.01, -0.01, 0.01, 0.01);

  const vectorTilePolygonsWithBatchTableTileset =
    "./Data/Cesium3DTiles/Vector/VectorTilePolygonsWithBatchTable/tileset.json";

  function subdivideRectangle(rectangle) {
    const center = Rectangle.center(rectangle);
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
    const lrRect = new Rectangle(
      center.longitude,
      tilesetRectangle.south,
      tilesetRectangle.east,
      center.latitude
    );
    const llRect = new Rectangle(
      tilesetRectangle.west,
      tilesetRectangle.south,
      center.longitude,
      center.latitude
    );
    return [ulRect, urRect, lrRect, llRect];
  }

  beforeAll(() => {
    scene = createScene();
    camera = scene.camera;
    ellipsoid = Ellipsoid.WGS84;

    const rectangle = Rectangle.fromDegrees(-40.0, -40.0, 40.0, 40.0);
    globePrimitive = createPrimitive(rectangle, Pass.GLOBE);
    tilesetPrimitive = createPrimitive(rectangle, Pass.CESIUM_3D_TILE);
  });

  afterAll(() => {
    tilesetPrimitive.destroy();
    globePrimitive.destroy();
    scene.destroyForSpecs();
  });

  beforeEach(() => {
    globeMockPrimitive = new MockPrimitive(globePrimitive, Pass.GLOBE);
    tilesetMockPrimitive = new MockPrimitive(
      tilesetPrimitive,
      Pass.CESIUM_3D_TILE
    );

    // Add the globe mock primitive to the scene.
    scene.primitives.add(globeMockPrimitive);
    scene.camera.lookAt(
      ellipsoid.cartographicToCartesian(Rectangle.center(tilesetRectangle)),
      new Cartesian3(0.0, 0.0, 0.01)
    );
  });

  afterEach(() => {
    scene.primitives.removeAll();
    globeMockPrimitive =
      globeMockPrimitive &&
      !globeMockPrimitive.isDestroyed() &&
      globeMockPrimitive.destroy();
    tilesetMockPrimitive =
      tilesetMockPrimitive &&
      !tilesetMockPrimitive.isDestroyed() &&
      tilesetMockPrimitive.destroy();
  });

  describe("points", () => {
    const vectorTilePointsTileset =
      "./Data/Cesium3DTiles/Vector/VectorTilePoints/tileset.json";
    const vectorTilePointsBatchedChildrenTileset =
      "./Data/Cesium3DTiles/Vector/VectorTilePointsBatchedChildren/tileset.json";
    const vectorTilePointsBatchedChildrenWithBatchTableTileset =
      "./Data/Cesium3DTiles/Vector/VectorTilePointsBatchedChildrenWithBatchTable/tileset.json";
    const vectorTilePointsWithBatchTableTileset =
      "./Data/Cesium3DTiles/Vector/VectorTilePointsWithBatchTable/tileset.json";
    const vectorTilePointsWithBatchIdsTileset =
      "./Data/Cesium3DTiles/Vector/VectorTilePointsWithBatchIds/tileset.json";

    it("renders points", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePointsTileset
      ).then((tileset) => {
        // Subdivide the rectangle into 4, and look at the center of each sub-rectangle.
        const [ulRect, urRect, lrRect, llRect] = subdivideRectangle(
          tilesetRectangle
        );
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(ulRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(urRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(lrRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(llRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
      });
    });

    it("picks points", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePointsTileset
      ).then((tileset) => {
        const [ulRect, urRect, lrRect, llRect] = subdivideRectangle(
          tilesetRectangle
        );
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(ulRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTilePointFeature);
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(urRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTilePointFeature);
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(lrRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTilePointFeature);
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(llRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTilePointFeature);
        });
      });
    });

    it("renders batched points with batch ids", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePointsWithBatchIdsTileset
      ).then((tileset) => {
        // Subdivide the rectangle into 4, and look at the center of each sub-rectangle.
        const [ulRect, urRect, lrRect, llRect] = subdivideRectangle(
          tilesetRectangle
        );
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(ulRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(urRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(lrRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(llRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
      });
    });

    it("picks batched points with batch ids", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePointsWithBatchIdsTileset
      ).then((tileset) => {
        // Subdivide the rectangle into 4, and look at the center of each sub-rectangle.
        const [ulRect, urRect, lrRect, llRect] = subdivideRectangle(
          tilesetRectangle
        );
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(ulRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTilePointFeature);
          expect(result._batchId).toEqual(0);
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(urRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTilePointFeature);
          expect(result._batchId).toEqual(1);
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(lrRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTilePointFeature);
          expect(result._batchId).toEqual(3);
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(llRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTilePointFeature);
          expect(result._batchId).toEqual(2);
        });
      });
    });

    it("renders batched points with batch table", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePointsWithBatchTableTileset
      ).then((tileset) => {
        // Subdivide the rectangle into 4, and look at the center of each sub-rectangle.
        const [ulRect, urRect, lrRect, llRect] = subdivideRectangle(
          tilesetRectangle
        );
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(ulRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(urRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(lrRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(llRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
      });
    });

    it("picks batched points with batch table", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePointsWithBatchTableTileset
      ).then((tileset) => {
        // Subdivide the rectangle into 4, and look at the center of each sub-rectangle.
        const [ulRect, urRect, lrRect, llRect] = subdivideRectangle(
          tilesetRectangle
        );
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(ulRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTilePointFeature);
          expect(result.getProperty("name")).toEqual("upper left");
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(urRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTilePointFeature);
          expect(result.getProperty("name")).toEqual("upper right");
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(lrRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTilePointFeature);
          expect(result.getProperty("name")).toEqual("lower right");
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(llRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTilePointFeature);
          expect(result.getProperty("name")).toEqual("lower left");
        });
      });
    });

    it("renders batched points with children", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePointsBatchedChildrenTileset
      ).then((tileset) => {
        // Subdivide the rectangle into 4, and look at the center of each sub-rectangle.
        const [ulRect, urRect, lrRect, llRect] = subdivideRectangle(
          tilesetRectangle
        );
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(ulRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(urRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(lrRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(llRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
      });
    });

    it("renders batched polygons with children with batch table", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePointsBatchedChildrenWithBatchTableTileset
      ).then((tileset) => {
        // Subdivide the rectangle into 4, and look at the center of each sub-rectangle.
        const [ulRect, urRect, lrRect, llRect] = subdivideRectangle(
          tilesetRectangle
        );
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(ulRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(urRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(lrRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(llRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
      });
    });
  });

  describe("polygons", () => {
    const vectorTilePolygonsTileset =
      "./Data/Cesium3DTiles/Vector/VectorTilePolygons/tileset.json";
    const vectorTilePolygonsWithBatchIdsTileset =
      "./Data/Cesium3DTiles/Vector/VectorTilePolygonsWithBatchIds/tileset.json";
    const vectorTilePolygonsBatchedChildrenTileset =
      "./Data/Cesium3DTiles/Vector/VectorTilePolygonsBatchedChildren/tileset.json";
    const vectorTilePolygonsBatchedChildrenWithBatchTable =
      "./Data/Cesium3DTiles/Vector/VectorTilePolygonsBatchedChildrenWithBatchTable/tileset.json";

    it("renders polygons", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePolygonsTileset
      ).then((tileset) => {
        // Subdivide the rectangle into 4, and look at the center of each sub-rectangle.
        const [ulRect, urRect, lrRect, llRect] = subdivideRectangle(
          tilesetRectangle
        );
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(ulRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(urRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(lrRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(llRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
      });
    });

    it("picks polygons", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePolygonsTileset
      ).then((tileset) => {
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(tilesetRectangle)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
        });
      });
    });

    it("renders polygons on 3D Tiles", () => {
      scene.primitives.add(tilesetMockPrimitive);
      return Cesium3DTilesTester.loadTileset(scene, vectorTilePolygonsTileset, {
        classificationType: ClassificationType.CESIUM_3D_TILE,
      }).then((tileset) => {
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(tilesetRectangle)),
          new Cartesian3(0.0, 0.0, 5.0)
        );

        globeMockPrimitive.show = false;
        tilesetMockPrimitive.show = true;
        expect(scene).toRender(whitePixel);

        globeMockPrimitive.show = true;
        tilesetMockPrimitive.show = false;
        expect(scene).toRender(depthColor);
      });
    });

    it("renders polygons on terrain", () => {
      scene.primitives.add(tilesetMockPrimitive);
      return Cesium3DTilesTester.loadTileset(scene, vectorTilePolygonsTileset, {
        classificationType: ClassificationType.TERRAIN,
      }).then((tileset) => {
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(tilesetRectangle)),
          new Cartesian3(0.0, 0.0, 5.0)
        );

        globeMockPrimitive.show = false;
        tilesetMockPrimitive.show = true;
        expect(scene).toRender(depthColor);

        globeMockPrimitive.show = true;
        tilesetMockPrimitive.show = false;
        expect(scene).toRender(whitePixel);
      });
    });

    it("renders polygons on 3D Tiles and terrain", () => {
      scene.primitives.add(tilesetMockPrimitive);
      return Cesium3DTilesTester.loadTileset(scene, vectorTilePolygonsTileset, {
        classificationType: ClassificationType.BOTH,
      }).then((tileset) => {
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(tilesetRectangle)),
          new Cartesian3(0.0, 0.0, 5.0)
        );

        globeMockPrimitive.show = false;
        tilesetMockPrimitive.show = true;
        expect(scene).toRender(whitePixel);

        globeMockPrimitive.show = true;
        tilesetMockPrimitive.show = false;
        expect(scene).toRender(whitePixel);
      });
    });

    it("renders batched polygons with batch ids", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePolygonsWithBatchIdsTileset
      ).then((tileset) => {
        // Subdivide the rectangle into 4, and look at the center of each sub-rectangle.
        const [ulRect, urRect, lrRect, llRect] = subdivideRectangle(
          tilesetRectangle
        );
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(ulRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(urRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(lrRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(llRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
      });
    });

    it("picks batched polygons with batch ids", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePolygonsWithBatchIdsTileset
      ).then((tileset) => {
        // Subdivide the rectangle into 4, and look at the center of each sub-rectangle.
        const [ulRect, urRect, lrRect, llRect] = subdivideRectangle(
          tilesetRectangle
        );
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(ulRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
          expect(result._batchId).toEqual(0);
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(urRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
          expect(result._batchId).toEqual(1);
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(lrRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
          expect(result._batchId).toEqual(3);
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(llRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
          expect(result._batchId).toEqual(2);
        });
      });
    });

    it("renders batched polygons with batch table", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePolygonsWithBatchTableTileset
      ).then((tileset) => {
        // Subdivide the rectangle into 4, and look at the center of each sub-rectangle.
        const [ulRect, urRect, lrRect, llRect] = subdivideRectangle(
          tilesetRectangle
        );
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(ulRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(urRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(lrRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(llRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
      });
    });

    it("picks batched polygons with batch table", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePolygonsWithBatchTableTileset
      ).then((tileset) => {
        // Subdivide the rectangle into 4, and look at the center of each sub-rectangle.
        const [ulRect, urRect, lrRect, llRect] = subdivideRectangle(
          tilesetRectangle
        );
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(ulRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
          expect(result.getProperty("name")).toEqual("upper left");
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(urRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
          expect(result.getProperty("name")).toEqual("upper right");
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(lrRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
          expect(result.getProperty("name")).toEqual("lower right");
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(llRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
          expect(result.getProperty("name")).toEqual("lower left");
        });
      });
    });

    it("renders batched polygons with children", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePolygonsBatchedChildrenTileset
      ).then((tileset) => {
        // Subdivide the rectangle into 4, and look at the center of each sub-rectangle.
        const [ulRect, urRect, lrRect, llRect] = subdivideRectangle(
          tilesetRectangle
        );
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(ulRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(urRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(lrRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(llRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
      });
    });

    it("renders batched polygons with children with batch table", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePolygonsBatchedChildrenWithBatchTable
      ).then((tileset) => {
        // Subdivide the rectangle into 4, and look at the center of each sub-rectangle.
        const [ulRect, urRect, lrRect, llRect] = subdivideRectangle(
          tilesetRectangle
        );
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(ulRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(urRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(lrRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(llRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
      });
    });
  });

  describe("polylines", () => {
    const vectorTilePolylinesTileset =
      "./Data/Cesium3DTiles/Vector/VectorTilePolylines/tileset.json";
    const vectorTilePolylinesBatchedChildrenTileset =
      "./Data/Cesium3DTiles/Vector/VectorTilePolylinesBatchedChildren/tileset.json";
    const vectorTilePolylinesBatchedChildrenWithBatchTableTileset =
      "./Data/Cesium3DTiles/Vector/VectorTilePolylinesBatchedChildrenWithBatchTable/tileset.json";
    const vectorTilePolylinesWithBatchTableTileset =
      "./Data/Cesium3DTiles/Vector/VectorTilePolylinesWithBatchTable/tileset.json";
    const vectorTilePolylinesWithBatchIdsTileset =
      "./Data/Cesium3DTiles/Vector/VectorTilePolylinesWithBatchIds/tileset.json";

    it("renders polylines", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePolylinesTileset
      ).then((tileset) => {
        const [ulRect, urRect, lrRect, llRect] = subdivideRectangle(
          tilesetRectangle
        );

        const nwCorner = ellipsoid.cartographicToCartesian(
          Rectangle.northwest(ulRect)
        );
        const neCorner = ellipsoid.cartographicToCartesian(
          Rectangle.northeast(urRect)
        );
        const seCorner = ellipsoid.cartographicToCartesian(
          Rectangle.southeast(lrRect)
        );
        const swCorner = ellipsoid.cartographicToCartesian(
          Rectangle.southwest(llRect)
        );

        camera.lookAt(nwCorner, new Cartesian3(0.0, 0.0, 5.0));
        expect(scene).toRenderAndCall((rgba) => {
          // Account for mitering at the corners.
          expect(rgba[0]).toBeCloseTo(255, -1);
          expect(rgba[1]).toBeCloseTo(255, -1);
          expect(rgba[2]).toBeCloseTo(255, -1);
          expect(rgba[3]).toEqual(255);
        });

        camera.lookAt(neCorner, new Cartesian3(0.0, 0.0, 5.0));
        expect(scene).toRenderAndCall((rgba) => {
          // Account for mitering at the corners.
          expect(rgba[0]).toBeCloseTo(255, -1);
          expect(rgba[1]).toBeCloseTo(255, -1);
          expect(rgba[2]).toBeCloseTo(255, -1);
          expect(rgba[3]).toEqual(255);
        });

        camera.lookAt(seCorner, new Cartesian3(0.0, 0.0, 5.0));
        expect(scene).toRenderAndCall((rgba) => {
          // Account for mitering at the corners.
          expect(rgba[0]).toBeCloseTo(255, -1);
          expect(rgba[1]).toBeCloseTo(255, -1);
          expect(rgba[2]).toBeCloseTo(255, -1);
          expect(rgba[3]).toEqual(255);
        });

        camera.lookAt(swCorner, new Cartesian3(0.0, 0.0, 5.0));
        expect(scene).toRenderAndCall((rgba) => {
          // Account for mitering at the corners.
          expect(rgba[0]).toBeCloseTo(255, -1);
          expect(rgba[1]).toBeCloseTo(255, -1);
          expect(rgba[2]).toBeCloseTo(255, -1);
          expect(rgba[3]).toEqual(255);
        });
      });
    });

    it("picks polylines", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePolylinesTileset
      ).then((tileset) => {
        // Subdivide the rectangle into 4, and look at the center of each sub-rectangle.
        const [ulRect, urRect, lrRect, llRect] = subdivideRectangle(
          tilesetRectangle
        );
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.northwest(ulRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.northwest(urRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.northwest(lrRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.northwest(llRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
        });
      });
    });

    it("renders polylines on 3D Tiles", () => {
      scene.primitives.add(tilesetMockPrimitive);
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePolylinesTileset,
        {
          classificationType: ClassificationType.CESIUM_3D_TILE,
        }
      ).then((tileset) => {
        camera.lookAt(
          ellipsoid.cartographicToCartesian(
            Rectangle.northeast(tilesetRectangle)
          ),
          new Cartesian3(0.0, 0.0, 5.0)
        );

        globeMockPrimitive.show = false;
        tilesetMockPrimitive.show = true;
        expect(scene).toRender(whitePixel);

        globeMockPrimitive.show = true;
        tilesetMockPrimitive.show = false;
        expect(scene).toRender(depthColor);
      });
    });

    it("renders polylines on terrain", () => {
      scene.primitives.add(tilesetMockPrimitive);
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePolylinesTileset,
        {
          classificationType: ClassificationType.TERRAIN,
        }
      ).then((tileset) => {
        camera.lookAt(
          ellipsoid.cartographicToCartesian(
            Rectangle.northeast(tilesetRectangle)
          ),
          new Cartesian3(0.0, 0.0, 5.0)
        );

        globeMockPrimitive.show = false;
        tilesetMockPrimitive.show = true;
        expect(scene).toRender(depthColor);

        globeMockPrimitive.show = true;
        tilesetMockPrimitive.show = false;
        expect(scene).toRender(whitePixel);
      });
    });

    it("renders polylines on 3D Tiles and terrain", () => {
      scene.primitives.add(tilesetMockPrimitive);
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePolylinesTileset,
        {
          classificationType: ClassificationType.BOTH,
        }
      ).then((tileset) => {
        camera.lookAt(
          ellipsoid.cartographicToCartesian(
            Rectangle.northeast(tilesetRectangle)
          ),
          new Cartesian3(0.0, 0.0, 5.0)
        );

        globeMockPrimitive.show = false;
        tilesetMockPrimitive.show = true;
        expect(scene).toRender(whitePixel);

        globeMockPrimitive.show = true;
        tilesetMockPrimitive.show = false;
        expect(scene).toRender(whitePixel);
      });
    });

    it("renders polylines with batch ids", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePolylinesWithBatchIdsTileset
      ).then((tileset) => {
        // Subdivide the rectangle into 4, and look at the center of each sub-rectangle.
        const [ulRect, urRect, lrRect, llRect] = subdivideRectangle(
          tilesetRectangle
        );

        const nwCorner = ellipsoid.cartographicToCartesian(
          Rectangle.northwest(ulRect)
        );
        const neCorner = ellipsoid.cartographicToCartesian(
          Rectangle.northeast(urRect)
        );
        const seCorner = ellipsoid.cartographicToCartesian(
          Rectangle.southeast(lrRect)
        );
        const swCorner = ellipsoid.cartographicToCartesian(
          Rectangle.southwest(llRect)
        );

        camera.lookAt(nwCorner, new Cartesian3(0.0, 0.0, 5.0));
        expect(scene).toRenderAndCall((rgba) => {
          // Account for mitering at the corners.
          expect(rgba[0]).toBeCloseTo(255, -1);
          expect(rgba[1]).toBeCloseTo(255, -1);
          expect(rgba[2]).toBeCloseTo(255, -1);
          expect(rgba[3]).toEqual(255);
        });

        camera.lookAt(neCorner, new Cartesian3(0.0, 0.0, 5.0));
        expect(scene).toRenderAndCall((rgba) => {
          // Account for mitering at the corners.
          expect(rgba[0]).toBeCloseTo(255, -1);
          expect(rgba[1]).toBeCloseTo(255, -1);
          expect(rgba[2]).toBeCloseTo(255, -1);
          expect(rgba[3]).toEqual(255);
        });

        camera.lookAt(seCorner, new Cartesian3(0.0, 0.0, 5.0));
        expect(scene).toRenderAndCall((rgba) => {
          // Account for mitering at the corners.
          expect(rgba[0]).toBeCloseTo(255, -1);
          expect(rgba[1]).toBeCloseTo(255, -1);
          expect(rgba[2]).toBeCloseTo(255, -1);
          expect(rgba[3]).toEqual(255);
        });

        camera.lookAt(swCorner, new Cartesian3(0.0, 0.0, 5.0));
        expect(scene).toRenderAndCall((rgba) => {
          // Account for mitering at the corners.
          expect(rgba[0]).toBeCloseTo(255, -1);
          expect(rgba[1]).toBeCloseTo(255, -1);
          expect(rgba[2]).toBeCloseTo(255, -1);
          expect(rgba[3]).toEqual(255);
        });
      });
    });

    it("picks polylines with batch ids", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePolylinesWithBatchIdsTileset
      ).then((tileset) => {
        // Subdivide the rectangle into 4, and look at the center of each sub-rectangle.
        const [ulRect, urRect, lrRect, llRect] = subdivideRectangle(
          tilesetRectangle
        );
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.northwest(ulRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
          expect(result._batchId).toEqual(0);
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.northwest(urRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
          expect(result._batchId).toEqual(1);
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.northwest(lrRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
          expect(result._batchId).toEqual(3);
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.northwest(llRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
          expect(result._batchId).toEqual(2);
        });
      });
    });

    it("renders polylines with batch table", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePolylinesWithBatchTableTileset
      ).then((tileset) => {
        // Subdivide the rectangle into 4, and look at the center of each sub-rectangle.
        const [ulRect, urRect, lrRect, llRect] = subdivideRectangle(
          tilesetRectangle
        );

        const nwCorner = ellipsoid.cartographicToCartesian(
          Rectangle.northwest(ulRect)
        );
        const neCorner = ellipsoid.cartographicToCartesian(
          Rectangle.northeast(urRect)
        );
        const seCorner = ellipsoid.cartographicToCartesian(
          Rectangle.southeast(lrRect)
        );
        const swCorner = ellipsoid.cartographicToCartesian(
          Rectangle.southwest(llRect)
        );

        camera.lookAt(nwCorner, new Cartesian3(0.0, 0.0, 5.0));
        expect(scene).toRenderAndCall((rgba) => {
          // Account for mitering at the corners.
          expect(rgba[0]).toBeCloseTo(255, -1);
          expect(rgba[1]).toBeCloseTo(255, -1);
          expect(rgba[2]).toBeCloseTo(255, -1);
          expect(rgba[3]).toEqual(255);
        });

        camera.lookAt(neCorner, new Cartesian3(0.0, 0.0, 5.0));
        expect(scene).toRenderAndCall((rgba) => {
          // Account for mitering at the corners.
          expect(rgba[0]).toBeCloseTo(255, -1);
          expect(rgba[1]).toBeCloseTo(255, -1);
          expect(rgba[2]).toBeCloseTo(255, -1);
          expect(rgba[3]).toEqual(255);
        });

        camera.lookAt(seCorner, new Cartesian3(0.0, 0.0, 5.0));
        expect(scene).toRenderAndCall((rgba) => {
          // Account for mitering at the corners.
          expect(rgba[0]).toBeCloseTo(255, -1);
          expect(rgba[1]).toBeCloseTo(255, -1);
          expect(rgba[2]).toBeCloseTo(255, -1);
          expect(rgba[3]).toEqual(255);
        });

        camera.lookAt(swCorner, new Cartesian3(0.0, 0.0, 5.0));
        expect(scene).toRenderAndCall((rgba) => {
          // Account for mitering at the corners.
          expect(rgba[0]).toBeCloseTo(255, -1);
          expect(rgba[1]).toBeCloseTo(255, -1);
          expect(rgba[2]).toBeCloseTo(255, -1);
          expect(rgba[3]).toEqual(255);
        });
      });
    });

    it("picks polylines with batch table", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePolylinesWithBatchTableTileset
      ).then((tileset) => {
        // Subdivide the rectangle into 4, and look at the center of each sub-rectangle.
        const [ulRect, urRect, lrRect, llRect] = subdivideRectangle(
          tilesetRectangle
        );
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.northwest(ulRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
          expect(result.getProperty("name")).toEqual("upper left");
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.northwest(urRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
          expect(result.getProperty("name")).toEqual("upper right");
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.northwest(lrRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
          expect(result.getProperty("name")).toEqual("lower right");
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.northwest(llRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
          expect(result.getProperty("name")).toEqual("lower left");
        });
      });
    });

    it("renders batched polylines with children", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePolylinesBatchedChildrenTileset
      ).then((tileset) => {
        // Subdivide the rectangle into 4, and look at the center of each sub-rectangle.
        const [ulRect, urRect, lrRect, llRect] = subdivideRectangle(
          tilesetRectangle
        );
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.northwest(ulRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRenderAndCall((rgba) => {
          // Account for mitering at the corners.
          expect(rgba[0]).toBeCloseTo(255, -1);
          expect(rgba[1]).toBeCloseTo(255, -1);
          expect(rgba[2]).toBeCloseTo(255, -1);
          expect(rgba[3]).toEqual(255);
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.northeast(urRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRenderAndCall((rgba) => {
          // Account for mitering at the corners.
          expect(rgba[0]).toBeCloseTo(255, -1);
          expect(rgba[1]).toBeCloseTo(255, -1);
          expect(rgba[2]).toBeCloseTo(255, -1);
          expect(rgba[3]).toEqual(255);
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.southeast(lrRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRenderAndCall((rgba) => {
          // Account for mitering at the corners.
          expect(rgba[0]).toBeCloseTo(255, -1);
          expect(rgba[1]).toBeCloseTo(255, -1);
          expect(rgba[2]).toBeCloseTo(255, -1);
          expect(rgba[3]).toEqual(255);
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.southwest(llRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRenderAndCall((rgba) => {
          // Account for mitering at the corners.
          expect(rgba[0]).toBeCloseTo(255, -1);
          expect(rgba[1]).toBeCloseTo(255, -1);
          expect(rgba[2]).toBeCloseTo(255, -1);
          expect(rgba[3]).toEqual(255);
        });
      });
    });

    it("renders batched polylines with children with batch table", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePolylinesBatchedChildrenWithBatchTableTileset
      ).then((tileset) => {
        // Subdivide the rectangle into 4, and look at the center of each sub-rectangle.
        const [ulRect, urRect, lrRect, llRect] = subdivideRectangle(
          tilesetRectangle
        );
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.northwest(ulRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRenderAndCall((rgba) => {
          // Account for mitering at the corners.
          expect(rgba[0]).toBeCloseTo(255, -1);
          expect(rgba[1]).toBeCloseTo(255, -1);
          expect(rgba[2]).toBeCloseTo(255, -1);
          expect(rgba[3]).toEqual(255);
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.northeast(urRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRenderAndCall((rgba) => {
          // Account for mitering at the corners.
          expect(rgba[0]).toBeCloseTo(255, -1);
          expect(rgba[1]).toBeCloseTo(255, -1);
          expect(rgba[2]).toBeCloseTo(255, -1);
          expect(rgba[3]).toEqual(255);
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.southeast(lrRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRenderAndCall((rgba) => {
          // Account for mitering at the corners.
          expect(rgba[0]).toBeCloseTo(255, -1);
          expect(rgba[1]).toBeCloseTo(255, -1);
          expect(rgba[2]).toBeCloseTo(255, -1);
          expect(rgba[3]).toEqual(255);
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.southwest(llRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRenderAndCall((rgba) => {
          // Account for mitering at the corners.
          expect(rgba[0]).toBeCloseTo(255, -1);
          expect(rgba[1]).toBeCloseTo(255, -1);
          expect(rgba[2]).toBeCloseTo(255, -1);
          expect(rgba[3]).toEqual(255);
        });
      });
    });

    describe("getPolylinePositions", () => {
      it("gets polyline positions", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          vectorTilePolylinesWithBatchIdsTileset,
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
          vectorTilePolylinesBatchedChildrenTileset,
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
          vectorTilePolylinesWithBatchIdsTileset,
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
          vectorTilePolylinesWithBatchIdsTileset,
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
          vectorTilePolygonsWithBatchTableTileset,
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
          vectorTilePolylinesWithBatchIdsTileset,
          {
            vectorKeepDecodedPositions: false,
          }
        ).then(function (tileset) {
          const content = tileset.root.content;
          const polylinePositions = content.getPolylinePositions(0);
          expect(polylinePositions).toBeUndefined();
        });
      });
    });
  });

  describe("combined", () => {
    const vectorTileCombinedTileset =
      "./Data/Cesium3DTiles/Vector/VectorTileCombined/tileset.json";
    const vectorTileCombinedWithBatchIdsTileset =
      "./Data/Cesium3DTiles/Vector/VectorTileCombinedWithBatchIds/tileset.json";

    const combinedTilesetRectangle = Rectangle.fromDegrees(
      -0.02,
      -0.01,
      0.02,
      0.01
    );
    const width = combinedTilesetRectangle.width;
    const step = width / 3;
    const west = combinedTilesetRectangle.west;
    const north = combinedTilesetRectangle.north;
    const south = combinedTilesetRectangle.south;

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

    it("renders", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTileCombinedTileset
      ).then((tileset) => {
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(polygonRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(polylineRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(pointRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
      });
    });

    it("picks", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTileCombinedTileset
      ).then((tileset) => {
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(polygonRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.northeast(polylineRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(pointRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
        });
      });
    });

    it("renders with batch ids", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTileCombinedWithBatchIdsTileset
      ).then((tileset) => {
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(polygonRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(polylineRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(pointRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toRender(whitePixel);
      });
    });

    it("picks with batch ids", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTileCombinedWithBatchIdsTileset
      ).then((tileset) => {
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(polygonRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
          expect(result._batchId).toEqual(2);
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.northeast(polylineRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
          expect(result._batchId).toEqual(1);
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(pointRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTilePointFeature);
          expect(result._batchId).toEqual(0);
        });
      });
    });
  });

  it("throws when calling getFeature with invalid index", function () {
    return Cesium3DTilesTester.loadTileset(
      scene,
      vectorTilePolygonsWithBatchTableTileset
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
      url: vectorTilePolygonsWithBatchTableTileset,
    });
    expect(tileset.isDestroyed()).toEqual(false);
    tileset.destroy();
    expect(tileset.isDestroyed()).toEqual(true);
  });
});
