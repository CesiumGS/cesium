import { ApproximateTerrainHeights } from "../../Source/Cesium.js";
import { GeometryOffsetAttribute } from "../../Source/Cesium.js";
import { GroundGeometryUpdater } from "../../Source/Cesium.js";
import { HeightReference } from "../../Source/Cesium.js";

describe("DataSources/GroundGeometryUpdater", function () {
  beforeAll(function () {
    return ApproximateTerrainHeights.initialize();
  });

  afterAll(function () {
    ApproximateTerrainHeights._initPromise = undefined;
    ApproximateTerrainHeights._terrainHeights = undefined;
  });

  it("getGeometryHeight works for for height reference NONE and RELATIVE_TO_GROUND", function () {
    var expected = 30;
    var height = expected;
    var heightReference = HeightReference.NONE;
    expect(
      GroundGeometryUpdater.getGeometryHeight(height, heightReference)
    ).toEqual(expected);

    heightReference = HeightReference.RELATIVE_TO_GROUND;
    expect(
      GroundGeometryUpdater.getGeometryHeight(height, heightReference)
    ).toEqual(expected);
  });

  it("getGeometryHeight works for for height reference CLAMP_TO_GROUND", function () {
    var height = 50;
    var heightReference = HeightReference.CLAMP_TO_GROUND;
    expect(
      GroundGeometryUpdater.getGeometryHeight(height, heightReference)
    ).toEqual(0);
  });

  it("getGeometryExtrudedHeight works for for height reference NONE and RELATIVE_TO_GROUND", function () {
    var expected = 30;
    var height = expected;
    var heightReference = HeightReference.NONE;
    expect(
      GroundGeometryUpdater.getGeometryExtrudedHeight(height, heightReference)
    ).toEqual(expected);

    heightReference = HeightReference.RELATIVE_TO_GROUND;
    expect(
      GroundGeometryUpdater.getGeometryExtrudedHeight(height, heightReference)
    ).toEqual(expected);
  });

  it("getGeometryExtrudedHeight works for for height reference CLAMP_TO_GROUND", function () {
    var height = 50;
    var heightReference = HeightReference.CLAMP_TO_GROUND;
    expect(
      GroundGeometryUpdater.getGeometryExtrudedHeight(height, heightReference)
    ).toEqual(GroundGeometryUpdater.CLAMP_TO_GROUND);
  });

  it("computeGeometryOffsetAttribute works", function () {
    var height = 50;
    var extrudedHeight = 30;
    var heightReference;
    var extrudedHeightReference;
    var result = GroundGeometryUpdater.computeGeometryOffsetAttribute(
      height,
      heightReference,
      extrudedHeight,
      extrudedHeightReference
    );
    expect(result).toBeUndefined();

    heightReference = HeightReference.NONE;
    extrudedHeightReference = HeightReference.NONE;
    result = GroundGeometryUpdater.computeGeometryOffsetAttribute(
      height,
      heightReference,
      extrudedHeight,
      extrudedHeightReference
    );
    expect(result).toBeUndefined();

    heightReference = HeightReference.NONE;
    extrudedHeightReference = HeightReference.CLAMP_TO_GROUND;
    result = GroundGeometryUpdater.computeGeometryOffsetAttribute(
      height,
      heightReference,
      extrudedHeight,
      extrudedHeightReference
    );
    expect(result).toBeUndefined();

    heightReference = HeightReference.NONE;
    extrudedHeightReference = HeightReference.RELATIVE_TO_GROUND;
    result = GroundGeometryUpdater.computeGeometryOffsetAttribute(
      height,
      heightReference,
      extrudedHeight,
      extrudedHeightReference
    );
    expect(result).toBe(GeometryOffsetAttribute.TOP);

    heightReference = HeightReference.CLAMP_TO_GROUND;
    extrudedHeightReference = HeightReference.NONE;
    result = GroundGeometryUpdater.computeGeometryOffsetAttribute(
      height,
      heightReference,
      extrudedHeight,
      extrudedHeightReference
    );
    expect(result).toBe(GeometryOffsetAttribute.TOP);

    heightReference = HeightReference.CLAMP_TO_GROUND;
    extrudedHeightReference = HeightReference.CLAMP_TO_GROUND;
    result = GroundGeometryUpdater.computeGeometryOffsetAttribute(
      height,
      heightReference,
      extrudedHeight,
      extrudedHeightReference
    );
    expect(result).toBe(GeometryOffsetAttribute.TOP);

    heightReference = HeightReference.CLAMP_TO_GROUND;
    extrudedHeightReference = HeightReference.RELATIVE_TO_GROUND;
    result = GroundGeometryUpdater.computeGeometryOffsetAttribute(
      height,
      heightReference,
      extrudedHeight,
      extrudedHeightReference
    );
    expect(result).toBe(GeometryOffsetAttribute.ALL);

    heightReference = HeightReference.RELATIVE_TO_GROUND;
    extrudedHeightReference = HeightReference.NONE;
    result = GroundGeometryUpdater.computeGeometryOffsetAttribute(
      height,
      heightReference,
      extrudedHeight,
      extrudedHeightReference
    );
    expect(result).toBe(GeometryOffsetAttribute.TOP);

    heightReference = HeightReference.RELATIVE_TO_GROUND;
    extrudedHeightReference = HeightReference.CLAMP_TO_GROUND;
    result = GroundGeometryUpdater.computeGeometryOffsetAttribute(
      height,
      heightReference,
      extrudedHeight,
      extrudedHeightReference
    );
    expect(result).toBe(GeometryOffsetAttribute.TOP);

    heightReference = HeightReference.RELATIVE_TO_GROUND;
    extrudedHeightReference = HeightReference.RELATIVE_TO_GROUND;
    result = GroundGeometryUpdater.computeGeometryOffsetAttribute(
      height,
      heightReference,
      extrudedHeight,
      extrudedHeightReference
    );
    expect(result).toBe(GeometryOffsetAttribute.ALL);

    result = GroundGeometryUpdater.computeGeometryOffsetAttribute(
      undefined,
      heightReference,
      undefined,
      extrudedHeightReference
    );
    expect(result).toBeUndefined();
  });

  it("Overridden version of destroy is called", function () {
    var options = {
      scene: {
        frameState: {
          context: {
            depthTexture: true,
          },
        },
      },
      entity: {},
      geometryOptions: {},
      geometryPropertyName: "",
      observedPropertyNames: [],
    };

    var groundGeometryUpdater = new GroundGeometryUpdater(options);

    // Just make the terrain propery a dummy object with a destroy method
    var destroySpy = jasmine.createSpy("destroy");
    groundGeometryUpdater._terrainOffsetProperty = {
      destroy: destroySpy,
    };

    groundGeometryUpdater.destroy();

    // Make sure the terrain updater is destroyed and the parent class' destroy is called
    expect(destroySpy).toHaveBeenCalled();
    expect(groundGeometryUpdater._terrainOffsetProperty).toBeUndefined();
    expect(groundGeometryUpdater.isDestroyed()).toBe(true);
  });
});
