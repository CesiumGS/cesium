export default function CullingStage() {}

CullingStage.process = function (primitive, renderResources, frameState) {
  var doubleSided = primitive.material.doubleSided;
  var backFaceCullingEnabled = renderResources.backFaceCulling && !doubleSided;
  renderResources.renderStateOptions.cull = {
    enabled: backFaceCullingEnabled,
  };
};
