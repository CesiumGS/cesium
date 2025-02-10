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
 * attributes for the CESIUM_primitive_outline extension.
 * <p>
 * To render outlines, a lookup texture is used 3 times, once per edge of a
 * triangle. In order to render correctly, all three vertices must agree on the
 * same ordering of the three edges when computing outline (texture)
 * coordinates. Sometimes this is not possible, as a vertex shared between
 * multiple triangles may become overly constrained. In such cases, vertices are
 * copied and indices are updated until valid outline coordinates can be
 * defined.
 * </p>
 *
 * @see {@link https://www.researchgate.net/publication/220067637_Fast_and_versatile_texture-based_wireframe_rendering|Fast and versatile texture-based wireframe rendering}
 *
 * @alias PrimitiveOutlineGenerator
 * @constructor
 *
 * @param {number} options Object with the following properties:
 * @param {Uint8Array|Uint16Array|Uint32Array} options.triangleIndices The original triangle indices of the primitive. The constructor takes ownership of this typed array as it will be modified internally. Use the updatedTriangleIndices getter to get the final result.
 * @param {number[]} options.outlineIndices The indices of edges in the triangle from the CESIUM_primitive_outline extension
 * @param {number} options.originalVertexCount The original number of vertices in the primitive
 * @example
 * // The constructor will compute the updated indices and generate outline
 * // coordinates.
 * const outlineGenerator = new PrimitiveOutlineGenerator({
 *   triangleIndices: primitive.indices.typedArray,
 *   outlineIndices: outlineIndices,
 *   originalVertexCount: primitive.attributes[0].count
 * });
 *
 * // Caller must update the indices (the data type may have been upgraded!)
 * primitive.indices.typedArray = outlineGenerator.updatedTriangleIndices;
 * primitive.indices.indexDatatype =
 *  IndexDatatype.fromTypedArray(primitive.indices.typedArray);
 *
 * // Create a new attribute for the generated outline coordinates
 * primitive.outlineCoordinates = new ModelComponents.Attribute();
 * // ... initialize as a vec3 attribute
 * primitive.outlineCoordinates.typedArray =
 *   outlineGenerator.outlineCoordinates;
 *
 * // Updating an attribute
 * const attribute = primitive.attributes[i];
 * attribute.typedArray = outlineGenerator.updateAttribute(
 *   attribute.typedArray
 * );
 *
 * @private
 */
function PrimitiveOutlineGenerator(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const triangleIndices = options.triangleIndices;
  const outlineIndices = options.outlineIndices;
  const originalVertexCount = options.originalVertexCount;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.triangleIndices", triangleIndices);
  Check.typeOf.object("options.outlineIndices", outlineIndices);
  Check.typeOf.number("options.originalVertexCount", originalVertexCount);
  //>>includeEnd('debug');

  /**
   * The triangle indices. It will be modified in place.
   *
   * @type {Uint8Array|Uint16Array|Uint32Array}
   *
   * @private
   */
  this._triangleIndices = triangleIndices;

  /**
   * How many vertices were originally in the primitive
   *
   * @type {number}
   *
   * @private
   */
  this._originalVertexCount = originalVertexCount;

  /**
   * The outline indices represent edges of the primitive's triangle mesh where
   * outlines must be drawn. This is stored as a hash set for efficient
   * checks of whether an edge is present.
   *
   * @type {EdgeSet}
   *
   * @private
   */
  this._edges = new EdgeSet(outlineIndices, originalVertexCount);

  /**
   * The typed array that will store the outline texture coordinates
   * once computed. This typed array should be turned into a vertex attribute
   * when rendering outlines.
   *
   * @type {Float32Array}
   *
   * @private
   */
  this._outlineCoordinatesTypedArray = undefined;

  /**
   * Array containing the indices of any vertices that must be copied and
   * appended to the list.
   *
   * @type {number[]}
   *
   * @private
   */
  this._extraVertices = [];

  initialize(this);
}

Object.defineProperties(PrimitiveOutlineGenerator.prototype, {
  /**
   * The updated triangle indices after generating outlines. The caller is for
   * responsible for updating the primitive's indices to use this array.
   *
   * @memberof PrimitiveOutlineGenerator.prototype
   *
   * @type {Uint8Array|Uint16Array|Uint32Array}
   * @readonly
   *
   * @private
   */
  updatedTriangleIndices: {
    get: function () {
      return this._triangleIndices;
    },
  },

  /**
   * The computed outline coordinates. The caller is responsible for
   * turning this into a vec3 attribute for rendering.
   *
   * @memberof PrimitiveOutlineGenerator.prototype
   *
   * @type {Float32Array}
   * @readonly
   *
   * @private
   */
  outlineCoordinates: {
    get: function () {
      return this._outlineCoordinatesTypedArray;
    },
  },
});

/**
 * Initialize the outline generator from the CESIUM_primitive_outline
 * extension data. This updates the triangle indices and generates outline
 * coordinates, but does not update other attributes (see
 * {@link PrimitiveOutlineGenerator#updateAttribute})
 *
 * @param {PrimitiveOutlineGenerator} outlineGenerator The outline generator
 *
 * @private
 */
function initialize(outlineGenerator) {
  // triangle indices may be extended from 16-bits to 32 bits if needed.
  let triangleIndices = outlineGenerator._triangleIndices;

  const edges = outlineGenerator._edges;
  const outlineCoordinates = [];
  const extraVertices = outlineGenerator._extraVertices;
  const vertexCount = outlineGenerator._originalVertexCount;

  // Dictionary of unmatchable vertex index -> copied vertex index. This is
  // used so we don't copy the same vertex more than necessary.
  const vertexCopies = {};

  // For each triangle, adjust vertex data so that the correct edges are outlined.
  for (let i = 0; i < triangleIndices.length; i += 3) {
    let i0 = triangleIndices[i];
    let i1 = triangleIndices[i + 1];
    let i2 = triangleIndices[i + 2];

    // Check which edges need to be outlined based on the contents of the
    // outline indices from the extension.
    const all = false; // set this to true to draw a full wireframe.
    const hasEdge01 = all || edges.hasEdge(i0, i1);
    const hasEdge12 = all || edges.hasEdge(i1, i2);
    const hasEdge20 = all || edges.hasEdge(i2, i0);

    // Attempt to compute outline coordinates. If no consistent ordering of
    // edges can be computed (due to constraints from adjacent faces), the
    // first attempt may fail. In such cases, make a copy of a vertex and
    // try again. This relaxes the constraints, so the while loop will
    // eventually finish.
    let unmatchableVertexIndex = matchAndStoreCoordinates(
      outlineCoordinates,
      i0,
      i1,
      i2,
      hasEdge01,
      hasEdge12,
      hasEdge20,
    );
    while (defined(unmatchableVertexIndex)) {
      // Copy the unmatchable index and try again.
      let copy = vertexCopies[unmatchableVertexIndex];

      // Only copy if we haven't already
      if (!defined(copy)) {
        // The new vertex will appear at the end of the vertex list
        copy = vertexCount + extraVertices.length;

        // Sometimes the copied vertex will in turn be a copy, so search
        // for the original one
        let original = unmatchableVertexIndex;
        while (original >= vertexCount) {
          original = extraVertices[original - vertexCount];
        }

        // Store the original vertex that needs to be copied
        extraVertices.push(original);

        // mark that we've seen this unmatchable vertex before so we don't
        // copy it multiple times.
        vertexCopies[unmatchableVertexIndex] = copy;
      }

      // Corner case: copying a vertex may overflow the range of an
      // 8- or 16- bit index buffer, so upgrade to a larger data type.
      if (
        copy > MAX_GLTF_UINT16_INDEX &&
        (triangleIndices instanceof Uint16Array ||
          triangleIndices instanceof Uint8Array)
      ) {
        triangleIndices = new Uint32Array(triangleIndices);
      } else if (
        copy > MAX_GLTF_UINT8_INDEX &&
        triangleIndices instanceof Uint8Array
      ) {
        triangleIndices = new Uint16Array(triangleIndices);
      }

      // Update the triangle indices buffer to use the copied vertex instead
      // of the original one.
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

      // Attempt to generate outline coordinates again. This is more likely
      // to succeed since the copied vertex has no constraints on which order
      // of the 3 edges to use.
      unmatchableVertexIndex = matchAndStoreCoordinates(
        outlineCoordinates,
        i0,
        i1,
        i2,
        hasEdge01,
        hasEdge12,
        hasEdge20,
      );
    }
  }

  // Store the triangle indices in case we had to expand to 32-bit indices
  outlineGenerator._triangleIndices = triangleIndices;
  outlineGenerator._outlineCoordinatesTypedArray = new Float32Array(
    outlineCoordinates,
  );
}

/**
 * This function attempts to compute a valid ordering of edges for this triangle
 * and if found, computes outline coordinates for the three vertices. If not
 * possible, one of the vertices is returned so it can be copied.
 *
 * @param {number[]} outlineCoordinates An array to store the computed outline coordinates. There are 3 components per vertex. This will be modified in place.
 * @param {number} i0 The index of the first vertex of the triangle.
 * @param {number} i1 The index of the second vertex of the triangle.
 * @param {number} i2 The index of the third vertex of the triangle.
 * @param {boolean} hasEdge01 Whether there is an outline edge between vertices 0 and 1 of the triangle
 * @param {boolean} hasEdge12 Whether there is an outline edge between vertices 1 and 2 of the triangle
 * @param {boolean} hasEdge20 Whether there is an outline edge between vertices 2 and 0 of the triangle
 * @returns {number} If it's not possible to compute consistent outline coordinates for this triangle, the index of the most constrained vertex of i0, i1 and i2 is returned. Otherwise, this function returns undefined to indicate a successful match.
 *
 * @private
 */
function matchAndStoreCoordinates(
  outlineCoordinates,
  i0,
  i1,
  i2,
  hasEdge01,
  hasEdge12,
  hasEdge20,
) {
  const a0 = hasEdge20 ? 1.0 : 0.0;
  const b0 = hasEdge01 ? 1.0 : 0.0;
  const c0 = 0.0;

  const i0Mask = computeOrderMask(outlineCoordinates, i0, a0, b0, c0);
  if (i0Mask === 0) {
    return i0;
  }

  const a1 = 0.0;
  const b1 = hasEdge01 ? 1.0 : 0.0;
  const c1 = hasEdge12 ? 1.0 : 0.0;

  const i1Mask = computeOrderMask(outlineCoordinates, i1, a1, b1, c1);
  if (i1Mask === 0) {
    return i1;
  }

  const a2 = hasEdge20 ? 1.0 : 0.0;
  const b2 = 0.0;
  const c2 = hasEdge12 ? 1.0 : 0.0;

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
    // No ordering works. Report the most constrained vertex (i.e. the one with
    // fewest valid orderings) as unmatched so we copy that one.
    const i0ValidOrderCount = popcount6Bit(i0Mask);
    const i1ValidOrderCount = popcount6Bit(i1Mask);
    const i2ValidOrderCount = popcount6Bit(i2Mask);
    if (
      i0ValidOrderCount < i1ValidOrderCount &&
      i0ValidOrderCount < i2ValidOrderCount
    ) {
      return i0;
    } else if (i1ValidOrderCount < i2ValidOrderCount) {
      return i1;
    }
    return i2;
  }

  // We found a valid ordering of the edges, so store the outline coordinates
  // for this triangle.
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

  // successful match
  return undefined;
}

