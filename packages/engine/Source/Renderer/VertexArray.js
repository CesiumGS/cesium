import Check from "../Core/Check.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Geometry from "../Core/Geometry.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import CesiumMath from "../Core/Math.js";
import RuntimeError from "../Core/RuntimeError.js";
import Buffer from "./Buffer.js";
import BufferUsage from "./BufferUsage.js";
import ContextLimits from "./ContextLimits.js";

function addAttribute(attributes, attribute, index, context) {
  const hasVertexBuffer = defined(attribute.vertexBuffer);
  const hasValue = defined(attribute.value);
  const componentsPerAttribute = attribute.value
    ? attribute.value.length
    : attribute.componentsPerAttribute;

  //>>includeStart('debug', pragmas.debug);
  if (!hasVertexBuffer && !hasValue) {
    throw new DeveloperError("attribute must have a vertexBuffer or a value.");
  }
  if (hasVertexBuffer && hasValue) {
    throw new DeveloperError(
      "attribute cannot have both a vertexBuffer and a value.  It must have either a vertexBuffer property defining per-vertex data or a value property defining data for all vertices."
    );
  }
  if (
    componentsPerAttribute !== 1 &&
    componentsPerAttribute !== 2 &&
    componentsPerAttribute !== 3 &&
    componentsPerAttribute !== 4
  ) {
    if (hasValue) {
      throw new DeveloperError(
        "attribute.value.length must be in the range [1, 4]."
      );
    }

    throw new DeveloperError(
      "attribute.componentsPerAttribute must be in the range [1, 4]."
    );
  }
  if (
    defined(attribute.componentDatatype) &&
    !ComponentDatatype.validate(attribute.componentDatatype)
  ) {
    throw new DeveloperError(
      "attribute must have a valid componentDatatype or not specify it."
    );
  }
  if (defined(attribute.strideInBytes) && attribute.strideInBytes > 255) {
    // WebGL limit.  Not in GL ES.
    throw new DeveloperError(
      "attribute must have a strideInBytes less than or equal to 255 or not specify it."
    );
  }
  if (
    defined(attribute.instanceDivisor) &&
    attribute.instanceDivisor > 0 &&
    !context.instancedArrays
  ) {
    throw new DeveloperError("instanced arrays is not supported");
  }
  if (defined(attribute.instanceDivisor) && attribute.instanceDivisor < 0) {
    throw new DeveloperError(
      "attribute must have an instanceDivisor greater than or equal to zero"
    );
  }
  if (defined(attribute.instanceDivisor) && hasValue) {
    throw new DeveloperError(
      "attribute cannot have have an instanceDivisor if it is not backed by a buffer"
    );
  }
  if (
    defined(attribute.instanceDivisor) &&
    attribute.instanceDivisor > 0 &&
    attribute.index === 0
  ) {
    throw new DeveloperError(
      "attribute zero cannot have an instanceDivisor greater than 0"
    );
  }
  //>>includeEnd('debug');

  // Shallow copy the attribute; we do not want to copy the vertex buffer.
  const attr = {
    index: defaultValue(attribute.index, index),
    enabled: defaultValue(attribute.enabled, true),
    vertexBuffer: attribute.vertexBuffer,
    value: hasValue ? attribute.value.slice(0) : undefined,
    componentsPerAttribute: componentsPerAttribute,
    componentDatatype: defaultValue(
      attribute.componentDatatype,
      ComponentDatatype.FLOAT
    ),
    normalize: defaultValue(attribute.normalize, false),
    offsetInBytes: defaultValue(attribute.offsetInBytes, 0),
    strideInBytes: defaultValue(attribute.strideInBytes, 0),
    instanceDivisor: defaultValue(attribute.instanceDivisor, 0),
  };

  if (hasVertexBuffer) {
    // Common case: vertex buffer for per-vertex data
    attr.vertexAttrib = function (gl) {
      const index = this.index;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer._getBuffer());
      gl.vertexAttribPointer(
        index,
        this.componentsPerAttribute,
        this.componentDatatype,
        this.normalize,
        this.strideInBytes,
        this.offsetInBytes
      );
      gl.enableVertexAttribArray(index);
      if (this.instanceDivisor > 0) {
        context.glVertexAttribDivisor(index, this.instanceDivisor);
        context._vertexAttribDivisors[index] = this.instanceDivisor;
        context._previousDrawInstanced = true;
      }
    };

    attr.disableVertexAttribArray = function (gl) {
      gl.disableVertexAttribArray(this.index);
      if (this.instanceDivisor > 0) {
        context.glVertexAttribDivisor(index, 0);
      }
    };
  } else {
    // Less common case: value array for the same data for each vertex
    switch (attr.componentsPerAttribute) {
      case 1:
        attr.vertexAttrib = function (gl) {
          gl.vertexAttrib1fv(this.index, this.value);
        };
        break;
      case 2:
        attr.vertexAttrib = function (gl) {
          gl.vertexAttrib2fv(this.index, this.value);
        };
        break;
      case 3:
        attr.vertexAttrib = function (gl) {
          gl.vertexAttrib3fv(this.index, this.value);
        };
        break;
      case 4:
        attr.vertexAttrib = function (gl) {
          gl.vertexAttrib4fv(this.index, this.value);
        };
        break;
    }

    attr.disableVertexAttribArray = function (gl) {};
  }

  attributes.push(attr);
}

