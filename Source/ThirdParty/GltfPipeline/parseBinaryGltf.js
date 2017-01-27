/*global define*/
define([
        './addPipelineExtras',
        '../../Core/ComponentDatatype',
        '../../Core/defined',
        '../../Core/DeveloperError',
        '../../Core/defaultValue',
        '../../Core/getMagic',
        '../../Core/getStringFromTypedArray',
        '../../Core/WebGLConstants'
    ], function(
        addPipelineExtras,
        ComponentDatatype,
        defined,
        DeveloperError,
        defaultValue,
        getMagic,
        getStringFromTypedArray,
        WebGLConstants) {
    'use strict';

    /**
     * Parses a binary glTF buffer into glTF JSON.
     *
     * @param {Uint8Array} data The binary glTF data to parse.
     * @returns {Object} The parsed binary glTF.
     */
    function parseBinaryGltf(data) {
        var bufferViewId;

        // Check that the magic string is present
        if (getMagic(data) !== 'glTF') {
            throw new DeveloperError('File is not valid binary glTF');
        }

        var uint32View = ComponentDatatype.createArrayBufferView(WebGLConstants.INT, data.buffer, data.byteOffset, 5);

        // Check that the version is 1
        if (uint32View[1] !== 1) {
            throw new DeveloperError('Binary glTF version is not 1');
        }

        // Get the length of the glTF scene
        var sceneLength = uint32View[3];

        // Check that the scene format is 0, indicating that it is JSON
        if (uint32View[4]) {
            throw new DeveloperError('Binary glTF scene format is not JSON');
        }

        // Parse gltf scene
        var scene = getStringFromTypedArray(data.slice(20, 20 + sceneLength));
        var gltf = JSON.parse(scene);
        addPipelineExtras(gltf);

        // Extract binary body
        var body = data.slice(20 + sceneLength);

        // Find bufferViews used by accessors
        var usedBufferViews = getUsedBufferViews(gltf);

        // Add image and shader sources, and delete their bufferView if not referenced by an accessor
        loadSourceFromBody(gltf, body, 'images', usedBufferViews);
        loadSourceFromBody(gltf, body, 'shaders', usedBufferViews);

        // Create a new buffer for each bufferView, and delete the original body buffer
        var buffers = gltf.buffers;
        var bufferViews = gltf.bufferViews;
        // The extension 'KHR_binary_glTF' uses a special buffer entitled just 'binary_glTF'.
        // The 'KHR_binary_glTF' check is for backwards compatibility for the Cesium model converter
        // circa Cesium 1.15-1.20 when the converter incorrectly used the buffer name 'KHR_binary_glTF'.
        if (defined(buffers) && (defined(buffers.binary_glTF) || defined(buffers.KHR_binary_glTF))) {
            if (defined(bufferViews)) {
                //Add id to each bufferView object
                for (bufferViewId in bufferViews) {
                    if (bufferViews.hasOwnProperty(bufferViewId)) {
                        var bufferView = bufferViews[bufferViewId];
                        bufferView.extras._pipeline.id = bufferViewId;
                    }
                }

                //Create bufferView array and get bufferViews referencing binary_glTF
                var sortedBufferViews = [];
                for (bufferViewId in bufferViews) {
                    if (bufferViews.hasOwnProperty(bufferViewId)) {
                        sortedBufferViews.push(bufferViews[bufferViewId]);
                    }
                }
                sortedBufferViews = sortedBufferViews.filter(function(bufferView) {
                    return bufferView.buffer === 'binary_glTF' || bufferView.buffer === 'KHR_binary_glTF';
                });
                //Sort bufferViews by increasing byteOffset
                sortedBufferViews.sort(function(a, b) {
                    return a.byteOffset - b.byteOffset;
                });

                //Create a new buffer for each set of overlapping bufferViews
                for (var i = 0; i < sortedBufferViews.length; i++) {
                    var currentView = sortedBufferViews[i];
                    var viewStart = currentView.byteOffset;
                    var viewLength = defaultValue(currentView.byteLength, 0);
                    var viewEnd = viewStart + viewLength;
                    currentView.byteOffset = 0;
                    currentView.byteLength = viewLength;

                    var bufferName = currentView.extras._pipeline.id + '_buffer';
                    var bufferKeys = Object.keys(buffers);
                    while (bufferKeys.indexOf(bufferName) !== -1) {
                        bufferName += '_';
                    }
                    currentView.buffer = bufferName;

                    for (var j = i + 1; j < sortedBufferViews.length; i = j, j++) {
                        var nextView = sortedBufferViews[j];
                        var nextViewStart = nextView.byteOffset;
                        var nextViewLength = defaultValue(nextView.byteLength, 0);
                        var nextViewEnd = nextViewStart + nextViewLength;
                        //Merge view ranges if they overlap
                        if (nextViewStart < viewEnd) {
                            nextView.byteOffset = nextViewStart - viewStart;
                            nextView.byteLength = nextViewLength;
                            nextView.buffer = bufferName;
                            if (nextViewEnd > viewEnd) {
                                viewEnd = nextViewEnd;
                            }
                        }
                        else {
                            break;
                        }
                    }

                    buffers[bufferName] = {
                        "byteLength" : viewEnd - viewStart,
                        "uri" : "data:,",
                        "extras" : {
                            "_pipeline" : {
                                "source" : body.slice(viewStart, viewEnd)
                            }
                        }
                    };
                }
            }
            delete gltf.buffers.binary_glTF;
        }
        // Remove the KHR_binary_glTF extension
        gltf.extensionsUsed = gltf.extensionsUsed.filter(function(extension) {
            return extension !== 'KHR_binary_glTF';
        });
        if (Object.keys(gltf.extensionsUsed).length === 0) {
            delete gltf.extensionsUsed;
        }

        return gltf;
    }

    // Load the source from the binary body to the corresponding objects
    function loadSourceFromBody(gltf, body, name, usedBufferViews) {
        var objects = gltf[name];
        if (defined(objects)) {
            for (var objectId in objects) {
                if (objects.hasOwnProperty(objectId)) {
                    var object = objects[objectId];
                    var objectExtensions = object.extensions;
                    if (defined(objectExtensions) && defined(objectExtensions.KHR_binary_glTF)) {
                        var viewId = objectExtensions.KHR_binary_glTF.bufferView;
                        var bufferView = gltf.bufferViews[viewId];
                        var source = body.slice(bufferView.byteOffset, bufferView.byteOffset + bufferView.byteLength);
                        object.extras._pipeline.source = source;

                        if (name === 'shaders') {
                            object.extras._pipeline.extension = '.glsl';
                            object.extras._pipeline.source = getStringFromTypedArray(source);
                        }
                        else if (name === 'images') {
                            object.extras._pipeline.extension = getBinaryImageFormat(source.slice(0, 2));
                        }
                        delete object.extensions.KHR_binary_glTF;
                        if (Object.keys(object.extensions).length === 0) {
                            delete object.extensions;
                        }

                        //Delete the original referenced bufferView if not used anywhere else
                        if (!defined(usedBufferViews[viewId])) {
                            delete gltf.bufferViews[viewId];
                        }
                    }
                }
            }
        }
    }

    //Get the set bufferViews used by accessors
    function getUsedBufferViews(gltf) {
        var usedBufferViews = {};
        var accessors = gltf.accessors;

        if (defined(accessors)) {
            for (var accessorId in accessors) {
                if (accessors.hasOwnProperty(accessorId)) {
                    usedBufferViews[accessors[accessorId].bufferView] = true;
                }
            }
        }

        return usedBufferViews;
    }

    function bufferEqual(first, second) {
        for (var i = 0; i < first.length && i < second.length; i++) {
            if (first[i] !== second[i]) {
                return false;
            }
        }
        return true;
    }

    //Get binary image file format from first two bytes
    function getBinaryImageFormat(header) {
        if (bufferEqual(header, new Uint8Array([66, 77]))) { //.bmp: 42 4D
            return '.bmp';
        }
        else if (bufferEqual(header, new Uint8Array([71, 73]))) { //.gif: 47 49
            return '.gif';
        }
        else if (bufferEqual(header, new Uint8Array([255, 216]))) { //.jpg: ff d8
            return '.jpg';
        }
        else if (bufferEqual(header, new Uint8Array([137, 80]))) { //.png: 89 50
            return '.png';
        }
        else {
            throw new DeveloperError('Binary image does not have valid header');
        }
    }
    return parseBinaryGltf;
});
