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
  SymbologyLayer,
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

    it("keeps the rules in order", function () {
      const first = new VectorStyleRule({ symbolizers: [] });
      const second = new VectorStyleRule({ symbolizers: [] });
      const style = new VectorStyle({ rules: [first, second] });

      expect(style.rules).toEqual([first, second]);
    });

    it("creates one group per symbology layer, in zIndex then declaration order", function () {
      const style = new VectorStyle({
        rules: [
          new VectorStyleRule({
            condition: "${important}",
            symbologyLayers: [
              new SymbologyLayer({
                name: "poi-icon",
                symbolizers: [
                  new CircleSymbolizer({ radius: 1 }),
                  new CircleSymbolizer({ radius: 2 }),
                ],
              }),
              new SymbologyLayer({
                name: "poi-label",
                zIndex: 1,
                blendOption: BlendOption.OPAQUE,
                symbolizers: [new CircleSymbolizer({ radius: 3 })],
              }),
            ],
          }),
          new VectorStyleRule({
            symbologyLayers: [
              new SymbologyLayer({
                name: "transit-icon",
                symbolizers: [new CircleSymbolizer({ radius: 4 })],
              }),
              new SymbologyLayer({
                name: "transit-label",
                zIndex: 1,
                symbolizers: [new CircleSymbolizer({ radius: 5 })],
              }),
            ],
          }),
        ],
      });

      const group = style.createPrimitives(collection);

      expect(group.length).toBe(4);
      expect([0, 1, 2, 3].map((i) => group.get(i).name)).toEqual([
        "poi-icon",
        "transit-icon",
        "poi-label",
        "transit-label",
      ]);
      const primitives = group.flatten();
      expect(primitives[0]).toBeInstanceOf(CircleVectorPrimitive);
      expect(primitives.map((primitive) => primitive.radius)).toEqual([
        1, 2, 4, 3, 5,
      ]);
      expect(primitives.map((primitive) => primitive.blendOption)).toEqual([
        BlendOption.TRANSLUCENT,
        BlendOption.TRANSLUCENT,
        BlendOption.TRANSLUCENT,
        BlendOption.OPAQUE,
        BlendOption.TRANSLUCENT,
      ]);
      expect(primitives.every((p) => p.collection === collection)).toBe(true);

      group.destroy();
    });

    it("creates no circle primitives for a polyline collection", function () {
      const polylines = new BufferPolylineCollection();
      const style = new VectorStyle({
        rules: [new VectorStyleRule({ symbolizers: [new CircleSymbolizer()] })],
      });

      const group = style.createPrimitives(polylines);

      expect(group.length).toBe(1);
      expect(group.flatten()).toEqual([]);

      group.destroy();
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
            symbologyLayers: [
              new SymbologyLayer({
                blendOption: BlendOption.OPAQUE,
                symbolizers: [new CircleSymbolizer({ color: Color.LIME })],
              }),
            ],
          }),
          new VectorStyleRule({
            symbologyLayers: [
              new SymbologyLayer({
                blendOption: BlendOption.OPAQUE,
                symbolizers: [new CircleSymbolizer({ color: Color.RED })],
              }),
            ],
          }),
        ],
      });

      scene.primitives.add(style.createPrimitives(collection));

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
            symbologyLayers: [
              new SymbologyLayer({
                blendOption: BlendOption.OPAQUE,
                symbolizers: [new CircleSymbolizer({ color: Color.LIME })],
              }),
            ],
          }),
          new VectorStyleRule({
            symbologyLayers: [
              new SymbologyLayer({
                blendOption: BlendOption.OPAQUE,
                symbolizers: [new CircleSymbolizer({ color: Color.RED })],
              }),
            ],
          }),
        ],
      });

      scene.primitives.add(style.createPrimitives(collection));

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
            symbologyLayers: [
              new SymbologyLayer({
                blendOption: BlendOption.OPAQUE,
                symbolizers: [new CircleSymbolizer()],
              }),
            ],
          }),
        ],
      });

      scene.primitives.add(style.createPrimitives(collection));

      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("draws a later symbology layer of a rule above an earlier one", function () {
      collection.add({ position }, new BufferPoint());
      const style = new VectorStyle({
        rules: [
          new VectorStyleRule({
            symbologyLayers: [
              new SymbologyLayer({
                blendOption: BlendOption.OPAQUE,
                symbolizers: [new CircleSymbolizer({ color: Color.RED })],
              }),
              new SymbologyLayer({
                blendOption: BlendOption.OPAQUE,
                symbolizers: [new CircleSymbolizer({ color: Color.LIME })],
              }),
            ],
          }),
        ],
      });

      scene.primitives.add(style.createPrimitives(collection));

      expect(scene).toRender([0, 255, 0, 255]);
    });

    it("draws the symbology layers of a later rule above an earlier rule", function () {
      collection.add(
        { position, pickObject: { getPropertyInherited: () => "poi" } },
        new BufferPoint(),
      );
      collection.add(
        { position, pickObject: { getPropertyInherited: () => "transit" } },
        new BufferPoint(),
      );
      const style = new VectorStyle({
        rules: [
          new VectorStyleRule({
            condition: "${type} === 'poi'",
            symbologyLayers: [
              new SymbologyLayer({
                blendOption: BlendOption.OPAQUE,
                symbolizers: [new CircleSymbolizer({ color: Color.RED })],
              }),
            ],
          }),
          new VectorStyleRule({
            condition: "${type} === 'transit'",
            symbologyLayers: [
              new SymbologyLayer({
                blendOption: BlendOption.OPAQUE,
                symbolizers: [new CircleSymbolizer({ color: Color.LIME })],
              }),
            ],
          }),
        ],
      });

      scene.primitives.add(style.createPrimitives(collection));

      expect(scene).toRender([0, 255, 0, 255]);
    });

    it("draws a symbology layer with a higher zIndex above layers of later rules", function () {
      collection.add(
        { position, pickObject: { getPropertyInherited: () => "poi" } },
        new BufferPoint(),
      );
      collection.add(
        { position, pickObject: { getPropertyInherited: () => "transit" } },
        new BufferPoint(),
      );
      const style = new VectorStyle({
        rules: [
          new VectorStyleRule({
            condition: "${type} === 'poi'",
            symbologyLayers: [
              new SymbologyLayer({
                zIndex: 1,
                blendOption: BlendOption.OPAQUE,
                symbolizers: [new CircleSymbolizer({ color: Color.RED })],
              }),
            ],
          }),
          new VectorStyleRule({
            condition: "${type} === 'transit'",
            symbologyLayers: [
              new SymbologyLayer({
                blendOption: BlendOption.OPAQUE,
                symbolizers: [new CircleSymbolizer({ color: Color.LIME })],
              }),
            ],
          }),
        ],
      });

      scene.primitives.add(style.createPrimitives(collection));

      expect(scene).toRender([255, 0, 0, 255]);
    });

    it("does not draw a hidden symbology layer", function () {
      collection.add({ position }, new BufferPoint());
      const style = new VectorStyle({
        rules: [
          new VectorStyleRule({
            symbologyLayers: [
              new SymbologyLayer({
                blendOption: BlendOption.OPAQUE,
                symbolizers: [new CircleSymbolizer({ color: Color.RED })],
              }),
              new SymbologyLayer({
                name: "top",
                blendOption: BlendOption.OPAQUE,
                symbolizers: [new CircleSymbolizer({ color: Color.LIME })],
              }),
            ],
          }),
        ],
      });
      const group = scene.primitives.add(style.createPrimitives(collection));

      group.get(group.getPrimitiveIndexByName("top")).show = false;

      expect(scene).toRender([255, 0, 0, 255]);
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
            symbologyLayers: [
              new SymbologyLayer({
                blendOption: BlendOption.OPAQUE,
                symbolizers: [
                  new CircleSymbolizer({ color: "color(${colorName})" }),
                ],
              }),
            ],
          }),
        ],
      });

      scene.primitives.add(style.createPrimitives(collection));

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
            symbologyLayers: [
              new SymbologyLayer({
                blendOption: BlendOption.OPAQUE,
                symbolizers: [
                  new CircleSymbolizer({
                    radius: "${size}",
                    color: Color.RED,
                    outlineColor: Color.BLUE,
                    outlineWidth: 4.0,
                  }),
                ],
              }),
            ],
          }),
        ],
      });

      scene.primitives.add(style.createPrimitives(collection));

      expect(scene).toRender([0, 0, 255, 255]);
    });
  },
  "WebGL",
);
