/*global define*/
define([
        '../Core/DeveloperError'
    ], function (
            DeveloperError) {
    "use strict";

    /**
     * A credit contains data pertaining to how to display attributions/credits for certain content on the screen.
     *
     *  @param {String} [text=undefined] The text to be displayed on the screen if no imageUrl is specified.
     *  @param {String} [imageUrl=undefined] The source location for an image
     *  @param {String} [link=undefined] A URL location for which the credit will be hyperlinked
     *
     *  @alias Credit
     *  @constructor
     *
     *  @example
     *  //Create a credit with an image and link
     *  var credit = new Credit('cesium-credit', undefined, '/images/cesium_logo.png', 'http://cesium.agi.com/');
     */

    var Credit = function(text, imageUrl, link) {
        if (typeof text === 'undefined' && typeof imageUrl === 'undefined' && typeof link === 'undefined') {
            throw new DeveloperError('text, imageUrl or link is required');
        }

        this._text = text;

        this._imageUrl = imageUrl;

        this._link = link;

    };

    /**
     * Returns the credit text
     *
     * @returns {String}
     */
    Credit.prototype.getText = function() {
        return this._text;
    };

    /**
     * Returns the source location for the image.
     *
     * @returns {String}
     */
    Credit.prototype.getImageUrl = function() {
        return this._imageUrl;
    };

    /**
     * Returns a URL location for the credit hyperlink
     *
     * @returns {String}
     */
    Credit.prototype.getLink = function() {
        return this._link;
    };

    /**
     * Returns true if the credits are equal
     *
     * @memberof Credit
     *
     * @param {Credit} left The first credit
     * @param {Credit} left The second credit
     *
     * @return {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    Credit.equals = function(left, right) {
        var leftUndefined = (typeof left === 'undefined');
        var rightUndefined = (typeof right === 'undefined');

        return ((left === right) ||
               ((leftUndefined && rightUndefined) ||
               (!leftUndefined && !rightUndefined)) &&
               ((left._text === right._text &&
               left._imageUrl === right._imageUrl &&
               left._link === right._link)));
    };

    /**
     * Returns true if the credits are equal
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