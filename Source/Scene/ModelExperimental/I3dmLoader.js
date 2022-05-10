import AttributeCompression from "../../Core/AttributeCompression.js";
import Axis from "../Axis.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Cesium3DTileFeatureTable from "../Cesium3DTileFeatureTable.js";
import Check from "../../Core/Check.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import Ellipsoid from "../../Core/Ellipsoid.js";
import StructuralMetadata from "../StructuralMetadata.js";
import getStringFromTypedArray from "../../Core/getStringFromTypedArray.js";
import GltfLoader from "../GltfLoader.js";
import I3dmParser from "../I3dmParser.js";
import Matrix3 from "../../Core/Matrix3.js";
import Matrix4 from "../../Core/Matrix4.js";
import MetadataClass from "../MetadataClass.js";
import ModelComponents from "../ModelComponents.js";
import parseBatchTable from "../parseBatchTable.js";
import PropertyTable from "../PropertyTable.js";
import Quaternion from "../../Core/Quaternion.js";
import ResourceLoader from "../ResourceLoader.js";
import RuntimeError from "../../Core/RuntimeError.js";
import Transforms from "../../Core/Transforms.js";
import InstanceAttributeSemantic from "../InstanceAttributeSemantic.js";
import AttributeType from "../AttributeType.js";
import BoundingSphere from "../../Core/BoundingSphere.js";

const I3dmLoaderState = {
  UNLOADED: 0,
  LOADING: 1,
  PROCESSING: 2,
  READY: 3,
  FAILED: 4,
};

const Attribute = ModelComponents.Attribute;
const FeatureIdAttribute = ModelComponents.FeatureIdAttribute;
const Instances = ModelComponents.Instances;

/**
 * Loads an Instanced 3D Model.
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @alias I3dmLoader
 * @constructor
 * @augments ResourceLoader
 * @private
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.i3dmResource The {@link Resource} containing the i3dm.
 * @param {ArrayBuffer} options.arrayBuffer The array buffer of the i3dm contents.
 * @param {Number} [options.byteOffset=0] The byte offset to the beginning of the i3dm contents in the array buffer.
 * @param {Resource} [options.baseResource] The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Boolean} [options.releaseGltfJson=false] When true, the glTF JSON is released once the glTF is loaded. This is is especially useful for cases like 3D Tiles, where each .gltf model is unique and caching the glTF JSON is not effective.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 * @param {Boolean} [options.incrementallyLoadTextures=true] Determine if textures may continue to stream in after the glTF is loaded.
 * @param {Axis} [options.upAxis=Axis.Y] The up-axis of the glTF model.
 * @param {Axis} [options.forwardAxis=Axis.X] The forward-axis of the glTF model.
 * @param {Boolean} [options.loadAsTypedArray=false] Load all attributes as typed arrays instead of GPU buffers.
 * @param {Boolean} [options.loadIndicesForWireframe=false] Load the index buffer as a typed array so wireframe indices can be created for WebGL1.
 */
function I3dmLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const i3dmResource = options.i3dmResource;
  const arrayBuffer = options.arrayBuffer;
  let baseResource = options.baseResource;
  const byteOffset = defaultValue(options.byteOffset, 0);
  const releaseGltfJson = defaultValue(options.releaseGltfJson, false);
  const asynchronous = defaultValue(options.asynchronous, true);
  const incrementallyLoadTextures = defaultValue(
    options.incrementallyLoadTextures,
    true
  );
  const upAxis = defaultValue(options.upAxis, Axis.Y);
  const forwardAxis = defaultValue(options.forwardAxis, Axis.X);
  const loadAsTypedArray = defaultValue(options.loadAsTypedArray, false);
  const loadIndicesForWireframe = defaultValue(
    options.loadIndicesForWireframe,
    false
  );

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.i3dmResource", i3dmResource);
  Check.typeOf.object("options.arrayBuffer", arrayBuffer);
  //>>includeEnd('debug');

  baseResource = defined(baseResource) ? baseResource : i3dmResource.clone();

  this._i3dmResource = i3dmResource;
  this._baseResource = baseResource;
  this._arrayBuffer = arrayBuffer;
  this._byteOffset = byteOffset;
  this._releaseGltfJson = releaseGltfJson;
  this._asynchronous = asynchronous;
  this._incrementallyLoadTextures = incrementallyLoadTextures;
  this._upAxis = upAxis;
  this._forwardAxis = forwardAxis;
  this._loadAsTypedArray = loadAsTypedArray;
  this._loadIndicesForWireframe = loadIndicesForWireframe;

  this._state = I3dmLoaderState.UNLOADED;
  this._promise = undefined;

  this._gltfLoader = undefined;

  this._transform = Matrix4.IDENTITY;
  this._batchTable = undefined;
  this._featureTable = undefined;
  this._instancesLength = 0;
}

