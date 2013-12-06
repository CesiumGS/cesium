/*global define*/
define(['./Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * This enumerated type is for representing keyboard modifiers. These are keys
     * that are held down in addition to other event types.
     *
     * @exports KeyboardEventModifier
     */
    var KeyboardEventModifier = {
        /**
         * Represents the shift key being held down.
         *
         * @type {Enumeration}
         * @constant
         */
        SHIFT : 1,

        /**
         * Represents the control key being held down.
         *
         * @type {Enumeration}
         * @constant
         */
        CTRL : 2,

        /**
         * Represents the alt key being held down.
         *
         * @type {Enumeration}
         * @constant
         */
        ALT : 3
    };

    return KeyboardEventModifier;
});
