import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Matrix3 from "../Core/Matrix3.js";
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
   * @private
   */
  this.octEncoded = false;

  /**
   * Whether the oct-encoded values are stored as ZXY instead of XYZ. This is true when decoding from Draco.
   *
   * @type {Boolean}
   */
  this.octEncodedZXY = false;

  /**
   * The range used to convert buffer values to normalized values [0.0, 1.0]
   * This is typically computed as (1 << quantizationBits) - 1.
   * For oct-encoded values this value is a single Number.
   *
   * @type {Number|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4}
   * @private
   */
  this.normalizationRange = undefined;

  /**
   * The bottom-left corner of the quantization volume. Not applicable for oct encoded attributes.
   * The type should match the attribute type - e.g. if the attribute type
   * is AttributeType.VEC4 the offset should be a Cartesian4.
   *
   * @type {Number|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4}
   * @private
   */
  this.quantizedVolumeOffset = undefined;

  /**
   * The dimensions of the quantization volume. Not applicable for oct encoded attributes.
   * The type should match the attribute type - e.g. if the attribute type
   * is AttributeType.VEC4 the dimensions should be a Cartesian4.
   *
   * @type {Number|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4}
   * @private
   */
  this.quantizedVolumeDimensions = undefined;

  /**
   * The step size of the quantization volume, equal to
   * quantizedVolumeDimensions / quantizedVolumeOffset (component-wise).
   * Not applicable for oct encoded attributes.
   * The type should match the attribute type - e.g. if the attribute type
   * is AttributeType.VEC4 the dimensions should be a Cartesian4.
   *
   * @type {Number|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4}
   * @private
   */
  this.quantizedVolumeStepSize = undefined;

  /**
   * The component data type of the quantized attribute, e.g. ComponentDatatype.UNSIGNED_SHORT.
   *
   * <p>
   * The following component datatypes are not supported:
   * <ul>
   *   <li>ComponentDatatype.INT</li>
   *   <li>ComponentDatatype.UNSIGNED_INT</li>
   *   <li>ComponentDatatype.DOUBLE</li>
   * </ul>
   * </p>
   *
   * @type {ComponentDatatype}
   * @private
   */
  this.componentDatatype = undefined;

  /**
   * The type of the quantized attribute, e.g. AttributeType.VEC2 for oct-encoded normals.
   *
   * @type {AttributeType}
   * @private
   */
  this.type = undefined;
}

/**
 * A per-vertex or per-instance attribute.
 *
 * @alias ModelComponents.Attribute
 * @constructor
 *
 * @private
 */
