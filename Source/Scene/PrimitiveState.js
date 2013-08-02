/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * @private
     */
    var PrimitiveState = {
        READY : new Enumeration(0, 'READY'),
        COMBINING : new Enumeration(1, 'COMBINING'),
        COMBINED : new Enumeration(2, 'COMBINED'),
        COMPLETE : new Enumeration(3, 'COMPLETE'),
        FAILED : new Enumeration(4, 'FAILED')
    };

    return PrimitiveState;
});
