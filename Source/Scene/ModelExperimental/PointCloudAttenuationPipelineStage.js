import Cartesian3 from "../../Core/Cartesian3.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import OrthographicFrustum from "../../Core/OrthographicFrustum.js";

import ShaderDestination from "../../Renderer/ShaderDestination.js";
import PointCloudAttenuationStageVS from "../../Shaders/ModelExperimental/PointCloudAttenuationStageVS.js";
import SceneMode from "../SceneMode.js";
import ModelExperimentalType from "./ModelExperimentalType.js";

/**
 * Stage to handle point cloud attenuation.
 *
 * @namespace PointCloudAttenuationPipelineStage
 *
 * @private
 */
var PointCloudAttenuationPipelineStage = {};
PointCloudAttenuationPipelineStage.name = "PointCloudAttenuationPipelineStage"; // Helps with debugging

var scratchAttenuationUniform = new Cartesian3();

/**
 * This stage does the following:
 * <ul>
 *  <li>Add vertex shader code to compute attenuation and update gl_PointSize</li>
 *  <li>Updates the uniform map to pass in the point cloud attenuation parameters</li>
 * </ul>
 * @param {PrimitiveRenderResources} renderResources The render resources for this primitive
 * @param {ModelComponents.primitive} primitive The primitive
 * @param {FrameState} frameState The frame state
 *
 * @private
 */
PointCloudAttenuationPipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
  var shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addVertexLines([PointCloudAttenuationStageVS]);
  shaderBuilder.addDefine(
    "USE_POINT_CLOUD_ATTENUATION",
    undefined,
    ShaderDestination.VERTEX
  );

  var model = renderResources.model;
  var pointCloudShading;
  var content;
  if (ModelExperimentalType.is3DTiles(model.type)) {
    content = model.content;
    pointCloudShading = content.tileset.pointCloudShading;
  } else {
    pointCloudShading = model.pointCloudShading;
  }

  shaderBuilder.addUniform(
    "vec3",
    "model_pointCloudAttenuation",
    ShaderDestination.VERTEX
  );
  renderResources.uniformMap.model_pointCloudAttenuation = function () {
    var scratch = scratchAttenuationUniform;

    // attenuation.x = pointSize
    scratch.x = pointCloudShading.attenuation
      ? defaultValue(pointCloudShading.maximumAttenuation, 1.0)
      : 1.0;
    scratch.x *= frameState.pixelRatio;

    if (pointCloudShading.attenuation) {
      var context = frameState.context;
      var frustum = frameState.camera.frustum;
      var depthMultiplier;

      // Attenuation is maximumAttenuation in 2D/ortho
      if (
        frameState.mode === SceneMode.SCENE2D ||
        frustum instanceof OrthographicFrustum
      ) {
        depthMultiplier = Number.POSITIVE_INFINITY;
      } else {
        depthMultiplier =
          context.drawingBufferHeight /
          frameState.camera.frustum.sseDenominator;
      }

      // attenuation.y = geometricError
      var geometricError = getGeometricError(pointCloudShading, content);
      scratch.y = geometricError * pointCloudShading.geometricErrorScale;

      // attenuation.z = depth multiplier
      scratch.z = depthMultiplier;
    }

    return scratch;
  };
};

function getGeometricError(pointCloudShading, content) {
  if (defined(content)) {
    var geometricError = content._tile.geometricError;

    if (geometricError > 0) {
      return geometricError;
    }
  }

  if (defined(pointCloudShading) && defined(pointCloudShading.baseResolution)) {
    return pointCloudShading.baseResolution;
  }

  // TODO: Waiting on another PR which has updates to the model matrix.
  // estimate the geometric error. Originally it was done as
  // cbrt(boundingVolume.volume() / pointsLength)
  return 0.79;
}

export default PointCloudAttenuationPipelineStage;
