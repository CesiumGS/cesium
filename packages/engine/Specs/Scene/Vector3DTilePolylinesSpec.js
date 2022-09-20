import {
  BoundingSphere,
  Cartesian3,
  Cartographic,
  Ellipsoid,
  Rectangle,
  Cesium3DTileBatchTable,
  ColorBlendMode,
  Vector3DTilePolylines,
} from "../../index.js";;

import { Math as CesiumMath } from "../../index.js";

import createScene from "../../../../Specs/createScene.js";;
import pollToPromise from "../../../../Specs/pollToPromise.js";

describe(
  "Scene/Vector3DTilePolylines",
  function () {
    let scene;
    let rectangle;
    let polylines;

    const ellipsoid = Ellipsoid.WGS84;

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    const mockTileset = {
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

    beforeEach(function () {
      rectangle = Rectangle.fromDegrees(-40.0, -40.0, 40.0, 40.0);
    });

    afterEach(function () {
      scene.primitives.removeAll();
      polylines = polylines && !polylines.isDestroyed() && polylines.destroy();
    });

    function loadPolylines(polylines) {
      let ready = false;
      polylines.readyPromise.then(function () {
        ready = true;
      });
      return pollToPromise(function () {
        polylines.update(scene.frameState);
        scene.frameState.commandList.length = 0;
        return ready;
      });
    }

    function zigZag(value) {
      return ((value << 1) ^ (value >> 15)) & 0xffff;
    }

    const maxShort = 32767;

    function encodePositions(
      rectangle,
      minimumHeight,
      maximumHeight,
      positions
    ) {
      const length = positions.length;
      const buffer = new Uint16Array(length * 3);

      let lastU = 0;
      let lastV = 0;
      let lastH = 0;

      for (let i = 0; i < length; ++i) {
        const position = positions[i];

        let u = (position.longitude - rectangle.west) / rectangle.width;
        let v = (position.latitude - rectangle.south) / rectangle.height;
        let h =
          (position.height - minimumHeight) / (maximumHeight - minimumHeight);

        u = CesiumMath.clamp(u, 0.0, 1.0);
        v = CesiumMath.clamp(v, 0.0, 1.0);
        h = CesiumMath.clamp(h, 0.0, 1.0);

        u = Math.floor(u * maxShort);
        v = Math.floor(v * maxShort);
        h = Math.floor(h * maxShort);

        buffer[i] = zigZag(u - lastU);
        buffer[i + length] = zigZag(v - lastV);
        buffer[i + length * 2] = zigZag(h - lastH);

        lastU = u;
        lastV = v;
        lastH = h;
      }

      return buffer;
    }

    it("renders a polyline", function () {
      const minHeight = 0.0;
      const maxHeight = 5.0;
      const cartoPositions = [
        Cartographic.fromDegrees(0.0, 0.0, 1.0),
        Cartographic.fromDegrees(1.0, 0.0, 2.0),
      ];
      const positions = encodePositions(
        rectangle,
        minHeight,
        maxHeight,
        cartoPositions
      );

      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      batchTable.update(mockTileset, scene.frameState);

      const center = ellipsoid.cartographicToCartesian(
        Rectangle.center(rectangle)
      );

      polylines = scene.primitives.add(
        new Vector3DTilePolylines({
          positions: positions,
          widths: new Uint16Array([10]),
          counts: new Uint32Array([2]),
          batchIds: new Uint16Array([0]),
          rectangle: rectangle,
          minimumHeight: minHeight,
          maximumHeight: maxHeight,
          center: center,
          boundingVolume: new BoundingSphere(center, 1000000.0),
          batchTable: batchTable,
          keepDecodedPositions: false,
        })
      );
      return loadPolylines(polylines).then(function () {
        scene.camera.lookAt(
          Cartesian3.fromDegrees(0.5, 0.0, 1.5),
          new Cartesian3(0.0, 0.0, 1.0)
        );
        expect(scene).toRender([255, 255, 255, 255]);
      });
    });

    it("renders multiple polylines", function () {
      const minHeight = 0.0;
      const maxHeight = 100.0;
      const cartoPositions = [
        Cartographic.fromDegrees(1.0, 0.0, 1.0),
        Cartographic.fromDegrees(2.0, 0.0, 2.0),
        Cartographic.fromDegrees(-6.0, 0.0, 12.0),
        Cartographic.fromDegrees(-5.0, 0.0, 15.0),
        Cartographic.fromDegrees(0.0, 10.0, 0.0),
        Cartographic.fromDegrees(0.0, 5.0, 5.0),
        Cartographic.fromDegrees(0.0, 0.0, 10.0),
        Cartographic.fromDegrees(0.0, -5.0, 15.0),
      ];
      const positions = encodePositions(
        rectangle,
        minHeight,
        maxHeight,
        cartoPositions
      );

      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      batchTable.update(mockTileset, scene.frameState);

      const center = ellipsoid.cartographicToCartesian(
        Rectangle.center(rectangle)
      );

      polylines = scene.primitives.add(
        new Vector3DTilePolylines({
          positions: positions,
          widths: new Uint16Array([10, 10, 10]),
          counts: new Uint32Array([2, 2, 4]),
          batchIds: new Uint16Array([0, 1, 2]),
          rectangle: rectangle,
          minimumHeight: minHeight,
          maximumHeight: maxHeight,
          center: center,
          boundingVolume: new BoundingSphere(center, 1000000.0),
          batchTable: batchTable,
          keepDecodedPositions: false,
        })
      );
      return loadPolylines(polylines).then(function () {
        for (let i = 0; i < cartoPositions.length; i += 2) {
          const p1 = cartoPositions[i];
          const p2 = cartoPositions[i + 1];

          const longitude = CesiumMath.lerp(p1.longitude, p2.longitude, 0.5);
          const latitude = CesiumMath.lerp(p1.latitude, p2.latitude, 0.5);
          const height = CesiumMath.lerp(p1.height, p2.height, 0.5);
          const target = Cartesian3.fromRadians(longitude, latitude, height);
          scene.camera.lookAt(target, new Cartesian3(0.0, 0.0, 1.0));
          expect(scene).toRender([255, 255, 255, 255]);
        }
      });
    });

    it("picks a polyline", function () {
      const minHeight = 0.0;
      const maxHeight = 5.0;
      const cartoPositions = [
        Cartographic.fromDegrees(0.0, 0.0, 1.0),
        Cartographic.fromDegrees(1.0, 0.0, 2.0),
      ];
      const positions = encodePositions(
        rectangle,
        minHeight,
        maxHeight,
        cartoPositions
      );

      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);

      const center = ellipsoid.cartographicToCartesian(
        Rectangle.center(rectangle)
      );

      polylines = scene.primitives.add(
        new Vector3DTilePolylines({
          positions: positions,
          widths: new Uint16Array([10]),
          counts: new Uint32Array([2]),
          batchIds: new Uint16Array([0]),
          rectangle: rectangle,
          minimumHeight: minHeight,
          maximumHeight: maxHeight,
          center: center,
          boundingVolume: new BoundingSphere(center, 1000000.0),
          batchTable: batchTable,
          keepDecodedPositions: false,
        })
      );
      return loadPolylines(polylines).then(function () {
        scene.camera.lookAt(
          Cartesian3.fromDegrees(0.5, 0.0, 1.5),
          new Cartesian3(0.0, 0.0, 1.0)
        );

        const features = [];
        polylines.createFeatures(mockTileset, features);

        const getFeature = mockTileset.getFeature;
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
      polylines = new Vector3DTilePolylines({});
      expect(polylines.isDestroyed()).toEqual(false);
      polylines.destroy();
      expect(polylines.isDestroyed()).toEqual(true);
    });
  },
  "WebGL"
);
