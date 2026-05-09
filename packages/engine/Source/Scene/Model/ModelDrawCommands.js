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
import ModelReader from "./ModelReader.js";
import Cartesian3 from "../../Core/Cartesian3.js";

// Scratch variables for computeBoundingSphere
const minScratch = new Cartesian3();
const maxScratch = new Cartesian3();
const transformedMinScratch = new Cartesian3();
const transformedMaxScratch = new Cartesian3();

/**
 * Internal functions to build draw commands for models.
 *
 * (The core of these functions was taken from `buildDrawCommand.js´,
 * as of commit hash 7b93161da1cc03bdc796b204e7aa51fb7acebf04)
 *
 * @private
 */
class ModelDrawCommands {
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
  static buildModelDrawCommand(primitiveRenderResources, frameState) {
    const shaderBuilder = primitiveRenderResources.shaderBuilder;
    const shaderProgram = ModelDrawCommands.createShaderProgram(
      primitiveRenderResources,
      shaderBuilder,
      frameState,
    );

    const command = ModelDrawCommands.buildDrawCommandForModel(
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
  }

  /**
   * @private
   */
  static createShaderProgram(
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
   * Computes a bounding sphere for the given render resources
   *
   * This will transform the "positionMin" and "positionMin" of the
   * given render resources with each instancing transform (or the
   * single so-called "computedModelMatrix") of the runtime node of
   * the render resources, compute the global minimum/maximum of
   * these transformed points, and return a bounding volume from
   * these points.
   *
   * @param {object} primitiveRenderResources The primitive render resources
   * @param {object} [result] The bounding sphere to write the result to
   * @returns The bounding sphere
   */
  static computeBoundingSphere(primitiveRenderResources, result) {
    if (!defined(result)) {
      result = new BoundingSphere();
    }
    const resultMin = Cartesian3.fromElements(
      Number.MAX_VALUE,
      Number.MAX_VALUE,
      Number.MAX_VALUE,
      minScratch,
    );
    const resultMax = Cartesian3.fromElements(
      -Number.MAX_VALUE,
      -Number.MAX_VALUE,
      -Number.MAX_VALUE,
      maxScratch,
    );
    const instanceTransforms = ModelReader.computeInstanceTransformsForNode(
      primitiveRenderResources.model,
      primitiveRenderResources.runtimeNode,
    );
    for (const transform of instanceTransforms) {
      const min = primitiveRenderResources.positionMin;
      const max = primitiveRenderResources.positionMax;
      const transformedMin = Matrix4.multiplyByPoint(
        transform,
        min,
        transformedMinScratch,
      );
      const transformedMax = Matrix4.multiplyByPoint(
        transform,
        max,
        transformedMaxScratch,
      );
      Cartesian3.minimumByComponent(resultMin, transformedMin, resultMin);
      Cartesian3.minimumByComponent(resultMin, transformedMax, resultMin);
      Cartesian3.maximumByComponent(resultMax, transformedMin, resultMax);
      Cartesian3.maximumByComponent(resultMax, transformedMax, resultMax);
    }
    return BoundingSphere.fromCornerPoints(resultMin, resultMax, result);
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
  static buildDrawCommandForModel(
    primitiveRenderResources,
    shaderProgram,
    frameState,
  ) {
    const indexBuffer = ModelDrawCommands.getIndexBuffer(
      primitiveRenderResources,
    );

    const vertexArray = new VertexArray({
      context: frameState.context,
      indexBuffer: indexBuffer,
      attributes: primitiveRenderResources.attributes,
    });

    const model = primitiveRenderResources.model;
    model._pipelineResources.push(vertexArray);

    const pass = primitiveRenderResources.alphaOptions.pass;
    const sceneGraph = model.sceneGraph;

    const is3D = frameState.mode === SceneMode.SCENE3D;
    let modelMatrix, boundingSphere;

    if (!is3D && !frameState.scene3DOnly && model._projectTo2D) {
      modelMatrix = Matrix4.multiplyTransformation(
        sceneGraph._computedModelMatrix,
        primitiveRenderResources.runtimeNode.computedTransform,
        new Matrix4(),
      );

      const runtimePrimitive = primitiveRenderResources.runtimePrimitive;
      boundingSphere = runtimePrimitive.boundingSphere2D;
    } else {
      const computedModelMatrix = is3D
        ? sceneGraph._computedModelMatrix
        : sceneGraph._computedModelMatrix2D;

      modelMatrix = Matrix4.multiplyTransformation(
        computedModelMatrix,
        primitiveRenderResources.runtimeNode.computedTransform,
        new Matrix4(),
      );

      boundingSphere = ModelDrawCommands.computeBoundingSphere(
        primitiveRenderResources,
      );
    }

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
   * @private
   */
  static getIndexBuffer(primitiveRenderResources) {
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
}

export default ModelDrawCommands;
