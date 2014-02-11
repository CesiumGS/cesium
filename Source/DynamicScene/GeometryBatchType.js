/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    var GeometryBatchType = {
        COLOR_CLOSED : new Enumeration(0, 'COLOR_CLOSED'),
        MATERIAL_CLOSED : new Enumeration(1, 'MATERIAL_CLOSED'),
        COLOR_OPEN : new Enumeration(2, 'COLOR_OPEN'),
        MATERIAL_OPEN : new Enumeration(3, 'MATERIAL_OPEN'),
        DYNAMIC : new Enumeration(4, 'DYNAMIC'),
        NONE : new Enumeration(5, 'NONE')
    };

    return GeometryBatchType;
});
