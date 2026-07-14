import {
  Cartesian3,
  Color,
  ComponentDatatype,
  PrimitiveType,
} from "../../../index.js";
import GeometryResult from "../../../Source/Scene/Model/GeometryResult.js";

describe("Scene/Model/GeometryResult", function () {
  it("initializes with empty defaults", function () {
    const result = new GeometryResult();

    expect(result.attributeNames).toEqual([]);
    expect(result.attributeValues.size).toBe(0);
    expect(result.attributeTypes.size).toBe(0);
    expect(result.indices).toBeUndefined();
    expect(result.primitiveType).toBeUndefined();
    expect(result.count).toBe(0);
    expect(result.instances).toBe(0);
  });

  it("stores indices, primitiveType, count, and instances", function () {
    const result = new GeometryResult();
    result.indices = [0, 1, 2, 2, 1, 3];
    result.primitiveType = PrimitiveType.TRIANGLES;
    result.count = 4;
    result.instances = 2;

    expect(result.indices.length).toBe(6);
    expect(result.primitiveType).toBe(PrimitiveType.TRIANGLES);
    expect(result.count).toBe(4);
    expect(result.instances).toBe(2);
  });

  it("attributeNames tracks added attributes", function () {
    const result = new GeometryResult();
    result.attributeNames.push("POSITION");
    result.attributeNames.push("NORMAL");
    result.attributeNames.push("COLOR_0");

    expect(result.attributeNames.length).toBe(3);
    expect(result.attributeNames).toEqual(["POSITION", "NORMAL", "COLOR_0"]);
  });

  describe("getPositions", function () {
    it("returns positions from POSITION key", function () {
      const result = new GeometryResult();
      const positions = [
        new Cartesian3(1.0, 2.0, 3.0),
        new Cartesian3(4.0, 5.0, 6.0),
      ];
      result.attributeValues.set("POSITION", positions);

      expect(result.getPositions()).toBe(positions);
      expect(result.getPositions().length).toBe(2);
    });

    it("returns undefined when not present", function () {
      const result = new GeometryResult();
      expect(result.getPositions()).toBeUndefined();
    });
  });

  describe("getNormals", function () {
    it("returns normals from NORMAL key", function () {
      const result = new GeometryResult();
      const normals = [
        new Cartesian3(0.0, 0.0, 1.0),
        new Cartesian3(0.0, 1.0, 0.0),
      ];
      result.attributeValues.set("NORMAL", normals);

      expect(result.getNormals()).toBe(normals);
      expect(result.getNormals().length).toBe(2);
    });

    it("returns undefined when not present", function () {
      const result = new GeometryResult();
      expect(result.getNormals()).toBeUndefined();
    });
  });

  describe("getColors", function () {
    it("returns colors from COLOR key", function () {
      const result = new GeometryResult();
      const colors = [new Color(1.0, 0.0, 0.0, 1.0)];
      result.attributeValues.set("COLOR", colors);

      expect(result.getColors()).toBe(colors);
    });

    it("falls back to COLOR_0 key", function () {
      const result = new GeometryResult();
      const colors = [new Color(0.0, 1.0, 0.0, 1.0)];
      result.attributeValues.set("COLOR_0", colors);

      expect(result.getColors()).toBe(colors);
    });

    it("prefers COLOR over COLOR_0", function () {
      const result = new GeometryResult();
      const colorsA = [new Color(1.0, 0.0, 0.0, 1.0)];
      const colorsB = [new Color(0.0, 1.0, 0.0, 1.0)];
      result.attributeValues.set("COLOR", colorsA);
      result.attributeValues.set("COLOR_0", colorsB);

      expect(result.getColors()).toBe(colorsA);
    });

    it("returns undefined when not present", function () {
      const result = new GeometryResult();
      expect(result.getColors()).toBeUndefined();
    });
  });

  describe("getFeatureIds", function () {
    it("returns feature IDs from _FEATURE_ID key", function () {
      const result = new GeometryResult();
      const featureIds = [0, 1, 2];
      result.attributeValues.set("_FEATURE_ID", featureIds);

      expect(result.getFeatureIds()).toBe(featureIds);
    });

    it("falls back to _FEATURE_ID_0 key", function () {
      const result = new GeometryResult();
      const featureIds = [3, 4, 5];
      result.attributeValues.set("_FEATURE_ID_0", featureIds);

      expect(result.getFeatureIds()).toBe(featureIds);
    });

    it("prefers _FEATURE_ID over _FEATURE_ID_0", function () {
      const result = new GeometryResult();
      const idsA = [0, 1];
      const idsB = [2, 3];
      result.attributeValues.set("_FEATURE_ID", idsA);
      result.attributeValues.set("_FEATURE_ID_0", idsB);

      expect(result.getFeatureIds()).toBe(idsA);
    });

    it("returns undefined when not present", function () {
      const result = new GeometryResult();
      expect(result.getFeatureIds()).toBeUndefined();
    });
  });

  describe("getAttributeValues", function () {
    it("returns values for a given key", function () {
      const result = new GeometryResult();
      const texcoords = [0.0, 0.5, 1.0];
      result.attributeValues.set("TEXCOORD_0", texcoords);

      expect(result.getAttributeValues("TEXCOORD_0")).toBe(texcoords);
    });

    it("returns undefined for missing key", function () {
      const result = new GeometryResult();
      expect(result.getAttributeValues("NONEXISTENT")).toBeUndefined();
    });
  });

  describe("getAttributeType", function () {
    it("returns type info for a given key", function () {
      const result = new GeometryResult();
      const typeInfo = {
        type: "VEC3",
        componentDatatype: ComponentDatatype.FLOAT,
      };
      result.attributeTypes.set("POSITION", typeInfo);

      expect(result.getAttributeType("POSITION")).toBe(typeInfo);
      expect(result.getAttributeType("POSITION").type).toBe("VEC3");
      expect(result.getAttributeType("POSITION").componentDatatype).toBe(
        ComponentDatatype.FLOAT,
      );
    });

    it("returns undefined for missing key", function () {
      const result = new GeometryResult();
      expect(result.getAttributeType("NONEXISTENT")).toBeUndefined();
    });
  });

  function createTestGeometry() {
    const geometry = new GeometryResult();
    geometry.primitiveType = PrimitiveType.TRIANGLES;
    geometry.count = 4;
    geometry.instances = 1;

    const positions = [
      new Cartesian3(0.0, 0.0, 0.0),
      new Cartesian3(1.0, 0.0, 0.0),
      new Cartesian3(0.0, 1.0, 0.0),
      new Cartesian3(1.0, 1.0, 0.0),
    ];
    const featureIds = [0, 0, 1, 1];

    geometry.attributeNames.push("POSITION", "_FEATURE_ID");
    geometry.attributeValues.set("POSITION", positions);
    geometry.attributeValues.set("_FEATURE_ID", featureIds);
    geometry.attributeTypes.set("POSITION", {
      type: "VEC3",
      componentDatatype: ComponentDatatype.FLOAT,
    });
    geometry.attributeTypes.set("_FEATURE_ID", {
      type: "SCALAR",
      componentDatatype: ComponentDatatype.FLOAT,
    });

    return geometry;
  }

  describe("filter", function () {
    it("returns a new GeometryResult with matching vertices", function () {
      const geometry = createTestGeometry();

      const filtered = geometry.filter(function (geom, index) {
        return geom.getFeatureIds()[index] === 0;
      });

      expect(filtered).toBeDefined();
      expect(filtered.count).toBe(2);
      expect(filtered.instances).toBe(1);
      expect(filtered.primitiveType).toBe(PrimitiveType.TRIANGLES);
      expect(filtered.getPositions().length).toBe(2);
      expect(filtered.getPositions()[0]).toEqual(new Cartesian3(0.0, 0.0, 0.0));
      expect(filtered.getPositions()[1]).toEqual(new Cartesian3(1.0, 0.0, 0.0));
      expect(filtered.getFeatureIds()).toEqual([0, 0]);
    });

    it("preserves attribute types", function () {
      const geometry = createTestGeometry();

      const filtered = geometry.filter(function () {
        return true;
      });

      expect(filtered).toBeDefined();
      expect(filtered.getAttributeType("POSITION")).toEqual({
        type: "VEC3",
        componentDatatype: ComponentDatatype.FLOAT,
      });
      expect(filtered.getAttributeType("_FEATURE_ID")).toEqual({
        type: "SCALAR",
        componentDatatype: ComponentDatatype.FLOAT,
      });
    });

    it("preserves attributeNames", function () {
      const geometry = createTestGeometry();

      const filtered = geometry.filter(function () {
        return true;
      });

      expect(filtered).toBeDefined();
      expect(filtered.attributeNames).toEqual(["POSITION", "_FEATURE_ID"]);
    });

    it("returns undefined when no vertices match", function () {
      const geometry = createTestGeometry();

      const filtered = geometry.filter(function () {
        return false;
      });

      expect(filtered).toBeUndefined();
    });

    it("returns all vertices when predicate always returns true", function () {
      const geometry = createTestGeometry();

      const filtered = geometry.filter(function () {
        return true;
      });

      expect(filtered).toBeDefined();
      expect(filtered.count).toBe(4);
      expect(filtered.getPositions().length).toBe(4);
      expect(filtered.getFeatureIds()).toEqual([0, 0, 1, 1]);
    });

    it("works with multiple instances", function () {
      const geometry = new GeometryResult();
      geometry.primitiveType = PrimitiveType.POINTS;
      geometry.count = 2;
      geometry.instances = 2;

      const positions = [
        new Cartesian3(0.0, 0.0, 0.0),
        new Cartesian3(1.0, 0.0, 0.0),
        new Cartesian3(2.0, 0.0, 0.0),
        new Cartesian3(3.0, 0.0, 0.0),
      ];

      geometry.attributeNames.push("POSITION");
      geometry.attributeValues.set("POSITION", positions);
      geometry.attributeTypes.set("POSITION", {
        type: "VEC3",
        componentDatatype: ComponentDatatype.FLOAT,
      });

      const filtered = geometry.filter(function (geom, index) {
        return index % 2 === 0;
      });

      expect(filtered).toBeDefined();
      expect(filtered.count).toBe(2);
      expect(filtered.instances).toBe(1);
      expect(filtered.getPositions()).toEqual([
        new Cartesian3(0.0, 0.0, 0.0),
        new Cartesian3(2.0, 0.0, 0.0),
      ]);
    });

    it("does not modify the original geometry", function () {
      const geometry = createTestGeometry();

      geometry.filter(function (geom, index) {
        return geom.getFeatureIds()[index] === 0;
      });

      expect(geometry.count).toBe(4);
      expect(geometry.instances).toBe(1);
      expect(geometry.getPositions().length).toBe(4);
      expect(geometry.getFeatureIds()).toEqual([0, 0, 1, 1]);
    });
  });

  describe("getGeometryResultByFeatureId", function () {
    it("returns the filtered geometry matching the feature ID", function () {
      const geometry = createTestGeometry();

      const result = GeometryResult.getGeometryResultByFeatureId([geometry], 1);

      expect(result).toBeDefined();
      expect(result.count).toBe(2);
      expect(result.getPositions()).toEqual([
        new Cartesian3(0.0, 1.0, 0.0),
        new Cartesian3(1.0, 1.0, 0.0),
      ]);
      expect(result.getFeatureIds()).toEqual([1, 1]);
    });

    it("returns undefined when no vertices match the feature ID", function () {
      const geometry = createTestGeometry();

      const result = GeometryResult.getGeometryResultByFeatureId(
        [geometry],
        99,
      );

      expect(result).toBeUndefined();
    });

    it("returns undefined for an empty geometry list", function () {
      const result = GeometryResult.getGeometryResultByFeatureId([], 0);

      expect(result).toBeUndefined();
    });

    it("returns the first matching result from multiple geometries", function () {
      const geometryA = createTestGeometry();

      const geometryB = new GeometryResult();
      geometryB.primitiveType = PrimitiveType.POINTS;
      geometryB.count = 2;
      geometryB.instances = 1;
      geometryB.attributeNames.push("POSITION", "_FEATURE_ID");
      geometryB.attributeValues.set("POSITION", [
        new Cartesian3(10.0, 0.0, 0.0),
        new Cartesian3(20.0, 0.0, 0.0),
      ]);
      geometryB.attributeValues.set("_FEATURE_ID", [1, 2]);

      const result = GeometryResult.getGeometryResultByFeatureId(
        [geometryA, geometryB],
        1,
      );

      expect(result).toBeDefined();
      expect(result.primitiveType).toBe(PrimitiveType.TRIANGLES);
      expect(result.getPositions()).toEqual([
        new Cartesian3(0.0, 1.0, 0.0),
        new Cartesian3(1.0, 1.0, 0.0),
      ]);
    });

    it("returns undefined when geometry has no feature IDs", function () {
      const geometry = new GeometryResult();
      geometry.primitiveType = PrimitiveType.TRIANGLES;
      geometry.count = 2;
      geometry.instances = 1;
      geometry.attributeNames.push("POSITION");
      geometry.attributeValues.set("POSITION", [
        new Cartesian3(0.0, 0.0, 0.0),
        new Cartesian3(1.0, 0.0, 0.0),
      ]);

      const result = GeometryResult.getGeometryResultByFeatureId([geometry], 0);

      expect(result).toBeUndefined();
    });
  });
});
