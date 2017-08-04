define([
        '../../Core/defined'
    ], function(
        defined) {
    'use strict';

    /**
     * Given a prefix for a new ID, checks the glTF asset for matching prefixes in top-level objects with IDs and returns a unique ID.
     *
     * @param {Object} gltf A javascript object containing a glTF asset.
     * @param {String} prefix The string to try to use as the id.
     * @returns {String} A unique id beginning with prefix.
     */
    function getUniqueId(gltf, prefix) {
        var id = prefix;
        var appendIndex = 0;
        for (var topLevelGroupId in gltf) {
            if (gltf.hasOwnProperty(topLevelGroupId)) {
                var topLevelGroup = gltf[topLevelGroupId];
                var match = topLevelGroup[id];
                while (defined(match)) {
                    id = prefix + '_' + appendIndex;
                    match = topLevelGroup[id];
                    appendIndex++;
                }
            }
        }
        return id;
    }
    return getUniqueId;
});
