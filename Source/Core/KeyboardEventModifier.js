/*global define*/
define([
        './freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * This enumerated type is for representing keyboard modifiers. These are keys
     * that are held down in addition to other event types.
     *
     * @namespace
     * @alias KeyboardEventModifier
     */
    var KeyboardEventModifier = {
        /**
         * Represents the shift key being held down.
         *
         * @type {Number}
         * @constant
         */
        SHIFT : 0,

        /**
         * Represents the control key being held down.
         *
         * @type {Number}
         * @constant
         */
        CTRL : 1,

        /**
         * Represents the alt key being held down.
         *
         * @type {Number}
         * @constant
         */
        ALT : 2
    };

    return freezeObject(KeyboardEventModifier);
});