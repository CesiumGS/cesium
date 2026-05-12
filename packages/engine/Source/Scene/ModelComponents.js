// @ts-check

import AlphaMode from "./AlphaMode.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";

/** @import { TypedArray } from "../Core/globalTypes.js"; */
/** @import ArticulationStageType from "../Core/ArticulationStageType.js"; */
/** @import AttributeType from "./AttributeType.js"; */
/** @import Axis from "./Axis.js"; */
/** @import Cartesian2 from "../Core/Cartesian2.js"; */
/** @import ComponentDatatype from "../Core/ComponentDatatype.js"; */
/** @import Credit from "../Core/Credit.js"; */
/** @import IndexDatatype from "../Core/IndexDatatype.js"; */
/** @import InstanceAttributeSemantic from "./InstanceAttributeSemantic.js"; */
/** @import InterpolationType from "../Core/InterpolationType.js"; */
/** @import Matrix2 from "../Core/Matrix2.js"; */
/** @import ModelPrimitiveImagery from "./Model/ModelPrimitiveImagery.js"; */
/** @import PrimitiveType from "../Core/PrimitiveType.js"; */
/** @import Quaternion from "../Core/Quaternion.js"; */
/** @import StructuralMetadata from "./StructuralMetadata.js"; */
/** @import Texture from "../Renderer/Texture.js"; */
/** @import VertexAttributeSemantic from "./VertexAttributeSemantic.js"; */
/** @import Buffer from "../Renderer/Buffer.js"; */

/**
 * Components for building models.
 *
 * @namespace ModelComponents
 *
 * @ignore
 */
const ModelComponents = {};

/**
 * Information about the quantized attribute.
 *
 * @ignore
 */
export class Quantization {
  constructor() {
    /**
     * Whether the quantized attribute is oct-encoded.
     *
     * @type {boolean}
     * @ignore
     */
    this.octEncoded = false;

    /**
     * Whether the oct-encoded values are stored as ZXY instead of XYZ. This is true when decoding from Draco.
     *
     * @type {boolean}
     * @ignore
     */
    this.octEncodedZXY = false;

    /**
     * The range used to convert buffer values to normalized values [0.0, 1.0]
     * This is typically computed as (1 << quantizationBits) - 1.
     * For oct-encoded values this value is a single Number.
     *
     * @type {number|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4}
     * @ignore
     */
    this.normalizationRange = undefined;

    /**
     * The bottom-left corner of the quantization volume. Not applicable for oct encoded attributes.
     * The type should match the attribute type - e.g. if the attribute type
     * is AttributeType.VEC4 the offset should be a Cartesian4.
     *
     * @type {number|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4}
     * @ignore
     */
    this.quantizedVolumeOffset = undefined;

    /**
     * The dimensions of the quantization volume. Not applicable for oct encoded attributes.
     * The type should match the attribute type - e.g. if the attribute type
     * is AttributeType.VEC4 the dimensions should be a Cartesian4.
     *
     * @type {number|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4}
     * @ignore
     */
    this.quantizedVolumeDimensions = undefined;

    /**
     * The step size of the quantization volume, equal to
     * quantizedVolumeDimensions / normalizationRange (component-wise).
     * Not applicable for oct encoded attributes.
     * The type should match the attribute type - e.g. if the attribute type
     * is AttributeType.VEC4 the dimensions should be a Cartesian4.
     *
     * @type {number|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4}
     * @ignore
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
     * @ignore
     */
    this.componentDatatype = undefined;

    /**
     * The type of the quantized attribute, e.g. AttributeType.VEC2 for oct-encoded normals.
     *
     * @type {AttributeType}
     * @ignore
     */
    this.type = undefined;
  }
}

/**
 * A per-vertex or per-instance attribute.
 *
 * @ignore
 */
