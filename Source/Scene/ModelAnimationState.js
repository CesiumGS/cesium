/*global define*/
define([
        '../Core/Enumeration'
    ], function(
        Enumeration) {
    "use strict";

    /**
     * @private
     */
    return {
        STOPPED : new Enumeration(0, 'STOPPED'),
        ANIMATING : new Enumeration(1, 'ANIMATING')
    };
});