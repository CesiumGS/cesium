import combine from "../../Core/combine.js";
import defined from "../../Core/defined.js";
import ContextLimits from "../../Renderer/ContextLimits.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import FeaturePickingCommon from "../../Shaders/Model/FeaturePickingCommon.js";
import FeaturePickingVS from "../../Shaders/Model/FeaturePickingVS.js";
import FeaturePickingFS from "../../Shaders/Model/FeaturePickingFS.js";
import defaultValue from "../../Core/defaultValue.js";

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
  if (ContextLimits.maximumVertexTextureImageUnits > 0) {
    shaderBuilder.addDefine("VTF_SUPPORTED");
  }

  // TODO: don't hard-code the feature ID
  shaderBuilder.addDefine(
    "BATCH_ID_ATTRIBUTE",
    "a_featureId",
    ShaderDestination.VERTEX
  );

  // TODO: HANDLE_TRANSLUCENT (both shaders) is related to content's classification type
  // HAS_PREMULTIPLIED_ALPHA (frag only) is false so don't do anything.

  // If there are many features, the batch texture wraps onto multiple
  // rows.
  if (batchTable._batchTexture.textureDimensions.y > 1) {
    shaderBuilder.addDefine("MULTILINE_BATCH_TEXTURE");
  }

  shaderBuilder.addDefine("USE_FEATURE_PICKING");

  shaderBuilder.addVertexLines([FeaturePickingCommon, FeaturePickingVS]);
  shaderBuilder.addFragmentLines([FeaturePickingCommon, FeaturePickingFS]);

  var pickingUniforms = {
    model_pickTexture: function () {
      return batchTable._batchTexture.pickTexture;
    },
    model_batchTexture: function () {
      return defaultValue(
        // add the pick texture and batch texture
        batchTable._batchTexture.batchTexture,
        batchTable._batchTexture.defaultTexture
      );
    },
    model_textureDimensions: function () {
      return batchTable._batchTexture.textureDimensions;
    },
    model_textureStep: function () {
      return batchTable._batchTexture.textureStep;
    },
  };

  renderResources.uniformMap = combine(
    pickingUniforms,
    renderResources.uniformMap
  );
  renderResources.pickId = "texture2D(model_pickTexture, model_featureSt);";
}