export class Attribute {
  constructor() {
    /**
     * The attribute name. Must be unique within the attributes array.
     *
     * @type {string}
     * @ignore
     */
    this.name = undefined;

    /**
     * The attribute semantic. The combination of semantic and setIndex must be
     * unique within the attributes array.
     *
     * @type {VertexAttributeSemantic|InstanceAttributeSemantic}
     * @ignore
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
     * @ignore
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
     * @ignore
     */
    this.type = undefined;

    /**
     * Whether the attribute is normalized.
     *
     * @type {boolean}
     * @default false
     * @ignore
     */
    this.normalized = false;

    /**
     * The number of elements.
     *
     * @type {number}
     * @ignore
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
     * @type {number|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4}
     * @ignore
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
     * @type {number|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4}
     * @ignore
     */
    this.max = undefined;

    /**
     * A constant value used for all elements when typed array and buffer are undefined.
     *
     * @type {number|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4}
     * @ignore
     */
    this.constant = undefined;

    /**
     * Information about the quantized attribute.
     *
     * @type {Quantization}
     * @ignore
     */
    this.quantization = undefined;

    /**
     * A typed array containing tightly-packed attribute values, as they appear
     * in the model file.
     *
     * @type {Uint8Array|Int8Array|Uint16Array|Int16Array|Uint32Array|Int32Array|Float32Array}
     * @ignore
     */
    this.typedArray = undefined;

    /**
     * Packed spherical harmonics data produced while decoding SPZ data.
     *
     * @type {Uint32Array|undefined}
     * @ignore
     */
    this.packedSphericalHarmonicsData = undefined;

    /**
     * Spherical harmonics degree for packed SPZ data.
     *
     * @type {number}
     * @ignore
     */
    this.sphericalHarmonicsDegree = 0;

    /**
     * Spherical harmonics coefficient count for packed SPZ data.
     *
     * @type {number}
     * @ignore
     */
    this.sphericalHarmonicsCoefficientCount = 0;

    /**
     * A vertex buffer. Attribute values are accessed using byteOffset and byteStride.
     *
     * @type {Buffer}
     * @ignore
     */
    this.buffer = undefined;

    /**
     * The byte offset of elements in the buffer.
     *
     * @type {number}
     * @default 0
     * @ignore
     */
    this.byteOffset = 0;

    /**
     * The byte stride of elements in the buffer. When undefined the elements are tightly packed.
     *
     * @type {number}
     * @ignore
     */
    this.byteStride = undefined;
  }
}

/**
 * Indices used to select vertices for rendering.
 *
 * @ignore
 */
export class Indices {
  constructor() {
    /**
     * The index data type of the attribute, e.g. IndexDatatype.UNSIGNED_SHORT.
     *
     * @type {IndexDatatype}
     * @ignore
     */
    this.indexDatatype = undefined;

    /**
     * The number of indices.
     *
     * @type {number}
     * @ignore
     */
    this.count = undefined;

    /**
     * An index buffer containing indices.
     *
     * @type {Buffer}
     * @ignore
     */
    this.buffer = undefined;

    /**
     * A typed array containing indices.
     *
     * @type {Uint8Array|Uint16Array|Uint32Array}
     * @ignore
     */
    this.typedArray = undefined;
  }
}

/**
 * Maps per-vertex or per-instance feature IDs to a property table. Feature
 * IDs are stored in an accessor.
 *
 * @ignore
 */
export class FeatureIdAttribute {
  constructor() {
    /**
     * How many unique features are defined in this set of feature IDs
     *
     * @type {number}
     * @ignore
     */
    this.featureCount = undefined;

    /**
     * This value indicates that no feature is indicated with this vertex
     *
     * @type {number}
     * @ignore
     */
    this.nullFeatureId = undefined;

    /**
     * The ID of the property table that feature IDs index into. If undefined,
     * feature IDs are used for classification, but no metadata is associated.
     *
     *
     * @type {number}
     * @ignore
     */
    this.propertyTableId = undefined;

    /**
     * The set index of feature ID attribute containing feature IDs.
     *
     * @type {number}
     * @ignore
     */
    this.setIndex = undefined;

    /**
     * The label to identify this set of feature IDs. This is used in picking,
     * styling and shaders.
     *
     * @type {string}
     * @ignore
     */
    this.label = undefined;

    /**
     * Label to identify this set of feature IDs by its position in the array.
     * This will always be either "featureId_N" for primitives or
     * "instanceFeatureId_N" for instances.
     *
     * @type {string}
     * @ignore
     */
    this.positionalLabel = undefined;
  }
}

/**
 * Defines a range of implicitly-defined feature IDs, one for each vertex or
 * instance. Such feature IDs may optionally be associated with a property table
 * storing metadata
 *
 * @ignore
 */
