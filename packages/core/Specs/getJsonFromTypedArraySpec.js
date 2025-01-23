import { getJsonFromTypedArray } from "../../index.js";

describe("Core/getJsonFromTypedArray", function () {
  it("converts a typed array to string", function () {
    if (typeof TextEncoder === "undefined") {
      return;
    }

    const json = {
      a: [0, 1, 2],
      b: "b",
      c: {
        d: true,
      },
    };

    const string = JSON.stringify(json);
    const encoder = new TextEncoder();
    const typedArray = encoder.encode(string);
    const result = getJsonFromTypedArray(typedArray);

    expect(result).toEqual(json);
  });

  it("converts a sub-region of a typed array to json", function () {
    if (typeof TextEncoder === "undefined") {
      return;
    }

    const json = {
      a: [0, 1, 2],
      b: "b",
      c: {
        d: true,
      },
    };

    const string = JSON.stringify(json);
    const encoder = new TextEncoder();
    const typedArray = encoder.encode(string);
    const result = getJsonFromTypedArray(typedArray, 25, 10);

    expect(result).toEqual(json.c);
  });
});
