import { defined, RuntimeError } from "../../Source/Cesium.js";
import findAccessorMinMax from "../../Source/Scene/GltfPipeline/findAccessorMinMax.js";

/**
 * A fluent interface for programmatically building a glTF.
 * @alias GltfBuilder
 * @constructor
 * @private
 */
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

/**
 * Creates a new buffer.
 * @param {string} [name] The name of the buffer.
 * @returns {GltfBufferBuilder}
 */
GltfBuilder.prototype.buffer = function (name) {
  const index =
    this.gltf.buffers.push({
      name: name,
      byteLength: 0,
    }) - 1;
  const bufferBuilder = new GltfBufferBuilder(this, index);
  this.bufferBuilders.push(bufferBuilder);
  return bufferBuilder;
};

/**
 * Creates a new mesh.
 * @param {string} [name] The name of the mesh.
 * @returns {GltfMeshBuilder}
 */
GltfBuilder.prototype.mesh = function (name) {
  const index =
    this.gltf.meshes.push({
      name: name,
      primitives: [],
    }) - 1;

  const meshBuilder = new GltfMeshBuilder(this, index);
  return meshBuilder;
};

/**
 * Creates a new material.
 * @param {string} [name] The name of the material.
 * @returns {GltfMaterialBuilder}
 */
GltfBuilder.prototype.material = function (name) {
  const index =
    this.gltf.materials.push({
      name: name,
    }) - 1;
  const materialBuilder = new GltfMaterialBuilder(this, index);
  return materialBuilder;
};

/**
 * Gets the built glTF JSON from this builder. Calling this a second
 * time will cause the glTF returned in the first call to be invalidated.
 * Specifically, the `uri` properties of its buffers will no longer be
 * resolvable.
 *
 * After calling this method, be sure to call {@link GltfBuilder#destroy}
 * when done with the glTF, to a void leaking buffer memory.
 */
GltfBuilder.prototype.toGltf = function () {
  for (let i = 0; i < this.bufferBuilders.length; ++i) {
    const bufferBuilder = this.bufferBuilders[i];

    const byteLength = bufferBuilder.viewBuilders.reduce(function (
      byteLength,
      viewBuilder
    ) {
      return byteLength + viewBuilder.bufferView.byteLength;
    },
    0);

    const buffer = new ArrayBuffer(byteLength);
    let nextStart = 0;

    for (let j = 0; j < bufferBuilder.viewBuilders.length; ++j) {
      const viewBuilder = bufferBuilder.viewBuilders[j];
      viewBuilder.bufferView.byteOffset = nextStart;
      const destBuffer =
        viewBuilder.componentType === 5126
          ? new Float32Array(buffer, nextStart, viewBuilder._data.length)
          : new Uint16Array(buffer, nextStart, viewBuilder._data.length);
      destBuffer.set(viewBuilder._data);
      nextStart += viewBuilder.bufferView.byteLength;
    }

    bufferBuilder.buffer.byteLength = byteLength;

    if (bufferBuilder.buffer.uri) {
      URL.revokeObjectURL(bufferBuilder.buffer.uri);
    }

    bufferBuilder.buffer.uri = URL.createObjectURL(new Blob([buffer]));

    bufferBuilder.buffer.extras = {
      _pipeline: {
        source: new Uint8Array(buffer, 0, buffer.byteLength),
      },
    };
  }

  const gltf = this.gltf;
  gltf.accessors.forEach(function (accessor) {
    const minMax = findAccessorMinMax(gltf, accessor);
    accessor.min = minMax.min;
    accessor.max = minMax.max;
  });

  this.bufferBuilders.forEach(function (builder) {
    delete builder.buffer.extras;
  });

  return this.gltf;
};

/**
 * Frees memory allocated for buffers in {@link GltfBuilder@toGltf}.
 */
GltfBuilder.prototype.destroy = function () {
  this.bufferBuilders.forEach(function (bufferBuilder) {
    URL.revokeObjectURL(bufferBuilder.buffer.uri);
    bufferBuilder.buffer.uri = undefined;
  });
};

/**
 * A fluent interface for programmatically building a glTF material.
 * @param {GltfBuilder} gltfBuilder The glTF builder.
 * @param {number} materialIndex The index of this material within the glTF.
 * @private
 */
function GltfMaterialBuilder(gltfBuilder, materialIndex) {
  this.gltfBuilder = gltfBuilder;
  this.materialIndex = materialIndex;
  this.material = this.gltfBuilder.gltf.materials[materialIndex];
}