function bind(gl, attributes, indexBuffer) {
  for (let i = 0; i < attributes.length; ++i) {
    const attribute = attributes[i];
    if (attribute.enabled) {
      attribute.vertexAttrib(gl);
    }
  }

  if (defined(indexBuffer)) {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer._getBuffer());
  }
}

/**
 * Creates a vertex array, which defines the attributes making up a vertex, and contains an optional index buffer
 * to select vertices for rendering.  Attributes are defined using object literals as shown in Example 1 below.
 *
 * @param {object} options Object with the following properties:
 * @param {Context} options.context The context in which the VertexArray gets created.
 * @param {Object[]} options.attributes An array of attributes.
 * @param {IndexBuffer} [options.indexBuffer] An optional index buffer.
 *
 * @returns {VertexArray} The vertex array, ready for use with drawing.
 *
 * @exception {DeveloperError} Attribute must have a <code>vertexBuffer</code>.
 * @exception {DeveloperError} Attribute must have a <code>componentsPerAttribute</code>.
 * @exception {DeveloperError} Attribute must have a valid <code>componentDatatype</code> or not specify it.
 * @exception {DeveloperError} Attribute must have a <code>strideInBytes</code> less than or equal to 255 or not specify it.
 * @exception {DeveloperError} Index n is used by more than one attribute.
 *
 *
 * @example
 * // Example 1. Create a vertex array with vertices made up of three floating point
 * // values, e.g., a position, from a single vertex buffer.  No index buffer is used.
 * const positionBuffer = Buffer.createVertexBuffer({
 *     context : context,
 *     sizeInBytes : 12,
 *     usage : BufferUsage.STATIC_DRAW
 * });
 * const attributes = [
 *     {
 *         index                  : 0,
 *         enabled                : true,
 *         vertexBuffer           : positionBuffer,
 *         componentsPerAttribute : 3,
 *         componentDatatype      : ComponentDatatype.FLOAT,
 *         normalize              : false,
 *         offsetInBytes          : 0,
 *         strideInBytes          : 0 // tightly packed
 *         instanceDivisor        : 0 // not instanced
 *     }
 * ];
 * const va = new VertexArray({
 *     context : context,
 *     attributes : attributes
 * });
 *
 * @example
 * // Example 2. Create a vertex array with vertices from two different vertex buffers.
 * // Each vertex has a three-component position and three-component normal.
 * const positionBuffer = Buffer.createVertexBuffer({
 *     context : context,
 *     sizeInBytes : 12,
 *     usage : BufferUsage.STATIC_DRAW
 * });
 * const normalBuffer = Buffer.createVertexBuffer({
 *     context : context,
 *     sizeInBytes : 12,
 *     usage : BufferUsage.STATIC_DRAW
 * });
 * const attributes = [
 *     {
 *         index                  : 0,
 *         vertexBuffer           : positionBuffer,
 *         componentsPerAttribute : 3,
 *         componentDatatype      : ComponentDatatype.FLOAT
 *     },
 *     {
 *         index                  : 1,
 *         vertexBuffer           : normalBuffer,
 *         componentsPerAttribute : 3,
 *         componentDatatype      : ComponentDatatype.FLOAT
 *     }
 * ];
 * const va = new VertexArray({
 *     context : context,
 *     attributes : attributes
 * });
 *
 * @example
 * // Example 3. Creates the same vertex layout as Example 2 using a single
 * // vertex buffer, instead of two.
 * const buffer = Buffer.createVertexBuffer({
 *     context : context,
 *     sizeInBytes : 24,
 *     usage : BufferUsage.STATIC_DRAW
 * });
 * const attributes = [
 *     {
 *         vertexBuffer           : buffer,
 *         componentsPerAttribute : 3,
 *         componentDatatype      : ComponentDatatype.FLOAT,
 *         offsetInBytes          : 0,
 *         strideInBytes          : 24
 *     },
 *     {
 *         vertexBuffer           : buffer,
 *         componentsPerAttribute : 3,
 *         componentDatatype      : ComponentDatatype.FLOAT,
 *         normalize              : true,
 *         offsetInBytes          : 12,
 *         strideInBytes          : 24
 *     }
 * ];
 * const va = new VertexArray({
 *     context : context,
 *     attributes : attributes
 * });
 *
 * @see Buffer#createVertexBuffer
 * @see Buffer#createIndexBuffer
 * @see Context#draw
 *
 * @private
 */
