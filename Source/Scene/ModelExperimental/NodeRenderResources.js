import Check from "../../Core/Check.js";

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
   * A reference to the model Inherited from the model render resources.
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
  this.modelMatrix = runtimeNode.modelMatrix;
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
   * The ID of the feature table to use for picking and styling.
   *
   * @type {String}
   * @readonly
   *
   * @private
   */
  this.featureTableId = undefined;
}
