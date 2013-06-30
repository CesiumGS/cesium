/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * @private
     */
    var ImageryState = {
        UNLOADED : new Enumeration(0, 'UNLOADED'),
        TRANSITIONING : new Enumeration(1, 'TRANSITIONING'),
        RECEIVED : new Enumeration(2, 'RECEIVED'),
        TEXTURE_LOADED : new Enumeration(3, 'TEXTURE_LOADED'),
        READY : new Enumeration(4, 'READY'),
        FAILED : new Enumeration(5, 'FAILED'),
        INVALID : new Enumeration(6, 'INVALID'),
        PLACEHOLDER : new Enumeration(7, 'PLACEHOLDER')
    };

    return ImageryState;
});
