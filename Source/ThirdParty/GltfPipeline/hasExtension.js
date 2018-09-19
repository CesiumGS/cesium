define([
        '../../Core/defined'
    ], function(
        defined) {
    'use strict';

    /**
     * Checks whether the glTF has the given extension.
     *
     * @param {Object} gltf A javascript object containing a glTF asset.
     * @param {String} extension The name of the extension.
     * @returns {Boolean} Whether the glTF has the given extension.
     *
     * @private
     */
    function hasExtension(gltf, extension) {
        return defined(gltf.extensionsUsed) && (gltf.extensionsUsed.indexOf(extension) >= 0);
    }

    return hasExtension;
});
