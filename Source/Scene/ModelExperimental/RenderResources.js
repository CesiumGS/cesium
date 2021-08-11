import Check from "../../Core/Check.js";
import defined from "../../Core/defined.js";
import ShaderBuilder from "../../Renderer/ShaderBuilder.js";
import DepthFunction from "../DepthFunction.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";
import ModelLightingOptions from "./ModelLightingOptions.js";

/**
 * Resources assigned at each level of a 3D model (model, node, mesh primitive)
 * that are required to generate {@link DrawCommand}s. These resources are passed
 * through the various model pipeline stages (see for example
 * {@link GeometryPipelineStage}) and updated in place. Finally,
 * {@link buildDrawCommand} is called to construct the draw command.
 *
 * @namespace RenderResources
 *
 * @private
 */
var RenderResources = {};

/**
 * Model render resources are for setting details that are consistent across
 * the entire model.
 *
 * @constructor
 * @param {ModelExperimental} model The model that will be rendered
 *
 * @private
 */
function ModelRenderResources(model) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("model", model);
  //>>includeEnd('debug');

  /**
   * An object used to build a shader incrementally. Each pipeline stage
   * may add lines of shader code to this object.
   *
   * @type {ShaderBuilder}
   * @readonly
   *
   * @private
   */
  this.shaderBuilder = new ShaderBuilder();
  /**
   * A reference to the model.
   *
   * @type {ModelExperimental}
   * @readonly
   *
   * @private
   */
  this.model = model;
}

/**
 * A model is made up of one or more nodes in the scene graph. Some details
 * such as instancing are computed on a per-node basis. This class provides
 * a place to store such details. It also inherits some properties from
 * the model render resources.
 *
 * @constructor
 *
 * @param {RenderResources.ModelRenderResources} modelRenderResources The model resources to inherit
 * @param {ModelExperimentalSceneNode} sceneNode The in-memory representation of the scene graph node.
 *
 * @private
 */
function NodeRenderResources(modelRenderResources, sceneNode) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("modelRenderResources", modelRenderResources);
  Check.typeOf.object("sceneNode", sceneNode);
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
   * A reference to the scene node
   *
   * @type {ModelExperimentalSceneNode}
   * @readonly
   *
   * @private
   */
  this.sceneNode = sceneNode;
  /**
   * The computed model matrix for this node.
   *
   * @type {Matrix4}
   *
   * @private
   */
  this.modelMatrix = sceneNode.modelMatrix;
  /**
   * An array of objects describing vertex attributes that will eventually
   * be used to create a {@link VertexArray} for the draw command.
   *
   * @type {Object[]}
   * @readonly
   *
   * @private
   */
  this.attributes = [];

  /**
   * The index to give to the next vertex attribute added to the attributes array. POSITION
   * takes the 0 index.
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
}

/**
 * Each node may have many mesh primitives. Most model pipeline stages operate
 * at the primitive level. Again, properties are inherited from the parent.
 *
 * @param {RenderResources.NodeRenderResources} nodeRenderResources The node resources to inherit from
 * @param {ModelExperimentalSceneMeshPrimitive} sceneMeshPrimitive The mesh primitive.
 *
 * @private
 */
function MeshPrimitiveRenderResources(nodeRenderResources, sceneMeshPrimitive) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("nodeRenderResources", nodeRenderResources);
  Check.typeOf.object("sceneMeshPrimitive", sceneMeshPrimitive);
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
   * A reference to the scene node. Inherited from the node render resources.
   *
   * @type {ModelExperimentalSceneNode}
   * @readonly
   *
   * @private
   */
  this.sceneNode = nodeRenderResources.sceneNode;
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
   * The index to give to the next vertex attribute added to the attributes array. POSITION
   * takes the 0 index. Inherited from the node render resources.
   *
   * @type {Number}
   * @readonly
   *
   * @private
   */
  this.attributeIndex = nodeRenderResources.attributeIndex;

  /**
   * The mesh primitive associated with the render resources.
   *
   * @type {ModelComponents.Primitive}
   * @readonly
   *
   * @private
   */
  var primitive = sceneMeshPrimitive.primitive;

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
   * A dictionary mapping uniform name to functions that return the uniform
   * values.
   *
   * @type {Object.<String, Function>}
   * @readonly
   *
   * @private
   */
  this.uniformMap = {};
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
   * True if back face culling is enabled
   *
   * @type {Boolean}
   * @readonly
   *
   * @private
   */
  this.cull = true;
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
  };
}

RenderResources.ModelRenderResources = ModelRenderResources;
RenderResources.NodeRenderResources = NodeRenderResources;
RenderResources.MeshPrimitiveRenderResources = MeshPrimitiveRenderResources;
export default RenderResources;
