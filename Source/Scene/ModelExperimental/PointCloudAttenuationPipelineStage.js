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
const PointCloudAttenuationPipelineStage = {};
PointCloudAttenuationPipelineStage.name = "PointCloudAttenuationPipelineStage"; // Helps with debugging

const scratchAttenuationUniform = new Cartesian3();

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
  const shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addVertexLines([PointCloudAttenuationStageVS]);
  shaderBuilder.addDefine(
    "USE_POINT_CLOUD_ATTENUATION",
    undefined,
    ShaderDestination.VERTEX
  );

  const model = renderResources.model;
  const pointCloudShading = model.pointCloudShading;

  let content;
  let is3DTiles;
  let usesAddRefinement;
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
    const scratch = scratchAttenuationUniform;

    // attenuation.x = pointSize
    let defaultPointSize = 1.0;
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
    const geometricError = getGeometricError(
      renderResources,
      primitive,
      pointCloudShading,
      content
    );
    scratch.y = geometricError * pointCloudShading.geometricErrorScale;

    const context = frameState.context;
    const frustum = frameState.camera.frustum;
    let depthMultiplier;

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

const scratchDimensions = new Cartesian3();
function getGeometricError(
  renderResources,
  primitive,
  pointCloudShading,
  content
) {
  if (defined(content)) {
    const geometricError = content.tile.geometricError;

    if (geometricError > 0) {
      return geometricError;
    }
  }

  if (defined(pointCloudShading.baseResolution)) {
    return pointCloudShading.baseResolution;
  }

  const positionAttribute = ModelExperimentalUtility.getAttributeBySemantic(
    primitive,
    VertexAttributeSemantic.POSITION
  );
  const pointsLength = positionAttribute.count;

  // Estimate the geometric error
  const nodeTransform = renderResources.runtimeNode.transform;
  let dimensions = Cartesian3.subtract(
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
  const volume = dimensions.x * dimensions.y * dimensions.z;
  const geometricErrorEstimate = CesiumMath.cbrt(volume / pointsLength);
  return geometricErrorEstimate;
}

export default PointCloudAttenuationPipelineStage;
