import Cartesian3 from "../../Core/Cartesian3.js";
import CesiumMath from "../../Core/Math.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import FogStageFS from "../../Shaders/Model/FogStageFS.js";

/**
 * The fog color pipeline stage is responsible for applying fog to tiles in the distance in horizon views.
 *
 * @namespace FogColorPipelineStage
 *
 * @private
 */
const FogPipelineStage = {
  name: "FogPipelineStage", // Helps with debugging
};

FogPipelineStage.process = function (renderResources, model, frameState) {
  const shaderBuilder = renderResources.shaderBuilder;

  shaderBuilder.addDefine("HAS_FOG", undefined, ShaderDestination.FRAGMENT);
  shaderBuilder.addFragmentLines([FogStageFS]);

  // Add a uniform so fog is only calculated when the effect would
  // be non-negligible For example when the camera is in space, fog density decreases
  // to 0 so fog shouldn't be rendered. Since this state may change rapidly if
  // the camera is moving, this is implemented as a uniform, not a define.
  shaderBuilder.addUniform("bool", "u_isInFog", ShaderDestination.FRAGMENT);
  renderResources.uniformMap.u_isInFog = function () {
    // We only need a rough measure of distance to the model, so measure
    // from the camera to the bounding sphere center.
    const distance = Cartesian3.distance(
      frameState.camera.position,
      model.boundingSphere.center
    );

    return (
      CesiumMath.fog(distance, frameState.fog.density) > CesiumMath.EPSILON3
    );
  };
};

export default FogPipelineStage;
