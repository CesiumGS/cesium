import Check from "../Core/Check.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import CesiumMath from "../Core/Math.js";
import Buffer from "./Buffer.js";
import BufferUsage from "./BufferUsage.js";
import VertexArray from "./VertexArray.js";

/**
 * @private
 */
function VertexArrayFacade(context, attributes, sizeInVertices, instanced) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("context", context);
  if (!attributes || attributes.length === 0) {
    throw new DeveloperError("At least one attribute is required.");
  }
  //>>includeEnd('debug');

  const attrs = VertexArrayFacade._verifyAttributes(attributes);
  sizeInVertices = defaultValue(sizeInVertices, 0);
  const precreatedAttributes = [];
  const attributesByUsage = {};
  let attributesForUsage;
  let usage;

  // Bucket the attributes by usage.
  const length = attrs.length;
  for (let i = 0; i < length; ++i) {
    const attribute = attrs[i];

    // If the attribute already has a vertex buffer, we do not need
    // to manage a vertex buffer or typed array for it.
    if (attribute.vertexBuffer) {
      precreatedAttributes.push(attribute);
      continue;
    }

    usage = attribute.usage;
    attributesForUsage = attributesByUsage[usage];
    if (!defined(attributesForUsage)) {
      attributesForUsage = attributesByUsage[usage] = [];
    }

    attributesForUsage.push(attribute);
  }

  // A function to sort attributes by the size of their components.  From left to right, a vertex
  // stores floats, shorts, and then bytes.
  function compare(left, right) {
    return (
      ComponentDatatype.getSizeInBytes(right.componentDatatype) -
      ComponentDatatype.getSizeInBytes(left.componentDatatype)
    );
  }

  this._allBuffers = [];

  for (usage in attributesByUsage) {
    if (attributesByUsage.hasOwnProperty(usage)) {
      attributesForUsage = attributesByUsage[usage];

      attributesForUsage.sort(compare);
      const vertexSizeInBytes = VertexArrayFacade._vertexSizeInBytes(
        attributesForUsage
      );

      const bufferUsage = attributesForUsage[0].usage;

      const buffer = {
        vertexSizeInBytes: vertexSizeInBytes,
        vertexBuffer: undefined,
        usage: bufferUsage,
        needsCommit: false,
        arrayBuffer: undefined,
        arrayViews: VertexArrayFacade._createArrayViews(
          attributesForUsage,
          vertexSizeInBytes
        ),
      };

      this._allBuffers.push(buffer);
    }
  }

  this._size = 0;
  this._instanced = defaultValue(instanced, false);

  this._precreated = precreatedAttributes;
  this._context = context;

  this.writers = undefined;
  this.va = undefined;

  this.resize(sizeInVertices);
}
VertexArrayFacade._verifyAttributes = function (attributes) {
  const attrs = [];

  for (let i = 0; i < attributes.length; ++i) {
    const attribute = attributes[i];

    const attr = {
      index: defaultValue(attribute.index, i),
      enabled: defaultValue(attribute.enabled, true),
      componentsPerAttribute: attribute.componentsPerAttribute,
      componentDatatype: defaultValue(
        attribute.componentDatatype,
        ComponentDatatype.FLOAT
      ),
      normalize: defaultValue(attribute.normalize, false),

      // There will be either a vertexBuffer or an [optional] usage.
      vertexBuffer: attribute.vertexBuffer,
      usage: defaultValue(attribute.usage, BufferUsage.STATIC_DRAW),
    };
    attrs.push(attr);

    //>>includeStart('debug', pragmas.debug);
    if (
      attr.componentsPerAttribute !== 1 &&
      attr.componentsPerAttribute !== 2 &&
      attr.componentsPerAttribute !== 3 &&
      attr.componentsPerAttribute !== 4
    ) {
      throw new DeveloperError(
        "attribute.componentsPerAttribute must be in the range [1, 4]."
      );
    }

    const datatype = attr.componentDatatype;
    if (!ComponentDatatype.validate(datatype)) {
      throw new DeveloperError(
        "Attribute must have a valid componentDatatype or not specify it."
      );
    }

    if (!BufferUsage.validate(attr.usage)) {
      throw new DeveloperError(
        "Attribute must have a valid usage or not specify it."
      );
    }
    //>>includeEnd('debug');
  }

  // Verify all attribute names are unique.
  const uniqueIndices = new Array(attrs.length);
  for (let j = 0; j < attrs.length; ++j) {
    const currentAttr = attrs[j];
    const index = currentAttr.index;
    //>>includeStart('debug', pragmas.debug);
    if (uniqueIndices[index]) {
      throw new DeveloperError(
        `Index ${index} is used by more than one attribute.`
      );
    }
    //>>includeEnd('debug');
    uniqueIndices[index] = true;
  }

  return attrs;
};

