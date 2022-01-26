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
    const expected = 30;
    const height = expected;
    let heightReference = HeightReference.NONE;
    expect(
      GroundGeometryUpdater.getGeometryHeight(height, heightReference)
    ).toEqual(expected);

    heightReference = HeightReference.RELATIVE_TO_GROUND;
    expect(
      GroundGeometryUpdater.getGeometryHeight(height, heightReference)
    ).toEqual(expected);
  });

  it("getGeometryHeight works for for height reference CLAMP_TO_GROUND", function () {
    const height = 50;
    const heightReference = HeightReference.CLAMP_TO_GROUND;
    expect(
      GroundGeometryUpdater.getGeometryHeight(height, heightReference)
    ).toEqual(0);
  });

  it("getGeometryExtrudedHeight works for for height reference NONE and RELATIVE_TO_GROUND", function () {
    const expected = 30;
    const height = expected;
    let heightReference = HeightReference.NONE;
    expect(
      GroundGeometryUpdater.getGeometryExtrudedHeight(height, heightReference)
    ).toEqual(expected);

    heightReference = HeightReference.RELATIVE_TO_GROUND;
    expect(
      GroundGeometryUpdater.getGeometryExtrudedHeight(height, heightReference)
    ).toEqual(expected);
  });

  it("getGeometryExtrudedHeight works for for height reference CLAMP_TO_GROUND", function () {
    const height = 50;
    const heightReference = HeightReference.CLAMP_TO_GROUND;
    expect(
      GroundGeometryUpdater.getGeometryExtrudedHeight(height, heightReference)
    ).toEqual(GroundGeometryUpdater.CLAMP_TO_GROUND);
  });

  it("computeGeometryOffsetAttribute works", function () {
    const height = 50;
    const extrudedHeight = 30;
    let heightReference;
    let extrudedHeightReference;
    let result = GroundGeometryUpdater.computeGeometryOffsetAttribute(
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
    const options = {
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

    const groundGeometryUpdater = new GroundGeometryUpdater(options);

    // Just make the terrain propery a dummy object with a destroy method
    const destroySpy = jasmine.createSpy("destroy");
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
