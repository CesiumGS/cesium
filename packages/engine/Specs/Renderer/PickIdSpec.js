import { PickId } from "../../index.js";
import Color from "../../Source/Core/Color.js";

describe("Renderer/PickId", function () {
  let pickObjects;
  let pickIds;

  beforeEach(() => {
    pickObjects = new Map([
      [1, { key: "a" }],
      [2, { key: "b" }],
      [3, { key: "c" }],
    ]);

    pickIds = [
      new PickId(pickObjects, 1, Color.fromRgba(1)),
      new PickId(pickObjects, 2, Color.fromRgba(2)),
      new PickId(pickObjects, 3, Color.fromRgba(3)),
    ];
  });

  it("creates pick ids", function () {
    expect(Array.from(pickObjects.values())).toEqual([
      { key: "a" },
      { key: "b" },
      { key: "c" },
    ]);
  });

  it("destroys pick ids", function () {
    pickIds[1].destroy();
    expect(Array.from(pickObjects.values())).toEqual([
      { key: "a" },
      { key: "c" },
    ]);

    pickIds[0].destroy();
    expect(Array.from(pickObjects.values())).toEqual([{ key: "c" }]);

    pickIds[2].destroy();
    expect(pickObjects.size).toBe(0);
  });

  it("gets / sets pick id objects", function () {
    expect(pickIds[0].object).toEqual({ key: "a" });
    expect(pickIds[1].object).toEqual({ key: "b" });
    expect(pickIds[2].object).toEqual({ key: "c" });

    pickIds[1].object = { message: "hello world" };

    expect(pickIds[0].object).toEqual({ key: "a" });
    expect(pickIds[1].object).toEqual({ message: "hello world" });
    expect(pickIds[2].object).toEqual({ key: "c" });
  });
});