export class FeatureIdImplicitRange {
  constructor() {
    /**
     * How many unique features are defined in this set of feature IDs
     *
     * @type {number}
     * @ignore
     */
    this.featureCount = undefined;

    /**
     * This value indicates that no feature is indicated with this vertex
     *
     * @type {number}
     * @ignore
     */
    this.nullFeatureId = undefined;

    /**
     * The ID of the property table that feature IDs index into. If undefined,
     * feature IDs are used for classification, but no metadata is associated.
     *
     * @type {number}
     * @ignore
     */
    this.propertyTableId = undefined;

    /**
     * The first feature ID to use when setIndex is undefined
     *
     * @type {number}
     * @default 0
     * @ignore
     */
    this.offset = 0;

    /**
     * Number of times each feature ID is repeated before being incremented.
     *
     * @type {number}
     * @ignore
     */
    this.repeat = undefined;

    /**
     * The label to identify this set of feature IDs. This is used in picking,
     * styling and shaders.
     *
     * @type {string}
     * @ignore
     */
    this.label = undefined;

    /**
     * Label to identify this set of feature IDs by its position in the array.
     * This will always be either "featureId_N" for primitives or
     * "instanceFeatureId_N" for instances.
     *
     * @type {string}
     * @ignore
     */
    this.positionalLabel = undefined;
  }
}

/**
 * A texture that contains per-texel feature IDs that index into a property table.
 *
 * @ignore
 */
export class FeatureIdTexture {
  constructor() {
    /**
     * How many unique features are defined in this set of feature IDs
     *
     * @type {number}
     * @ignore
     */
    this.featureCount = undefined;

    /**
     * This value indicates that no feature is indicated with this texel
     *
     * @type {number}
     * @ignore
     */
    this.nullFeatureId = undefined;

    /**
     * The ID of the property table that feature IDs index into. If undefined,
     * feature IDs are used for classification, but no metadata is associated.
     *
     * @type {number}
     * @ignore
     */
    this.propertyTableId = undefined;

    /**
     * The texture reader containing feature IDs.
     *
     * @type {TextureReader}
     * @ignore
     */
    this.textureReader = undefined;

    /**
     * The label to identify this set of feature IDs. This is used in picking,
     * styling and shaders.
     *
     * @type {string}
     * @ignore
     */
    this.label = undefined;

    /**
     * Label to identify this set of feature IDs by its position in the array.
     * This will always be either "featureId_N" for primitives or
     * "instanceFeatureId_N" for instances.
     *
     * @type {string}
     * @ignore
     */
    this.positionalLabel = undefined;
  }
}

/**
 * A morph target where each attribute contains attribute displacement data.
 *
 * @ignore
 */
export class MorphTarget {
  constructor() {
    /**
     * Attributes that are part of the morph target, e.g. positions, normals, and tangents.
     *
     * @type {Attribute[]}
     * @ignore
     */
    this.attributes = [];
  }
}

/**
 * Geometry to be rendered with a material.
 *
 * @ignore
 */
export class Primitive {
  constructor() {
    /**
     * The vertex attributes, e.g. positions, normals, etc.
     *
     * @type {Attribute[]}
     * @ignore
     */
    this.attributes = [];

    /**
     * The morph targets.
     *
     * @type {MorphTarget[]}
     * @ignore
     */
    this.morphTargets = [];

    /**
     * The indices.
     *
     * @type {Indices}
     * @ignore
     */
    this.indices = undefined;

    /**
     * The material.
     *
     * @type {Material}
     * @ignore
     */
    this.material = undefined;

    /**
     * The primitive type, e.g. PrimitiveType.TRIANGLES.
     *
     * @type {PrimitiveType}
     * @ignore
     */
    this.primitiveType = undefined;

    /**
     * The CESIUM_mesh_vector extension data for this primitive.
     *
     * @type {Vector}
     * @ignore
     */
    this.vector = undefined;

    /**
     * The feature IDs associated with this primitive. Feature ID types may
     * be interleaved
     *
     * @type {Array<FeatureIdAttribute|FeatureIdImplicitRange|FeatureIdTexture>}
     * @ignore
     */
    this.featureIds = [];

    /**
     * The property texture IDs. These indices correspond to the array of
     * property textures.
     *
     * @type {number[]}
     * @ignore
     */
    this.propertyTextureIds = [];

    /**
     * The property attribute IDs. These indices correspond to the array of
     * property attributes in the EXT_structural_metadata extension.
     *
     * @type {number[]}
     * @ignore
     */
    this.propertyAttributeIds = [];

    /**
     * If the CESIUM_primitive_outline glTF extension is used, this property
     * stores an additional attribute storing outline coordinates.
     *
     * @type {Attribute}
     * @ignore
     */
    this.outlineCoordinates = undefined;

    /**
     * If the model is part of a Model3DTileContent of a Cesium3DTileset that
     * has 'imageryLayers', then this will represent the information that is
     * required for draping the imagery over this primitive.
     *
     * @type {ModelPrimitiveImagery|undefined}
     * @ignore
     */
    this.modelPrimitiveImagery = undefined;

    /**
     * Data loaded from the EXT_mesh_primitive_edge_visibility extension.
     *
     * @type {Object}
     * @ignore
     */
    this.edgeVisibility = undefined;
  }
}