function Attribute() {
  /**
   * The attribute name. Must be unique within the attributes array.
   *
   * @type {String}
   * @private
   */
  this.name = undefined;

  /**
   * The attribute semantic. The combination of semantic and setIndex must be
   * unique within the attributes array.
   *
   * @type {VertexAttributeSemantic|InstanceAttributeSemantic}
   * @private
   */
  this.semantic = undefined;

  /**
   * The set index of the attribute. Only applicable when the attribute has one
   * of the following semantics:
   *
   * <ul>
   *   <li>{@link VertexAttributeSemantic.TEXCOORD}</li>
   *   <li>{@link VertexAttributeSemantic.COLOR}</li>
   *   <li>{@link VertexAttributeSemantic.JOINTS}</li>
   *   <li>{@link VertexAttributeSemantic.WEIGHTS}</li>
   *   <li>{@link VertexAttributeSemantic.FEATURE_ID}</li>
   *   <li>{@link InstanceAttributeSemantic.FEATURE_ID}</li>
   * </ul>
   */
  this.setIndex = undefined;

  /**
   * The component data type of the attribute.
   * <p>
   * When the data is quantized the componentDatatype should match the
   * dequantized data, which is typically ComponentDatatype.FLOAT.
   * </p>
   * <p>
   * The following component datatypes are not supported:
   * <ul>
   *   <li>ComponentDatatype.INT</li>
   *   <li>ComponentDatatype.UNSIGNED_INT</li>
   *   <li>ComponentDatatype.DOUBLE</li>
   * </ul>
   * </p>
   *
   * @type {ComponentDatatype}
   * @private
   */
  this.componentDatatype = undefined;

  /**
   * The type of the attribute.
   * <p>
   * When the data is oct-encoded the type should match the decoded data, which
   * is typically AttributeType.VEC3.
   * </p>
   *
   * @type {AttributeType}
   * @private
   */
  this.type = undefined;

  /**
   * Whether the attribute is normalized.
   *
   * @type {Boolean}
   * @default false
   * @private
   */
  this.normalized = false;

  /**
   * The number of elements.
   *
   * @type {Number}
   * @private
   */
  this.count = undefined;

  /**
   * Minimum value of each component in the attribute.
   * <p>
   * When the data is quantized the min should match the dequantized data.
   * The normalized property has no effect on these values.
   * </p>
   * <p>
   * Must be defined for POSITION attributes.
   * </p>
   *
   * @type {Number|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4}
   * @private
   */
  this.min = undefined;

  /**
   * Maximum value of each component in the attribute.
   * <p>
   * When the data is quantized the max should match the dequantized data.
   * The normalized property has no effect on these values.
   * </p>
   * <p>
   * Must be defined for POSITION attributes.
   * </p>
   *
   * @type {Number|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4}
   * @private
   */
  this.max = undefined;

  /**
   * A constant value used for all elements when typed array and buffer are undefined.
   *
   * @type {Number|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4}
   * @private
   */
  this.constant = undefined;

  /**
   * Information about the quantized attribute.
   *
   * @type {ModelComponents.Quantization}
   * @private
   */
  this.quantization = undefined;

  /**
   * A typed array containing tightly-packed attribute values.
   *
   * @type {Uint8Array|Int8Array|Uint16Array|Int16Array|Uint32Array|Int32Array|Float32Array}
   * @private
   */
  this.typedArray = undefined;

  /**
   * A vertex buffer containing attribute values. Attribute values are accessed using byteOffset and byteStride.
   *
   * @type {Buffer}
   * @private
   */
  this.buffer = undefined;

  /**
   * The byte offset of elements in the buffer.
   *
   * @type {Number}
   * @default 0
   * @private
   */
  this.byteOffset = 0;

  /**
   * The byte stride of elements in the buffer. When undefined the elements are tightly packed.
   *
   * @type {Number}
   * @private
   */
  this.byteStride = undefined;
}

/**
 * Indices used to select vertices for rendering.
 *
 * @alias ModelComponents.Indices
 * @constructor
 *
 * @private
 */
function Indices() {
  /**
   * The index data type of the attribute, e.g. IndexDatatype.UNSIGNED_SHORT.
   *
   * @type {IndexDatatype}
   * @private
   */
  this.indexDatatype = undefined;

  /**
   * The number of indices.
   *
   * @type {Number}
   * @private
   */
  this.count = undefined;

  /**
   * An index buffer containing indices.
   *
   * @type {Buffer}
   * @private
   */
  this.buffer = undefined;
}

/**
 * Maps per-vertex or per-instance feature IDs to a feature table. Feature IDs
 * may be stored in an attribute or implicitly defined by a constant and stride.
 *
 * @alias ModelComponents.FeatureIdAttribute
 * @constructor
 *
 * @private
 */
function FeatureIdAttribute() {
  /**
   * The ID of the feature table that feature IDs index into. If undefined,
   * feature IDs are used for classification, but no metadata is associated.
   *
   *
   * @type {Number}
   * @private
   */
  this.propertyTableId = undefined;

  /**
   * The set index of feature ID attribute containing feature IDs.
   *
   * @type {Number}
   * @private
   */
  this.setIndex = undefined;

  /**
   * The first feature ID to use when setIndex is undefined
   *
   * @type {Number}
   * @default 0
   * @private
   */
  this.offset = 0;

  /**
   * Number of times each feature ID is repeated before being incremented.
   *
   * @type {Number}
   * @private
   */
  this.repeat = undefined;
}

