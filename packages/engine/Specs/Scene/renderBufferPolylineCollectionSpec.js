import {
  BufferPolyline,
  BufferPolylineCollection,
  Camera,
  Color,
  ComponentDatatype,
  SceneMode,
} from "../../index.js";

import createScene from "../../../../Specs/createScene.js";

describe(
  "Scene/renderBufferPolylineCollection",
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
      collection = new BufferPolylineCollection({
        positionDatatype: ComponentDatatype.INT,
      });
      scene.mode = SceneMode.SCENE3D;
      scene.camera = new Camera(scene);
    });

    afterEach(function () {
      scene.primitives.removeAll();
      if (!collection.isDestroyed()) {
        collection.destroy();
      }
    });

    it("renders polylines", function () {
      const line = new BufferPolyline();
      const positions = new Int32Array([0, -1000000, 0, 0, +1000000, 0]);
      collection.add({ positions }, line);

      expect(scene).toRender([0, 0, 0, 255]);

      scene.primitives.add(collection);
      expect(scene).toRender([255, 255, 255, 255]);
    });

    it("renders polylines with color", function () {
      const line = new BufferPolyline();
      const positions = new Int32Array([0, -1000000, 0, 0, +1000000, 0]);
      collection.add({ positions, color: Color.RED }, line);

      scene.primitives.add(collection);
      expect(scene).toRender([255, 0, 0, 255]);

      line.setColor(Color.GREEN);
      expect(scene).toRender([0, 128, 0, 255]);
    });

    it("renders polylines with updated positions", function () {
      const line = new BufferPolyline();
      const positions = new Int32Array([0, +5000, 0, 0, +1000000, 0]);
      collection.add({ positions }, line);

      scene.primitives.add(collection);
      expect(scene).toRender([0, 0, 0, 255]);

      line.setPositions(new Int32Array([0, -1000000, 0, 0, +1000000, 0]));
      expect(scene).toRender([255, 255, 255, 255]);
    });

    it("renders polylines with sort order", function () {
      const line = new BufferPolyline();
      const positions = new Int32Array([0, -1000000, 0, 0, +1000000, 0]);

      collection.add({ positions }, line);
      line.setColor(Color.RED);

      collection.add({ positions }, line);
      line.setColor(Color.BLUE);

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
      const line = new BufferPolyline();
      const positions = new Int32Array([0, -1000000, 0, 0, +1000000, 0]);
      collection.add({ positions }, line);

      scene.primitives.add(collection);
      expect(scene).toRender([255, 255, 255, 255]);

      collection.show = false;
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("does not render if polyline.show = false", function () {
      const line = new BufferPolyline();
      const positions = new Int32Array([0, -1000000, 0, 0, +1000000, 0]);
      collection.add({ positions }, line);

      scene.primitives.add(collection);
      expect(scene).toRender([255, 255, 255, 255]);

      line.show = false;
      expect(scene).toRender([0, 0, 0, 255]);
    });
  },
  "WebGL",
);
