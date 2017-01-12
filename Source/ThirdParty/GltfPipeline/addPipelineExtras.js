/*global define*/
define([
        '../../Core/defaultValue',
        '../../Core/defined'
    ], function(
        defaultValue,
        defined) {
    'use strict';

    /**
     * Adds extras._pipeline to each object in the glTF asset.
     *
     * @param {Object} gltf A javascript object containing a glTF asset.
     * @returns {Object} The glTF asset with the added pipeline extras.
     */
    function addPipelineExtras(gltf) {
        var objectStack = [];
        for (var rootObjectId in gltf) {
            if (gltf.hasOwnProperty(rootObjectId)) {
                var rootObject = gltf[rootObjectId];
                for (var topLevelObjectId in rootObject) {
                    if (rootObject.hasOwnProperty(topLevelObjectId)) {
                        var topLevelObject = rootObject[topLevelObjectId];
                        if (defined(topLevelObject) && typeof topLevelObject === 'object') {
                            objectStack.push(topLevelObject);
                        }
                    }
                }
            }
        }
        while (objectStack.length > 0) {
            var object = objectStack.pop();
            object.extras = defaultValue(object.extras, {});
            object.extras._pipeline = defaultValue(object.extras._pipeline, {});
            for (var propertyId in object) {
                if (object.hasOwnProperty(propertyId)) {
                    var property = object[propertyId];
                    if (defined(property) && typeof property === 'object' && propertyId !== 'extras') {
                        objectStack.push(property);
                    }
                }
            }
        }

        return gltf;
    }

    return addPipelineExtras;
});