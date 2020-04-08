import defined from '../Core/defined.js';
import FeatureDetection from '../Core/FeatureDetection.js';
import ForEach from '../ThirdParty/GltfPipeline/ForEach.js';
import readAccessorPacked from '../ThirdParty/GltfPipeline/readAccessorPacked.js';
import binarySearch from '../Core/binarySearch.js';
import Texture from '../Renderer/Texture.js';
import TextureWrap from '../Renderer/TextureWrap.js';
import PixelFormat from '../Core/PixelFormat.js';
import Sampler from '../Renderer/Sampler.js';
import TextureMinificationFilter from '../Renderer/TextureMinificationFilter.js';
import TextureMagnificationFilter from '../Renderer/TextureMagnificationFilter.js';

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
            if (!defined(context.cache.modelDecodingCache)) {
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

    while (loadResources.primitivesToOutline.length > 0) {
        var toOutline = loadResources.primitivesToOutline.dequeue();
        var outlineCoordinates = addOutline(model, context, toOutline);

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
            type: "VEC3",
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
    // texture[(size - 1) * 3] = 255;
    // texture[(size - 1) * 3 + 1] = 0;
    // texture[(size - 1) * 3 + 2] = 0;
    texture[size - 1] = 255;
    // texture[size - 2] = 127;
    return texture;
}

ModelOutlineLoader.createTexture = function(model, context) {
    var levelZero = createTexture(4096);
    // levelZero[4095*3] = 0;
    // levelZero[4095*3 + 1] = 255;
    // levelZero[4095*3 + 0] = 0;

    var mipLevels = [
        createTexture(2048),
        createTexture(1024),
        createTexture(512),
        createTexture(256),
        createTexture(128),
        createTexture(64),
        createTexture(32),
        createTexture(16),
        createTexture(8),
        createTexture(4),
        createTexture(2),
        createTexture(1),
    ];

    var texture = new Texture({
        context : context,
        source : {
            arrayBufferView : levelZero,
            mipLevels: mipLevels
        },
        width : 4096,
        height : 1,
        pixelFormat : PixelFormat.LUMINANCE,
        sampler : new Sampler({
            wrapS : TextureWrap.CLAMP_TO_EDGE,
            wrapT : TextureWrap.CLAMP_TO_EDGE,
            minificationFilter : TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
            magnificationFilter : TextureMagnificationFilter.LINEAR
        })
    });

    return texture;
};

function addOutline(model, context, toOutline) {
    var meshId = toOutline.mesh;
    var primitiveId = toOutline.primitive;

    var loadResources = model._loadResources;
    var gltf = model.gltf;
    var mesh = gltf.meshes[meshId];
    var primitive = mesh.primitives[primitiveId];
    var accessors = gltf.accessors;

    var positionAccessor = accessors[primitive.attributes.POSITION];
    var numPositions = positionAccessor.count;

    var triangleIndexAccessor = accessors[primitive.indices];
    var edgeIndexAccessor = accessors[toOutline.edgeIndicesAccessorId];

    var triangleIndexBuffer = readAccessorPacked(gltf, triangleIndexAccessor);
    var edgeIndexBuffer = readAccessorPacked(gltf, edgeIndexAccessor);

    // Make an array of edges (each with two vertex indices), sorted first by the lower vertex index
    // and second by the higher vertex index.
    var edges = [];
    for (let i = 0; i < edgeIndexBuffer.length; i += 2) {
        var a = edgeIndexBuffer[i];
        var b = edgeIndexBuffer[i + 1];
        edges.push([Math.min(a, b), Math.max(a, b)]);
    }

    edges.sort(compareEdge);

    var highlightCoordinates = [];
    highlightCoordinates.length = numPositions * 3;

    // For each triangle, adjust vertex data so that the correct edges are outlined.
    for (let i = 0; i < triangleIndexBuffer.length; i += 3) {
        var i0 = triangleIndexBuffer[i];
        var i1 = triangleIndexBuffer[i + 1];
        var i2 = triangleIndexBuffer[i + 2];

        if (isHighlighted(edges, i0, i1)) {
            addEdge(highlightCoordinates, i0, i1, i2);
        } /*else {
            removeEdge(highlightCoordinates, i0, i1, i2);
        }*/

        if (isHighlighted(edges, i1, i2)) {
            addEdge(highlightCoordinates, i1, i2, i0);
        } /*else {
            removeEdge(highlightCoordinates, i1, i2, i0);
        }*/

        if (isHighlighted(edges, i2, i0)) {
            addEdge(highlightCoordinates, i2, i0, i1);
        } /*else {
            removeEdge(highlightCoordinates, i2, i0, i1);
        }*/
    }

    /*for (let i = 0; i < triangleIndexBuffer.length; i += 3) {
        var i0 = triangleIndexBuffer[i];
        var i1 = triangleIndexBuffer[i + 1];
        var i2 = triangleIndexBuffer[i + 2];

        if (!isHighlighted(edges, i0, i1)) {
            makeSureIsNotEdge(highlightCoordinates, i0, i1, i2);
        }
        if (!isHighlighted(edges, i1, i2)) {
            makeSureIsNotEdge(highlightCoordinates, i1, i2, i0);
        }
        if (!isHighlighted(edges, i2, i0)) {
            makeSureIsNotEdge(highlightCoordinates, i2, i0, i1);
        }
    }*/

    // Set all coordinates that are still undefined to 0.0.
    for (let i = 0; i < highlightCoordinates.length; ++i) {
        if (highlightCoordinates[i] === undefined) {
            highlightCoordinates[i] = 0.0;
        }
    }

    return highlightCoordinates;
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

function addEdge(highlightCoordinates, highlightedVertex0, highlightedVertex1, thirdVertex) {
    for (let i = 0; i < 3; ++i) {
        var highlightCoordinate0 = highlightCoordinates[highlightedVertex0 * 3 + i];
        var highlightCoordinate1 = highlightCoordinates[highlightedVertex1 * 3 + i];
        var highlightCoordinate2 = highlightCoordinates[thirdVertex * 3 + i];

        if (
            highlightCoordinate0 === undefined || highlightCoordinate0 === 1.0 &&
            highlightCoordinate1 === undefined || highlightCoordinate1 === 1.0 &&
            highlightCoordinate2 === undefined || highlightCoordinate2 === 0.0
        ) {
            highlightCoordinates[highlightedVertex0 * 3 + i] = 1.0;
            highlightCoordinates[highlightedVertex1 * 3 + i] = 1.0;
            highlightCoordinates[thirdVertex * 3 + i] = 0.0;
            return;
        }
    }

    // TODO: not enough texture coordinates available, so we need to duplicate this vertex.
    console.log('TODO: Need to duplicate vertex');
}

function removeEdge(highlightCoordinates, notHighlightedVertex0, notHighlightedVertex1, thirdVertex) {
    for (let i = 0; i < 3; ++i) {
        var highlightCoordinate0 = highlightCoordinates[notHighlightedVertex0 * 3 + i];
        var highlightCoordinate1 = highlightCoordinates[notHighlightedVertex1 * 3 + i];

        if (highlightCoordinate0 === 1.0 && highlightCoordinate1 === 1.0) {
            // If we use these two vertices, there will be an edge between them.
            // That's no good, so we need to duplicate the vertices.
        }
        if (
            highlightCoordinate0 === undefined || highlightCoordinate0 === 1.0 &&
            highlightCoordinate1 === undefined || highlightCoordinate1 === 1.0 &&
            highlightCoordinate2 === undefined || highlightCoordinate2 === 0.0
        ) {
            highlightCoordinates[notHighlightedVertex0 * 3 + i] = 1.0;
            highlightCoordinates[notHighlightedVertex1 * 3 + i] = 1.0;
            highlightCoordinates[thirdVertex * 3 + i] = 0.0;
            return;
        }
    }

    // TODO: not enough texture coordinates available, so we need to duplicate this vertex.
    console.log('TODO: Need to duplicate vertex');
}

function makeSureIsNotEdge(highlightCoordinates, notHighlightedVertex0, notHighlightedVertex1, thirdVertex) {
    for (let i = 0; i < 3; ++i) {
        var highlightCoordinate0 = highlightCoordinates[notHighlightedVertex0 * 3 + i];
        var highlightCoordinate1 = highlightCoordinates[notHighlightedVertex1 * 3 + i];

        if (highlightCoordinate0 === 1.0 && highlightCoordinate1 === 1.0) {
            console.log('bad');
        }
    }
}

export default ModelOutlineLoader;
