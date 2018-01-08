define([
    './defaultValue',
    './defined',
    './defineProperties',
    './DeveloperError'
], function(
    defaultValue,
    defined,
    defineProperties,
    DeveloperError) {
    'use strict';

    var nextCreditId = 0;
    var creditToId = {};

    /**
     * A credit contains data pertaining to how to display attributions/credits for certain content on the screen.
     * @param {Object} [options] An object with the following properties
     * @param {String} [options.text] The text to be displayed on the screen if no imageUrl is specified.
     * @param {String} [options.imageUrl] The source location for an image
     * @param {String} [options.link] A URL location for which the credit will be hyperlinked
     * @param {String} [options.showOnScreen=false] If true, the credit will be visible in the main credit container.  Otherwise, it will appear in a popover
     *
     * @alias Credit
     * @constructor
     *
     * @exception {DeveloperError} options.text, options.imageUrl, or options.link is required.
     *
     * @example
     * //Create a credit with a tooltip, image and link
     * var credit = new Cesium.Credit({
     *     text : 'Cesium',
     *     imageUrl : '/images/cesium_logo.png',
     *     link : 'http://cesiumjs.org/'
     * });
     */
    function Credit(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var text = options.text;
        var imageUrl = options.imageUrl;
        var link = options.link;
        var showOnScreen = defaultValue(options.showOnScreen, false);

        var hasLink = (defined(link));
        var hasImage = (defined(imageUrl));
        var hasText = (defined(text));

        //>>includeStart('debug', pragmas.debug);
        if (!hasText && !hasImage && !hasLink) {
            throw new DeveloperError('options.text, options.imageUrl, or options.link is required.');
        }
        //>>includeEnd('debug');

        if (!hasText && !hasImage) {
            text = link;
        }

        this._text = text;
        this._imageUrl = imageUrl;
        this._link = link;
        this._hasLink = hasLink;
        this._hasImage = hasImage;
        this._showOnScreen = showOnScreen;

        // Credits are immutable so generate an id to use to optimize equal()
        var id;
        var key = JSON.stringify([text, imageUrl, link]);

        if (defined(creditToId[key])) {
            id = creditToId[key];
        } else {
            id = nextCreditId++;
            creditToId[key] = id;
        }

        this._id = id;
    }

    defineProperties(Credit.prototype, {
        /**
         * The credit text
         * @memberof Credit.prototype
         * @type {String}
         * @readonly
         */
        text : {
            get : function() {
                return this._text;
            }
        },

        /**
         * The source location for the image.
         * @memberof Credit.prototype
         * @type {String}
         * @readonly
         */
        imageUrl : {
            get : function() {
                return this._imageUrl;
            }
        },

        /**
         * A URL location for the credit hyperlink
         * @memberof Credit.prototype
         * @type {String}
         * @readonly
         */
        link : {
            get : function() {
                return this._link;
            }
        },

        /**
         * @memberof Credit.prototype
         * @type {Number}
         * @readonly
         *
         * @private
         */
        id : {
            get : function() {
                return this._id;
            }
        },

        /**
         * Whether the credit should be displayed on screen or in a lightbox
         * @memberof Credit.prototype
         * @type {Boolean}
         * @readonly
         */
        showOnScreen : {
            get : function() {
                return this._showOnScreen;
            }
        }
    });

    /**
     * Returns true if the credit has an imageUrl
     *
     * @returns {Boolean}
     */
    Credit.prototype.hasImage = function() {
        return this._hasImage;
    };

    /**
     * Returns true if the credit has a link
     *
     * @returns {Boolean}
     */
    Credit.prototype.hasLink = function() {
        return this._hasLink;
    };

    /**
     * Returns true if the credits are equal
     *
     * @param {Credit} left The first credit
     * @param {Credit} right The second credit
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    Credit.equals = function(left, right) {
        return (left === right) ||
               ((defined(left)) &&
                (defined(right)) &&
                (left._id === right._id));
    };

    /**
     * Returns true if the credits are equal
     *
     * @param {Credit} credit The credit to compare to.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    Credit.prototype.equals = function(credit) {
        return Credit.equals(this, credit);
    };

    return Credit;
});