/**
 * A texture that contains per-texel feature IDs that index into a feature table.
 *
 * @alias ModelComponents.FeatureIdTexture
 * @constructor
 *
 * @private
 */
function FeatureIdTexture() {
  /**
   * The ID of the feature table that feature IDs index into.
   *
   * @type {String}
   * @private
   */
  this.propertyTableId = undefined;

  /**
   * The texture reader containing feature IDs.
   *
   * @type {ModelComponents.TextureReader}
   * @private
   */
  this.textureReader = undefined;
}

/**
 * A morph target where each attribute contains attribute displacement data.
 *
 * @alias ModelComponents.MorphTarget
 * @constructor
 *
 * @private
 */
function MorphTarget() {
  /**
   * Attributes that are part of the morph target, e.g. positions, normals, and tangents.
   *
   * @type {ModelComponents.Attribute[]}
   * @private
   */
  this.attributes = [];
}

/**
 * Geometry to be rendered with a material.
 *
 * @alias ModelComponents.Primitive
 * @constructor
 *
 * @private
 */
function Primitive() {
  /**
   * The vertex attributes, e.g. positions, normals, etc.
   *
   * @type {ModelComponents.Attribute[]}
   * @private
   */
  this.attributes = [];

  /**
   * The morph targets.
   *
   * @type {ModelComponents.MorphTarget[]}
   * @private
   */
  this.morphTargets = [];

  /**
   * An array of weights to be applied to morph targets.
   *
   * @type {Number[]}
   * @private
   */
  this.morphWeights = [];

  /**
   * The indices.
   *
   * @type {ModelComponents.Indices}
   * @private
   */
  this.indices = undefined;

  /**
   * The material.
   *
   * @type {ModelComponents.Material}
   * @private
   */
  this.material = undefined;

  /**
   * The primitive type, e.g. PrimitiveType.TRIANGLES.
   *
   * @type {PrimitiveType}
   * @private
   */
  this.primitiveType = undefined;

  /**
   * The feature ID attributes.
   *
   * @type {ModelComponents.FeatureIdAttribute[]}
   * @private
   */
  this.featureIdAttributes = [];

  /**
   * The feature ID textures.
   *
   * @type {ModelComponents.FeatureIdTexture[]}
   * @private
   */
  this.featureIdTextures = [];

  /**
   * The feature texture IDs. These indices correspond to the array of
   * feature textures.
   *
   * @type {Number[]}
   * @private
   */
  this.featureTextureIds = [];
}

/**
 * Position and metadata information for instances of a node.
 *
 * @alias ModelComponents.Primitive
 * @constructor
 *
 * @private
 */
function Instances() {
  /**
   * The instance attributes, e.g. translation, rotation, scale, feature id, etc.
   *
   * @type {ModelComponents.Attribute[]}
   * @private
   */
  this.attributes = [];

  /**
   * The feature ID attributes.
   *
   * @type {ModelComponents.FeatureIdAttribute[]}
   * @private
   */
  this.featureIdAttributes = [];
}

/**
 * Joints and matrices defining a skin.
 *
 * @alias ModelComponents.Skin
 * @constructor
 *
 * @private
 */
function Skin() {
  /**
   * The joints.
   *
   * @type {ModelComponents.Node[]}
   * @private
   */
  this.joints = undefined;

  /**
   * The inverse bind matrices of the joints.
   *
   * @type {Matrix4[]}
   * @private
   */
  this.inverseBindMatrices = undefined;
}

/**
 * A node in the node hierarchy.
 *
 * @alias ModelComponents.Node
 * @constructor
 *
 * @private
 */
