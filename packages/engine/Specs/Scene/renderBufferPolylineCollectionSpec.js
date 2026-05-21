import {
  BufferPolyline,
  BufferPolylineCollection,
  BufferPolylineMaterial,
  Camera,
  Color,
  ComponentDatatype,
  Matrix4,
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

      material.color.alpha = 0.5;
      line.setMaterial(material);
      expect(scene).toRender([0, 64, 0, 255]);
    });

    it("renders polylines with updated positions", function () {
      const line = new BufferPolyline();
      const material = new BufferPolylineMaterial();

      const positions = new Int32Array([0, -1000000, 0, 0, +1000000, 0]);
      const positionsOutOfView = new Int32Array([0, +5000, 0, 0, +1000000, 0]);

      Color.fromBytes(255, 0, 0, 255, material.color);
      collection.add({ positions, material }, line);

      // Use extra primitive to keep bounding volume in view, and require
      // that geometry (not just bounding volume) is updated.
      Color.fromBytes(0, 0, 255, 255, material.color);
      collection.add({ positions, material }, line);

      scene.primitives.add(collection);
      expect(scene).toRender([255, 0, 0, 255]);

      collection.get(0, line);
      line.setPositions(positionsOutOfView);
      expect(scene).toRender([0, 0, 255, 255]);
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

    it("renders polylines with updated modelMatrix", function () {
      const line = new BufferPolyline();
      const positions = new Int32Array([0, -1000000, 0, 0, +1000000, 0]);
      collection.add({ positions }, line);

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

    it("picks polylines", () => {
      collection = new BufferPolylineCollection({
        positionDatatype: ComponentDatatype.INT,
        allowPicking: true,
      });

      const polyline = new BufferPolyline();
      const positions = new Int32Array([0, -1000000, 0, 0, +1000000, 0]);
      collection.add({ positions }, polyline);
      collection.add({ positions }, polyline);

      scene.primitives.add(collection);

      // Polylines drawn and picked in collection order.
      expect(scene).toPickAndCall((result) => {
        expect(result.collection).toBe(collection);
        expect(result.index).toBe(0);
      });
    });

    it("drill picks polylines", () => {
      collection = new BufferPolylineCollection({
        positionDatatype: ComponentDatatype.INT,
        allowPicking: true,
      });

      const polyline = new BufferPolyline();
      const positions = new Int32Array([0, -1000000, 0, 0, +1000000, 0]);
      const positionsBad = new Int32Array([
        10e8, -1000000, 10e8, 10e8, +1000000, 10e8,
      ]);
      collection.add({ positions }, polyline);
      collection.add({ positions: positionsBad }, polyline);
      collection.add({ positions }, polyline);

      scene.primitives.add(collection);

      // Polylines drawn and picked in collection order.
      expect(scene).toDrillPickAndCall((results) => {
        expect(results.map((r) => r.index)).toEqual([0, 2]);
      });
    });

    it("does not pick if picking disabled", () => {
      collection = new BufferPolylineCollection({
        positionDatatype: ComponentDatatype.INT,
        allowPicking: false,
      });

      const polyline = new BufferPolyline();
      const positions = new Int32Array([0, -1000000, 0, 0, +1000000, 0]);
      collection.add({ positions }, polyline);

      scene.primitives.add(collection);

      expect(scene).toPickAndCall((result) => {
        expect(result).toBeUndefined();
      });
    });

    it("does not pick if empty", () => {
      collection = new BufferPolylineCollection({
        positionDatatype: ComponentDatatype.INT,
        allowPicking: true,
      });

      scene.primitives.add(collection);

      expect(scene).toPickAndCall((result) => {
        expect(result).toBeUndefined();
      });
    });

    it("does not pick if collection.show = false", () => {
      collection = new BufferPolylineCollection({
        positionDatatype: ComponentDatatype.INT,
        allowPicking: true,
      });

      const polyline = new BufferPolyline();
      const positions = new Int32Array([0, -1000000, 0, 0, +1000000, 0]);
      collection.add({ positions }, polyline);

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

    it("does not pick if polyline.show = false", () => {
      collection = new BufferPolylineCollection({
        positionDatatype: ComponentDatatype.INT,
        allowPicking: true,
      });

      const polyline = new BufferPolyline();
      const positions = new Int32Array([0, -1000000, 0, 0, +1000000, 0]);
      collection.add({ positions }, polyline);
      collection.add({ positions }, polyline);

      scene.primitives.add(collection);

      expect(scene).toPickAndCall((result) => {
        expect(result.collection).toBe(collection);
        expect(result.index).toBe(0);
      });

      collection.get(0, polyline).show = false;

      expect(scene).toPickAndCall((result) => {
        expect(result.collection).toBe(collection);
        expect(result.index).toBe(1);
      });

      collection.get(1, polyline).show = false;

      expect(scene).toPickAndCall((result) => {
        expect(result).toBeUndefined();
      });
    });
  },
  "WebGL",
);
