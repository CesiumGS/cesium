define([], function() {
    'use strict';

    /**
     * @private
     */
    export function isBitSet(bits, mask) {
        return ((bits & mask) !== 0);
    }

    return isBitSet;
});
