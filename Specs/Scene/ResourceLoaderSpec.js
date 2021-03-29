import { ResourceLoader } from "../../Source/Cesium.js";

describe("Scene/ResourceLoader", function () {
  it("throws when using ResourceLoader directly", function () {
    var resourceLoader = new ResourceLoader();
    expect(function () {
      return resourceLoader.promise;
    }).toThrowDeveloperError();
    expect(function () {
      return resourceLoader.cacheKey;
    }).toThrowDeveloperError();
    expect(function () {
      resourceLoader.load();
    }).toThrowDeveloperError();
    expect(function () {
      resourceLoader.unload();
    }).toThrowDeveloperError();
    expect(function () {
      resourceLoader.update();
    }).toThrowDeveloperError();
  });

  it("getError from error message", function () {
    var errorMessage = "Resource failed";
    var runtimeError = ResourceLoader.getError(errorMessage);
    expect(runtimeError.message).toBe(errorMessage);
  });

  it("getError from error message and error", function () {
    var errorMessage = "Resource failed";
    var error = new Error("404 Not Found");
    var runtimeError = ResourceLoader.getError(errorMessage, error);
    expect(runtimeError.message).toBe("Resource failed\n404 Not Found");
  });

  it("getError throws if errorMessage is undefined", function () {
    expect(function () {
      ResourceLoader.getError();
    }).toThrowDeveloperError();
  });
});
