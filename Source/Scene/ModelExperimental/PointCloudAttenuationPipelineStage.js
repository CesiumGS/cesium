import Cartesian3 from "../../Core/Cartesian3.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import OrthographicFrustum from "../../Core/OrthographicFrustum.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import PointCloudAttenuationStageVS from "../../Shaders/ModelExperimental/PointCloudAttenuationStageVS.js";
import SceneMode from "../SceneMode.js";
import ModelExperimentalType from "./ModelExperimentalType.js";

var PointCloudAttenuationPipelineStage = {};
PointCloudAttenuationPipelineStage.name = "PointCloudAttenuationPipelineStage"; // Helps with debugging

var scratchAttenuationUniform = new Cartesian3();

PointCloudAttenuationPipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
  // Attenuation only applies to point primitives
  if (primitive.primitiveType !== PrimitiveType.POINTS) {
    return;
  }

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
  var modelType = model.type;
  if (ModelExperimentalType.is3DTiles(modelType)) {
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

      var geometricError = getGeometricError(pointCloudShading, content);
      scratch.y = geometricError * pointCloudShading.geometricErrorScale;
      scratch.z = depthMultiplier;
    }

    return scratch;
  };
};

function getGeometricError(pointCloudShading, content) {
  // 1. get tile's geometric error (if content is defined)
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
