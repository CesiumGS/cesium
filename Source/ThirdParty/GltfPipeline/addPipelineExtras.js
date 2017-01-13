/*global define*/
define([
        '../../Core/defaultValue',
        '../../Core/defined'
    ], function(
        defaultValue,
        defined) {
    'use strict';

    // Objects with these ids should not get extras added
    var exceptions = {
        attributes: true
    };
    /**
     * Adds extras._pipeline to each object that can have extras in the glTF asset.
     *
     * @param {Object} gltf A javascript object containing a glTF asset.
     * @returns {Object} The glTF asset with the added pipeline extras.
     */
    function addPipelineExtras(gltf) {
        var objectStack = [];
        gltf.extras = defaultValue(gltf.extras, {});
        gltf.extras._pipeline = defaultValue(gltf.extras._pipeline, {});
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
                    if (defined(property) && typeof property === 'object' && propertyId !== 'extras' && !exceptions[propertyId]) {
                        objectStack.push(property);
                    }
                }
            }
        }

        return gltf;
    }

    return addPipelineExtras;
});
