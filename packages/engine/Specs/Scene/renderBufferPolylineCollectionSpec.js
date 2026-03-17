import {
  BufferPolyline,
  BufferPolylineCollection,
  BufferPolylineMaterial,
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
      const material = new BufferPolylineMaterial({ color: Color.RED });
      collection.add({ positions, material }, line);

      scene.primitives.add(collection);
      expect(scene).toRender([255, 0, 0, 255]);

      Color.clone(Color.GREEN, material.color);
      line.setMaterial(material);
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
      line.setMaterial(new BufferPolylineMaterial({ color: Color.RED }));

      collection.add({ positions }, line);
      line.setMaterial(new BufferPolylineMaterial({ color: Color.BLUE }));

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
