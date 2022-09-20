import { objectToQuery, queryToObject } from "../../../Source/Cesium.js";

describe("Core/objectToQuery", function () {
  it("can encode data", function () {
    const obj = {
      key1: "some value",
      key2: "a/b",
    };

    const str = objectToQuery(obj);
    expect(str).toEqual("key1=some%20value&key2=a%2Fb");
  });

  it("can encode arrays of data", function () {
    const obj = {
      key: ["a", "b"],
    };

    const str = objectToQuery(obj);
    expect(str).toEqual("key=a&key=b");
  });

  it("runs example code from the documentation", function () {
    const str = objectToQuery({
      key1: "some value",
      key2: "a/b",
      key3: ["x", "y"],
    });
    expect(str).toEqual("key1=some%20value&key2=a%2Fb&key3=x&key3=y");
  });

  it("can round-trip", function () {
    const obj = {
      foo: ["bar", "bar2"],
      bit: "byte",
    };

    const obj2 = queryToObject(objectToQuery(obj));

    expect(obj2).toEqual(obj);
  });

  it("can encode blank", function () {
    expect(objectToQuery({})).toEqual("");
  });

  it("requires obj", function () {
    expect(function () {
      objectToQuery();
    }).toThrowDeveloperError();
  });
});
