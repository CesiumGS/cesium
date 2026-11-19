import { RuntimeError } from "@cesium/core";
import {
  FeatureLayer,
  GeoJsonFeatureLayerProvider,
  Resource,
} from "../../index.js";

describe("Scene/GeoJsonFeatureLayerProvider", function () {
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

  it("fromGeoJson creates a provider with one layer", function () {
    const provider = GeoJsonFeatureLayerProvider.fromGeoJson(geoJson, {
      name: "Towers",
    });
    expect(provider.featureLayers.length).toBe(1);
    const layer = provider.featureLayers.get(0);
    expect(layer).toBeInstanceOf(FeatureLayer);
    expect(layer.name).toBe("Towers");
    expect(layer.show).toBe(true);
    expect(provider._geoJson).toBe(geoJson);
  });

  it("fromGeoJson creates a layer without a name", function () {
    const provider = GeoJsonFeatureLayerProvider.fromGeoJson(geoJson);
    expect(provider.featureLayers.get(0).name).toBeUndefined();
  });

  it("fromGeoJson throws without geoJson", function () {
    expect(function () {
      GeoJsonFeatureLayerProvider.fromGeoJson(undefined);
    }).toThrowDeveloperError();
  });

  it("fromUrl creates a provider", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(geoJson),
    );
    const provider = await GeoJsonFeatureLayerProvider.fromUrl(
      "towers.geojson",
      { name: "Towers" },
    );
    expect(provider.featureLayers.get(0).name).toBe("Towers");
    expect(provider._geoJson).toBe(geoJson);
  });

  it("fromUrl rejects if the GeoJSON fails to load", async function () {
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(undefined),
    );
    await expectAsync(
      GeoJsonFeatureLayerProvider.fromUrl("towers.geojson"),
    ).toBeRejectedWithError(RuntimeError);
  });

  it("fromUrl throws without a URL", async function () {
    await expectAsync(
      GeoJsonFeatureLayerProvider.fromUrl(undefined),
    ).toBeRejectedWithDeveloperError();
  });
});