VertexArrayFacade._vertexSizeInBytes = function (attributes) {
  let sizeInBytes = 0;

  const length = attributes.length;
  for (let i = 0; i < length; ++i) {
    const attribute = attributes[i];
    sizeInBytes +=
      attribute.componentsPerAttribute *
      ComponentDatatype.getSizeInBytes(attribute.componentDatatype);
  }

  const maxComponentSizeInBytes =
    length > 0
      ? ComponentDatatype.getSizeInBytes(attributes[0].componentDatatype)
      : 0; // Sorted by size
  const remainder =
    maxComponentSizeInBytes > 0 ? sizeInBytes % maxComponentSizeInBytes : 0;
  const padding = remainder === 0 ? 0 : maxComponentSizeInBytes - remainder;
  sizeInBytes += padding;

  return sizeInBytes;
};

VertexArrayFacade._createArrayViews = function (attributes, vertexSizeInBytes) {
  const views = [];
  let offsetInBytes = 0;

  const length = attributes.length;
  for (let i = 0; i < length; ++i) {
    const attribute = attributes[i];
    const componentDatatype = attribute.componentDatatype;

    views.push({
      index: attribute.index,
      enabled: attribute.enabled,
      componentsPerAttribute: attribute.componentsPerAttribute,
      componentDatatype: componentDatatype,
      normalize: attribute.normalize,

      offsetInBytes: offsetInBytes,
      vertexSizeInComponentType:
        vertexSizeInBytes / ComponentDatatype.getSizeInBytes(componentDatatype),

      view: undefined,
    });

    offsetInBytes +=
      attribute.componentsPerAttribute *
      ComponentDatatype.getSizeInBytes(componentDatatype);
  }

  return views;
};

/**
 * Invalidates writers.  Can't render again until commit is called.
 */
VertexArrayFacade.prototype.resize = function (sizeInVertices) {
  this._size = sizeInVertices;

  const allBuffers = this._allBuffers;
  this.writers = [];

  for (let i = 0, len = allBuffers.length; i < len; ++i) {
    const buffer = allBuffers[i];

    VertexArrayFacade._resize(buffer, this._size);

    // Reserving invalidates the writers, so if client's cache them, they need to invalidate their cache.
    VertexArrayFacade._appendWriters(this.writers, buffer);
  }

  // VAs are recreated next time commit is called.
  destroyVA(this);
};

VertexArrayFacade._resize = function (buffer, size) {
  if (buffer.vertexSizeInBytes > 0) {
    // Create larger array buffer
    const arrayBuffer = new ArrayBuffer(size * buffer.vertexSizeInBytes);

    // Copy contents from previous array buffer
    if (defined(buffer.arrayBuffer)) {
      const destView = new Uint8Array(arrayBuffer);
      const sourceView = new Uint8Array(buffer.arrayBuffer);
      const sourceLength = sourceView.length;
      for (let j = 0; j < sourceLength; ++j) {
        destView[j] = sourceView[j];
      }
    }

    // Create typed views into the new array buffer
    const views = buffer.arrayViews;
    const length = views.length;
    for (let i = 0; i < length; ++i) {
      const view = views[i];
      view.view = ComponentDatatype.createArrayBufferView(
        view.componentDatatype,
        arrayBuffer,
        view.offsetInBytes
      );
    }

    buffer.arrayBuffer = arrayBuffer;
  }
};

