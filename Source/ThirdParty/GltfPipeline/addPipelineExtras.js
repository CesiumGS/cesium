/*global define*/
define([
        '../../Core/defined'
    ], function(
        defined) {
    'use strict';

    /**
     * Adds extras._pipeline to each object in the glTF asset.
     *
     * @param {Object} gltf A javascript object containing a glTF asset.
     * @returns {Object} The glTF asset with the added pipeline extras.
     */
    function addPipelineExtras(gltf) {
        var reference = {
            "accessors": { "accessorObject": { "addPipelineExtra": true } },
            "animations": {
                "animationObject": {
                    "channels": [
                        {
                            "target": { "addPipelineExtra": true },
                            "addPipelineExtra": true
                        }
                    ],
                    "samplers": { "samplerObject": { "addPipelineExtra": true } },
                    "addPipelineExtra": true
                }
            },
            "asset": {
                "profile": { "addPipelineExtra": true },
                "addPipelineExtra": true
            },
            "buffers": { "bufferObject": { "addPipelineExtra": true } },
            "bufferViews": { "bufferViewObject": { "addPipelineExtra": true } },
            "cameras": {
                "cameraObject": {
                    "orthographic": { "addPipelineExtra": true },
                    "perspective": { "addPipelineExtra": true },
                    "addPipelineExtra": true
                }
            },
            "images": { "imageObject": { "addPipelineExtra": true } },
            "materials": { "materialObject": { "addPipelineExtra": true } },
            "meshes": {
                "meshObject": {
                    "primitives": [
                        { "addPipelineExtra": true }
                    ],
                    "addPipelineExtra": true
                }
            },
            "nodes": { "nodeObject": { "addPipelineExtra": true } },
            "programs": { "programObject": { "addPipelineExtra": true } },
            "samplers": { "samplerObject": { "addPipelineExtra": true } },
            "scenes": { "sceneObject": { "addPipelineExtra": true } },
            "shaders": { "shaderObject": { "addPipelineExtra": true } },
            "skins": { "skinObject": { "addPipelineExtra": true } },
            "techniques": {
                "techniqueObject": {
                    "parameters": { "parameterObject": { "addPipelineExtra": true } },
                    "states": {
                        "functions": { "addPipelineExtra": true },
                        "addPipelineExtra": true
                    },
                    "addPipelineExtra": true
                }
            },
            "textures": { "textureObject": { "addPipelineExtra": true } },
            "addPipelineExtra": true
        };

        addPipelineExtra(gltf, reference);

        return gltf;
    }

    function addPipelineExtra(object, reference) {
        if (defined(reference) && defined(object) && typeof object === 'object') {
            if (defined(reference.addPipelineExtra)) {
                if (defined(object.extras)) {
                    object.extras._pipeline = {
                        "deleteExtras": false
                    };
                }
                else {
                    object.extras = {
                        "_pipeline": {
                            "deleteExtras": true
                        }
                    };
                }
            }

            for (var propertyId in object) {
                if (object.hasOwnProperty(propertyId) && propertyId !== 'extras') {
                    var property = object[propertyId];

                    if (reference.hasOwnProperty(propertyId)) {
                        addPipelineExtra(property, reference[propertyId]);
                    }
                    else {
                        for (var referencePropertyId in reference) {
                            if (reference.hasOwnProperty(referencePropertyId)) {
                                var referenceProperty = reference[referencePropertyId];
                                if (typeof referenceProperty === 'object') {
                                    addPipelineExtra(property, referenceProperty);
                                }
                            }
                        }
                    }
                }
            }
        }

        return object;
    }
    return addPipelineExtras;
});