function VertexArray(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.context", options.context);
  Check.defined("options.attributes", options.attributes);
  //>>includeEnd('debug');

  const context = options.context;
  const gl = context._gl;
  const attributes = options.attributes;
  const indexBuffer = options.indexBuffer;

  let i;
  const vaAttributes = [];
  let numberOfVertices = 1; // if every attribute is backed by a single value
  let hasInstancedAttributes = false;
  let hasConstantAttributes = false;

  let length = attributes.length;
  for (i = 0; i < length; ++i) {
    addAttribute(vaAttributes, attributes[i], i, context);
  }

  length = vaAttributes.length;
  for (i = 0; i < length; ++i) {
    const attribute = vaAttributes[i];

    if (defined(attribute.vertexBuffer) && attribute.instanceDivisor === 0) {
      // This assumes that each vertex buffer in the vertex array has the same number of vertices.
      const bytes =
        attribute.strideInBytes ||
        attribute.componentsPerAttribute *
          ComponentDatatype.getSizeInBytes(attribute.componentDatatype);
      numberOfVertices = attribute.vertexBuffer.sizeInBytes / bytes;
      break;
    }
  }

  for (i = 0; i < length; ++i) {
    if (vaAttributes[i].instanceDivisor > 0) {
      hasInstancedAttributes = true;
    }
    if (defined(vaAttributes[i].value)) {
      hasConstantAttributes = true;
    }
  }

  //>>includeStart('debug', pragmas.debug);
  // Verify all attribute names are unique
  const uniqueIndices = {};
  for (i = 0; i < length; ++i) {
    const index = vaAttributes[i].index;
    if (uniqueIndices[index]) {
      throw new DeveloperError(
        `Index ${index} is used by more than one attribute.`
      );
    }
    uniqueIndices[index] = true;
  }
  //>>includeEnd('debug');

  let vao;

  // Setup VAO if supported
  if (context.vertexArrayObject) {
    vao = context.glCreateVertexArray();
    context.glBindVertexArray(vao);
    bind(gl, vaAttributes, indexBuffer);
    context.glBindVertexArray(null);
  }

  this._numberOfVertices = numberOfVertices;
  this._hasInstancedAttributes = hasInstancedAttributes;
  this._hasConstantAttributes = hasConstantAttributes;
  this._context = context;
  this._gl = gl;
  this._vao = vao;
  this._attributes = vaAttributes;
  this._indexBuffer = indexBuffer;
}