if (defined(Object.create)) {
  I3dmLoader.prototype = Object.create(ResourceLoader.prototype);
  I3dmLoader.prototype.constructor = I3dmLoader;
}

Object.defineProperties(I3dmLoader.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready. Returns undefined if the load function has not yet been called.
   *
   * @memberof I3dmLoader.prototype
   *
   * @type {Promise.<I3dmLoader>|Undefined}
   * @readonly
   * @private
   */
  promise: {
    get: function () {
      return this._promise;
    },
  },

  /**
   * A promise that resolves when all textures are loaded.
   * When <code>incrementallyLoadTextures</code> is true this may resolve after
   * <code>promise</code> resolves.
   *
   * @memberof I3dmLoader.prototype
   *
   * @type {Promise}
   * @readonly
   * @private
   */
  texturesLoadedPromise: {
    get: function () {
      return this._gltfLoader.texturesLoadedPromise;
    },
  },
  /**
   * The cache key of the resource
   *
   * @memberof I3dmLoader.prototype
   *
   * @type {String}
   * @readonly
   * @private
   */
  cacheKey: {
    get: function () {
      return undefined;
    },
  },

  /**
   * The loaded components.
   *
   * @memberof I3dmLoader.prototype
   *
   * @type {ModelComponents.Components}
   * @default {@link Matrix4.IDENTITY}
   * @readonly
   * @private
   */
  components: {
    get: function () {
      return this._components;
    },
  },
});

/**
 * Loads the resource.
 * @private
 */
I3dmLoader.prototype.load = function () {
  // Parse the i3dm into its various sections.
  const i3dm = I3dmParser.parse(this._arrayBuffer, this._byteOffset);

  const featureTableJson = i3dm.featureTableJson;
  const featureTableBinary = i3dm.featureTableBinary;
  const batchTableJson = i3dm.batchTableJson;
  const batchTableBinary = i3dm.batchTableBinary;
  const gltfFormat = i3dm.gltfFormat;

  // Generate the feature table.
  const featureTable = new Cesium3DTileFeatureTable(
    featureTableJson,
    featureTableBinary
  );
  this._featureTable = featureTable;

  // Get the number of instances in the i3dm.
  const instancesLength = featureTable.getGlobalProperty("INSTANCES_LENGTH");
  featureTable.featuresLength = instancesLength;
  if (!defined(instancesLength)) {
    throw new RuntimeError(
      "Feature table global property: INSTANCES_LENGTH must be defined"
    );
  }
  this._instancesLength = instancesLength;

  // Get the RTC center, if available, and set the loader's transform.
  const rtcCenter = featureTable.getGlobalProperty(
    "RTC_CENTER",
    ComponentDatatype.FLOAT,
    3
  );
  if (defined(rtcCenter)) {
    this._transform = Matrix4.fromTranslation(Cartesian3.fromArray(rtcCenter));
  }

  // Save the batch table section to use for StructuralMetadata generation.
  this._batchTable = {
    json: batchTableJson,
    binary: batchTableBinary,
  };

  const loaderOptions = {
    upAxis: this._upAxis,
    forwardAxis: this._forwardAxis,
    releaseGltfJson: this._releaseGltfJson,
    incrementallyLoadTextures: this._incrementallyLoadTextures,
    loadAsTypedArray: this._loadAsTypedArray,
    loadIndicesForWireframe: this._loadIndicesForWireframe,
  };

  if (gltfFormat === 0) {
    let gltfUrl = getStringFromTypedArray(i3dm.gltf);

    // We need to remove padding from the end of the model URL in case this tile was part of a composite tile.
    // This removes all white space and null characters from the end of the string.
    gltfUrl = gltfUrl.replace(/[\s\0]+$/, "");
    const gltfResource = this._baseResource.getDerivedResource({
      url: gltfUrl,
    });
    loaderOptions.gltfResource = gltfResource;
    loaderOptions.baseResource = gltfResource;
  } else {
    loaderOptions.gltfResource = this._i3dmResource;
    loaderOptions.typedArray = i3dm.gltf;
  }

  // Create the GltfLoader, update the state and load the glTF.
  const gltfLoader = new GltfLoader(loaderOptions);

  this._gltfLoader = gltfLoader;
  this._state = I3dmLoaderState.LOADING;

  const that = this;
  gltfLoader.load();
  this._promise = gltfLoader.promise
    .then(function () {
      if (that.isDestroyed()) {
        return;
      }

      const components = gltfLoader.components;
      components.transform = that._transform;
      createInstances(that, components);
      createStructuralMetadata(that, components);
      that._components = components;

      that._state = I3dmLoaderState.READY;
      return that;
    })
    .catch(function (error) {
      if (that.isDestroyed()) {
        return;
      }
      return handleError(that, error);
    });
};

