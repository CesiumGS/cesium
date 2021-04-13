import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import AlphaMode from "./AlphaMode.js";

/**
 * Components for building models.
 *
 * @namespace ModelComponents
 *
 * @private
 */
var ModelComponents = {};

/**
 * Information about the quantized attribute.
 *
 * @alias ModelComponents.Quantization
 * @constructor
 *
 * @private
 */
function Quantization() {
  /**
   * Whether the quantized attribute is oct-encoded.
   *
   * @type {Boolean}
   */
  this.octEncoded = false;

  /**
   * The range used to convert buffer values to normalized values [0.0, 1.0]
   * This is typically computed as (1 << quantizationBits) - 1
   *
   * @type {Number}
   */
  this.normalizationRange = undefined;

  /**
   * The bottom-left corner of the quantization volume. Not applicable for oct encoded attributes.
   *
   * @type {Number|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4}
   */
  this.quantizedVolumeOffset = undefined;

  /**
   * The dimensions of the quantization volume. Not applicable for oct encoded attributes.
   *
   * @type {Number|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4}
   */
  this.quantizedVolumeDimensions = undefined;

  /**
   * The component data type of the quantized attribute, e.g. ComponentDatatype.UNSIGNED_SHORT.
   *
   * @type {ComponentDatatype}
   */
  this.componentDatatype = undefined;

  /**
   * The type of the quantized attribute, e.g. AttributeType.VEC2 for oct-encoded normals.
   *
   * @type {AttributeType}
   */
  this.type = undefined;
}

/**
 * A per-vertex or per-instance attribute.
 *
 * @alias ModelComponents.Attribute
 * @constructor
 */
function Attribute() {
  /**
   * The attribute semantic. The following semantics have defined behavior:
   * <ul>
   *   <li>POSITION: per-vertex position</li>
   *   <li>NORMAL: per-vertex normal</li>
   *   <li>TANGENT: per-vertex tangent</li>
   *   <li>TEXCOORD_0: per-vertex texture coordinates (first set)</li>
   *   <li>TEXCOORD_1: per-vertex texture coordinates (second set)</li>
   *   <li>COLOR_0: per-vertex colors</li>
   *   <li>JOINTS_0: per-vertex joint IDs for skinning</li>
   *   <li>WEIGHTS_0: per-vertex joint weights for skinning</li>
   *   <li>_FEATURE_ID_0: per-vertex or per-instance feature IDs (first set)</li>
   *   <li>_FEATURE_ID_1: per-vertex or per-instance feature IDs (second set)</li>
   *   <li>TRANSLATION: per-instance translation</li>
   *   <li>ROTATION: per-instance rotation</li>
   *   <li>SCALE: per-instance scale</li>
   * </ul>
   *
   * @type {String}
   */
  this.semantic = undefined;

  /**
   * The component data type of the attribute, e.g. ComponentDatatype.FLOAT.
   *
   * @type {ComponentDatatype}
   */
  this.componentDatatype = undefined;

  /**
   * The type of the attribute, e.g. AttributeType.VEC3.
   *
   * @type {AttributeType}
   */
  this.type = undefined;

  /**
   * Whether the attribute is normalized.
   *
   * @type {Boolean}
   * @default false
   */
  this.normalized = false;

  /**
   * The number of elements.
   *
   * @type {Number}
   */
  this.count = undefined;

  /**
   * Minimum value of each component in the attribute.
   *
   * @type {Number|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4}
   */
  this.min = undefined;

  /**
   * Maximum value of each component in the attribute.
   *
   * @type {Number|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4}
   */
  this.max = undefined;

  /**
   * A constant value used for all elements when typed array and buffer are undefined.
   *
   * @type {Number|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4}
   */
  this.constant = undefined;

  /**
   * Information about the quantized attribute.
   *
   * @alias ModelComponents.Quantization
   * @constructor
   */
  this.quantization = undefined;

  /**
   * A typed array containing tightly-packed attribute values.
   *
   * @type {Uint8Array|Int8Array|Uint16Array|Int16Array|Uint32Array|Int32Array|Float32Array}
   */
  this.typedArray = undefined;

  /**
   * A vertex buffer containing attribute values. Attribute values are accessed using byteOffset and byteStride.
   *
   * @type {Buffer}
   */
  this.buffer = undefined;

  /**
   * The byte offset of elements in the buffer.
   *
   * @type {Number}
   * @default 0
   */
  this.byteOffset = 0;

  /**
   * The byte stride of elements in the buffer. When undefined the elements are tightly packed.
   *
   * @type {Number}
   */
  this.byteStride = undefined;
}

