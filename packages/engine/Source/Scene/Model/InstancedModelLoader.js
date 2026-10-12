import {
  AttributeType,
  BoundingSphere,
  Cartesian3,
  Check,
  ComponentDatatype,
  Matrix3,
  Matrix4,
  Quaternion,
  defined,
} from "@cesium/core";
import GltfLoader from "../GltfLoader.js";
import InstanceAttributeSemantic from "../InstanceAttributeSemantic.js";
import ModelComponents from "../ModelComponents.js";
import ResourceLoader from "../ResourceLoader.js";

const Attribute = ModelComponents.Attribute;
const Instances = ModelComponents.Instances;

/**
 * Loads a glTF and instances it with world-space transforms supplied at
 * runtime, the same way {@link I3dmLoader} instances the glTF of an i3dm.
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @private
 */
class InstancedModelLoader extends ResourceLoader {
  /**
   * @param {object} options Object with the following properties:
   * @param {Matrix4[]} options.instanceTransforms The world-space transform of each instance.
   * @param {object} options.gltfLoaderOptions Options for the {@link GltfLoader}.
   */
  constructor(options) {
    super();

    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object(
      "options.instanceTransforms",
      options.instanceTransforms,
    );
    Check.typeOf.object("options.gltfLoaderOptions", options.gltfLoaderOptions);
    //>>includeEnd('debug');

    this._instanceTransforms = options.instanceTransforms;
    this._gltfLoader = new GltfLoader(options.gltfLoaderOptions);
    this._components = undefined;
    this._unloaded = false;
  }

  /**
   * The cache key of the resource.
   *
   * @type {string}
   * @readonly
   * @private
   */
  get cacheKey() {
    return undefined;
  }

  /**
   * The loaded components.
   *
   * @type {ModelComponents.Components}
   * @readonly
   * @private
   */
  get components() {
    return this._components;
  }

  /**
   * Returns true if textures are loaded separately from the other glTF resources.
   *
   * @type {boolean}
   * @readonly
   * @private
   */
  get incrementallyLoadTextures() {
    return this._gltfLoader.incrementallyLoadTextures;
  }

  /**
   * true if textures are loaded, useful when incrementallyLoadTextures is true
   *
   * @type {boolean}
   * @readonly
   * @private
   */
  get texturesLoaded() {
    return this._gltfLoader.texturesLoaded;
  }

  /**
   * Loads the resource.
   * @returns {Promise<InstancedModelLoader>} A promise which resolves to the loader when the resource loading is completed.
   * @private
   */
  async load() {
    await this._gltfLoader.load();
    return this;
  }

  /**
   * Processes the resource until it becomes ready.
   *
   * @param {FrameState} frameState The frame state.
   * @returns {boolean} true once all resources are ready.
   * @private
   */
  process(frameState) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("frameState", frameState);
    //>>includeEnd('debug');

    if (!this._gltfLoader.process(frameState)) {
      return false;
    }

    if (!defined(this._components)) {
      const components = this._gltfLoader.components;
      addInstances(components, this._instanceTransforms);
      this._components = components;
      this._instanceTransforms = undefined;
    }

    return true;
  }

  /**
   * Returns whether the resource has been unloaded.
   * @private
   */
  isUnloaded() {
    return this._unloaded;
  }

  /**
   * Unloads the resource.
   * @private
   */
  unload() {
    this._gltfLoader.unload();
    this._components = undefined;
    this._instanceTransforms = undefined;
    this._unloaded = true;
  }
}

const scratchTranslation = new Cartesian3();
const scratchRotation = new Matrix3();
const scratchQuaternion = new Quaternion();
const scratchScale = new Cartesian3();
const scratchCenterTransform = new Matrix4();

function addInstances(components, transforms) {
  const count = transforms.length;

  const translations = new Array(count);
  for (let i = 0; i < count; i++) {
    translations[i] = Matrix4.getTranslation(transforms[i], new Cartesian3());
  }

  // Translations are stored relative to their center to preserve 32-bit precision.
  const center = BoundingSphere.fromPoints(translations).center;

  const translationTypedArray = new Float32Array(count * 3);
  const rotationTypedArray = new Float32Array(count * 4);
  const scaleTypedArray = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const transform = transforms[i];

    const translation = Cartesian3.subtract(
      translations[i],
      center,
      scratchTranslation,
    );
    Cartesian3.pack(translation, translationTypedArray, i * 3);

    const rotation = Quaternion.fromRotationMatrix(
      Matrix4.getRotation(transform, scratchRotation),
      scratchQuaternion,
    );
    Quaternion.pack(rotation, rotationTypedArray, i * 4);

    const scale = Matrix4.getScale(transform, scratchScale);
    Cartesian3.pack(scale, scaleTypedArray, i * 3);
  }

  components.transform = Matrix4.multiplyTransformation(
    Matrix4.fromTranslation(center, scratchCenterTransform),
    components.transform,
    components.transform,
  );

  const nodes = components.nodes;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.primitives.length === 0) {
      continue;
    }

    // Each node needs its own attributes, since the pipeline releases their typed arrays.
    const instances = new Instances();
    instances.transformInWorldSpace = true;
    instances.attributes.push(
      createAttribute(
        InstanceAttributeSemantic.TRANSLATION,
        AttributeType.VEC3,
        translationTypedArray,
        count,
      ),
      createAttribute(
        InstanceAttributeSemantic.ROTATION,
        AttributeType.VEC4,
        rotationTypedArray,
        count,
      ),
      createAttribute(
        InstanceAttributeSemantic.SCALE,
        AttributeType.VEC3,
        scaleTypedArray,
        count,
      ),
    );
    node.instances = instances;
  }
}

function createAttribute(semantic, type, typedArray, count) {
  const attribute = new Attribute();
  attribute.semantic = semantic;
  attribute.componentDatatype = ComponentDatatype.FLOAT;
  attribute.type = type;
  attribute.count = count;
  attribute.typedArray = typedArray;
  return attribute;
}

export default InstancedModelLoader;
