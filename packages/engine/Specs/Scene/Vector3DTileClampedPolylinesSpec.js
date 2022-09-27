import {
  Cartesian3,
  ClassificationType,
  Color,
  ColorGeometryInstanceAttribute,
  destroyObject,
  Ellipsoid,
  GeometryInstance,
  Rectangle,
  RectangleGeometry,
  Pass,
  PerInstanceColorAppearance,
  Primitive,
  Vector3DTileClampedPolylines,
} from "../../index.js";

import Cesium3DTilesTester from "../../../../Specs/Cesium3DTilesTester.js";
import createScene from "../../../../Specs/createScene.js";

describe(
  "Scene/Vector3DTileClampedPolylines",
  function () {
    let scene;
    let rectangle;
    let polylines;

    const ellipsoid = Ellipsoid.WGS84;

    let depthRectanglePrimitive;
    const vectorPolylines =
      "./Data/Cesium3DTiles/Vector/VectorTilePolylines/tileset.json";

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    function MockGlobePrimitive(primitive) {
      this._primitive = primitive;
      this.pass = Pass.GLOBE;
    }

    MockGlobePrimitive.prototype.update = function (frameState) {
      const commandList = frameState.commandList;
      const startLength = commandList.length;
      this._primitive.update(frameState);

      for (let i = startLength; i < commandList.length; ++i) {
        const command = commandList[i];
        command.pass = this.pass;
      }
    };

    MockGlobePrimitive.prototype.isDestroyed = function () {
      return false;
    };

    MockGlobePrimitive.prototype.destroy = function () {
      this._primitive.destroy();
      return destroyObject(this);
    };

    beforeEach(function () {
      rectangle = Rectangle.fromDegrees(-40.0, -40.0, 40.0, 40.0);
      const depthpolylineColorAttribute = ColorGeometryInstanceAttribute.fromColor(
        new Color(0.0, 0.0, 1.0, 1.0)
      );
      const primitive = new Primitive({
        geometryInstances: new GeometryInstance({
          geometry: new RectangleGeometry({
            ellipsoid: ellipsoid,
            rectangle: rectangle,
          }),
          id: "depth rectangle",
          attributes: {
            color: depthpolylineColorAttribute,
          },
        }),
        appearance: new PerInstanceColorAppearance({
          translucent: false,
          flat: true,
        }),
        asynchronous: false,
      });

      // wrap rectangle primitive so it gets executed during the globe pass to lay down depth
      depthRectanglePrimitive = new MockGlobePrimitive(primitive);
    });

    afterEach(function () {
      scene.primitives.removeAll();
      polylines = polylines && !polylines.isDestroyed() && polylines.destroy();
    });

    xit("renders clamped polylines", function () {
      scene.camera.lookAt(
        Cartesian3.fromDegrees(0.0, 0.0, 1.5),
        new Cartesian3(0.0, 0.0, 1.0)
      );
      return Cesium3DTilesTester.loadTileset(scene, vectorPolylines, {
        classificationType: ClassificationType.TERRAIN,
      }).then(function (tileset) {
        scene.primitives.add(depthRectanglePrimitive);

        tileset.show = false;
        expect(scene).toRender([0, 0, 255, 255]);
        tileset.show = true;
        expect(scene).toRender([255, 255, 255, 255]);
      });
    });

    xit("picks a clamped polyline", function () {
      scene.camera.lookAt(
        Cartesian3.fromDegrees(0.0, 0.0, 1.5),
        new Cartesian3(0.0, 0.0, 1.0)
      );
      return Cesium3DTilesTester.loadTileset(scene, vectorPolylines, {
        classificationType: ClassificationType.TERRAIN,
      }).then(function (tileset) {
        scene.primitives.add(depthRectanglePrimitive);

        tileset.show = false;
        expect(scene).toPickPrimitive(depthRectanglePrimitive._primitive);
        tileset.show = true;
        expect(scene).toPickPrimitive(tileset);
      });
    });

    it("isDestroyed", function () {
      polylines = new Vector3DTileClampedPolylines({
        rectangle: new Rectangle(),
      });
      expect(polylines.isDestroyed()).toEqual(false);
      polylines.destroy();
      expect(polylines.isDestroyed()).toEqual(true);
    });
  },
  "WebGL"
);
