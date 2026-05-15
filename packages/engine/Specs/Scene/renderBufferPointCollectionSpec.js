import {
  BufferPoint,
  BufferPointCollection,
  BufferPointMaterial,
  Camera,
  Cartesian3,
  Color,
  Matrix4,
  SceneMode,
} from "../../index.js";

import createScene from "../../../../Specs/createScene.js";

describe(
  "Scene/renderBufferPointCollection",
  () => {
    let scene;
    let collection;

    beforeAll(function () {
      scene = createScene();
      scene.primitives.destroyPrimitives = false;
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      collection = new BufferPointCollection();
      scene.mode = SceneMode.SCENE3D;
      scene.camera = new Camera(scene);
    });

    afterEach(function () {
      scene.primitives.removeAll();
      if (!collection.isDestroyed()) {
        collection.destroy();
      }
    });

    it("renders points", function () {
      const point = new BufferPoint();
      collection.add({ position: new Cartesian3(0, -1000, 0) }, point);

      expect(scene).toRender([0, 0, 0, 255]);

      scene.primitives.add(collection);
      expect(scene).toRender([255, 255, 255, 255]);
    });

    it("renders points with color", function () {
      const point = new BufferPoint();
      const material = new BufferPointMaterial({ color: Color.RED, size: 8 });

      collection.add(
        { position: new Cartesian3(0, -1000, 0), material },
        point,
      );

      scene.primitives.add(collection);
      expect(scene).toRender([255, 0, 0, 255]);

      Color.clone(Color.GREEN, material.color);
      point.setMaterial(material);
      expect(scene).toRender([0, 128, 0, 255]);

      material.color.alpha = 0.5;
      point.setMaterial(material);
      expect(scene).toRender([0, 64, 0, 255]);
    });

    it("renders points with updated positions", function () {
      const point = new BufferPoint();
      const material = new BufferPointMaterial({ size: 8 });
      const position = new Cartesian3(0, -1000, 0);

      Color.fromBytes(255, 0, 0, 255, material.color);
      collection.add({ position, material }, point);

      // Use extra primitive to keep bounding volume in view, and require
      // that geometry (not just bounding volume) is updated.
      Color.fromBytes(0, 0, 255, 255, material.color);
      collection.add({ position, material }, point);

      scene.primitives.add(collection);
      expect(scene).toRender([255, 0, 0, 255]);

      collection.get(0, point);
      point.setPosition(new Cartesian3(1e6, 1e6, 1e6));
      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("renders points with sort order", function () {
      const point = new BufferPoint();

      collection.add({ position: new Cartesian3(0, -1000, 0) }, point);
      point.setMaterial(new BufferPointMaterial({ color: Color.RED, size: 8 }));

      collection.add({ position: new Cartesian3(0, -1000, 0) }, point);
      point.setMaterial(
        new BufferPointMaterial({ color: Color.BLUE, size: 8 }),
      );

      scene.primitives.add(collection);
      expect(scene).toRender([255, 0, 0, 255]);

      collection.sort((a, b) => b.featureId - a.featureId);
      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("renders points with updated modelMatrix", function () {
      const point = new BufferPoint();
      collection.add({ position: new Cartesian3(0, -1000, 0) }, point);

      scene.primitives.add(collection);
      expect(scene).toRender([255, 255, 255, 255]);

      Matrix4.fromUniformScale(0.0, collection.modelMatrix);
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("does not render if empty", function () {
      expect(scene).toRender([0, 0, 0, 255]);

      scene.primitives.add(collection);
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("does not render if collection.show = false", function () {
      const point = new BufferPoint();
      collection.add({ position: new Cartesian3(0, -1000, 0) }, point);

      scene.primitives.add(collection);
      expect(scene).toRender([255, 255, 255, 255]);

      collection.show = false;
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("does not render if point.show = false", function () {
      const point = new BufferPoint();
      collection.add({ position: new Cartesian3(0, -1000, 0) }, point);

      scene.primitives.add(collection);
      expect(scene).toRender([255, 255, 255, 255]);

      point.show = false;
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("picks points", () => {
      collection = new BufferPointCollection({ allowPicking: true });

      const point = new BufferPoint();
      const position = new Cartesian3(0, -1000, 0);
      collection.add({ position }, point);
      collection.add({ position }, point);

      scene.primitives.add(collection);

      // Points drawn and picked in collection order.
      expect(scene).toPickAndCall((result) => {
        expect(result.collection).toBe(collection);
        expect(result.index).toBe(0);
      });
    });

    it("drill picks points", () => {
      collection = new BufferPointCollection({ allowPicking: true });

      const point = new BufferPoint();
      const position = new Cartesian3(0, -1000, 0);
      const positionBad = new Cartesian3(-10e8, 0, 0);
      collection.add({ position }, point);
      collection.add({ position: positionBad }, point);
      collection.add({ position }, point);

      scene.primitives.add(collection);

      // Points drawn and picked in collection order.
      expect(scene).toDrillPickAndCall((results) => {
        expect(results.map((r) => r.index)).toEqual([0, 2]);
      });
    });

    it("does not pick if picking disabled", () => {
      collection = new BufferPointCollection({ allowPicking: false });

      const point = new BufferPoint();
      const position = new Cartesian3(0, -1000, 0);
      collection.add({ position }, point);

      scene.primitives.add(collection);

      expect(scene).toPickAndCall((result) => {
        expect(result).toBeUndefined();
      });
    });

    it("does not pick if empty", () => {
      collection = new BufferPointCollection({ allowPicking: true });

      scene.primitives.add(collection);

      expect(scene).toPickAndCall((result) => {
        expect(result).toBeUndefined();
      });
    });

    it("does not pick if collection.show = false", () => {
      collection = new BufferPointCollection({ allowPicking: true });

      const point = new BufferPoint();
      const position = new Cartesian3(0, -1000, 0);
      collection.add({ position }, point);

      scene.primitives.add(collection);

      expect(scene).toPickAndCall((result) => {
        expect(result.collection).toBe(collection);
        expect(result.index).toBe(0);
      });

      collection.show = false;

      expect(scene).toPickAndCall((result) => {
        expect(result).toBeUndefined();
      });
    });

    it("does not pick if point.show = false", () => {
      collection = new BufferPointCollection({ allowPicking: true });

      const point = new BufferPoint();
      const position = new Cartesian3(0, -1000, 0);
      collection.add({ position }, point);
      collection.add({ position }, point);

      scene.primitives.add(collection);

      expect(scene).toPickAndCall((result) => {
        expect(result.collection).toBe(collection);
        expect(result.index).toBe(0);
      });

      collection.get(0, point).show = false;

      expect(scene).toPickAndCall((result) => {
        expect(result.collection).toBe(collection);
        expect(result.index).toBe(1);
      });

      collection.get(1, point).show = false;

      expect(scene).toPickAndCall((result) => {
        expect(result).toBeUndefined();
      });
    });
  },
  "WebGL",
);
