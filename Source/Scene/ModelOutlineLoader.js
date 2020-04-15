import binarySearch from '../Core/binarySearch.js';
import ContextLimits from '../Renderer/ContextLimits.js';
import defined from '../Core/defined.js';
import FeatureDetection from '../Core/FeatureDetection.js';
import ForEach from '../ThirdParty/GltfPipeline/ForEach.js';
import PixelFormat from '../Core/PixelFormat.js';
import readAccessorPacked from '../ThirdParty/GltfPipeline/readAccessorPacked.js';
import Sampler from '../Renderer/Sampler.js';
import TaskProcessor from '../Core/TaskProcessor.js';
import Texture from '../Renderer/Texture.js';
import TextureMagnificationFilter from '../Renderer/TextureMagnificationFilter.js';
import TextureMinificationFilter from '../Renderer/TextureMinificationFilter.js';
import TextureWrap from '../Renderer/TextureWrap.js';
import when from '../ThirdParty/when.js';

/**
 * @private
 * Creates face outlines for glTF primitives with the `CESIUM_primitive_outline` extension.
 */
function ModelOutlineLoader() {}

/**
 * Returns true if the model uses or requires CESIUM_primitive_outline.
 *
 * @private
 */
ModelOutlineLoader.hasExtension = function(model) {
    return defined(model.extensionsRequired.CESIUM_primitive_outline)
        || defined(model.extensionsUsed.CESIUM_primitive_outline);
};

// Maximum concurrency to use when outlining
ModelOutlineLoader._maxOutliningConcurrency = Math.max(FeatureDetection.hardwareConcurrency - 1, 1);

// Exposed for testing purposes
ModelOutlineLoader._outlinerTaskProcessor = undefined;
ModelOutlineLoader._getOutlinerTaskProcessor = function () {
    if (!defined(ModelOutlineLoader._outlinerTaskProcessor)) {
        var processor = new TaskProcessor('outlinePrimitive', ModelOutlineLoader._maxOutliningConcurrency);
        ModelOutlineLoader._outlinerTaskProcessor = processor;
    }

    return ModelOutlineLoader._outlinerTaskProcessor;
};

/**
 * Parses the outline extension on model primitives and
 * adds the outlining data to the model's load resources.
 *
 * @private
 */
ModelOutlineLoader.parse = function(model, context) {
    if (!ModelOutlineLoader.hasExtension(model)) {
        return;
    }

    var loadResources = model._loadResources;
    var cacheKey = model.cacheKey;
    if (defined(cacheKey)) {
        if (!defined(ModelOutlineLoader._outlinedModelResourceCache)) {
            if (!defined(context.cache.modelOutliningCache)) {
                context.cache.modelOutliningCache = {};
            }

            ModelOutlineLoader._outlinedModelResourceCache = context.cache.modelOutliningCache;
        }

        // Outlining data for model will be loaded from cache
        var cachedData = ModelOutlineLoader._outlinedModelResourceCache[cacheKey];
        if (defined(cachedData)) {
            cachedData.count++;
            loadResources.pendingDecodingCache = true;
            return;
        }
    }

    var gltf = model.gltf;
    ForEach.mesh(gltf, function(mesh, meshId) {
        ForEach.meshPrimitive(mesh, function(primitive, primitiveId) {
            if (!defined(primitive.extensions)) {
                return;
            }

            var outlineData = primitive.extensions.CESIUM_primitive_outline;
            if (!defined(outlineData)) {
                return;
            }

            // var indicesAccessor = gltf.accessors[outlineData.indices];
            // var indicesBufferView = loadResource.getBuffer(gltf.bufferViews[indicesAccessor.bufferView]);
            loadResources.primitivesToOutline.enqueue({
                mesh : meshId,
                primitive : primitiveId,
                edgeIndicesAccessorId : outlineData.indices
            });
        });
    });
};

/**
 * Schedules outlining tasks available this frame.
 * @private
 */
