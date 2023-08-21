import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import combine from "../Core/combine.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import PixelFormat from "../Core/PixelFormat.js";
import ContextLimits from "../Renderer/ContextLimits.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import Sampler from "../Renderer/Sampler.js";
import Texture from "../Renderer/Texture.js";

/**
 * Creates a texture to look up per instance attributes for batched primitives. For example, store each primitive's pick color in the texture.
 *
 * @alias BatchTable
 * @constructor
 * @private
 *
 * @param {Context} context The context in which the batch table is created.
 * @param {Object[]} attributes An array of objects describing a per instance attribute. Each object contains a datatype, components per attributes, whether it is normalized and a function name
 *     to retrieve the value in the vertex shader.
 * @param {number} numberOfInstances The number of instances in a batch table.
 *
 * @example
 * // create the batch table
 * const attributes = [{
 *     functionName : 'getShow',
 *     componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
 *     componentsPerAttribute : 1
 * }, {
 *     functionName : 'getPickColor',
 *     componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
 *     componentsPerAttribute : 4,
 *     normalize : true
 * }];
 * const batchTable = new BatchTable(context, attributes, 5);
 *
 * // when creating the draw commands, update the uniform map and the vertex shader
 * vertexShaderSource = batchTable.getVertexShaderCallback()(vertexShaderSource);
 * const shaderProgram = ShaderProgram.fromCache({
 *    // ...
 *    vertexShaderSource : vertexShaderSource,
 * });
 *
 * drawCommand.shaderProgram = shaderProgram;
 * drawCommand.uniformMap = batchTable.getUniformMapCallback()(uniformMap);
 *
 * // use the attribute function names in the shader to retrieve the instance values
 * // ...
 * attribute float batchId;
 *
 * void main() {
 *     // ...
 *     float show = getShow(batchId);
 *     vec3 pickColor = getPickColor(batchId);
 *     // ...
 * }
 */
function BatchTable(context, attributes, numberOfInstances) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(context)) {
    throw new DeveloperError("context is required");
  }
  if (!defined(attributes)) {
    throw new DeveloperError("attributes is required");
  }
  if (!defined(numberOfInstances)) {
    throw new DeveloperError("numberOfInstances is required");
  }
  //>>includeEnd('debug');

  this._attributes = attributes;
  this._numberOfInstances = numberOfInstances;

  if (attributes.length === 0) {
    return;
  }

  // PERFORMANCE_IDEA: We may be able to arrange the attributes so they can be packing into fewer texels.
  // Right now, an attribute with one component uses an entire texel when 4 single component attributes can
  // be packed into a texel.
  //
  // Packing floats into unsigned byte textures makes the problem worse. A single component float attribute
  // will be packed into a single texel leaving 3 texels unused. 4 texels are reserved for each float attribute
  // regardless of how many components it has.
  const pixelDatatype = getDatatype(attributes);
  const textureFloatSupported = context.floatingPointTexture;
  const packFloats =
    pixelDatatype === PixelDatatype.FLOAT && !textureFloatSupported;
  const offsets = createOffsets(attributes, packFloats);

  const stride = getStride(offsets, attributes, packFloats);
  const maxNumberOfInstancesPerRow = Math.floor(
    ContextLimits.maximumTextureSize / stride
  );

  const instancesPerWidth = Math.min(
    numberOfInstances,
    maxNumberOfInstancesPerRow
  );
  const width = stride * instancesPerWidth;
  const height = Math.ceil(numberOfInstances / instancesPerWidth);

  const stepX = 1.0 / width;
  const centerX = stepX * 0.5;
  const stepY = 1.0 / height;
  const centerY = stepY * 0.5;

  this._textureDimensions = new Cartesian2(width, height);
  this._textureStep = new Cartesian4(stepX, centerX, stepY, centerY);
  this._pixelDatatype = !packFloats
    ? pixelDatatype
    : PixelDatatype.UNSIGNED_BYTE;
  this._packFloats = packFloats;
  this._offsets = offsets;
  this._stride = stride;
  this._texture = undefined;

  const batchLength = 4 * width * height;
  this._batchValues =
    pixelDatatype === PixelDatatype.FLOAT && !packFloats
      ? new Float32Array(batchLength)
      : new Uint8Array(batchLength);
  this._batchValuesDirty = false;
}

