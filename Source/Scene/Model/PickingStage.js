import combine from "../../Core/combine.js";
import defined from "../../Core/defined.js";

export default function PickingStage() {}

PickingStage.process = function (primitive, renderResources, frameState) {
  var model = renderResources.model;
  var context = frameState.context;

  var owner = model._pickObject;
  if (!defined(owner)) {
    owner = {
      primitive: model,
      // TODO: The Model ID needs to be set.
      id: model.id,
      node: renderResources.sceneNode,
      // TODO: Add Mesh
      mesh: undefined,
    };
  }

  var pickId = context.createPickId(owner);
  model._pickIds.push(pickId);
  var pickUniforms = {
    czm_pickColor: createPickColorFunction(pickId.color),
  };
  renderResources.uniformMap = combine(
    renderResources.uniformMap,
    pickUniforms
  );

  renderResources.shaderBuilder.addUniform("vec4", "czm_pickColor");
};

function createPickColorFunction(color) {
  return function () {
    return color;
  };
}
