import { defined, RuntimeError } from "../../Source/Cesium.js";
import findAccessorMinMax from "../../Source/ThirdParty/GltfPipeline/findAccessorMinMax.js";

function GltfBuilder() {
  this.gltf = {
    asset: {
      generator: "cesium-tests",
      version: "2.0",
    },
    extensionsUsed: [],
    accessors: [],
    buffers: [],
    bufferViews: [],
    materials: [],
    meshes: [],
    nodes: [
      {
        mesh: 0,
      },
    ],
    scenes: [
      {
        nodes: [0],
      },
    ],
    scene: 0,
  };

  this.bufferBuilders = [];
}

GltfBuilder.prototype.buffer = function (name) {
  var index =
    this.gltf.buffers.push({
      name: name,
      byteLength: 0,
    }) - 1;
  var bufferBuilder = new GltfBufferBuilder(this, index);
  this.bufferBuilders.push(bufferBuilder);
  return bufferBuilder;
};

GltfBuilder.prototype.mesh = function (name) {
  var index =
    this.gltf.meshes.push({
      name: name,
      primitives: [],
    }) - 1;

  var meshBuilder = new GltfMeshBuilder(this, index);
  return meshBuilder;
};

GltfBuilder.prototype.material = function (name) {
  var index =
    this.gltf.materials.push({
      name: name,
    }) - 1;
  var materialBuilder = new GltfMaterialBuilder(this, index);
  return materialBuilder;
};

function GltfMaterialBuilder(gltfBuilder, materialIndex) {
  this.gltfBuilder = gltfBuilder;
  this.materialIndex = materialIndex;
  this.material = this.gltfBuilder.gltf.materials[materialIndex];
}

GltfMaterialBuilder.prototype.json = function (json) {
  for (var property in json) {
    if (!json.hasOwnProperty(property)) {
      continue;
    }

    this.material[property] = json[property];
  }
};

function GltfMeshBuilder(gltfBuilder, meshIndex) {
  this.gltfBuilder = gltfBuilder;
  this.meshIndex = meshIndex;
  this.mesh = gltfBuilder.gltf.meshes[this.meshIndex];
}

GltfMeshBuilder.prototype.primitive = function (name) {
  var index =
    this.mesh.primitives.push({
      name: name,
      attributes: {},
    }) - 1;

  var meshBuilder = new GltfPrimitiveBuilder(this, index);
  return meshBuilder;
};

function GltfPrimitiveBuilder(gltfMeshBuilder, primitiveIndex) {
  this.gltfMeshBuilder = gltfMeshBuilder;
  this.primitiveIndex = primitiveIndex;
  this.primitive = this.gltfMeshBuilder.mesh.primitives[this.primitiveIndex];
}

GltfPrimitiveBuilder.prototype.attribute = function (semantic, accessorName) {
  var gltf = this.gltfMeshBuilder.gltfBuilder.gltf;
  var accessorId = findAccessorByName(gltf, accessorName);
  if (accessorId < 0) {
    throw new RuntimeError("Accessor named " + accessorName + " not found.");
  }

  this.primitive.attributes[semantic] = accessorId;
  return this;
};

GltfPrimitiveBuilder.prototype.indices = function (accessorName) {
  var gltf = this.gltfMeshBuilder.gltfBuilder.gltf;
  var accessorId = findAccessorByName(gltf, accessorName);
  if (accessorId < 0) {
    throw new RuntimeError("Accessor named " + accessorName + " not found.");
  }

  this.primitive.indices = accessorId;
  return this;
};

GltfPrimitiveBuilder.prototype.triangles = function () {
  this.primitive.mode = 4;
  return this;
};

GltfPrimitiveBuilder.prototype.material = function (materialName) {
  var gltf = this.gltfMeshBuilder.gltfBuilder.gltf;

  for (var i = 0; i < gltf.materials.length; ++i) {
    if (gltf.materials[i].name === materialName) {
      this.primitive.material = i;
      return this;
    }
  }

  throw new RuntimeError("Material named " + materialName + " not found.");
};

function findAccessorByName(gltf, accessorName) {
  var accessors = gltf.accessors;

  for (var i = 0; i < accessors.length; ++i) {
    if (accessors[i].name === accessorName) {
      return i;
    }
  }

  return -1;
}

