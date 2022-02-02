import { isDataUri } from "../../Source/Cesium.js";

describe("Core/isDataUri", function () {
  it("Throws if url is undefined", function () {
    expect(function () {
      isDataUri(undefined);
    }).toThrowDeveloperError();
  });

  it("Determines that a uri is not a data uri", function () {
    expect(isDataUri("http://cesiumjs.org/")).toEqual(false);
  });

  it("Determines that a uri is a data uri", function () {
    const uri = "data:text/plain;base64," + btoa("a data uri");
    expect(isDataUri(uri)).toEqual(true);
  });
});
