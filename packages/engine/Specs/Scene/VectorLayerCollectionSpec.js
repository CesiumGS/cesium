import {
  BufferPointCollection,
  CircleLayer,
  VectorLayerCollection,
} from "../../index.js";

describe("Scene/VectorLayerCollection", () => {
  let collection;

  beforeEach(function () {
    collection = new BufferPointCollection();
  });

  afterEach(function () {
    collection.destroy();
  });

  it("adds layers", function () {
    const layers = new VectorLayerCollection();
    const a = new CircleLayer({ collection });
    const b = new CircleLayer({ collection });

    expect(layers.add(a)).toBe(a);
    layers.add(b);

    expect(layers.length).toBe(2);
    expect(layers.get(0)).toBe(a);
    expect(layers.get(1)).toBe(b);
    expect(layers.contains(a)).toBe(true);

    layers.destroy();
  });

  it("adds layers at an index", function () {
    const layers = new VectorLayerCollection();
    const a = new CircleLayer({ collection });
    const b = new CircleLayer({ collection });

    layers.add(a);
    layers.add(b, 0);

    expect(layers.get(0)).toBe(b);
    expect(layers.get(1)).toBe(a);

    layers.destroy();
  });

  it("throws when adding at an invalid index", function () {
    const layers = new VectorLayerCollection();
    const layer = new CircleLayer({ collection });

    expect(() => layers.add(layer, -1)).toThrowDeveloperError();
    expect(() => layers.add(layer, 1)).toThrowDeveloperError();

    layer.destroy();
    layers.destroy();
  });

  it("removes and destroys layers", function () {
    const layers = new VectorLayerCollection();
    const layer = layers.add(new CircleLayer({ collection }));

    expect(layers.remove(layer)).toBe(true);
    expect(layers.length).toBe(0);
    expect(layer.isDestroyed()).toBe(true);
    expect(layers.remove(layer)).toBe(false);

    layers.destroy();
  });

  it("removes layers without destroying them", function () {
    const layers = new VectorLayerCollection();
    const layer = layers.add(new CircleLayer({ collection }));

    expect(layers.remove(layer, false)).toBe(true);
    expect(layers.contains(layer)).toBe(false);
    expect(layer.isDestroyed()).toBe(false);

    layer.destroy();
    layers.destroy();
  });

  it("removes all layers", function () {
    const layers = new VectorLayerCollection();
    const a = layers.add(new CircleLayer({ collection }));
    const b = layers.add(new CircleLayer({ collection }));

    layers.removeAll();

    expect(layers.length).toBe(0);
    expect(a.isDestroyed()).toBe(true);
    expect(b.isDestroyed()).toBe(true);

    layers.destroy();
  });

  it("destroys its layers", function () {
    const layers = new VectorLayerCollection();
    const layer = layers.add(new CircleLayer({ collection }));

    layers.destroy();

    expect(layers.isDestroyed()).toBe(true);
    expect(layer.isDestroyed()).toBe(true);
  });
});
