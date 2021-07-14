import defined from "../../Core/defined.js";
import Matrix4 from "../../Core/Matrix4.js";
import Model2Utility from "./Model2Utility.js";
import ModelSceneNode from "./ModelSceneNode.js";
import ModelSceneMeshPrimitive from "./ModelSceneMeshPrimitive.js";

import VertexArray from "../../Renderer/VertexArray.js";
import DrawCommand from "../../Renderer/DrawCommand.js";
import Pass from "../../Renderer/Pass.js";
import RenderState from "../../Renderer/RenderState.js";
import RenderResources from "./RenderResources.js";

export default function ModelSceneGraph(options) {
  this._model = options.model;
  this._modelComponents = options.modelComponents;
  this._pipelineStages = [];

  this._sceneNodes = [];
  this._drawCommands = [];
  this._allowPicking = options.allowPicking;
  this._pickObject = options.pickObject;

  initialize(this);
}

function initialize(sceneGraph) {
  // Build the scene nodes and scene primitives.
  var rootNode = sceneGraph._modelComponents.scene.nodes[0];
  traverseModelComponents(
    sceneGraph,
    rootNode,
    Model2Utility.getNodeTransform(rootNode)
  );
}

ModelSceneGraph.prototype.createDrawCommands = function (frameState) {
  // Traverse scene graph
  for (var i = 0; i < this._sceneNodes.length; i++) {
    var node = this._sceneNodes[i];

    var nodeResources = new RenderResources.NodeRenderResources(
      node,
      this._model
    );

    for (var j = 0; j < node._pipelineStages.length; j++) {
      var nodePipelineStage = node._pipelineStages[j];
      nodePipelineStage.process(node._node, nodeResources, frameState);
    }

    for (var k = 0; k < node.primitives.length; k++) {
      var primitive = node.primitives[k];
      var primitiveResources = new RenderResources.PrimitiveRenderResources(
        nodeResources,
        primitive._primitive
      );

      for (var l = 0; l < primitive._pipelineStages.length; l++) {
        var pipelineStage = primitive._pipelineStages[l];
        pipelineStage.process(
          primitive._primitive,
          primitiveResources,
          frameState
        );
      }

      var drawCommand = buildDrawCommand(primitiveResources, frameState);
      this._drawCommands.push(drawCommand);
    }
  }
};

ModelSceneGraph.prototype.pushDrawCommands = function (frameState) {
  var commandList = frameState.commandList;
  commandList.push.apply(commandList, this._drawCommands);
};

// TODO: Move to a ModelDrawCommand class
function buildDrawCommand(primitiveResources, frameState) {
  var shaderBuilder = primitiveResources.shaderBuilder;
  shaderBuilder.addVertexLines([
    "void main()",
    "{",
    "    vec3 position = a_position;",
    "    #ifdef USE_INSTANCING",
    "    position = instancing(position);",
    "    #endif",
    "",
    "    #ifdef USE_FEATURE_PICKING",
    "    position = featurePicking(position);",
    "    #endif",
    "",
    "    #ifdef USE_POINTS",
    "    gl_PointSize = 2.0;",
    "    #endif",
    "",
    "    #ifdef USE_CUSTOM_SHADER_AFTER",
    "    customShaderStage();",
    "    #endif",
    "",
    // TODO: custom vertex shader
    "    gl_Position = czm_modelViewProjection * vec4(position, 1.0);",
    "}",
  ]);

  // TODO: Compile struct definitions... when to insert them into shader?
  shaderBuilder.addFragmentLines([
    "void main()",
    "{",
    "    vec4 color = vec4(0.0);",
    "    Material material;",
    "",
    "    #ifdef USE_CUSTOM_SHADER_BEFORE",
    "    material = customShaderStage();",
    "    color = vec4(material.baseColor, 1.0);",
    "    #endif",
    "",
    "    //other materials stuff here",
    "",
    "    #ifdef USE_CUSTOM_SHADER_AFTER",
    "    material = customShaderStage();",
    "    color = vec4(material.baseColor, 1.0);",
    "    #endif",
    "",
    "    #ifdef USE_FEATURE_PICKING",
    "    color = featurePicking(color);",
    "    #endif",
    "",
    "    #ifdef USE_SOLID_COLOR",
    "    color = solidColor(color);",
    "    #endif",
    "    gl_FragColor = color;",
    "}",
  ]);

  var indexBuffer = defined(primitiveResources.indices)
    ? primitiveResources.indices.buffer
    : undefined;

  var vertexArray = new VertexArray({
    context: frameState.context,
    indexBuffer: indexBuffer,
    attributes: primitiveResources.attributes,
  });

  var renderState = RenderState.fromCache(
    primitiveResources.renderStateOptions
  );
  var shaderProgram = shaderBuilder.buildShaderProgram(frameState.context);

  return new DrawCommand({
    boundingVolume: primitiveResources.boundingSphere,
    modelMatrix: primitiveResources.modelMatrix,
    uniformMap: primitiveResources.uniformMap,
    renderState: renderState,
    vertexArray: vertexArray,
    shaderProgram: shaderProgram,
    pass: Pass.OPAQUE,
    pickId: primitiveResources.pickId,
    count: primitiveResources.indexCount,
    instanceCount: primitiveResources.instanceCount,
    primitiveType: primitiveResources.primitiveType,
    // TODO: Remove this when done
    //debugShowBoundingVolume: true,
  });

  // var command = new DrawCommand({
  //   cull: model.cull, // TODO
  //   primitiveType: primitive.mode,
  //   vertexArray: vertexArray,
  //   count: count,
  //   offset: offset,
  //   shaderProgram: rendererPrograms[programId],
  //   castShadows: castShadows,
  //   receiveShadows: receiveShadows,
  //   uniformMap: uniformMap,
  //   renderState: renderState,
  //   owner: owner,
  //   pass: isTranslucent ? Pass.TRANSLUCENT : model.opaquePass,
  //   pickId: pickId,
  // });
}

// 1. Propagate model matrices
// 2. Build the pipeline stages as we go
// 3. Build internal representation of nodes
function traverseModelComponents(sceneGraph, node, modelMatrix) {
  if (!defined(node.children) && !defined(node.primitives)) {
    return;
  }

  // process children recursively
  var i;
  if (defined(node.children)) {
    for (i = 0; i < node.children.length; i++) {
      var childNode = node.children[i];
      var childMatrix = Matrix4.multiply(
        modelMatrix,
        Model2Utility.getNodeTransform(childNode),
        new Matrix4()
      );

      traverseModelComponents(sceneGraph, childNode, childMatrix);
    }
  }

  var sceneNode = new ModelSceneNode({
    node: node,
    modelMatrix: modelMatrix,
  });

  if (defined(node.primitives)) {
    for (i = 0; i < node.primitives.length; i++) {
      sceneNode.primitives.push(
        new ModelSceneMeshPrimitive({
          primitive: node.primitives[i],
          allowPicking: sceneGraph._allowPicking,
        })
      );
    }
  }

  sceneGraph._sceneNodes.push(sceneNode);
}
