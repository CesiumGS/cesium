import BlendingState from "../BlendingState.js";
import Cartesian2 from "../../Core/Cartesian2.js";
import clone from "../../Core/clone.js";
import CullFace from "../CullFace.js";
import defined from "../../Core/defined.js";
import DrawCommand from "../../Renderer/DrawCommand.js";
import Pass from "../../Renderer/Pass.js";
import RenderState from "../../Renderer/RenderState.js";
import StencilConstants from "../StencilConstants.js";
import StencilFunction from "../StencilFunction.js";
import StencilOperation from "../StencilOperation.js";
import StyleCommandsNeeded from "./StyleCommandsNeeded.js";

/**
 * Utility functions for creating derived commands.
 *
 * @private
 */
var DerivedCommandUtility = {};

DerivedCommandUtility.deriveTileCommand = function (command) {
  // Check if the original command is translucent.
  var isCommandTranslucent = command.pass === Pass.TRANSLUCENT;
  // Create a new derived command.
  var derivedCommand = DrawCommand.shallowClone(command);
  derivedCommand.uniformMap = defined(derivedCommand.uniformMap)
    ? derivedCommand.uniformMap
    : {};
  // Add a uniform indicating whether the original command was translucent or not.
  derivedCommand.uniformMap.tile_isCommandTranslucent = function () {
    return isCommandTranslucent;
  };
  return derivedCommand;
};

DerivedCommandUtility.deriveTranslucentCommand = function (command) {
  var derivedCommand = DrawCommand.shallowClone(command);
  derivedCommand.pass = Pass.TRANSLUCENT;
  derivedCommand.renderState = getTranslucentRenderState(command.renderState);
  return derivedCommand;
};

DerivedCommandUtility.deriveOpaqueCommand = function (command) {
  var derivedCommand = DrawCommand.shallowClone(command);
  derivedCommand.renderState = getOpaqueRenderState(command.renderState);
  return derivedCommand;
};

DerivedCommandUtility.deriveStencilCommand = function (command, reference) {
  // Tiles only draw if their selection depth is >= the tile drawn already. They write their
  // selection depth to the stencil buffer to prevent ancestor tiles from drawing on top
  var derivedCommand = DrawCommand.shallowClone(command);
  var rs = clone(derivedCommand.renderState, true);
  // Stencil test is masked to the most significant 3 bits so the reference is shifted. Writes 0 for the terrain bit
  rs.stencilTest.enabled = true;
  rs.stencilTest.mask = StencilConstants.SKIP_LOD_MASK;
  rs.stencilTest.reference =
    StencilConstants.CESIUM_3D_TILE_MASK |
    (reference << StencilConstants.SKIP_LOD_BIT_SHIFT);
  rs.stencilTest.frontFunction = StencilFunction.GREATER_OR_EQUAL;
  rs.stencilTest.frontOperation.zPass = StencilOperation.REPLACE;
  rs.stencilTest.backFunction = StencilFunction.GREATER_OR_EQUAL;
  rs.stencilTest.backOperation.zPass = StencilOperation.REPLACE;
  rs.stencilMask =
    StencilConstants.CESIUM_3D_TILE_MASK | StencilConstants.SKIP_LOD_MASK;
  derivedCommand.renderState = RenderState.fromCache(rs);
  return derivedCommand;
};

DerivedCommandUtility.getLastSelectionDepth = function (stencilCommand) {
  // Isolate the selection depth from the stencil reference.
  var reference = stencilCommand.renderState.stencilTest.reference;
  return (
    (reference & StencilConstants.SKIP_LOD_MASK) >>>
    StencilConstants.SKIP_LOD_BIT_SHIFT
  );
};

DerivedCommandUtility.deriveZBackfaceCommand = function (context, command) {
  // Write just backface depth of unresolved tiles so resolved stenciled tiles do not appear in front
  var derivedCommand = DrawCommand.shallowClone(command);
  var rs = clone(derivedCommand.renderState, true);
  rs.cull.enabled = true;
  rs.cull.face = CullFace.FRONT;
  // Back faces do not need to write color.
  rs.colorMask = {
    red: false,
    green: false,
    blue: false,
    alpha: false,
  };
  // Push back face depth away from the camera so it is less likely that back faces and front faces of the same tile
  // intersect and overlap. This helps avoid flickering for very thin double-sided walls.
  rs.polygonOffset = {
    enabled: true,
    factor: 5.0,
    units: 5.0,
  };
  // Set the 3D Tiles bit
  rs.stencilTest = StencilConstants.setCesium3DTileBit();
  rs.stencilMask = StencilConstants.CESIUM_3D_TILE_MASK;

  derivedCommand.renderState = RenderState.fromCache(rs);
  derivedCommand.castShadows = false;
  derivedCommand.receiveShadows = false;
  derivedCommand.uniformMap = clone(command.uniformMap);

  var polygonOffset = new Cartesian2(5.0, 5.0);
  derivedCommand.uniformMap.u_polygonOffset = function () {
    return polygonOffset;
  };

  // Make the log depth depth fragment write account for the polygon offset, too.
  // Otherwise, the back face commands will cause the higher resolution
  // tiles to disappear.
  derivedCommand.shaderProgram = getLogDepthPolygonOffsetFragmentShaderProgram(
    context,
    command.shaderProgram
  );
  return derivedCommand;
};

DerivedCommandUtility.getStyleCommandsNeeded = function (batchTexture) {
  var translucentFeaturesLength = batchTexture.translucentFeaturesLength;
  if (translucentFeaturesLength === 0) {
    return StyleCommandsNeeded.ALL_OPAQUE;
  } else if (translucentFeaturesLength === batchTexture.featuresLength) {
    return StyleCommandsNeeded.ALL_TRANSLUCENT;
  }
  return StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT;
};

function getLogDepthPolygonOffsetFragmentShaderProgram(context, shaderProgram) {
  var shader = context.shaderCache.getDerivedShaderProgram(
    shaderProgram,
    "zBackfaceLogDepth"
  );
  if (!defined(shader)) {
    var fs = shaderProgram.fragmentShaderSource.clone();
    fs.defines = defined(fs.defines) ? fs.defines.slice(0) : [];
    fs.defines.push("POLYGON_OFFSET");

    fs.sources.unshift(
      "#ifdef GL_OES_standard_derivatives\n#extension GL_OES_standard_derivatives : enable\n#endif\n"
    );
    shader = context.shaderCache.createDerivedShaderProgram(
      shaderProgram,
      "zBackfaceLogDepth",
      {
        vertexShaderSource: shaderProgram.vertexShaderSource,
        fragmentShaderSource: fs,
        attributeLocations: shaderProgram._attributeLocations,
      }
    );
  }

  return shader;
}

function getTranslucentRenderState(renderState) {
  var rs = clone(renderState, true);
  rs.cull.enabled = false;
  rs.depthTest.enabled = true;
  rs.depthMask = false;
  rs.blending = BlendingState.ALPHA_BLEND;
  rs.stencilTest = StencilConstants.setCesium3DTileBit();
  rs.stencilMask = StencilConstants.CESIUM_3D_TILE_MASK;
  return RenderState.fromCache(rs);
}

function getOpaqueRenderState(renderState) {
  var rs = clone(renderState, true);
  rs.stencilTest = StencilConstants.setCesium3DTileBit();
  rs.stencilMask = StencilConstants.CESIUM_3D_TILE_MASK;
  return RenderState.fromCache(rs);
}

export default DerivedCommandUtility;
