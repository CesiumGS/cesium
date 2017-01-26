/*global define*/
define([
    '../../Core/defaultValue',
    '../../Core/defined'
    ], function(
        defaultValue,
        defined) {
    'use strict';

    // Objects with these ids should not have extras added
    var exceptions = {
        attributes: true,
        uniforms: true,
        extensions: true,
        values: true,
        samplers: true
    };

    /**
     * Adds extras._pipeline to each object that can have extras in the glTF asset.
     *
     * @param {Object} gltf A javascript object containing a glTF asset.
     * @returns {Object} The glTF asset with the added pipeline extras.
     */
    function addPipelineExtras(gltf) {
        var objectStack = [];
        for (var rootObjectId in gltf) {
            if (gltf.hasOwnProperty(rootObjectId)) {
                var rootObject = gltf[rootObjectId];
                objectStack.push(rootObject);
            }
        }
        while (objectStack.length > 0) {
            var object = objectStack.pop();
            for (var propertyId in object) {
                if (object.hasOwnProperty(propertyId)) {
                    var property = object[propertyId];
                    if (defined(property) && typeof property === 'object' && propertyId !== 'extras') {
                        objectStack.push(property);
                        if (!exceptions[propertyId] && !Array.isArray(property)) {
                            property.extras = defaultValue(property.extras, {});
                            property.extras._pipeline = defaultValue(property.extras._pipeline, {});
                        }
                    }
                }
            }
        }
        gltf.extras = defaultValue(gltf.extras, {});
        gltf.extras._pipeline = defaultValue(gltf.extras._pipeline, {});
        gltf.asset = defaultValue(gltf.asset, {});
        gltf.asset.extras = defaultValue(gltf.asset.extras, {});
        gltf.asset.extras._pipeline = defaultValue(gltf.asset.extras._pipeline, {});
        return gltf;
    }
    return addPipelineExtras;
});
