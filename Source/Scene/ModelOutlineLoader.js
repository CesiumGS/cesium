import defined from "../Core/defined.js";
import PixelFormat from "../Core/PixelFormat.js";
import ContextLimits from "../Renderer/ContextLimits.js";
import Sampler from "../Renderer/Sampler.js";
import Texture from "../Renderer/Texture.js";
import TextureMagnificationFilter from "../Renderer/TextureMagnificationFilter.js";
import TextureMinificationFilter from "../Renderer/TextureMinificationFilter.js";
import TextureWrap from "../Renderer/TextureWrap.js";
import ForEach from "./GltfPipeline/ForEach.js";

// glTF does not allow an index value of 65535 because this is the primitive
// restart value in some APIs.
var MAX_GLTF_UINT16_INDEX = 65534;

/**
 * Creates face outlines for glTF primitives with the `CESIUM_primitive_outline` extension.
 * @private
 */
function ModelOutlineLoader() {}

/**
 * Returns true if the model uses or requires CESIUM_primitive_outline.
 * @private
 */
ModelOutlineLoader.hasExtension = function (model) {
  return (
    defined(model.extensionsRequired.CESIUM_primitive_outline) ||
    defined(model.extensionsUsed.CESIUM_primitive_outline)
  );
};

/**
 * Arranges to outline any primitives with the CESIUM_primitive_outline extension.
 * It is expected that all buffer data is loaded and available in
 * `extras._pipeline.source` before this function is called, and that vertex
 * and index WebGL buffers are not yet created.
 * @private
 */
ModelOutlineLoader.outlinePrimitives = function (model) {
  if (!ModelOutlineLoader.hasExtension(model)) {
    return;
  }

  var gltf = model.gltf;

  // Assumption: A single bufferView contains a single zero-indexed range of vertices.
  // No trickery with using large accessor byteOffsets to store multiple zero-based
  // ranges of vertices in a single bufferView. Use separate bufferViews for that,
  // you monster.
  // Note that interleaved vertex attributes (e.g. position0, normal0, uv0,
  // position1, normal1, uv1, ...) _are_ supported and should not be confused with
  // the above.

  var vertexNumberingScopes = [];

  ForEach.mesh(gltf, function (mesh, meshId) {
    ForEach.meshPrimitive(mesh, function (primitive, primitiveId) {
      if (!defined(primitive.extensions)) {
        return;
      }

      var outlineData = primitive.extensions.CESIUM_primitive_outline;
      if (!defined(outlineData)) {
        return;
      }

      var vertexNumberingScope = getVertexNumberingScope(model, primitive);
      if (vertexNumberingScope === undefined) {
        return;
      }

      if (vertexNumberingScopes.indexOf(vertexNumberingScope) < 0) {
        vertexNumberingScopes.push(vertexNumberingScope);
      }

      // Add the outline to this primitive
      addOutline(
        model,
        meshId,
        primitiveId,
        outlineData.indices,
        vertexNumberingScope
      );
    });
  });

  // Update all relevant bufferViews to include the duplicate vertices that are
  // needed for outlining.
  for (var i = 0; i < vertexNumberingScopes.length; ++i) {
    updateBufferViewsWithNewVertices(
      model,
      vertexNumberingScopes[i].bufferViews
    );
  }

  // Remove data not referenced by any bufferViews anymore.
  compactBuffers(model);
};

