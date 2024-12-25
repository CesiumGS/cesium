import Cartographic from "../Core/Cartographic.js";
import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import FeatureDetection from "../Core/FeatureDetection.js";
import CesiumMath from "../Core/Math.js";
import Matrix3 from "../Core/Matrix3.js";
import RuntimeError from "../Core/RuntimeError.js";
import TaskProcessor from "../Core/TaskProcessor.js";

/**
 * Decode I3S using web workers.
 *
 * @private
 */
function I3SDecoder() {}

// Maximum concurrency to use when decoding draco models
I3SDecoder._maxDecodingConcurrency = Math.max(
  FeatureDetection.hardwareConcurrency - 1,
  1,
);

I3SDecoder._decodeTaskProcessor = new TaskProcessor(
  "decodeI3S",
  I3SDecoder._maxDecodingConcurrency,
);

I3SDecoder._promise = undefined;

async function initializeDecoder() {
  const result = await I3SDecoder._decodeTaskProcessor.initWebAssemblyModule({
    wasmBinaryFile: "ThirdParty/draco_decoder.wasm",
  });
  if (result) {
    return I3SDecoder._decodeTaskProcessor;
  }

  throw new RuntimeError("I3S decoder could not be initialized.");
}

/**
 * Transcodes I3S to glTF in a web worker
 * @param {String} url custom attributes source URL
 * @param {Object} defaultGeometrySchema Schema to use during decoding
 * @param {I3SGeometry} geometryData The draco encoded geometry data
 * @param {Array} [featureData] The draco encoded feature data
 * @param {Object} [symbologyData] The rendering symbology to apply
 * @returns Promise<undefined|object> Returns a promise which resolves to the glTF result, or undefined if the task cannot be scheduled this frame.
 *
 * @exception {RuntimeError} I3S decoder could not be initialized.
 */
I3SDecoder.decode = async function (
  url,
  defaultGeometrySchema,
  geometryData,
  featureData,
  symbologyData,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("url", url);
  Check.defined("defaultGeometrySchema", defaultGeometrySchema);
  Check.defined("geometryData", geometryData);
  //>>includeEnd('debug');

  if (!defined(I3SDecoder._promise)) {
    I3SDecoder._promise = initializeDecoder();
  }

  return I3SDecoder._promise.then(function (taskProcessor) {
    // Prepare the data to send to the worker
    const parentData = geometryData._parent._data;
    const parentRotationInverseMatrix =
      geometryData._parent._inverseRotationMatrix;

    let longitude = 0.0;
    let latitude = 0.0;
    let height = 0.0;

    if (defined(parentData.obb)) {
      longitude = parentData.obb.center[0];
      latitude = parentData.obb.center[1];
      height = parentData.obb.center[2];
    } else if (defined(parentData.mbs)) {
      longitude = parentData.mbs[0];
      latitude = parentData.mbs[1];
      height = parentData.mbs[2];
    }

    const axisFlipRotation = Matrix3.fromRotationX(-CesiumMath.PI_OVER_TWO);
    const parentRotation = new Matrix3();

    Matrix3.multiply(
      axisFlipRotation,
      parentRotationInverseMatrix,
      parentRotation,
    );

    const cartographicCenter = Cartographic.fromDegrees(
      longitude,
      latitude,
      height,
    );

    const cartesianCenter =
      Ellipsoid.WGS84.cartographicToCartesian(cartographicCenter);

    const payload = {
      binaryData: geometryData._data,
      featureData:
        defined(featureData) && defined(featureData[0])
          ? featureData[0].data
          : undefined,
      schema: defaultGeometrySchema,
      bufferInfo: geometryData._geometryBufferInfo,
      ellipsoidRadiiSquare: Ellipsoid.WGS84.radiiSquared,
      url: url,
      geoidDataList: geometryData._dataProvider._geoidDataList,
      cartographicCenter: cartographicCenter,
      cartesianCenter: cartesianCenter,
      parentRotation: parentRotation,
      enableFeatures: geometryData._dataProvider.showFeatures,
      splitGeometryByColorTransparency:
        geometryData._dataProvider.adjustMaterialAlphaMode,
      symbologyData: symbologyData,
      calculateNormals: geometryData._dataProvider.calculateNormals,
    };

    return taskProcessor.scheduleTask(payload);
  });
};

export default I3SDecoder;