/**
 * Position and metadata information for instances of a node.
 *
 * @ignore
 */
export class Instances {
  constructor() {
    /**
     * The instance attributes, e.g. translation, rotation, scale, feature id, etc.
     *
     * @type {Attribute[]}
     * @ignore
     */
    this.attributes = [];

    /**
     * The feature ID attributes associated with this set of instances.
     * Feature ID attribute types may be interleaved.
     *
     * @type {Array<ModelComponents.FeatureIdAttribute|ModelComponents.FeatureIdImplicitRange>}
     * @ignore
     */
    this.featureIds = [];

    /**
     * Whether the instancing transforms are applied in world space. For glTF models that
     * use EXT_mesh_gpu_instancing, the transform is applied in object space. For i3dm files,
     * the instance transform is in world space.
     *
     * @type {boolean}
     * @ignore
     */
    this.transformInWorldSpace = false;
  }
}

/**
 * Joints and matrices defining a skin.
 *
 * @ignore
 */
export class Skin {
  constructor() {
    /**
     * The index of the skin in the glTF. This is useful for finding the skin
     * that applies to a node after the skin is instantiated at runtime.
     *
     * @type {number}
     * @ignore
     */
    this.index = undefined;

    /**
     * The joints.
     *
     * @type {Node[]}
     * @ignore
     */
    this.joints = [];

    /**
     * The inverse bind matrices of the joints.
     *
     * @type {Matrix4[]}
     * @ignore
     */
    this.inverseBindMatrices = [];
  }
}

/**
 * A node in the node hierarchy.
 *
 * @ignore
 */
export class Node {
  constructor() {
    /**
     * The name of the node.
     *
     * @type {string}
     * @ignore
     */
    this.name = undefined;

    /**
     * The index of the node in the glTF. This is useful for finding the nodes
     * that belong to a skin after they have been instantiated at runtime.
     *
     * @type {number}
     * @ignore
     */
    this.index = undefined;

    /**
     * The children nodes.
     *
     * @type {Node[]}
     * @ignore
     */
    this.children = [];

    /**
     * The mesh primitives.
     *
     * @type {Primitive[]}
     * @ignore
     */
    this.primitives = [];

    /**
     * Instances of this node.
     *
     * @type {Instances}
     * @ignore
     */
    this.instances = undefined;

    /**
     * The skin.
     *
     * @type {Skin}
     * @ignore
     */
    this.skin = undefined;

    /**
     * The local transformation matrix. When matrix is defined translation,
     * rotation, and scale must be undefined. When matrix is undefined
     * translation, rotation, and scale must all be defined.
     *
     * @type {Matrix4}
     * @ignore
     */
    this.matrix = undefined;

    /**
     * The local translation.
     *
     * @type {Cartesian3}
     * @ignore
     */
    this.translation = undefined;

    /**
     * The local rotation.
     *
     * @type {Quaternion}
     * @ignore
     */
    this.rotation = undefined;

    /**
     * The local scale.
     *
     * @type {Cartesian3}
     * @ignore
     */
    this.scale = undefined;

    /**
     * An array of weights to be applied to the primitives' morph targets.
     * These are supplied by either the node or its mesh.
     *
     * @type {number[]}
     * @ignore
     */
    this.morphWeights = [];

    /**
     * The name of the articulation affecting this node, as defined by the
     * AGI_articulations extension.
     *
     * @type {string}
     * @ignore
     */
    this.articulationName = undefined;

    /**
     * The CESIUM_mesh_vector extension data for this node.
     *
     * @type {object}
     * @ignore
     */
    this.meshVector = undefined;
  }
}

/**
 * A scene containing nodes.
 *
 * @ignore
 */
export class Scene {
  constructor() {
    /**
     * The nodes belonging to the scene.
     *
     * @type {Node[]}
     * @ignore
     */
    this.nodes = [];
  }
}

/**
 * The property of the node that is targeted by an animation. The values of
 * this enum are used to look up the appropriate property on the runtime node.
 *
 * @enum {string}
 *
 * @ignore
 */
