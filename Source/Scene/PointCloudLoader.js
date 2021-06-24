import ComponentDatatype from "../Core/ComponentDatatype.js";
import defined from "../Core/defined.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import AttributeType from "./AttributeType.js";
import ModelComponents from "./ModelComponents.js";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";
import Buffer from "../Renderer/Buffer.js";
import WebGLConstants from "../Core/WebGLConstants.js";
import BufferUsage from "../Renderer/BufferUsage.js";

var Attribute = ModelComponents.Attribute;
var Components = ModelComponents.Components;
var Node = ModelComponents.Node;
var Primitive = ModelComponents.Primitive;
var Scene = ModelComponents.Scene;

function PointCloudLoader(options) {
  this._components = new Components();
  this._pointCloud = options.pointCloud;
}

function process(pointCloud, components, frameState) {
  var scene = new Scene();
  var node = new Node();

  var primitive = new Primitive();
  primitive.primitiveType = PrimitiveType.POINTS;

  var positions = pointCloud._parsedContent.positions;
  var positionAttribute = new Attribute();
  positionAttribute.name = "position";
  positionAttribute.semantic = VertexAttributeSemantic.POSITION;
  positionAttribute.setIndex = 0;
  positionAttribute.constant = 0.0;
  positionAttribute.componentDatatype = ComponentDatatype.FLOAT;
  positionAttribute.normalize = false;
  positionAttribute.count = positions.length;
  positionAttribute.type = AttributeType.VEC3;
  positionAttribute.byteOffset = 0;
  positionAttribute.byteStride = 0;
  positionAttribute.buffer = new Buffer({
    context: frameState.context,
    bufferTarget: WebGLConstants.ARRAY_BUFFER,
    typedArray: positions,
    usage: BufferUsage.STATIC_DRAW,
  });

  primitive.attributes.push(positionAttribute);
  node.primitives.push(primitive);
  node.translation = pointCloud._rtcCenter;
  scene.nodes.push(node);
  components.scene = scene;
}

Object.defineProperties(PointCloudLoader.prototype, {
  components: {
    get: function () {
      return this._components;
    },
  },
});

PointCloudLoader.prototype.process = function (frameState) {
  process(this._pointCloud, this._components, frameState);
};

export default PointCloudLoader;