/**
 * Each vertex has three coordinates, a, b, and c.
 * a is the coordinate that applies to edge 2-0 for the vertex.
 * b is the coordinate that applies to edge 0-1 for the vertex.
 * c is the coordinate that applies to edge 1-2 for the vertex.
 *
 * A single triangle with all edges highlighted:
 *
 *                 | a | b | c |
 *                 | 1 | 1 | 0 |
 *                       0
 *                      / \
 *                     /   \
 *           edge 0-1 /     \ edge 2-0
 *                   /       \
 *                  /         \
 * | a | b | c |   1-----------2   | a | b | c |
 * | 0 | 1 | 1 |     edge 1-2      | 1 | 0 | 1 |
 *
 * There are 6 possible orderings of coordinates a, b, and c:
 * 0 - abc
 * 1 - acb
 * 2 - bac
 * 3 - bca
 * 4 - cab
 * 5 - cba
 *
 * All vertices must use the _same ordering_ for the edges to be rendered
 * correctly. So we compute a bitmask for each vertex, where the bit at
 * each position indicates whether that ordering works (i.e. doesn't
 * conflict with already-assigned coordinates) for that vertex.
 *
 * Then we can find an ordering that works for all three vertices with a
 * bitwise AND.
 *
 * @param {number[]} outlineCoordinates The array of outline coordinates
 * @param {number} vertexIndex The index of the vertex to compute the mask for
 * @param {number} a The outline coordinate for edge 2-0
 * @param {number} b The outline coordinate for edge 0-1
 * @param {number} c The outline coordinate for edge 1-2
 * @returns {number} A bitmask with 6 bits where a 1 indicates the corresponding ordering is valid.
 *
 * @private
 */