Object.defineProperties(BatchTable.prototype, {
  /**
   * The attribute descriptions.
   * @memberOf BatchTable.prototype
   * @type {Object[]}
   * @readonly
   */
  attributes: {
    get: function () {
      return this._attributes;
    },
  },
  /**
   * The number of instances.
   * @memberOf BatchTable.prototype
   * @type {number}
   * @readonly
   */
  numberOfInstances: {
    get: function () {
      return this._numberOfInstances;
    },
  },
});

function getDatatype(attributes) {
  let foundFloatDatatype = false;
  const length = attributes.length;
  for (let i = 0; i < length; ++i) {
    if (attributes[i].componentDatatype !== ComponentDatatype.UNSIGNED_BYTE) {
      foundFloatDatatype = true;
      break;
    }
  }
  return foundFloatDatatype ? PixelDatatype.FLOAT : PixelDatatype.UNSIGNED_BYTE;
}

function getAttributeType(attributes, attributeIndex) {
  const componentsPerAttribute =
    attributes[attributeIndex].componentsPerAttribute;
  if (componentsPerAttribute === 2) {
    return Cartesian2;
  } else if (componentsPerAttribute === 3) {
    return Cartesian3;
  } else if (componentsPerAttribute === 4) {
    return Cartesian4;
  }
  return Number;
}

function createOffsets(attributes, packFloats) {
  const offsets = new Array(attributes.length);

  let currentOffset = 0;
  const attributesLength = attributes.length;
  for (let i = 0; i < attributesLength; ++i) {
    const attribute = attributes[i];
    const componentDatatype = attribute.componentDatatype;

    offsets[i] = currentOffset;

    if (componentDatatype !== ComponentDatatype.UNSIGNED_BYTE && packFloats) {
      currentOffset += 4;
    } else {
      ++currentOffset;
    }
  }

  return offsets;
}

function getStride(offsets, attributes, packFloats) {
  const length = offsets.length;
  const lastOffset = offsets[length - 1];
  const lastAttribute = attributes[length - 1];
  const componentDatatype = lastAttribute.componentDatatype;

  if (componentDatatype !== ComponentDatatype.UNSIGNED_BYTE && packFloats) {
    return lastOffset + 4;
  }
  return lastOffset + 1;
}

const scratchPackedFloatCartesian4 = new Cartesian4();

function getPackedFloat(array, index, result) {
  let packed = Cartesian4.unpack(array, index, scratchPackedFloatCartesian4);
  const x = Cartesian4.unpackFloat(packed);

  packed = Cartesian4.unpack(array, index + 4, scratchPackedFloatCartesian4);
  const y = Cartesian4.unpackFloat(packed);

  packed = Cartesian4.unpack(array, index + 8, scratchPackedFloatCartesian4);
  const z = Cartesian4.unpackFloat(packed);

  packed = Cartesian4.unpack(array, index + 12, scratchPackedFloatCartesian4);
  const w = Cartesian4.unpackFloat(packed);

  return Cartesian4.fromElements(x, y, z, w, result);
}

function setPackedAttribute(value, array, index) {
  let packed = Cartesian4.packFloat(value.x, scratchPackedFloatCartesian4);
  Cartesian4.pack(packed, array, index);

  packed = Cartesian4.packFloat(value.y, packed);
  Cartesian4.pack(packed, array, index + 4);

  packed = Cartesian4.packFloat(value.z, packed);
  Cartesian4.pack(packed, array, index + 8);

  packed = Cartesian4.packFloat(value.w, packed);
  Cartesian4.pack(packed, array, index + 12);
}

const scratchGetAttributeCartesian4 = new Cartesian4();

