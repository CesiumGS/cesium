import { addAll } from "../../index.js";

describe("Core/addAll", function () {
  it("works for basic arrays", function () {
    const source = [3, 4, 5];
    const target = [0, 1, 2];
    addAll(source, target);
    expect(target).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("works for null source", function () {
    const target = [0, 1, 2];
    addAll(null, target);
    expect(target).toEqual([0, 1, 2]);
  });

  it("works for undefined source", function () {
    const target = [0, 1, 2];
    addAll(undefined, target);
    expect(target).toEqual([0, 1, 2]);
  });

  it("works for large arrays", function () {
    const source = Array(200000);
    const target = Array(200000);
    const result = Array(400000);
    addAll(source, target);
    expect(target).toEqual(result);
  });
});