function computeOrderMask(outlineCoordinates, vertexIndex, a, b, c) {
  const startIndex = vertexIndex * 3;
  const first = outlineCoordinates[startIndex];
  const second = outlineCoordinates[startIndex + 1];
  const third = outlineCoordinates[startIndex + 2];

  // If one coordinate is undefined, they all are since matchAndStoreCoordinates sets
  // all 3 components at once. In this case, all orderings are fine.
  if (!defined(first)) {
    return 0b111111;
  }

  return (
    ((first === a && second === b && third === c) << 0) |
    ((first === a && second === c && third === b) << 1) |
    ((first === b && second === a && third === c) << 2) |
    ((first === b && second === c && third === a) << 3) |
    ((first === c && second === a && third === b) << 4) |
    ((first === c && second === b && third === a) << 5)
  );
}

/**
 * Compute the popcount for 6-bit integers (values 0-63). This is the
 * number of 1s in the binary representation of the value.
 *
 * @param {number} value The value to compute the popcount for
 * @returns {number} The number of 1s in the binary representation of value
 *
 * @private
 */
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

/**
 * After computing the outline coordinates, some vertices may need to be
 * copied and appended to the end of the list of vertices. This function updates
 * a typed array for a single attribute (e.g. POSITION or NORMAL).
 *
 * @param {Uint8Array|Int8Array|Uint16Array|Int16Array|Uint32Array|Int32Array|Float32Array} attributeTypedArray The attribute values to update. This function takes ownership of this typed array
 * @returns {Uint8Array|Int8Array|Uint16Array|Int16Array|Uint32Array|Int32Array|Float32Array} A new typed array that contains the existing attribute values, plus any copied values at the end.
 *
 * @private
 */
