define([
        '../ThirdParty/xss',
        './defaultValue',
        './defined',
        './defineProperties',
        './deprecationWarning',
        './DeveloperError'
    ], function(
        xss,
        defaultValue,
        defined,
        defineProperties,
        deprecationWarning,
        DeveloperError) {
    'use strict';

    var nextCreditId = 0;
    var creditToId = {};

    /**
     * A credit contains data pertaining to how to display attributions/credits for certain content on the screen.
     * @param {String} html An string representing an html code snippet (can be text only)
     * @param {Boolean} [showOnScreen=false] If true, the credit will be visible in the main credit container.  Otherwise, it will appear in a popover
     *
     * @alias Credit
     * @constructor
     *
     * @exception {DeveloperError} options.text, options.imageUrl, or options.link is required.
     *
     * @example
     * //Create a credit with a tooltip, image and link
     * var credit = new Cesium.Credit('<a href="https://cesiumjs.org/" target="_blank"><img src="/images/cesium_logo.png" title="Cesium"/></a>');
     */
    function Credit(html, showOnScreen) {
        var id;
        var key;
        if (typeof html !== 'string') {
            var options = defaultValue(html, defaultValue.EMPTY_OBJECT);
            deprecationWarning('Credit options', 'The options parameter has been deprecated and will be removed in Cesium 1.46.  Instead, pass in an HTML string (or a string of text)');
            showOnScreen = defaultValue(options.showOnScreen, showOnScreen);
            var text = options.text;
            var imageUrl = options.imageUrl;
            var link = options.link;

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

            var element = document.createElement('span');
            var a;
            if (hasImage) {
                var content = document.createElement('img');
                content.src = imageUrl;
                if (defined(text)) {
                    content.alt = text;
                    content.title = text;
                }
                if (hasLink) {
                    a = document.createElement('a');
                    a.appendChild(content);
                    a.href = link;
                    a.target = '_blank';
                    element.appendChild(a);
                } else {
                    element.appendChild(content);
                }
                element.className = 'cesium-credit-image';
            } else {
                if (hasLink) {
                    a = document.createElement('a');
                    a.textContent = text;
                    a.href = link;
                    a.target = '_blank';
                    element.appendChild(a);
                } else {
                    element.textContent = text;
                }
                element.className = 'cesium-credit-text';
            }

            html = '<span>' + element.innerHTML + '</span>';
            key = JSON.stringify([text, imageUrl, link]);
        } else {
            key = html;
        }

        if (defined(creditToId[key])) {
            id = creditToId[key];
        } else {
            id = nextCreditId++;
            creditToId[key] = id;
        }

        showOnScreen = defaultValue(showOnScreen, false);

        // Credits are immutable so generate an id to use to optimize equal()
        this._id = id;
        this._html = html;
        this._showOnScreen = showOnScreen;
        this._element = undefined;
    }

    defineProperties(Credit.prototype, {
        /**
         * The credit content
         * @memberof Credit.prototype
         * @type {String}
         * @readonly
         */
        html : {
            get : function() {
                return this._html;
            }
        },
        /**
         * The credit text
         * @memberof Credit.prototype
         * @type {String}
         * @readonly
         */
        text : {
            get : function() {
                deprecationWarning('Credit.text', 'Credit.text is deprecated and will be removed in Cesium 1.46.  Instead, use Credit.html to get the credit content.');
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
                deprecationWarning('Credit.imageUrl', 'Credit.imageUrl is deprecated and will be removed in Cesium 1.46.  Instead, use Credit.html to get the credit content.');
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
                deprecationWarning('Credit.link', 'Credit.link is deprecated and will be removed in Cesium 1.46.  Instead, use Credit.html to get the credit content.');
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
        },

        /**
         * Gets the credit element
         * @memberof Credit.prototype
         * @type {HTMLElement}
         * @readonly
         */
        element: {
            get: function() {
                if (!defined(this._element)) {
                    var html = this.html;
                    html = xss(html);

                    var div = document.createElement('div');
                    div.style.display = 'inline';
                    div.innerHTML = html;

                    var links = div.querySelectorAll('a');
                    for (var i = 0; i < links.length; i++) {
                        links[i].setAttribute('target', '_blank');
                    }

                    this._element = div;
                }
                return this._element;
            }
        }
    });

    /**
     * Returns true if the credit has an imageUrl
     *
     * @returns {Boolean}
     */
    Credit.prototype.hasImage = function() {
        deprecationWarning('Credit.hasImage', 'Credit.hasImage is deprecated and will be removed in Cesium 1.46.');
        return this._hasImage;
    };

    /**
     * Returns true if the credit has a link
     *
     * @returns {Boolean}
     */
    Credit.prototype.hasLink = function() {
        deprecationWarning('Credit.hasLink', 'Credit.hasLink is deprecated and will be removed in Cesium 1.46.');
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

    /**
     * @private
     * @param attribution
     * @return {Credit}
     */
    Credit.getIonCredit = function(attribution) {
        var credit;
        var showOnScreen = defined(attribution.collapsible) && !attribution.collapsible;
        if (defined(attribution.html)) {
            credit = new Credit(attribution.html, showOnScreen);
        } else {
            credit = new Credit({
                text: attribution.text,
                link: attribution.url,
                imageUrl: attribution.image
            }, showOnScreen);
        }

        credit._isIon = credit.html.indexOf('ion-credit.png') !== -1;
        return credit;
    };

    return Credit;
});
