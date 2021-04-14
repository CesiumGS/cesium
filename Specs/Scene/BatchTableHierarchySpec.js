import { BatchTableHierarchy } from "../../Source/Cesium.js";

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

  it("throws without extension", function () {
    expect(function () {
      return new BatchTableHierarchy({
        extension: undefined,
        binaryBody: new Uint8Array(),
      });
    }).toThrowDeveloperError();
  });

  it("throws without binaryBody", function () {
    expect(function () {
      return new BatchTableHierarchy({
        extension: hierarchyExtension,
        binaryBody: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("hasProperty returns true if property exists", function () {
    fail();
  });

  it("hasProperty returns false if property does not exist", function () {
    fail();
  });

  it("hasProperty returns false if feature does not inherit property", function () {
    fail();
  });

  it("getProperty returns property value", function () {
    fail();
  });

  it("getProperty returns property value", function () {
    fail();
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
      binaryBody: new Uint8Array(),
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
      binaryBody: new Uint8Array(),
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

  //>>includeStart('debug', pragmas.debug);
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
        binaryBody: new Uint8Array(),
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
        binaryBody: new Uint8Array(),
      });
    }).toThrowDeveloperError();
  });
  //>>includeEnd('debug');

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
        binaryBody: new Uint8Array(),
      });
    }).toThrowDeveloperError();
  });
});