PrimitiveOutlineGenerator.prototype.updateAttribute = function (
  attributeTypedArray,
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
    attributeTypedArray.length + extraVerticesLength * stride,
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

/**
 * Create a mip-mapped lookup texture for rendering outlines. The texture is
 * constant, so it is cached on the context.
 *
 * @param {Context} context The context to use for creating the texture
 * @returns {Texture} The outline lookup texture.
 *
 * @private
 */
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

/**
 * Create an outline lookup texture for a single mip level. This is a texture of
 * mostly 0 values, except for the last value which is brighter to indicate
 * the outline.
 *
 * @param {number} size The width of the texture for this mip level
 * @returns {Uint8Array} A typed array containing the texels of the mip level
 *
 * @private
 */
function createMipLevel(size) {
  const texture = new Uint8Array(size);

  // This lookup texture creates an outline with width 0.75 px in screen space.
  texture[size - 1] = 192;

  // As we reach the top of the mip pyramid, a single set pixel becomes a
  // significant portion of the texture. This doesn't look great when zoomed
  // out, so attenuate the value by 50% at each level.
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

/**
 * A hash set that provides quick lookups of whether an edge exists between
 * two vertices.
 *
 * @alias EdgeSet
 * @constructor
 *
 * @param {number[]} edgeIndices An array of vertex indices with an even number of elements where each pair of indices defines an edge.
 * @param {number} originalVertexCount The original number of vertices. This is used for computing a hash function.
 *
 * @private
 */
function EdgeSet(edgeIndices, originalVertexCount) {
  /**
   * Original number of vertices in the primitive. This is used for computing
   * the hash key
   *
   * @type {number}
   *
   * @private
   */
  this._originalVertexCount = originalVertexCount;

  /**
   * The internal hash set used to store the edges. Edges are hashed as follows:
   * <p>
   * smallerVertexIndex * originalVertexCount + biggerVertexIndex
   * <p>
   * @type {Set}
   *
   * @private
   */
  this._edges = new Set();
  for (let i = 0; i < edgeIndices.length; i += 2) {
    const a = edgeIndices[i];
    const b = edgeIndices[i + 1];
    const small = Math.min(a, b);
    const big = Math.max(a, b);
    const hash = small * this._originalVertexCount + big;
    this._edges.add(hash);
  }
}

/**
 * Check if an edge exists in the set. The order of the input vertices does
 * not matter.
 * @param {number} a The first index
 * @param {number} b The second index
 * @returns {boolean} true if there is an edge between a and b
 *
 * @private
 */
EdgeSet.prototype.hasEdge = function (a, b) {
  const small = Math.min(a, b);
  const big = Math.max(a, b);
  const hash = small * this._originalVertexCount + big;
  return this._edges.has(hash);
};

export default PrimitiveOutlineGenerator;