export const AnimatedPropertyType = {
  TRANSLATION: "translation",
  ROTATION: "rotation",
  SCALE: "scale",
  WEIGHTS: "weights",
};

/**
 * An animation sampler that describes the sources of animated keyframe data
 * and their interpolation.
 *
 * @ignore
 */
export class AnimationSampler {
  constructor() {
    /**
     * The timesteps of the animation.
     *
     * @type {number[]}
     * @ignore
     */
    this.input = [];

    /**
     * The method used to interpolate between the animation's keyframe data.
     *
     * @type {InterpolationType}
     * @ignore
     */
    this.interpolation = undefined;

    /**
     * The keyframe data of the animation.
     *
     * @type {number[]|Cartesian3[]|Quaternion[]}
     * @ignore
     */
    this.output = [];
  }
}

/**
 * An animation target, which specifies the node and property to animate.
 *
 * @ignore
 */
export class AnimationTarget {
  constructor() {
    /**
     * The node that will be affected by the animation.
     *
     * @type {Node}
     * @ignore
     */
    this.node = undefined;

    /**
     * The property of the node to be animated.
     *
     * @type {AnimatedPropertyType}
     * @ignore
     */
    this.path = undefined;
  }
}

/**
 * An animation channel linking an animation sampler and the target it animates.
 *
 * @ignore
 */
export class AnimationChannel {
  constructor() {
    /**
     * The sampler used as the source of the animation data.
     *
     * @type {AnimationSampler}
     * @ignore
     */
    this.sampler = undefined;

    /**
     * The target of the animation.
     *
     * @type {AnimationTarget}
     * @ignore
     */
    this.target = undefined;
  }
}

/**
 * An animation in the model.
 *
 * @ignore
 */
export class Animation {
  constructor() {
    /**
     * The name of the animation.
     *
     * @type {string}
     * @ignore
     */
    this.name = undefined;

    /**
     * The samplers used in this animation.
     *
     * @type {AnimationSampler[]}
     * @ignore
     */
    this.samplers = [];

    /**
     * The channels used in this animation.
     *
     * @type {AnimationChannel[]}
     * @ignore
     */
    this.channels = [];
  }
}

/**
 * An articulation stage belonging to an articulation from the
 * AGI_articulations extension.
 *
 * @ignore
 */
export class ArticulationStage {
  constructor() {
    /**
     * The name of the articulation stage.
     *
     * @type {string}
     * @ignore
     */
    this.name = undefined;

    /**
     * The type of the articulation stage, defined by the type of motion it modifies.
     *
     * @type {ArticulationStageType}
     * @ignore
     */
    this.type = undefined;

    /**
     * The minimum value for the range of motion of this articulation stage.
     *
     * @type {number}
     * @ignore
     */
    this.minimumValue = undefined;

    /**
     * The maximum value for the range of motion of this articulation stage.
     *
     * @type {number}
     * @ignore
     */
    this.maximumValue = undefined;

    /**
     * The initial value for this articulation stage.
     *
     * @type {number}
     * @ignore
     */
    this.initialValue = undefined;
  }
}

/**
 * An articulation for the model, as defined by the AGI_articulations extension.
 *
 * @ignore
 */
export class Articulation {
  constructor() {
    /**
     * The name of the articulation.
     *
     * @type {string}
     * @ignore
     */
    this.name = undefined;

    /**
     * The stages belonging to this articulation. The stages are applied to
     * the model in order of appearance.
     *
     * @type {ArticulationStage[]}
     * @ignore
     */
    this.stages = [];
  }
}

/**
 * The asset of the model.
 *
 * @ignore
 */
export class Asset {
  constructor() {
    /**
     * The credits of the model.
     *
     * @type {Credit[]}
     * @ignore
     */
    this.credits = [];
  }
}

/**
 * The components that make up a model.
 *
 * @ignore
 */