const createWriters = [
  // 1 component per attribute
  function (buffer, view, vertexSizeInComponentType) {
    return function (index, attribute) {
      view[index * vertexSizeInComponentType] = attribute;
      buffer.needsCommit = true;
    };
  },

  // 2 component per attribute
  function (buffer, view, vertexSizeInComponentType) {
    return function (index, component0, component1) {
      const i = index * vertexSizeInComponentType;
      view[i] = component0;
      view[i + 1] = component1;
      buffer.needsCommit = true;
    };
  },

  // 3 component per attribute
  function (buffer, view, vertexSizeInComponentType) {
    return function (index, component0, component1, component2) {
      const i = index * vertexSizeInComponentType;
      view[i] = component0;
      view[i + 1] = component1;
      view[i + 2] = component2;
      buffer.needsCommit = true;
    };
  },

  // 4 component per attribute
  function (buffer, view, vertexSizeInComponentType) {
    return function (index, component0, component1, component2, component3) {
      const i = index * vertexSizeInComponentType;
      view[i] = component0;
      view[i + 1] = component1;
      view[i + 2] = component2;
      view[i + 3] = component3;
      buffer.needsCommit = true;
    };
  },
];

VertexArrayFacade._appendWriters = function (writers, buffer) {
  const arrayViews = buffer.arrayViews;
  const length = arrayViews.length;
  for (let i = 0; i < length; ++i) {
    const arrayView = arrayViews[i];
    writers[arrayView.index] = createWriters[
      arrayView.componentsPerAttribute - 1
    ](buffer, arrayView.view, arrayView.vertexSizeInComponentType);
  }
};

VertexArrayFacade.prototype.commit = function (indexBuffer) {
  let recreateVA = false;

  const allBuffers = this._allBuffers;
  let buffer;
  let i;
  let length;

  for (i = 0, length = allBuffers.length; i < length; ++i) {
    buffer = allBuffers[i];
    recreateVA = commit(this, buffer) || recreateVA;
  }

  ///////////////////////////////////////////////////////////////////////

  if (recreateVA || !defined(this.va)) {
    destroyVA(this);
    const va = (this.va = []);

    const chunkSize = CesiumMath.SIXTY_FOUR_KILOBYTES - 4; // The 65535 index is reserved for primitive restart. Reserve the last 4 indices so that billboard quads are not broken up.
    const numberOfVertexArrays =
      defined(indexBuffer) && !this._instanced
        ? Math.ceil(this._size / chunkSize)
        : 1;
    for (let k = 0; k < numberOfVertexArrays; ++k) {
      let attributes = [];
      for (i = 0, length = allBuffers.length; i < length; ++i) {
        buffer = allBuffers[i];
        const offset = k * (buffer.vertexSizeInBytes * chunkSize);
        VertexArrayFacade._appendAttributes(
          attributes,
          buffer,
          offset,
          this._instanced
        );
      }

      attributes = attributes.concat(this._precreated);

      va.push({
        va: new VertexArray({
          context: this._context,
          attributes: attributes,
          indexBuffer: indexBuffer,
        }),
        indicesCount:
          1.5 *
          (k !== numberOfVertexArrays - 1 ? chunkSize : this._size % chunkSize),
        // TODO: not hardcode 1.5, this assumes 6 indices per 4 vertices (as for Billboard quads).
      });
    }
  }
};

