import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import RenderState from "../Renderer/RenderState.js";
import when from "../ThirdParty/when.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian3 from "../Core/Cartesian3.js";
import ShaderProgram from "../Renderer/ShaderProgram.js";
import defined from "../Core/defined.js";
import Buffer from "../Renderer/Buffer.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import Transforms from "../Core/Transforms.js";
import VertexArray from "../Renderer/VertexArray.js";

export default function Model(options) {
  this.drawCommand = undefined;
  this.loader = options.loader;
  this.components = options.loader.components;

  this._readyPromise = when.resolve();
}

Model.prototype.update = function (frameState) {
  if (!defined(this.drawCommand)) createCommand(this, frameState);

  frameState.commandList.push(this.drawCommand);
};

function createCommand(model, frameState) {
  var renderState = RenderState.fromCache({
    depthTest: {
      enabled: true,
    },
  });

  // Hard code first primitive
  var primitive = model.components.scene.nodes[0].children[0].primitives[0];
  //var normalAttribute = primitive.attributes[0];
  var positionAttribute = primitive.attributes[1];

  var boundingSphere = BoundingSphere.fromCornerPoints(
    positionAttribute.min,
    positionAttribute.max
  );

  var center = new Cartesian3(
    1215019.2111447915,
    -4736339.477299974,
    4081627.9570209784
  );
  var modelMatrix = Transforms.eastNorthUpToFixedFrame(center);

  var shaderProgram = createShader(frameState.context);

  var vertexArray = createVertexArray(primitive, frameState.context);

  var drawCommand = new DrawCommand({
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

  return drawCommand;
}

function createShader(context) {
  var vertexShader =
    "attribute vec3 a_position;\n" +
    "void main()\n" +
    "{\n" +
    "    gl_Position = czm_modelViewProjection * vec4(a_position, 1.0);\n" +
    "}\n";

  var fragmentShader =
    "void main()\n" +
    "{\n" +
    "    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);\n" +
    "}\n";

  return ShaderProgram.fromCache({
    context: context,
    vertexShaderSource: vertexShader,
    fragmentShaderSource: fragmentShader,
    attributeLocations: {
      a_position: 0,
    },
  });
}

function createVertexArray(primitive, context) {
  var positionAttribute = {
    index: 0,
    vertexBuffer: primitive.attributes[1].buffer,
    componentsPerAttribute: 3,
    componentDatatype: primitive.attributes[1].componentDatatype,
  };

  var indexBuffer = Buffer.createIndexBuffer({
    context: context,
    typedArray: primitive.indices.buffer,
    indexDatatype: primitive.indices.indexDatatype,
    usage: BufferUsage.STATIC_DRAW,
  });

  var vertexArray = new VertexArray({
    context: context,
    attributes: [positionAttribute],
    indexBuffer: indexBuffer,
  });

  return vertexArray;
}