function handleError(i3dmLoader, error) {
  i3dmLoader.unload();
  i3dmLoader._state = I3dmLoaderState.FAILED;
  const errorMessage = "Failed to load i3dm";
  error = i3dmLoader.getError(errorMessage, error);
  return Promise.reject(error);
}

I3dmLoader.prototype.process = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("frameState", frameState);
  //>>includeEnd('debug');

  if (this._state === I3dmLoaderState.LOADING) {
    this._state = I3dmLoaderState.PROCESSING;
  }

  if (this._state === I3dmLoaderState.PROCESSING) {
    this._gltfLoader.process(frameState);
  }
};

function createStructuralMetadata(loader, components) {
  const batchTable = loader._batchTable;
  const instancesLength = loader._instancesLength;

  if (instancesLength === 0) {
    return;
  }

  let structuralMetadata;
  if (defined(batchTable.json)) {
    // Add the structural metadata from the batch table to the model components.
    structuralMetadata = parseBatchTable({
      count: instancesLength,
      batchTable: batchTable.json,
      binaryBody: batchTable.binary,
    });
  } else {
    // If batch table is not defined, create a property table without any properties.
    const emptyPropertyTable = new PropertyTable({
      name: MetadataClass.BATCH_TABLE_CLASS_NAME,
      count: instancesLength,
    });
    structuralMetadata = new StructuralMetadata({
      schema: {},
      propertyTables: [emptyPropertyTable],
    });
  }

  components.structuralMetadata = structuralMetadata;
}