function computeNumberOfVertices(attribute) {
  return attribute.values.length / attribute.componentsPerAttribute;
}

function computeAttributeSizeInBytes(attribute) {
  return (
    ComponentDatatype.getSizeInBytes(attribute.componentDatatype) *
    attribute.componentsPerAttribute
  );
}

function interleaveAttributes(attributes) {
  let j;
  let name;
  let attribute;

  // Extract attribute names.
  const names = [];
  for (name in attributes) {
    // Attribute needs to have per-vertex values; not a constant value for all vertices.
    if (
      attributes.hasOwnProperty(name) &&
      defined(attributes[name]) &&
      defined(attributes[name].values)
    ) {
      names.push(name);

      if (attributes[name].componentDatatype === ComponentDatatype.DOUBLE) {
        attributes[name].componentDatatype = ComponentDatatype.FLOAT;
        attributes[name].values = ComponentDatatype.createTypedArray(
          ComponentDatatype.FLOAT,
          attributes[name].values
        );
      }
    }
  }

  // Validation.  Compute number of vertices.
  let numberOfVertices;
  const namesLength = names.length;

  if (namesLength > 0) {
    numberOfVertices = computeNumberOfVertices(attributes[names[0]]);

    for (j = 1; j < namesLength; ++j) {
      const currentNumberOfVertices = computeNumberOfVertices(
        attributes[names[j]]
      );

      if (currentNumberOfVertices !== numberOfVertices) {
        throw new RuntimeError(
          `${
            "Each attribute list must have the same number of vertices.  " +
            "Attribute "
          }${names[j]} has a different number of vertices ` +
            `(${currentNumberOfVertices.toString()})` +
            ` than attribute ${names[0]} (${numberOfVertices.toString()}).`
        );
      }
    }
  }

  // Sort attributes by the size of their components.  From left to right, a vertex stores floats, shorts, and then bytes.
  names.sort(function (left, right) {
    return (
      ComponentDatatype.getSizeInBytes(attributes[right].componentDatatype) -
      ComponentDatatype.getSizeInBytes(attributes[left].componentDatatype)
    );
  });

  // Compute sizes and strides.
  let vertexSizeInBytes = 0;
  const offsetsInBytes = {};

  for (j = 0; j < namesLength; ++j) {
    name = names[j];
    attribute = attributes[name];

    offsetsInBytes[name] = vertexSizeInBytes;
    vertexSizeInBytes += computeAttributeSizeInBytes(attribute);
  }

  if (vertexSizeInBytes > 0) {
    // Pad each vertex to be a multiple of the largest component datatype so each
    // attribute can be addressed using typed arrays.
    const maxComponentSizeInBytes = ComponentDatatype.getSizeInBytes(
      attributes[names[0]].componentDatatype
    ); // Sorted large to small
    const remainder = vertexSizeInBytes % maxComponentSizeInBytes;
    if (remainder !== 0) {
      vertexSizeInBytes += maxComponentSizeInBytes - remainder;
    }

    // Total vertex buffer size in bytes, including per-vertex padding.
    const vertexBufferSizeInBytes = numberOfVertices * vertexSizeInBytes;

    // Create array for interleaved vertices.  Each attribute has a different view (pointer) into the array.
    const buffer = new ArrayBuffer(vertexBufferSizeInBytes);
    const views = {};

    for (j = 0; j < namesLength; ++j) {
      name = names[j];
      const sizeInBytes = ComponentDatatype.getSizeInBytes(
        attributes[name].componentDatatype
      );

      views[name] = {
        pointer: ComponentDatatype.createTypedArray(
          attributes[name].componentDatatype,
          buffer
        ),
        index: offsetsInBytes[name] / sizeInBytes, // Offset in ComponentType
        strideInComponentType: vertexSizeInBytes / sizeInBytes,
      };
    }

    // Copy attributes into one interleaved array.
    // PERFORMANCE_IDEA:  Can we optimize these loops?
    for (j = 0; j < numberOfVertices; ++j) {
      for (let n = 0; n < namesLength; ++n) {
        name = names[n];
        attribute = attributes[name];
        const values = attribute.values;
        const view = views[name];
        const pointer = view.pointer;

        const numberOfComponents = attribute.componentsPerAttribute;
        for (let k = 0; k < numberOfComponents; ++k) {
          pointer[view.index + k] = values[j * numberOfComponents + k];
        }

        view.index += view.strideInComponentType;
      }
    }

    return {
      buffer: buffer,
      offsetsInBytes: offsetsInBytes,
      vertexSizeInBytes: vertexSizeInBytes,
    };
  }

  // No attributes to interleave.
  return undefined;
}

