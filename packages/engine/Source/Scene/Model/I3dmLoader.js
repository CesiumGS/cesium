import AttributeCompression from "../../Core/AttributeCompression.js";
import BoundingSphere from "../../Core/BoundingSphere.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Check from "../../Core/Check.js";
import clone from "../../Core/clone.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import Ellipsoid from "../../Core/Ellipsoid.js";
import getStringFromTypedArray from "../../Core/getStringFromTypedArray.js";
import Matrix3 from "../../Core/Matrix3.js";
import Matrix4 from "../../Core/Matrix4.js";
import Quaternion from "../../Core/Quaternion.js";
import RuntimeError from "../../Core/RuntimeError.js";
import Transforms from "../../Core/Transforms.js";
import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import AttributeType from "../AttributeType.js";
import Axis from "../Axis.js";
import Cesium3DTileFeatureTable from "../Cesium3DTileFeatureTable.js";
import GltfLoader from "../GltfLoader.js";
import InstanceAttributeSemantic from "../InstanceAttributeSemantic.js";
import I3dmParser from "../I3dmParser.js";
import MetadataClass from "../MetadataClass.js";
import ModelComponents from "../ModelComponents.js";
import parseBatchTable from "../parseBatchTable.js";
import PropertyTable from "../PropertyTable.js";
import ResourceLoader from "../ResourceLoader.js";
import StructuralMetadata from "../StructuralMetadata.js";