/**
 * Indices used to select vertices for rendering.
 *
 * @alias ModelComponents.Indices
 * @constructor
 */
function Indices() {
  /**
   * The index data type of the attribute, e.g. IndexDatatype.UNSIGNED_SHORT.
   *
   * @type {IndexDatatype}
   */
  this.indexDatatype = undefined;

  /**
   * The number of indices.
   *
   * @type {Number}
   */
  this.count = undefined;

  /**
   * An index buffer containing indices.
   *
   * @type {Buffer}
   */
  this.buffer = undefined;
}

/**
 * Maps per-vertex or per-instance feature IDs to a feature table. Feature IDs
 * may be stored in an attribute or implicitly defined by a constant and stride.
 *
 * @alias ModelComponents.FeatureIdAttribute
 * @constructor
 */
function FeatureIdAttribute() {
  /**
   * The ID of the feature table that feature IDs index into.
   *
   * @type {String}
   */
  this.featureTableId = undefined;

  /**
   * The semantic of the attribute containing feature IDs, e.g. "_FEATURE_ID_0".
   *
   * @type {String}
   */
  this.semantic = undefined;

  /**
   * A constant feature ID to use when semantic is undefined.
   *
   * @type {Number}
   * @default 0
   */
  this.constant = 0;

  /**
   * The rate at which feature IDs increment when semantic is undefined.
   *
   * @type {Number}
   * @default 0
   */
  this.divisor = 0;
}

/**
 * A texture that contains per-texel feature IDs that index into a feature table.
 *
 * @alias ModelComponents.FeatureIdTexture
 * @constructor
 */
function FeatureIdTexture() {
  /**
   * The ID of the feature table that feature IDs index into.
   *
   * @type {String}
   */
  this.featureTableId = undefined;

  /**
   * The texture channel containing feature IDs, may be "r", "g", "b", or "a".
   *
   * @type {String}
   */
  this.channel = undefined;

  /**
   * The texture containing feature IDs.
   *
   * @type {ModelComponents.Texture}
   */
  this.texture = undefined;
}

/**
 * A morph target where each attribute contains attribute displacement data.
 *
 * @alias ModelComponents.MorphTarget
 * @constructor
 */
function MorphTarget() {
  /**
   * Attributes that are part of the morph target, e.g. positions, normals, and tangents.
   *
   * @type {ModelComponents.Attribute[]}
   */
  this.attributes = [];
}

/**
 * Geometry to be rendered with a material.
 *
 * @alias ModelComponents.Primitive
 * @constructor
 */
function Primitive() {
  /**
   * The vertex attributes, e.g. positions, normals, etc.
   *
   * @type {ModelComponents.Attribute[]}
   */
  this.attributes = [];

  /**
   * The morph targets.
   *
   * @type {ModelComponents.MorphTarget[]}
   */
  this.morphTargets = [];

  /**
   * An array of weights to be applied to morph targets.
   *
   * @type {Number[]}
   */
  this.morphWeights = [];

  /**
   * The indices.
   *
   * @type {ModelComponents.Indices}
   */
  this.indices = undefined;

  /**
   * The material.
   *
   * @type {ModelComponents.Material}
   */
  this.material = undefined;

  /**
   * The primitive type, e.g. PrimitiveType.TRIANGLES.
   *
   * @type {PrimitiveType}
   */
  this.primitiveType = undefined;

  /**
   * The feature ID attributes.
   *
   * @type {ModelComponents.FeatureIdAttribute[]}
   */
  this.featureIdAttributes = [];

  /**
   * The feature ID textures.
   *
   * @type {ModelComponents.FeatureIdTexture[]}
   */
  this.featureIdTextures = [];

  /**
   * The feature texture IDs.
   *
   * @type {String[]}
   */
  this.featureTextureIds = [];
}