function Node() {
  /**
   * The children nodes.
   *
   * @type {ModelComponents.Node[]}
   * @private
   */
  this.children = [];

  /**
   * The mesh primitives.
   *
   * @type {ModelComponents.Primitive[]}
   * @private
   */
  this.primitives = [];

  /**
   * Instances of this node.
   *
   * @type {ModelComponents.Instances}
   * @private
   */
  this.instances = undefined;

  /**
   * The skin.
   *
   * @type {ModelComponents.Skin}
   * @private
   */
  this.skin = undefined;

  /**
   * The local transformation matrix. When matrix is defined translation,
   * rotation, and scale must be undefined. When matrix is undefined
   * translation, rotation, and scale must all be defined.
   *
   * @type {Matrix4}
   * @private
   */
  this.matrix = undefined;

  /**
   * The local translation.
   *
   * @type {Cartesian3}
   * @private
   */
  this.translation = undefined;

  /**
   * The local rotation.
   *
   * @type {Quaternion}
   * @private
   */
  this.rotation = undefined;

  /**
   * The local scale.
   *
   * @type {Cartesian3}
   * @private
   */
  this.scale = undefined;
}

/**
 * A scene containing nodes.
 *
 * @alias ModelComponents.Scene
 * @constructor
 *
 * @private
 */
function Scene() {
  /**
   * The nodes belonging to the scene.
   *
   * @type {ModelComponents.Node[]}
   * @private
   */
  this.nodes = [];

  /**
   * The scene's up axis.
   *
   * @type {Axis}
   * @private
   */
  this.upAxis = undefined;

  /**
   * The scene's forward axis.
   *
   * @type {Axis}
   * @private
   */
  this.forwardAxis = undefined;
}

/**
 * The components that make up a model.
 *
 * @alias ModelComponents.Components
 * @constructor
 *
 * @private
 */
function Components() {
  /**
   * The default scene.
   *
   * @type {ModelComponents.Scene}
   * @private
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
   * @private
   */
  this.featureMetadata = undefined;
}

/**
 * Information about a GPU texture, including the texture itself
 *
 * @alias ModelComponents.TextureReader
 * @constructor
 *
 * @private
 */
function TextureReader() {
  /**
   * The underlying GPU texture. The {@link Texture} contains the sampler.
   *
   * @type {Texture}
   * @private
   */
  this.texture = undefined;

  /**
   * The texture coordinate set.
   *
   * @type {Number}
   * @default 0
   * @private
   */
  this.texCoord = 0;

  /**
   * Transformation matrix to apply to texture coordinates.
   *
   * @type {Matrix3}
   * @default Matrix3.IDENTITY
   */
  this.transform = Matrix3.clone(Matrix3.IDENTITY);

  /**
   * The texture channels to read from. When undefined all channels are read.
   *
   * @type {String}
   */
  this.channels = undefined;
}

/**
 * Material properties for the PBR metallic roughness shading model.
 *
 * @alias ModelComponents.MetallicRoughness
 * @constructor
 *
 * @private
 */
function MetallicRoughness() {
  /**
   * The base color texture reader.
   *
   * @type {ModelComponents.TextureReader}
   * @private
   */
  this.baseColorTexture = undefined;

  /**
   * The metallic roughness texture reader.
   *
   * @type {ModelComponents.TextureReader}
   * @private
   */
  this.metallicRoughnessTexture = undefined;

  /**
   * The base color factor.
   *
   * @type {Cartesian4}
   * @default new Cartesian4(1.0, 1.0, 1.0, 1.0)
   * @private
   */
  this.baseColorFactor = Cartesian4.clone(
    MetallicRoughness.DEFAULT_BASE_COLOR_FACTOR
  );

  /**
   * The metallic factor.
   *
   * @type {Number}
   * @default 1.0
   * @private
   */
  this.metallicFactor = MetallicRoughness.DEFAULT_METALLIC_FACTOR;

  /**
   * The roughness factor.
   *
   * @type {Number}
   * @default 1.0
   * @private
   */
  this.roughnessFactor = MetallicRoughness.DEFAULT_ROUGHNESS_FACTOR;
}

/**
 * @private
 */
MetallicRoughness.DEFAULT_BASE_COLOR_FACTOR = Cartesian4.ONE;

/**
 * @private
 */
MetallicRoughness.DEFAULT_METALLIC_FACTOR = 1.0;

/**
 * @private
 */
MetallicRoughness.DEFAULT_ROUGHNESS_FACTOR = 1.0;

