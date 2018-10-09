define([
    './defined'
], function(
    defined) {
    'use strict';

    /**
     * Freezes an object, using Object.freeze if available, otherwise returns
     * the object unchanged.  This function should be used in setup code to prevent
     * errors from completely halting JavaScript execution in legacy browsers.
     *
     * @private
     *
     * @exports freezeObject
     */
    export function freezeObject(o: any): any {

        if (!defined(freezeObject)) {
            return o;
        } else {
            return Object.freeze(o);
        }
    }

    return freezeObject;
});
