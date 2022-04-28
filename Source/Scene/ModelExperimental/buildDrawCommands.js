import BlendingState from "../BlendingState.js";
import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import clone from "../../Core/clone.js";
import defined from "../../Core/defined.js";
import DrawCommand from "../../Renderer/DrawCommand.js";
import IndexDatatype from "../../Core/IndexDatatype.js";
import ModelExperimentalFS from "../../Shaders/ModelExperimental/ModelExperimentalFS.js";
import ModelExperimentalVS from "../../Shaders/ModelExperimental/ModelExperimentalVS.js";
import Pass from "../../Renderer/Pass.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import RenderState from "../../Renderer/RenderState.js";
import RuntimeError from "../../Core/RuntimeError.js";
import StencilConstants from "../StencilConstants.js";
import StyleCommandsNeeded from "./StyleCommandsNeeded.js";
import VertexArray from "../../Renderer/VertexArray.js";
import WireframeIndexGenerator from "../../Core/WireframeIndexGenerator.js";
import BoundingSphere from "../../Core/BoundingSphere.js";
import Matrix4 from "../../Core/Matrix4.js";
import ShadowMode from "../ShadowMode.js";

/**
 * Builds the DrawCommands for a {@link ModelExperimentalPrimitive} using its render resources.
 *
 * @param {PrimitiveRenderResources} primitiveRenderResources The render resources for a primitive.
 * @param {FrameState} frameState The frame state for creating GPU resources.
 *
 * @returns {DrawCommand[]} The generated DrawCommands.
 *
 * @private
 */
export default function buildDrawCommands(
  primitiveRenderResources,
  frameState
) {
  const shaderBuilder = primitiveRenderResources.shaderBuilder;
  shaderBuilder.addVertexLines([ModelExperimentalVS]);
  shaderBuilder.addFragmentLines([ModelExperimentalFS]);

  const model = primitiveRenderResources.model;
  let primitiveType = primitiveRenderResources.primitiveType;
  const debugWireframe =
    model.debugWireframe && !PrimitiveType.isTriangles(primitiveType);

  const indexBuffer = getIndexBuffer(
    primitiveRenderResources,
    debugWireframe,
    frameState
  );

  const vertexArray = new VertexArray({
    context: frameState.context,
    indexBuffer: indexBuffer,
    attributes: primitiveRenderResources.attributes,
  });

  model._resources.push(vertexArray);

  let renderState = primitiveRenderResources.renderStateOptions;

  if (model.opaquePass === Pass.CESIUM_3D_TILE) {
    // Set stencil values for classification on 3D Tiles
    renderState = clone(renderState, true);
    renderState.stencilTest = StencilConstants.setCesium3DTileBit();
    renderState.stencilMask = StencilConstants.CESIUM_3D_TILE_MASK;
  }

  renderState = RenderState.fromCache(renderState);

  const shaderProgram = shaderBuilder.buildShaderProgram(frameState.context);
  model._resources.push(shaderProgram);

  const pass = primitiveRenderResources.alphaOptions.pass;

  const sceneGraph = model.sceneGraph;

  const modelMatrix = Matrix4.multiply(
    sceneGraph.computedModelMatrix,
    primitiveRenderResources.runtimeNode.computedTransform,
    new Matrix4()
  );

  primitiveRenderResources.boundingSphere = BoundingSphere.transform(
    primitiveRenderResources.boundingSphere,
    modelMatrix,
    primitiveRenderResources.boundingSphere
  );

  let count = primitiveRenderResources.count;
  if (debugWireframe) {
    count = WireframeIndexGenerator.getWireframeIndicesCount(primitiveType);
    primitiveType = PrimitiveType.LINES;
  }

  const command = new DrawCommand({
    boundingVolume: primitiveRenderResources.boundingSphere,
    modelMatrix: modelMatrix,
    uniformMap: primitiveRenderResources.uniformMap,
    renderState: renderState,
    vertexArray: vertexArray,
    shaderProgram: shaderProgram,
    cull: model.cull,
    pass: pass,
    count: count,
    pickId: primitiveRenderResources.pickId,
    instanceCount: primitiveRenderResources.instanceCount,
    primitiveType: primitiveType,
    debugShowBoundingVolume: model.debugShowBoundingVolume,
    castShadows: ShadowMode.castShadows(model.shadows),
    receiveShadows: ShadowMode.receiveShadows(model.shadows),
  });

  const styleCommandsNeeded = primitiveRenderResources.styleCommandsNeeded;

  const commandList = [];

  if (defined(styleCommandsNeeded)) {
    const derivedCommands = createDerivedCommands(command);

    if (pass !== Pass.TRANSLUCENT) {
      switch (styleCommandsNeeded) {
        case StyleCommandsNeeded.ALL_OPAQUE:
          commandList.push(command);
          break;
        case StyleCommandsNeeded.ALL_TRANSLUCENT:
          commandList.push(derivedCommands.translucent);
          break;
        case StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT:
          // Push both opaque and translucent commands. The rendering of features based on opacity is handled in the shaders.
          commandList.push(command, derivedCommands.translucent);
          break;
        //>>includeStart('debug', pragmas.debug);
        default:
          throw new RuntimeError("styleCommandsNeeded is not a valid value.");
        //>>includeEnd('debug');
      }
    } else {
      // Command was originally translucent so no need to derive new commands;
      // as of now, a style can't change an originally translucent feature to
      // opaque since the style's alpha is modulated, not a replacement.  When
      // this changes, we need to derive new opaque commands here.
      commandList.push(command);
    }
  } else {
    commandList.push(command);
  }

  return commandList;
}

