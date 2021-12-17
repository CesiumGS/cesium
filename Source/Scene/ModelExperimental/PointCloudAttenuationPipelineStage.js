import Cartesian3 from "../../Core/Cartesian3.js";
import defined from "../../Core/defined.js";
import OrthographicFrustum from "../../Core/OrthographicFrustum.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
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

  // If this is 3D Tiles, use the point cloud shading object
  if (defined(model.content)) {
    var tileset = model.content.tileset;
    pointCloudShading = tileset.pointCloudShading;
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
