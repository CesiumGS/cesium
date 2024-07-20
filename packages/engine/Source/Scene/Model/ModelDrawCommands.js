import BoundingSphere from "../../Core/BoundingSphere.js";
import clone from "../../Core/clone.js";
import defined from "../../Core/defined.js";
import Matrix4 from "../../Core/Matrix4.js";
import DrawCommand from "../../Renderer/DrawCommand.js";
import RenderState from "../../Renderer/RenderState.js";
import SceneMode from "../SceneMode.js";
import ShadowMode from "../ShadowMode.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import ClassificationModelDrawCommand from "./ClassificationModelDrawCommand.js";
import ModelDrawCommand from "./ModelDrawCommand.js";
import VertexArray from "../../Renderer/VertexArray.js";
import ModelVS from "../../Shaders/Model/ModelVS.js";
import ModelFS from "../../Shaders/Model/ModelFS.js";
import ModelUtility from "./ModelUtility.js";
import DeveloperError from "../../Core/DeveloperError.js";
import MetadataType from "../MetadataType.js";

/**
 * Internal functions to build draw commands for models.
 *
 * (The core of these functions was taken from `buildDrawCommand.js´,
 * as of commit hash 7b93161da1cc03bdc796b204e7aa51fb7acebf04)
 *
 * @private
 */
function ModelDrawCommands() {}

function getComponentCount(classProperty) {
  if (!classProperty.isArray) {
    return MetadataType.getComponentCount(classProperty.type);
  }
  return classProperty.arrayLength;
}
function getGlslType(classProperty) {
  const componentCount = getComponentCount(classProperty);
  if (classProperty.normalized) {
    if (componentCount === 1) {
      return "float";
    }
    return `vec${componentCount}`;
  }
  if (componentCount === 1) {
    return "int";
  }
  return `ivec${componentCount}`;
}

ModelDrawCommands.prepareMetadataPickingStage = function (
  shaderBuilder,
  schemaId,
  className,
  propertyName,
  classProperty
) {
  console.log("Now adding that stuff...");
  console.log("  schemaId", schemaId);
  console.log("  className", className);
  console.log("  propertyName", propertyName);
  console.log("  classProperty", classProperty);

  // Enable METADATA_PICKING in `ModelFS.glsl`
  shaderBuilder.addDefine(
    "METADATA_PICKING",
    undefined,
    ShaderDestination.FRAGMENT
  );

  // Add the define for the property that should be picked
  shaderBuilder.addDefine(
    "METADATA_PICKING_PROPERTY_NAME",
    propertyName,
    ShaderDestination.FRAGMENT
  );

  // Define the function that will compute the 'metadataValues'
  // that will serve as the 'color' that is written into the
  // frame buffer
  shaderBuilder.addFunction(
    "metadataPickingStage",
    "void metadataPickingStage(Metadata metadata, MetadataClass metadataClass, inout vec4 metadataValues)",
    ShaderDestination.FRAGMENT
  );

  const lines = [];

  // In the function, obtain the specified property name
  const glslType = getGlslType(classProperty);
  lines.push(
    `${glslType} value = ${glslType}(metadata.METADATA_PICKING_PROPERTY_NAME);`
  );

  // Define the components that will go into the `metadataValues`.
  // By default, all of them are 0.0.
  const sourceValueStrings = ["0.0", "0.0", "0.0", "0.0"];
  const componentCount = getComponentCount(classProperty);
  if (componentCount === 1) {
    // When the property is a scalar, store its value directly
    // in `metadataValues.x`
    const valueString = `value`;
    sourceValueStrings[0] = `float(${valueString})`;
  } else {
    // When the property is an array, store the array elements
    // in `metadataValues.x/y/z/w`
    const components = ["x", "y", "z", "w"];
    for (let i = 0; i < componentCount; i++) {
      const component = components[i];
      const valueString = `value.${component}`;
      sourceValueStrings[i] = `float(${valueString})`;
    }
  }

  // Make sure that the `metadataValues` components are all in
  // the range [0, 1] (which will result in RGBA components
  // in [0, 255] during rendering)
  if (!classProperty.normalized) {
    for (let i = 0; i < componentCount; i++) {
      sourceValueStrings[i] += " / 255.0";
    }
  }
  lines.push(`metadataValues.x = ${sourceValueStrings[0]};`);
  lines.push(`metadataValues.y = ${sourceValueStrings[1]};`);
  lines.push(`metadataValues.z = ${sourceValueStrings[2]};`);
  lines.push(`metadataValues.w = ${sourceValueStrings[3]};`);
  shaderBuilder.addFunctionLines(
    "metadataPickingStage",
    lines,
    ShaderDestination.FRAGMENT
  );

  const XXX_METADATA_PICKING_DEBUG_LOG = true;
  if (XXX_METADATA_PICKING_DEBUG_LOG) {
    console.log("Name is ", propertyName);
    console.log("lines");
    console.log("  ", lines[0]);
    console.log("  ", lines[1]);
    console.log("  ", lines[2]);
    console.log("  ", lines[3]);
    console.log("  ", lines[4]);
  }
};

