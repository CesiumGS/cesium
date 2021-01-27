import { clone } from "../../Source/Cesium.js";

describe("Core/clone", function () {
  it("can make shallow clones", function () {
    var obj = {
      a: 1,
      b: "s",
      c: {
        d: 0,
      },
      e: [2],
    };

    var clonedObj = clone(obj);
    expect(clonedObj).not.toBe(obj);
    expect(clonedObj.a).toEqual(obj.a);
    expect(clonedObj.b).toEqual(obj.b);
    expect(clonedObj.c).toBe(obj.c);
    expect(clonedObj.c.d).toEqual(obj.c.d);
    expect(clonedObj.e).toBe(obj.e);
  });

  it("can make deep clones", function () {
    var obj = {
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
      h: [
        {
          i: 2,
        },
      ],
    };

    var clonedObj = clone(obj, true);
    expect(clonedObj).not.toBe(obj);
    expect(clonedObj.a).toEqual(obj.a);
    expect(clonedObj.b).toEqual(obj.b);
    expect(clonedObj.c).not.toBe(obj.c);
    expect(clonedObj.c.d).toEqual(obj.c.d);
    expect(clonedObj.c.e).not.toBe(obj.c.e);
    expect(clonedObj.c.e.f).not.toBe(obj.c.e.f);
    expect(clonedObj.c.e.f.g).toEqual(obj.c.e.f.g);
    expect(clonedObj.h).not.toBe(obj.h);
    expect(clonedObj.h[0]).not.toBe(obj.h[0]);
    expect(clonedObj.h[0].i).toEqual(obj.h[0].i);
  });

  it("can make shallow clone of array", function () {
    var obj = [
      1,
      {
        a: 2,
      },
      [true],
    ];

    var clonedObj = clone(obj);
    expect(clonedObj).not.toBe(obj);
    expect(clonedObj[0]).toEqual(obj[0]);
    expect(clonedObj[1]).toBe(obj[1]);
    expect(clonedObj[2]).toBe(obj[2]);
  });

  it("can make deep clone of array", function () {
    var obj = [
      1,
      {
        a: 2,
        b: [true],
      },
      [
        {
          c: [false],
        },
        {
          d: 3,
        },
      ],
    ];

    var clonedObj = clone(obj, true);
    expect(clonedObj).not.toBe(obj);
    expect(clonedObj[0]).toEqual(obj[0]);
    expect(clonedObj[1]).not.toBe(obj[1]);
    expect(clonedObj[1].a).toEqual(obj[1].a);
    expect(clonedObj[1].b).not.toBe(obj[1].b);
    expect(clonedObj[1].b[0]).toEqual(obj[1].b[0]);
    expect(clonedObj[2]).not.toBe(obj[2]);
    expect(clonedObj[2][0]).not.toBe(obj[2][0]);
    expect(clonedObj[2][1]).not.toBe(obj[2][1]);
    expect(clonedObj[2][0].c).not.toBe(obj[2][0].c);
    expect(clonedObj[2][0].c[0]).toEqual(obj[2][0].c[0]);
    expect(clonedObj[2][1].d).toEqual(obj[2][1].d);
  });
});