export class Components {
  constructor() {
    /**
     * The asset of the model.
     *
     * @type {Asset}
     * @ignore
     */
    this.asset = new Asset();

    /**
     * The default scene.
     *
     * @type {Scene}
     * @ignore
     */
    this.scene = undefined;

    /**
     * All nodes in the model.
     *
     * @type {Node[]}
     */
    this.nodes = [];

    /**
     * All skins in the model.
     *
     * @type {Skin[]}
     */
    this.skins = [];

    /**
     * All animations in the model.
     *
     * @type {Animation[]}
     */
    this.animations = [];

    /**
     * All articulations in the model as defined by the AGI_articulations extension.
     *
     * @type {Articulation[]}
     */
    this.articulations = [];

    /**
     * Structural metadata containing the schema, property tables, property
     * textures and property mappings
     *
     * @type {StructuralMetadata}
     * @ignore
     */
    this.structuralMetadata = undefined;

    /**
     * The model's up axis.
     *
     * @type {Axis}
     * @ignore
     */
    this.upAxis = undefined;

    /**
     * The model's forward axis.
     *
     * @type {Axis}
     * @ignore
     */
    this.forwardAxis = undefined;

    /**
     * A world-space transform to apply to the primitives.
     *
     * @type {Matrix4}
     * @ignore
     */
    this.transform = Matrix4.clone(Matrix4.IDENTITY);

    /**
     * A mapping from extension names like `"EXT_example_extension"` to
     * the object that was created from the extension input
     *
     * @type {object}
     * @ignore
     */
    this.extensions = {};
  }
}

/**
 * Information about a GPU texture, including the texture itself
 *
 * @ignore
 */
export class TextureReader {
  constructor() {
    /**
     * The underlying GPU texture. The {@link Texture} contains the sampler.
     *
     * @type {Texture}
     * @ignore
     */
    this.texture = undefined;

    /**
     * The index of the texture in the glTF. This is useful for determining
     * when textures are shared to avoid attaching a texture in multiple uniform
     * slots in the shader.
     *
     * @type {number}
     * @ignore
     */
    this.index = undefined;

    /**
     * The texture coordinate set.
     *
     * @type {number}
     * @default 0
     * @ignore
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
     * Scale to apply to texture values.
     *
     * @type {number}
     * @default 1.0
     * @ignore
     */
    this.scale = 1.0;

    /**
     * The texture channels to read from. When undefined all channels are read.
     *
     * @type {string}
     */
    this.channels = undefined;

    /**
     * Constant level-of-detail parameters from the EXT_textureInfo_constant_lod extension.
     *
     * @type {object|undefined}
     * @private
     */
    this.constantLod = undefined;
  }
}

/**
 * Material properties for the PBR metallic roughness shading model.
 *
 * @ignore
 */
export class MetallicRoughness {
  /**
   * @ignore
   */
  static DEFAULT_BASE_COLOR_FACTOR = Cartesian4.ONE;

  /**
   * @ignore
   */
  static DEFAULT_METALLIC_FACTOR = 1.0;

  /**
   * @ignore
   */
  static DEFAULT_ROUGHNESS_FACTOR = 1.0;

  constructor() {
    /**
     * The base color texture reader.
     *
     * @type {TextureReader}
     * @ignore
     */
    this.baseColorTexture = undefined;

    /**
     * The metallic roughness texture reader.
     *
     * @type {TextureReader}
     * @ignore
     */
    this.metallicRoughnessTexture = undefined;

    /**
     * The base color factor.
     *
     * @type {Cartesian4}
     * @default new Cartesian4(1.0, 1.0, 1.0, 1.0)
     * @ignore
     */
    this.baseColorFactor = Cartesian4.clone(
      MetallicRoughness.DEFAULT_BASE_COLOR_FACTOR,
    );

    /**
     * The metallic factor.
     *
     * @type {number}
     * @default 1.0
     * @ignore
     */
    this.metallicFactor = MetallicRoughness.DEFAULT_METALLIC_FACTOR;

    /**
     * The roughness factor.
     *
     * @type {number}
     * @default 1.0
     * @ignore
     */
    this.roughnessFactor = MetallicRoughness.DEFAULT_ROUGHNESS_FACTOR;
  }
}

/**
 * Material properties for the PBR specular glossiness shading model.
 *
 * @ignore
 */
export class SpecularGlossiness {
  /**
   * @ignore
   */
  static DEFAULT_DIFFUSE_FACTOR = Cartesian4.ONE;

  /**
   * @ignore
   */
  static DEFAULT_SPECULAR_FACTOR = Cartesian3.ONE;

  /**
   * @ignore
   */
  static DEFAULT_GLOSSINESS_FACTOR = 1.0;