/**
 * Material properties for the PBR specular glossiness shading model.
 *
 * @alias ModelComponents.function SpecularGlossiness
 * @constructor
 *
 * @private
 */
function SpecularGlossiness() {
  /**
   * The diffuse texture reader.
   *
   * @type {ModelComponents.TextureReader}
   * @private
   */
  this.diffuseTexture = undefined;

  /**
   * The specular glossiness texture reader.
   *
   * @type {ModelComponents.TextureReader}
   * @private
   */
  this.specularGlossinessTexture = undefined;

  /**
   * The diffuse factor.
   *
   * @type {Cartesian4}
   * @default new Cartesian4(1.0, 1.0, 1.0, 1.0)
   * @private
   */
  this.diffuseFactor = Cartesian4.clone(
    SpecularGlossiness.DEFAULT_DIFFUSE_FACTOR
  );

  /**
   * The specular factor.
   *
   * @type {Cartesian3}
   * @default new Cartesian3(1.0, 1.0, 1.0)
   * @private
   */
  this.specularFactor = Cartesian3.clone(
    SpecularGlossiness.DEFAULT_SPECULAR_FACTOR
  );

  /**
   * The glossiness factor.
   *
   * @type {Number}
   * @default 1.0
   * @private
   */
  this.glossinessFactor = SpecularGlossiness.DEFAULT_GLOSSINESS_FACTOR;
}

/**
 * @private
 */
SpecularGlossiness.DEFAULT_DIFFUSE_FACTOR = Cartesian4.ONE;

/**
 * @private
 */
SpecularGlossiness.DEFAULT_SPECULAR_FACTOR = Cartesian3.ONE;

/**
 * @private
 */
SpecularGlossiness.DEFAULT_GLOSSINESS_FACTOR = 1.0;

/**
 * The material appearance of a primitive.
 *
 * @alias ModelComponent.Material
 * @constructor
 *
 * @private
 */
function Material() {
  /**
   * Material properties for the PBR metallic roughness shading model.
   *
   * @type {ModelComponents.MetallicRoughness}
   * @private
   */
  this.metallicRoughness = new MetallicRoughness();

  /**
   * Material properties for the PBR specular glossiness shading model.
   *
   * @type {ModelComponents.SpecularGlossiness}
   * @private
   */
  this.specularGlossiness = undefined;

  /**
   * The emissive texture reader.
   *
   * @type {ModelComponents.TextureReader}
   * @private
   */
  this.emissiveTexture = undefined;

  /**
   * The normal texture reader.
   *
   * @type {ModelComponents.TextureReader}
   * @private
   */
  this.normalTexture = undefined;

  /**
   * The occlusion texture reader.
   *
   * @type {ModelComponents.TextureReader}
   * @private
   */
  this.occlusionTexture = undefined;

  /**
   * The emissive factor.
   *
   * @type {Cartesian3}
   * @default Cartesian3.ZERO
   * @private
   */
  this.emissiveFactor = Cartesian3.clone(Material.DEFAULT_EMISSIVE_FACTOR);

  /**
   * The alpha mode.
   *
   * @type {AlphaMode}
   * @default AlphaMode.OPAQUE
   * @private
   */
  this.alphaMode = AlphaMode.OPAQUE;

  /**
   * The alpha cutoff value of the material for the MASK alpha mode.
   *
   * @type {Number}
   * @default 0.5
   * @private
   */
  this.alphaCutoff = 0.5;

  /**
   * Specifies whether the material is double sided.
   *
   * @type {Boolean}
   * @default false
   * @private
   */
  this.doubleSided = false;

  /**
   * Specifies whether the material is unlit.
   *
   * @type {Boolean}
   * @default false
   * @private
   */
  this.unlit = false;
}

/**
 * @private
 */
Material.DEFAULT_EMISSIVE_FACTOR = Cartesian3.ZERO;

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
ModelComponents.TextureReader = TextureReader;
ModelComponents.MetallicRoughness = MetallicRoughness;
ModelComponents.SpecularGlossiness = SpecularGlossiness;
ModelComponents.Material = Material;

export default ModelComponents;
