import { PntsParser, RuntimeError } from "../../Source/Cesium.js";
import Cesium3DTilesTester from "../Cesium3DTilesTester.js";

describe("Scene/PntsParser", function () {
  it("throws without arrayBuffer", function () {
    expect(function () {
      return PntsParser.parse();
    }).toThrowDeveloperError();
  });

  it("throws with invalid version", function () {
    const arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
      version: 2,
    });
    expect(function () {
      return PntsParser.parse(arrayBuffer);
    }).toThrowError(RuntimeError);
  });

  it("throws if featureTableJsonByteLength is 0", function () {
    const arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
      featureTableJsonByteLength: 0,
    });
    expect(function () {
      return PntsParser.parse(arrayBuffer);
    }).toThrowError(RuntimeError);
  });

  it("throws if the feature table does not contain POINTS_LENGTH", function () {
    const arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
      featureTableJson: {
        POSITION: {
          byteOffset: 0,
        },
      },
    });
    expect(function () {
      return PntsParser.parse(arrayBuffer);
    }).toThrowError(RuntimeError);
  });

  it("throws if the feature table does not contain POSITION or POSITION_QUANTIZED", function () {
    const arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
      featureTableJson: {
        POINTS_LENGTH: 1,
      },
    });
    expect(function () {
      return PntsParser.parse(arrayBuffer);
    }).toThrowError(RuntimeError);
  });

  it("throws if the positions are quantized and the feature table does not contain QUANTIZED_VOLUME_SCALE", function () {
    const arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
      featureTableJson: {
        POINTS_LENGTH: 1,
        POSITION_QUANTIZED: {
          byteOffset: 0,
        },
        QUANTIZED_VOLUME_OFFSET: [0.0, 0.0, 0.0],
      },
    });
    expect(function () {
      return PntsParser.parse(arrayBuffer);
    }).toThrowError(RuntimeError);
  });

  it("throws if the positions are quantized and the feature table does not contain QUANTIZED_VOLUME_OFFSET", function () {
    const arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
      featureTableJson: {
        POINTS_LENGTH: 1,
        POSITION_QUANTIZED: {
          byteOffset: 0,
        },
        QUANTIZED_VOLUME_SCALE: [1.0, 1.0, 1.0],
      },
    });
    expect(function () {
      return PntsParser.parse(arrayBuffer);
    }).toThrowError(RuntimeError);
  });

  it("throws if the BATCH_ID semantic is defined but BATCH_LENGTH is not", function () {
    const arrayBuffer = Cesium3DTilesTester.generatePointCloudTileBuffer({
      featureTableJson: {
        POINTS_LENGTH: 2,
        POSITION: [0.0, 0.0, 0.0, 1.0, 1.0, 1.0],
        BATCH_ID: [0, 1],
      },
    });
    expect(function () {
      return PntsParser.parse(arrayBuffer);
    }).toThrowError(RuntimeError);
  });
});