/**
 * Gets the value of an attribute in the table.
 *
 * @param {number} instanceIndex The index of the instance.
 * @param {number} attributeIndex The index of the attribute.
 * @param {undefined|Cartesian2|Cartesian3|Cartesian4} [result] The object onto which to store the result. The type is dependent on the attribute's number of components.
 * @returns {number|Cartesian2|Cartesian3|Cartesian4} The attribute value stored for the instance.
 *
 * @exception {DeveloperError} instanceIndex is out of range.
 * @exception {DeveloperError} attributeIndex is out of range.
 */
BatchTable.prototype.getBatchedAttribute = function (
  instanceIndex,
  attributeIndex,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  if (instanceIndex < 0 || instanceIndex >= this._numberOfInstances) {
    throw new DeveloperError("instanceIndex is out of range.");
  }
  if (attributeIndex < 0 || attributeIndex >= this._attributes.length) {
    throw new DeveloperError("attributeIndex is out of range");
  }
  //>>includeEnd('debug');

  const attributes = this._attributes;
  const offset = this._offsets[attributeIndex];
  const stride = this._stride;

  const index = 4 * stride * instanceIndex + 4 * offset;
  let value;

  if (
    this._packFloats &&
    attributes[attributeIndex].componentDatatype !== PixelDatatype.UNSIGNED_BYTE
  ) {
    value = getPackedFloat(
      this._batchValues,
      index,
      scratchGetAttributeCartesian4
    );
  } else {
    value = Cartesian4.unpack(
      this._batchValues,
      index,
      scratchGetAttributeCartesian4
    );
  }

  const attributeType = getAttributeType(attributes, attributeIndex);
  if (defined(attributeType.fromCartesian4)) {
    return attributeType.fromCartesian4(value, result);
  } else if (defined(attributeType.clone)) {
    return attributeType.clone(value, result);
  }

  return value.x;
};

const setAttributeScratchValues = [
  undefined,
  undefined,
  new Cartesian2(),
  new Cartesian3(),
  new Cartesian4(),
];
const setAttributeScratchCartesian4 = new Cartesian4();

/**
 * Sets the value of an attribute in the table.
 *
 * @param {number} instanceIndex The index of the instance.
 * @param {number} attributeIndex The index of the attribute.
 * @param {number|Cartesian2|Cartesian3|Cartesian4} value The value to be stored in the table. The type of value will depend on the number of components of the attribute.
 *
 * @exception {DeveloperError} instanceIndex is out of range.
 * @exception {DeveloperError} attributeIndex is out of range.
 */
BatchTable.prototype.setBatchedAttribute = function (
  instanceIndex,
  attributeIndex,
  value
) {
  //>>includeStart('debug', pragmas.debug);
  if (instanceIndex < 0 || instanceIndex >= this._numberOfInstances) {
    throw new DeveloperError("instanceIndex is out of range.");
  }
  if (attributeIndex < 0 || attributeIndex >= this._attributes.length) {
    throw new DeveloperError("attributeIndex is out of range");
  }
  if (!defined(value)) {
    throw new DeveloperError("value is required.");
  }
  //>>includeEnd('debug');

  const attributes = this._attributes;
  const result =
    setAttributeScratchValues[
      attributes[attributeIndex].componentsPerAttribute
    ];
  const currentAttribute = this.getBatchedAttribute(
    instanceIndex,
    attributeIndex,
    result
  );
  const attributeType = getAttributeType(this._attributes, attributeIndex);
  const entriesEqual = defined(attributeType.equals)
    ? attributeType.equals(currentAttribute, value)
    : currentAttribute === value;
  if (entriesEqual) {
    return;
  }

  const attributeValue = setAttributeScratchCartesian4;
  attributeValue.x = defined(value.x) ? value.x : value;
  attributeValue.y = defined(value.y) ? value.y : 0.0;
  attributeValue.z = defined(value.z) ? value.z : 0.0;
  attributeValue.w = defined(value.w) ? value.w : 0.0;

  const offset = this._offsets[attributeIndex];
  const stride = this._stride;
  const index = 4 * stride * instanceIndex + 4 * offset;

  if (
    this._packFloats &&
    attributes[attributeIndex].componentDatatype !== PixelDatatype.UNSIGNED_BYTE
  ) {
    setPackedAttribute(attributeValue, this._batchValues, index);
  } else {
    Cartesian4.pack(attributeValue, this._batchValues, index);
  }

  this._batchValuesDirty = true;
};

