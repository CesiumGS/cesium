import Cartesian3 from "../../Core/Cartesian3.js";
import Cartesian4 from "../../Core/Cartesian4.js";
import CesiumMath from "../../Core/Math.js";
import Cesium3DTileRefine from "../Cesium3DTileRefine.js";
import clone from "../../Core/clone.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import Matrix4 from "../../Core/Matrix4.js";
import ModelType from "./ModelType.js";
import ModelUtility from "./ModelUtility.js";
import OrthographicFrustum from "../../Core/OrthographicFrustum.js";
import Pass from "../../Renderer/Pass.js";
import PointCloudStylingStageVS from "../../Shaders/Model/PointCloudStylingStageVS.js";
import RuntimeError from "../../Core/RuntimeError.js";
import SceneMode from "../SceneMode.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";

const scratchUniform = new Cartesian4();

/**
 * The point cloud styling stage is responsible for applying color,
 * size, and show styles to point clouds at runtime. It also handles
 * point cloud shading provided by either the model or the tileset that
 * owns it. Point cloud shading is only applied if no point size style
 * is provided.
 *
 * @namespace PointCloudStylingPipelineStage
 *
 * @private
 */
const PointCloudStylingPipelineStage = {
  name: "PointCloudStylingPipelineStage", // Helps with debugging
};

/**
 * Processes a primitive. If the model that owns it has a style, then
 * this stage modifies the following parts of the render resources:
 * <ul>
 *  <li>adds the styling functions to the vertex shaders</li>
 *  <li>adds a define to compute the position in world coordinates</li>
 *  <li>adds a varying to compute point cloud color</li>
 * </ul>
 *
 * If the model has point cloud shading, then this stage modifies the following
 * part of the render resources:
 * <ul>
 *  <li>adds vertex shader code to compute attenuation and update gl_PointSize</li>
 *  <li>updates the uniform map to pass in point cloud parameters</li>
 * </ul>
 *
 * @param {PrimitiveRenderResources} renderResources The render resources for this primitive.
 * @param {ModelComponents.Primitive} primitive The primitive.
 * @param {FrameState} frameState The frame state.
 *
 * @private
 */
PointCloudStylingPipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
  const shaderBuilder = renderResources.shaderBuilder;
  const model = renderResources.model;
  const style = model.style;

  // Point cloud styling will only be applied on the GPU if there is
  // no batch table. If a batch table exists, then:
  //  - the property attribute will not be defined
  //  - the model will be using a feature table

  const structuralMetadata = model.structuralMetadata;
  const propertyAttributes = defined(structuralMetadata)
    ? structuralMetadata.propertyAttributes
    : undefined;

  const hasFeatureTable =
    defined(model.featureTableId) &&
    model.featureTables[model.featureTableId].featuresLength > 0;

  const hasBatchTable = !defined(propertyAttributes) && hasFeatureTable;

  if (defined(style) && !hasBatchTable) {
    const variableSubstitutionMap = getVariableSubstitutionMap(
      propertyAttributes
    );
    const shaderFunctionInfo = getStyleShaderFunctionInfo(
      style,
      variableSubstitutionMap
    );
    addShaderFunctionsAndDefines(shaderBuilder, shaderFunctionInfo);

    const propertyNames = getPropertyNames(shaderFunctionInfo);

    const usesNormalSemantic = propertyNames.indexOf("normalMC") >= 0;
    const hasNormals = ModelUtility.getAttributeBySemantic(
      primitive,
      VertexAttributeSemantic.NORMAL
    );

    if (usesNormalSemantic && !hasNormals) {
      throw new RuntimeError(
        "Style references the NORMAL semantic but the point cloud does not have normals"
      );
    }

    shaderBuilder.addDefine(
      "COMPUTE_POSITION_WC_STYLE",
      undefined,
      ShaderDestination.VERTEX
    );

    // If the style is translucent, the alpha options must be adjusted.
    const styleTranslucent = shaderFunctionInfo.styleTranslucent;
    if (styleTranslucent) {
      renderResources.alphaOptions.pass = Pass.TRANSLUCENT;
    }
  }

  const pointCloudShading = model.pointCloudShading;
  if (pointCloudShading.attenuation) {
    shaderBuilder.addDefine(
      "HAS_POINT_CLOUD_ATTENUATION",
      undefined,
      ShaderDestination.VERTEX
    );
  }

  if (pointCloudShading.backFaceCulling) {
    shaderBuilder.addDefine(
      "HAS_POINT_CLOUD_BACK_FACE_CULLING",
      undefined,
      ShaderDestination.VERTEX
    );
  }

  let content;
  let is3DTiles;
  let usesAddRefinement;

  if (ModelType.is3DTiles(model.type)) {
    is3DTiles = true;
    content = model.content;
    usesAddRefinement = content.tile.refine === Cesium3DTileRefine.ADD;
  }

  shaderBuilder.addUniform(
    "vec4",
    "model_pointCloudParameters",
    ShaderDestination.VERTEX
  );

  shaderBuilder.addVertexLines(PointCloudStylingStageVS);

  const uniformMap = renderResources.uniformMap;
  uniformMap.model_pointCloudParameters = function () {
    const vec4 = scratchUniform;

    // Point size
    let defaultPointSize = 1.0;
    if (is3DTiles) {
      defaultPointSize = usesAddRefinement
        ? 5.0
        : content.tileset.maximumScreenSpaceError;
    }
    vec4.x = defaultValue(
      pointCloudShading.maximumAttenuation,
      defaultPointSize
    );
    vec4.x *= frameState.pixelRatio;

    // Geometric error
    const geometricError = getGeometricError(
      renderResources,
      primitive,
      pointCloudShading,
      content
    );
    vec4.y = geometricError * pointCloudShading.geometricErrorScale;

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

    // Depth multiplier
    vec4.z = depthMultiplier;

    // Time
    if (is3DTiles) {
      vec4.w = content.tileset.timeSinceLoad;
    }

    return vec4;
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

  const positionAttribute = ModelUtility.getAttributeBySemantic(
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

const scratchShaderFunctionInfo = {
  colorStyleFunction: undefined,
  showStyleFunction: undefined,
  pointSizeStyleFunction: undefined,
  styleTranslucent: false,
};

const builtinVariableSubstitutionMap = {
  POSITION: "attributes.positionMC",
  POSITION_ABSOLUTE: "v_positionWC",
  COLOR: "attributes.color_0",
  NORMAL: "attributes.normalMC",
};

function getVariableSubstitutionMap(propertyAttributes) {
  const variableSubstitutionMap = clone(builtinVariableSubstitutionMap);

  if (!defined(propertyAttributes)) {
    return variableSubstitutionMap;
  }

  for (let i = 0; i < propertyAttributes.length; i++) {
    const propertyAttribute = propertyAttributes[i];
    const properties = propertyAttribute.properties;
    for (const propertyId in properties) {
      // The property ID was already sanitized for GLSL by PntsLoader.
      if (properties.hasOwnProperty(propertyId)) {
        variableSubstitutionMap[propertyId] = `metadata.${propertyId}`;
      }
    }
  }

  return variableSubstitutionMap;
}
const parameterList =
  "ProcessedAttributes attributes, " +
  "Metadata metadata, " +
  "float tiles3d_tileset_time";

function getStyleShaderFunctionInfo(style, variableSubstitutionMap) {
  const info = scratchShaderFunctionInfo;
  const shaderState = {
    translucent: false,
  };

  info.colorStyleFunction = style.getColorShaderFunction(
    `getColorFromStyle(${parameterList})`,
    variableSubstitutionMap,
    shaderState
  );
  info.showStyleFunction = style.getShowShaderFunction(
    `getShowFromStyle(${parameterList})`,
    variableSubstitutionMap,
    shaderState
  );
  info.pointSizeStyleFunction = style.getPointSizeShaderFunction(
    `getPointSizeFromStyle(${parameterList})`,
    variableSubstitutionMap,
    shaderState
  );
  info.styleTranslucent =
    defined(info.colorStyleFunction) && shaderState.translucent;

  return info;
}

function addShaderFunctionsAndDefines(shaderBuilder, shaderFunctionInfo) {
  const colorStyleFunction = shaderFunctionInfo.colorStyleFunction;
  if (defined(colorStyleFunction)) {
    shaderBuilder.addDefine(
      "HAS_POINT_CLOUD_COLOR_STYLE",
      undefined,
      ShaderDestination.BOTH
    );
    shaderBuilder.addVertexLines(colorStyleFunction);

    // The point cloud may not necessarily have a color attribute.
    // Use a custom varying to account for this.
    shaderBuilder.addVarying("vec4", "v_pointCloudColor");
  }

  const showStyleFunction = shaderFunctionInfo.showStyleFunction;
  if (defined(showStyleFunction)) {
    shaderBuilder.addDefine(
      "HAS_POINT_CLOUD_SHOW_STYLE",
      undefined,
      ShaderDestination.VERTEX
    );
    shaderBuilder.addVertexLines(showStyleFunction);
  }

  const pointSizeStyleFunction = shaderFunctionInfo.pointSizeStyleFunction;
  if (defined(pointSizeStyleFunction)) {
    shaderBuilder.addDefine(
      "HAS_POINT_CLOUD_POINT_SIZE_STYLE",
      undefined,
      ShaderDestination.VERTEX
    );
    shaderBuilder.addVertexLines(pointSizeStyleFunction);
  }
}

/**
 * Gets all the built-in property names used by the given style
 * function.
 *
 * @param {Function} source The style function.
 * @param {string[]} propertyNames The array of property names to add to.
 *
 * @private
 */
function getBuiltinPropertyNames(source, propertyNames) {
  const regex = /attributes\.(\w+)/g;
  let matches = regex.exec(source);
  while (matches !== null) {
    const name = matches[1];
    // Add the property name if it isn't already in the array.
    if (propertyNames.indexOf(name) === -1) {
      propertyNames.push(name);
    }
    matches = regex.exec(source);
  }
}

function getPropertyNames(shaderFunctionInfo) {
  const colorStyleFunction = shaderFunctionInfo.colorStyleFunction;
  const showStyleFunction = shaderFunctionInfo.showStyleFunction;
  const pointSizeStyleFunction = shaderFunctionInfo.pointSizeStyleFunction;

  // Get the properties in use by the style.
  const builtinPropertyNames = [];

  if (defined(colorStyleFunction)) {
    getBuiltinPropertyNames(colorStyleFunction, builtinPropertyNames);
  }
  if (defined(showStyleFunction)) {
    getBuiltinPropertyNames(showStyleFunction, builtinPropertyNames);
  }
  if (defined(pointSizeStyleFunction)) {
    getBuiltinPropertyNames(pointSizeStyleFunction, builtinPropertyNames);
  }

  return builtinPropertyNames;
}

export default PointCloudStylingPipelineStage;
