/**
 * Building blocks for creating models.
 *
 * @namespace ModelRuntime
 *
 * @private
 */
function ModelRuntime() {
  this.nodes = [];
  this.featureMetadata = undefined;
}

function VertexAttribute() {
  this.semantic = undefined;
  this.constantValue = undefined;
  this.byteOffset = undefined;
  this.byteStride = undefined;
  this.componentType = undefined;
  this.normalized = undefined;
  this.count = undefined;
  this.type = undefined;
  this.vertexBuffer = undefined;
  this.cacheResource = undefined;
}

function Indices() {
  this.constantValue = 0;
  this.indexDatatype = undefined;
  this.count = undefined;
  this.indexBuffer = undefined;
  this.cacheResource = undefined;
}

function FeatureIdAttribute() {
  this.featureTable = undefined;
  this.attribute = undefined;
  this.constant = undefined;
  this.divisor = undefined;
}

function FeatureIdTexture() {
  this.featureTable = undefined;
  this.channels = undefined;
  this.texture = undefined;
}

function MorphTarget() {
  this.vertexAttributes = [];
}

/**
 * @private
 */
function Primitive() {
  this.vertexAttributes = []; // Dictionary of semantic to vertex buffer?
  this.morphTargets = [];
  this.indices = undefined;
  this.material = undefined;
  this.mode = undefined;

  this.featureIdAttributes = [];
  this.featureIdTextures = [];
  this.featureTextures = [];
}

function Mesh() {
  this.primitives = [];
  this.morphWeights = [];
}

function Instances() {
  this.attributes = [];
  this.featureIdAttributes = [];
}

function Node() {
  this.children = [];
  this.mesh = undefined;
  this.instances = undefined;
}

function Texture() {
  this.texture = undefined;
  this.cacheResource = undefined;
}

function Material() {
  this.baseColorTexture = undefined;
  this.metallicRoughnessTexture = undefined;
  this.baseColorFactor = undefined;
  this.metallicFactor = undefined;
  this.roughnessFactor = undefined;

  this.diffuseTexture = undefined;
  this.specularGlossinessTexture = undefined;
  this.diffuseFactor = undefined;
  this.specularFactor = undefined;
  this.glossinessFactor = undefined;

  this.emissiveTexture = undefined;
  this.normalTexture = undefined;
  this.occlusionTexture = undefined;
  this.emissiveFactor = undefined;
  this.alphaMode = undefined;
  this.alphaCutoff = undefined;
  this.doubleSided = undefined;
}

ModelRuntime.VertexAttribute = VertexAttribute;
ModelRuntime.Indices = Indices;
ModelRuntime.FeatureIdAttribute = FeatureIdAttribute;
ModelRuntime.FeatureIdTexture = FeatureIdTexture;
ModelRuntime.MorphTarget = MorphTarget;
ModelRuntime.Primitive = Primitive;
ModelRuntime.Mesh = Mesh;
ModelRuntime.Instances = Instances;
ModelRuntime.Node = Node;
ModelRuntime.Texture = Texture;
ModelRuntime.Material = Material;

export default ModelRuntime;