function createTexture(batchTable, context) {
  const dimensions = batchTable._textureDimensions;
  batchTable._texture = new Texture({
    context: context,
    pixelFormat: PixelFormat.RGBA,
    pixelDatatype: batchTable._pixelDatatype,
    width: dimensions.x,
    height: dimensions.y,
    sampler: Sampler.NEAREST,
    flipY: false,
  });
}

function updateTexture(batchTable) {
  const dimensions = batchTable._textureDimensions;
  batchTable._texture.copyFrom({
    source: {
      width: dimensions.x,
      height: dimensions.y,
      arrayBufferView: batchTable._batchValues,
    },
  });
}

/**
 * Creates/updates the batch table texture.
 * @param {FrameState} frameState The frame state.
 *
 * @exception {RuntimeError} The floating point texture extension is required but not supported.
 */
BatchTable.prototype.update = function (frameState) {
  if (
    (defined(this._texture) && !this._batchValuesDirty) ||
    this._attributes.length === 0
  ) {
    return;
  }

  this._batchValuesDirty = false;

  if (!defined(this._texture)) {
    createTexture(this, frameState.context);
  }
  updateTexture(this);
};

/**
 * Gets a function that will update a uniform map to contain values for looking up values in the batch table.
 *
 * @returns {BatchTable.updateUniformMapCallback} A callback for updating uniform maps.
 */
BatchTable.prototype.getUniformMapCallback = function () {
  const that = this;
  return function (uniformMap) {
    if (that._attributes.length === 0) {
      return uniformMap;
    }

    const batchUniformMap = {
      batchTexture: function () {
        return that._texture;
      },
      batchTextureDimensions: function () {
        return that._textureDimensions;
      },
      batchTextureStep: function () {
        return that._textureStep;
      },
    };
    return combine(uniformMap, batchUniformMap);
  };
};

function getGlslComputeSt(batchTable) {
  const stride = batchTable._stride;

  // GLSL batchId is zero-based: [0, numberOfInstances - 1]
  if (batchTable._textureDimensions.y === 1) {
    return (
      `${
        "uniform vec4 batchTextureStep; \n" +
        "vec2 computeSt(float batchId) \n" +
        "{ \n" +
        "    float stepX = batchTextureStep.x; \n" +
        "    float centerX = batchTextureStep.y; \n" +
        "    float numberOfAttributes = float("
      }${stride}); \n` +
      `    return vec2(centerX + (batchId * numberOfAttributes * stepX), 0.5); \n` +
      `} \n`
    );
  }

  return (
    `${
      "uniform vec4 batchTextureStep; \n" +
      "uniform vec2 batchTextureDimensions; \n" +
      "vec2 computeSt(float batchId) \n" +
      "{ \n" +
      "    float stepX = batchTextureStep.x; \n" +
      "    float centerX = batchTextureStep.y; \n" +
      "    float stepY = batchTextureStep.z; \n" +
      "    float centerY = batchTextureStep.w; \n" +
      "    float numberOfAttributes = float("
    }${stride}); \n` +
    `    float xId = mod(batchId * numberOfAttributes, batchTextureDimensions.x); \n` +
    `    float yId = floor(batchId * numberOfAttributes / batchTextureDimensions.x); \n` +
    `    return vec2(centerX + (xId * stepX), centerY + (yId * stepY)); \n` +
    `} \n`
  );
}

function getComponentType(componentsPerAttribute) {
  if (componentsPerAttribute === 1) {
    return "float";
  }
  return `vec${componentsPerAttribute}`;
}

function getComponentSwizzle(componentsPerAttribute) {
  if (componentsPerAttribute === 1) {
    return ".x";
  } else if (componentsPerAttribute === 2) {
    return ".xy";
  } else if (componentsPerAttribute === 3) {
    return ".xyz";
  }
  return "";
}

