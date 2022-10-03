import { JsonMetadataTable } from "../../Source/Cesium.js";

describe("Scene/JsonMetadataTable", function () {
  const properties = {
    priority: [2, 1, 0],
    labels: ["Point Cloud", "Mesh", "Raster"],
    uri: ["tree.las", "building.gltf", "map.tif"],
    sizeInfo: [
      {
        pointCount: 100,
      },
      {
        vertices: 3000,
        faces: 1000,
      },
      {
        width: 1024,
        height: 1024,
      },
    ],
    mixedValues: ["red", 3, false],
  };
  const count = 3;

  let table;
  beforeEach(function () {
    table = new JsonMetadataTable({
      count: count,
      properties: properties,
    });
  });

  it("constructor throws without count", function () {
    expect(function () {
      return new JsonMetadataTable({
        count: undefined,
        properties: properties,
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without properties", function () {
    expect(function () {
      return new JsonMetadataTable({
        count: count,
        properties: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("constructor clones properties", function () {
    const oldValue = properties.sizeInfo[0];
    const sizeInfo = {
      lengthBytes: 1024,
    };
    table.setProperty(0, "sizeInfo", sizeInfo);
    expect(properties.sizeInfo[0]).toBe(oldValue);
    expect(table.getProperty(0, "sizeInfo")).toEqual(sizeInfo);
  });

  it("hasProperty returns true if the table has this property", function () {
    expect(table.hasProperty("priority")).toBe(true);
  });

  it("hasProperty returns false if the table does not have this property", function () {
    expect(table.hasProperty("price")).toBe(false);
  });

  it("getPropertyIds returns a list of property Ids", function () {
    expect(table.getPropertyIds().sort()).toEqual([
      "labels",
      "mixedValues",
      "priority",
      "sizeInfo",
      "uri",
    ]);
  });

  it("getProperty returns undefined for unknown property Id", function () {
    expect(table.getProperty(0, "color")).not.toBeDefined();
  });

  it("getProperty throws without index", function () {
    expect(function () {
      return table.getProperty(undefined, "priority");
    }).toThrowDeveloperError();
  });

  it("getProperty throws for out-of-bounds index", function () {
    expect(function () {
      return table.getProperty(5, "priority");
    }).toThrowDeveloperError();
  });

  it("getProperty throws without propertyId", function () {
    expect(function () {
      return table.getProperty(5, undefined);
    }).toThrowDeveloperError();
  });

  it("getProperty returns the property value", function () {
    expect(table.getProperty(0, "priority")).toBe(2);
    expect(table.getProperty(1, "priority")).toBe(1);
    expect(table.getProperty(2, "priority")).toBe(0);
  });

  it("getProperty returns copy of value", function () {
    const value1 = table.getProperty(1, "sizeInfo");
    const value2 = table.getProperty(1, "sizeInfo");
    expect(value1).toEqual(properties.sizeInfo[1]);
    expect(value1).toEqual(value2);
    expect(value2).not.toBe(value1);
  });

  it("getProperty works with heterogeneous values", function () {
    expect(table.getProperty(0, "mixedValues")).toBe("red");
    expect(table.getProperty(1, "mixedValues")).toBe(3);
    expect(table.getProperty(2, "mixedValues")).toBe(false);
  });

  it("setProperty throws without index", function () {
    expect(function () {
      return table.setProperty(undefined, undefined);
    }).toThrowDeveloperError();
  });

  it("setProperty throws for out-of-bounds index", function () {
    expect(function () {
      return table.setProperty(5, "priority", 3);
    }).toThrowDeveloperError();
  });

  it("setProperty throws without propertyId", function () {
    expect(function () {
      return table.setProperty(5, undefined);
    }).toThrowDeveloperError();
  });

  it("setProperty creates a new property if it doesn't exist", function () {
    expect(table.getProperty(0, "color")).not.toBeDefined();

    table.setProperty(0, "color", [255, 255, 255, 1.0]);
    expect(table.getProperty(0, "color")).toEqual([255, 255, 255, 1.0]);
  });

  it("setProperty sets property value", function () {
    const sizeInfo = {
      lengthBytes: 1024,
    };
    table.setProperty(0, "sizeInfo", sizeInfo);
    expect(table.getProperty(0, "sizeInfo")).toEqual(sizeInfo);
  });

  it("setProperty copies value", function () {
    const sizeInfo = {
      lengthBytes: 1024,
    };
    table.setProperty(1, "sizeInfo", sizeInfo);
    sizeInfo.offset = 8;
    expect(table.getProperty(1, "sizeInfo")).not.toEqual(sizeInfo);
  });
});