ModelOutlineLoader.outlinePrimitives = function(model, context) {
    if (!ModelOutlineLoader.hasExtension(model)) {
        return when.resolve();
    }

    var loadResources = model._loadResources;
    var cacheKey = model.cacheKey;
    if (defined(cacheKey) && defined(ModelOutlineLoader._outlinedModelResourceCache)) {
        var cachedData = ModelOutlineLoader._outlinedModelResourceCache[cacheKey];
        // Load decoded data for model when cache is ready
        if (defined(cachedData) && loadResources.pendingDecodingCache) {
            return when(cachedData.ready, function () {
                model._decodedData = cachedData.data;
                loadResources.pendingDecodingCache = false;
            });
        }

        // Outline data for model should be cached when ready
        ModelOutlineLoader._outlinedModelResourceCache[cacheKey] = {
            ready : false,
            count : 1,
            data : undefined
        };
    }

    if (loadResources.primitivesToOutline.length === 0) {
        // No more tasks to schedule
        return when.resolve();
    }

    // TODO: support multiple primitives. Probably make the coordinates buffer mirror the position one.

    var gltf = model.gltf;

    while (loadResources.primitivesToOutline.length > 0) {
        var toOutline = loadResources.primitivesToOutline.dequeue();
        var result = addOutline(model, context, toOutline);
        var outlineCoordinates = result.outlineCoordinates;
        var vertices = result.vertices;

        // Update the buffer views and accessors for the copied vertices.
        // TODO: what if this data is shared with other primitives?
        var i;
        for (i = 0; i <= 2; ++i) {
            gltf.accessors[i].count = vertices.length;
        }

        var sourceBuffer = gltf.buffers[0].extras._pipeline.source;
        var vertexSource = new Float32Array(sourceBuffer.buffer, sourceBuffer.byteOffset + gltf.bufferViews[0].byteOffset, gltf.bufferViews[0].byteLength / Float32Array.BYTES_PER_ELEMENT);
        var sourceIndices = new Uint32Array(sourceBuffer.buffer, sourceBuffer.byteOffset + gltf.bufferViews[1].byteOffset, gltf.bufferViews[1].byteLength / Uint32Array.BYTES_PER_ELEMENT);
        var destBuffer = new ArrayBuffer(vertexSource.byteLength + vertices.length * 7 * Float32Array.BYTES_PER_ELEMENT + gltf.bufferViews[1].byteLength);
        var vertexDest = new Float32Array(destBuffer, 0, vertexSource.length + vertices.length * 7);
        var destIndices = new Uint32Array(destBuffer, vertexDest.byteLength, sourceIndices.length);

        // Copy the original vertices
        for (i = 0; i < vertexSource.length; ++i) {
            vertexDest[i] = vertexSource[i];
        }

        // Copy the additional vertices
        for (i = 0; i < vertices.length; ++i) {
            var sourceIndex = vertices[i] * 7;
            var destIndex = vertexSource.length + i * 7;
            for (var j = 0; j < 7; ++j) {
                vertexDest[destIndex + j] = vertexSource[sourceIndex + j];
            }
        }

        for (i = 0; i < sourceIndices.length; ++i) {
            destIndices[i] = sourceIndices[i];
        }

        gltf.buffers[0].extras._pipeline.source = new Uint8Array(destBuffer, 0, destBuffer.byteLength);
        gltf.bufferViews[0].byteLength = vertexSource.byteLength + vertices.length * 7 * Float32Array.BYTES_PER_ELEMENT;
        gltf.bufferViews[1].byteOffset = gltf.bufferViews[0].byteLength;
        loadResources.buffers[0] = gltf.buffers[0].extras._pipeline.source;

        // Create the buffers, views, and accessors for the outline texture coordinates.
        var buffer = new Float32Array(outlineCoordinates);
        var bufferIndex = model.gltf.buffers.push({
            byteLength: buffer.byteLength,
            extras: {
                _pipeline: {
                    source: buffer.buffer
                }
            }
        }) - 1;
        loadResources.buffers[bufferIndex] = new Uint8Array(buffer.buffer, 0, buffer.byteLength);

        var bufferViewIndex = model.gltf.bufferViews.push({
            buffer: bufferIndex,
            byteLength: buffer.byteLength,
            byteOffset: 0,
            byteStride: 3 * Float32Array.BYTES_PER_ELEMENT,
            target: 34962
        }) - 1;
        var accessorIndex = model.gltf.accessors.push({
            bufferView: bufferViewIndex,
            byteOffset: 0,
            componentType: 5126,
            count: buffer.length / 3,
            type: 'VEC3',
            min: [0.0, 0.0, 0.0],
            max: [1.0, 1.0, 1.0]
        }) - 1;

        var mesh = model.gltf.meshes[toOutline.mesh];
        var primitive = mesh.primitives[toOutline.primitive];
        primitive.attributes._OUTLINE_COORDINATES = accessorIndex;

        loadResources.vertexBuffersToCreate.enqueue(bufferViewIndex);
    }

    // var outlinerTaskProcessor = ModelOutlineLoader._getOutlinerTaskProcessor();
    // var outliningPromises = [];

    // var promise = scheduleOutliningTask(outlinerTaskProcessor, model, loadResources, context);
    // while (defined(promise)) {
    //     outliningPromises.push(promise);
    //     promise = scheduleOutliningTask(outlinerTaskProcessor, model, loadResources, context);
    // }

    // return when.all(outliningPromises);
};

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