  constructor() {
    /**
     * The diffuse texture reader.
     *
     * @type {TextureReader}
     * @ignore
     */
    this.diffuseTexture = undefined;

    /**
     * The specular glossiness texture reader.
     *
     * @type {TextureReader}
     * @ignore
     */
    this.specularGlossinessTexture = undefined;

    /**
     * The diffuse factor.
     *
     * @type {Cartesian4}
     * @default new Cartesian4(1.0, 1.0, 1.0, 1.0)
     * @ignore
     */
    this.diffuseFactor = Cartesian4.clone(
      SpecularGlossiness.DEFAULT_DIFFUSE_FACTOR,
    );

    /**
     * The specular factor.
     *
     * @type {Cartesian3}
     * @default new Cartesian3(1.0, 1.0, 1.0)
     * @ignore
     */
    this.specularFactor = Cartesian3.clone(
      SpecularGlossiness.DEFAULT_SPECULAR_FACTOR,
    );

    /**
     * The glossiness factor.
     *
     * @type {number}
     * @default 1.0
     * @ignore
     */
    this.glossinessFactor = SpecularGlossiness.DEFAULT_GLOSSINESS_FACTOR;
  }
}

export class Specular {
  /**
   * @ignore
   */
  static DEFAULT_SPECULAR_FACTOR = 1.0;

  /**
   * @ignore
   */
  static DEFAULT_SPECULAR_COLOR_FACTOR = Cartesian3.ONE;

  constructor() {
    /**
     * The specular factor.
     *
     * @type {number}
     * @default 1.0
     * @ignore
     */
    this.specularFactor = Specular.DEFAULT_SPECULAR_FACTOR;

    /**
     * The specular texture reader.
     *
     * @type {TextureReader}
     * @ignore
     */
    this.specularTexture = undefined;

    /**
     * The specular color factor.
     *
     * @type {Cartesian3}
     * @default new Cartesian3(1.0, 1.0, 1.0)
     * @ignore
     */
    this.specularColorFactor = Cartesian3.clone(
      Specular.DEFAULT_SPECULAR_COLOR_FACTOR,
    );

    /**
     * The specular color texture reader.
     *
     * @type {TextureReader}
     * @ignore
     */
    this.specularColorTexture = undefined;
  }
}

export class Anisotropy {
  /**
   * @ignore
   */
  static DEFAULT_ANISOTROPY_STRENGTH = 0.0;

  /**
   * @ignore
   */
  static DEFAULT_ANISOTROPY_ROTATION = 0.0;

  constructor() {
    /**
     * The anisotropy strength.
     *
     * @type {number}
     * @default 0.0
     * @ignore
     */
    this.anisotropyStrength = Anisotropy.DEFAULT_ANISOTROPY_STRENGTH;

    /**
     * The rotation of the anisotropy in tangent, bitangent space,
     * measured in radians counter-clockwise from the tangent.
     *
     * @type {number}
     * @default 0.0
     * @ignore
     */
    this.anisotropyRotation = Anisotropy.DEFAULT_ANISOTROPY_ROTATION;

    /**
     * The anisotropy texture reader.
     *
     * @type {TextureReader}
     * @ignore
     */
    this.anisotropyTexture = undefined;
  }
}

export class Clearcoat {
  /**
   * @ignore
   */
  static DEFAULT_CLEARCOAT_FACTOR = 0.0;

  /**
   * @ignore
   */
  static DEFAULT_CLEARCOAT_ROUGHNESS_FACTOR = 0.0;

  constructor() {
    /**
     * The clearcoat layer intensity.
     *
     * @type {number}
     * @default 0.0
     * @ignore
     */
    this.clearcoatFactor = Clearcoat.DEFAULT_CLEARCOAT_FACTOR;

    /**
     * The clearcoat layer intensity texture reader.
     *
     * @type {TextureReader}
     * @ignore
     */
    this.clearcoatTexture = undefined;

    /**
     * The clearcoat layer roughness.
     *
     * @type {number}
     * @default 0.0
     * @ignore
     */
    this.clearcoatRoughnessFactor =
      Clearcoat.DEFAULT_CLEARCOAT_ROUGHNESS_FACTOR;

    /**
     * The clearcoat layer roughness texture.
     *
     * @type {TextureReader}
     * @ignore
     */
    this.clearcoatRoughnessTexture = undefined;

    /**
     * The clearcoat normal map texture.
     *
     * @type {TextureReader}
     * @ignore
     */
    this.clearcoatNormalTexture = undefined;
  }
}

/**
 * Material properties for the BENTLEY_materials_line_style extension.
 *
 * @alias ModelComponents.LineStyle
 * @constructor
 *
 * @private
 */
