define([
        './addExtensionsUsed',
        '../../Core/defined'
    ], function(
        addExtensionsUsed,
        defined) {
    'use strict';

    /**
     * Adds an extension to gltf.extensionsRequired if it does not already exist.
     * Initializes extensionsRequired if it is not defined.
     *
     * @param {Object} gltf A javascript object containing a glTF asset.
     * @param {String} extension The extension to add.
     */
    function addExtensionsRequired(gltf, extension) {
        var extensionsRequired = gltf.extensionsRequired;
        if (!defined(extensionsRequired)) {
            extensionsRequired = [];
            gltf.extensionsRequired = extensionsRequired;
        }
        if (extensionsRequired.indexOf(extension) < 0) {
            extensionsRequired.push(extension);
        }
        addExtensionsUsed(gltf, extension);
    }
    return addExtensionsRequired;
});