/**
 * @private
 */
function createDerivedCommands(command) {
  const derivedCommands = {};
  derivedCommands.translucent = deriveTranslucentCommand(command);
  return derivedCommands;
}

/**
 * @private
 */
function deriveTranslucentCommand(command) {
  const derivedCommand = DrawCommand.shallowClone(command);
  derivedCommand.pass = Pass.TRANSLUCENT;
  const rs = clone(command.renderState, true);
  rs.cull.enabled = false;
  rs.depthTest.enabled = true;
  rs.depthMask = false;
  rs.blending = BlendingState.ALPHA_BLEND;
  derivedCommand.renderState = RenderState.fromCache(rs);
  return derivedCommand;
}

function getIndexBuffer(primitiveRenderResources, debugWireframe, frameState) {
  if (debugWireframe) {
    return createWireframeIndexBuffer(primitiveRenderResources, frameState);
  }

  const indices = primitiveRenderResources.indices;
  if (!defined(indices)) {
    return undefined;
  }

  if (defined(indices.buffer)) {
    return indices.buffer;
  }

  const typedArray = indices.typedArray;
  const indexDatatype = IndexDatatype.fromSizeInBytes(
    typedArray.BYTES_PER_ELEMENT
  );

  return Buffer.createIndexBuffer({
    context: frameState.context,
    typedArray: typedArray,
    usage: BufferUsage.STATIC_DRAW,
    indexDatatype: indexDatatype,
  });
}

/**
 * @private
 */
function createWireframeIndexBuffer(primitiveRenderResources, frameState) {
  let positionAttribute;
  const attributes = primitiveRenderResources.attributes;
  const length = attributes.length;
  for (let i = 0; i < length; i++) {
    if (attributes[i].index === 0) {
      positionAttribute = attributes[i];
      break;
    }
  }

  const vertexCount = positionAttribute.count;
  const indices = primitiveRenderResources.indices;
  const context = frameState.context;

  let originalIndices;
  if (defined(indices)) {
    const indicesBuffer = indices.buffer;
    const indicesCount = indices.count;
    const useWebgl2 = context.webgl2;

    if (useWebgl2 && defined(indicesBuffer)) {
      originalIndices = IndexDatatype.createTypedArray(
        vertexCount,
        indicesCount
      );
      indicesBuffer.getBufferData(originalIndices);
    } else {
      originalIndices = indices.typedArray;
    }
  }

  const primitiveType = primitiveRenderResources.primitiveType;
  const wireframeIndices = WireframeIndexGenerator.createWireframeIndices(
    primitiveType,
    vertexCount,
    originalIndices
  );

  const indexDatatype = IndexDatatype.fromSizeInBytes(
    wireframeIndices.BYTES_PER_ELEMENT
  );

  return Buffer.createIndexBuffer({
    context: context,
    typedArray: wireframeIndices,
    usage: BufferUsage.STATIC_DRAW,
    indexDatatype: indexDatatype,
  });
}