/**
 * Creates a vertex array from a geometry.  A geometry contains vertex attributes and optional index data
 * in system memory, whereas a vertex array contains vertex buffers and an optional index buffer in WebGL
 * memory for use with rendering.
 * <br /><br />
 * The <code>geometry</code> argument should use the standard layout like the geometry returned by {@link BoxGeometry}.
 * <br /><br />
 * <code>options</code> can have four properties:
 * <ul>
 *   <li><code>geometry</code>:  The source geometry containing data used to create the vertex array.</li>
 *   <li><code>attributeLocations</code>:  An object that maps geometry attribute names to vertex shader attribute locations.</li>
 *   <li><code>bufferUsage</code>:  The expected usage pattern of the vertex array's buffers.  On some WebGL implementations, this can significantly affect performance.  See {@link BufferUsage}.  Default: <code>BufferUsage.DYNAMIC_DRAW</code>.</li>
 *   <li><code>interleave</code>:  Determines if all attributes are interleaved in a single vertex buffer or if each attribute is stored in a separate vertex buffer.  Default: <code>false</code>.</li>
 * </ul>
 * <br />
 * If <code>options</code> is not specified or the <code>geometry</code> contains no data, the returned vertex array is empty.
 *
 * @param {object} options An object defining the geometry, attribute indices, buffer usage, and vertex layout used to create the vertex array.
 *
 * @exception {RuntimeError} Each attribute list must have the same number of vertices.
 * @exception {DeveloperError} The geometry must have zero or one index lists.
 * @exception {DeveloperError} Index n is used by more than one attribute.
 *
 *
 * @example
 * // Example 1. Creates a vertex array for rendering a box.  The default dynamic draw
 * // usage is used for the created vertex and index buffer.  The attributes are not
 * // interleaved by default.
 * const geometry = new BoxGeometry();
 * const va = VertexArray.fromGeometry({
 *     context            : context,
 *     geometry           : geometry,
 *     attributeLocations : GeometryPipeline.createAttributeLocations(geometry),
 * });
 *
 * @example
 * // Example 2. Creates a vertex array with interleaved attributes in a
 * // single vertex buffer.  The vertex and index buffer have static draw usage.
 * const va = VertexArray.fromGeometry({
 *     context            : context,
 *     geometry           : geometry,
 *     attributeLocations : GeometryPipeline.createAttributeLocations(geometry),
 *     bufferUsage        : BufferUsage.STATIC_DRAW,
 *     interleave         : true
 * });
 *
 * @example
 * // Example 3.  When the caller destroys the vertex array, it also destroys the
 * // attached vertex buffer(s) and index buffer.
 * va = va.destroy();
 *
 * @see Buffer#createVertexBuffer
 * @see Buffer#createIndexBuffer
 * @see GeometryPipeline.createAttributeLocations
 * @see ShaderProgram
 */
