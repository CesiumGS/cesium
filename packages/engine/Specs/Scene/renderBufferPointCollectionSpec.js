import { Cartesian3, Color, ComponentDatatype, Matrix4 } from "@cesium/core";
import {
  BlendOption,
  BufferPoint,
  BufferPointCollection,
  BufferPointMaterial,
  Camera,
  SceneMode,
  renderBufferPointCollection,
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
      scene.mode = SceneMode.SCENE3D;
      scene.camera = new Camera(scene);
    });

    afterEach(function () {
      scene.primitives.removeAll();
      collection?.destroy();
      collection = undefined;
    });

    it("renders points", function () {
      collection = new BufferPointCollection({
        blendOption: BlendOption.OPAQUE,
      });

      const point = new BufferPoint();
      collection.add({ position: new Cartesian3(0, -1000, 0) }, point);

      expect(scene).toRender([0, 0, 0, 255]);

      scene.primitives.add(collection);
      expect(scene).toRender([255, 255, 255, 255]);
    });

    it("renders points after blendOption changes", function () {
      collection = new BufferPointCollection({
        blendOption: BlendOption.OPAQUE,
      });

      const point = new BufferPoint();
      const material = new BufferPointMaterial({
        color: Color.RED.withAlpha(0.5),
        size: 8,
      });
      collection.add(
        { position: new Cartesian3(0, -1000, 0), material },
        point,
      );
      scene.primitives.add(collection);

      // Blending is disabled in the opaque pass, so alpha has no effect.
      expect(scene).toRender([255, 0, 0, 255]);

      collection.blendOption = BlendOption.TRANSLUCENT;
      expect(scene).toRender([128, 0, 0, 255]);

      collection.blendOption = BlendOption.OPAQUE;
      expect(scene).toRender([255, 0, 0, 255]);
    });

    it("renders points with color", function () {
      collection = new BufferPointCollection({
        blendOption: BlendOption.TRANSLUCENT,
      });

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
      collection = new BufferPointCollection({
        blendOption: BlendOption.OPAQUE,
      });

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

    it("renders points after GPU resources are destroyed", function () {
      collection = new BufferPointCollection({
        blendOption: BlendOption.OPAQUE,
      });

      const point = new BufferPoint();
      const material = new BufferPointMaterial({ color: Color.RED, size: 8 });
      collection.add(
        { position: new Cartesian3(0, -1000, 0), material },
        point,
      );

      scene.primitives.add(collection);
      expect(scene).toRender([255, 0, 0, 255]);

      collection.destroy();
      expect(scene).toRender([255, 0, 0, 255]);
    });

    it("renders points with sort order", function () {
      collection = new BufferPointCollection({
        blendOption: BlendOption.OPAQUE,
      });

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

    [
      ComponentDatatype.SHORT,
      ComponentDatatype.FLOAT,
      ComponentDatatype.DOUBLE,
    ].forEach(function (positionDatatype) {
      it(`uploads sorted and updated point positions with datatype ${positionDatatype}`, function () {
        if (!scene.context.webgl2 || window.webglStub) {
          return;
        }
        collection = new BufferPointCollection({
          primitiveCountMax: 2,
          positionDatatype: positionDatatype,
        });
        collection.add({ position: new Cartesian3(1, 2, 3) });
        collection.add({ position: new Cartesian3(4, 5, 6) });
        scene.primitives.add(collection);
        scene.renderForSpecs();
        const secondConsumer = renderBufferPointCollection(
          collection,
          scene.frameState,
        );
        const firstPosition = new Cartesian3();
        const secondPosition = new Cartesian3();
        function readPositions(renderContext) {
          if (positionDatatype === ComponentDatatype.DOUBLE) {
            const high = new Float32Array(6);
            const low = new Float32Array(6);
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
            6,
          );
          renderContext.vertexArray
            .getAttribute(0)
            .vertexBuffer.getBufferData(result);
          return Array.from(result);
        }
        try {
          collection.sort(
            (a, b) =>
              b.getPosition(secondPosition).x - a.getPosition(firstPosition).x,
          );
          scene.renderForSpecs();
          renderBufferPointCollection(
            collection,
            scene.frameState,
            secondConsumer,
          );
          expect(readPositions(collection._renderContext)).toEqual([
            4, 5, 6, 1, 2, 3,
          ]);
          expect(readPositions(secondConsumer)).toEqual([4, 5, 6, 1, 2, 3]);

          collection.setPositions(
            ComponentDatatype.createTypedArray(
              positionDatatype,
              [10, 20, 30, 40, 50, 60],
            ),
            0,
            2,
          );
          scene.renderForSpecs();
          renderBufferPointCollection(
            collection,
            scene.frameState,
            secondConsumer,
          );
          expect(readPositions(collection._renderContext)).toEqual([
            10, 20, 30, 40, 50, 60,
          ]);
          expect(readPositions(secondConsumer)).toEqual([
            10, 20, 30, 40, 50, 60,
          ]);
        } finally {
          secondConsumer.destroy();
        }
      });
    });

    it("renders points with updated modelMatrix", function () {
      collection = new BufferPointCollection({
        blendOption: BlendOption.OPAQUE,
      });

      const point = new BufferPoint();
      collection.add({ position: new Cartesian3(0, -1000, 0) }, point);

      scene.primitives.add(collection);
      expect(scene).toRender([255, 255, 255, 255]);

      Matrix4.fromUniformScale(0.0, collection.modelMatrix);
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("draws a nearer translucent point over a farther one without OIT", function () {
      const sceneWithoutOIT = createScene({
        orderIndependentTranslucency: false,
      });
      sceneWithoutOIT.camera.position = new Cartesian3(10.0, 0.0, 0.0);
      sceneWithoutOIT.camera.direction = new Cartesian3(-1.0, 0.0, 0.0);
      sceneWithoutOIT.camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);

      collection = new BufferPointCollection();
      const point = new BufferPoint();
      const near = new BufferPointMaterial({ color: Color.RED, size: 16 });
      const far = new BufferPointMaterial({ color: Color.LIME, size: 16 });
      collection.add(
        { position: new Cartesian3(5, 0, 0), material: near },
        point,
      );
      collection.add(
        { position: new Cartesian3(-5, 0, 0), material: far },
        point,
      );
      sceneWithoutOIT.primitives.add(collection);

      expect(sceneWithoutOIT).toRender([255, 0, 0, 255]);

      sceneWithoutOIT.primitives.removeAll();
      sceneWithoutOIT.destroyForSpecs();
    });

    it("does not render if empty", function () {
      collection = new BufferPointCollection({
        blendOption: BlendOption.OPAQUE,
      });

      expect(scene).toRender([0, 0, 0, 255]);

      scene.primitives.add(collection);
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("does not render if collection.show = false", function () {
      collection = new BufferPointCollection({
        blendOption: BlendOption.OPAQUE,
      });

      const point = new BufferPoint();
      collection.add({ position: new Cartesian3(0, -1000, 0) }, point);

      scene.primitives.add(collection);
      expect(scene).toRender([255, 255, 255, 255]);

      collection.show = false;
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("does not render if point.show = false", function () {
      collection = new BufferPointCollection({
        blendOption: BlendOption.OPAQUE,
      });

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
