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

  it("getPositions returns positions from POSITION key", function () {
    const result = new GeometryResult();
    const positions = [
      new Cartesian3(1.0, 2.0, 3.0),
      new Cartesian3(4.0, 5.0, 6.0),
    ];
    result.attributeValues.set("POSITION", positions);

    expect(result.getPositions()).toBe(positions);
    expect(result.getPositions().length).toBe(2);
  });

  it("getPositions returns undefined when not present", function () {
    const result = new GeometryResult();
    expect(result.getPositions()).toBeUndefined();
  });

  it("getNormals returns normals from NORMAL key", function () {
    const result = new GeometryResult();
    const normals = [
      new Cartesian3(0.0, 0.0, 1.0),
      new Cartesian3(0.0, 1.0, 0.0),
    ];
    result.attributeValues.set("NORMAL", normals);

    expect(result.getNormals()).toBe(normals);
    expect(result.getNormals().length).toBe(2);
  });

  it("getNormals returns undefined when not present", function () {
    const result = new GeometryResult();
    expect(result.getNormals()).toBeUndefined();
  });

  it("getColors returns colors from COLOR key", function () {
    const result = new GeometryResult();
    const colors = [new Color(1.0, 0.0, 0.0, 1.0)];
    result.attributeValues.set("COLOR", colors);

    expect(result.getColors()).toBe(colors);
  });

  it("getColors falls back to COLOR_0 key", function () {
    const result = new GeometryResult();
    const colors = [new Color(0.0, 1.0, 0.0, 1.0)];
    result.attributeValues.set("COLOR_0", colors);

    expect(result.getColors()).toBe(colors);
  });

  it("getColors prefers COLOR over COLOR_0", function () {
    const result = new GeometryResult();
    const colorsA = [new Color(1.0, 0.0, 0.0, 1.0)];
    const colorsB = [new Color(0.0, 1.0, 0.0, 1.0)];
    result.attributeValues.set("COLOR", colorsA);
    result.attributeValues.set("COLOR_0", colorsB);

    expect(result.getColors()).toBe(colorsA);
  });

  it("getColors returns undefined when not present", function () {
    const result = new GeometryResult();
    expect(result.getColors()).toBeUndefined();
  });

  it("getFeatureIds returns feature IDs from _FEATURE_ID key", function () {
    const result = new GeometryResult();
    const featureIds = [0, 1, 2];
    result.attributeValues.set("_FEATURE_ID", featureIds);

    expect(result.getFeatureIds()).toBe(featureIds);
  });

  it("getFeatureIds falls back to _FEATURE_ID_0 key", function () {
    const result = new GeometryResult();
    const featureIds = [3, 4, 5];
    result.attributeValues.set("_FEATURE_ID_0", featureIds);

    expect(result.getFeatureIds()).toBe(featureIds);
  });

  it("getFeatureIds prefers _FEATURE_ID over _FEATURE_ID_0", function () {
    const result = new GeometryResult();
    const idsA = [0, 1];
    const idsB = [2, 3];
    result.attributeValues.set("_FEATURE_ID", idsA);
    result.attributeValues.set("_FEATURE_ID_0", idsB);

    expect(result.getFeatureIds()).toBe(idsA);
  });

  it("getFeatureIds returns undefined when not present", function () {
    const result = new GeometryResult();
    expect(result.getFeatureIds()).toBeUndefined();
  });

  it("getAttributeValues returns values for a given key", function () {
    const result = new GeometryResult();
    const texcoords = [0.0, 0.5, 1.0];
    result.attributeValues.set("TEXCOORD_0", texcoords);

    expect(result.getAttributeValues("TEXCOORD_0")).toBe(texcoords);
  });

  it("getAttributeValues returns undefined for missing key", function () {
    const result = new GeometryResult();
    expect(result.getAttributeValues("NONEXISTENT")).toBeUndefined();
  });

  it("getAttributeType returns type info for a given key", function () {
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

  it("getAttributeType returns undefined for missing key", function () {
    const result = new GeometryResult();
    expect(result.getAttributeType("NONEXISTENT")).toBeUndefined();
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
});
