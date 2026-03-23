import {
  BufferPoint,
  BufferPointCollection,
  BufferPointMaterial,
  Camera,
  Cartesian3,
  Color,
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
    });

    it("renders points with updated positions", function () {
      const point = new BufferPoint();
      collection.add({ position: new Cartesian3(0, 0, 0) }, point);

      scene.primitives.add(collection);
      expect(scene).toRender([0, 0, 0, 255]);

      point.setPosition(new Cartesian3(0, -1000, 0));
      expect(scene).toRender([255, 255, 255, 255]);
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
  },
  "WebGL",
);
