import Cartesian3 from "../../Core/Cartesian3.js";
import CesiumMath from "../../Core/Math.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import Matrix4 from "../../Core/Matrix4.js";
import OrthographicFrustum from "../../Core/OrthographicFrustum.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import PointCloudAttenuationStageVS from "../../Shaders/ModelExperimental/PointCloudAttenuationStageVS.js";
import Cesium3DTileRefine from "../Cesium3DTileRefine.js";
import SceneMode from "../SceneMode.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import ModelExperimentalType from "./ModelExperimentalType.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";

/**
 * Stage to handle point cloud attenuation. This stage assumes that either
 * tileset.pointCloudShading.attenuation (3D Tiles) or
 * model.pointCloudShading.attenuation (individual model) is true
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
  var pointCloudShading = model.pointCloudShading;

  var content;
  var is3DTiles;
  var usesAddRefinement;
  if (ModelExperimentalType.is3DTiles(model.type)) {
    is3DTiles = true;
    content = model.content;
    usesAddRefinement = content.tile.refine === Cesium3DTileRefine.ADD;
  }

  shaderBuilder.addUniform(
    "vec3",
    "model_pointCloudAttenuation",
    ShaderDestination.VERTEX
  );
  renderResources.uniformMap.model_pointCloudAttenuation = function () {
    var scratch = scratchAttenuationUniform;

    // attenuation.x = pointSize
    var defaultPointSize = 1.0;
    if (is3DTiles) {
      defaultPointSize = usesAddRefinement
        ? 5.0
        : content.tileset.maximumScreenSpaceError;
    }
    scratch.x = defaultValue(
      pointCloudShading.maximumAttenuation,
      defaultPointSize
    );
    scratch.x *= frameState.pixelRatio;

    // attenuation.y = geometricError
    var geometricError = getGeometricError(
      renderResources,
      primitive,
      pointCloudShading,
      content
    );
    scratch.y = geometricError * pointCloudShading.geometricErrorScale;

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
        context.drawingBufferHeight / frameState.camera.frustum.sseDenominator;
    }

    // attenuation.z = depth multiplier
    scratch.z = depthMultiplier;

    return scratch;
  };
};

var scratchDimensions = new Cartesian3();
function getGeometricError(
  renderResources,
  primitive,
  pointCloudShading,
  content
) {
  if (defined(content)) {
    var geometricError = content.tile.geometricError;

    if (geometricError > 0) {
      return geometricError;
    }
  }

  if (defined(pointCloudShading.baseResolution)) {
    return pointCloudShading.baseResolution;
  }

  var positionAttribute = ModelExperimentalUtility.getAttributeBySemantic(
    primitive,
    VertexAttributeSemantic.POSITION
  );
  var pointsLength = positionAttribute.count;

  // Estimate the geometric error
  var nodeTransform = renderResources.runtimeNode.transform;
  var dimensions = Cartesian3.subtract(
    positionAttribute.max,
    positionAttribute.min,
    scratchDimensions
  );
  // dimensions is a vector, as it is a subtraction between two points
  dimensions = Matrix4.multiplyByPointAsVector(
    nodeTransform,
    dimensions,
    scratchDimensions
  );
  var volume = dimensions.x * dimensions.y * dimensions.z;
  var geometricErrorEstimate = CesiumMath.cbrt(volume / pointsLength);
  return geometricErrorEstimate;
}

export default PointCloudAttenuationPipelineStage;
