import { Cartesian3, Color } from "@cesium/core";
import {
  BlendOption,
  BufferPoint,
  BufferPointCollection,
  BufferPolylineCollection,
  Camera,
  CircleSymbolizer,
  CircleVectorPrimitive,
  SceneMode,
  VectorStyle,
  VectorStyleRule,
} from "../../index.js";
import createScene from "../../../../Specs/createScene.js";

describe(
  "Scene/VectorStyle",
  () => {
    let scene;
    let collection;

    const position = new Cartesian3(0, -1000, 0);

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      scene.mode = SceneMode.SCENE3D;
      scene.camera = new Camera(scene);
      collection = new BufferPointCollection();
    });

    afterEach(function () {
      scene.primitives.removeAll();
      collection.destroy();
    });

    it("adds rules in order", function () {
      const first = new VectorStyleRule({ symbolizers: [] });
      const second = new VectorStyleRule({ symbolizers: [] });
      const style = new VectorStyle({ rules: [first] });

      style.addRule(second);

      expect(style.rules).toEqual([first, second]);
    });

    it("creates one primitive per symbolizer in rule and symbolizer order", function () {
      const style = new VectorStyle({
        rules: [
          new VectorStyleRule({
            condition: "${important}",
            symbolizers: [
              new CircleSymbolizer({ radius: 1 }),
              new CircleSymbolizer({ radius: 2 }),
            ],
          }),
          new VectorStyleRule({
            symbolizers: [new CircleSymbolizer({ radius: 3 })],
          }),
        ],
      });

      const primitives = style.createPrimitives(collection);

      expect(primitives.length).toBe(3);
      expect(primitives[0]).toBeInstanceOf(CircleVectorPrimitive);
      expect(primitives.map((primitive) => primitive.radius)).toEqual([
        1, 2, 3,
      ]);
      expect(primitives.every((p) => p.collection === collection)).toBe(true);

      for (const primitive of primitives) {
        primitive.destroy();
      }
    });

    it("creates no circle primitives for a polyline collection", function () {
      const polylines = new BufferPolylineCollection();
      const style = new VectorStyle({
        rules: [new VectorStyleRule({ symbolizers: [new CircleSymbolizer()] })],
      });

      expect(style.createPrimitives(polylines)).toEqual([]);

      polylines.destroy();
    });

    it("draws a point with the first rule its feature matches", function () {
      collection.add(
        {
          position,
          pickObject: {
            getPropertyInherited: (name) =>
              name === "type" ? "school" : undefined,
          },
        },
        new BufferPoint(),
      );
      const style = new VectorStyle({
        rules: [
          new VectorStyleRule({
            condition: "${type} === 'school'",
            symbolizers: [
              new CircleSymbolizer({
                color: Color.LIME,
                blendOption: BlendOption.OPAQUE,
              }),
            ],
          }),
          new VectorStyleRule({
            symbolizers: [
              new CircleSymbolizer({
                color: Color.RED,
                blendOption: BlendOption.OPAQUE,
              }),
            ],
          }),
        ],
      });

      for (const primitive of style.createPrimitives(collection)) {
        scene.primitives.add(primitive);
      }

      expect(scene).toRender([0, 255, 0, 255]);
    });

    it("draws a point with a later rule when earlier rules do not match", function () {
      collection.add(
        {
          position,
          pickObject: {
            getPropertyInherited: (name) =>
              name === "type" ? "shop" : undefined,
          },
        },
        new BufferPoint(),
      );
      const style = new VectorStyle({
        rules: [
          new VectorStyleRule({
            condition: "${type} === 'school'",
            symbolizers: [
              new CircleSymbolizer({
                color: Color.LIME,
                blendOption: BlendOption.OPAQUE,
              }),
            ],
          }),
          new VectorStyleRule({
            symbolizers: [
              new CircleSymbolizer({
                color: Color.RED,
                blendOption: BlendOption.OPAQUE,
              }),
            ],
          }),
        ],
      });

      for (const primitive of style.createPrimitives(collection)) {
        scene.primitives.add(primitive);
      }

      expect(scene).toRender([255, 0, 0, 255]);
    });

    it("does not draw a point that matches no rule", function () {
      collection.add(
        {
          position,
          pickObject: {
            getPropertyInherited: (name) =>
              name === "type" ? "shop" : undefined,
          },
        },
        new BufferPoint(),
      );
      const style = new VectorStyle({
        rules: [
          new VectorStyleRule({
            condition: "${type} === 'school'",
            symbolizers: [
              new CircleSymbolizer({ blendOption: BlendOption.OPAQUE }),
            ],
          }),
        ],
      });

      for (const primitive of style.createPrimitives(collection)) {
        scene.primitives.add(primitive);
      }

      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("evaluates a color expression for each feature", function () {
      collection.add(
        {
          position,
          pickObject: {
            getPropertyInherited: (name) =>
              name === "colorName" ? "lime" : undefined,
          },
        },
        new BufferPoint(),
      );
      const style = new VectorStyle({
        rules: [
          new VectorStyleRule({
            symbolizers: [
              new CircleSymbolizer({
                color: "color(${colorName})",
                blendOption: BlendOption.OPAQUE,
              }),
            ],
          }),
        ],
      });

      for (const primitive of style.createPrimitives(collection)) {
        scene.primitives.add(primitive);
      }

      expect(scene).toRender([0, 255, 0, 255]);
    });

    it("evaluates a number expression for each feature", function () {
      collection.add(
        {
          position,
          pickObject: {
            getPropertyInherited: (name) => (name === "size" ? 0.0 : undefined),
          },
        },
        new BufferPoint(),
      );
      const style = new VectorStyle({
        rules: [
          new VectorStyleRule({
            symbolizers: [
              new CircleSymbolizer({
                radius: "${size}",
                color: Color.RED,
                outlineColor: Color.BLUE,
                outlineWidth: 4.0,
                blendOption: BlendOption.OPAQUE,
              }),
            ],
          }),
        ],
      });

      for (const primitive of style.createPrimitives(collection)) {
        scene.primitives.add(primitive);
      }

      expect(scene).toRender([0, 0, 255, 255]);
    });
  },
  "WebGL",
);