/**
 * Defines the material using JSON.
 * @param {*} json The JSON definition of the material.
 * @returns {GltfMaterialBuilder}
 */
GltfMaterialBuilder.prototype.json = function (json) {
  for (const property in json) {
    if (!json.hasOwnProperty(property)) {
      continue;
    }

    this.material[property] = json[property];
  }

  return this;
};

/**
 * A fluent interface for building a glTF mesh.
 * @param {GltfBuilder} gltfBuilder The glTF builder.
 * @param {number} meshIndex The index of this mesh within the glTF.
 * @private
 */
function GltfMeshBuilder(gltfBuilder, meshIndex) {
  this.gltfBuilder = gltfBuilder;
  this.meshIndex = meshIndex;
  this.mesh = gltfBuilder.gltf.meshes[this.meshIndex];
}

/**
 * Creates a new primitive within this mesh.
 * @param {string} [name] The name of the primitive.
 * @returns {GltfPrimitiveBuilder}
 */
GltfMeshBuilder.prototype.primitive = function (name) {
  const index =
    this.mesh.primitives.push({
      name: name,
      attributes: {},
    }) - 1;

  const meshBuilder = new GltfPrimitiveBuilder(this, index);
  return meshBuilder;
};

/**
 * A fluent interface for building a glTF primitive.
 * @param {GltfMeshBuilder} gltfMeshBuilder The mesh builder.
 * @param {number} primitiveIndex The index of this primitive within the mesh.
 * @private
 */
function GltfPrimitiveBuilder(gltfMeshBuilder, primitiveIndex) {
  this.gltfMeshBuilder = gltfMeshBuilder;
  this.primitiveIndex = primitiveIndex;
  this.primitive = this.gltfMeshBuilder.mesh.primitives[this.primitiveIndex];
}

/**
 * Adds a new attribute to the primitive.
 * @param {string} semantic The semantic of the attribute.
 * @param {string} accessorName The name of the accessor referenced by this attribute.
 * @returns {GltfPrimitiveBuilder}
 */
GltfPrimitiveBuilder.prototype.attribute = function (semantic, accessorName) {
  const gltf = this.gltfMeshBuilder.gltfBuilder.gltf;
  const accessorId = findAccessorByName(gltf, accessorName);
  if (accessorId < 0) {
    throw new RuntimeError(`Accessor named ${accessorName} not found.`);
  }

  this.primitive.attributes[semantic] = accessorId;
  return this;
};

/**
 * Sets the name of the accessor providing this primitive's indices.
 * @param {string} accessorName The name of the accessor providing the indices.
 * @returns {GltfPrimitiveBuilder}
 */
GltfPrimitiveBuilder.prototype.indices = function (accessorName) {
  const gltf = this.gltfMeshBuilder.gltfBuilder.gltf;
  const accessorId = findAccessorByName(gltf, accessorName);
  if (accessorId < 0) {
    throw new RuntimeError(`Accessor named ${accessorName} not found.`);
  }

  this.primitive.indices = accessorId;
  return this;
};

/**
 * Indicates that this primitive is TRIANGLES.
 * @returns {GltfPrimitiveBuilder}
 */
GltfPrimitiveBuilder.prototype.triangles = function () {
  this.primitive.mode = 4;
  return this;
};

/**
 * Sets the material applied to this primitive.
 * @param {string} materialName The name of the material.
 * @returns {GltfPrimitiveBuilder}
 */
GltfPrimitiveBuilder.prototype.material = function (materialName) {
  const gltf = this.gltfMeshBuilder.gltfBuilder.gltf;

  for (let i = 0; i < gltf.materials.length; ++i) {
    if (gltf.materials[i].name === materialName) {
      this.primitive.material = i;
      return this;
    }
  }

  throw new RuntimeError(`Material named ${materialName} not found.`);
};

/**
 * A fluent interface for building a glTF buffer.
 * @param {GltfBuilder} gltfBuilder The glTF builder.
 * @param {number} bufferIndex The index of this buffer in the glTF.
 * @private
 */
function GltfBufferBuilder(gltfBuilder, bufferIndex) {
  this.gltfBuilder = gltfBuilder;
  this.bufferIndex = bufferIndex;
  this.buffer = this.gltfBuilder.gltf.buffers[bufferIndex];
  this.viewBuilders = [];
}

