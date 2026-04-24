import { Color, BufferPointMaterial } from "../../index.js";

describe("Scene/BufferPointMaterial", () => {
  it("constructor", () => {
    const material = new BufferPointMaterial({
      color: Color.RED,
      outlineColor: Color.GREEN,
      outlineWidth: 4,
      size: 5,
    });

    expect(material.color).toEqual(Color.RED);
    expect(material.outlineColor).toEqual(Color.GREEN);
    expect(material.outlineWidth).toEqual(4);
    expect(material.size).toEqual(5);
  });

  it("pack + unpack", () => {
    const material1 = new BufferPointMaterial({
      color: Color.RED,
      outlineColor: Color.GREEN,
      outlineWidth: 1,
      size: 2,
    });
    const material2 = new BufferPointMaterial({
      color: Color.BLUE,
      outlineColor: Color.BLACK,
      outlineWidth: 3,
      size: 4,
    });

    const result = new BufferPointMaterial();

    const view = new DataView(
      new ArrayBuffer(BufferPointMaterial.packedLength * 3),
    );

    BufferPointMaterial.pack(material1, view, 0);
    BufferPointMaterial.pack(material2, view, BufferPointMaterial.packedLength);

    BufferPointMaterial.unpack(view, 0, result);

    expect(result.color).toEqual(Color.RED);
    expect(result.outlineColor).toEqual(Color.GREEN);
    expect(result.outlineWidth).toEqual(1);
    expect(result.size).toEqual(2);

    BufferPointMaterial.unpack(view, BufferPointMaterial.packedLength, result);

    expect(result.color).toEqual(Color.BLUE);
    expect(result.outlineColor).toEqual(Color.BLACK);
    expect(result.outlineWidth).toEqual(3);
    expect(result.size).toEqual(4);
  });
});
