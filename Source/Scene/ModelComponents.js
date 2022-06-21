import AlphaMode from "./AlphaMode.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";

/**
 * Components for building models.
 *
 * @namespace ModelComponents
 *
 * @private
 */
const ModelComponents = {};

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
   * quantizedVolumeDimensions / normalizationRange (component-wise).
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
   * A typed array containing tightly-packed attribute values, as they appear
   * in the model file.
   *
   * @type {Uint8Array|Int8Array|Uint16Array|Int16Array|Uint32Array|Int32Array|Float32Array}
   * @private
   */
  this.packedTypedArray = undefined;

  /**
   * A vertex buffer. Attribute values are accessed using byteOffset and byteStride.
   *
   * @type {Buffer}
   * @private
   */
  this.buffer = undefined;

  /**
   * A typed array containing a CPU copy of the vertex buffer for further
   * processing. Since GPU buffers may have padding, attribute values are
   * accessed using byteOffset and byteStride.
   *
   * @type {Uint8Array}
   * @private
   */
  this.typedArray = undefined;

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

  /**
   * A typed array containing indices.
   *
   * @type {Uint8Array|Uint16Array|Uint32Array}
   * @private
   */
  this.typedArray = undefined;
}

/**
 * Maps per-vertex or per-instance feature IDs to a property table. Feature
 * IDs are stored in an accessor.
 *
 * @alias ModelComponents.FeatureIdAttribute
 * @constructor
 *
 * @private
 */
function FeatureIdAttribute() {
  /**
   * How many unique features are defined in this set of feature IDs
   *
   * @type {Number}
   * @private
   */
  this.featureCount = undefined;

  /**
   * This value indicates that no feature is indicated with this vertex
   *
   * @type {Number}
   * @private
   */
  this.nullFeatureId = undefined;

  /**
   * The ID of the property table that feature IDs index into. If undefined,
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
   * The label to identify this set of feature IDs. This is used in picking,
   * styling and shaders.
   *
   * @type {String}
   * @private
   */
  this.label = undefined;

  /**
   * Label to identify this set of feature IDs by its position in the array.
   * This will always be either "featureId_N" for primitives or
   * "instanceFeatureId_N" for instances.
   *
   * @type {String}
   * @private
   */
  this.positionalLabel = undefined;
}

/**
 * Defines a range of implicitly-defined feature IDs, one for each vertex or
 * instance. Such feature IDs may optionally be associated with a property table
 * storing metadata
 *
 * @alias ModelComponents.FeatureIdImplicitRange
 * @constructor
 *
 * @private
 */
function FeatureIdImplicitRange() {
  /**
   * How many unique features are defined in this set of feature IDs
   *
   * @type {Number}
   * @private
   */
  this.featureCount = undefined;

  /**
   * This value indicates that no feature is indicated with this vertex
   *
   * @type {Number}
   * @private
   */
  this.nullFeatureId = undefined;

  /**
   * The ID of the property table that feature IDs index into. If undefined,
   * feature IDs are used for classification, but no metadata is associated.
   *
   * @type {Number}
   * @private
   */
  this.propertyTableId = undefined;

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

  /**
   * The label to identify this set of feature IDs. This is used in picking,
   * styling and shaders.
   *
   * @type {String}
   * @private
   */
  this.label = undefined;

  /**
   * Label to identify this set of feature IDs by its position in the array.
   * This will always be either "featureId_N" for primitives or
   * "instanceFeatureId_N" for instances.
   *
   * @type {String}
   * @private
   */
  this.positionalLabel = undefined;
}

/**
 * A texture that contains per-texel feature IDs that index into a property table.
 *
 * @alias ModelComponents.FeatureIdTexture
 * @constructor
 *
 * @private
 */
