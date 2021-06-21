import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import RenderState from "../Renderer/RenderState.js";
import when from "../ThirdParty/when.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import ShaderProgram from "../Renderer/ShaderProgram.js";
import defined from "../Core/defined.js";
import Matrix4 from "../Core/Matrix4.js";
import VertexArray from "../Renderer/VertexArray.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Quaternion from "../Core/Quaternion.js";

export default function Model(options) {
  this.drawCommand = undefined;
  this.loader = options.loader;
  this.components = options.loader.components;

  this._readyPromise = when.resolve();
}

Model.prototype.update = function (frameState) {
  if (!defined(this.drawCommand)) {
    this.drawCommand = createCommand(this, frameState);
  }

  for (var i = 0; i < this.drawCommand.length; i++) {
    frameState.commandList.push(this.drawCommand[i]);
  }
};

function createCommand(model, frameState) {
  var renderState = RenderState.fromCache({
    depthTest: {
      enabled: true,
    },
  });

  return createModelCommands(model.components, frameState, renderState);
}

function createShader(context) {
  var vertexShader =
    "attribute vec3 a_position;\n" +
    "attribute vec3 a_normal;\n" +
    "varying vec3 v_normal;\n" +
    "void main()\n" +
    "{\n" +
    "    v_normal = a_normal;\n" +
    "    gl_Position = czm_modelViewProjection * vec4(a_position, 1.0);\n" +
    "}\n";

  var fragmentShader =
    "varying vec3 v_normal;\n" +
    "void main()\n" +
    "{\n" +
    "    gl_FragColor = vec4(abs(v_normal), 1.0);\n" +
    "}\n";

  return ShaderProgram.fromCache({
    context: context,
    vertexShaderSource: vertexShader,
    fragmentShaderSource: fragmentShader,
    attributeLocations: {
      a_position: 0,
      a_normal: 1,
    },
  });
}

function getNodeTransform(node) {
  if (defined(node.matrix)) {
    return Matrix4.fromColumnMajorArray(node.matrix);
  }

  return Matrix4.fromTranslationQuaternionRotationScale(
    defined(node.translation) ? node.translation : new Cartesian3(),
    defined(node.rotation) ? node.rotation : Quaternion.IDENTITY,
    defined(node.scale) ? node.scale : new Cartesian3(1, 1, 1)
  );
}

function getAttributeBySemantic(primitive, semantic) {
  var attributes = primitive.attributes;
  var attributesLength = attributes.length;
  for (var i = 0; i < attributesLength; ++i) {
    var attribute = attributes[i];
    if (attribute.semantic === semantic) {
      return attribute;
    }
  }
}

function createModelCommands(model, frameState, renderState) {
  var drawCommands = [];

  var nodes = model.nodes;
  var nodeStack = [];
  nodeStack.length = 0;

  var i;
  for (i = 0; i < nodes.length; i++) {
    nodeStack.push(nodes[i]);
  }

  while (nodeStack.length > 0) {
    var node = nodeStack.pop();
    var modelMatrix = getNodeTransform(node);
    var primitives = node.primitives;
    for (i = 0; i < primitives.length; i++) {
      var primitive = primitives[i];
      drawCommands.push(
        createPrimitiveCommand(
          primitive,
          modelMatrix,
          frameState.context,
          renderState
        )
      );
    }
  }

  return drawCommands;
}

function createPrimitiveCommand(primitive, modelMatrix, context, renderState) {
  var attributes = primitive.attributes;
  for (var k = 0; k < attributes.length; k++) {
    var positionAttribute = getAttributeBySemantic(primitive, "POSITION");

    var boundingSphere = BoundingSphere.fromCornerPoints(
      positionAttribute.min,
      positionAttribute.max
    );
    boundingSphere.center = Matrix4.getTranslation(
      modelMatrix,
      new Cartesian3()
    );

    var shaderProgram = createShader(context);
    var vertexArray = createVertexArray(primitive, context);

    return new DrawCommand({
      boundingVolume: boundingSphere,
      modelMatrix: modelMatrix,
      pass: Pass.OPAQUE,
      shaderProgram: shaderProgram,
      renderState: renderState,
      vertexArray: vertexArray,
      count: primitive.indices.count,
      primitiveType: primitive.primitiveType,
      uniformMap: undefined,
    });
  }
}

function createVertexArray(primitive, context) {
  var positionGltfAttribute = getAttributeBySemantic(primitive, "POSITION");
  var normalGltfAttribute = getAttributeBySemantic(primitive, "NORMAL");

  var positionAttribute = {
    index: 0,
    vertexBuffer: positionGltfAttribute.buffer,
    componentsPerAttribute: 3,
    componentDatatype: positionGltfAttribute.componentDatatype,
  };

  var normalAttribute = {
    index: 1,
    vertexBuffer: normalGltfAttribute.buffer,
    componentsPerAttribute: 3,
    componentDatatype: primitive.attributes[0].componentDatatype,
  };

  var vertexArray = new VertexArray({
    context: context,
    attributes: [positionAttribute, normalAttribute],
    indexBuffer: primitive.indices.buffer,
  });

  return vertexArray;
}
