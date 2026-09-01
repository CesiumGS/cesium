// @ts-check

import Cartesian2 from "../../Core/Cartesian2.js";
import combine from "../../Core/combine.js";
import CesiumMath from "../../Core/Math.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import VectorCommon from "../../Shaders/VectorCommon.js";
import ModelVectorLookupStageVS from "../../Shaders/Model/ModelVectorLookupStageVS.js";
import ModelVectorLookupStageFS from "../../Shaders/Model/ModelVectorLookupStageFS.js";

/** @import FrameState from "../FrameState.js"; */
/** @import Model from "./Model.js"; */
/** @import ModelRenderResources from "./ModelRenderResources.js"; */

/**
 * The model vector lookup stage drapes vector data, baked into
 * per-content lookup textures by the scene's VectorProvider, onto the model's
 * surface.
 *
 * @namespace ModelVectorLookupPipelineStage
 *
 * @private
 */
const ModelVectorLookupPipelineStage = {
  name: "ModelVectorLookupPipelineStage", // Helps with debugging
  process: process,
};

const scratchCameraUv = new Cartesian2();
const scratchRectangleInverseSize = new Cartesian2();

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
function process(renderResources, model, frameState) {
  const shaderBuilder = renderResources.shaderBuilder;
  const vectorData = model._vectorData;
  const hasPolylines = vectorData.hasPolylines;
  const hasPolygons = vectorData.hasPolygons;

  shaderBuilder.addDefine(
    "HAS_VECTOR_LOOKUP",
    undefined,
    ShaderDestination.BOTH,
  );

  if (hasPolylines) {
    shaderBuilder.addDefine(
      "HAS_VECTOR_POLYLINES",
      undefined,
      ShaderDestination.FRAGMENT,
    );

    if (vectorData.hasMeterWidths) {
      shaderBuilder.addDefine(
        "VECTOR_WIDTH_IN_METERS",
        undefined,
        ShaderDestination.FRAGMENT,
      );
      if (vectorData.hasPixelWidths) {
        shaderBuilder.addDefine(
          "VECTOR_WIDTH_MIXED_UNITS",
          undefined,
          ShaderDestination.FRAGMENT,
        );
      }
      shaderBuilder.addUniform(
        "vec2",
        "u_vectorMetersPerUv",
        ShaderDestination.FRAGMENT,
      );
    }
  }

  if (hasPolygons) {
    shaderBuilder.addDefine(
      "HAS_VECTOR_POLYGONS",
      undefined,
      ShaderDestination.FRAGMENT,
    );
  }

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

  // A re-bake replaces _vectorData, and its rectangle, without rebuilding draw
  // commands, so the callbacks read the rectangle per call.
  const buildRectangle = vectorData.rectangle;

  const defaultTexture = function () {
    return frameState.context.defaultTexture;
  };

  /** @type {Object<string, Function>} */
  const uniformMap = {
    // The UV coordinates of the camera within the baked rectangle.
    u_vectorCameraUv: function () {
      const rectangle = model._vectorData?.rectangle ?? buildRectangle;
      const carto = frameState.camera.positionCartographic;

      const halfWidth = rectangle.width * 0.5;
      const centerLongitude = rectangle.west + halfWidth;
      const longitudeOffset =
        CesiumMath.negativePiToPi(carto.longitude - centerLongitude) +
        halfWidth;
      return Cartesian2.fromElements(
        longitudeOffset / rectangle.width,
        (carto.latitude - rectangle.south) / rectangle.height,
        scratchCameraUv,
      );
    },
    u_vectorRectangleInverseSize: function () {
      const rectangle = model._vectorData?.rectangle ?? buildRectangle;
      return Cartesian2.fromElements(
        1.0 / rectangle.width,
        1.0 / rectangle.height,
        scratchRectangleInverseSize,
      );
    },
    u_vectorColorTexture: function () {
      return model._vectorData?.colorTexture ?? defaultTexture();
    },
    u_vectorPickColorTexture: function () {
      return model._vectorData?.pickColorTexture ?? defaultTexture();
    },
  };

  if (hasPolylines) {
    uniformMap.u_vectorSegmentTexture = function () {
      return model._vectorData?.polylineSegmentTexture ?? defaultTexture();
    };
    uniformMap.u_vectorWidthTexture = function () {
      return model._vectorData?.widthTexture ?? defaultTexture();
    };
    uniformMap.u_vectorSegmentPrimitiveIndicesTexture = function () {
      return (
        model._vectorData?.polylineSegmentPrimitiveIndicesTexture ??
        defaultTexture()
      );
    };
    uniformMap.u_vectorGridCellIndicesTexture = function () {
      return (
        model._vectorData?.polylineGridCellIndicesTexture ?? defaultTexture()
      );
    };

    if (vectorData.hasMeterWidths) {
      uniformMap.u_vectorMetersPerUv = function () {
        return model._vectorData.metersPerUv;
      };
    }
  }

  if (hasPolygons) {
    uniformMap.u_vectorPolygonEdgeTexture = function () {
      return model._vectorData?.polygonEdgeTexture ?? defaultTexture();
    };
    uniformMap.u_vectorPolygonEdgePrimitiveIndicesTexture = function () {
      return (
        model._vectorData?.polygonEdgePrimitiveIndicesTexture ??
        defaultTexture()
      );
    };
    uniformMap.u_vectorPolygonGridCellIndicesTexture = function () {
      return (
        model._vectorData?.polygonGridCellIndicesTexture ?? defaultTexture()
      );
    };
  }

  renderResources.uniformMap = /** @type {Object<string, Function>} */ (
    combine(uniformMap, renderResources.uniformMap)
  );
}

export default ModelVectorLookupPipelineStage;
