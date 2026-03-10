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
    let points;

    beforeAll(function () {
      scene = createScene();
      scene.primitives.destroyPrimitives = false;
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      points = new BufferPointCollection();
      scene.mode = SceneMode.SCENE3D;
      scene.camera = new Camera(scene);
    });

    afterEach(function () {
      scene.primitives.removeAll();
      if (!points.isDestroyed()) {
        points.destroy();
      }
    });

    it("renders points", function () {
      const point = new BufferPoint();
      points.add({ position: new Cartesian3(0, -1000, 0) }, point);

      expect(scene).toRender([0, 0, 0, 255]);

      scene.primitives.add(points);
      expect(scene).toRender([255, 255, 255, 255]);
    });

    it("renders points with color", function () {
      const point = new BufferPoint();
      const color = Color.RED;
      points.add({ position: new Cartesian3(0, -1000, 0), color }, point);

      expect(scene).toRender([0, 0, 0, 255]);

      scene.primitives.add(points);
      expect(scene).toRender([255, 0, 0, 255]);

      point.setColor(Color.GREEN);
      expect(scene).toRender([0, 128, 0, 255]);
    });

    it("renders points with updated positions", function () {
      const point = new BufferPoint();
      points.add({ position: new Cartesian3(0, 0, 0) }, point);

      scene.primitives.add(points);
      expect(scene).toRender([0, 0, 0, 255]);

      point.setPosition(new Cartesian3(0, -1000, 0));
      expect(scene).toRender([255, 255, 255, 255]);
    });

    it("renders points with sort order", function () {
      const point = new BufferPoint();

      points.add({ position: new Cartesian3(0, -1000, 0) }, point);
      point.setColor(Color.RED);

      points.add({ position: new Cartesian3(0, -1000, 0) }, point);
      point.setColor(Color.BLUE);

      scene.primitives.add(points);
      expect(scene).toRender([255, 0, 0, 255]);

      const colorA = new Color();
      const colorB = new Color();
      points.sort((a, b) =>
        a.getColor(colorA).blue > b.getColor(colorB).blue ? -1 : 1,
      );
      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("does not render if empty", function () {
      expect(scene).toRender([0, 0, 0, 255]);

      scene.primitives.add(points);
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("does not render if collection.show = false", function () {
      const point = new BufferPoint();
      points.add({ position: new Cartesian3(0, -1000, 0) }, point);

      scene.primitives.add(points);
      expect(scene).toRender([255, 255, 255, 255]);

      points.show = false;
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("does not render if point.show = false", function () {
      const point = new BufferPoint();
      points.add({ position: new Cartesian3(0, -1000, 0) }, point);

      scene.primitives.add(points);
      expect(scene).toRender([255, 255, 255, 255]);

      point.show = false;
      expect(scene).toRender([0, 0, 0, 255]);
    });
  },
  "WebGL",
);
