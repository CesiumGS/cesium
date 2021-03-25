import { CacheResource, RuntimeError } from "../../Source/Cesium.js";

describe("Scene/CacheResource", function () {
  it("throws", function () {
    var cacheResource = new CacheResource();
    expect(function () {
      return cacheResource.promise;
    }).toThrowDeveloperError();
    expect(function () {
      return cacheResource.cacheKey;
    }).toThrowDeveloperError();
    expect(function () {
      return cacheResource.load();
    }).toThrowDeveloperError();
    expect(function () {
      return cacheResource.unload();
    }).toThrowDeveloperError();
    expect(function () {
      return cacheResource.update();
    }).toThrowDeveloperError();
  });

  it("getError formats error", function () {
    var error = new Error("Something went wrong");
    var message = "Error:";
    var cacheError = CacheResource.getError(error, message);
    var expected = new RuntimeError("Error:\nSomething went wrong");
    expect(cacheError).toEqual(expected);
  });
});
