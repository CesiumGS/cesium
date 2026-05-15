import { Color, BufferPolygonMaterial } from "../../index.js";

describe("Scene/BufferPolygonMaterial", () => {
  it("constructor", () => {
    const material = new BufferPolygonMaterial({
      color: Color.RED,
      outlineColor: Color.GREEN,
      outlineWidth: 4,
    });

    expect(material.color).toEqual(Color.RED);
    expect(material.outlineColor).toEqual(Color.GREEN);
    expect(material.outlineWidth).toEqual(4);
  });

  it("pack + unpack", () => {
    const material1 = new BufferPolygonMaterial({
      color: Color.RED,
      outlineColor: Color.GREEN,
      outlineWidth: 1,
    });
    const material2 = new BufferPolygonMaterial({
      color: Color.BLUE,
      outlineColor: Color.BLACK,
      outlineWidth: 3,
    });

    const result = new BufferPolygonMaterial();

    const view = new DataView(
      new ArrayBuffer(BufferPolygonMaterial.packedLength * 3),
    );

    BufferPolygonMaterial.pack(material1, view, 0);
    BufferPolygonMaterial.pack(
      material2,
      view,
      BufferPolygonMaterial.packedLength,
    );

    BufferPolygonMaterial.unpack(view, 0, result);

    expect(result.color).toEqual(Color.RED);
    expect(result.outlineColor).toEqual(Color.GREEN);
    expect(result.outlineWidth).toEqual(1);

    BufferPolygonMaterial.unpack(
      view,
      BufferPolygonMaterial.packedLength,
      result,
    );

    expect(result.color).toEqual(Color.BLUE);
    expect(result.outlineColor).toEqual(Color.BLACK);
    expect(result.outlineWidth).toEqual(3);
  });
});
