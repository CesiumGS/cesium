import { BatchTableHierarchy, Cartesian2 } from "../../Source/Cesium.js";

describe("Scene/BatchTableHierarchy", function () {
  var hierarchyExtension = {
    classes: [
      {
        name: "Wall",
        length: 6,
        instances: {
          color: ["white", "red", "yellow", "gray", "brown", "black"],
        },
      },
      {
        name: "Building",
        length: 3,
        instances: {
          name: ["unit29", "unit20", "unit93"],
          address: ["100 Main St", "102 Main St", "104 Main St"],
        },
      },
      {
        name: "Owner",
        length: 3,
        instances: {
          type: ["city", "resident", "commercial"],
          id: [1120, 1250, 6445],
        },
      },
    ],
    instancesLength: 12,
    classIds: [0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2],
    parentCounts: [1, 3, 2, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    parentIds: [6, 6, 10, 11, 7, 11, 7, 8, 8, 10, 10, 9],
  };

  var binaryHierarchy = {
    classes: [
      {
        name: "Box",
        length: 3,
        instances: {
          items: {
            type: "SCALAR",
            componentType: "UNSIGNED_BYTE",
            byteOffset: 0,
          },
          coordinates: {
            type: "VEC2",
            componentType: "UNSIGNED_BYTE",
            byteOffset: 4,
          },
        },
      },
      {
        name: "Pallet",
        length: 1,
        instances: {
          boxCount: [1],
        },
      },
    ],
    instancesLength: 4,
    classIds: [0, 1, 0, 0],
    parentIds: [1, 1, 2, 3],
  };
  var binaryHierarchyBody = new Uint8Array([1, 2, 3, 0, 1, 0, 1, 2, 3, 2]);

  it("throws without extension", function () {
    expect(function () {
      return new BatchTableHierarchy({
        extension: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("throws for invalid binary property", function () {
    var missingType = {
      classes: [
        {
          name: "Resources",
          length: 2,
          instances: {
            foodUnits: {
              byteOffset: 0,
              componentType: "UNSIGNED_SHORT",
            },
            waterUnits: [15, 13],
          },
        },
      ],
      instancesLength: 2,
      classIds: [0, 0],
      parentIds: [1, 1],
    };

    // Using 16 bits because this is the default size
    var foodUnits = new Uint16Array([10, 20]);
    var binaryBody = new Uint8Array(foodUnits.buffer);

    expect(function () {
      return new BatchTableHierarchy({
        extension: missingType,
        binaryBody: binaryBody,
      });
    }).toThrowRuntimeError();

    var missingComponentType = {
      classes: [
        {
          name: "Resources",
          length: 2,
          instances: {
            foodUnits: {
              byteOffset: 0,
              type: "SCALAR",
            },
            waterUnits: [15, 13],
          },
        },
      ],
      instancesLength: 2,
      classIds: [0, 0],
      parentIds: [1, 1],
    };

    expect(function () {
      return new BatchTableHierarchy({
        extension: missingComponentType,
        binaryBody: binaryBody,
      });
    }).toThrowRuntimeError();
  });

  it("throws if binaryBody is needed and not provided", function () {
    var hierarchyExtension = {
      classes: [
        {
          name: "Resources",
          length: 2,
          instances: {
            foodUnits: {
              byteOffset: 0,
              type: "SCALAR",
              componentType: "UNSIGNED_SHORT",
            },
            waterUnits: [15, 13],
          },
        },
      ],
      instancesLength: 2,
      classIds: [0, 0],
      parentIds: [1, 1],
    };

    expect(function () {
      return new BatchTableHierarchy({
        extension: hierarchyExtension,
      });
    }).toThrowRuntimeError();
  });

  it("hasProperty returns true if the feature has this property", function () {
    var hierarchy = new BatchTableHierarchy({
      extension: hierarchyExtension,
    });
    expect(hierarchy.hasProperty(0, "color")).toBe(true);
  });

  it("hasProperty returns false if the feature does not have this property", function () {
    var hierarchy = new BatchTableHierarchy({
      extension: hierarchyExtension,
    });
    expect(hierarchy.hasProperty(0, "height")).toBe(false);
  });

  it("hasProperty returns false if the feature does not inherit this property", function () {
    var hierarchy = new BatchTableHierarchy({
      extension: hierarchyExtension,
    });
    expect(hierarchy.hasProperty(6, "color")).toBe(false);
  });

  it("propertyExists returns true if any feature has this property", function () {
    var hierarchy = new BatchTableHierarchy({
      extension: hierarchyExtension,
    });
    expect(hierarchy.propertyExists("color")).toBe(true);
  });

  it("propertyExists returns false if no features have this property", function () {
    var hierarchy = new BatchTableHierarchy({
      extension: hierarchyExtension,
    });
    expect(hierarchy.propertyExists("other")).toBe(false);
  });

  it("getProperty returns property value", function () {
    var hierarchy = new BatchTableHierarchy({
      extension: hierarchyExtension,
    });
    expect(hierarchy.getProperty(0, "color")).toBe("white");
    expect(hierarchy.getProperty(0, "name")).toBe("unit29");
    expect(hierarchy.getProperty(0, "address")).toBe("100 Main St");
    expect(hierarchy.getProperty(0, "type")).toBe("resident");
    expect(hierarchy.getProperty(0, "id")).toBe(1250);
  });

  it("getProperty returns undefined for unknown property", function () {
    var hierarchy = new BatchTableHierarchy({
      extension: hierarchyExtension,
    });
    expect(hierarchy.getProperty(0, "occupancy")).not.toBeDefined();
  });

  it("getProperty works with binary properties", function () {
    var hierarchy = new BatchTableHierarchy({
      extension: binaryHierarchy,
      binaryBody: binaryHierarchyBody,
    });
    expect(hierarchy.getProperty(0, "items")).toBe(1);
    expect(hierarchy.getProperty(0, "coordinates")).toEqual(
      new Cartesian2(1, 0)
    );
    expect(hierarchy.getProperty(0, "boxCount")).toBe(1);

    expect(hierarchy.getProperty(1, "items")).not.toBeDefined();
    expect(hierarchy.getProperty(1, "coordinates")).not.toBeDefined();
    expect(hierarchy.getProperty(1, "boxCount")).toBe(1);

    expect(hierarchy.getProperty(2, "items")).toBe(2);
    expect(hierarchy.getProperty(2, "coordinates")).toEqual(
      new Cartesian2(1, 2)
    );
    expect(hierarchy.getProperty(2, "boxCount")).not.toBeDefined();

    expect(hierarchy.getProperty(3, "items")).toBe(3);
    expect(hierarchy.getProperty(3, "coordinates")).toEqual(
      new Cartesian2(3, 2)
    );
    expect(hierarchy.getProperty(3, "boxCount")).not.toBeDefined();
  });

  it("setProperty throws when trying to set an inherited property", function () {
    var hierarchy = new BatchTableHierarchy({
      extension: hierarchyExtension,
    });
    expect(function () {
      hierarchy.setProperty(0, "type", "city");
    }).toThrowDeveloperError();
  });

  it("setProperty returns false when property does not exist", function () {
    var hierarchy = new BatchTableHierarchy({
      extension: hierarchyExtension,
    });
    expect(hierarchy.setProperty(0, "occupancy", 100)).toBe(false);
  });

  it("setProperty sets property value", function () {
    var hierarchy = new BatchTableHierarchy({
      extension: hierarchyExtension,
    });
    expect(hierarchy.getProperty(0, "color")).toBe("white");
    expect(hierarchy.setProperty(0, "color", "brown")).toBe(true);
    expect(hierarchy.getProperty(0, "color")).toBe("brown");
  });

  it("setProperty works with binary values", function () {
    var hierarchy = new BatchTableHierarchy({
      extension: binaryHierarchy,
      binaryBody: binaryHierarchyBody,
    });

    expect(hierarchy.getProperty(0, "items")).toBe(1);
    expect(hierarchy.setProperty(0, "items", 5)).toBe(true);
    expect(hierarchy.getProperty(0, "items")).toBe(5);

    expect(hierarchy.getProperty(2, "coordinates")).toEqual(
      new Cartesian2(1, 2)
    );
    var position = new Cartesian2(5, 5);
    expect(hierarchy.setProperty(2, "coordinates", position)).toBe(true);
    expect(hierarchy.getProperty(2, "coordinates")).toEqual(position);
  });

  it("validates hierarchy with multiple parents", function () {
    //     building0
    //     /      \
    //  door0    door1
    //     \      /
    //      window0
    var extension = {
      instancesLength: 4,
      classIds: [0, 1, 1, 2],
      parentCounts: [2, 1, 1, 0],
      parentIds: [1, 2, 3, 3],
      classes: [
        {
          name: "window",
          length: 1,
          instances: {
            window_name: ["window0"],
          },
        },
        {
          name: "door",
          length: 2,
          instances: {
            door_name: ["door0", "door1"],
          },
        },
        {
          name: "building",
          length: 1,
          instances: {
            building_name: ["building0"],
          },
        },
      ],
    };

    var hierarchy = new BatchTableHierarchy({
      extension: extension,
    });

    expect(hierarchy.getPropertyIds(0).sort()).toEqual([
      "building_name",
      "door_name",
      "window_name",
    ]);
  });

  it("validates hierarchy with multiple parents (2)", function () {
    //             zone
    //             / |  \
    //   building0   |   \
    //     /      \  |    \
    //    door0  door1    /
    //        \    |     /
    //           window0
    var extension = {
      instancesLength: 4,
      classIds: [0, 1, 1, 2, 3],
      parentCounts: [3, 1, 2, 1, 0],
      parentIds: [1, 2, 4, 3, 3, 4, 4],
      classes: [
        {
          name: "window",
          length: 1,
          instances: {
            window_name: ["window0"],
          },
        },
        {
          name: "door",
          length: 2,
          instances: {
            door_name: ["door0", "door1"],
          },
        },
        {
          name: "building",
          length: 1,
          instances: {
            building_name: ["building0"],
          },
        },
        {
          name: "zone",
          length: 1,
          instances: {
            zone_name: ["zone0"],
          },
        },
      ],
    };

    var hierarchy = new BatchTableHierarchy({
      extension: extension,
    });
    expect(hierarchy.getPropertyIds(0).sort()).toEqual([
      "building_name",
      "door_name",
      "window_name",
      "zone_name",
    ]); // check window
    expect(hierarchy.hasProperty(1, "zone_name")).toEqual(true); // check doo0
    expect(hierarchy.hasProperty(2, "zone_name")).toEqual(true); // check door1
  });

  // Circular dependencies are only caught in debug builds.
  it("throws if hierarchy has a circular dependency", function () {
    // window0 -> door0 -> building0 -> window0
    var extension = {
      instancesLength: 3,
      classIds: [0, 1, 2],
      parentIds: [1, 2, 0],
      classes: [
        {
          name: "window",
          length: 1,
          instances: {
            window_name: ["window0"],
          },
        },
        {
          name: "door",
          length: 1,
          instances: {
            door_name: ["door0"],
          },
        },
        {
          name: "building",
          length: 1,
          instances: {
            building_name: ["building0"],
          },
        },
      ],
    };

    expect(function () {
      return new BatchTableHierarchy({
        extension: extension,
      });
    }).toThrowDeveloperError();
  });

  it("throws if hierarchy has a circular dependency (2)", function () {
    // window0 -> door0 -> building0 -> window1 -> door0
    var extension = {
      instancesLength: 4,
      classIds: [0, 1, 2, 0],
      parentIds: [1, 2, 3, 1],
      classes: [
        {
          name: "window",
          length: 2,
          instances: {
            window_name: ["window0", "window1"],
          },
        },
        {
          name: "door",
          length: 1,
          instances: {
            door_name: ["door0"],
          },
        },
        {
          name: "building",
          length: 1,
          instances: {
            building_name: ["building0"],
          },
        },
      ],
    };

    expect(function () {
      return new BatchTableHierarchy({
        extension: extension,
      });
    }).toThrowDeveloperError();
  });

  it("throws if an instance's parentId exceeds instancesLength", function () {
    var extension = {
      instancesLength: 2,
      classIds: [0, 1],
      parentIds: [1, 2],
      classes: [
        {
          name: "window",
          length: 1,
          instances: {
            window_name: ["window0"],
          },
        },
        {
          name: "door",
          length: 1,
          instances: {
            door_name: ["door0"],
          },
        },
      ],
    };

    expect(function () {
      return new BatchTableHierarchy({
        extension: extension,
      });
    }).toThrowDeveloperError();
  });
});
