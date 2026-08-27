import { Color, BufferPolylineMaterial } from "../../index.js";

describe("Scene/BufferPolylineMaterial", () => {
  it("constructor", () => {
    const material = new BufferPolylineMaterial({
      color: Color.RED,
      outlineColor: Color.GREEN,
      outlineWidth: 4,
      width: 5,
    });

    expect(material.color).toEqual(Color.RED);
    expect(material.outlineColor).toEqual(Color.GREEN);
    expect(material.outlineWidth).toEqual(4);
    expect(material.width).toEqual(5);
  });

  it("pack + unpack", () => {
    const material1 = new BufferPolylineMaterial({
      color: Color.RED,
      outlineColor: Color.GREEN,
      outlineWidth: 1,
      width: 2,
    });
    const material2 = new BufferPolylineMaterial({
      color: Color.BLUE,
      outlineColor: Color.BLACK,
      outlineWidth: 3,
      width: 4,
    });

    const result = new BufferPolylineMaterial();

    const view = new DataView(
      new ArrayBuffer(BufferPolylineMaterial.packedLength * 3),
    );

    BufferPolylineMaterial.pack(material1, view, 0);
    BufferPolylineMaterial.pack(
      material2,
      view,
      BufferPolylineMaterial.packedLength,
    );

    BufferPolylineMaterial.unpack(view, 0, result);

    expect(result.color).toEqual(Color.RED);
    expect(result.outlineColor).toEqual(Color.GREEN);
    expect(result.outlineWidth).toEqual(1);
    expect(result.width).toEqual(2);

    BufferPolylineMaterial.unpack(
      view,
      BufferPolylineMaterial.packedLength,
      result,
    );

    expect(result.color).toEqual(Color.BLUE);
    expect(result.outlineColor).toEqual(Color.BLACK);
    expect(result.outlineWidth).toEqual(3);
    expect(result.width).toEqual(4);
  });
});