GltfBuilder.prototype.toGltf = function () {
  for (var i = 0; i < this.bufferBuilders.length; ++i) {
    var bufferBuilder = this.bufferBuilders[i];

    var byteLength = bufferBuilder.viewBuilders.reduce(function (
      byteLength,
      viewBuilder
    ) {
      return byteLength + viewBuilder.bufferView.byteLength;
    },
    0);

    var buffer = new ArrayBuffer(byteLength);
    var nextStart = 0;

    for (var j = 0; j < bufferBuilder.viewBuilders.length; ++j) {
      var viewBuilder = bufferBuilder.viewBuilders[j];
      viewBuilder.bufferView.byteOffset = nextStart;
      var destBuffer =
        viewBuilder.componentType === 5126
          ? new Float32Array(buffer, nextStart, viewBuilder._data.length)
          : new Uint16Array(buffer, nextStart, viewBuilder._data.length);
      destBuffer.set(viewBuilder._data);
      nextStart += viewBuilder.bufferView.byteLength;
    }

    bufferBuilder.buffer.byteLength = byteLength;
    bufferBuilder.buffer.uri = URL.createObjectURL(new Blob([buffer]));

    bufferBuilder.buffer.extras = {
      _pipeline: {
        source: new Uint8Array(buffer, 0, buffer.byteLength),
      },
    };
  }

  var gltf = this.gltf;
  gltf.accessors.forEach(function (accessor) {
    var minMax = findAccessorMinMax(gltf, accessor);
    accessor.min = minMax.min;
    accessor.max = minMax.max;
  });

  this.bufferBuilders.forEach(function (builder) {
    delete builder.buffer.extras;
  });

  return this.gltf;
};

GltfBuilder.prototype.destroy = function () {
  this.bufferBuilders.forEach(function (bufferBuilder) {
    URL.revokeObjectURL(bufferBuilder.buffer.uri);
  });
};

function GltfBufferBuilder(gltfBuilder, bufferIndex) {
  this.gltfBuilder = gltfBuilder;
  this.bufferIndex = bufferIndex;
  this.buffer = this.gltfBuilder.gltf.buffers[bufferIndex];
  this.viewBuilders = [];
}

GltfBufferBuilder.prototype.vertexBuffer = function (name) {
  var index =
    this.gltfBuilder.gltf.bufferViews.push({
      name: name,
      buffer: this.bufferIndex,
      byteLength: 0,
      target: 34962,
    }) - 1;
  var viewBuilder = new GltfBufferViewBuilder(this, index, 5126);
  this.viewBuilders.push(viewBuilder);
  return viewBuilder;
};

GltfBufferBuilder.prototype.indexBuffer = function (name) {
  var index =
    this.gltfBuilder.gltf.bufferViews.push({
      name: name,
      buffer: this.bufferIndex,
      byteLength: 0,
      target: 34963,
    }) - 1;
  var viewBuilder = new GltfBufferViewBuilder(this, index, 5123);
  this.viewBuilders.push(viewBuilder);
  return viewBuilder;
};

function GltfBufferViewBuilder(bufferBuilder, bufferViewIndex, componentType) {
  this.bufferBuilder = bufferBuilder;
  this.bufferViewIndex = bufferViewIndex;
  this.bufferView = this.bufferBuilder.gltfBuilder.gltf.bufferViews[
    this.bufferViewIndex
  ];
  this.componentType = componentType;
  this.elementStride = 0;
  this.nextOffset = 0;
  this._data = undefined;
}

Object.defineProperties(GltfBufferViewBuilder.prototype, {
  elementByteLength: {
    get: function () {
      return this.componentType === 5126 ? 4 : 2;
    },
  },
});

GltfBufferViewBuilder.prototype.vec3 = function (name) {
  var gltf = this.bufferBuilder.gltfBuilder.gltf;
  gltf.accessors.push({
    name: name,
    bufferView: this.bufferViewIndex,
    byteOffset: this.nextOffset,
    componentType: this.componentType,
    count: 0,
    type: "VEC3",
  });

  this.elementStride += 3;

  var newStride = 3 * this.elementByteLength;
  if (!defined(this.bufferView.byteStride)) {
    this.bufferView.byteStride = newStride;
  } else {
    this.bufferView.byteStride += newStride;
  }

  this.nextOffset += newStride;

  return this;
};

GltfBufferViewBuilder.prototype.scalar = function (name) {
  var gltf = this.bufferBuilder.gltfBuilder.gltf;
  gltf.accessors.push({
    name: name,
    bufferView: this.bufferViewIndex,
    byteOffset: this.nextOffset,
    componentType: this.componentType,
    count: 0,
    type: "SCALAR",
  });

  this.elementStride += 1;

  var newStride = this.elementByteLength;
  if (!defined(this.bufferView.byteStride)) {
    this.bufferView.byteStride = newStride;
  } else {
    this.bufferView.byteStride += newStride;
  }

  this.nextOffset += newStride;

  return this;
};

GltfBufferViewBuilder.prototype.data = function (data) {
  this.bufferView.byteLength = data.length * this.elementByteLength;
  this._data = data;

  var count = data.length / this.elementStride;

  var gltf = this.bufferBuilder.gltfBuilder.gltf;
  var bufferViewIndex = this.bufferViewIndex;

  gltf.accessors
    .filter(function (accessor) {
      return accessor.bufferView === bufferViewIndex;
    })
    .forEach(function (accessor) {
      accessor.count = count;
    });
};

export default GltfBuilder;
