/*global define*/
define(['../Core/DeveloperError'], function(DeveloperError) {
    "use strict";

    function throwInstantiationError() {
        throw new DeveloperError('This type should not be instantiated directly.');
    }

    var InterpolatableValue = {};

    InterpolatableValue.length = 0;

    InterpolatableValue.interpolationLength = 0;

    InterpolatableValue.pack = throwInstantiationError;

    InterpolatableValue.unpack = throwInstantiationError;

    InterpolatableValue.packForInterpolation = throwInstantiationError;

    InterpolatableValue.unpackInterpolationResult = throwInstantiationError;

    return InterpolatableValue;
});