ModelOutlineLoader.createTexture = function(model, context) {
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
        context : context,
        source : {
            arrayBufferView : levelZero,
            mipLevels: mipLevels
        },
        width : maxSize,
        height : 1,
        pixelFormat : PixelFormat.LUMINANCE,
        sampler : new Sampler({
            wrapS : TextureWrap.CLAMP_TO_EDGE,
            wrapT : TextureWrap.CLAMP_TO_EDGE,
            minificationFilter : TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
            magnificationFilter : TextureMagnificationFilter.LINEAR
        })
    });

    cache.outlineTexture = texture;

    return texture;
};

function addOutline(model, context, toOutline) {
    var meshId = toOutline.mesh;
    var primitiveId = toOutline.primitive;

    var gltf = model.gltf;
    var mesh = gltf.meshes[meshId];
    var primitive = mesh.primitives[primitiveId];
    var accessors = gltf.accessors;

    var positionAccessor = accessors[primitive.attributes.POSITION];
    var numPositions = positionAccessor.count;

    var triangleIndexAccessor = accessors[primitive.indices];
    var edgeIndexAccessor = accessors[toOutline.edgeIndicesAccessorId];

    var sourceBuffer = gltf.buffers[0].extras._pipeline.source;
    var triangleIndexBuffer = new Uint32Array(sourceBuffer.buffer, sourceBuffer.byteOffset + gltf.bufferViews[1].byteOffset, triangleIndexAccessor.count);
    var edgeIndexBuffer = readAccessorPacked(gltf, edgeIndexAccessor);

    // Make an array of edges (each with two vertex indices), sorted first by the lower vertex index
    // and second by the higher vertex index.
    var edges = [];
    var i;
    for (i = 0; i < edgeIndexBuffer.length; i += 2) {
        var a = edgeIndexBuffer[i];
        var b = edgeIndexBuffer[i + 1];
        edges.push([Math.min(a, b), Math.max(a, b)]);
    }

    edges.sort(compareEdge);

    var highlightCoordinates = [];
    highlightCoordinates.length = numPositions * 3;

    // Each element in this array is:
    // a) undefined, if the vertex at this index has no copies
    // b) the index of the copy.
    var vertexCopies = [];

    // Extra vertices appended after the ones originally included in the model.
    // Each element is the index of the vertex that this one is a copy of.
    var extraVertices = [];

    // For each triangle, adjust vertex data so that the correct edges are outlined.
    for (i = 0; i < triangleIndexBuffer.length; i += 3) {
        var i0 = triangleIndexBuffer[i];
        var i1 = triangleIndexBuffer[i + 1];
        var i2 = triangleIndexBuffer[i + 2];

        var all = false;
        var has01 = all || isHighlighted(edges, i0, i1);
        var has12 = all || isHighlighted(edges, i1, i2);
        var has20 = all || isHighlighted(edges, i2, i0);

        var unmatchableVertexIndex = matchAndStoreCoordinates(highlightCoordinates, i0, i1, i2, has01, has12, has20);
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
                copy = numPositions + extraVertices.length;

                var original = unmatchableVertexIndex;
                while (original >= numPositions) {
                    original = extraVertices[original - numPositions];
                }
                extraVertices.push(original);
                vertexCopies[unmatchableVertexIndex] = copy;
            }

            if (unmatchableVertexIndex === i0) {
                i0 = copy;
                triangleIndexBuffer[i] = copy;
            } else if (unmatchableVertexIndex === i1) {
                i1 = copy;
                triangleIndexBuffer[i + 1] = copy;
            } else {
                i2 = copy;
                triangleIndexBuffer[i + 2] = copy;
            }

            unmatchableVertexIndex = matchAndStoreCoordinates(highlightCoordinates, i0, i1, i2, has01, has12, has20);
        }
    }

    return {
        outlineCoordinates : highlightCoordinates,
        vertices : extraVertices
    };
}

