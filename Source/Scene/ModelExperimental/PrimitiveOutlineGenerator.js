import Check from "../../Core/Check.js";
import defined from "../../Core/defined.js";
import defaultValue from "../../Core/defaultValue.js";
import PixelFormat from "../../Core/PixelFormat.js";
import ContextLimits from "../../Renderer/ContextLimits.js";
import Sampler from "../../Renderer/Sampler.js";
import Texture from "../../Renderer/Texture.js";
import TextureMagnificationFilter from "../../Renderer/TextureMagnificationFilter.js";
import TextureMinificationFilter from "../../Renderer/TextureMinificationFilter.js";
import TextureWrap from "../../Renderer/TextureWrap.js";

// glTF does not allow an index value of 65535 because this is the primitive
// restart value in some APIs.
const MAX_GLTF_UINT16_INDEX = 65534;
const MAX_GLTF_UINT8_INDEX = 255;

/**
 * A class to handle the low-level details of processing indices and vertex
 * attributes for the CESIUM_primitive_outline extension
 *
 * @alias PrimitiveOutlineGenerator
 * @constructor
 *
 * @param {Number} options Object with the following properties:
 * @param {Float8Array|Float16Array|Float32Array} options.triangleIndices The original triangle indices of the primitive. The constructor takes ownership of this typed array as it will be modified internally. Use the updatedTriangleIndices getter to get the final result.
 * @param {Number[]} options.outlineIndices The indices of edges in the triangle from the CESIUM_primitive_outline extension
 * @param {Number} options.originalVertexCount The original number of vertices in the primitive
 */
export default function PrimitiveOutlineGenerator(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const triangleIndices = options.triangleIndices;
  const outlineIndices = options.outlineIndices;
  const originalVertexCount = options.originalVertexCount;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.triangleIndices", triangleIndices);
  Check.typeOf.object("options.outlineIndices", outlineIndices);
  Check.typeOf.number("options.originalVertexCount", originalVertexCount);
  //>>includeEnd('debug');

  this._triangleIndices = triangleIndices;

  this._originalVertexCount = originalVertexCount;
  this._edges = new EdgeSet(outlineIndices, originalVertexCount);

  this._vertexCopies = {};
  this._outlineCoordinatesTypedArray = undefined;
  this._extraVertices = [];

  initialize(this);
}

Object.defineProperties(PrimitiveOutlineGenerator.prototype, {
  updatedTriangleIndices: {
    get: function () {
      return this._triangleIndices;
    },
  },

  outlineCoordinates: {
    get: function () {
      return this._outlineCoordinatesTypedArray;
    },
  },
});

function initialize(outlineGenerator) {
  // triangle indices may be extended from 16-bits to 32 bits if needed.
  let triangleIndices = outlineGenerator._triangleIndices;

  const edges = outlineGenerator._edges;
  const outlineCoordinates = [];
  const vertexCopies = outlineGenerator._vertexCopies;
  const extraVertices = outlineGenerator._extraVertices;
  const vertexCount = outlineGenerator._originalVertexCount;

  // For each triangle, adjust vertex data so that the correct edges are outlined.
  for (let i = 0; i < triangleIndices.length; i += 3) {
    let i0 = triangleIndices[i];
    let i1 = triangleIndices[i + 1];
    let i2 = triangleIndices[i + 2];

    const all = false; // set this to true to draw a full wireframe.
    const has01 = all || edges.isHighlighted(i0, i1);
    const has12 = all || edges.isHighlighted(i1, i2);
    const has20 = all || edges.isHighlighted(i2, i0);

    let unmatchableVertexIndex = matchAndStoreCoordinates(
      outlineCoordinates,
      i0,
      i1,
      i2,
      has01,
      has12,
      has20
    );
    while (unmatchableVertexIndex >= 0) {
      // Copy the unmatchable index and try again.
      let copy;
      if (unmatchableVertexIndex === i0) {
        copy = vertexCopies[i0];
      } else if (unmatchableVertexIndex === i1) {
        copy = vertexCopies[i1];
      } else {
        copy = vertexCopies[i2];
      }

      if (copy === undefined) {
        copy = vertexCount + extraVertices.length;

        let original = unmatchableVertexIndex;
        while (original >= vertexCount) {
          original = extraVertices[original - vertexCount];
        }
        extraVertices.push(original);
        vertexCopies[unmatchableVertexIndex] = copy;
      }

      if (
        copy > MAX_GLTF_UINT16_INDEX &&
        (triangleIndices instanceof Uint16Array ||
          triangleIndices instanceof Uint8Array)
      ) {
        // We outgrew an 8- or 16-bit index buffer, switch to 32-bit.
        triangleIndices = new Uint32Array(triangleIndices);
      } else if (
        copy > MAX_GLTF_UINT8_INDEX &&
        triangleIndices instanceof Uint8Array
      ) {
        // We outgrew an 8-bit index buffer, switch to 16 bit.
        triangleIndices = new Uint16Array(triangleIndices);
      }

      if (unmatchableVertexIndex === i0) {
        i0 = copy;
        triangleIndices[i] = copy;
      } else if (unmatchableVertexIndex === i1) {
        i1 = copy;
        triangleIndices[i + 1] = copy;
      } else {
        i2 = copy;
        triangleIndices[i + 2] = copy;
      }

      unmatchableVertexIndex = matchAndStoreCoordinates(
        outlineCoordinates,
        i0,
        i1,
        i2,
        has01,
        has12,
        has20
      );
    }
  }

  // Store the triangle indices in case we had to expand to 32-bit indices
  outlineGenerator._triangleIndices = triangleIndices;
  outlineGenerator._outlineCoordinatesTypedArray = new Float32Array(
    outlineCoordinates
  );
}

