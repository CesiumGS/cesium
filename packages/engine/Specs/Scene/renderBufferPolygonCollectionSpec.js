import {
  BufferPolygon,
  BufferPolygonCollection,
  Camera,
  Cartesian3,
  Color,
  ComponentDatatype,
  SceneMode,
} from "../../index.js";

import createScene from "../../../../Specs/createScene.js";

describe(
  "Scene/renderBufferPolygonCollection",
  () => {
    let scene;
    let collection;

    // prettier-ignore
    const positions = new Int32Array([
      -1000, -1000, -1000,
      -1000, -1000, +2000,
      -1000, +2000, -1000,
    ]);

    const triangles = new Uint16Array([0, 1, 2]);

    beforeAll(function () {
      scene = createScene();
      scene.primitives.destroyPrimitives = false;
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      collection = new BufferPolygonCollection({
        positionDatatype: ComponentDatatype.INT,
      });
      scene.mode = SceneMode.SCENE3D;
      scene.camera = new Camera(scene);
      scene.camera.position = new Cartesian3(10.0, 0.0, 0.0);
      scene.camera.direction = new Cartesian3(-1, 0, 0);
      scene.camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
    });

    afterEach(function () {
      scene.primitives.removeAll();
      if (!collection.isDestroyed()) {
        collection.destroy();
      }
    });

    it("renders polygons", function () {
      const polygon = new BufferPolygon();
      collection.add({ positions, triangles }, polygon);

      expect(scene).toRender([0, 0, 0, 255]);

      scene.primitives.add(collection);
      expect(scene).toRender([255, 255, 255, 255]);
    });

    it("renders polygons with color", function () {
      const polygon = new BufferPolygon();
      collection.add({ positions, triangles, color: Color.RED }, polygon);

      scene.primitives.add(collection);
      expect(scene).toRender([255, 0, 0, 255]);

      polygon.setColor(Color.GREEN);
      expect(scene).toRender([0, 128, 0, 255]);
    });

    it("renders polygons with updated positions", function () {
      // prettier-ignore
      const badPositions = new Int32Array([
        -1000, +1000, -1000,
        -1000, +1000, +2000,
        -1000, +3000, -1000,
      ]);

      const polygon = new BufferPolygon();
      collection.add({ positions: badPositions, triangles }, polygon);

      scene.primitives.add(collection);
      expect(scene).toRender([0, 0, 0, 255]);

      polygon.setPositions(positions);
      expect(scene).toRender([255, 255, 255, 255]);
    });

    it("renders polygons with sort order", function () {
      const polygon = new BufferPolygon();

      collection.add({ positions, triangles }, polygon);
      polygon.setColor(Color.RED);

      collection.add({ positions, triangles }, polygon);
      polygon.setColor(Color.BLUE);

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
      const polygon = new BufferPolygon();
      collection.add({ positions, triangles }, polygon);

      scene.primitives.add(collection);
      expect(scene).toRender([255, 255, 255, 255]);

      collection.show = false;
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("does not render if polygon.show = false", function () {
      const polygon = new BufferPolygon();
      collection.add({ positions, triangles }, polygon);

      scene.primitives.add(collection);
      expect(scene).toRender([255, 255, 255, 255]);

      polygon.show = false;
      expect(scene).toRender([0, 0, 0, 255]);
    });
  },
  "WebGL",
);
