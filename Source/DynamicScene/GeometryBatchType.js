/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    var GeometryBatchType = {
        COLOR : new Enumeration(0, 'COLOR'),
        MATERIAL : new Enumeration(1, 'MATERIAL'),
        DYNAMIC : new Enumeration(2, 'DYNAMIC'),
        NONE : new Enumeration(3, 'NONE')
    };

    return GeometryBatchType;
});
