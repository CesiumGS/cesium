import { clone } from "../../Source/Cesium.js";

describe("Core/clone", function () {
  it("can make shallow clones", function () {
    const obj = {
      a: 1,
      b: "s",
      c: {
        d: 0,
      },
    };

    const clonedObj = clone(obj);
    expect(clonedObj).not.toBe(obj);
    expect(clonedObj.a).toEqual(obj.a);
    expect(clonedObj.b).toEqual(obj.b);
    expect(clonedObj.c).toBe(obj.c);
    expect(clonedObj.c.d).toEqual(obj.c.d);
  });

  it("can make deep clones", function () {
    const obj = {
      a: 1,
      b: "s",
      c: {
        d: 0,
        e: {
          f: {
            g: 1,
          },
        },
      },
    };

    const clonedObj = clone(obj, true);
    expect(clonedObj).not.toBe(obj);
    expect(clonedObj.a).toEqual(obj.a);
    expect(clonedObj.b).toEqual(obj.b);
    expect(clonedObj.c).not.toBe(obj.c);
    expect(clonedObj.c.d).toEqual(obj.c.d);
    expect(clonedObj.c.e).not.toBe(obj.c.e);
    expect(clonedObj.c.e.f).not.toBe(obj.c.e.f);
    expect(clonedObj.c.e.f.g).toEqual(obj.c.e.f.g);
  });
});