// Each vertex has three coordinates, a, b, and c.
// a is the coordinate that applies to edge 2-0 for the vertex.
// b is the coordinate that applies to edge 0-1 for the vertex.
// c is the coordinate that applies to edge 1-2 for the vertex.

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

function computeOrderMask(highlightCoordinates, vertexIndex, a, b, c) {
    var startIndex = vertexIndex * 3;
    var first = highlightCoordinates[startIndex];
    var second = highlightCoordinates[startIndex + 1];
    var third = highlightCoordinates[startIndex + 2];

    if (first === undefined) {
        // If one coordinate is undefined, they all are, and all orderings are fine.
        return 63; // 0b111111;
    }

    return ((first === a && second === b && third === c) << 0) +
           ((first === a && second === c && third === b) << 1) +
           ((first === b && second === a && third === c) << 2) +
           ((first === b && second === c && third === a) << 3) +
           ((first === c && second === a && third === b) << 4) +
           ((first === c && second === b && third === a) << 5);
}

// popcount for integers 0-63, inclusive.
// i.e. how many 1s are in the binary representation of the integer.
function popcount0to63(value) {
    return (value & 1) + (value >> 1 & 1) + (value >> 2 & 1) + (value >> 3 & 1) + (value >> 4 & 1) + (value >> 5 & 1);
}

function matchAndStoreCoordinates(highlightCoordinates, i0, i1, i2, has01, has12, has20) {
    var a0 = has20 ? 1.0 : 0.0;
    var b0 = has01 ? 1.0 : 0.0;
    var c0 = 0.0;

    var i0Mask = computeOrderMask(highlightCoordinates, i0, a0, b0, c0);
    if (i0Mask === 0) {
        return i0;
    }

    var a1 = 0.0;
    var b1 = has01 ? 1.0 : 0.0;
    var c1 = has12 ? 1.0 : 0.0;

    var i1Mask = computeOrderMask(highlightCoordinates, i1, a1, b1, c1);
    if (i1Mask === 0) {
        return i1;
    }

    var a2 = has20 ? 1.0 : 0.0;
    var b2 = 0.0;
    var c2 = has12 ? 1.0 : 0.0;

    var i2Mask = computeOrderMask(highlightCoordinates, i2, a2, b2, c2);
    if (i2Mask === 0) {
        return i2;
    }

    var workingCombos = i0Mask & i1Mask & i2Mask;

    var a, b, c;

    if (workingCombos & 1 << 0) {
        // 0 - abc
        a = 0;
        b = 1;
        c = 2;
    } else if (workingCombos & 1 << 1) {
        // 1 - acb
        a = 0;
        c = 1;
        b = 2;
    } else if (workingCombos & 1 << 2) {
        // 2 - bac
        b = 0;
        a = 1;
        c = 2;
    } else if (workingCombos & 1 << 3) {
        // 3 - bca
        b = 0;
        c = 1;
        a = 2;
    } else if (workingCombos & 1 << 4) {
        // 4 - cab
        c = 0;
        a = 1;
        b = 2;
    } else if (workingCombos & 1 << 5) {
        // 5 - cba
        c = 0;
        b = 1;
        a = 2;
    } else {
        // No combination works.
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
    highlightCoordinates[i0Start + a] = a0;
    highlightCoordinates[i0Start + b] = b0;
    highlightCoordinates[i0Start + c] = c0;

    var i1Start = i1 * 3;
    highlightCoordinates[i1Start + a] = a1;
    highlightCoordinates[i1Start + b] = b1;
    highlightCoordinates[i1Start + c] = c1;

    var i2Start = i2 * 3;
    highlightCoordinates[i2Start + a] = a2;
    highlightCoordinates[i2Start + b] = b2;
    highlightCoordinates[i2Start + c] = c2;

    return -1;
}

function compareEdge(a, b) {
    var first = a[0] - b[0];
    if (first === 0) {
        return a[1] - b[1];
    }
    return first;
}

function isHighlighted(edges, i0, i1) {
    return binarySearch(edges, [Math.min(i0, i1), Math.max(i0, i1)], compareEdge) >= 0;
}

export default ModelOutlineLoader;
