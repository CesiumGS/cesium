import { RuntimeError } from "@cesium/core";
import { FeatureLayer, GeoJsonFeatureLoader, Resource } from "../../index.js";

describe("Scene/GeoJsonFeatureLoader", function () {
  const geoJson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { kind: "tower" },
        geometry: { type: "Point", coordinates: [0.0, 0.0] },
      },
    ],
  };

  it("fromJson creates a layer", function () {
    const layer = GeoJsonFeatureLoader.fromJson(geoJson, { name: "Towers" });
    expect(layer).toBeInstanceOf(FeatureLayer);
    expect(layer.name).toBe("Towers");
    expect(layer.show).toBe(true);
    expect(layer._geoJson).toBe(geoJson);
  });

  it("fromJson creates a layer without a name", function () {
    const layer = GeoJsonFeatureLoader.fromJson(geoJson);
    expect(layer.name).toBeUndefined();
  });

  it("fromJson throws without geoJson", function () {
    expect(function () {
      GeoJsonFeatureLoader.fromJson(undefined);
    }).toThrowDeveloperError();
  });

  it("fromUrl creates a layer", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(geoJson),
    );
    const layer = await GeoJsonFeatureLoader.fromUrl("towers.geojson", {
      name: "Towers",
    });
    expect(layer.name).toBe("Towers");
    expect(layer._geoJson).toBe(geoJson);
  });

  it("fromUrl rejects if the GeoJSON fails to load", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(undefined),
    );
    await expectAsync(
      GeoJsonFeatureLoader.fromUrl("towers.geojson"),
    ).toBeRejectedWithError(RuntimeError);
  });

  it("fromUrl throws without a URL", async function () {
    await expectAsync(
      GeoJsonFeatureLoader.fromUrl(undefined),
    ).toBeRejectedWithDeveloperError();
  });
});
