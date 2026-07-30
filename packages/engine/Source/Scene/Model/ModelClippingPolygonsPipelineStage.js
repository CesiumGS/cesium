import combine from "../../Core/combine.js";
import ModelClippingPolygonsStageFS from "../../Shaders/Model/ModelClippingPolygonsStageFS.js";
import ModelClippingPolygonsStageVS from "../../Shaders/Model/ModelClippingPolygonsStageVS.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import VectorCommon from "../../Shaders/VectorCommon.js";
import Cartesian2 from "../../Core/Cartesian2.js";
import CesiumMath from "../../Core/Math.js";
import Rectangle from "../../Core/Rectangle.js";

/**
 * The model clipping planes stage is responsible for applying clipping planes to the model.
 *
 * @namespace ModelClippingPolygonsPipelineStage
 *
 * @private
 */
const ModelClippingPolygonsPipelineStage = {
  name: "ModelClippingPolygonsPipelineStage", // Helps with debugging
};

const scratchCameraUv = new Cartesian2();
const scratchRectangleInverseSize = new Cartesian2();
const defaultRectangle = Rectangle.MAX_VALUE;

/**
 * Process a model for polygon clipping. This modifies the following parts of the render resources:
 *
 * <ul>
 *  <li>adds a define to both the vertex and fragment shaders to indicate that the model has clipping polygons</li>
 *  <li>adds the defines to both the vertex and fragment shaders for parameters related to clipping polygons, such as the number of polygons</li>
 *  <li>adds a function to the vertex shader to determine lookup uvs</li>
 *  <li>adds a function to the fragment shader to discard clipped regions</li>
 *  <li>adds the uniforms to the vertex and fragment shaders for the clipping extents texture and clipping distance respectively</li>
 *  <li>adds a varying for lookup uvs in the clipping texture</li>
 *</ul>
 *
 * @param {ModelRenderResources} renderResources The render resources for this model.
 * @param {Model} model The model.
 * @param {FrameState} frameState The frameState.
 *
 * @private
 */
ModelClippingPolygonsPipelineStage.process = function (
  renderResources,
  model,
  frameState,
) {
  const clippingPolygons = model.clippingPolygons;
  const shaderBuilder = renderResources.shaderBuilder;

  shaderBuilder.addDefine(
    "ENABLE_CLIPPING_POLYGONS",
    undefined,
    ShaderDestination.BOTH,
  );

  if (clippingPolygons.inverse) {
    shaderBuilder.addDefine(
      "CLIPPING_INVERSE",
      undefined,
      ShaderDestination.FRAGMENT,
    );
  }

  shaderBuilder.addVarying("vec2", "v_clippingUv");

  shaderBuilder.addUniform(
    "vec2",
    "u_clippingCameraUv",
    ShaderDestination.VERTEX,
  );

  shaderBuilder.addUniform(
    "vec2",
    "u_clippingRectangleInverseSize",
    ShaderDestination.VERTEX,
  );

  shaderBuilder.addVertexLines(ModelClippingPolygonsStageVS);
  shaderBuilder.addFragmentLines(VectorCommon);
  shaderBuilder.addFragmentLines(ModelClippingPolygonsStageFS);

  const uniformMap = {
    // The UV coordinates of the camera within the model's clipping rectangle.
    u_clippingCameraUv: function () {
      const rectangle =
        model._clippingPolygonData?.rectangle ?? defaultRectangle;
      const halfWidth = rectangle.width * 0.5;
      const centerLongitude = rectangle.west + halfWidth;
      const carto = frameState.camera.positionCartographic;

      const longitudeOffset =
        CesiumMath.negativePiToPi(carto.longitude - centerLongitude) +
        halfWidth;
      return Cartesian2.fromElements(
        longitudeOffset / rectangle.width,
        (carto.latitude - rectangle.south) / rectangle.height,
        scratchCameraUv,
      );
    },
    u_clippingRectangleInverseSize: function () {
      const rectangle =
        model._clippingPolygonData?.rectangle ?? defaultRectangle;
      return Cartesian2.fromElements(
        1.0 / rectangle.width,
        1.0 / rectangle.height,
        scratchRectangleInverseSize,
      );
    },
    u_clippingEdgeTexture: function () {
      return (
        model._clippingPolygonData?.polygonEdgeTexture ??
        frameState.context.defaultTexture
      );
    },
    u_clippingEdgePrimitiveIndicesTexture: function () {
      return (
        model._clippingPolygonData?.polygonEdgePrimitiveIndicesTexture ??
        frameState.context.defaultTexture
      );
    },
    u_clippingGridCellIndicesTexture: function () {
      return (
        model._clippingPolygonData?.polygonGridCellIndicesTexture ??
        frameState.context.defaultTexture
      );
    },
  };

  renderResources.uniformMap = combine(uniformMap, renderResources.uniformMap);
};

export default ModelClippingPolygonsPipelineStage;