ModelOutlineLoader.createTexture = function (model, context) {
  var cache = context.cache.modelOutliningCache;
  if (!defined(cache)) {
    cache = context.cache.modelOutliningCache = {};
  }

  if (defined(cache.outlineTexture)) {
    return cache.outlineTexture;
  }

  var maxSize = Math.min(4096, ContextLimits.maximumTextureSize);

  var size = maxSize;
  var levelZero = createTexture(size);

  var mipLevels = [];

  while (size > 1) {
    size >>= 1;
    mipLevels.push(createTexture(size));
  }

  var texture = new Texture({
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

function addOutline(
  model,
  meshId,
  primitiveId,
  edgeIndicesAccessorId,
  vertexNumberingScope
) {
  var vertexCopies = vertexNumberingScope.vertexCopies;
  var extraVertices = vertexNumberingScope.extraVertices;
  var outlineCoordinates = vertexNumberingScope.outlineCoordinates;

  var gltf = model.gltf;
  var mesh = gltf.meshes[meshId];
  var primitive = mesh.primitives[primitiveId];
  var accessors = gltf.accessors;
  var bufferViews = gltf.bufferViews;

  // Find the number of vertices in this primitive by looking at
  // the first attribute. Others are required to be the same.
  var numVertices;
  for (var semantic in primitive.attributes) {
    if (primitive.attributes.hasOwnProperty(semantic)) {
      var attributeId = primitive.attributes[semantic];
      var accessor = accessors[attributeId];
      if (defined(accessor)) {
        numVertices = accessor.count;
        break;
      }
    }
  }

  if (!defined(numVertices)) {
    return undefined;
  }

  var triangleIndexAccessorGltf = accessors[primitive.indices];
  var triangleIndexBufferViewGltf =
    bufferViews[triangleIndexAccessorGltf.bufferView];
  var edgeIndexAccessorGltf = accessors[edgeIndicesAccessorId];
  var edgeIndexBufferViewGltf = bufferViews[edgeIndexAccessorGltf.bufferView];

  var loadResources = model._loadResources;
  var triangleIndexBufferView = loadResources.getBuffer(
    triangleIndexBufferViewGltf
  );
  var edgeIndexBufferView = loadResources.getBuffer(edgeIndexBufferViewGltf);

  var triangleIndices =
    triangleIndexAccessorGltf.componentType === 5123
      ? new Uint16Array(
          triangleIndexBufferView.buffer,
          triangleIndexBufferView.byteOffset +
            triangleIndexAccessorGltf.byteOffset,
          triangleIndexAccessorGltf.count
        )
      : new Uint32Array(
          triangleIndexBufferView.buffer,
          triangleIndexBufferView.byteOffset +
            triangleIndexAccessorGltf.byteOffset,
          triangleIndexAccessorGltf.count
        );
  var edgeIndices =
    edgeIndexAccessorGltf.componentType === 5123
      ? new Uint16Array(
          edgeIndexBufferView.buffer,
          edgeIndexBufferView.byteOffset + edgeIndexAccessorGltf.byteOffset,
          edgeIndexAccessorGltf.count
        )
      : new Uint32Array(
          edgeIndexBufferView.buffer,
          edgeIndexBufferView.byteOffset + edgeIndexAccessorGltf.byteOffset,
          edgeIndexAccessorGltf.count
        );

  // Make a hash table for quick lookups of whether an edge exists between two
  // vertices. The hash is a sparse array indexed by
  //   `smallerVertexIndex * totalNumberOfVertices + biggerVertexIndex`
  // A value of 1 indicates an edge exists between the two vertex indices; any
  // other value indicates that it does not. We store the
  // `edgeSmallMultipler` - that is, the number of vertices in the equation
  // above - at index 0 for easy access to it later.

  var edgeSmallMultiplier = numVertices;

  var edges = [edgeSmallMultiplier];
  var i;
  for (i = 0; i < edgeIndices.length; i += 2) {
    var a = edgeIndices[i];
    var b = edgeIndices[i + 1];
    var small = Math.min(a, b);
    var big = Math.max(a, b);
    edges[small * edgeSmallMultiplier + big] = 1;
  }

  // For each triangle, adjust vertex data so that the correct edges are outlined.
  for (i = 0; i < triangleIndices.length; i += 3) {
    var i0 = triangleIndices[i];
    var i1 = triangleIndices[i + 1];
    var i2 = triangleIndices[i + 2];

    var all = false; // set this to true to draw a full wireframe.
    var has01 = all || isHighlighted(edges, i0, i1);
    var has12 = all || isHighlighted(edges, i1, i2);
    var has20 = all || isHighlighted(edges, i2, i0);

    var unmatchableVertexIndex = matchAndStoreCoordinates(
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
      var copy;
      if (unmatchableVertexIndex === i0) {
        copy = vertexCopies[i0];
      } else if (unmatchableVertexIndex === i1) {
        copy = vertexCopies[i1];
      } else {
        copy = vertexCopies[i2];
      }

      if (copy === undefined) {
        copy = numVertices + extraVertices.length;

        var original = unmatchableVertexIndex;
        while (original >= numVertices) {
          original = extraVertices[original - numVertices];
        }
        extraVertices.push(original);
        vertexCopies[unmatchableVertexIndex] = copy;
      }

      if (
        copy > MAX_GLTF_UINT16_INDEX &&
        triangleIndices instanceof Uint16Array
      ) {
        // We outgrew a 16-bit index buffer, switch to 32-bit.
        triangleIndices = new Uint32Array(triangleIndices);
        triangleIndexAccessorGltf.componentType = 5125; // UNSIGNED_INT
        triangleIndexBufferViewGltf.buffer =
          gltf.buffers.push({
            byteLength: triangleIndices.byteLength,
            extras: {
              _pipeline: {
                source: triangleIndices.buffer,
              },
            },
          }) - 1;
        triangleIndexBufferViewGltf.byteLength = triangleIndices.byteLength;
        triangleIndexBufferViewGltf.byteOffset = 0;
        model._loadResources.buffers[
          triangleIndexBufferViewGltf.buffer
        ] = new Uint8Array(
          triangleIndices.buffer,
          0,
          triangleIndices.byteLength
        );

        // The index componentType is also squirreled away in ModelLoadResources.
        // Hackily update it, or else we'll end up creating the wrong type
        // of index buffer later.
        loadResources.indexBuffersToCreate._array.forEach(function (toCreate) {
          if (toCreate.id === triangleIndexAccessorGltf.bufferView) {
            toCreate.componentType = triangleIndexAccessorGltf.componentType;
          }
        });
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

      if (defined(triangleIndexAccessorGltf.max)) {
        triangleIndexAccessorGltf.max[0] = Math.max(
          triangleIndexAccessorGltf.max[0],
          copy
        );
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
  var startIndex = vertexIndex * 3;
  var first = outlineCoordinates[startIndex];
  var second = outlineCoordinates[startIndex + 1];
  var third = outlineCoordinates[startIndex + 2];

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
// i.e. how many 1s are in the binary representation of the integer.
function popcount0to63(value) {
  return (
    (value & 1) +
    ((value >> 1) & 1) +
    ((value >> 2) & 1) +
    ((value >> 3) & 1) +
    ((value >> 4) & 1) +
    ((value >> 5) & 1)
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
  var a0 = has20 ? 1.0 : 0.0;
  var b0 = has01 ? 1.0 : 0.0;
  var c0 = 0.0;

  var i0Mask = computeOrderMask(outlineCoordinates, i0, a0, b0, c0);
  if (i0Mask === 0) {
    return i0;
  }

  var a1 = 0.0;
  var b1 = has01 ? 1.0 : 0.0;
  var c1 = has12 ? 1.0 : 0.0;

  var i1Mask = computeOrderMask(outlineCoordinates, i1, a1, b1, c1);
  if (i1Mask === 0) {
    return i1;
  }

  var a2 = has20 ? 1.0 : 0.0;
  var b2 = 0.0;
  var c2 = has12 ? 1.0 : 0.0;

  var i2Mask = computeOrderMask(outlineCoordinates, i2, a2, b2, c2);
  if (i2Mask === 0) {
    return i2;
  }

  var workingOrders = i0Mask & i1Mask & i2Mask;

  var a, b, c;

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
    var i0Popcount = popcount0to63(i0Mask);
    var i1Popcount = popcount0to63(i1Mask);
    var i2Popcount = popcount0to63(i2Mask);
    if (i0Popcount < i1Popcount && i0Popcount < i2Popcount) {
      return i0;
    } else if (i1Popcount < i2Popcount) {
      return i1;
    }
    return i2;
  }

  var i0Start = i0 * 3;
  outlineCoordinates[i0Start + a] = a0;
  outlineCoordinates[i0Start + b] = b0;
  outlineCoordinates[i0Start + c] = c0;

  var i1Start = i1 * 3;
  outlineCoordinates[i1Start + a] = a1;
  outlineCoordinates[i1Start + b] = b1;
  outlineCoordinates[i1Start + c] = c1;

  var i2Start = i2 * 3;
  outlineCoordinates[i2Start + a] = a2;
  outlineCoordinates[i2Start + b] = b2;
  outlineCoordinates[i2Start + c] = c2;

  return -1;
}

function isHighlighted(edges, i0, i1) {
  var edgeSmallMultiplier = edges[0];
  var index = Math.min(i0, i1) * edgeSmallMultiplier + Math.max(i0, i1);

  // If i0 and i1 are both 0, then our index will be 0 and we'll end up
  // accessing the edgeSmallMultiplier that we've sneakily squirreled away
  // in index 0. But it makes no sense to have an edge between vertex 0 and
  // itself, so for any edgeSmallMultiplier other than 1 we'll return the
  // correct answer: false. If edgeSmallMultiplier is 1, that means there is
  // only a single vertex, so no danger of forming a meaningful triangle
  // with that.
  return edges[index] === 1;
}

function createTexture(size) {
  var texture = new Uint8Array(size);
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

function updateBufferViewsWithNewVertices(model, bufferViews) {
  var gltf = model.gltf;
  var loadResources = model._loadResources;

  var i, j;
  for (i = 0; i < bufferViews.length; ++i) {
    var bufferView = bufferViews[i];
    var vertexNumberingScope = bufferView.extras._pipeline.vertexNumberingScope;

    // Let the temporary data be garbage collected.
    bufferView.extras._pipeline.vertexNumberingScope = undefined;

    var newVertices = vertexNumberingScope.extraVertices;

    var sourceData = loadResources.getBuffer(bufferView);
    var byteStride = bufferView.byteStride || 4;
    var newVerticesLength = newVertices.length;
    var destData = new Uint8Array(
      sourceData.byteLength + newVerticesLength * byteStride
    );

    // Copy the original vertices
    destData.set(sourceData);

    // Copy the vertices added for outlining
    for (j = 0; j < newVerticesLength; ++j) {
      var sourceIndex = newVertices[j] * byteStride;
      var destIndex = sourceData.length + j * byteStride;
      for (var k = 0; k < byteStride; ++k) {
        destData[destIndex + k] = destData[sourceIndex + k];
      }
    }

    // This bufferView is an independent buffer now. Update the model accordingly.
    bufferView.byteOffset = 0;
    bufferView.byteLength = destData.byteLength;

    var bufferId =
      gltf.buffers.push({
        byteLength: destData.byteLength,
        extras: {
          _pipeline: {
            source: destData.buffer,
          },
        },
      }) - 1;

    bufferView.buffer = bufferId;
    loadResources.buffers[bufferId] = destData;

    // Update the accessors to reflect the added vertices.
    var accessors = vertexNumberingScope.accessors;
    for (j = 0; j < accessors.length; ++j) {
      var accessorId = accessors[j];
      gltf.accessors[accessorId].count += newVerticesLength;
    }

    if (!vertexNumberingScope.createdOutlines) {
      // Create the buffers, views, and accessors for the outline texture coordinates.
      var outlineCoordinates = vertexNumberingScope.outlineCoordinates;
      var outlineCoordinateBuffer = new Float32Array(outlineCoordinates);
      var bufferIndex =
        model.gltf.buffers.push({
          byteLength: outlineCoordinateBuffer.byteLength,
          extras: {
            _pipeline: {
              source: outlineCoordinateBuffer.buffer,
            },
          },
        }) - 1;
      loadResources.buffers[bufferIndex] = new Uint8Array(
        outlineCoordinateBuffer.buffer,
        0,
        outlineCoordinateBuffer.byteLength
      );

      var bufferViewIndex =
        model.gltf.bufferViews.push({
          buffer: bufferIndex,
          byteLength: outlineCoordinateBuffer.byteLength,
          byteOffset: 0,
          byteStride: 3 * Float32Array.BYTES_PER_ELEMENT,
          target: 34962,
        }) - 1;

      var accessorIndex =
        model.gltf.accessors.push({
          bufferView: bufferViewIndex,
          byteOffset: 0,
          componentType: 5126,
          count: outlineCoordinateBuffer.length / 3,
          type: "VEC3",
          min: [0.0, 0.0, 0.0],
          max: [1.0, 1.0, 1.0],
        }) - 1;

      var primitives = vertexNumberingScope.primitives;
      for (j = 0; j < primitives.length; ++j) {
        primitives[j].attributes._OUTLINE_COORDINATES = accessorIndex;
      }

      loadResources.vertexBuffersToCreate.enqueue(bufferViewIndex);

      vertexNumberingScope.createdOutlines = true;
    }
  }
}

function compactBuffers(model) {
  var gltf = model.gltf;
  var loadResources = model._loadResources;

  var i;
  for (i = 0; i < gltf.buffers.length; ++i) {
    var buffer = gltf.buffers[i];
    var bufferViewsUsingThisBuffer = gltf.bufferViews.filter(
      usesBuffer.bind(undefined, i)
    );
    var newLength = bufferViewsUsingThisBuffer.reduce(function (
      previous,
      current
    ) {
      return previous + current.byteLength;
    },
    0);
    if (newLength === buffer.byteLength) {
      continue;
    }

    var newBuffer = new Uint8Array(newLength);
    var offset = 0;
    for (var j = 0; j < bufferViewsUsingThisBuffer.length; ++j) {
      var bufferView = bufferViewsUsingThisBuffer[j];
      var sourceData = loadResources.getBuffer(bufferView);
      newBuffer.set(sourceData, offset);

      bufferView.byteOffset = offset;
      offset += sourceData.byteLength;
    }

    loadResources.buffers[i] = newBuffer;
    buffer.extras._pipeline.source = newBuffer.buffer;
    buffer.byteLength = newLength;
  }
}

function usesBuffer(bufferId, bufferView) {
  return bufferView.buffer === bufferId;
}

function getVertexNumberingScope(model, primitive) {
  var attributes = primitive.attributes;
  if (attributes === undefined) {
    return undefined;
  }

  var gltf = model.gltf;

  var vertexNumberingScope;

  // Initialize common details for all bufferViews used by this primitive's vertices.
  // All bufferViews used by this primitive must use a common vertex numbering scheme.
  for (var semantic in attributes) {
    if (!attributes.hasOwnProperty(semantic)) {
      continue;
    }

    var accessorId = attributes[semantic];
    var accessor = gltf.accessors[accessorId];
    var bufferViewId = accessor.bufferView;
    var bufferView = gltf.bufferViews[bufferViewId];

    if (!defined(bufferView.extras)) {
      bufferView.extras = {};
    }
    if (!defined(bufferView.extras._pipeline)) {
      bufferView.extras._pipeline = {};
    }

    if (!defined(bufferView.extras._pipeline.vertexNumberingScope)) {
      bufferView.extras._pipeline.vertexNumberingScope = vertexNumberingScope || {
        // Each element in this array is:
        // a) undefined, if the vertex at this index has no copies
        // b) the index of the copy.
        vertexCopies: [],

        // Extra vertices appended after the ones originally included in the model.
        // Each element is the index of the vertex that this one is a copy of.
        extraVertices: [],

        // The texture coordinates used for outlining, three floats per vertex.
        outlineCoordinates: [],

        // The IDs of accessors that use this vertex numbering.
        accessors: [],

        // The IDs of bufferViews that use this vertex numbering.
        bufferViews: [],

        // The primitives that use this vertex numbering.
        primitives: [],

        // True if the buffer for the outlines has already been created.
        createdOutlines: false,
      };
    } else if (
      vertexNumberingScope !== undefined &&
      bufferView.extras._pipeline.vertexNumberingScope !== vertexNumberingScope
    ) {
      // Conflicting vertex numbering, let's give up.
      return undefined;
    }

    vertexNumberingScope = bufferView.extras._pipeline.vertexNumberingScope;

    if (vertexNumberingScope.bufferViews.indexOf(bufferView) < 0) {
      vertexNumberingScope.bufferViews.push(bufferView);
    }

    if (vertexNumberingScope.accessors.indexOf(accessorId) < 0) {
      vertexNumberingScope.accessors.push(accessorId);
    }
  }

  vertexNumberingScope.primitives.push(primitive);

  return vertexNumberingScope;
}

export default ModelOutlineLoader;
