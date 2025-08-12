import BoundingSphere from "../../Core/BoundingSphere.js";
import clone from "../../Core/clone.js";
import defined from "../../Core/defined.js";
import Matrix4 from "../../Core/Matrix4.js";
import DrawCommand from "../../Renderer/DrawCommand.js";
import RenderState from "../../Renderer/RenderState.js";
import SceneMode from "../SceneMode.js";
import ShadowMode from "../ShadowMode.js";
import ClassificationModelDrawCommand from "./ClassificationModelDrawCommand.js";
import ModelDrawCommand from "./ModelDrawCommand.js";
import VertexArray from "../../Renderer/VertexArray.js";
import ModelVS from "../../Shaders/Model/ModelVS.js";
import ModelFS from "../../Shaders/Model/ModelFS.js";
import ModelUtility from "./ModelUtility.js";
import DeveloperError from "../../Core/DeveloperError.js";

const modelMatrixScratch = new Matrix4();

/**
 * Internal functions to build draw commands for models.
 *
 * (The core of these functions was taken from `buildDrawCommand.js´,
 * as of commit hash 7b93161da1cc03bdc796b204e7aa51fb7acebf04)
 *
 * @private
 */
function ModelDrawCommands() {}

/**
 * Builds the {@link ModelDrawCommand} for a {@link ModelRuntimePrimitive}
 * using its render resources. If the model classifies another asset, it
 * builds a {@link ClassificationModelDrawCommand} instead.
 *
 * @param {PrimitiveRenderResources} primitiveRenderResources The render resources for a primitive.
 * @param {FrameState} frameState The frame state for creating GPU resources.
 * @returns {ModelDrawCommand|ClassificationModelDrawCommand} The generated ModelDrawCommand or ClassificationModelDrawCommand.
 *
 * @private
 */
ModelDrawCommands.buildModelDrawCommand = function (
  primitiveRenderResources,
  frameState,
) {
  const shaderBuilder = primitiveRenderResources.shaderBuilder;
  const shaderProgram = createShaderProgram(
    primitiveRenderResources,
    shaderBuilder,
    frameState,
  );

  const command = buildDrawCommandForModel(
    primitiveRenderResources,
    shaderProgram,
    frameState,
  );

  const model = primitiveRenderResources.model;
  const hasClassification = defined(model.classificationType);
  if (hasClassification) {
    return new ClassificationModelDrawCommand({
      primitiveRenderResources: primitiveRenderResources,
      command: command,
    });
  }

  return new ModelDrawCommand({
    primitiveRenderResources: primitiveRenderResources,
    command: command,
  });
};

/**
 * @private
 */
function createShaderProgram(
  primitiveRenderResources,
  shaderBuilder,
  frameState,
) {
  shaderBuilder.addVertexLines(ModelVS);
  shaderBuilder.addFragmentLines(ModelFS);

  const model = primitiveRenderResources.model;
  const shaderProgram = shaderBuilder.buildShaderProgram(frameState.context);
  model._pipelineResources.push(shaderProgram);
  return shaderProgram;
}

/**
 * Builds the {@link DrawCommand} that serves as the basis for either creating
 * a {@link ModelDrawCommand} or a {@link ModelRuntimePrimitive}
 *
 * @param {PrimitiveRenderResources} primitiveRenderResources The render resources for a primitive.
 * @param {ShaderProgram} shaderProgram The shader program
 * @param {FrameState} frameState The frame state for creating GPU resources.
 *
 * @returns {DrawCommand} The generated DrawCommand, to be passed to
 * the ModelDrawCommand or ClassificationModelDrawCommand
 *
 * @private
 */
function buildDrawCommandForModel(
  primitiveRenderResources,
  shaderProgram,
  frameState,
) {
  const indexBuffer = getIndexBuffer(primitiveRenderResources);

  const vertexArray = new VertexArray({
    context: frameState.context,
    indexBuffer: indexBuffer,
    attributes: primitiveRenderResources.attributes,
  });

  const model = primitiveRenderResources.model;
  model._pipelineResources.push(vertexArray);

  const pass = primitiveRenderResources.alphaOptions.pass;
  const sceneGraph = model.sceneGraph;

  const useBoundingSphere2D =
    !frameState.scene3DOnly && sceneGraph._projectTo2D;
  const useModelMatrix2D =
    frameState.mode !== SceneMode.SCENE3D && !useBoundingSphere2D;

  const runtimeNode = primitiveRenderResources.runtimeNode;
  const modelMatrix = ModelDrawCommands.createCommandModelMatrix(
    model.modelMatrix,
    sceneGraph,
    runtimeNode,
    useModelMatrix2D,
  );

  const runtimePrimitive = primitiveRenderResources.runtimePrimitive;
  const primitiveBoundingSphere =
    frameState.mode !== SceneMode.SCENE3D && useBoundingSphere2D
      ? runtimePrimitive.boundingSphere2D
      : runtimePrimitive.boundingSphere;
  const boundingSphere = ModelDrawCommands.createCommandBoundingSphere(
    modelMatrix,
    sceneGraph,
    runtimeNode,
    primitiveBoundingSphere,
  );

  // Initialize render state with default values
  let renderState = clone(
    RenderState.fromCache(primitiveRenderResources.renderStateOptions),
    true,
  );

  renderState.cull.face = ModelUtility.getCullFace(
    modelMatrix,
    primitiveRenderResources.primitiveType,
  );
  renderState = RenderState.fromCache(renderState);

  const hasClassification = defined(model.classificationType);
  const castShadows = hasClassification
    ? false
    : ShadowMode.castShadows(model.shadows);
  const receiveShadows = hasClassification
    ? false
    : ShadowMode.receiveShadows(model.shadows);
  // Pick IDs are only added to specific draw commands for classification.
  // This behavior is handled by ClassificationModelDrawCommand.
  const pickId = hasClassification
    ? undefined
    : primitiveRenderResources.pickId;

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
    pickId: pickId,
    pickMetadataAllowed: true,
    instanceCount: primitiveRenderResources.instanceCount,
    primitiveType: primitiveRenderResources.primitiveType,
    debugShowBoundingVolume: model.debugShowBoundingVolume,
    castShadows: castShadows,
    receiveShadows: receiveShadows,
  });
  return command;
}

