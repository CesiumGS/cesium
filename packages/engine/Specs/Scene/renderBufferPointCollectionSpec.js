import {
  BufferPoint,
  BufferPointCollection,
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
      const color = Color.RED;
      collection.add({ position: new Cartesian3(0, -1000, 0), color }, point);

      scene.primitives.add(collection);
      expect(scene).toRender([255, 0, 0, 255]);

      point.setColor(Color.GREEN);
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
      point.setColor(Color.RED);

      collection.add({ position: new Cartesian3(0, -1000, 0) }, point);
      point.setColor(Color.BLUE);

      scene.primitives.add(collection);
      expect(scene).toRender([255, 0, 0, 255]);

      const colorA = new Color();
      const colorB = new Color();
      collection.sort((a, b) =>
        a.getColor(colorA).blue > b.getColor(colorB).blue ? -1 : 1,
      );
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
