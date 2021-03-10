import { Cartesian3 } from "../../Source/Cesium.js";
import { Cesium3DTileStyle } from "../../Source/Cesium.js";
import { ClassificationType } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { ColorGeometryInstanceAttribute } from "../../Source/Cesium.js";
import { destroyObject } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { GeometryInstance } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import { RectangleGeometry } from "../../Source/Cesium.js";
import { Cesium3DTileBatchTable } from "../../Source/Cesium.js";
import { ColorBlendMode } from "../../Source/Cesium.js";
import { Pass } from "../../Source/Cesium.js";
import { PerInstanceColorAppearance } from "../../Source/Cesium.js";
import { Primitive } from "../../Source/Cesium.js";
import { Vector3DTileClampedPolylines } from "../../Source/Cesium.js";
import Cesium3DTilesTester from "../Cesium3DTilesTester.js";
import createScene from "../createScene.js";

describe(
  "Scene/Vector3DTileClampedPolylines",
  function () {
    var scene;
    var rectangle;
    var polylines;

    var ellipsoid = Ellipsoid.WGS84;

    var depthRectanglePrimitive;
    var vectorPolylines =
      "./Data/Cesium3DTiles/Vector/VectorTilePolylines/tileset.json";

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    var mockTileset = {
      _statistics: {
        texturesByteLength: 0,
      },
      tileset: {
        _statistics: {
          batchTableByteLength: 0,
        },
        colorBlendMode: ColorBlendMode.HIGHLIGHT,
      },
      getFeature: function (id) {
        return { batchId: id };
      },
    };

    function MockGlobePrimitive(primitive) {
      this._primitive = primitive;
      this.pass = Pass.GLOBE;
    }

    MockGlobePrimitive.prototype.update = function (frameState) {
      var commandList = frameState.commandList;
      var startLength = commandList.length;
      this._primitive.update(frameState);

      for (var i = startLength; i < commandList.length; ++i) {
        var command = commandList[i];
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
      var depthpolylineColorAttribute = ColorGeometryInstanceAttribute.fromColor(
        new Color(0.0, 0.0, 1.0, 1.0)
      );
      var primitive = new Primitive({
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

    it("renders clamped polylines", function () {
      return Cesium3DTilesTester.loadTileset(scene, vectorPolylines, {
        classificationType: ClassificationType.TERRAIN,
      }).then(function (tileset) {
        tileset.style = new Cesium3DTileStyle({
          color: "rgba(255, 0, 0, 1.0)",
        });
        tileset.maximumScreenSpaceError = 0.0;

        var batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
        batchTable.update(mockTileset, scene.frameState);

        scene.primitives.add(depthRectanglePrimitive);

        scene.camera.lookAt(
          Cartesian3.fromDegrees(0.01, 0.0, 1.5),
          new Cartesian3(0.0, 0.0, 1.0)
        );
        expect(scene).toRender([0, 0, 255, 255]);
      });
    });

    it("picks a clamped polyline", function () {
      return Cesium3DTilesTester.loadTileset(scene, vectorPolylines, {
        classificationType: ClassificationType.TERRAIN,
      }).then(function (tileset) {
        var batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
        batchTable.update(mockTileset, scene.frameState);

        scene.primitives.add(depthRectanglePrimitive);

        scene.camera.lookAt(
          Cartesian3.fromDegrees(0.5, 0.0, 1.5),
          new Cartesian3(0.0, 0.0, 1.0)
        );

        var features = [];
        tileset.createFeatures(mockTileset, features);

        var getFeature = mockTileset.getFeature;
        mockTileset.getFeature = function (index) {
          return features[index];
        };

        scene.frameState.passes.pick = true;
        batchTable.update(mockTileset, scene.frameState);
        expect(scene).toPickAndCall(function (result) {
          expect(result).toBe(features[0]);
        });

        mockTileset.getFeature = getFeature;
      });
    });

    it("isDestroyed", function () {
      polylines = new Vector3DTileClampedPolylines({});
      expect(polylines.isDestroyed()).toEqual(false);
      polylines.destroy();
      expect(polylines.isDestroyed()).toEqual(true);
    });
  },
  "WebGL"
);
