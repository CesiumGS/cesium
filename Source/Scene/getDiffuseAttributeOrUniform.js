define([
        '../Core/defined',
        './getAttributeOrUniformBySemantic'
    ], function(
        defined,
        getAttributeOrUniformBySemantic) {
    'use strict';

    /**
     * Return the uniform or attribute that represents the diffuse color.
     *
     * @param {Object} gltf The gltf asset.
     * @param {Number} [programId] Only look at techniques that use this program
     *
     * @private
     */
    function getDiffuseAttributeOrUniform(gltf, programId) {
        var diffuseUniformName = getAttributeOrUniformBySemantic(gltf, 'COLOR_0', programId);
        if (!defined(diffuseUniformName)) {
            diffuseUniformName = getAttributeOrUniformBySemantic(gltf, '_3DTILESDIFFUSE', programId);
        }
        return diffuseUniformName;
    }

    return getDiffuseAttributeOrUniform;
});
