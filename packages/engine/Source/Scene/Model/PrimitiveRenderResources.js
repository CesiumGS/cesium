import BoundingSphere from "../../Core/BoundingSphere.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Check from "../../Core/Check.js";
import clone from "../../Core/clone.js";
import defined from "../../Core/defined.js";
import ModelUtility from "./ModelUtility.js";
import ModelLightingOptions from "./ModelLightingOptions.js";
import Matrix4 from "../../Core/Matrix4.js";

/**
 * Each node may have many mesh primitives. Most model pipeline stages operate
 * at the primitive level. Again, properties are inherited from the parent.
 *
 * @param {NodeRenderResources} nodeRenderResources The node resources to inherit from
 * @param {ModelRuntimePrimitive} runtimePrimitive The primitive.
 *
 * @private
 */
function PrimitiveRenderResources(nodeRenderResources, runtimePrimitive) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("nodeRenderResources", nodeRenderResources);
  Check.typeOf.object("runtimePrimitive", runtimePrimitive);
  //>>includeEnd('debug');

  // Properties inherited from NodeRenderResources.
  /**
   * A reference to the model. Inherited from the node render resources.
   *
   * @type {Model}
   * @readonly
   *
   * @private
   */
  this.model = nodeRenderResources.model;

  /**
   * A reference to the runtime node. Inherited from the node render resources.
   *
   * @type {ModelRuntimeNode}
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
   * @readonly
   *
   * @private
   */
  this.attributes = nodeRenderResources.attributes.slice();

  /**
   * The index to give to the next vertex attribute added to the attributes
   * array. POSITION takes index 0. Inherited from the node render resources.
   *
   * @type {number}
   *
   * @private
   */
  this.attributeIndex = nodeRenderResources.attributeIndex;

  /**
   * The set index to assign to feature ID vertex attribute(s) created from the
   * offset/repeat in the feature ID attribute. Inherited from the node render
   * resources.
   *
   * @type {number}
   *
   * @private
   */
  this.featureIdVertexAttributeSetIndex =
    nodeRenderResources.featureIdVertexAttributeSetIndex;

  /**
   * A dictionary mapping uniform name to functions that return the uniform
   * values. Inherited from the node render resources.
   *
   * @type {Object<string, Function>}
   * @readonly
   *
   * @private
   */
  this.uniformMap = clone(nodeRenderResources.uniformMap);

  /**
   * Options for configuring the alpha stage such as pass and alpha cutoff.
   * Inherited from the node render resources.
   *
   * @type {ModelAlphaOptions}
   * @readonly
   *
   * @private
   */
  this.alphaOptions = clone(nodeRenderResources.alphaOptions);

  /**
   * An object storing options for creating a {@link RenderState}.
   * The pipeline stages simply set the options; the actual render state
   * is created when the {@link DrawCommand} is constructed. Inherited from
   * the node render resources.
   *
   * @type {object}
   * @readonly
   *
   * @private
   */
  this.renderStateOptions = clone(nodeRenderResources.renderStateOptions, true);

  /**
   * Whether the model has a silhouette. This value indicates what draw commands
   * are needed. Inherited from the node render resources.
   *
   * @type {boolean}
   * @readonly
   *
   * @private
   */
  this.hasSilhouette = nodeRenderResources.hasSilhouette;

  /**
   * Whether the model is part of a tileset that uses the skipLevelOfDetail
   * optimization. This value indicates what draw commands are needed.
   * Inherited from the node render resources.
   *
   * @type {boolean}
   * @readonly
   *
   * @private
   */
  this.hasSkipLevelOfDetail = nodeRenderResources.hasSkipLevelOfDetail;

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
   * The number of instances. Default is 0, if instancing is not used.
   * Inherited from the node render resources.
   *
   * @type {number}
   * @readonly
   *
   * @private
   */
  this.instanceCount = nodeRenderResources.instanceCount;

  // Other properties
  /**
   * A reference to the runtime primitive.
   *
   * @type {ModelRuntimePrimitive}
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
  const primitive = runtimePrimitive.primitive;

  /**
   * The number of indices in the primitive. The interpretation of this
   * depends on the primitive type.
   *
   * @type {number}
   * @readonly
   *
   * @private
   */
  this.count = defined(primitive.indices)
    ? primitive.indices.count
    : ModelUtility.getAttributeBySemantic(primitive, "POSITION").count;

  /**
   * Whether or not this primitive has a property table for storing metadata.
   * When present, picking and styling can use this. This value is set by
   * SelectedFeatureIdPipelineStage.
   *
   * @type {boolean}
   * @default false
   *
   * @private
   */
  this.hasPropertyTable = false;

  /**
   * The indices for this primitive.
   *
   * @type {ModelComponents.Indices}
   * @readonly
   *
   * @private
   */
  this.indices = primitive.indices;

  /**
   * Additional index buffer for wireframe mode (if enabled). This value is set
   * by WireframePipelineStage.
   *
   * @type {Buffer}
   * @readonly
   *
   * @private
   */
  this.wireframeIndexBuffer = undefined;

  /**
   * The primitive type such as TRIANGLES or POINTS.
   *
   * @type {PrimitiveType}
   * @readonly
   *
   * @private
   */
  this.primitiveType = primitive.primitiveType;

  // For computing the `positionMin` and `positionMax` properties,
  // the instancing translation (if present) has to be taken into
  // account.
  // The `positionMin` and `positionMax` are supposed to NOT take
  // the node transform into account.
  // So when the instancing translations are supposed to be applied
  // in world space (as indicated by instances.transformInWorldSpace),
  // then the instancing translations have to be multiplied with the
  // inverse of the node transform, to eventually yield the true
  // minimum/maximum after applying the node transform.

  let instancingTranslationMin = this.runtimeNode.instancingTranslationMin;
  let instancingTranslationMax = this.runtimeNode.instancingTranslationMax;

  //*/
  const instances = this.runtimeNode.node.instances;
  if (defined(instances)) {
    // TODO Is this check necessary?
    if (
      !defined(instancingTranslationMin) ||
      !defined(instancingTranslationMax)
    ) {
      console.log("Something wrong, they should be defined... I guess...");
    }
    if (instances.transformInWorldSpace) {
      const nodeTransform = this.runtimeNode.computedTransform;
      // TODO Use scratches here
      const inverseNodeTransform = Matrix4.inverse(
        nodeTransform,
        new Matrix4()
      );
      instancingTranslationMin = Matrix4.multiplyByPoint(
        inverseNodeTransform,
        instancingTranslationMin,
        new Cartesian3()
      );
      instancingTranslationMax = Matrix4.multiplyByPoint(
        inverseNodeTransform,
        instancingTranslationMax,
        new Cartesian3()
      );
    }
  }
  //*/
  const positionMinMax = ModelUtility.getPositionMinMax(
    primitive,
    instancingTranslationMin,
    instancingTranslationMax
  );

  /**
   * The minimum position value for this primitive.
   *
   * This does not take into account the transform of the node that this
   * primitive is attached to.
   *
   * But it does take into account any possible instancing transforms,
   * multiplied with the inverse of the node transform. So transforming
   * this position value with the node transform will yield the actual
   * minimum position, including the instancing transforms.
   *
   * @type {Cartesian3}
   * @readonly
   *
   * @private
   */
  this.positionMin = Cartesian3.clone(positionMinMax.min, new Cartesian3());

  /**
   * The maximum position value for this primitive.
   *
   * This does not take into account the transform of the node that this
   * primitive is attached to.
   *
   * But it does take into account any possible instancing transforms,
   * multiplied with the inverse of the node transform. So transforming
   * this position value with the node transform will yield the actual
   * maximum position, including the instancing transforms.
   *
   * @type {Cartesian3}
   * @readonly
   *
   * @private
   */
  this.positionMax = Cartesian3.clone(positionMinMax.max, new Cartesian3());

  /**
   * The bounding sphere that contains all the vertices in this primitive.
   *
   * @type {BoundingSphere}
   * @readonly
   *
   * @private
   */
  this.boundingSphere = BoundingSphere.fromCornerPoints(
    this.positionMin,
    this.positionMax,
    new BoundingSphere()
  );

  /**
   * Options for configuring the lighting stage, such as selecting between
   * unlit and PBR shading.
   *
   * @type {ModelLightingOptions}
   * @readonly
   *
   * @private
   */
  this.lightingOptions = new ModelLightingOptions();

  /**
   * The shader variable to use for picking. If picking is enabled, this value
   * is set by PickingPipelineStage.
   *
   * @type {string}
   *
   * @private
   */
  this.pickId = undefined;
}

export default PrimitiveRenderResources;
