import Check from "../../Core/Check.js";
import clone from "../../Core/clone.js";

/**
 * A model is made up of one or more nodes in the scene graph. Some details
 * such as instancing are computed on a per-node basis. This class provides
 * a place to store such details. It also inherits some properties from
 * the model render resources.
 *
 * @constructor
 *
 * @param {ModelRenderResources} modelRenderResources The model resources to inherit
 * @param {ModelExperimentalNode} runtimeNode The in-memory representation of the scene graph node.
 *
 * @private
 */
export default function NodeRenderResources(modelRenderResources, runtimeNode) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("modelRenderResources", modelRenderResources);
  Check.typeOf.object("runtimeNode", runtimeNode);
  //>>includeEnd('debug');

  // Properties inherited from the ModelRenderResources.
  /**
   * A reference to the model. Inherited from the model render resources.
   *
   * @type {ModelExperimental}
   * @readonly
   *
   * @private
   */
  this.model = modelRenderResources.model;
  /**
   * An object used to build a shader incrementally. This is cloned from the
   * model render resources because each node can compute a different shader.
   *
   * @type {ShaderBuilder}
   * @readonly
   *
   * @private
   */
  this.shaderBuilder = modelRenderResources.shaderBuilder.clone();

  /**
   * A dictionary mapping uniform name to functions that return the uniform
   * values. Inherited from the model render resources.
   *
   * @type {Object.<String, Function>}
   *
   * @readonly
   *
   * @private
   */
  this.uniformMap = clone(modelRenderResources.uniformMap);

  /**
   * Options for configuring the alpha stage such as pass and alpha mode. Inherited from the model
   * render resources.
   *
   * @type {ModelAlphaOptions}
   * @readonly
   *
   * @private
   */
  this.alphaOptions = clone(modelRenderResources.alphaOptions);

  // other properties
  /**
   * A reference to the runtime node
   *
   * @type {ModelExperimentalNode}
   * @readonly
   *
   * @private
   */
  this.runtimeNode = runtimeNode;
  /**
   * The computed model matrix for this node.
   *
   * @type {Matrix4}
   *
   * @private
   */
  this.modelMatrix = runtimeNode.transform;
  /**
   * An array of objects describing vertex attributes that will eventually
   * be used to create a {@link VertexArray} for the draw command. Attributes
   * at the node level may be needed for extensions such as EXT_mesh_gpu_instancing.
   *
   * @type {Object[]}
   * @readonly
   *
   * @private
   */
  this.attributes = [];

  /**
   * The index to give to the next vertex attribute added to the attributes array. POSITION
   * takes index 0.
   *
   * @type {Number}
   * @readonly
   *
   * @private
   */
  this.attributeIndex = 1;

  /**
   * The set index to assign to feature ID vertex attribute(s) created from the offset/repeat in the feature ID attribute.
   *
   * @type {Number}
   * @readonly
   *
   * @private
   */
  this.featureIdVertexAttributeSetIndex = 0;

  /**
   * The number of instances. Default is 0, if instancing is not used.
   *
   * @type {Number}
   * @readonly
   *
   * @private
   */
  this.instanceCount = 0;

  /**
   * The component-wise maximum value of the translations of the instances.
   *
   * @type {Cartesian3}
   * @readonly
   *
   * @private
   */
  this.instancingTranslationMax = undefined;

  /**
   * The component-wise minimum value of the translations of the instances.
   *
   * @type {Cartesian3}
   * @readonly
   *
   * @private
   */
  this.instancingTranslationMin = undefined;

  /**
   * An object storing options for creating a {@link RenderState}.
   * The pipeline stages simply set the options, the render state is created
   * when the {@link DrawCommand} is constructed.
   *
   * @type {Object}
   * @readonly
   *
   * @private
   */
  this.renderStateOptions = clone(modelRenderResources.renderStateOptions);
}
