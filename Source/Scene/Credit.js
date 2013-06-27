/*global define*/
define([
        '../Core/DeveloperError'
    ], function (
            DeveloperError) {
    "use strict";

    /**
     * DOC_TBA
     */

    var Credit = function(name, text, image, link) {
        if (typeof name === 'undefined') {
            throw new DeveloperError('Credit is required to have a name');
        }
        if (typeof text === 'undefined' && typeof image === 'undefined' && typeof link === 'undefined') {
            text = name;
        }
        /**
         * DOC_TBA
         */
        this.name = name;

        /**
         * DOC_TBA
         */
        this.text = text;

        /**
         * DOC_TBA
         */
        this.image = image;

        /**
         * DOC_TBA
         */
        this.link = link;
    };

    Credit.equals = function(left, right) {
        if (left.name === right.name) {
            return true;
        }
        return false;
    };

    Credit.prototype.equals = function(credit) {
        return Credit.equals(this, credit);
    };

    return Credit;
});