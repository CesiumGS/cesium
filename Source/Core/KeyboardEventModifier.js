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
         * @constant
         * @type {Enumeration}
         */
        SHIFT : new Enumeration(0, 'SHIFT'),

        /**
         * Represents the control key being held down.
         *
         * @constant
         * @type {Enumeration}
         */
        CTRL : new Enumeration(1, 'CTRL'),

        /**
         * Represents the alt key being held down.
         *
         * @constant
         * @type {Enumeration}
         */
        ALT : new Enumeration(2, 'ALT')
    };

    return KeyboardEventModifier;
});