const positionScratch = new Cartesian3();
const propertyScratch1 = new Array(4);
function createInstances(loader, components) {
  let i;
  const featureTable = loader._featureTable;
  const instancesLength = loader._instancesLength;

  if (instancesLength === 0) {
    return;
  }

  const rtcCenter = featureTable.getGlobalProperty(
    "RTC_CENTER",
    ComponentDatatype.FLOAT,
    3
  );

  const eastNorthUp = featureTable.getGlobalProperty("EAST_NORTH_UP");
  const hasRotation =
    featureTable.hasProperty("NORMAL_UP") ||
    featureTable.hasProperty("NORMAL_UP_OCT32P") ||
    eastNorthUp;

  const hasScale =
    featureTable.hasProperty("SCALE") ||
    featureTable.hasProperty("SCALE_NON_UNIFORM");

  const translationTypedArray = getPositions(featureTable, instancesLength);
  let rotationTypedArray;
  if (hasRotation) {
    rotationTypedArray = new Float32Array(4 * instancesLength);
  }
  let scaleTypedArray;
  if (hasScale) {
    scaleTypedArray = new Float32Array(3 * instancesLength);
  }
  const featureIdArray = new Float32Array(instancesLength);

  const instancePositions = Cartesian3.unpackArray(translationTypedArray);
  let instancePosition = new Cartesian3();

  const instanceNormalRight = new Cartesian3();
  const instanceNormalUp = new Cartesian3();
  const instanceNormalForward = new Cartesian3();
  const instanceRotation = new Matrix3();
  const instanceQuaternion = new Quaternion();
  const instanceQuaternionArray = new Array(4);

  const instanceScale = new Cartesian3();
  const instanceScaleArray = new Array(3);

  const instanceTransform = new Matrix4();

  // For I3DMs that do not define an RTC center, we manually compute a BoundingSphere and store
  // positions relative to the center, to be uploaded to the GPU. This avoids jittering at higher
  // precisions.
  if (!defined(rtcCenter)) {
    const positionBoundingSphere = BoundingSphere.fromPoints(instancePositions);

    for (i = 0; i < instancePositions.length; i++) {
      Cartesian3.subtract(
        instancePositions[i],
        positionBoundingSphere.center,
        positionScratch
      );

      translationTypedArray[3 * i + 0] = positionScratch.x;
      translationTypedArray[3 * i + 1] = positionScratch.y;
      translationTypedArray[3 * i + 2] = positionScratch.z;
    }

    // Set the center of the bounding sphere as the RTC center transform.
    components.transform = Matrix4.fromTranslation(
      positionBoundingSphere.center
    );
  }

  for (i = 0; i < instancesLength; i++) {
    // Get the instance position
    instancePosition = Cartesian3.clone(instancePositions[i]);

    if (defined(rtcCenter)) {
      Cartesian3.add(
        instancePosition,
        Cartesian3.unpack(rtcCenter),
        instancePosition
      );
    }

    // Get the instance rotation, if present
    if (hasRotation) {
      processRotation(
        featureTable,
        eastNorthUp,
        i,
        instanceQuaternion,
        instancePosition,
        instanceNormalUp,
        instanceNormalRight,
        instanceNormalForward,
        instanceRotation,
        instanceTransform
      );
      Quaternion.pack(instanceQuaternion, instanceQuaternionArray, 0);
      rotationTypedArray[4 * i + 0] = instanceQuaternionArray[0];
      rotationTypedArray[4 * i + 1] = instanceQuaternionArray[1];
      rotationTypedArray[4 * i + 2] = instanceQuaternionArray[2];
      rotationTypedArray[4 * i + 3] = instanceQuaternionArray[3];
    }

    // Get the instance scale, if present
    if (hasScale) {
      processScale(featureTable, i, instanceScale);
      Cartesian3.pack(instanceScale, instanceScaleArray, 0);
      scaleTypedArray[3 * i + 0] = instanceScaleArray[0];
      scaleTypedArray[3 * i + 1] = instanceScaleArray[1];
      scaleTypedArray[3 * i + 2] = instanceScaleArray[2];
    }

    // Get the batchId
    let batchId = featureTable.getProperty(
      "BATCH_ID",
      ComponentDatatype.UNSIGNED_SHORT,
      1,
      i
    );
    if (!defined(batchId)) {
      // If BATCH_ID semantic is undefined, batchId is just the instance number
      batchId = i;
    }
    featureIdArray[i] = batchId;
  }

  // Create instances.
  const instances = new Instances();
  instances.transformInWorldSpace = true;

  // Create translation vertex attribute.
  const translationAttribute = new Attribute();
  translationAttribute.name = "Instance Translation";
  translationAttribute.semantic = InstanceAttributeSemantic.TRANSLATION;
  translationAttribute.componentDatatype = ComponentDatatype.FLOAT;
  translationAttribute.type = AttributeType.VEC3;
  translationAttribute.count = instancesLength;
  translationAttribute.packedTypedArray = translationTypedArray;
  instances.attributes.push(translationAttribute);

  // Create rotation vertex attribute.
  if (hasRotation) {
    const rotationAttribute = new Attribute();
    rotationAttribute.name = "Instance Rotation";
    rotationAttribute.semantic = InstanceAttributeSemantic.ROTATION;
    rotationAttribute.componentDatatype = ComponentDatatype.FLOAT;
    rotationAttribute.type = AttributeType.VEC4;
    rotationAttribute.count = instancesLength;
    rotationAttribute.packedTypedArray = rotationTypedArray;
    instances.attributes.push(rotationAttribute);
  }

  // Create scale vertex attribute.
  if (hasScale) {
    const scaleAttribute = new Attribute();
    scaleAttribute.name = "Instance Scale";
    scaleAttribute.semantic = InstanceAttributeSemantic.SCALE;
    scaleAttribute.componentDatatype = ComponentDatatype.FLOAT;
    scaleAttribute.type = AttributeType.VEC3;
    scaleAttribute.count = instancesLength;
    scaleAttribute.packedTypedArray = scaleTypedArray;
    instances.attributes.push(scaleAttribute);
  }

  // Create feature ID vertex attribute.
  const featureIdAttribute = new Attribute();
  featureIdAttribute.name = "Instance Feature ID";
  featureIdAttribute.setIndex = 0;
  featureIdAttribute.semantic = InstanceAttributeSemantic.FEATURE_ID;
  featureIdAttribute.componentDatatype = ComponentDatatype.FLOAT;
  featureIdAttribute.type = AttributeType.SCALAR;
  featureIdAttribute.count = instancesLength;
  featureIdAttribute.packedTypedArray = featureIdArray;
  instances.attributes.push(featureIdAttribute);

  // Create feature ID attribute.
  const featureIdInstanceAttribute = new FeatureIdAttribute();
  featureIdInstanceAttribute.propertyTableId = 0;
  featureIdInstanceAttribute.setIndex = 0;
  featureIdInstanceAttribute.positionalLabel = "instanceFeatureId_0";
  instances.featureIds.push(featureIdInstanceAttribute);

  // Apply instancing to every node that has at least one primitive.
  for (i = 0; i < components.nodes.length; i++) {
    const node = components.nodes[i];
    if (node.primitives.length > 0) {
      node.instances = instances;
    }
  }
}