/**
 * Position and metadata information for instances of a node.
 *
 * @alias ModelComponents.Primitive
 * @constructor
 */
function Instances() {
  /**
   * The instance attributes, e.g. translation, rotation, scale, feature id, etc.
   *
   * @type {ModelComponents.Attribute[]}
   */
  this.attributes = [];

  /**
   * The feature ID attributes.
   *
   * @type {ModelComponents.FeatureIdAttribute[]}
   */
  this.featureIdAttributes = [];
}

/**
 * Joints and matrices defining a skin.
 *
 * @alias ModelComponents.Skin
 * @constructor
 */
function Skin() {
  /**
   * The joints.
   *
   * @type {ModelComponents.Node[]}
   */
  this.joints = undefined;

  /**
   * The inverse bind matrices of the joints.
   *
   * @type {Matrix4[]}
   */
  this.inverseBindMatrices = undefined;
}

/**
 * A node in the node hierarchy.
 *
 * @alias ModelComponents.Node
 * @constructor
 */
function Node() {
  /**
   * The children nodes.
   *
   * @type {ModelComponents.Node[]}
   */
  this.children = [];

  /**
   * The mesh primitives.
   *
   * @type {ModelComponents.Primitive[]}
   */
  this.primitives = [];

  /**
   * Instances of this node.
   *
   * @type {ModelComponents.Instances}
   */
  this.instances = undefined;

  /**
   * The skin.
   *
   * @type {ModelComponents.Skin}
   */
  this.skin = undefined;

  /**
   * The local transformation matrix. When matrix is defined translation,
   * rotation, and scale must be undefined. When matrix is undefined
   * translation, rotation, and scale must all be defined.
   *
   * @type {Matrix4}
   */
  this.matrix = undefined;

  /**
   * The local translation.
   *
   * @type {Cartesian3}
   */
  this.translation = undefined;

  /**
   * The local rotation.
   *
   * @type {Quaternion}
   */
  this.rotation = undefined;

  /**
   * The local scale.
   *
   * @type {Cartesian3}
   */
  this.scale = undefined;
}

/**
 * A scene containing nodes.
 *
 * @alias ModelComponents.Scene
 * @constructor
 */
function Scene() {
  /**
   * The nodes belonging to the scene.
   *
   * @type {ModelComponents.Node[]}
   */
  this.nodes = [];
}

/**
 * The components that make up a model.
 *
 * @alias ModelComponents.Components
 * @constructor
 */
function Components() {
  /**
   * The default scene.
   *
   * @type {ModelComponents.Scene}
   */
  this.scene = undefined;

  /**
   * All nodes in the model.
   *
   * @type {ModelComponents.Node[]}
   */
  this.nodes = undefined;

  /**
   * Feature metadata containing the schema, feature tables, and feature textures.
   *
   * @type {FeatureMetadata}
   */
  this.featureMetadata = undefined;
}

/**
 * A texture.
 *
 * @alias ModelComponents.Texture
 * @constructor
 */
function Texture() {
  /**
   * The underlying GPU texture.
   *
   * @type {Texture}
   */
  this.texture = undefined;

  /**
   * The texture coordinate set.
   *
   * @type {Number}
   * @default 0
   */
  this.texCoord = 0;

  /**
   * The sampler.
   *
   * @type {Sampler}
   */
  this.sampler = undefined;
}

/**
 * Material properties for the PBR metallic roughness shading model.
 *
 * @alias ModelComponents.MetallicRoughness
 * @constructor
 */
