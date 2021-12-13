import Check from "../../Core/Check.js";
import clone from "../../Core/clone.js";
import defined from "../../Core/defined.js";
import BlendingState from "../BlendingState.js";
import DepthFunction from "../DepthFunction.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";
import ModelLightingOptions from "./ModelLightingOptions.js";

/**
 * Each node may have many mesh primitives. Most model pipeline stages operate
 * at the primitive level. Again, properties are inherited from the parent.
 *
 * @param {NodeRenderResources} nodeRenderResources The node resources to inherit from
 * @param {ModelExperimentalPrimitive} runtimePrimitive The primitive.
 *
 * @private
 */
export default function PrimitiveRenderResources(
  nodeRenderResources,
  runtimePrimitive
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("nodeRenderResources", nodeRenderResources);
  Check.typeOf.object("runtimePrimitive", runtimePrimitive);
  //>>includeEnd('debug');

  // Properties inherited from NodeRenderResources.
  /**
   * A reference to the model. Inherited from the node render resources.
   *
   * @type {ModelExperimental}
   * @readonly
   *
   * @private
   */
  this.model = nodeRenderResources.model;
  /**
   * A reference to the runtime node. Inherited from the node render resources.
   *
   * @type {ModelExperimentalNode}
   * @readonly
   *
   * @private
   */
  this.runtimeNode = nodeRenderResources.runtimeNode;
  /**
   * The vertex attributes. This is shallow cloned from the node render
   * resources as the primitive will add additional properties.
   *
   * @type {Object[]}
   *
   * @private
   */
  this.attributes = nodeRenderResources.attributes.slice();

  /**
   * The index to give to the next vertex attribute added to the attributes array. POSITION
   * takes index 0. Inherited from the node render resources.
   *
   * @type {Number}
   * @readonly
   *
   * @private
   */
  this.attributeIndex = nodeRenderResources.attributeIndex;

  /**
   * The set index to assign to feature ID vertex attribute(s) created from the offset/repeat in the feature ID attribute.
   * Inherited from the node render resources.
   *
   * @type {Number}
   *
   * @private
   */
  this.featureIdVertexAttributeSetIndex =
    nodeRenderResources.featureIdVertexAttributeSetIndex;

  /**
   * Whether or not this primitive has feature IDs (at the node's instance or through primitive's feature ID attribute or texture).
   *
   * @type {Boolean}
   * @default false
   * @readonly
   *
   * @private
   */
  this.hasFeatureIds = false;

  /**
   * A dictionary mapping uniform name to functions that return the uniform
   * values. Inherited from the node render resources.
   *
   * @type {Object.<String, Function>}
   * @readonly
   *
   * @private
   */
  this.uniformMap = clone(nodeRenderResources.uniformMap);

  /**
   * Options for configuring the alpha stage such as pass and alpha mode. Inherited from the node
   * render resources.
   *
   * @type {ModelAlphaOptions}
   * @readonly
   *
   * @private
   */
  this.alphaOptions = clone(nodeRenderResources.alphaOptions);

  /**
   * The computed model matrix for this primitive. This is cloned from the
   * node render resources as the primitive may further modify it
   *
   * @type {Matrix4}
   *
   * @private
   */

  this.modelMatrix = nodeRenderResources.modelMatrix.clone();
  /**
   * An object used to build a shader incrementally. This is cloned from the
   * node render resources because each primitive can compute a different shader.
   *
   * @type {ShaderBuilder}
   * @readonly
   *
   * @private
   */
  this.shaderBuilder = nodeRenderResources.shaderBuilder.clone();

  /**
   * The number of instances. Default is 0, if instancing is not used. Inherited from the node render resources.
   *
   * @type {Number}
   * @readonly
   *
   * @private
   */
  this.instanceCount = nodeRenderResources.instanceCount;

  /**
   * A reference to the runtime node
   *
   * @type {ModelExperimentalPrimitive}
   * @readonly
   *
   * @private
   */
  this.runtimePrimitive = runtimePrimitive;

  /**
   * The primitive associated with the render resources.
   *
   * @type {ModelComponents.Primitive}
   * @readonly
   *
   * @private
   */
  var primitive = runtimePrimitive.primitive;

  // other properties
  /**
   * The number of indices in the primitive. The interpretation of this
   * depends on the primitive type.
   *
   * @type {Number}
   * @readonly
   *
   * @private
   */
  this.count = defined(primitive.indices)
    ? primitive.indices.count
    : ModelExperimentalUtility.getAttributeBySemantic(primitive, "POSITION")
        .count;
  /**
   * The indices for this primitive
   *
   * @type {ModelComponents.Indices}
   * @readonly
   *
   * @private
   */
  this.indices = primitive.indices;
  /**
   * The primitive type such as TRIANGLES or POINTS
   *
   * @type {PrimitiveType}
   * @readonly
   *
   * @private
   */
  this.primitiveType = primitive.primitiveType;
  /**
   * The bounding sphere that contains all the vertices in this primitive.
   *
   * @type {BoundingSphere}
   */
  this.boundingSphere = ModelExperimentalUtility.createBoundingSphere(
    primitive,
    this.modelMatrix,
    nodeRenderResources.instancingTranslationMax,
    nodeRenderResources.instancingTranslationMin
  );

  /**
   * Options for configuring the lighting stage such as selecting between
   * unlit and PBR shading.
   *
   * @type {ModelLightingOptions}
   * @readonly
   *
   * @private
   */
  this.lightingOptions = new ModelLightingOptions();

  /**
   * The shader variable to use for picking.
   *
   * @type {String}
   * @readonly
   *
   * @private
   */
  this.pickId = undefined;

  /**
   * An object storing options for creating a {@link RenderState}.
   * the pipeline stages simply set the options, the render state is created
   * when the {@link DrawCommand} is constructed.
   *
   * @type {Object}
   * @readonly
   *
   * @private
   */
  this.renderStateOptions = {
    depthTest: {
      enabled: true,
      func: DepthFunction.LESS_OR_EQUAL,
    },
    blending: BlendingState.DISABLED,
  };

  /**
   * An enum describing the types of draw commands needed, based on the style.
   *
   * @type {StyleCommandsNeeded}
   * @readonly
   *
   * @private
   */
  this.styleCommandsNeeded = undefined;
}
