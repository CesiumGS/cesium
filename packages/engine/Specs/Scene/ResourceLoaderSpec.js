import { ResourceLoader } from "../../Source/Cesium.js";

describe("Scene/ResourceLoader", function () {
  it("throws when using ResourceLoader directly", function () {
    const resourceLoader = new ResourceLoader();
    expect(function () {
      return resourceLoader.promise;
    }).toThrowDeveloperError();
    expect(function () {
      return resourceLoader.cacheKey;
    }).toThrowDeveloperError();
    expect(function () {
      resourceLoader.load();
    }).toThrowDeveloperError();
  });

  it("getError from error message", function () {
    const resourceLoader = new ResourceLoader();
    const errorMessage = "Resource failed";
    const runtimeError = resourceLoader.getError(errorMessage);
    expect(runtimeError.message).toBe(errorMessage);
  });

  it("getError from error message and error", function () {
    const resourceLoader = new ResourceLoader();
    const errorMessage = "Resource failed";
    const error = new Error("404 Not Found");
    const runtimeError = resourceLoader.getError(errorMessage, error);
    expect(runtimeError.message).toBe("Resource failed\n404 Not Found");
  });

  it("getError throws if errorMessage is undefined", function () {
    const resourceLoader = new ResourceLoader();
    expect(function () {
      resourceLoader.getError();
    }).toThrowDeveloperError();
  });

  it("destroys", function () {
    const resourceLoader = new ResourceLoader();
    expect(resourceLoader.isDestroyed()).toBe(false);
    resourceLoader.destroy();
    expect(resourceLoader.isDestroyed()).toBe(true);
  });
});