function FeatureIdTexture() {
  /**
   * How many unique features are defined in this set of feature IDs
   *
   * @type {Number}
   * @private
   */
  this.featureCount = undefined;

  /**
   * This value indicates that no feature is indicated with this texel
   *
   * @type {Number}
   * @private
   */
  this.nullFeatureId = undefined;

  /**
   * The ID of the property table that feature IDs index into. If undefined,
   * feature IDs are used for classification, but no metadata is associated.
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

  /**
   * The label to identify this set of feature IDs. This is used in picking,
   * styling and shaders.
   *
   * @type {String}
   * @private
   */
  this.label = undefined;

  /**
   * Label to identify this set of feature IDs by its position in the array.
   * This will always be either "featureId_N" for primitives or
   * "instanceFeatureId_N" for instances.
   *
   * @type {String}
   * @private
   */
  this.positionalLabel = undefined;
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
   * The feature IDs associated with this primitive. Feature ID types may
   * be interleaved
   *
   * @type {Array.<ModelComponents.FeatureIdAttribute|ModelComponents.FeatureIdImplicitRange|ModelComponents.FeatureIdTexture>}
   * @private
   */
  this.featureIds = [];

  /**
   * The property texture IDs. These indices correspond to the array of
   * property textures.
   *
   * @type {Number[]}
   * @private
   */
  this.propertyTextureIds = [];

  /**
   * The property attribute IDs. These indices correspond to the array of
   * property attributes in the EXT_structural_metadata extension.
   *
   * @type {Number[]}
   * @private
   */
  this.propertyAttributeIds = [];
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
   * The feature ID attributes associated with this set of instances.
   * Feature ID attribute types may be interleaved.
   *
   * @type {Array.<ModelComponents.FeatureIdAttribute|ModelComponents.FeatureIdImplicitRange>}
   * @private
   */
  this.featureIds = [];

  /**
   * Whether the instancing transforms are applied in world space. For glTF models that
   * use EXT_mesh_gpu_instancing, the transform is applied in object space. For i3dm files,
   * the instance transform is in world space.
   *
   * @type {Boolean}
   * @private
   */
  this.transformInWorldSpace = false;
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
   * The index of the skin in the glTF. This is useful for finding the skin
   * that applies to a node after the skin is instantiated at runtime.
   *
   * @type {Number}
   * @private
   */
  this.index = undefined;

  /**
   * The joints.
   *
   * @type {ModelComponents.Node[]}
   * @private
   */
  this.joints = [];

  /**
   * The inverse bind matrices of the joints.
   *
   * @type {Matrix4[]}
   * @private
   */
  this.inverseBindMatrices = [];
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
   * The name of the node.
   *
   * @type {String}
   * @private
   */
  this.name = undefined;

  /**
   * The index of the node in the glTF. This is useful for finding the nodes
   * that belong to a skin after they have been instantiated at runtime.
   *
   * @type {Number}
   * @private
   */
  this.index = undefined;

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

  /**
   * An array of weights to be applied to the primitives' morph targets.
   * These are supplied by either the node or its mesh.
   *
   * @type {Number[]}
   * @private
   */
  this.morphWeights = [];
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
}

/**
 * The property of the node that is targeted by an animation. The values of
 * this enum are used to look up the appropriate property on the runtime node.
 *
 * @alias {ModelComponents.AnimatedPropertyType}
 * @enum {String}
 *
 * @private
 */
const AnimatedPropertyType = {
  TRANSLATION: "translation",
  ROTATION: "rotation",
  SCALE: "scale",
  WEIGHTS: "weights",
};

/**
 * An animation sampler that describes the sources of animated keyframe data
 * and their interpolation.
 *
 * @alias {ModelComponents.AnimationSampler}
 * @constructor
 *
 * @private
 */
function AnimationSampler() {
  /**
   * The timesteps of the animation.
   *
   * @type {Number[]}
   * @private
   */
  this.input = [];

  /**
   * The method used to interpolate between the animation's keyframe data.
   *
   * @type {InterpolationType}
   * @private
   */
  this.interpolation = undefined;

  /**
   * The keyframe data of the animation.
   *
   * @type {Number[]|Cartesian3[]|Quaternion[]}
   * @private
   */
  this.output = [];
}

/**
 * An animation target, which specifies the node and property to animate.
 *
 * @alias {ModelComponents.AnimationTarget}
 * @constructor
 *
 * @private
 */
function AnimationTarget() {
  /**
   * The node that will be affected by the animation.
   *
   * @type {ModelComponents.Node}
   * @private
   */
  this.node = undefined;

  /**
   * The property of the node to be animated.
   *
   * @type {ModelComponents.AnimatedPropertyType}
   * @private
   */
  this.path = undefined;
}

/**
 * An animation channel linking an animation sampler and the target it animates.
 *
 * @alias {ModelComponents.AnimationChannel}
 * @constructor
 *
 * @private
 */
function AnimationChannel() {
  /**
   * The sampler used as the source of the animation data.
   *
   * @type {ModelComponents.AnimationSampler}
   * @private
   */
  this.sampler = undefined;

  /**
   * The target of the animation.
   *
   * @type {ModelComponents.AnimationTarget}
   * @private
   */
  this.target = undefined;
}

/**
 * An animation in the model.
 *
 * @alias {ModelComponents.Animation}
 * @constructor
 *
 * @private
 */
function Animation() {
  /**
   * The name of the animation.
   *
   * @type {String}
   * @private
   */
  this.name = undefined;

  /**
   * The samplers used in this animation.
   *
   * @type {ModelComponents.AnimationSampler[]}
   * @private
   */
  this.samplers = [];

  /**
   * The channels used in this animation.
   *
   * @type {ModelComponents.AnimationChannel[]}
   * @private
   */
  this.channels = [];
}

/**
 * The motion of the node that is targeted by an articulation stage. The values of
 * this enum are used to modify the appropriate property on the runtime node.
 *
 * @alias {ModelComponents.ArticulationMotionType}
 * @enum {String}
 *
 * @private
 */
