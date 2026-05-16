import {
  BufferPoint,
  BufferPolygon,
  BufferPolyline,
  GeoJsonPrimitiveLoader,
  RuntimeError,
} from "../../index.js";

describe("Scene/GeoJsonPrimitiveLoader", function () {
  it("builds buffer primitive collections from mixed feature geometries", function () {
    const geoJson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: "feature-0",
          properties: { name: "mixed" },
          geometry: {
            type: "GeometryCollection",
            geometries: [
              {
                type: "MultiPoint",
                coordinates: [
                  [0.0, 0.0],
                  [1.0, 1.0],
                ],
              },
              {
                type: "MultiLineString",
                coordinates: [
                  [
                    [0.0, 0.0],
                    [0.0, 1.0],
                  ],
                  [
                    [1.0, 1.0],
                    [2.0, 2.0],
                    [3.0, 3.0],
                  ],
                ],
              },
              {
                type: "Polygon",
                coordinates: [
                  [
                    [0.0, 0.0],
                    [2.0, 0.0],
                    [2.0, 2.0],
                    [0.0, 2.0],
                    [0.0, 0.0],
                  ],
                  [
                    [0.5, 0.5],
                    [1.5, 0.5],
                    [1.5, 1.5],
                    [0.5, 1.5],
                    [0.5, 0.5],
                  ],
                ],
              },
            ],
          },
        },
        {
          type: "Feature",
          id: 42,
          properties: { name: "multiPolygon" },
          geometry: {
            type: "MultiPolygon",
            coordinates: [
              [
                [
                  [10.0, 0.0],
                  [12.0, 0.0],
                  [12.0, 2.0],
                  [10.0, 2.0],
                  [10.0, 0.0],
                ],
              ],
              [
                [
                  [20.0, 0.0],
                  [21.0, 0.0],
                  [21.0, 1.0],
                  [20.0, 1.0],
                  [20.0, 0.0],
                ],
              ],
            ],
          },
        },
      ],
    };

    const loader = GeoJsonPrimitiveLoader.fromGeoJson(geoJson);

    expect(loader.featureCount).toBe(2);
    expect(loader.ids).toEqual(["feature-0", 42]);
    expect(loader.getId(0)).toBe("feature-0");
    expect(loader.getId(1)).toBe(42);
    expect(loader.getProperties(0).name).toBe("mixed");
    expect(loader.getProperties(1).name).toBe("multiPolygon");

    expect(loader.points).toBeDefined();
    expect(loader.polylines).toBeDefined();
    expect(loader.polygons).toBeDefined();

    expect(loader.points.primitiveCount).toBe(2);
    expect(loader.polylines.primitiveCount).toBe(2);
    expect(loader.polygons.primitiveCount).toBe(3);
    expect(loader.polygons.holeCount).toBe(1);
    expect(loader.polygons.triangleCount).toBeGreaterThan(0);

    const point = new BufferPoint();
    loader.points.get(0, point);
    expect(point.featureId).toBe(0);
    loader.points.get(1, point);
    expect(point.featureId).toBe(0);

    const polyline = new BufferPolyline();
    loader.polylines.get(0, polyline);
    expect(polyline.featureId).toBe(0);
    loader.polylines.get(1, polyline);
    expect(polyline.featureId).toBe(0);

    const polygon = new BufferPolygon();
    loader.polygons.get(0, polygon);
    expect(polygon.featureId).toBe(0);
    loader.polygons.get(1, polygon);
    expect(polygon.featureId).toBe(1);
    loader.polygons.get(2, polygon);
    expect(polygon.featureId).toBe(1);
  });

  it("accepts top-level geometry objects", function () {
    const geoJson = {
      type: "MultiPoint",
      coordinates: [
        [100.0, 0.0],
        [101.0, 1.0],
      ],
    };

    const loader = GeoJsonPrimitiveLoader.fromGeoJson(geoJson);
    expect(loader.featureCount).toBe(1);
    expect(loader.ids.length).toBe(1);
    expect(loader.ids[0]).toBeUndefined();
    expect(loader.points.primitiveCount).toBe(2);
    expect(loader.polylines).toBeUndefined();
    expect(loader.polygons).toBeUndefined();
  });

  it("throws for unsupported top-level types", function () {
    const invalid = {
      type: "Topology",
      objects: {},
    };

    expect(function () {
      GeoJsonPrimitiveLoader.fromGeoJson(invalid);
    }).toThrowError(RuntimeError);
  });

  it("fromUrl rejects without a URL", async function () {
    await expectAsync(
      GeoJsonPrimitiveLoader.fromUrl(),
    ).toBeRejectedWithDeveloperError();
  });
});
