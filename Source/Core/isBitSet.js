define([], function() {
    'use strict';

    /**
     * @private
     */
    function isBitSet(bits, mask) {
        return ((bits & mask) !== 0);
    }

    return isBitSet;
});
