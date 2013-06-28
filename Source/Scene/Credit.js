/*global define*/
define([
        '../Core/DeveloperError'
    ], function (
            DeveloperError) {
    "use strict";

    /**
     * A credit contains data pertaining to how to display attributions/credits for certain content on the screen.
     *
     *  @param {String} name A unique identifier for the credit
     *  @param {String} [text=undefined] The text to be displayed on the screen if no image is specified.
     *  @param {String} [image=undefined] The source location for an image
     *  @param {String} [link=undefined] A URL location for which the credit will be hyperlinked
     *
     *  @alias Credit
     *  @constructor
     *
     *  @example
     *  //Create a credit with an image and link
     *  var credit = new Credit('cesium-credit', undefined, '/images/cesium_logo.png', 'http://cesium.agi.com/');
     */

    var Credit = function(name, text, image, link) {
        if (typeof name === 'undefined') {
            throw new DeveloperError('Credit is required to have a name');
        }
        if (typeof text === 'undefined' && typeof image === 'undefined' && typeof link === 'undefined') {
            text = name;
        }
        /**
         * The unique identifier for the credit.  If more than one credit has the same name, only one will be displayed.
         *
         * @type String
         */
        this.name = name;

        /**
         * The text to be displayed on screen if no image is specified.
         * When text, image and link are <code>undefined</code>, <code>text = name</code>
         *
         * @type String
         */
        this.text = text;

        /**
         * The source location for the image.
         *
         * @type String
         */
        this.image = image;

        /**
         * A URL location for which the credit will be hyperlinked
         */
        this.link = link;
    };

    /**
     * Displays all credits in a list to the credit container
     *
     * @memberof Credit
     *
     * @param {Credit} left The first credit
     * @param {Credit} left The second credit
     *
     * @return {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    Credit.equals = function(left, right) {
        var leftUndefied = (typeof left === 'undefined');
        var rightUndefined = (typeof right === 'undefined');
        if (leftUndefied || rightUndefined) {
            return (leftUndefied && rightUndefined);
        }

        return (left.name === right.name && left.text === right.text && left.image === right.image && left.link === right.link);
    };

    /**
     * Displays all credits in a list to the credit container
     *
     * @memberof Credit
     *
     * @param Array {Credit} credits The credits to display
     *
     * @return {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    Credit.prototype.equals = function(credit) {
        return Credit.equals(this, credit);
    };

    return Credit;
});