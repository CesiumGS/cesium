/*global define*/
define(function() {
    "use strict";

    /**
     * @private
     */
    var TextureMagnificationFilter = {
        NEAREST : 0x2600,
        LINEAR : 0x2601,

        validate : function(textureMagnificationFilter) {
            return ((textureMagnificationFilter === TextureMagnificationFilter.NEAREST) ||
                    (textureMagnificationFilter === TextureMagnificationFilter.LINEAR));
        }
    };

    return TextureMagnificationFilter;
});
