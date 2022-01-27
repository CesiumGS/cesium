import { Cartesian2 } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { Cartographic } from "../../Source/Cesium.js";
import { clone } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { DistanceDisplayCondition } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { NearFarScalar } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import { Cesium3DTileBatchTable } from "../../Source/Cesium.js";
import { Cesium3DTileStyle } from "../../Source/Cesium.js";
import { ColorBlendMode } from "../../Source/Cesium.js";
import { HorizontalOrigin } from "../../Source/Cesium.js";
import { LabelStyle } from "../../Source/Cesium.js";
import { Vector3DTilePoints } from "../../Source/Cesium.js";
import { VerticalOrigin } from "../../Source/Cesium.js";
import createScene from "../createScene.js";
import pollToPromise from "../pollToPromise.js";

describe(
  "Scene/Vector3DTilePoints",
  function () {
    let scene;
    let rectangle;
    let points;

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
        ellipsoid: Ellipsoid.WGS84,
      },
      tile: {},
      getFeature: function (id) {
        return { batchId: id };
      },
    };

    beforeEach(function () {
      rectangle = Rectangle.fromDegrees(-40.0, -40.0, 40.0, 40.0);
    });

    afterEach(function () {
      scene.primitives.removeAll();
      points = points && !points.isDestroyed() && points.destroy();
    });

    function loadPoints(points) {
      let ready = false;
      points.readyPromise.then(function () {
        ready = true;
      });
      return pollToPromise(function () {
        points.update(scene.frameState);
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

    it("renders a point", function () {
      const minHeight = 0.0;
      const maxHeight = 100.0;
      const cartoPositions = [Cartographic.fromDegrees(0.0, 0.0, 10.0)];
      const positions = encodePositions(
        rectangle,
        minHeight,
        maxHeight,
        cartoPositions
      );

      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      batchTable.update(mockTileset, scene.frameState);

      points = scene.primitives.add(
        new Vector3DTilePoints({
          positions: positions,
          batchTable: batchTable,
          batchIds: new Uint16Array([0]),
          rectangle: rectangle,
          minimumHeight: minHeight,
          maximumHeight: maxHeight,
        })
      );
      return loadPoints(points).then(function () {
        const features = [];
        points.createFeatures(mockTileset, features);
        points.applyStyle(undefined, features);

        scene.camera.lookAt(
          Cartesian3.fromDegrees(0.0, 0.0, 30.0),
          new Cartesian3(0.0, 0.0, 50.0)
        );
        expect(scene).toRender([255, 255, 255, 255]);
      });
    });

    it("renders multiple points", function () {
      const minHeight = 0.0;
      const maxHeight = 100.0;
      const cartoPositions = [
        Cartographic.fromDegrees(0.0, 0.0, 10.0),
        Cartographic.fromDegrees(5.0, 0.0, 20.0),
        Cartographic.fromDegrees(-5.0, 0.0, 1.0),
        Cartographic.fromDegrees(0.0, 6.0, 5.0),
        Cartographic.fromDegrees(0.0, -6.0, 90.0),
      ];
      const positions = encodePositions(
        rectangle,
        minHeight,
        maxHeight,
        cartoPositions
      );

      const batchTable = new Cesium3DTileBatchTable(mockTileset, 5);
      batchTable.update(mockTileset, scene.frameState);

      points = scene.primitives.add(
        new Vector3DTilePoints({
          positions: positions,
          batchTable: batchTable,
          batchIds: new Uint16Array([0, 1, 2, 3, 4]),
          rectangle: rectangle,
          minimumHeight: minHeight,
          maximumHeight: maxHeight,
        })
      );
      const style = new Cesium3DTileStyle({
        verticalOrigin: VerticalOrigin.BOTTOM,
      });
      return loadPoints(points).then(function () {
        const features = [];
        points.createFeatures(mockTileset, features);
        points.applyStyle(style, features);

        for (let i = 0; i < cartoPositions.length; ++i) {
          const position = ellipsoid.cartographicToCartesian(cartoPositions[i]);
          scene.camera.lookAt(position, new Cartesian3(0.0, 0.0, 50.0));
          expect(scene).toRenderAndCall(function (rgba) {
            expect(rgba[0]).toBeGreaterThan(0);
            expect(rgba[0]).toEqual(rgba[1]);
            expect(rgba[0]).toEqual(rgba[2]);
            expect(rgba[3]).toEqual(255);
          });
        }
      });
    });

    it("picks a point", function () {
      const minHeight = 0.0;
      const maxHeight = 100.0;
      const cartoPositions = [Cartographic.fromDegrees(0.0, 0.0, 10.0)];
      const positions = encodePositions(
        rectangle,
        minHeight,
        maxHeight,
        cartoPositions
      );

      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);

      points = scene.primitives.add(
        new Vector3DTilePoints({
          positions: positions,
          batchTable: batchTable,
          batchIds: new Uint16Array([0]),
          rectangle: rectangle,
          minimumHeight: minHeight,
          maximumHeight: maxHeight,
        })
      );
      return loadPoints(points).then(function () {
        scene.camera.lookAt(
          Cartesian3.fromDegrees(0.0, 0.0, 10.0),
          new Cartesian3(0.0, 0.0, 50.0)
        );

        const features = [];
        points.createFeatures(mockTileset, features);
        points.applyStyle(undefined, features);

        const getFeature = mockTileset.getFeature;
        mockTileset.getFeature = function (index) {
          return features[index];
        };

        scene.frameState.passes.pick = true;
        batchTable.update(mockTileset, scene.frameState);
        expect(scene).toPickAndCall(function (result) {
          expect(result).toBe(features[0]);
        });
        scene.frameState.passes.pick = false;

        mockTileset.getFeature = getFeature;
      });
    });

    it("renders multiple points with style", function () {
      const minHeight = 0.0;
      const maxHeight = 100.0;
      const cartoPositions = [
        Cartographic.fromDegrees(0.0, 0.0, 10.0),
        Cartographic.fromDegrees(5.0, 0.0, 20.0),
        Cartographic.fromDegrees(-5.0, 0.0, 1.0),
        Cartographic.fromDegrees(0.0, 6.0, 5.0),
        Cartographic.fromDegrees(0.0, -6.0, 90.0),
      ];
      const positions = encodePositions(
        rectangle,
        minHeight,
        maxHeight,
        cartoPositions
      );

      const mockTilesetClone = clone(mockTileset);
      const batchTable = new Cesium3DTileBatchTable(mockTilesetClone, 5);
      mockTilesetClone.batchTable = batchTable;

      for (let i = 0; i < 5; ++i) {
        batchTable.setProperty(i, "temperature", i);
      }
      batchTable.update(mockTilesetClone, scene.frameState);

      points = scene.primitives.add(
        new Vector3DTilePoints({
          positions: positions,
          batchTable: batchTable,
          batchIds: new Uint16Array([0, 1, 2, 3, 4]),
          rectangle: rectangle,
          minimumHeight: minHeight,
          maximumHeight: maxHeight,
        })
      );

      const style = new Cesium3DTileStyle({
        show: "true",
        pointSize: "10.0",
        color: "rgba(255, 255, 0, 0.5)",
        pointOutlineColor: "rgba(255, 255, 0, 1.0)",
        pointOutlineWidth: "11.0 * ${temperature}",
        labelColor: "rgba(255, 255, 0, 1.0)",
        labelOutlineColor: "rgba(255, 255, 0, 0.5)",
        labelOutlineWidth: "1.0",
        font: '"30px sans-serif"',
        labelStyle: "" + LabelStyle.FILL_AND_OUTLINE,
        labelText: '"test"',
        backgroundColor: "rgba(255, 255, 0, 0.2)",
        backgroundPadding: "vec2(10, 11)",
        backgroundEnabled: "true",
        scaleByDistance: "vec4(1.0e4, 1.0, 1.0e6, 0.0)",
        translucencyByDistance: "vec4(1.0e4, 1.0, 1.0e6, 0.0)",
        distanceDisplayCondition: "vec2(0.1, 1.0e6)",
        heightOffset: "0.0",
        anchorLineEnabled: "true",
        anchorLineColor: "rgba(255, 255, 0, 1.0)",
        disableDepthTestDistance: "1.0e6",
        horizontalOrigin: "" + HorizontalOrigin.CENTER,
        verticalOrigin: "" + VerticalOrigin.CENTER,
        labelHorizontalOrigin: "" + HorizontalOrigin.RIGHT,
        labelVerticalOrigin: "" + VerticalOrigin.BOTTOM,
      });

      return loadPoints(points).then(function () {
        const features = [];
        points.createFeatures(mockTilesetClone, features);
        points.applyStyle(style, features);

        let i;
        for (i = 0; i < features.length; ++i) {
          const feature = features[i];
          expect(feature.show).toEqual(true);
          expect(feature.pointSize).toEqual(10.0);
          expect(feature.color).toEqual(new Color(1.0, 1.0, 0.0, 0.5));
          expect(feature.pointOutlineColor).toEqual(
            new Color(1.0, 1.0, 0.0, 1.0)
          );
          expect(feature.pointOutlineWidth).toEqual(11.0 * i);
          expect(feature.labelColor).toEqual(new Color(1.0, 1.0, 0.0, 1.0));
          expect(feature.labelOutlineColor).toEqual(
            new Color(1.0, 1.0, 0.0, 0.5)
          );
          expect(feature.labelOutlineWidth).toEqual(1.0);
          expect(feature.font).toEqual("30px sans-serif");
          expect(feature.labelStyle).toEqual(LabelStyle.FILL_AND_OUTLINE);
          expect(feature.labelText).toEqual("test");
          expect(feature.backgroundColor).toEqual(
            new Color(1.0, 1.0, 0.0, 0.2)
          );
          expect(feature.backgroundPadding).toEqual(new Cartesian2(10, 11));
          expect(feature.backgroundEnabled).toEqual(true);
          expect(feature.scaleByDistance).toEqual(
            new NearFarScalar(1.0e4, 1.0, 1.0e6, 0.0)
          );
          expect(feature.translucencyByDistance).toEqual(
            new NearFarScalar(1.0e4, 1.0, 1.0e6, 0.0)
          );
          expect(feature.distanceDisplayCondition).toEqual(
            new DistanceDisplayCondition(0.1, 1.0e6)
          );
          expect(feature.heightOffset).toEqual(0.0);
          expect(feature.anchorLineEnabled).toEqual(true);
          expect(feature.anchorLineColor).toEqual(
            new Color(1.0, 1.0, 0.0, 1.0)
          );
          expect(feature.disableDepthTestDistance).toEqual(1.0e6);
          expect(feature.horizontalOrigin).toEqual(HorizontalOrigin.CENTER);
          expect(feature.verticalOrigin).toEqual(VerticalOrigin.CENTER);
          expect(feature.labelHorizontalOrigin).toEqual(HorizontalOrigin.RIGHT);
          expect(feature.labelVerticalOrigin).toEqual(VerticalOrigin.BOTTOM);
        }

        let position;
        for (i = 0; i < cartoPositions.length; ++i) {
          position = ellipsoid.cartographicToCartesian(cartoPositions[i]);
          scene.camera.lookAt(position, new Cartesian3(0.0, 0.0, 50.0));
          expect(scene).toRenderAndCall(function (rgba) {
            expect(rgba[0]).toBeGreaterThan(0);
            expect(rgba[1]).toBeGreaterThan(0);
            expect(rgba[2]).toEqual(0);
            expect(rgba[3]).toEqual(255);
          });
        }
      });
    });

    it("renders a point with an image", function () {
      const minHeight = 0.0;
      const maxHeight = 100.0;
      const cartoPositions = [Cartographic.fromDegrees(0.0, 0.0, 10.0)];
      const positions = encodePositions(
        rectangle,
        minHeight,
        maxHeight,
        cartoPositions
      );

      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      batchTable.update(mockTileset, scene.frameState);

      points = scene.primitives.add(
        new Vector3DTilePoints({
          positions: positions,
          batchTable: batchTable,
          batchIds: new Uint16Array([0]),
          rectangle: rectangle,
          minimumHeight: minHeight,
          maximumHeight: maxHeight,
        })
      );

      const style = new Cesium3DTileStyle({
        image: '"./Data/Images/Blue10x10.png"',
      });
      return loadPoints(points).then(function () {
        const features = [];
        points.createFeatures(mockTileset, features);
        points.applyStyle(style, features);

        const collection = points._billboardCollection;
        expect(collection.length).toEqual(1);
        const billboard = collection.get(0);
        expect(billboard).toBeDefined();
        expect(billboard.ready).toEqual(false);

        scene.camera.lookAt(
          Cartesian3.fromDegrees(0.0, 0.0, 10.0),
          new Cartesian3(0.0, 0.0, 50.0)
        );
        return pollToPromise(function () {
          scene.renderForSpecs();
          return billboard.ready;
        }).then(function () {
          expect(billboard.ready).toEqual(true);
          expect(scene).toRender([0, 0, 255, 255]);
        });
      });
    });

    it("renders multiple points with debug color", function () {
      const minHeight = 0.0;
      const maxHeight = 100.0;
      const cartoPositions = [
        Cartographic.fromDegrees(0.0, 0.0, 10.0),
        Cartographic.fromDegrees(5.0, 0.0, 20.0),
        Cartographic.fromDegrees(-5.0, 0.0, 1.0),
        Cartographic.fromDegrees(0.0, 6.0, 5.0),
        Cartographic.fromDegrees(0.0, -6.0, 90.0),
      ];
      const positions = encodePositions(
        rectangle,
        minHeight,
        maxHeight,
        cartoPositions
      );

      const batchTable = new Cesium3DTileBatchTable(mockTileset, 5);
      batchTable.update(mockTileset, scene.frameState);

      points = scene.primitives.add(
        new Vector3DTilePoints({
          positions: positions,
          batchTable: batchTable,
          batchIds: new Uint16Array([0, 1, 2, 3, 4]),
          rectangle: rectangle,
          minimumHeight: minHeight,
          maximumHeight: maxHeight,
        })
      );
      const style = new Cesium3DTileStyle({
        verticalOrigin: VerticalOrigin.BOTTOM,
      });
      return loadPoints(points).then(function () {
        const features = [];
        points.createFeatures(mockTileset, features);
        points.applyStyle(style, features);
        points.applyDebugSettings(true, Color.YELLOW);

        let i;
        let position;
        for (i = 0; i < cartoPositions.length; ++i) {
          position = ellipsoid.cartographicToCartesian(cartoPositions[i]);
          scene.camera.lookAt(position, new Cartesian3(0.0, 0.0, 50.0));
          expect(scene).toRenderAndCall(function (rgba) {
            expect(rgba[0]).toBeGreaterThan(0);
            expect(rgba[1]).toBeGreaterThan(0);
            expect(rgba[2]).toEqual(0);
            expect(rgba[3]).toEqual(255);
          });
        }

        points.applyDebugSettings(false);

        for (i = 0; i < cartoPositions.length; ++i) {
          position = ellipsoid.cartographicToCartesian(cartoPositions[i]);
          scene.camera.lookAt(position, new Cartesian3(0.0, 0.0, 50.0));
          expect(scene).toRenderAndCall(function (rgba) {
            expect(rgba[0]).toBeGreaterThan(0);
            expect(rgba[0]).toEqual(rgba[1]);
            expect(rgba[0]).toEqual(rgba[2]);
            expect(rgba[3]).toEqual(255);
          });
        }
      });
    });

    it("isDestroyed", function () {
      points = new Vector3DTilePoints({});
      expect(points.isDestroyed()).toEqual(false);
      points.destroy();
      expect(points.isDestroyed()).toEqual(true);
    });
  },
  "WebGL"
);