VertexArray.fromGeometry = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.context", options.context);
  //>>includeEnd('debug');

  const context = options.context;
  const geometry = defaultValue(options.geometry, defaultValue.EMPTY_OBJECT);

  const bufferUsage = defaultValue(
    options.bufferUsage,
    BufferUsage.DYNAMIC_DRAW
  );

  const attributeLocations = defaultValue(
    options.attributeLocations,
    defaultValue.EMPTY_OBJECT
  );
  const interleave = defaultValue(options.interleave, false);
  const createdVAAttributes = options.vertexArrayAttributes;

  let name;
  let attribute;
  let vertexBuffer;
  const vaAttributes = defined(createdVAAttributes) ? createdVAAttributes : [];
  const attributes = geometry.attributes;

  if (interleave) {
    // Use a single vertex buffer with interleaved vertices.
    const interleavedAttributes = interleaveAttributes(attributes);
    if (defined(interleavedAttributes)) {
      vertexBuffer = Buffer.createVertexBuffer({
        context: context,
        typedArray: interleavedAttributes.buffer,
        usage: bufferUsage,
      });
      const offsetsInBytes = interleavedAttributes.offsetsInBytes;
      const strideInBytes = interleavedAttributes.vertexSizeInBytes;

      for (name in attributes) {
        if (attributes.hasOwnProperty(name) && defined(attributes[name])) {
          attribute = attributes[name];

          if (defined(attribute.values)) {
            // Common case: per-vertex attributes
            vaAttributes.push({
              index: attributeLocations[name],
              vertexBuffer: vertexBuffer,
              componentDatatype: attribute.componentDatatype,
              componentsPerAttribute: attribute.componentsPerAttribute,
              normalize: attribute.normalize,
              offsetInBytes: offsetsInBytes[name],
              strideInBytes: strideInBytes,
            });
          } else {
            // Constant attribute for all vertices
            vaAttributes.push({
              index: attributeLocations[name],
              value: attribute.value,
              componentDatatype: attribute.componentDatatype,
              normalize: attribute.normalize,
            });
          }
        }
      }
    }
  } else {
    // One vertex buffer per attribute.
    for (name in attributes) {
      if (attributes.hasOwnProperty(name) && defined(attributes[name])) {
        attribute = attributes[name];

        let componentDatatype = attribute.componentDatatype;
        if (componentDatatype === ComponentDatatype.DOUBLE) {
          componentDatatype = ComponentDatatype.FLOAT;
        }

        vertexBuffer = undefined;
        if (defined(attribute.values)) {
          vertexBuffer = Buffer.createVertexBuffer({
            context: context,
            typedArray: ComponentDatatype.createTypedArray(
              componentDatatype,
              attribute.values
            ),
            usage: bufferUsage,
          });
        }

        vaAttributes.push({
          index: attributeLocations[name],
          vertexBuffer: vertexBuffer,
          value: attribute.value,
          componentDatatype: componentDatatype,
          componentsPerAttribute: attribute.componentsPerAttribute,
          normalize: attribute.normalize,
        });
      }
    }
  }

  let indexBuffer;
  const indices = geometry.indices;
  if (defined(indices)) {
    if (
      Geometry.computeNumberOfVertices(geometry) >=
        CesiumMath.SIXTY_FOUR_KILOBYTES &&
      context.elementIndexUint
    ) {
      indexBuffer = Buffer.createIndexBuffer({
        context: context,
        typedArray: new Uint32Array(indices),
        usage: bufferUsage,
        indexDatatype: IndexDatatype.UNSIGNED_INT,
      });
    } else {
      indexBuffer = Buffer.createIndexBuffer({
        context: context,
        typedArray: new Uint16Array(indices),
        usage: bufferUsage,
        indexDatatype: IndexDatatype.UNSIGNED_SHORT,
      });
    }
  }

  return new VertexArray({
    context: context,
    attributes: vaAttributes,
    indexBuffer: indexBuffer,
  });
};

