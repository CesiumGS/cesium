import { MetadataClass, TileMetadata } from "../../Source/Cesium.js";

describe("Scene/TileMetadata", function () {
  var buildingClass = new MetadataClass({
    id: "building",
    class: {
      properties: {
        name: {
          type: "STRING",
        },
        height: {
          type: "FLOAT32",
          semantic: "_HEIGHT",
        },
        stories: {
          type: "UINT8",
        },
        occupancy: {
          type: "UINT16",
        },
      },
    },
  });

  it("options.tileMetadata and options.implicitSubtree are mutually exclusive", function () {
    // neither specified
    expect(function () {
      return new TileMetadata({
        class: buildingClass,
      });
    }).toThrowDeveloperError();

    // both specified
    expect(function () {
      return new TileMetadata({
        tileMetadata: {},
        implicitSubtree: {},
        class: buildingClass,
      });
    }).toThrowDeveloperError();
  });

  describe("explicit tile metadata", function () {
    it("creates tile metadata with default values", function () {
      var metadata = new TileMetadata({
        tileMetadata: {},
      });

      expect(metadata.class).toBeUndefined();
      expect(metadata.properties).toBeUndefined();
      expect(metadata.extras).toBeUndefined();
      expect(metadata.extensions).toBeUndefined();
    });

    it("creates tile metadata", function () {
      fail();
    });

    it("hasProperty returns true if a property exists", function () {
      fail();
    });

    it("hasProperty returns false if a property does not exist", function () {
      fail();
    });

    it("getPropertyIds returns array of property IDs", function () {
      fail();
    });

    it("getProperty returns undefined if a property does not exist", function () {
      fail();
    });

    it("getProperty returns the property value", function () {
      fail();
    });

    it("getProperty returns the property value", function () {
      fail();
    });

    it("setProperty creates property if it doesn't exist", function () {
      fail();
    });

    it("setProperty sets property value", function () {
      fail();
    });

    it("getPropertyBySemantic returns undefined when there's no property with the given semantic", function () {
      fail();
    });

    it("getPropertyBySemantic returns the property value", function () {
      fail();
    });

    it("setPropertyBySemantic sets property value", function () {
      fail();
    });

    it("setPropertyBySemantic doesn't set property value when there's no matching semantic", function () {
      fail();
    });
  });

  describe("implicit tile metadata", function () {
    it("creates tile metadata with default values", function () {
      fail();
    });

    it("creates tile metadata", function () {
      fail();
    });

    it("hasProperty returns true if a property exists", function () {
      fail();
    });

    it("hasProperty returns false if a property does not exist", function () {
      fail();
    });

    it("getPropertyIds returns array of property IDs", function () {
      fail();
    });

    it("getProperty returns undefined if a property does not exist", function () {
      fail();
    });

    it("getProperty returns the property value", function () {
      fail();
    });

    it("getProperty returns the property value", function () {
      fail();
    });

    it("setProperty creates property if it doesn't exist", function () {
      fail();
    });

    it("setProperty sets property value", function () {
      fail();
    });

    it("getPropertyBySemantic returns undefined when there's no property with the given semantic", function () {
      fail();
    });

    it("getPropertyBySemantic returns the property value", function () {
      fail();
    });

    it("setPropertyBySemantic sets property value", function () {
      fail();
    });

    it("setPropertyBySemantic doesn't set property value when there's no matching semantic", function () {
      fail();
    });
  });
});