function matchAndStoreCoordinates(
  outlineCoordinates,
  i0,
  i1,
  i2,
  has01,
  has12,
  has20
) {
  const a0 = has20 ? 1.0 : 0.0;
  const b0 = has01 ? 1.0 : 0.0;
  const c0 = 0.0;

  const i0Mask = computeOrderMask(outlineCoordinates, i0, a0, b0, c0);
  if (i0Mask === 0) {
    return i0;
  }

  const a1 = 0.0;
  const b1 = has01 ? 1.0 : 0.0;
  const c1 = has12 ? 1.0 : 0.0;

  const i1Mask = computeOrderMask(outlineCoordinates, i1, a1, b1, c1);
  if (i1Mask === 0) {
    return i1;
  }

  const a2 = has20 ? 1.0 : 0.0;
  const b2 = 0.0;
  const c2 = has12 ? 1.0 : 0.0;

  const i2Mask = computeOrderMask(outlineCoordinates, i2, a2, b2, c2);
  if (i2Mask === 0) {
    return i2;
  }

  const workingOrders = i0Mask & i1Mask & i2Mask;

  let a, b, c;

  if (workingOrders & (1 << 0)) {
    // 0 - abc
    a = 0;
    b = 1;
    c = 2;
  } else if (workingOrders & (1 << 1)) {
    // 1 - acb
    a = 0;
    c = 1;
    b = 2;
  } else if (workingOrders & (1 << 2)) {
    // 2 - bac
    b = 0;
    a = 1;
    c = 2;
  } else if (workingOrders & (1 << 3)) {
    // 3 - bca
    b = 0;
    c = 1;
    a = 2;
  } else if (workingOrders & (1 << 4)) {
    // 4 - cab
    c = 0;
    a = 1;
    b = 2;
  } else if (workingOrders & (1 << 5)) {
    // 5 - cba
    c = 0;
    b = 1;
    a = 2;
  } else {
    // No ordering works.
    // Report the most constrained vertex as unmatched so we copy that one.
    const i0Popcount = popcount6Bit(i0Mask);
    const i1Popcount = popcount6Bit(i1Mask);
    const i2Popcount = popcount6Bit(i2Mask);
    if (i0Popcount < i1Popcount && i0Popcount < i2Popcount) {
      return i0;
    } else if (i1Popcount < i2Popcount) {
      return i1;
    }
    return i2;
  }

  const i0Start = i0 * 3;
  outlineCoordinates[i0Start + a] = a0;
  outlineCoordinates[i0Start + b] = b0;
  outlineCoordinates[i0Start + c] = c0;

  const i1Start = i1 * 3;
  outlineCoordinates[i1Start + a] = a1;
  outlineCoordinates[i1Start + b] = b1;
  outlineCoordinates[i1Start + c] = c1;

  const i2Start = i2 * 3;
  outlineCoordinates[i2Start + a] = a2;
  outlineCoordinates[i2Start + b] = b2;
  outlineCoordinates[i2Start + c] = c2;

  return -1;
}

// Each vertex has three coordinates, a, b, and c.
// a is the coordinate that applies to edge 2-0 for the vertex.
// b is the coordinate that applies to edge 0-1 for the vertex.
// c is the coordinate that applies to edge 1-2 for the vertex.

// A single triangle with all edges highlighted:
//
//                 | a | b | c |
//                 | 1 | 1 | 0 |
//                       0
//                      / \
//                     /   \
//           edge 0-1 /     \ edge 2-0
//                   /       \
//                  /         \
// | a | b | c |   1-----------2   | a | b | c |
// | 0 | 1 | 1 |     edge 1-2      | 1 | 0 | 1 |
//
// There are 6 possible orderings of coordinates a, b, and c:
// 0 - abc
// 1 - acb
// 2 - bac
// 3 - bca
// 4 - cab
// 5 - cba

