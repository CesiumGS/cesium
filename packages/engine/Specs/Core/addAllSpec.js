import { addAllToArray } from "../../index.js";

describe("Core/addAllToArray", function () {
  it("works for basic arrays", function () {
    const source = [3, 4, 5];
    const target = [0, 1, 2];
    addAllToArray(target, source);
    expect(target).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("works for null source", function () {
    const target = [0, 1, 2];
    addAllToArray(target, null);
    expect(target).toEqual([0, 1, 2]);
  });

  it("works for undefined source", function () {
    const target = [0, 1, 2];
    addAllToArray(target, undefined);
    expect(target).toEqual([0, 1, 2]);
  });

  it("works for large arrays", function () {
    const source = Array(200000);
    const target = Array(200000);
    const result = Array(400000);
    addAllToArray(target, source);
    expect(target).toEqual(result);
  });
});
