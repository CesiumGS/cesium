import BoundingSphere from "../../Core/BoundingSphere.js";
import clone from "../../Core/clone.js";
import defined from "../../Core/defined.js";
import DeveloperError from "../../Core/DeveloperError.js";
import Matrix4 from "../../Core/Matrix4.js";
import DrawCommand from "../../Renderer/DrawCommand.js";
import Pass from "../../Renderer/Pass.js";
import RenderState from "../../Renderer/RenderState.js";
import VertexArray from "../../Renderer/VertexArray.js";
import ModelExperimentalFS from "../../Shaders/ModelExperimental/ModelExperimentalFS.js";
import ModelExperimentalVS from "../../Shaders/ModelExperimental/ModelExperimentalVS.js";
import ClassificationModelDrawCommand from "./ClassificationModelDrawCommand.js";
import SceneMode from "../SceneMode.js";
import ShadowMode from "../ShadowMode.js";
import StencilConstants from "../StencilConstants.js";
import ModelDrawCommand from "./ModelDrawCommand.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";

/**
 * Builds the {@link ModelDrawCommand} for a {@link ModelRuntimePrimitive}
 * using its render resources. If the model classifies another asset, it
 * builds a {@link ClassificationModelDrawCommand} instead.
 *
 * @param {PrimitiveRenderResources} primitiveRenderResources The render resources for a primitive.
 * @param {FrameState} frameState The frame state for creating GPU resources.
 *
 * @returns {ModelDrawCommand|ClassificationModelDrawCommand} The generated ModelDrawCommand or ClassificationModelDrawCommand.
 *
 * @private
 */
export default function buildDrawCommand(primitiveRenderResources, frameState) {
  const shaderBuilder = primitiveRenderResources.shaderBuilder;
  shaderBuilder.addVertexLines([ModelExperimentalVS]);
  shaderBuilder.addFragmentLines([ModelExperimentalFS]);

  const model = primitiveRenderResources.model;
  const hasClassification = defined(model.classificationType);

  const context = frameState.context;

  const indexBuffer = getIndexBuffer(primitiveRenderResources);

  const vertexArray = new VertexArray({
    context: context,
    indexBuffer: indexBuffer,
    attributes: primitiveRenderResources.attributes,
  });

  model._pipelineResources.push(vertexArray);

  const shaderProgram = shaderBuilder.buildShaderProgram(frameState.context);
  model._pipelineResources.push(shaderProgram);

  const pass = primitiveRenderResources.alphaOptions.pass;
  const sceneGraph = model.sceneGraph;

  const modelMatrix = Matrix4.multiplyTransformation(
    sceneGraph.computedModelMatrix,
    primitiveRenderResources.runtimeNode.computedTransform,
    new Matrix4()
  );

  let boundingSphere;
  if (
    frameState.mode !== SceneMode.SCENE3D &&
    !frameState.scene3DOnly &&
    model._projectTo2D
  ) {
    const runtimePrimitive = primitiveRenderResources.runtimePrimitive;
    boundingSphere = runtimePrimitive.boundingSphere2D;
  } else {
    boundingSphere = BoundingSphere.transform(
      primitiveRenderResources.boundingSphere,
      modelMatrix,
      primitiveRenderResources.boundingSphere
    );
  }

  // Initialize render state with default values
  let renderState = clone(
    RenderState.fromCache(primitiveRenderResources.renderStateOptions),
    true
  );

  if (model.opaquePass === Pass.CESIUM_3D_TILE) {
    // Set stencil values for classification on 3D Tiles
    renderState.stencilTest = StencilConstants.setCesium3DTileBit();
    renderState.stencilMask = StencilConstants.CESIUM_3D_TILE_MASK;
  }

  renderState.cull.face = ModelExperimentalUtility.getCullFace(
    modelMatrix,
    primitiveRenderResources.primitiveType
  );
  renderState = RenderState.fromCache(renderState);

  // Disable shadows if this renders a classification model.
  const castShadows = hasClassification
    ? false
    : ShadowMode.castShadows(model.shadows);
  const receiveShadows = hasClassification
    ? false
    : ShadowMode.receiveShadows(model.shadows);

  const command = new DrawCommand({
    boundingVolume: boundingSphere,
    modelMatrix: modelMatrix,
    uniformMap: primitiveRenderResources.uniformMap,
    renderState: renderState,
    vertexArray: vertexArray,
    shaderProgram: shaderProgram,
    cull: model.cull,
    pass: pass,
    count: primitiveRenderResources.count,
    owner: model,
    pickId: primitiveRenderResources.pickId,
    instanceCount: primitiveRenderResources.instanceCount,
    primitiveType: primitiveRenderResources.primitiveType,
    debugShowBoundingVolume: model.debugShowBoundingVolume,
    castShadows: castShadows,
    receiveShadows: receiveShadows,
  });

  if (hasClassification) {
    return new ClassificationModelDrawCommand({
      primitiveRenderResources: primitiveRenderResources,
      command: command,
    });
  }

  const useSilhouetteCommands = model.hasSilhouette(frameState);

  return new ModelDrawCommand({
    primitiveRenderResources: primitiveRenderResources,
    command: command,
    useSilhouetteCommands: useSilhouetteCommands,
  });
}

/**
 * @private
 */
function getIndexBuffer(primitiveRenderResources) {
  const wireframeIndexBuffer = primitiveRenderResources.wireframeIndexBuffer;
  if (defined(wireframeIndexBuffer)) {
    return wireframeIndexBuffer;
  }

  const indices = primitiveRenderResources.indices;
  if (!defined(indices)) {
    return undefined;
  }

  //>>includeStart('debug', pragmas.debug);
  if (!defined(indices.buffer)) {
    throw new DeveloperError("Indices must be provided as a Buffer");
  }
  //>>includeEnd('debug');

  return indices.buffer;
}
