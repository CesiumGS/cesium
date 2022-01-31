import { isBlobUri } from "../../Source/Cesium.js";

describe("Core/isBlobUri", function () {
  it("Throws if url is undefined", function () {
    expect(function () {
      isBlobUri(undefined);
    }).toThrowDeveloperError();
  });

  it("Determines that a uri is not a blob uri", function () {
    expect(isBlobUri("http://cesiumjs.org/")).toEqual(false);
  });

  it("Determines that a uri is a blob uri", function () {
    const uint8Array = new Uint8Array(4);
    const blob = new Blob([uint8Array], {
      type: "application/octet-stream",
    });

    const blobUrl = window.URL.createObjectURL(blob);
    expect(isBlobUri(blobUrl)).toEqual(true);
  });
});
