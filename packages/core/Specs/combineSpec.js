import { combine } from "../../index.js";

describe("Core/combine", function () {
  it("can combine shallow references", function () {
    const obj1 = {
      x: 1,
      y: 2,
      other: {
        value1: 0,
      },
    };
    const obj2 = {
      x: -1,
      z: 3,
      other: {
        value2: 1,
      },
    };
    const composite = combine(obj1, obj2);
    expect(composite).toEqual({
      x: 1,
      y: 2,
      z: 3,
      other: {
        value1: 0,
      },
    });
  });

  it("can combine deep references", function () {
    const object1 = {
      one: 1,
      deep: {
        value1: 10,
      },
    };
    const object2 = {
      two: 2,
      deep: {
        value1: 5,
        value2: 11,
        sub: {
          val: "a",
        },
      },
    };

    const composite = combine(object1, object2, true);
    expect(composite).toEqual({
      one: 1,
      two: 2,
      deep: {
        value1: 10,
        value2: 11,
        sub: {
          val: "a",
        },
      },
    });
  });

  it("can accept undefined as either object", function () {
    const object = {
      one: 1,
      deep: {
        value1: 10,
      },
    };

    expect(combine(undefined, object)).toEqual(object);
    expect(combine(undefined, object, true)).toEqual(object);
    expect(combine(object, undefined)).toEqual(object);
    expect(combine(object, undefined, true)).toEqual(object);

    expect(combine(undefined, undefined)).toEqual({});
    expect(combine(undefined, undefined, true)).toEqual({});
  });
});