// All vertices must use the _same ordering_ for the edges to be rendered
// correctly. So we compute a bitmask for each vertex, where the bit at
// each position indicates whether that ordering works (i.e. doesn't
// conflict with already-assigned coordinates) for that vertex.

// Then we can find an ordering that works for all three vertices with a
// bitwise AND.

function computeOrderMask(outlineCoordinates, vertexIndex, a, b, c) {
  const startIndex = vertexIndex * 3;
  const first = outlineCoordinates[startIndex];
  const second = outlineCoordinates[startIndex + 1];
  const third = outlineCoordinates[startIndex + 2];

  if (first === undefined) {
    // If one coordinate is undefined, they all are, and all orderings are fine.
    return 63; // 0b111111;
  }

  return (
    ((first === a && second === b && third === c) << 0) +
    ((first === a && second === c && third === b) << 1) +
    ((first === b && second === a && third === c) << 2) +
    ((first === b && second === c && third === a) << 3) +
    ((first === c && second === a && third === b) << 4) +
    ((first === c && second === b && third === a) << 5)
  );
}

// popcount for integers 0-63, inclusive.
// i.e. how many 1s are in the binary representation of a 6-bit integer
function popcount6Bit(value) {
  return (
    (value & 1) +
    ((value >> 1) & 1) +
    ((value >> 2) & 1) +
    ((value >> 3) & 1) +
    ((value >> 4) & 1) +
    ((value >> 5) & 1)
  );
}

PrimitiveOutlineGenerator.prototype.updateAttribute = function (
  attributeTypedArray
) {
  const extraVertices = this._extraVertices;

  const originalLength = attributeTypedArray.length;

  // This is a stride in number of typed elements. For example, a VEC3 would
  // have a stride of 3 (floats)
  const stride = originalLength / this._originalVertexCount;

  const extraVerticesLength = extraVertices.length;

  // Make a larger typed array of the same type as the input
  const ArrayType = attributeTypedArray.constructor;
  const result = new ArrayType(
    attributeTypedArray.length + extraVerticesLength * stride
  );

  // Copy original vertices
  result.set(attributeTypedArray);

  // Copy the vertices added for outlining
  for (let i = 0; i < extraVerticesLength; i++) {
    const sourceIndex = extraVertices[i] * stride;
    const resultIndex = originalLength + i * stride;
    for (let j = 0; j < stride; j++) {
      result[resultIndex + j] = result[sourceIndex + j];
    }
  }

  return result;
};

PrimitiveOutlineGenerator.createTexture = function (context) {
  let cache = context.cache.modelOutliningCache;
  if (!defined(cache)) {
    cache = context.cache.modelOutliningCache = {};
  }

  if (defined(cache.outlineTexture)) {
    return cache.outlineTexture;
  }

  const maxSize = Math.min(4096, ContextLimits.maximumTextureSize);

  let size = maxSize;
  const levelZero = createMipLevel(size);

  const mipLevels = [];

  while (size > 1) {
    size >>= 1;
    mipLevels.push(createMipLevel(size));
  }

  const texture = new Texture({
    context: context,
    source: {
      arrayBufferView: levelZero,
      mipLevels: mipLevels,
    },
    width: maxSize,
    height: 1,
    pixelFormat: PixelFormat.LUMINANCE,
    sampler: new Sampler({
      wrapS: TextureWrap.CLAMP_TO_EDGE,
      wrapT: TextureWrap.CLAMP_TO_EDGE,
      minificationFilter: TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
      magnificationFilter: TextureMagnificationFilter.LINEAR,
    }),
  });

  cache.outlineTexture = texture;

  return texture;
};

function createMipLevel(size) {
  const texture = new Uint8Array(size);
  texture[size - 1] = 192;
  if (size === 8) {
    texture[size - 1] = 96;
  } else if (size === 4) {
    texture[size - 1] = 48;
  } else if (size === 2) {
    texture[size - 1] = 24;
  } else if (size === 1) {
    texture[size - 1] = 12;
  }
  return texture;
}

function EdgeSet(edgeIndices, originalVertexCount) {
  this._originalVertexCount = originalVertexCount;

  // Make a hash table for quick lookups of whether an edge exists between two
  // vertices. The hash is a sparse array indexed by
  //   `smallerVertexIndex * originalVertexCount + biggerVertexIndex`
  // A value of true indicates an edge exists between the two vertex indices;
  // any other value indicates that it does not.
  this._edges = {};
  for (let i = 0; i < edgeIndices.length; i += 2) {
    const a = edgeIndices[i];
    const b = edgeIndices[i + 1];
    const small = Math.min(a, b);
    const big = Math.max(a, b);
    this._edges[small * this._originalVertexCount + big] = true;
  }
}

EdgeSet.prototype.isHighlighted = function (a, b) {
  const index = Math.min(a, b) * this._originalVertexCount + Math.max(a, b);
  return this._edges[index] === true;
};
