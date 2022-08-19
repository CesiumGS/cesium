import createScene from "../createScene.js";
import Cesium3DTilesTester from "../Cesium3DTilesTester.js";
import {
  Cartesian3,
  Cesium3DTileFeature,
  Color,
  ColorGeometryInstanceAttribute,
  destroyObject,
  Ellipsoid,
  GeometryInstance,
  Pass,
  PerInstanceColorAppearance,
  Primitive,
  Rectangle,
  RectangleGeometry,
  RenderState,
  StencilConstants,
} from "../../Source/Cesium.js";

describe("Scene/Vector3DTileContentNew", () => {
  let scene;
  let camera;
  let ellipsoid;

  let globeMockPrimitive;
  let tilesetMockPrimitive;

  let globePrimitive;
  let tilesetPrimitive;

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
    //let depthColor = depthColorAttribute.value;
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

  function subdivideRectangle(rectangle) {
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

  describe("polygons", () => {
    const vectorTilePolygonsTileset =
      "./Data/Cesium3DTiles/Vector/VectorTilePolygons/tileset.json";
    const vectorTilePolygonsWithBatchIds =
      "./Data/Cesium3DTiles/Vector/VectorTilePolygonsWithBatchIds/tileset.json";
    const vectorTilePolygonsWithBatchTable =
      "./Data/Cesium3DTiles/Vector/VectorTilePolygonsWithBatchTable/tileset.json";
    const vectorTilePolygonsBatchedChildrenTileset =
      "./Data/Cesium3DTiles/Vector/VectorTilePolygonsBatchedChildren/tileset.json";
    const vectorTilePolygonsBatchedChildrenWithBatchTable =
      "./Data/Cesium3DTiles/Vector/VectorTilePolygonsBatchedChildrenWithBatchTable/tileset.json";

    it("renders polygons", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePolygonsTileset
      ).then((tileset) => {
        const whitePixel = [255, 255, 255, 255];
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

    it("renders batched polygons with batch ids", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePolygonsWithBatchIds
      ).then((tileset) => {
        const whitePixel = [255, 255, 255, 255];
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
        vectorTilePolygonsWithBatchIds
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
        vectorTilePolygonsWithBatchTable
      ).then((tileset) => {
        const whitePixel = [255, 255, 255, 255];
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
        vectorTilePolygonsWithBatchTable
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
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(lrRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
        });
        camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(llRect)),
          new Cartesian3(0.0, 0.0, 5.0)
        );
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeDefined();
          expect(result).toBeInstanceOf(Cesium3DTileFeature);
        });
      });
    });

    it("renders batched polygons with children", () => {
      return Cesium3DTilesTester.loadTileset(
        scene,
        vectorTilePolygonsBatchedChildrenTileset
      ).then((tileset) => {
        const whitePixel = [255, 255, 255, 255];
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
        const whitePixel = [255, 255, 255, 255];
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
});