function commit(vertexArrayFacade, buffer) {
  if (buffer.needsCommit && buffer.vertexSizeInBytes > 0) {
    buffer.needsCommit = false;

    const vertexBuffer = buffer.vertexBuffer;
    const vertexBufferSizeInBytes =
      vertexArrayFacade._size * buffer.vertexSizeInBytes;
    const vertexBufferDefined = defined(vertexBuffer);
    if (
      !vertexBufferDefined ||
      vertexBuffer.sizeInBytes < vertexBufferSizeInBytes
    ) {
      if (vertexBufferDefined) {
        vertexBuffer.destroy();
      }
      buffer.vertexBuffer = Buffer.createVertexBuffer({
        context: vertexArrayFacade._context,
        typedArray: buffer.arrayBuffer,
        usage: buffer.usage,
      });
      buffer.vertexBuffer.vertexArrayDestroyable = false;

      return true; // Created new vertex buffer
    }

    buffer.vertexBuffer.copyFromArrayView(buffer.arrayBuffer);
  }

  return false; // Did not create new vertex buffer
}

VertexArrayFacade._appendAttributes = function (
  attributes,
  buffer,
  vertexBufferOffset,
  instanced
) {
  const arrayViews = buffer.arrayViews;
  const length = arrayViews.length;
  for (let i = 0; i < length; ++i) {
    const view = arrayViews[i];

    attributes.push({
      index: view.index,
      enabled: view.enabled,
      componentsPerAttribute: view.componentsPerAttribute,
      componentDatatype: view.componentDatatype,
      normalize: view.normalize,
      vertexBuffer: buffer.vertexBuffer,
      offsetInBytes: vertexBufferOffset + view.offsetInBytes,
      strideInBytes: buffer.vertexSizeInBytes,
      instanceDivisor: instanced ? 1 : 0,
    });
  }
};

VertexArrayFacade.prototype.subCommit = function (
  offsetInVertices,
  lengthInVertices
) {
  //>>includeStart('debug', pragmas.debug);
  if (offsetInVertices < 0 || offsetInVertices >= this._size) {
    throw new DeveloperError(
      "offsetInVertices must be greater than or equal to zero and less than the vertex array size."
    );
  }
  if (offsetInVertices + lengthInVertices > this._size) {
    throw new DeveloperError(
      "offsetInVertices + lengthInVertices cannot exceed the vertex array size."
    );
  }
  //>>includeEnd('debug');

  const allBuffers = this._allBuffers;
  for (let i = 0, len = allBuffers.length; i < len; ++i) {
    subCommit(allBuffers[i], offsetInVertices, lengthInVertices);
  }
};

function subCommit(buffer, offsetInVertices, lengthInVertices) {
  if (buffer.needsCommit && buffer.vertexSizeInBytes > 0) {
    const byteOffset = buffer.vertexSizeInBytes * offsetInVertices;
    const byteLength = buffer.vertexSizeInBytes * lengthInVertices;

    // PERFORMANCE_IDEA: If we want to get really crazy, we could consider updating
    // individual attributes instead of the entire (sub-)vertex.
    //
    // PERFORMANCE_IDEA: Does creating the typed view add too much GC overhead?
    buffer.vertexBuffer.copyFromArrayView(
      new Uint8Array(buffer.arrayBuffer, byteOffset, byteLength),
      byteOffset
    );
  }
}

VertexArrayFacade.prototype.endSubCommits = function () {
  const allBuffers = this._allBuffers;

  for (let i = 0, len = allBuffers.length; i < len; ++i) {
    allBuffers[i].needsCommit = false;
  }
};

function destroyVA(vertexArrayFacade) {
  const va = vertexArrayFacade.va;
  if (!defined(va)) {
    return;
  }

  const length = va.length;
  for (let i = 0; i < length; ++i) {
    va[i].va.destroy();
  }

  vertexArrayFacade.va = undefined;
}

VertexArrayFacade.prototype.isDestroyed = function () {
  return false;
};

VertexArrayFacade.prototype.destroy = function () {
  const allBuffers = this._allBuffers;
  for (let i = 0, len = allBuffers.length; i < len; ++i) {
    const buffer = allBuffers[i];
    buffer.vertexBuffer = buffer.vertexBuffer && buffer.vertexBuffer.destroy();
  }

  destroyVA(this);

  return destroyObject(this);
};
export default VertexArrayFacade;
