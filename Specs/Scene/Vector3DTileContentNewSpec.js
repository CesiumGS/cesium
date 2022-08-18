import createGlobe from "../createGlobe.js";
import createScene from "../createScene.js";
import Cesium3DTilesTester from "../Cesium3DTilesTester.js";
import { Cartesian3, Rectangle } from "../../Source/Cesium.js";

describe("Scene/Vector3DTileContentNew", () => {
  const vectorTilePointsTileset =
    "./Data/Cesium3DTiles/Vector/VectorTilePoints/tileset.json";

  const tilesetRectangle = Rectangle.fromDegrees(-0.01, -0.01, 0.01, 0.01);

  let scene;
  let globe;
  let ellipsoid;

  beforeAll(() => {
    scene = createScene();
    globe = createGlobe();
    ellipsoid = globe.ellipsoid;
  });

  afterAll(() => {
    scene.destroyForSpecs();
  });

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

  it("renders points", () => {
    return Cesium3DTilesTester.loadTileset(scene, vectorTilePointsTileset).then(
      (tileset) => {
        const [ulRect, urRect, lrRect, llRect] = subdivideRectangle(
          tilesetRectangle
        );
        const renderCallback = (rgba) => {
          expect(rgba[0]).toBeGreaterThan(0);
          expect(rgba[1]).toBeGreaterThan(0);
          expect(rgba[2]).toEqual(0);
          expect(rgba[3]).toEqual(255);
        };

        scene.camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(ulRect)),
          new Cartesian3(0.0, 0.0, 5000.0)
        );
        expect(scene).toRenderAndCall(renderCallback);

        scene.camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(urRect)),
          new Cartesian3(0.0, 0.0, 50000.0)
        );
        expect(scene).toRenderAndCall(renderCallback);

        scene.camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(lrRect)),
          new Cartesian3(0.0, 0.0, 50000.0)
        );
        expect(scene).toRenderAndCall(renderCallback);

        scene.camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(llRect)),
          new Cartesian3(0.0, 0.0, 50000.0)
        );
        expect(scene).toRenderAndCall(renderCallback);
      }
    );
  });
});
