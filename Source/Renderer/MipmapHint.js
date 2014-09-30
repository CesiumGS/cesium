/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * @private
     */
    var MipmapHint = {
        DONT_CARE : 0x1100,
        FASTEST : 0x1101,
        NICEST : 0x1102,

        validate : function(mipmapHint) {
            return ((mipmapHint === MipmapHint.DONT_CARE) ||
                    (mipmapHint === MipmapHint.FASTEST) ||
                    (mipmapHint === MipmapHint.NICEST));
        }
    };

    return freezeObject(MipmapHint);
});