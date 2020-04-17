import { ConstantProperty } from "../../Source/Cesium.js";
import { Cesium3DTilesetGraphics } from "../../Source/Cesium.js";

describe("DataSources/Cesium3DTilesetGraphics", function () {
  it("creates expected instance from raw assignment and construction", function () {
    var options = {
      uri: "0",
      show: false,
      maximumScreenSpaceError: 2,
    };

    var model = new Cesium3DTilesetGraphics(options);
    expect(model.uri).toBeInstanceOf(ConstantProperty);
    expect(model.show).toBeInstanceOf(ConstantProperty);
    expect(model.maximumScreenSpaceError).toBeInstanceOf(ConstantProperty);

    expect(model.uri.getValue()).toEqual(options.uri);
    expect(model.show.getValue()).toEqual(options.show);
    expect(model.maximumScreenSpaceError.getValue()).toEqual(
      options.maximumScreenSpaceError
    );
  });

  it("merge assigns unassigned properties", function () {
    var source = new Cesium3DTilesetGraphics();
    source.uri = new ConstantProperty("");
    source.show = new ConstantProperty(true);
    source.maximumScreenSpaceError = new ConstantProperty(2.0);

    var target = new Cesium3DTilesetGraphics();
    target.merge(source);

    expect(target.uri).toBe(source.uri);
    expect(target.show).toBe(source.show);
    expect(target.maximumScreenSpaceError).toBe(source.maximumScreenSpaceError);
  });

  it("merge does not assign assigned properties", function () {
    var source = new Cesium3DTilesetGraphics();
    source.uri = new ConstantProperty("");
    source.show = new ConstantProperty(true);
    source.maximumScreenSpaceError = new ConstantProperty(2.0);

    var uri = new ConstantProperty("");
    var show = new ConstantProperty(true);
    var maximumScreenSpaceError = new ConstantProperty(2.0);

    var target = new Cesium3DTilesetGraphics();
    target.uri = uri;
    target.show = show;
    target.maximumScreenSpaceError = maximumScreenSpaceError;

    target.merge(source);

    expect(target.uri).toBe(uri);
    expect(target.show).toBe(show);
    expect(target.maximumScreenSpaceError).toBe(maximumScreenSpaceError);
  });

  it("clone works", function () {
    var source = new Cesium3DTilesetGraphics();
    source.uri = new ConstantProperty("");
    source.show = new ConstantProperty(true);
    source.maximumScreenSpaceError = new ConstantProperty(2.0);

    var result = source.clone();
    expect(result.uri).toBe(source.uri);
    expect(result.show).toBe(source.show);
    expect(result.maximumScreenSpaceError).toBe(source.maximumScreenSpaceError);
  });

  it("clone works with result parameter", function () {
    var source = new Cesium3DTilesetGraphics();
    source.uri = new ConstantProperty("");
    source.show = new ConstantProperty(true);
    source.maximumScreenSpaceError = new ConstantProperty(2.0);

    var existingResult = new Cesium3DTilesetGraphics();
    var result = source.clone(existingResult);
    expect(result).toBe(existingResult);
    expect(result.uri).toBe(source.uri);
    expect(result.show).toBe(source.show);
    expect(result.maximumScreenSpaceError).toBe(source.maximumScreenSpaceError);
  });

  it("merge throws if source undefined", function () {
    var target = new Cesium3DTilesetGraphics();
    expect(function () {
      target.merge(undefined);
    }).toThrowDeveloperError();
  });
});
