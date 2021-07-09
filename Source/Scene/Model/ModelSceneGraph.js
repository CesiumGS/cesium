import defined from "../../Core/defined.js";
import Matrix4 from "../../Core/Matrix4.js";
import Model2Utility from "./Model2Utility.js";
import ModelSceneNode from "./ModelSceneNode.js";
import ModelSceneMeshPrimitive from "./ModelSceneMeshPrimitive.js";

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
  gl_Position = czm_modelViewProjection * vec4(position, 1.0); 
}
*/

ModelSceneGraph.prototype.createDrawCommands = function (frameState) {
  // Traverse scene graph
  for (var i = 0; i < this._sceneNodes.length; i++) {
    var node = this._sceneNodes[i];

    var nodeResources = new RenderResources.NodeRenderResources(
      node._modelMatrix
    );

    for (var j = 0; j < node._primitives.length; i++) {
      var nodePipelineStage = node._pipelineStages[j];
      nodePipelineStage.process(node, nodeResources, frameState);

      var primitiveResources = new RenderResources.PrimitiveRenderResources(
        nodeResources
      );

      var primitive = node._primitives[j];
      for (var k = 0; k < primitive._pipelineStages.length; k++) {
        var pipelineStage = primitive._pipelineStages[k];
        pipelineStage.process(primitive, primitiveResources, frameState);

        finalizeShaders(primitiveResources);
        this._drawCommands.push(
          primitiveResources.buildDrawCommand(frameState)
        );
      }
    }
  }
};

ModelSceneGraph.prototype.pushDrawCommands = function (frameState) {
  frames.commandList = frameState.commandList.concat(this._drawCommands);
};

function finalizeShaders(primitiveResources) {
  // TODO: Compile struct definitions... when to insert them into shader?

  primitiveResources.addVertexLines([
    "void main()",
    "{",
    "    vec3 position = a_position;",
    "    #ifdef USE_INSTANCING",
    "    position = instancing(position);",
    "    #endif",
    // TODO: custom vertex shader
    "    gl_Position = czm_modelProjectionMatrix * vec4(position, 1.0);",
    "}",
  ]);

  // TODO: Compile struct definitions... when to insert them into shader?
  primitiveResources.shaderBuilder.addFragmentLines([
    "void main()",
    "{",
    "    vec4 color = vec4(0.0);",
    "    color = solidColor(color);",
    "    gl_FragColor = color;",
    "}",
  ]);
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
      node.primitives.push(
        new ModelSceneMeshPrimitive({
          primitive: node.primitives[i],
        })
      );
    }
  }

  sceneGraph._sceneNodes.push(sceneNode);
}