function getGlslAttributeFunction(batchTable, attributeIndex) {
  const attributes = batchTable._attributes;
  const attribute = attributes[attributeIndex];
  const componentsPerAttribute = attribute.componentsPerAttribute;
  const functionName = attribute.functionName;
  const functionReturnType = getComponentType(componentsPerAttribute);
  const functionReturnValue = getComponentSwizzle(componentsPerAttribute);

  const offset = batchTable._offsets[attributeIndex];

  let glslFunction =
    `${functionReturnType} ${functionName}(float batchId) \n` +
    `{ \n` +
    `    vec2 st = computeSt(batchId); \n` +
    `    st.x += batchTextureStep.x * float(${offset}); \n`;

  if (
    batchTable._packFloats &&
    attribute.componentDatatype !== PixelDatatype.UNSIGNED_BYTE
  ) {
    glslFunction +=
      "vec4 textureValue; \n" +
      "textureValue.x = czm_unpackFloat(texture(batchTexture, st)); \n" +
      "textureValue.y = czm_unpackFloat(texture(batchTexture, st + vec2(batchTextureStep.x, 0.0))); \n" +
      "textureValue.z = czm_unpackFloat(texture(batchTexture, st + vec2(batchTextureStep.x * 2.0, 0.0))); \n" +
      "textureValue.w = czm_unpackFloat(texture(batchTexture, st + vec2(batchTextureStep.x * 3.0, 0.0))); \n";
  } else {
    glslFunction += "    vec4 textureValue = texture(batchTexture, st); \n";
  }

  glslFunction += `    ${functionReturnType} value = textureValue${functionReturnValue}; \n`;

  if (
    batchTable._pixelDatatype === PixelDatatype.UNSIGNED_BYTE &&
    attribute.componentDatatype === ComponentDatatype.UNSIGNED_BYTE &&
    !attribute.normalize
  ) {
    glslFunction += "value *= 255.0; \n";
  } else if (
    batchTable._pixelDatatype === PixelDatatype.FLOAT &&
    attribute.componentDatatype === ComponentDatatype.UNSIGNED_BYTE &&
    attribute.normalize
  ) {
    glslFunction += "value /= 255.0; \n";
  }

  glslFunction += "    return value; \n" + "} \n";
  return glslFunction;
}

/**
 * Gets a function that will update a vertex shader to contain functions for looking up values in the batch table.
 *
 * @returns {BatchTable.updateVertexShaderSourceCallback} A callback for updating a vertex shader source.
 */
BatchTable.prototype.getVertexShaderCallback = function () {
  const attributes = this._attributes;
  if (attributes.length === 0) {
    return function (source) {
      return source;
    };
  }

  let batchTableShader = "uniform highp sampler2D batchTexture; \n";
  batchTableShader += `${getGlslComputeSt(this)}\n`;

  const length = attributes.length;
  for (let i = 0; i < length; ++i) {
    batchTableShader += getGlslAttributeFunction(this, i);
  }

  return function (source) {
    const mainIndex = source.indexOf("void main");
    const beforeMain = source.substring(0, mainIndex);
    const afterMain = source.substring(mainIndex);
    return `${beforeMain}\n${batchTableShader}\n${afterMain}`;
  };
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see BatchTable#destroy
 */
BatchTable.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @see BatchTable#isDestroyed
 */
BatchTable.prototype.destroy = function () {
  this._texture = this._texture && this._texture.destroy();
  return destroyObject(this);
};

/**
 * A callback for updating uniform maps.
 * @callback BatchTable.updateUniformMapCallback
 *
 * @param {object} uniformMap The uniform map.
 * @returns {object} The new uniform map with properties for retrieving values from the batch table.
 */

/**
 * A callback for updating a vertex shader source.
 * @callback BatchTable.updateVertexShaderSourceCallback
 *
 * @param {string} vertexShaderSource The vertex shader source.
 * @returns {string} The new vertex shader source with the functions for retrieving batch table values injected.
 */
export default BatchTable;