/**
 * Returns a typed array of positions from the i3dm's feature table. The positions
 * returned are dequantized, if dequantization is applied.
 *
 * @private
 */
function getPositions(featureTable, instancesLength) {
  if (featureTable.hasProperty("POSITION")) {
    // Handle positions.
    return featureTable.getPropertyArray(
      "POSITION",
      ComponentDatatype.FLOAT,
      3
    );
  } else if (featureTable.hasProperty("POSITION_QUANTIZED")) {
    // Handle quantized positions.
    const quantizedPositions = featureTable.getPropertyArray(
      "POSITION_QUANTIZED",
      ComponentDatatype.UNSIGNED_SHORT,
      3
    );

    const quantizedVolumeOffset = featureTable.getGlobalProperty(
      "QUANTIZED_VOLUME_OFFSET",
      ComponentDatatype.FLOAT,
      3
    );
    if (!defined(quantizedVolumeOffset)) {
      throw new RuntimeError(
        "Global property: QUANTIZED_VOLUME_OFFSET must be defined for quantized positions."
      );
    }

    const quantizedVolumeScale = featureTable.getGlobalProperty(
      "QUANTIZED_VOLUME_SCALE",
      ComponentDatatype.FLOAT,
      3
    );
    if (!defined(quantizedVolumeScale)) {
      throw new RuntimeError(
        "Global property: QUANTIZED_VOLUME_SCALE must be defined for quantized positions."
      );
    }

    for (let i = 0; i < quantizedPositions.length / 3; i++) {
      const quantizedPosition = quantizedPositions[i];
      for (let j = 0; j < 3; j++) {
        quantizedPositions[3 * i + j] =
          (quantizedPosition[j] / 65535.0) * quantizedVolumeScale[j] +
          quantizedVolumeOffset[j];
      }
    }

    return quantizedPositions;

    // eslint-disable-next-line no-else-return
  } else {
    throw new RuntimeError(
      "Either POSITION or POSITION_QUANTIZED must be defined for each instance."
    );
  }
}

