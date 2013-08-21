/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * @private
     */
    var PrimitiveState = {
        READY : new Enumeration(0, 'READY'),
        CREATING : new Enumeration(1, 'CREATING'),
        CREATED : new Enumeration(2, 'CREATED'),
        COMBINING : new Enumeration(3, 'COMBINING'),
        COMBINED : new Enumeration(4, 'COMBINED'),
        COMPLETE : new Enumeration(5, 'COMPLETE'),
        FAILED : new Enumeration(6, 'FAILED')
    };

    return PrimitiveState;
});