/**
 * Builds the {@link ModelDrawCommand} for a {@link ModelRuntimePrimitive}
 * using its render resources. If the model classifies another asset, it
 * builds a {@link ClassificationModelDrawCommand} instead.
 *
 * @param {PrimitiveRenderResources} primitiveRenderResources The render resources for a primitive.
 * @param {FrameState} frameState The frame state for creating GPU resources.
 * @param {ShaderBuilder} shaderBuilder The shader builder
 * @param {boolean|undefined} metadataPicking Whether the command is built for metadata picking
 * @returns {ModelDrawCommand|ClassificationModelDrawCommand} The generated ModelDrawCommand or ClassificationModelDrawCommand.
 *
 * @private
 */
ModelDrawCommands.buildModelDrawCommand = function (
  primitiveRenderResources,
  frameState,
  shaderBuilder,
  metadataPicking
) {
  const shaderProgram = ModelDrawCommands.createShaderProgram(
    primitiveRenderResources,
    shaderBuilder,
    frameState
  );

  const command = ModelDrawCommands.buildDrawCommandForModel(
    primitiveRenderResources,
    shaderProgram,
    frameState
  );

  if (metadataPicking) {
    command.debugShowBoundingVolume = false;
    command.castShadows = false;
    command.receiveShadows = false;
  }

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
ModelDrawCommands.createShaderProgram = function (
  primitiveRenderResources,
  shaderBuilder,
  frameState
) {
  shaderBuilder.addVertexLines(ModelVS);
  shaderBuilder.addFragmentLines(ModelFS);

  const model = primitiveRenderResources.model;
  const shaderProgram = shaderBuilder.buildShaderProgram(frameState.context);
  model._pipelineResources.push(shaderProgram);
  return shaderProgram;
};

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
ModelDrawCommands.buildDrawCommandForModel = function (
  primitiveRenderResources,
  shaderProgram,
  frameState
) {
  const indexBuffer = ModelDrawCommands.getIndexBuffer(
    primitiveRenderResources
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
      new Matrix4()
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
      new Matrix4()
    );

    boundingSphere = BoundingSphere.transform(
      primitiveRenderResources.boundingSphere,
      modelMatrix
    );
  }

  // Initialize render state with default values
  let renderState = clone(
    RenderState.fromCache(primitiveRenderResources.renderStateOptions),
    true
  );

  renderState.cull.face = ModelUtility.getCullFace(
    modelMatrix,
    primitiveRenderResources.primitiveType
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
    instanceCount: primitiveRenderResources.instanceCount,
    primitiveType: primitiveRenderResources.primitiveType,
    debugShowBoundingVolume: model.debugShowBoundingVolume,
    castShadows: castShadows,
    receiveShadows: receiveShadows,
  });
  return command;
};

/**
 * @private
 */
ModelDrawCommands.getIndexBuffer = function (primitiveRenderResources) {
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
};

export default ModelDrawCommands;
