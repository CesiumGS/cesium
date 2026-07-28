import Cartesian2 from "../../Core/Cartesian2.js";
import combine from "../../Core/combine.js";
import CesiumMath from "../../Core/Math.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import VectorCommon from "../../Shaders/VectorCommon.js";
import ModelVectorLookupStageVS from "../../Shaders/Model/ModelVectorLookupStageVS.js";
import ModelVectorLookupStageFS from "../../Shaders/Model/ModelVectorLookupStageFS.js";

/**
 * The model vector lookup stage drapes clamped vector data, baked into
 * per-content lookup textures by the scene's VectorProvider, onto the model's
 * surface.
 *
 * @namespace ModelVectorLookupPipelineStage
 *
 * @private
 */
const ModelVectorLookupPipelineStage = {
  name: "ModelVectorLookupPipelineStage", // Helps with debugging
};

const scratchCameraUv = new Cartesian2();

/**
 * Processes a model with baked vector lookup data. This modifies the
 * following parts of the render resources:
 *
 * <ul>
 *  <li>adds the HAS_VECTOR_LOOKUP define to both shaders</li>
 *  <li>adds a vertex shader function computing the vertex's UV within the baked rectangle</li>
 *  <li>adds the shared vector lookup functions and a compositing function to the fragment shader</li>
 *  <li>adds the uniforms for the baked rectangle and the lookup textures</li>
 * </ul>
 *
 * @param {ModelRenderResources} renderResources The render resources for this model.
 * @param {Model} model The model.
 * @param {FrameState} frameState The frameState.
 *
 * @private
 */
ModelVectorLookupPipelineStage.process = function (
  renderResources,
  model,
  frameState,
) {
  const shaderBuilder = renderResources.shaderBuilder;

  shaderBuilder.addDefine(
    "HAS_VECTOR_LOOKUP",
    undefined,
    ShaderDestination.BOTH,
  );

  shaderBuilder.addUniform(
    "vec2",
    "u_vectorCameraUv",
    ShaderDestination.VERTEX,
  );
  shaderBuilder.addUniform(
    "vec2",
    "u_vectorRectangleInverseSize",
    ShaderDestination.VERTEX,
  );

  shaderBuilder.addVarying("vec2", "v_vectorUv");
  shaderBuilder.addVertexLines(ModelVectorLookupStageVS);
  // VectorCommon declares the lookup texture uniforms and sampling functions
  // shared with the terrain path.
  shaderBuilder.addFragmentLines(VectorCommon);
  shaderBuilder.addFragmentLines(ModelVectorLookupStageFS);

  const rectangle = model._vectorData.rectangle;
  const rectangleInverseSize = new Cartesian2(
    1.0 / rectangle.width,
    1.0 / rectangle.height,
  );

  const halfWidth = rectangle.width * 0.5;
  const centerLongitude = rectangle.west + halfWidth;

  const defaultTexture = function () {
    return frameState.context.defaultTexture;
  };

  const uniformMap = {
    // The UV coordinates of the camera within the baked rectangle.
    u_vectorCameraUv: function () {
      const carto = frameState.camera.positionCartographic;

      const longitudeOffset =
        CesiumMath.negativePiToPi(carto.longitude - centerLongitude) +
        halfWidth;
      return Cartesian2.fromElements(
        longitudeOffset * rectangleInverseSize.x,
        (carto.latitude - rectangle.south) * rectangleInverseSize.y,
        scratchCameraUv,
      );
    },
    u_vectorRectangleInverseSize: function () {
      return rectangleInverseSize;
    },
    u_vectorSegmentTexture: function () {
      return model._vectorData?.segmentTexture ?? defaultTexture();
    },
    u_vectorWidthTexture: function () {
      return model._vectorData?.widthTexture ?? defaultTexture();
    },
    u_vectorColorTexture: function () {
      return model._vectorData?.colorTexture ?? defaultTexture();
    },
    u_vectorSegmentPrimitiveIndicesTexture: function () {
      return (
        model._vectorData?.segmentPrimitiveIndicesTexture ?? defaultTexture()
      );
    },
    u_vectorGridCellIndicesTexture: function () {
      return model._vectorData?.gridCellIndicesTexture ?? defaultTexture();
    },
    u_vectorPolygonEdgeTexture: function () {
      return model._vectorData?.polygonEdgeTexture ?? defaultTexture();
    },
    u_vectorPolygonEdgePrimitiveIndicesTexture: function () {
      return (
        model._vectorData?.polygonEdgePrimitiveIndicesTexture ??
        defaultTexture()
      );
    },
    u_vectorPolygonGridCellIndicesTexture: function () {
      return (
        model._vectorData?.polygonGridCellIndicesTexture ?? defaultTexture()
      );
    },
  };

  renderResources.uniformMap = combine(uniformMap, renderResources.uniformMap);
};

export default ModelVectorLookupPipelineStage;
