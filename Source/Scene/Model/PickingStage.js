import combine from "../../Core/combine.js";
import defined from "../../Core/defined.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import FeaturePickingVS from "../../Shaders/Model/FeaturePickingVS.js";
import FeaturePickingFS from "../../Shaders/Model/FeaturePickingFS.js";

export default function PickingStage() {}

PickingStage.process = function (primitive, renderResources, frameState) {
  var model = renderResources.model;
  var context = frameState.context;

  if (!model._allowPicking) {
    return;
  }

  // TODO: is this done always or only when there's no batch table?
  var owner = model._pickObject;
  if (!defined(owner)) {
    owner = {
      primitive: model,
      // TODO: The Model ID needs to be set.
      id: model.id,
      node: renderResources.sceneNode,
      // TODO: Add Mesh
      mesh: undefined,
      gltfPrimitive: primitive._primitive,
    };
  }

  var pickId = context.createPickId(owner);
  model._pickIds.push(pickId);

  var shaderBuilder = renderResources.shaderBuilder;

  if (defined(model.batchTable)) {
    processBatchTable(renderResources, model.batchTable);
  } else {
    var pickUniforms = {
      czm_pickColor: createPickColorFunction(pickId.color),
    };
    renderResources.uniformMap = combine(
      renderResources.uniformMap,
      pickUniforms
    );
    shaderBuilder.addUniform("vec4", "czm_pickColor");
    renderResources.pickId = "czm_pickColor";
  }
};

function createPickColorFunction(color) {
  return function () {
    return color;
  };
}

function processBatchTable(renderResources, batchTable) {
  var shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addDefine("USE_FEATURE_PICKING");

  // TODO: HANDLE_TRANSLUCENT is related to content's classification type
  /*
  if (handleTranslucent) {
    shaderBuilder.addDefine("HANDLE_TRANSLUCENT");
    var isTranslucentDestination = (vertexTextureFetch) ? ShaderDestination.VERTEX : ShaderDestination.FRAGMENT;
    shaderBuilder.addUniform("bool", "model_isTranslucent", isTranslucentDestination);
  }
  */

  // HAS_PREMULTIPLIED_ALPHA (frag only) is false so don't do anything.

  shaderBuilder.addUniform(
    "sampler2D",
    "model_pickTexture",
    ShaderDestination.FRAGMENT
  );

  shaderBuilder.addVertexLines([FeaturePickingVS]);
  shaderBuilder.addFragmentLines([FeaturePickingFS]);

  var pickingUniforms = {
    model_pickTexture: function () {
      return batchTable._batchTexture.pickTexture;
    },
  };

  renderResources.uniformMap = combine(
    pickingUniforms,
    renderResources.uniformMap
  );
  renderResources.pickId = "texture2D(model_pickTexture, model_featureSt);";
}