Object.defineProperties(VertexArray.prototype, {
  numberOfAttributes: {
    get: function () {
      return this._attributes.length;
    },
  },
  numberOfVertices: {
    get: function () {
      return this._numberOfVertices;
    },
  },
  indexBuffer: {
    get: function () {
      return this._indexBuffer;
    },
  },
});

/**
 * index is the location in the array of attributes, not the index property of an attribute.
 */
VertexArray.prototype.getAttribute = function (index) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("index", index);
  //>>includeEnd('debug');

  return this._attributes[index];
};

// Workaround for ANGLE, where the attribute divisor seems to be part of the global state instead
// of the VAO state. This function is called when the vao is bound, and should be removed
// once the ANGLE issue is resolved. Setting the divisor should normally happen in vertexAttrib and
// disableVertexAttribArray.
function setVertexAttribDivisor(vertexArray) {
  const context = vertexArray._context;
  const hasInstancedAttributes = vertexArray._hasInstancedAttributes;
  if (!hasInstancedAttributes && !context._previousDrawInstanced) {
    return;
  }
  context._previousDrawInstanced = hasInstancedAttributes;

  const divisors = context._vertexAttribDivisors;
  const attributes = vertexArray._attributes;
  const maxAttributes = ContextLimits.maximumVertexAttributes;
  let i;

  if (hasInstancedAttributes) {
    const length = attributes.length;
    for (i = 0; i < length; ++i) {
      const attribute = attributes[i];
      if (attribute.enabled) {
        const divisor = attribute.instanceDivisor;
        const index = attribute.index;
        if (divisor !== divisors[index]) {
          context.glVertexAttribDivisor(index, divisor);
          divisors[index] = divisor;
        }
      }
    }
  } else {
    for (i = 0; i < maxAttributes; ++i) {
      if (divisors[i] > 0) {
        context.glVertexAttribDivisor(i, 0);
        divisors[i] = 0;
      }
    }
  }
}

// Vertex attributes backed by a constant value go through vertexAttrib[1234]f[v]
// which is part of context state rather than VAO state.
function setConstantAttributes(vertexArray, gl) {
  const attributes = vertexArray._attributes;
  const length = attributes.length;
  for (let i = 0; i < length; ++i) {
    const attribute = attributes[i];
    if (attribute.enabled && defined(attribute.value)) {
      attribute.vertexAttrib(gl);
    }
  }
}

VertexArray.prototype._bind = function () {
  if (defined(this._vao)) {
    this._context.glBindVertexArray(this._vao);
    if (this._context.instancedArrays) {
      setVertexAttribDivisor(this);
    }
    if (this._hasConstantAttributes) {
      setConstantAttributes(this, this._gl);
    }
  } else {
    bind(this._gl, this._attributes, this._indexBuffer);
  }
};

VertexArray.prototype._unBind = function () {
  if (defined(this._vao)) {
    this._context.glBindVertexArray(null);
  } else {
    const attributes = this._attributes;
    const gl = this._gl;

    for (let i = 0; i < attributes.length; ++i) {
      const attribute = attributes[i];
      if (attribute.enabled) {
        attribute.disableVertexAttribArray(gl);
      }
    }
    if (this._indexBuffer) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }
  }
};

VertexArray.prototype.isDestroyed = function () {
  return false;
};

VertexArray.prototype.destroy = function () {
  const attributes = this._attributes;
  for (let i = 0; i < attributes.length; ++i) {
    const vertexBuffer = attributes[i].vertexBuffer;
    if (
      defined(vertexBuffer) &&
      !vertexBuffer.isDestroyed() &&
      vertexBuffer.vertexArrayDestroyable
    ) {
      vertexBuffer.destroy();
    }
  }

  const indexBuffer = this._indexBuffer;
  if (
    defined(indexBuffer) &&
    !indexBuffer.isDestroyed() &&
    indexBuffer.vertexArrayDestroyable
  ) {
    indexBuffer.destroy();
  }

  if (defined(this._vao)) {
    this._context.glDeleteVertexArray(this._vao);
  }

  return destroyObject(this);
};
export default VertexArray;