const ArticulationMotionType = {
  XTRANSLATE: "xTranslate",
  YTRANSLATE: "yTranslate",
  ZTRANSLATE: "zTranslate",
  XROTATE: "xRotate",
  YROTATE: "yRotate",
  ZROTATE: "zRotate",
  XSCALE: "xScale",
  YSCALE: "yScale",
  ZSCALE: "zScale",
  UNIFORMSCALE: "uniformScale",
};

/**
 * An articulation stage belonging to an articulation from the AGI_articulations extension.
 *
 * @alias {ModelComponents.ArticulationStage}
 * @constructor
 *
 * @private
 */
function ArticulationStage() {
  /**
   * The name of the articulation stage.
   *
   * @type {String}
   * @private
   */
  this.name = undefined;

  /**
   * The type of motion being modified by the articulation stage.
   *
   * @type {ModelComponents.ArticulationMotionType}
   * @private
   */
  this.type = undefined;

  /**
   * The minimum value for the range of motion of this articulation stage.
   *
   * @type {Number}
   * @private
   */
  this.minimumValue = undefined;

  /**
   * The maximum value for the range of motion of this articulation stage.
   *
   * @type {Number}
   * @private
   */
  this.maximumValue = undefined;

  /**
   * The initial value for this articulation stage.
   *
   * @type {Number}
   * @private
   */
  this.initialValue = undefined;
}

/**
 * An articulation for the model, as specified in the AGI_articulations extension.
 *
 * @alias {ModelComponents.Articulation}
 * @constructor
 *
 * @private
 */
function Articulation() {
  /**
   * The name of the articulation.
   *
   * @type {String}
   * @private
   */
  this.name = undefined;

  // TODO: update
  /**
   * The stages belonging to this articulation.
   *
   * @type {ModelComponents.ArticulationStage[]}
   * @private
   */
  this.stages = [];
}

/**
 * The asset of the model.
 *
 * @alias {ModelComponents.Asset}
 * @constructor
 *
 * @private
 */
function Asset() {
  /**
   * The credits of the model.
   *
   * @type {Credit[]}
   * @private
   */
  this.credits = [];
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
   * The asset of the model.
   *
   * @type {ModelComponents.Asset}
   * @private
   */
  this.asset = new Asset();

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
  this.nodes = [];

  /**
   * All skins in the model.
   *
   * @type {ModelComponents.Skin[]}
   */
  this.skins = [];

  /**
   * All animations in the model.
   *
   * @type {ModelComponents.Animation[]}
   */
  this.animations = [];

  /**
   * All articulations in the model as defined by the AGI_articulations extension.
   * These are stored in a dictionary where the key is the name of the articulation,
   * and the value is the parsed articulation component.
   *
   * @type {Object}
   */
  this.articulations = [];

  /**
   * Structural metadata containing the schema, property tables, property
   * textures and property mappings
   *
   * @type {StructuralMetadata}
   * @private
   */
  this.structuralMetadata = undefined;

  /**
   * The model's up axis.
   *
   * @type {Axis}
   * @private
   */
  this.upAxis = undefined;

  /**
   * The model's forward axis.
   *
   * @type {Axis}
   * @private
   */
  this.forwardAxis = undefined;

  /**
   * A world-space transform to apply to the primitives.
   *
   * @type {Matrix4}
   * @private
   */
  this.transform = Matrix4.clone(Matrix4.IDENTITY);
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
   * The index of the texture in the glTF. This is useful for determining
   * when textures are shared to avoid attaching a texture in multiple uniform
   * slots in the shader.
   *
   * @type {Number}
   * @private
   */
  this.index = undefined;

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
ModelComponents.FeatureIdImplicitRange = FeatureIdImplicitRange;
ModelComponents.MorphTarget = MorphTarget;
ModelComponents.Primitive = Primitive;
ModelComponents.Instances = Instances;
ModelComponents.Skin = Skin;
ModelComponents.Node = Node;
ModelComponents.Scene = Scene;
ModelComponents.AnimatedPropertyType = Object.freeze(AnimatedPropertyType);
ModelComponents.AnimationSampler = AnimationSampler;
ModelComponents.AnimationTarget = AnimationTarget;
ModelComponents.AnimationChannel = AnimationChannel;
ModelComponents.Animation = Animation;
ModelComponents.ArticulationMotionType = Object.freeze(ArticulationMotionType);
ModelComponents.ArticulationStage = ArticulationStage;
ModelComponents.Articulation = Articulation;
ModelComponents.Asset = Asset;
ModelComponents.Components = Components;
ModelComponents.TextureReader = TextureReader;
ModelComponents.MetallicRoughness = MetallicRoughness;
ModelComponents.SpecularGlossiness = SpecularGlossiness;
ModelComponents.Material = Material;

export default ModelComponents;
