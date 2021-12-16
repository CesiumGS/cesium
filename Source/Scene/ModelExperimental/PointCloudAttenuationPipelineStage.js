import Cartesian3 from "../../Core/Cartesian3.js";
import OrthographicFrustum from "../../Core/OrthographicFrustum.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import PointCloudAttenuationStageVS from "../../Shaders/ModelExperimental/PointCloudAttenuationStageVS.js";
import SceneMode from "../SceneMode.js";

var PointCloudAttenuationPipelineStage = {};
PointCloudAttenuationPipelineStage.name = "PointCloudAttenuationPipelineStage"; // Helps with debugging

var scratchAttenuationUniform = new Cartesian3();

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

  // TODO: what if it comes from the tileset?
  var pointCloudShading = renderResources.model.pointCloudShading;

  shaderBuilder.addUniform(
    "vec3",
    "model_pointCloudAttenuation",
    ShaderDestination.VERTEX
  );
  renderResources.uniformMap.model_pointCloudAttenuation = function () {
    var scratch = scratchAttenuationUniform;

    scratch.x = pointCloudShading.attenuation
      ? pointCloudShading.maximumAttenuation
      : 1.0;
    scratch.x *= frameState.pixelRatio;

    if (pointCloudShading.attenuation) {
      var context;
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

      // TODO: where to get the gE from? especially when not a part of a
      // tileset?
      var geometricError = 0;
      scratch.y = geometricError * pointCloudShading.geometricErrorScale;
      scratch.z = depthMultiplier;
    }

    return scratch;
  };
};
