import {
  BufferPointCollection,
  CircleLayer,
  VectorPrimitiveCollection,
} from "../../index.js";

describe("Scene/VectorPrimitiveCollection", () => {
  let collection;

  beforeEach(function () {
    collection = new BufferPointCollection();
  });

  afterEach(function () {
    collection.destroy();
  });

  it("adds vector primitives", function () {
    const primitives = new VectorPrimitiveCollection();
    const a = new CircleLayer({ collection });
    const b = new CircleLayer({ collection });

    expect(primitives.add(a)).toBe(a);
    primitives.add(b);

    expect(primitives.length).toBe(2);
    expect(primitives.get(0)).toBe(a);
    expect(primitives.get(1)).toBe(b);
    expect(primitives.contains(a)).toBe(true);

    primitives.destroy();
  });

  it("adds vector primitives at an index", function () {
    const primitives = new VectorPrimitiveCollection();
    const a = new CircleLayer({ collection });
    const b = new CircleLayer({ collection });

    primitives.add(a);
    primitives.add(b, 0);

    expect(primitives.get(0)).toBe(b);
    expect(primitives.get(1)).toBe(a);

    primitives.destroy();
  });

  it("throws when adding at an invalid index", function () {
    const primitives = new VectorPrimitiveCollection();
    const primitive = new CircleLayer({ collection });

    expect(() => primitives.add(primitive, -1)).toThrowDeveloperError();
    expect(() => primitives.add(primitive, 1)).toThrowDeveloperError();

    primitive.destroy();
    primitives.destroy();
  });

  it("removes and destroys vector primitives", function () {
    const primitives = new VectorPrimitiveCollection();
    const primitive = primitives.add(new CircleLayer({ collection }));

    expect(primitives.remove(primitive)).toBe(true);
    expect(primitives.length).toBe(0);
    expect(primitive.isDestroyed()).toBe(true);
    expect(primitives.remove(primitive)).toBe(false);

    primitives.destroy();
  });

  it("removes vector primitives without destroying them", function () {
    const primitives = new VectorPrimitiveCollection();
    const primitive = primitives.add(new CircleLayer({ collection }));

    expect(primitives.remove(primitive, false)).toBe(true);
    expect(primitives.contains(primitive)).toBe(false);
    expect(primitive.isDestroyed()).toBe(false);

    primitive.destroy();
    primitives.destroy();
  });

  it("removes all vector primitives", function () {
    const primitives = new VectorPrimitiveCollection();
    const a = primitives.add(new CircleLayer({ collection }));
    const b = primitives.add(new CircleLayer({ collection }));

    primitives.removeAll();

    expect(primitives.length).toBe(0);
    expect(a.isDestroyed()).toBe(true);
    expect(b.isDestroyed()).toBe(true);

    primitives.destroy();
  });

  it("destroys its vector primitives", function () {
    const primitives = new VectorPrimitiveCollection();
    const primitive = primitives.add(new CircleLayer({ collection }));

    primitives.destroy();

    expect(primitives.isDestroyed()).toBe(true);
    expect(primitive.isDestroyed()).toBe(true);
  });
});
