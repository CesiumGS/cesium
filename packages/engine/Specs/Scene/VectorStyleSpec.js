import {
  Cartesian3,
  Color,
  HeadingPitchRange,
  Math as CesiumMath,
} from "@cesium/core";
import {
  BlendOption,
  BufferPoint,
  BufferPointCollection,
  BufferPolylineCollection,
  Camera,
  CircleSymbolizer,
  CircleVectorPrimitive,
  FeatureLayer,
  GeoJsonFeatureLayerProvider,
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

    it("creates a single symbology layer from rules", function () {
      const rule = new VectorStyleRule({ symbolizers: [] });
      const style = new VectorStyle({ rules: [rule] });

      expect(style.symbologyLayers.length).toBe(1);
      expect(style.symbologyLayers.get(0).rules).toEqual([rule]);
    });

    it("adds symbology layers in order", function () {
      const first = new SymbologyLayer({ rules: [] });
      const second = new SymbologyLayer({ rules: [] });
      const style = new VectorStyle({ symbologyLayers: [first] });

      style.symbologyLayers.add(second);

      expect(style.symbologyLayers.length).toBe(2);
      expect(style.symbologyLayers.get(0)).toBe(first);
      expect(style.symbologyLayers.get(1)).toBe(second);
    });

    it("throws with both symbology layers and rules", function () {
      expect(
        () => new VectorStyle({ symbologyLayers: [], rules: [] }),
      ).toThrowDeveloperError();
    });

    it("creates one group per symbology layer, with one primitive per symbolizer", function () {
      const style = new VectorStyle({
        symbologyLayers: [
          new SymbologyLayer({
            name: "first",
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
          }),
          new SymbologyLayer({
            name: "second",
            blendOption: BlendOption.OPAQUE,
            rules: [
              new VectorStyleRule({
                symbolizers: [new CircleSymbolizer({ radius: 4 })],
              }),
            ],
          }),
        ],
      });

      const group = style.createPrimitives(collection);

      expect(group.length).toBe(2);
      expect(group.get(0).name).toBe("first");
      expect(group.get(0).length).toBe(3);
      expect(group.get(1).name).toBe("second");
      expect(group.get(1).length).toBe(1);
      const primitives = group.flatten();
      expect(primitives[0]).toBeInstanceOf(CircleVectorPrimitive);
      expect(primitives.map((primitive) => primitive.radius)).toEqual([
        1, 2, 3, 4,
      ]);
      expect(primitives.map((primitive) => primitive.blendOption)).toEqual([
        BlendOption.TRANSLUCENT,
        BlendOption.TRANSLUCENT,
        BlendOption.TRANSLUCENT,
        BlendOption.OPAQUE,
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
        symbologyLayers: [
          new SymbologyLayer({
            blendOption: BlendOption.OPAQUE,
            rules: [
              new VectorStyleRule({
                condition: "${type} === 'school'",
                symbolizers: [new CircleSymbolizer({ color: Color.LIME })],
              }),
              new VectorStyleRule({
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
        symbologyLayers: [
          new SymbologyLayer({
            blendOption: BlendOption.OPAQUE,
            rules: [
              new VectorStyleRule({
                condition: "${type} === 'school'",
                symbolizers: [new CircleSymbolizer({ color: Color.LIME })],
              }),
              new VectorStyleRule({
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
        symbologyLayers: [
          new SymbologyLayer({
            blendOption: BlendOption.OPAQUE,
            rules: [
              new VectorStyleRule({
                condition: "${type} === 'school'",
                symbolizers: [new CircleSymbolizer()],
              }),
            ],
          }),
        ],
      });

      scene.primitives.add(style.createPrimitives(collection));

      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("draws a later symbology layer above an earlier one", function () {
      collection.add({ position }, new BufferPoint());
      const style = new VectorStyle({
        symbologyLayers: [
          new SymbologyLayer({
            blendOption: BlendOption.OPAQUE,
            rules: [
              new VectorStyleRule({
                symbolizers: [new CircleSymbolizer({ color: Color.RED })],
              }),
            ],
          }),
          new SymbologyLayer({
            blendOption: BlendOption.OPAQUE,
            rules: [
              new VectorStyleRule({
                symbolizers: [new CircleSymbolizer({ color: Color.LIME })],
              }),
            ],
          }),
        ],
      });

      scene.primitives.add(style.createPrimitives(collection));

      expect(scene).toRender([0, 255, 0, 255]);
    });

    it("does not draw a hidden symbology layer", function () {
      collection.add({ position }, new BufferPoint());
      const style = new VectorStyle({
        symbologyLayers: [
          new SymbologyLayer({
            blendOption: BlendOption.OPAQUE,
            rules: [
              new VectorStyleRule({
                symbolizers: [new CircleSymbolizer({ color: Color.RED })],
              }),
            ],
          }),
          new SymbologyLayer({
            name: "top",
            blendOption: BlendOption.OPAQUE,
            rules: [
              new VectorStyleRule({
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
        symbologyLayers: [
          new SymbologyLayer({
            blendOption: BlendOption.OPAQUE,
            rules: [
              new VectorStyleRule({
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

    it("compiles a GeoJSON feature layer with feature properties", function () {
      const provider = GeoJsonFeatureLayerProvider.fromGeoJson({
        type: "Feature",
        properties: { type: "school" },
        geometry: { type: "Point", coordinates: [-75.0, 40.0] },
      });
      const style = new VectorStyle({
        symbologyLayers: [
          new SymbologyLayer({
            blendOption: BlendOption.OPAQUE,
            rules: [
              new VectorStyleRule({
                condition: "${type} === 'school'",
                symbolizers: [new CircleSymbolizer({ color: Color.LIME })],
              }),
              new VectorStyleRule({
                symbolizers: [new CircleSymbolizer({ color: Color.RED })],
              }),
            ],
          }),
        ],
      });
      scene.camera.lookAt(
        Cartesian3.fromDegrees(-75.0, 40.0),
        new HeadingPitchRange(0.0, -CesiumMath.PI_OVER_TWO, 100000.0),
      );

      scene.primitives.add(style.compile(provider.featureLayers.get(0)));

      expect(scene).toRender([0, 255, 0, 255]);
    });

    it("stops drawing a compiled GeoJSON feature layer when it is hidden", function () {
      const provider = GeoJsonFeatureLayerProvider.fromGeoJson({
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [-75.0, 40.0] },
      });
      const style = new VectorStyle({
        symbologyLayers: [
          new SymbologyLayer({
            blendOption: BlendOption.OPAQUE,
            rules: [
              new VectorStyleRule({
                symbolizers: [new CircleSymbolizer({ color: Color.LIME })],
              }),
            ],
          }),
        ],
      });
      scene.camera.lookAt(
        Cartesian3.fromDegrees(-75.0, 40.0),
        new HeadingPitchRange(0.0, -CesiumMath.PI_OVER_TWO, 100000.0),
      );
      const featureLayer = provider.featureLayers.get(0);
      scene.primitives.add(style.compile(featureLayer));
      expect(scene).toRender([0, 255, 0, 255]);

      featureLayer.show = false;

      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("destroys the collections of a compiled GeoJSON feature layer", function () {
      const provider = GeoJsonFeatureLayerProvider.fromGeoJson({
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [-75.0, 40.0] },
      });
      const style = new VectorStyle({
        rules: [new VectorStyleRule({ symbolizers: [new CircleSymbolizer()] })],
      });
      const group = style.compile(provider.featureLayers.get(0));
      const destroy = spyOn(
        group.flatten()[0].collection,
        "destroy",
      ).and.callThrough();

      group.destroy();

      expect(destroy).toHaveBeenCalled();
    });

    it("compiles a tiled feature layer without creating primitives", function () {
      const featureLayer = new FeatureLayer({ name: "roads" });
      const style = new VectorStyle({
        rules: [new VectorStyleRule({ symbolizers: [new CircleSymbolizer()] })],
      });

      const group = style.compile(featureLayer);

      expect(group.name).toBe("roads");
      expect(group.length).toBe(0);
      expect(featureLayer._vectorPrimitiveGroups.has(group)).toBe(true);

      group.destroy();

      expect(featureLayer._vectorPrimitiveGroups.has(group)).toBe(false);
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
        symbologyLayers: [
          new SymbologyLayer({
            blendOption: BlendOption.OPAQUE,
            rules: [
              new VectorStyleRule({
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