/**
 * Returns the model matrix based on the supplied parameters
 *
 * @param {Matrix4} modelMatrix
 * @param {ModelSceneGraph} sceneGraph
 * @param {ModelRuntimeNode} runtimeNode
 * @param {Boolean} use2D
 * @param {Matrix4} result
 *
 * @returns {Matrix4} The model matrix
 *
 * @private
 */
ModelDrawCommands.createCommandModelMatrix = function (
  modelMatrix,
  sceneGraph,
  runtimeNode,
  use2D = false,
  result,
) {
  if (!defined(result)) {
    result = new Matrix4();
  }

  if (sceneGraph.hasInstances) {
    if (use2D) {
      const inverseAxisCorrection = Matrix4.inverse(
        sceneGraph._axisCorrectionMatrix,
        modelMatrixScratch,
      );
      return Matrix4.multiplyTransformation(
        sceneGraph._computedModelMatrix2D,
        inverseAxisCorrection,
        result,
      );
    }
    return modelMatrix;
  }

  if (use2D) {
    return Matrix4.multiplyTransformation(
      sceneGraph._computedModelMatrix2D,
      runtimeNode.computedTransform,
      result,
    );
  }

  return Matrix4.multiplyTransformation(
    sceneGraph.computedModelMatrix,
    runtimeNode.computedTransform,
    result,
  );
};

/**
 * Returns the bounding sphere based on the supplied parameters
 *
 * @param {Matrix4} modelMatrix
 * @param {ModelSceneGraph} sceneGraph
 * @param {ModelRuntimeNode} runtimeNode
 * @param {BoundingSphere} primitiveBoundingSphere
 * @param {BoundingSphere} result
 *
 * @returns {BoundingSphere}
 */
ModelDrawCommands.createCommandBoundingSphere = function (
  commandModelMatrix,
  sceneGraph,
  runtimeNode,
  primitiveBoundingSphere,
  result,
) {
  if (!defined(result)) {
    result = new BoundingSphere();
  }

  if (sceneGraph.hasInstances) {
    const instanceBoundingSpheres = [];

    for (const modelInstance of sceneGraph.modelInstances._instances) {
      const boundingSphere = modelInstance.getPrimitiveBoundingSphere(
        commandModelMatrix,
        sceneGraph,
        runtimeNode,
        primitiveBoundingSphere,
      );
      instanceBoundingSpheres.push(boundingSphere);
    }

    return BoundingSphere.fromBoundingSpheres(instanceBoundingSpheres, result);
  }

  return BoundingSphere.transform(
    primitiveBoundingSphere,
    commandModelMatrix,
    result,
  );
};

ModelDrawCommands.updateDrawCommand = function (
  drawCommand,
  model,
  runtimeNode,
  runtimePrimitive,
  frameState,
) {
  const sceneGraph = model.sceneGraph;
  const useBoundingSphere2D =
    !frameState.scene3DOnly && sceneGraph._projectTo2D;
  const useModelMatrix2D =
    frameState.mode !== SceneMode.SCENE3D && !useBoundingSphere2D;

  const modelMatrix = ModelDrawCommands.createCommandModelMatrix(
    model.modelMatrix,
    sceneGraph,
    runtimeNode,
    useModelMatrix2D,
    drawCommand.modelMatrix,
  );

  drawCommand.cullFace = ModelUtility.getCullFace(
    modelMatrix,
    drawCommand.primitiveType,
  );

  const primitiveBoundingSphere =
    frameState.mode !== SceneMode.SCENE3D && useBoundingSphere2D
      ? runtimePrimitive.boundingSphere2D
      : runtimePrimitive.boundingSphere;
  ModelDrawCommands.createCommandBoundingSphere(
    modelMatrix,
    sceneGraph,
    runtimeNode,
    primitiveBoundingSphere,
    drawCommand.boundingVolume,
  );
};

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

export default ModelDrawCommands;
