import {
  Cartesian3,
  Cesium3DTileVectorFeature,
  Color,
  BufferPointCollection,
  BufferPointMaterial,
} from "../../index.js";
import createScene from "../../../../Specs/createScene.js";

describe(
  "Scene/Cesium3DTileVectorFeature",
  () => {
    let scene;
    let content;

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      scene.primitives.removeAll();
      content = { tileset: {}, _collections: [] };
    });

    it("content", () => {
      const feature = new Cesium3DTileVectorFeature(content, 123);
      expect(feature.content).toBe(content);
    });

    it("tileset", () => {
      const feature = new Cesium3DTileVectorFeature(content, 123);
      expect(feature.tileset).toBe(content.tileset);
    });

    it("primitive", () => {
      const feature = new Cesium3DTileVectorFeature(content, 123);
      expect(feature.primitive).toBe(content.tileset);
    });

    it("featureId", () => {
      const feature = new Cesium3DTileVectorFeature(content, 123);
      expect(feature.featureId).toBe(123);
    });

    it("pickIds", () => {
      const points1 = new BufferPointCollection({ primitiveCountMax: 16 });
      const points2 = new BufferPointCollection({ primitiveCountMax: 32 });

      content._collections.push(points1, points2);
      const feature = new Cesium3DTileVectorFeature(content, 123);

      const point1 = points1.add({ position: Cartesian3.UNIT_X });
      point1._pickId = 101;
      feature.addPrimitiveByCollection(0, points1.primitiveCount - 1);

      points1.add({ position: Cartesian3.UNIT_Y }); // Skip.

      const point2 = points1.add({ position: Cartesian3.UNIT_Z });
      point2._pickId = 102;
      feature.addPrimitiveByCollection(0, points1.primitiveCount - 1);

      const point3 = points2.add({ position: Cartesian3.UNIT_X });
      point3._pickId = 103;
      feature.addPrimitiveByCollection(1, points2.primitiveCount - 1);

      expect(feature.pickIds).toEqual([101, 102, 103]);
    });

    it("show", () => {
      const points1 = new BufferPointCollection({ primitiveCountMax: 16 });
      const points2 = new BufferPointCollection({ primitiveCountMax: 32 });

      content._collections.push(points1, points2);
      const feature = new Cesium3DTileVectorFeature(content, 123);

      const point1 = points1.add({ position: Cartesian3.UNIT_X, show: false });
      feature.addPrimitiveByCollection(0, points1.primitiveCount - 1);

      points1.add({ position: Cartesian3.UNIT_Y }); // Skip.

      const point2 = points1.add({ position: Cartesian3.UNIT_Z, show: false });
      feature.addPrimitiveByCollection(0, points1.primitiveCount - 1);

      const point3 = points2.add({ position: Cartesian3.UNIT_X, show: false });
      feature.addPrimitiveByCollection(1, points2.primitiveCount - 1);

      expect(feature.show).toBe(false);

      point2.show = true;

      expect(feature.show).toBe(true);

      feature.show = true;

      expect([point1.show, point2.show, point3.show]).toEqual([
        true,
        true,
        true,
      ]);

      feature.show = false;

      expect([point1.show, point2.show, point3.show]).toEqual([
        false,
        false,
        false,
      ]);
    });

    it("color", () => {
      const points1 = new BufferPointCollection({ primitiveCountMax: 16 });
      const points2 = new BufferPointCollection({ primitiveCountMax: 32 });

      content._collections.push(points1, points2);
      const feature = new Cesium3DTileVectorFeature(content, 123);

      const material = new BufferPointMaterial({ color: Color.ORANGE });

      const point1 = points1.add({ position: Cartesian3.UNIT_X, material });
      feature.addPrimitiveByCollection(0, points1.primitiveCount - 1);

      points1.add({ position: Cartesian3.UNIT_Y }); // Skip.

      const point2 = points1.add({ position: Cartesian3.UNIT_Z, material });
      feature.addPrimitiveByCollection(0, points1.primitiveCount - 1);

      const point3 = points2.add({ position: Cartesian3.UNIT_X, material });
      feature.addPrimitiveByCollection(1, points2.primitiveCount - 1);

      expect(feature.color).toEqual(Color.ORANGE);

      feature.color = Color.CYAN;

      expect(feature.color).toEqual(Color.CYAN);
      expect(point1.getMaterial(material).color).toEqual(Color.CYAN);
      expect(point2.getMaterial(material).color).toEqual(Color.CYAN);
      expect(point3.getMaterial(material).color).toEqual(Color.CYAN);
    });

    it("hasProperty", () => {
      const hasProperty = jasmine
        .createSpy("hasProperty")
        .and.returnValue(true);

      content.batchTable = { hasProperty };

      const feature = new Cesium3DTileVectorFeature(content, 123);

      expect(feature.hasProperty("my-prop")).toBe(true);
      expect(hasProperty).toHaveBeenCalledOnceWith(123, "my-prop");
    });

    it("getProperty", () => {
      const getProperty = jasmine
        .createSpy("getProperty")
        .and.returnValue("hello world");

      content.batchTable = { getProperty };

      const feature = new Cesium3DTileVectorFeature(content, 123);

      expect(feature.getProperty("my-prop")).toBe("hello world");
      expect(getProperty).toHaveBeenCalledOnceWith(123, "my-prop");
    });

    it("getPropertyIds", () => {
      const getPropertyIds = jasmine
        .createSpy("getPropertyIds")
        .and.callFake((_, results) => results);

      content.batchTable = { getPropertyIds };

      const feature = new Cesium3DTileVectorFeature(content, 123);

      const results = [];

      expect(feature.getPropertyIds(results)).toBe(results);
      expect(getPropertyIds).toHaveBeenCalledOnceWith(123, results);
    });
  },
  "WebGL",
);