function MetallicRoughness() {
  /**
   * The base color texture.
   *
   * @type {ModelComponents.Texture}
   */
  this.baseColorTexture = undefined;

  /**
   * The metallic roughness texture.
   *
   * @type {ModelComponents.Texture}
   */
  this.metallicRoughnessTexture = undefined;

  /**
   * The base color factor.
   *
   * @type {Cartesian4}
   * @default new Cartesian4(1.0, 1.0, 1.0, 1.0)
   */
  this.baseColorFactor = new Cartesian4(1.0, 1.0, 1.0, 1.0);

  /**
   * The metallic factor.
   *
   * @type {Number}
   * @default 1.0
   */
  this.metallicFactor = 1.0;

  /**
   * The roughness factor.
   *
   * @type {Number}
   * @default 1.0
   */
  this.roughnessFactor = 1.0;
}

/**
 * Material properties for the PBR specular glossiness shading model.
 *
 * @alias ModelComponents.function SpecularGlossiness
 * @constructor
 */
function SpecularGlossiness() {
  /**
   * The diffuse texture.
   *
   * @type {ModelComponents.Texture}
   */
  this.diffuseTexture = undefined;

  /**
   * The specular glossiness texture.
   *
   * @type {ModelComponents.Texture}
   */
  this.specularGlossinessTexture = undefined;

  /**
   * The diffuse factor.
   *
   * @type {Cartesian4}
   * @default new Cartesian4(1.0, 1.0, 1.0, 1.0)
   */
  this.diffuseFactor = new Cartesian4(1.0, 1.0, 1.0, 1.0);

  /**
   * The specular factor.
   *
   * @type {Cartesian3}
   * @default new Cartesian3(1.0, 1.0, 1.0, 1.0)
   */
  this.specularFactor = new Cartesian3(1.0, 1.0, 1.0);

  /**
   * The glossiness factor.
   *
   * @type {Number}
   * @default 1.0
   */
  this.glossinessFactor = 1.0;
}

/**
 * The material appearance of a primitive.
 *
 * @alias ModelComponent.Material
 * @constructor
 */
function Material() {
  /**
   * Material properties for the PBR metallic roughness shading model.
   *
   * @type {ModelComponents.MetallicRoughness}
   */
  this.metallicRoughness = undefined;

  /**
   * Material properties for the PBR specular glossiness shading model.
   *
   * @type {ModelComponents.SpecularGlossiness}
   */
  this.specularGlossiness = undefined;

  /**
   * The emissive texture.
   *
   * @type {ModelComponents.Texture}
   */
  this.emissiveTexture = undefined;

  /**
   * The normal texture.
   *
   * @type {ModelComponents.Texture}
   */
  this.normalTexture = undefined;

  /**
   * The occlusion texture.
   *
   * @type {ModelComponents.Texture}
   */
  this.occlusionTexture = undefined;

  /**
   * The emissive factor.
   *
   * @type {Cartesian3}
   * @default Cartesian3.ZERO
   */
  this.emissiveFactor = new Cartesian3(0.0, 0.0, 0.0);

  /**
   * The alpha mode.
   *
   * @type {AlphaMode}
   * @default AlphaMode.OPAQUE
   */
  this.alphaMode = AlphaMode.OPAQUE;

  /**
   * The alpha cutoff value of the material for the MASK alpha mode.
   *
   * @type {Number}
   * @default 0.5
   */
  this.alphaCutoff = 0.5;

  /**
   * Specifies whether the material is double sided.
   *
   * @type {Boolean}
   * @default false
   */
  this.doubleSided = false;

  /**
   * Specifies whether the material is unlit.
   *
   * @type {Boolean}
   * @default false
   */
  this.unlit = false;
}

ModelComponents.Quantization = Quantization;
ModelComponents.Attribute = Attribute;
ModelComponents.Indices = Indices;
ModelComponents.FeatureIdAttribute = FeatureIdAttribute;
ModelComponents.FeatureIdTexture = FeatureIdTexture;
ModelComponents.MorphTarget = MorphTarget;
ModelComponents.Primitive = Primitive;
ModelComponents.Instances = Instances;
ModelComponents.Skin = Skin;
ModelComponents.Node = Node;
ModelComponents.Scene = Scene;
ModelComponents.Components = Components;
ModelComponents.Texture = Texture;
ModelComponents.MetallicRoughness = MetallicRoughness;
ModelComponents.SpecularGlossiness = SpecularGlossiness;
ModelComponents.Material = Material;

export default ModelComponents;