export class LineStyle {
  /**
   * The line width in pixels for LINES primitives.
   *
   * @type {number|undefined}
   * @default undefined
   */
  width = undefined;

  /**
   * The line dash pattern for LINES primitives. Encoded as a 16-bit unsigned
   * integer where each bit represents a pixel (1=on, 0=off).
   *
   * @type {number|undefined}
   * @default undefined
   */
  pattern = undefined;
}

/**
 * The material appearance of a primitive.
 *
 * @ignore
 */
export class Material {
  /**
   * @ignore
   */
  static DEFAULT_EMISSIVE_FACTOR = Cartesian3.ZERO;

  constructor() {
    /**
     * Material properties for the PBR metallic roughness shading model.
     *
     * @type {MetallicRoughness}
     * @ignore
     */
    this.metallicRoughness = new MetallicRoughness();

    /**
     * Material properties for the PBR specular glossiness shading model.
     *
     * @type {SpecularGlossiness}
     * @ignore
     */
    this.specularGlossiness = undefined;

    /**
     * Material properties for the PBR specular shading model.
     *
     * @type {Specular}
     * @ignore
     */
    this.specular = undefined;

    /**
     * Material properties for the PBR anisotropy shading model.
     *
     * @type {Anisotropy}
     * @ignore
     */
    this.anisotropy = undefined;

    /**
     * Material properties for the PBR clearcoat shading model.
     *
     * @type {Clearcoat}
     * @ignore
     */
    this.clearcoat = undefined;

    /**
     * The emissive texture reader.
     *
     * @type {TextureReader}
     * @ignore
     */
    this.emissiveTexture = undefined;

    /**
     * The normal texture reader.
     *
     * @type {TextureReader}
     * @ignore
     */
    this.normalTexture = undefined;

    /**
     * The occlusion texture reader.
     *
     * @type {TextureReader}
     * @ignore
     */
    this.occlusionTexture = undefined;

    /**
     * The emissive factor.
     *
     * @type {Cartesian3}
     * @default Cartesian3.ZERO
     * @ignore
     */
    this.emissiveFactor = Cartesian3.clone(Material.DEFAULT_EMISSIVE_FACTOR);

    /**
     * The alpha mode.
     *
     * @type {AlphaMode}
     * @default AlphaMode.OPAQUE
     * @ignore
     */
    this.alphaMode = AlphaMode.OPAQUE;

    /**
     * The alpha cutoff value of the material for the MASK alpha mode.
     *
     * @type {number}
     * @default 0.5
     * @ignore
     */
    this.alphaCutoff = 0.5;

    /**
     * Specifies whether the material is double sided.
     *
     * @type {boolean}
     * @default false
     * @ignore
     */
    this.doubleSided = false;

    /**
     * Specifies whether the material is unlit.
     *
     * @type {boolean}
     * @default false
     * @ignore
     */
    this.unlit = false;

    /**
     * The point diameter in pixels for POINTS primitives. This is set by the
     * BENTLEY_materials_point_style extension.
     *
     * @type {number|undefined}
     * @default undefined
     * @ignore
     */
    this.pointDiameter = undefined;

    /**
     * Material properties for the BENTLEY_materials_line_style extension.
     *
     * @type {LineStyle}
     * @ignore
     */
    this.lineStyle = undefined;
  }
}

/**
 * Vector data in the model, as defined by the CESIUM_mesh_vector extension.
 *
 * @ignore
 */
export class Vector {
  /** @type {true} */
  vector = true;

  /** @type {number} */
  count = 0;

  /** @type {TypedArray} */
  polygonAttributeOffsets = undefined;

  /** @type {TypedArray} */
  polygonHoleCounts = undefined;

  /** @type {TypedArray} */
  polygonHoleOffsets = undefined;

  /** @type {TypedArray} */
  polygonIndicesOffsets = undefined;
}

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
ModelComponents.ArticulationStage = ArticulationStage;
ModelComponents.Articulation = Articulation;
ModelComponents.Asset = Asset;
ModelComponents.Components = Components;
ModelComponents.TextureReader = TextureReader;
ModelComponents.MetallicRoughness = MetallicRoughness;
ModelComponents.SpecularGlossiness = SpecularGlossiness;
ModelComponents.Specular = Specular;
ModelComponents.Anisotropy = Anisotropy;
ModelComponents.Clearcoat = Clearcoat;
ModelComponents.LineStyle = LineStyle;
ModelComponents.Material = Material;
ModelComponents.Vector = Vector;

export default ModelComponents;
