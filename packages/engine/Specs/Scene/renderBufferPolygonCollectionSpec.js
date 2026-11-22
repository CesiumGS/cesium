import { Cartesian3, Color, ComponentDatatype, Matrix4 } from "@cesium/core";
import {
  BlendOption,
  BufferPolygon,
  BufferPolygonCollection,
  BufferPolygonMaterial,
  Camera,
  HeightReference,
  SceneMode,
  renderBufferPolygonCollection,
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

    // prettier-ignore
    const positionsOutOfView = new Int32Array([
      -1000, +1000, -1000,
      -1000, +1000, +2000,
      -1000, +3000, -1000,
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
      scene.mode = SceneMode.SCENE3D;
      scene.camera = new Camera(scene);
      scene.camera.position = new Cartesian3(10.0, 0.0, 0.0);
      scene.camera.direction = new Cartesian3(-1, 0, 0);
      scene.camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
    });

    afterEach(function () {
      scene.primitives.removeAll();
      collection?.destroy();
      collection = undefined;
    });

    it("renders polygons", function () {
      collection = new BufferPolygonCollection({
        positionDatatype: ComponentDatatype.INT,
        blendOption: BlendOption.OPAQUE,
      });

      const polygon = new BufferPolygon();
      collection.add({ positions, triangles }, polygon);

      expect(scene).toRender([0, 0, 0, 255]);

      scene.primitives.add(collection);
      expect(scene).toRender([255, 255, 255, 255]);
    });

    [
      ComponentDatatype.SHORT,
      ComponentDatatype.FLOAT,
      ComponentDatatype.DOUBLE,
    ].forEach(function (positionDatatype) {
      it(`uploads sorted and updated polygon positions with datatype ${positionDatatype}`, function () {
        if (!scene.context.webgl2 || window.webglStub) {
          return;
        }
        collection = new BufferPolygonCollection({
          primitiveCountMax: 2,
          vertexCountMax: 6,
          triangleCountMax: 2,
          positionDatatype: positionDatatype,
        });
        const first = [1, 0, 0, 2, 0, 0, 1, 1, 0];
        const second = [4, 0, 0, 5, 0, 0, 4, 1, 0];
        collection.add({
          positions: ComponentDatatype.createTypedArray(
            positionDatatype,
            first,
          ),
          triangles: triangles,
        });
        collection.add({
          positions: ComponentDatatype.createTypedArray(
            positionDatatype,
            second,
          ),
          triangles: triangles,
        });
        scene.primitives.add(collection);
        scene.renderForSpecs();
        const secondConsumer = renderBufferPolygonCollection(
          collection,
          scene.frameState,
        );
        function readPositions(renderContext) {
          if (positionDatatype === ComponentDatatype.DOUBLE) {
            const high = new Float32Array(18);
            const low = new Float32Array(18);
            renderContext.vertexArray
              .getAttribute(0)
              .vertexBuffer.getBufferData(high);
            renderContext.vertexArray
              .getAttribute(1)
              .vertexBuffer.getBufferData(low);
            return Array.from(high, (value, index) => value + low[index]);
          }
          const result = ComponentDatatype.createTypedArray(
            positionDatatype,
            18,
          );
          renderContext.vertexArray
            .getAttribute(0)
            .vertexBuffer.getBufferData(result);
          return Array.from(result);
        }
        try {
          collection.sort((a, b) => b.getPositions()[0] - a.getPositions()[0]);
          scene.renderForSpecs();
          renderBufferPolygonCollection(
            collection,
            scene.frameState,
            secondConsumer,
          );
          expect(readPositions(collection._renderContext)).toEqual([
            ...second,
            ...first,
          ]);
          expect(readPositions(secondConsumer)).toEqual([...second, ...first]);

          const updated = first.concat(second).map((value) => value * 10);
          collection.setPositions(
            ComponentDatatype.createTypedArray(positionDatatype, updated),
            0,
            2,
          );
          scene.renderForSpecs();
          renderBufferPolygonCollection(
            collection,
            scene.frameState,
            secondConsumer,
          );
          expect(readPositions(collection._renderContext)).toEqual(updated);
          expect(readPositions(secondConsumer)).toEqual(updated);
        } finally {
          secondConsumer.destroy();
        }
      });
    });

    it("renders polygons after blendOption changes", function () {
      collection = new BufferPolygonCollection({
        positionDatatype: ComponentDatatype.INT,
        blendOption: BlendOption.OPAQUE,
      });

      const polygon = new BufferPolygon();
      const material = new BufferPolygonMaterial({
        color: Color.RED.withAlpha(0.5),
      });
      collection.add({ positions, triangles, material }, polygon);
      scene.primitives.add(collection);

      // Blending is disabled in the opaque pass, so alpha has no effect.
      expect(scene).toRender([255, 0, 0, 255]);

      collection.blendOption = BlendOption.TRANSLUCENT;
      expect(scene).toRender([128, 0, 0, 255]);

      collection.blendOption = BlendOption.OPAQUE;
      expect(scene).toRender([255, 0, 0, 255]);
    });

    it("does not render draped polygons", function () {
      collection = new BufferPolygonCollection({
        positionDatatype: ComponentDatatype.INT,
        blendOption: BlendOption.OPAQUE,
        heightReference: HeightReference.CLAMP_TO_TERRAIN,
      });

      const polygon = new BufferPolygon();
      collection.add({ positions, triangles }, polygon);

      scene.primitives.add(collection);
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("renders polygons with color", function () {
      collection = new BufferPolygonCollection({
        positionDatatype: ComponentDatatype.INT,
        blendOption: BlendOption.TRANSLUCENT, // override beforeEach
      });

      const polygon = new BufferPolygon();
      const material = new BufferPolygonMaterial({ color: Color.RED });
      collection.add({ positions, triangles, material }, polygon);

      scene.primitives.add(collection);
      expect(scene).toRender([255, 0, 0, 255]);

      Color.clone(Color.GREEN, material.color);
      polygon.setMaterial(material);
      expect(scene).toRender([0, 128, 0, 255]);

      material.color.alpha = 0.5;
      polygon.setMaterial(material);
      expect(scene).toRender([0, 64, 0, 255]);
    });

    it("renders polygons with updated positions", function () {
      collection = new BufferPolygonCollection({
        positionDatatype: ComponentDatatype.INT,
        blendOption: BlendOption.OPAQUE,
      });

      const polygon = new BufferPolygon();
      const material = new BufferPolygonMaterial();

      Color.fromBytes(255, 0, 0, 255, material.color);
      collection.add({ positions, triangles, material }, polygon);

      // Use extra primitive to keep bounding volume in view, and require
      // that geometry (not just bounding volume) is updated.
      Color.fromBytes(0, 0, 255, 255, material.color);
      collection.add({ positions, triangles, material }, polygon);

      scene.primitives.add(collection);
      expect(scene).toRender([255, 0, 0, 255]);

      collection.get(0, polygon);
      polygon.setPositions(positionsOutOfView);
      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("renders polygons with sort order", function () {
      collection = new BufferPolygonCollection({
        positionDatatype: ComponentDatatype.INT,
        blendOption: BlendOption.OPAQUE,
      });

      const polygon = new BufferPolygon();

      collection.add({ positions, triangles }, polygon);
      polygon.setMaterial(new BufferPolygonMaterial({ color: Color.RED }));

      collection.add({ positions, triangles }, polygon);
      polygon.setMaterial(new BufferPolygonMaterial({ color: Color.BLUE }));

      scene.primitives.add(collection);
      expect(scene).toRender([255, 0, 0, 255]);

      collection.sort((a, b) => b.featureId - a.featureId);
      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("renders polygons with updated modelMatrix", function () {
      collection = new BufferPolygonCollection({
        positionDatatype: ComponentDatatype.INT,
        blendOption: BlendOption.OPAQUE,
      });

      const polygon = new BufferPolygon();
      collection.add({ positions, triangles }, polygon);

      scene.primitives.add(collection);
      expect(scene).toRender([255, 255, 255, 255]);

      Matrix4.fromUniformScale(0.0, collection.modelMatrix);
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("does not render if empty", function () {
      collection = new BufferPolygonCollection({
        positionDatatype: ComponentDatatype.INT,
        blendOption: BlendOption.OPAQUE,
      });

      expect(scene).toRender([0, 0, 0, 255]);

      scene.primitives.add(collection);
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("does not render if collection.show = false", function () {
      collection = new BufferPolygonCollection({
        positionDatatype: ComponentDatatype.INT,
        blendOption: BlendOption.OPAQUE,
      });

      const polygon = new BufferPolygon();
      collection.add({ positions, triangles }, polygon);

      scene.primitives.add(collection);
      expect(scene).toRender([255, 255, 255, 255]);

      collection.show = false;
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("does not render if polygon.show = false", function () {
      collection = new BufferPolygonCollection({
        positionDatatype: ComponentDatatype.INT,
        blendOption: BlendOption.OPAQUE,
      });

      const polygon = new BufferPolygon();
      collection.add({ positions, triangles }, polygon);

      scene.primitives.add(collection);
      expect(scene).toRender([255, 255, 255, 255]);

      polygon.show = false;
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("picks polygons", () => {
      collection = new BufferPolygonCollection({
        positionDatatype: ComponentDatatype.INT,
        allowPicking: true,
      });

      const polygon = new BufferPolygon();
      collection.add({ positions, triangles }, polygon);
      collection.add({ positions, triangles }, polygon);

      scene.primitives.add(collection);

      // Polygons drawn and picked in collection order.
      expect(scene).toPickAndCall((result) => {
        expect(result.collection).toBe(collection);
        expect(result.index).toBe(0);
      });
    });

    it("drill picks polygons", () => {
      collection = new BufferPolygonCollection({
        positionDatatype: ComponentDatatype.INT,
        allowPicking: true,
      });

      const polygon = new BufferPolygon();
      const positionsBad = new Int32Array([0, 0, 0, 0, 0, 0]);
      collection.add({ positions, triangles }, polygon);
      collection.add({ positions: positionsBad }, polygon);
      collection.add({ positions, triangles }, polygon);

      scene.primitives.add(collection);

      // Polygons drawn and picked in collection order.
      expect(scene).toDrillPickAndCall((results) => {
        expect(results.map((r) => r.index)).toEqual([0, 2]);
      });
    });

    it("does not pick if picking disabled", () => {
      collection = new BufferPolygonCollection({
        positionDatatype: ComponentDatatype.INT,
        allowPicking: false,
      });

      const polygon = new BufferPolygon();
      collection.add({ positions, triangles }, polygon);

      scene.primitives.add(collection);

      expect(scene).toPickAndCall((result) => {
        expect(result).toBeUndefined();
      });
    });

    it("does not pick if empty", () => {
      collection = new BufferPolygonCollection({
        positionDatatype: ComponentDatatype.INT,
        allowPicking: true,
      });

      scene.primitives.add(collection);

      expect(scene).toPickAndCall((result) => {
        expect(result).toBeUndefined();
      });
    });

    it("does not pick if collection.show = false", () => {
      collection = new BufferPolygonCollection({
        positionDatatype: ComponentDatatype.INT,
        allowPicking: true,
      });

      const polygon = new BufferPolygon();
      collection.add({ positions, triangles }, polygon);

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

    it("does not pick if polygon.show = false", () => {
      collection = new BufferPolygonCollection({
        positionDatatype: ComponentDatatype.INT,
        allowPicking: true,
      });

      const polygon = new BufferPolygon();
      collection.add({ positions, triangles }, polygon);
      collection.add({ positions, triangles }, polygon);

      scene.primitives.add(collection);

      expect(scene).toPickAndCall((result) => {
        expect(result.collection).toBe(collection);
        expect(result.index).toBe(0);
      });

      collection.get(0, polygon).show = false;

      expect(scene).toPickAndCall((result) => {
        expect(result.collection).toBe(collection);
        expect(result.index).toBe(1);
      });

      collection.get(1, polygon).show = false;

      expect(scene).toPickAndCall((result) => {
        expect(result).toBeUndefined();
      });
    });
  },
  "WebGL",
);
