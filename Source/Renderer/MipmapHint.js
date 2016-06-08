/*global define*/
define([
        '../Core/freezeObject',
        './WebGLConstants'
    ], function(
        freezeObject,
        WebGLConstants) {
    'use strict';

    /**
     * @private
     */
    var MipmapHint = {
        DONT_CARE : WebGLConstants.DONT_CARE,
        FASTEST : WebGLConstants.FASTEST,
        NICEST : WebGLConstants.NICEST,

        validate : function(mipmapHint) {
            return ((mipmapHint === MipmapHint.DONT_CARE) ||
                    (mipmapHint === MipmapHint.FASTEST) ||
                    (mipmapHint === MipmapHint.NICEST));
        }
    };

    return freezeObject(MipmapHint);
});