/**
 * Creates a new vertex bufferView in this buffer.
 * @param {string} name The name of the bufferView.
 * @returns {GltfBufferViewBuilder}
 */
GltfBufferBuilder.prototype.vertexBuffer = function (name) {
  const index =
    this.gltfBuilder.gltf.bufferViews.push({
      name: name,
      buffer: this.bufferIndex,
      byteLength: 0,
      target: 34962,
    }) - 1;
  const viewBuilder = new GltfBufferViewBuilder(this, index, 5126);
  this.viewBuilders.push(viewBuilder);
  return viewBuilder;
};

/**
 * Creates a new index bufferView in this buffer.
 * @param {string} name The name of the bufferView.
 * @returns {GltfBufferViewBuilder}
 */
GltfBufferBuilder.prototype.indexBuffer = function (name) {
  const index =
    this.gltfBuilder.gltf.bufferViews.push({
      name: name,
      buffer: this.bufferIndex,
      byteLength: 0,
      target: 34963,
    }) - 1;
  const viewBuilder = new GltfBufferViewBuilder(this, index, 5123);
  this.viewBuilders.push(viewBuilder);
  return viewBuilder;
};

/**
 * A fluent interface for building a glTF bufferView.
 * @param {GltfBufferBuilder} bufferBuilder The buffer builder.
 * @param {GltfBufferViewBuilder} bufferViewIndex The bufferView builder.
 * @param {number} componentType The glTF `componentType` of this bufferView.
 * @private
 */
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
  /**
   * Gets the number of bytes in each numeric element of this bufferView.
   */
  elementByteLength: {
    get: function () {
      return this.componentType === 5126 ? 4 : 2;
    },
  },
});

/**
 * Defines a `VEC3` element in this bufferView.
 * @param {string} name The name of the accessor for this element.
 * @returns {GltfBufferViewBuilder}
 */
GltfBufferViewBuilder.prototype.vec3 = function (name) {
  const gltf = this.bufferBuilder.gltfBuilder.gltf;
  gltf.accessors.push({
    name: name,
    bufferView: this.bufferViewIndex,
    byteOffset: this.nextOffset,
    componentType: this.componentType,
    count: 0,
    type: "VEC3",
  });

  this.elementStride += 3;

  const newStride = 3 * this.elementByteLength;
  if (!defined(this.bufferView.byteStride)) {
    this.bufferView.byteStride = newStride;
  } else {
    this.bufferView.byteStride += newStride;
  }

  this.nextOffset += newStride;

  return this;
};

/**
 * Defines a `SCALAR` element in this bufferView.
 * @param {string} name The name of the accessor for this element.
 * @returns {GltfBufferViewBuilder}
 */
GltfBufferViewBuilder.prototype.scalar = function (name) {
  const gltf = this.bufferBuilder.gltfBuilder.gltf;
  gltf.accessors.push({
    name: name,
    bufferView: this.bufferViewIndex,
    byteOffset: this.nextOffset,
    componentType: this.componentType,
    count: 0,
    type: "SCALAR",
  });

  this.elementStride += 1;

  const newStride = this.elementByteLength;
  if (!defined(this.bufferView.byteStride)) {
    this.bufferView.byteStride = newStride;
  } else {
    this.bufferView.byteStride += newStride;
  }

  this.nextOffset += newStride;

  return this;
};

/**
 * Provides this bufferView's data. All elements should be defined with
 * {@link GltfBufferViewBuilder#vec3} and {@link GltfBufferViewBuilder#scalar}
 * before calling this method.
 * @param {Array|Float32Array|Uint16Array|Uint32Array} data The data.
 * @returns {GltfBufferViewBuilder}
 */
GltfBufferViewBuilder.prototype.data = function (data) {
  this.bufferView.byteLength = data.length * this.elementByteLength;
  this._data = data;

  const count = data.length / this.elementStride;

  const gltf = this.bufferBuilder.gltfBuilder.gltf;
  const bufferViewIndex = this.bufferViewIndex;

  gltf.accessors
    .filter(function (accessor) {
      return accessor.bufferView === bufferViewIndex;
    })
    .forEach(function (accessor) {
      accessor.count = count;
    });

  return this;
};

function findAccessorByName(gltf, accessorName) {
  const accessors = gltf.accessors;

  for (let i = 0; i < accessors.length; ++i) {
    if (accessors[i].name === accessorName) {
      return i;
    }
  }

  return -1;
}

export default GltfBuilder;
