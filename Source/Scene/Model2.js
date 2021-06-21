import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian3 from "../Core/Cartesian3.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import Matrix4 from "../Core/Matrix4.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import RenderState from "../Renderer/RenderState.js";
import ShaderProgram from "../Renderer/ShaderProgram.js";
import VertexArray from "../Renderer/VertexArray.js";
import when from "../ThirdParty/when.js";
import GltfLoader from "./GltfLoader.js";

export default function Model(options) {
  this._drawCommand = undefined;
  this._components = undefined;
  this._readyPromise = when.defer();

  // TODO: We probably should create the loader in the constructor so it
  // doesn't become part of the public API.
  var loader = options.loader;
  this._gltfLoader = loader;

  this.modelMatrix = new Matrix4();

  var that = this;
  loader.load();
  loader.promise
    .then(function (loader) {
      that._components = loader.components;
    })
    .otherwise(console.error);
}

Object.defineProperties(Model.prototype, {
  readyPromise: {
    get: function () {
      return this._readyPromise.promise;
    },
  },
});

Model.prototype.update = function (frameState) {
  if (!defined(this._components)) {
    this._gltfLoader.process(frameState);
    return;
  }

  if (!defined(this._drawCommand)) {
    this._drawCommand = createCommand(this, frameState);

    var that = this;
    frameState.afterRender.push(function () {
      that._readyPromise.resolve(that);
    });
  }

  frameState.commandList.push(this._drawCommand);
};

function createCommand(model, frameState) {
  var renderState = RenderState.fromCache({
    depthTest: {
      enabled: true,
    },
  });

  // Hard code first primitive
  //var primitive = model._components.scene.nodes[0].children[0].primitives[0];
  //var positionAttribute = primitive.attributes[1];
  var primitive = model._components.scene.nodes[0].primitives[0];
  var positionAttribute = primitive.attributes[0];

  var boundingSphere = BoundingSphere.fromCornerPoints(
    positionAttribute.min,
    positionAttribute.max
  );

  var center = new Cartesian3(
    1215019.2111447915,
    -4736339.477299974,
    4081627.9570209784
  );
  var modelMatrix = Matrix4.fromTranslation(center);

  // ModelVisualizer sets a model matrix directly... this is hacky but
  // it'll work
  modelMatrix = defaultValue(model.modelMatrix, modelMatrix);
  boundingSphere = BoundingSphere.transform(
    boundingSphere,
    modelMatrix,
    boundingSphere
  );

  var shaderProgram = createShader(frameState.context);
  var vertexArray = createVertexArray(primitive, frameState.context);

  var start = performance.now();
  var uniformMap = {
    u_baseColor: function () {
      return primitive.material.metallicRoughness.baseColorTexture.texture;
    },
    u_featureIdTexture: function () {
      return primitive.featureIdTextures[0].textureReader.texture;
    },
    u_featureTexture: function () {
      var featureTextureId = primitive.featureTextureIds[0];
      var featureTexture =
        model._components.featureMetadata._featureTextures[featureTextureId];
      return featureTexture._properties["vegetationDensity"].textureReader
        .texture;
    },
    u_time: function () {
      return performance.now() - start;
    },
  };

  var drawCommand = new DrawCommand({
    boundingVolume: boundingSphere,
    modelMatrix: modelMatrix,
    pass: Pass.OPAQUE,
    shaderProgram: shaderProgram,
    renderState: renderState,
    vertexArray: vertexArray,
    count: primitive.indices.count,
    primitiveType: primitive.primitiveType,
    uniformMap: uniformMap,
  });

  return drawCommand;
}

function createShader(context) {
  var vertexShader =
    "attribute vec3 a_position;\n" +
    "attribute vec2 a_texcoord0;\n" +
    "attribute vec2 a_texcoord1;\n" +
    "varying vec2 v_texcoord0;\n" +
    "varying vec2 v_texcoord1;\n" +
    //"attribute vec3 a_normal;\n" +
    //"varying vec3 v_normal;\n" +
    "void main()\n" +
    "{\n" +
    //"    v_normal = a_normal;\n" +
    "    v_texcoord0 = a_texcoord0;\n" +
    "    v_texcoord1 = a_texcoord1;\n" +
    "    gl_Position = czm_modelViewProjection * vec4(a_position, 1.0);\n" +
    "}\n";

  var fragmentShader =
    "varying vec3 v_normal;\n" +
    "varying vec2 v_texcoord0;\n" +
    "varying vec2 v_texcoord1;\n" +
    "uniform sampler2D u_baseColor;\n" +
    "uniform sampler2D u_featureIdTexture;\n" +
    "uniform sampler2D u_featureTexture;\n" +
    "uniform float u_time;\n" +
    "void main()\n" +
    "{\n" +
    //"    gl_FragColor = vec4(abs(v_normal), 1.0);\n" +
    "    float timeBucket = mod(floor(3.0 * u_time * 0.0002), 3.0);\n" +
    "    if (timeBucket == 0.0) {\n" +
    "        gl_FragColor = texture2D(u_baseColor, v_texcoord0);\n" +
    "    } else if (timeBucket == 1.0) {\n" +
    "        gl_FragColor = texture2D(u_featureIdTexture, v_texcoord1);\n" +
    "    } else {\n" +
    "        gl_FragColor = texture2D(u_featureTexture, v_texcoord1);\n" +
    "    }\n" +
    "}\n";

  return ShaderProgram.fromCache({
    context: context,
    vertexShaderSource: vertexShader,
    fragmentShaderSource: fragmentShader,
    attributeLocations: {
      a_position: 0,
      //a_normal: 1,
      a_texcoord0: 1, // material coords
      a_texcoord1: 2, // metadata coords
    },
  });
}

function createVertexArray(primitive, context) {
  var positionAttribute = {
    index: 0,
    // attribute 0 for microcosm, 1 for basic tileset
    vertexBuffer: primitive.attributes[0].buffer,
    componentsPerAttribute: 3,
    componentDatatype: primitive.attributes[0].componentDatatype,
  };

  // microcosm doesn't have normals
  /*
  var normalAttribute = {
    index: 1,
    vertexBuffer: primitive.attributes[0].buffer,
    componentsPerAttribute: 3,
    componentDatatype: primitive.attributes[0].componentDatatype,
  };
  */

  // microcosm has 2 texcoords: one for actual texcoords, another for feature ID textures
  var texcoordAttribute = {
    index: 1,
    vertexBuffer: primitive.attributes[2].buffer,
    componentsPerAttribute: 2,
    componentDatatype: primitive.attributes[2].componentDatatype,
  };

  var featureIdTexcoord = {
    index: 2,
    vertexBuffer: primitive.attributes[1].buffer,
    componentsPerAttribute: 2,
    componentDatatype: primitive.attributes[1].componentDatatype,
  };

  var vertexArray = new VertexArray({
    context: context,
    // basic tileset
    //attributes: [positionAttribute, normalAttribute],
    attributes: [positionAttribute, texcoordAttribute, featureIdTexcoord],
    indexBuffer: primitive.indices.buffer,
  });

  return vertexArray;
}

Model.fromGltf = function (options) {
  var loader = new GltfLoader({
    gltfResource: options.url,
    releaseGltfJson: true,
    incrementallyLoadTextures: false,
  });

  return new Model({
    loader: loader,
  });
};