const propertyScratch2 = new Array(4);
function processRotation(
  featureTable,
  eastNorthUp,
  i,
  instanceQuaternion,
  instancePosition,
  instanceNormalUp,
  instanceNormalRight,
  instanceNormalForward,
  instanceRotation,
  instanceTransform
) {
  // Get the instance rotation
  const normalUp = featureTable.getProperty(
    "NORMAL_UP",
    ComponentDatatype.FLOAT,
    3,
    i,
    propertyScratch1
  );
  const normalRight = featureTable.getProperty(
    "NORMAL_RIGHT",
    ComponentDatatype.FLOAT,
    3,
    i,
    propertyScratch2
  );
  let hasCustomOrientation = false;
  if (defined(normalUp)) {
    if (!defined(normalRight)) {
      throw new RuntimeError(
        "To define a custom orientation, both NORMAL_UP and NORMAL_RIGHT must be defined."
      );
    }
    Cartesian3.unpack(normalUp, 0, instanceNormalUp);
    Cartesian3.unpack(normalRight, 0, instanceNormalRight);
    hasCustomOrientation = true;
  } else {
    const octNormalUp = featureTable.getProperty(
      "NORMAL_UP_OCT32P",
      ComponentDatatype.UNSIGNED_SHORT,
      2,
      i,
      propertyScratch1
    );
    const octNormalRight = featureTable.getProperty(
      "NORMAL_RIGHT_OCT32P",
      ComponentDatatype.UNSIGNED_SHORT,
      2,
      i,
      propertyScratch2
    );
    if (defined(octNormalUp)) {
      if (!defined(octNormalRight)) {
        throw new RuntimeError(
          "To define a custom orientation with oct-encoded vectors, both NORMAL_UP_OCT32P and NORMAL_RIGHT_OCT32P must be defined."
        );
      }
      AttributeCompression.octDecodeInRange(
        octNormalUp[0],
        octNormalUp[1],
        65535,
        instanceNormalUp
      );
      AttributeCompression.octDecodeInRange(
        octNormalRight[0],
        octNormalRight[1],
        65535,
        instanceNormalRight
      );
      hasCustomOrientation = true;
    } else if (eastNorthUp) {
      Transforms.eastNorthUpToFixedFrame(
        instancePosition,
        Ellipsoid.WGS84,
        instanceTransform
      );
      Matrix4.getMatrix3(instanceTransform, instanceRotation);
    } else {
      Matrix3.clone(Matrix3.IDENTITY, instanceRotation);
    }
  }
  if (hasCustomOrientation) {
    Cartesian3.cross(
      instanceNormalRight,
      instanceNormalUp,
      instanceNormalForward
    );
    Cartesian3.normalize(instanceNormalForward, instanceNormalForward);
    Matrix3.setColumn(
      instanceRotation,
      0,
      instanceNormalRight,
      instanceRotation
    );
    Matrix3.setColumn(instanceRotation, 1, instanceNormalUp, instanceRotation);
    Matrix3.setColumn(
      instanceRotation,
      2,
      instanceNormalForward,
      instanceRotation
    );
  }
  Quaternion.fromRotationMatrix(instanceRotation, instanceQuaternion);
}

function processScale(featureTable, i, instanceScale) {
  instanceScale = Cartesian3.fromElements(1.0, 1.0, 1.0, instanceScale);
  const scale = featureTable.getProperty(
    "SCALE",
    ComponentDatatype.FLOAT,
    1,
    i
  );
  if (defined(scale)) {
    Cartesian3.multiplyByScalar(instanceScale, scale, instanceScale);
  }
  const nonUniformScale = featureTable.getProperty(
    "SCALE_NON_UNIFORM",
    ComponentDatatype.FLOAT,
    3,
    i,
    propertyScratch1
  );
  if (defined(nonUniformScale)) {
    instanceScale.x *= nonUniformScale[0];
    instanceScale.y *= nonUniformScale[1];
    instanceScale.z *= nonUniformScale[2];
  }
}

I3dmLoader.prototype.unload = function () {
  if (defined(this._gltfLoader)) {
    this._gltfLoader.unload();
  }
  this._components = undefined;
};

export default I3dmLoader;
