import {
  ConstantProperty,
  Cesium3DTilesetGraphics,
} from "../../index.js";;

describe("DataSources/Cesium3DTilesetGraphics", function () {
  it("creates expected instance from raw assignment and construction", function () {
    const options = {
      uri: "0",
      show: false,
      maximumScreenSpaceError: 2,
    };

    const model = new Cesium3DTilesetGraphics(options);
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
    const source = new Cesium3DTilesetGraphics();
    source.uri = new ConstantProperty("");
    source.show = new ConstantProperty(true);
    source.maximumScreenSpaceError = new ConstantProperty(2.0);

    const target = new Cesium3DTilesetGraphics();
    target.merge(source);

    expect(target.uri).toBe(source.uri);
    expect(target.show).toBe(source.show);
    expect(target.maximumScreenSpaceError).toBe(source.maximumScreenSpaceError);
  });

  it("merge does not assign assigned properties", function () {
    const source = new Cesium3DTilesetGraphics();
    source.uri = new ConstantProperty("");
    source.show = new ConstantProperty(true);
    source.maximumScreenSpaceError = new ConstantProperty(2.0);

    const uri = new ConstantProperty("");
    const show = new ConstantProperty(true);
    const maximumScreenSpaceError = new ConstantProperty(2.0);

    const target = new Cesium3DTilesetGraphics();
    target.uri = uri;
    target.show = show;
    target.maximumScreenSpaceError = maximumScreenSpaceError;

    target.merge(source);

    expect(target.uri).toBe(uri);
    expect(target.show).toBe(show);
    expect(target.maximumScreenSpaceError).toBe(maximumScreenSpaceError);
  });

  it("clone works", function () {
    const source = new Cesium3DTilesetGraphics();
    source.uri = new ConstantProperty("");
    source.show = new ConstantProperty(true);
    source.maximumScreenSpaceError = new ConstantProperty(2.0);

    const result = source.clone();
    expect(result.uri).toBe(source.uri);
    expect(result.show).toBe(source.show);
    expect(result.maximumScreenSpaceError).toBe(source.maximumScreenSpaceError);
  });

  it("clone works with result parameter", function () {
    const source = new Cesium3DTilesetGraphics();
    source.uri = new ConstantProperty("");
    source.show = new ConstantProperty(true);
    source.maximumScreenSpaceError = new ConstantProperty(2.0);

    const existingResult = new Cesium3DTilesetGraphics();
    const result = source.clone(existingResult);
    expect(result).toBe(existingResult);
    expect(result.uri).toBe(source.uri);
    expect(result.show).toBe(source.show);
    expect(result.maximumScreenSpaceError).toBe(source.maximumScreenSpaceError);
  });

  it("merge throws if source undefined", function () {
    const target = new Cesium3DTilesetGraphics();
    expect(function () {
      target.merge(undefined);
    }).toThrowDeveloperError();
  });
});
