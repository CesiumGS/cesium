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
  this._modelComponents = options.modelComponents;
  this._pipelineStages = [];

  this._sceneNodes = [];
  this._drawCommands = [];

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

  // Instancing
  // Picking
  // Geometry
  // Metadata Layout
  // Metadata Packing
  // Custom Shaders (Configurable)
  // PBR
  // IBL
  // OR KHR Techniques
}

/*

attribute vec3 a_position;
attribute vec3 a_instanceTranslation;

shaderBuilder.addDefine("USE_INSTANCING")
vec3 instancing(vec3 position) {
  return position + a_instanceTranslation;
}

void main() {
  vec3 position = a_position;

  #ifdef USE_INSTANCING
  position = instancing(position);
  #endif
  
  VertexOutput vertexOutput;
  customShaderCallback(vertexInput, vertexOutput);
  gl_Position = 

  // other steps here if needed, incl. custom shader

  gl_Position = czm_modelViewProjection * vec4(position, 1.0); 
}

----

attribute vec3 a_position;


void main() {
  vec3 position = a_position;
  gl_PointSize = 12;
  gl_Position = czm_modelViewProjection * vec4(position, 1.0); 
}
*/

ModelSceneGraph.prototype.createDrawCommands = function (frameState) {
  // Traverse scene graph
  for (var i = 0; i < this._sceneNodes.length; i++) {
    var node = this._sceneNodes[i];

    var nodeResources = new RenderResources.NodeRenderResources(node);

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
    "    #ifdef USE_POINTS",
    "    gl_PointSize = 2.0;",
    "    #endif",
    // TODO: custom vertex shader
    "    gl_Position = czm_modelViewProjection * vec4(position, 1.0);",
    "}",
  ]);

  // TODO: Compile struct definitions... when to insert them into shader?
  shaderBuilder.addFragmentLines([
    "void main()",
    "{",
    "    vec4 color = vec4(0.0);",
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
    count: primitiveResources.indexCount,
    instanceCount: primitiveResources.instanceCount,
    primitiveType: primitiveResources.primitiveType,
    // TODO: Remove this when done
    debugShowBoundingVolume: true,
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
        })
      );
    }
  }

  sceneGraph._sceneNodes.push(sceneNode);
}
