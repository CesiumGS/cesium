/*global define*/
define([
        '../Core/Enumeration'
    ], function(
        Enumeration) {
    "use strict";

    /**
     * @private
     */
    var MipmapHint = {
        DONT_CARE : new Enumeration(0x1100, 'DONT_CARE'),
        FASTEST : new Enumeration(0x1101, 'FASTEST'),
        NICEST : new Enumeration(0x1102, 'NICEST'),

        validate : function(mipmapHint) {
            return ((mipmapHint === MipmapHint.DONT_CARE) ||
                    (mipmapHint === MipmapHint.FASTEST) ||
                    (mipmapHint === MipmapHint.NICEST));
        }
    };

    return MipmapHint;
});