const I3dmLoaderState = {
  NOT_LOADED: 0,
  LOADING: 1,
  PROCESSING: 2,
  POST_PROCESSING: 3,
  READY: 4,
  FAILED: 5,
  UNLOADED: 6,
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
 * @param {object} options Object with the following properties:
 * @param {Resource} options.i3dmResource The {@link Resource} containing the i3dm.
 * @param {ArrayBuffer} options.arrayBuffer The array buffer of the i3dm contents.
 * @param {number} [options.byteOffset=0] The byte offset to the beginning of the i3dm contents in the array buffer.
 * @param {Resource} [options.baseResource] The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {boolean} [options.releaseGltfJson=false] When true, the glTF JSON is released once the glTF is loaded. This is is especially useful for cases like 3D Tiles, where each .gltf model is unique and caching the glTF JSON is not effective.
 * @param {boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 * @param {boolean} [options.incrementallyLoadTextures=true] Determine if textures may continue to stream in after the glTF is loaded.
 * @param {Axis} [options.upAxis=Axis.Y] The up-axis of the glTF model.
 * @param {Axis} [options.forwardAxis=Axis.X] The forward-axis of the glTF model.
 * @param {boolean} [options.loadAttributesAsTypedArray=false] Load all attributes as typed arrays instead of GPU buffers. If the attributes are interleaved in the glTF they will be de-interleaved in the typed array.
 * @param {boolean} [options.enablePick=false]  If <code>true</code>, load the positions buffer, any instanced attribute buffers, and index buffer as typed arrays for CPU-enabled picking in WebGL1.
 * @param {boolean} [options.loadIndicesForWireframe=false] Load the index buffer as a typed array so wireframe indices can be created for WebGL1.
 * @param {boolean} [options.loadPrimitiveOutline=true] If true, load outlines from the {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/CESIUM_primitive_outline|CESIUM_primitive_outline} extension. This can be set false to avoid post-processing geometry at load time.
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
    true,
  );
  const upAxis = defaultValue(options.upAxis, Axis.Y);
  const forwardAxis = defaultValue(options.forwardAxis, Axis.X);
  const loadAttributesAsTypedArray = defaultValue(
    options.loadAttributesAsTypedArray,
    false,
  );
  const loadIndicesForWireframe = defaultValue(
    options.loadIndicesForWireframe,
    false,
  );
  const loadPrimitiveOutline = defaultValue(options.loadPrimitiveOutline, true);
  const enablePick = defaultValue(options.enablePick, false);

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
  this._loadAttributesAsTypedArray = loadAttributesAsTypedArray;
  this._loadIndicesForWireframe = loadIndicesForWireframe;
  this._loadPrimitiveOutline = loadPrimitiveOutline;
  this._enablePick = enablePick;

  this._state = I3dmLoaderState.NOT_LOADED;
  this._promise = undefined;

  this._gltfLoader = undefined;

  // Instanced attributes are initially parsed as typed arrays, but if they
  // do not need to be further processed (e.g. turned into transform matrices),
  // it is more efficient to turn them into buffers. The I3dmLoader will own the
  // resources and store them here.
  this._buffers = [];
  this._components = undefined;

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
   * true if textures are loaded, useful when incrementallyLoadTextures is true
   *
   * @memberof  I3dmLoader.prototype
   *
   * @type {boolean}
   * @readonly
   * @private
   */
  texturesLoaded: {
    get: function () {
      return this._gltfLoader?.texturesLoaded;
    },
  },
  /**
   * The cache key of the resource
   *
   * @memberof I3dmLoader.prototype
   *
   * @type {string}
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
 * @returns {Promise<I3dmLoader>} A promise which resolves to the loader when the resource loading is completed.
 * @private
 */
I3dmLoader.prototype.load = function () {
  if (defined(this._promise)) {
    return this._promise;
  }

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
    featureTableBinary,
  );
  this._featureTable = featureTable;

  // Get the number of instances in the i3dm.
  const instancesLength = featureTable.getGlobalProperty("INSTANCES_LENGTH");
  featureTable.featuresLength = instancesLength;
  if (!defined(instancesLength)) {
    throw new RuntimeError(
      "Feature table global property: INSTANCES_LENGTH must be defined",
    );
  }
  this._instancesLength = instancesLength;

  // Get the RTC center, if available, and set the loader's transform.
  const rtcCenter = featureTable.getGlobalProperty(
    "RTC_CENTER",
    ComponentDatatype.FLOAT,
    3,
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
    loadAttributesAsTypedArray: this._loadAttributesAsTypedArray,
    enablePick: this._enablePick,
    loadIndicesForWireframe: this._loadIndicesForWireframe,
    loadPrimitiveOutline: this._loadPrimitiveOutline,
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

  this._promise = gltfLoader
    .load()
    .then(() => {
      if (this.isDestroyed()) {
        return;
      }

      this._state = I3dmLoaderState.PROCESSING;
      return this;
    })
    .catch((error) => {
      if (this.isDestroyed()) {
        return;
      }
      throw handleError(this, error);
    });

  return this._promise;
};

function handleError(i3dmLoader, error) {
  i3dmLoader.unload();
  i3dmLoader._state = I3dmLoaderState.FAILED;
  const errorMessage = "Failed to load i3dm";
  return i3dmLoader.getError(errorMessage, error);
}

I3dmLoader.prototype.process = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("frameState", frameState);
  //>>includeEnd('debug');

  if (this._state === I3dmLoaderState.READY) {
    return true;
  }

  const gltfLoader = this._gltfLoader;
  let ready = false;
  if (this._state === I3dmLoaderState.PROCESSING) {
    ready = gltfLoader.process(frameState);
  }

  if (!ready) {
    return false;
  }

  const components = gltfLoader.components;

  // Combine the RTC_CENTER transform from the i3dm and the CESIUM_RTC
  // transform from the glTF. In practice CESIUM_RTC is not set for
  // instanced models but multiply the transforms just in case.
  components.transform = Matrix4.multiplyTransformation(
    this._transform,
    components.transform,
    components.transform,
  );

  createInstances(this, components, frameState);
  createStructuralMetadata(this, components);
  this._components = components;

  // Now that we have the parsed components, we can release the array buffer
  this._arrayBuffer = undefined;

  this._state = I3dmLoaderState.READY;
  return true;
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
const transformScratch = new Matrix4();

function createInstances(loader, components, frameState) {
  let i;
  const featureTable = loader._featureTable;
  const instancesLength = loader._instancesLength;

  if (instancesLength === 0) {
    return;
  }

  const rtcCenter = featureTable.getGlobalProperty(
    "RTC_CENTER",
    ComponentDatatype.FLOAT,
    3,
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
  // Also manually compute if RTC center equals Cartesian3.ZERO
  if (
    !defined(rtcCenter) ||
    Cartesian3.equals(Cartesian3.unpack(rtcCenter), Cartesian3.ZERO)
  ) {
    const positionBoundingSphere = BoundingSphere.fromPoints(instancePositions);

    for (i = 0; i < instancePositions.length; i++) {
      Cartesian3.subtract(
        instancePositions[i],
        positionBoundingSphere.center,
        positionScratch,
      );

      translationTypedArray[3 * i + 0] = positionScratch.x;
      translationTypedArray[3 * i + 1] = positionScratch.y;
      translationTypedArray[3 * i + 2] = positionScratch.z;
    }

    // Set the center of the bounding sphere as the RTC center transform.
    const centerTransform = Matrix4.fromTranslation(
      positionBoundingSphere.center,
      transformScratch,
    );

    // Combine the center transform and the CESIUM_RTC transform from the glTF.
    // In practice CESIUM_RTC is not set for instanced models but multiply the
    // transforms just in case.
    components.transform = Matrix4.multiplyTransformation(
      centerTransform,
      components.transform,
      components.transform,
    );
  }

  for (i = 0; i < instancesLength; i++) {
    // Get the instance position
    instancePosition = Cartesian3.clone(instancePositions[i]);

    if (defined(rtcCenter)) {
      Cartesian3.add(
        instancePosition,
        Cartesian3.unpack(rtcCenter),
        instancePosition,
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
        instanceTransform,
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
      i,
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
  const buffers = loader._buffers;

  // Create translation vertex attribute.
  const translationAttribute = new Attribute();
  translationAttribute.name = "Instance Translation";
  translationAttribute.semantic = InstanceAttributeSemantic.TRANSLATION;
  translationAttribute.componentDatatype = ComponentDatatype.FLOAT;
  translationAttribute.type = AttributeType.VEC3;
  translationAttribute.count = instancesLength;
  // The min / max values of the translation attribute need to be computed
  // by the model pipeline, so so a pointer to the typed array is stored.
  translationAttribute.typedArray = translationTypedArray;
  // If there is no rotation attribute, however, the translations can also be
  // loaded as a buffer to prevent additional resource creation in the pipeline.
  if (!hasRotation) {
    const buffer = Buffer.createVertexBuffer({
      context: frameState.context,
      typedArray: translationTypedArray,
      usage: BufferUsage.STATIC_DRAW,
    });
    // Destruction of resources is handled by I3dmLoader.unload().
    buffer.vertexArrayDestroyable = false;
    buffers.push(buffer);

    translationAttribute.buffer = buffer;
  }

  instances.attributes.push(translationAttribute);

  // Create rotation vertex attribute.
  if (hasRotation) {
    const rotationAttribute = new Attribute();
    rotationAttribute.name = "Instance Rotation";
    rotationAttribute.semantic = InstanceAttributeSemantic.ROTATION;
    rotationAttribute.componentDatatype = ComponentDatatype.FLOAT;
    rotationAttribute.type = AttributeType.VEC4;
    rotationAttribute.count = instancesLength;
    rotationAttribute.typedArray = rotationTypedArray;
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
    if (hasRotation) {
      // If rotations are present, all transform attributes are loaded
      // as typed arrays to compute transform matrices for the model.
      scaleAttribute.typedArray = scaleTypedArray;
    } else {
      const buffer = Buffer.createVertexBuffer({
        context: frameState.context,
        typedArray: scaleTypedArray,
        usage: BufferUsage.STATIC_DRAW,
      });
      // Destruction of resources is handled by I3dmLoader.unload().
      buffer.vertexArrayDestroyable = false;
      buffers.push(buffer);

      scaleAttribute.buffer = buffer;
    }

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
  const buffer = Buffer.createVertexBuffer({
    context: frameState.context,
    typedArray: featureIdArray,
    usage: BufferUsage.STATIC_DRAW,
  });
  // Destruction of resources is handled by I3dmLoader.unload().
  buffer.vertexArrayDestroyable = false;
  buffers.push(buffer);
  featureIdAttribute.buffer = buffer;

  instances.attributes.push(featureIdAttribute);

  // Create feature ID attribute.
  const featureIdInstanceAttribute = new FeatureIdAttribute();
  featureIdInstanceAttribute.propertyTableId = 0;
  featureIdInstanceAttribute.setIndex = 0;
  featureIdInstanceAttribute.positionalLabel = "instanceFeatureId_0";
  instances.featureIds.push(featureIdInstanceAttribute);

  // Apply instancing to every node that has at least one primitive.
  const nodes = components.nodes;
  const nodesLength = nodes.length;
  let makeInstancesCopy = false;
  for (i = 0; i < nodesLength; i++) {
    const node = nodes[i];
    if (node.primitives.length > 0) {
      // If the instances have not been assigned to a node already, assign
      // it to the first node encountered. Otherwise, make a copy of them
      // for each subsequent node.
      node.instances = makeInstancesCopy
        ? createInstancesCopy(instances)
        : instances;

      makeInstancesCopy = true;
    }
  }
}

/**
 * Returns a copy of the instances that contains shallow copies of the instanced
 * attributes. That is, the instances and attribute objects will be new copies,
 * but they will point to the same buffers and typed arrays. This is so each
 * node can manage memory separately, such that unloading memory for one
 * node does not unload it for another.
 *
 * @returns {ModelComponents.Instances}
 *
 * @private
 */
function createInstancesCopy(instances) {
  const instancesCopy = new Instances();
  instancesCopy.transformInWorldSpace = instances.transformInWorldSpace;

  const attributes = instances.attributes;
  const attributesLength = attributes.length;

  for (let i = 0; i < attributesLength; i++) {
    const attributeCopy = clone(attributes[i], false);
    instancesCopy.attributes.push(attributeCopy);
  }

  instancesCopy.featureIds = instances.featureIds;

  return instancesCopy;
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
      3,
    );
  } else if (featureTable.hasProperty("POSITION_QUANTIZED")) {
    // Handle quantized positions.
    const quantizedPositions = featureTable.getPropertyArray(
      "POSITION_QUANTIZED",
      ComponentDatatype.UNSIGNED_SHORT,
      3,
    );

    const quantizedVolumeOffset = featureTable.getGlobalProperty(
      "QUANTIZED_VOLUME_OFFSET",
      ComponentDatatype.FLOAT,
      3,
    );
    if (!defined(quantizedVolumeOffset)) {
      throw new RuntimeError(
        "Global property: QUANTIZED_VOLUME_OFFSET must be defined for quantized positions.",
      );
    }

    const quantizedVolumeScale = featureTable.getGlobalProperty(
      "QUANTIZED_VOLUME_SCALE",
      ComponentDatatype.FLOAT,
      3,
    );
    if (!defined(quantizedVolumeScale)) {
      throw new RuntimeError(
        "Global property: QUANTIZED_VOLUME_SCALE must be defined for quantized positions.",
      );
    }

    const decodedPositions = new Float32Array(quantizedPositions.length);
    for (let i = 0; i < quantizedPositions.length / 3; i++) {
      for (let j = 0; j < 3; j++) {
        const index = 3 * i + j;
        decodedPositions[index] =
          (quantizedPositions[index] / 65535.0) * quantizedVolumeScale[j] +
          quantizedVolumeOffset[j];
      }
    }

    return decodedPositions;

    // eslint-disable-next-line no-else-return
  } else {
    throw new RuntimeError(
      "Either POSITION or POSITION_QUANTIZED must be defined for each instance.",
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
  instanceTransform,
) {
  // Get the instance rotation
  const normalUp = featureTable.getProperty(
    "NORMAL_UP",
    ComponentDatatype.FLOAT,
    3,
    i,
    propertyScratch1,
  );
  const normalRight = featureTable.getProperty(
    "NORMAL_RIGHT",
    ComponentDatatype.FLOAT,
    3,
    i,
    propertyScratch2,
  );
  let hasCustomOrientation = false;
  if (defined(normalUp)) {
    if (!defined(normalRight)) {
      throw new RuntimeError(
        "To define a custom orientation, both NORMAL_UP and NORMAL_RIGHT must be defined.",
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
      propertyScratch1,
    );
    const octNormalRight = featureTable.getProperty(
      "NORMAL_RIGHT_OCT32P",
      ComponentDatatype.UNSIGNED_SHORT,
      2,
      i,
      propertyScratch2,
    );
    if (defined(octNormalUp)) {
      if (!defined(octNormalRight)) {
        throw new RuntimeError(
          "To define a custom orientation with oct-encoded vectors, both NORMAL_UP_OCT32P and NORMAL_RIGHT_OCT32P must be defined.",
        );
      }
      AttributeCompression.octDecodeInRange(
        octNormalUp[0],
        octNormalUp[1],
        65535,
        instanceNormalUp,
      );
      AttributeCompression.octDecodeInRange(
        octNormalRight[0],
        octNormalRight[1],
        65535,
        instanceNormalRight,
      );
      hasCustomOrientation = true;
    } else if (eastNorthUp) {
      Transforms.eastNorthUpToFixedFrame(
        instancePosition,
        Ellipsoid.WGS84,
        instanceTransform,
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
      instanceNormalForward,
    );
    Cartesian3.normalize(instanceNormalForward, instanceNormalForward);
    Matrix3.setColumn(
      instanceRotation,
      0,
      instanceNormalRight,
      instanceRotation,
    );
    Matrix3.setColumn(instanceRotation, 1, instanceNormalUp, instanceRotation);
    Matrix3.setColumn(
      instanceRotation,
      2,
      instanceNormalForward,
      instanceRotation,
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
    i,
  );
  if (defined(scale)) {
    Cartesian3.multiplyByScalar(instanceScale, scale, instanceScale);
  }
  const nonUniformScale = featureTable.getProperty(
    "SCALE_NON_UNIFORM",
    ComponentDatatype.FLOAT,
    3,
    i,
    propertyScratch1,
  );
  if (defined(nonUniformScale)) {
    instanceScale.x *= nonUniformScale[0];
    instanceScale.y *= nonUniformScale[1];
    instanceScale.z *= nonUniformScale[2];
  }
}

function unloadBuffers(loader) {
  const buffers = loader._buffers;
  const length = buffers.length;
  for (let i = 0; i < length; i++) {
    const buffer = buffers[i];
    if (!buffer.isDestroyed()) {
      buffer.destroy();
    }
  }
  buffers.length = 0;
}

I3dmLoader.prototype.isUnloaded = function () {
  return this._state === I3dmLoaderState.UNLOADED;
};

I3dmLoader.prototype.unload = function () {
  if (defined(this._gltfLoader) && !this._gltfLoader.isDestroyed()) {
    this._gltfLoader.unload();
  }

  unloadBuffers(this);

  this._components = undefined;
  this._arrayBuffer = undefined;
  this._state = I3dmLoaderState.UNLOADED;
};

export default I3dmLoader;
