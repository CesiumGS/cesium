define([
    '../Core/Check',
    '../Core/Credit',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/destroyObject'
], function(
    Check,
    Credit,
    defaultValue,
    defined,
    destroyObject) {
    'use strict';

    var mobileWidth = 576;
    var lightboxHeight = 100;
    var textColor = '#ffffff';
    var highlightColor = '#48b';

    function makeTextCredit(credit, element) {
        if (!defined(credit.element)) {
            var text = credit.text;
            var link = credit.link;
            if (credit.hasLink()) {
                var a = document.createElement('a');
                a.textContent = text;
                a.href = link;
                a.target = '_blank';
                element.appendChild(a);
            } else {
                element.textContent = text;
            }
            element.className = 'cesium-credit-text';
            credit.element = element;
            return element;
        }
        return credit.element;
    }

    function makeImageCredit(credit, element, alignMiddle) {
        if (!defined(credit.element)) {
            var text = credit.text;
            var link = credit.link;
            var content = document.createElement('img');
            content.src = credit.imageUrl;
            content.style['vertical-align'] = alignMiddle ? 'middle' : 'bottom';
            if (defined(text)) {
                content.alt = text;
                content.title = text;
            }

            if (credit.hasLink()) {
                var a = document.createElement('a');
                a.appendChild(content);
                a.href = link;
                a.target = '_blank';
                element.appendChild(a);
            } else {
                element.appendChild(content);
            }
            element.className = 'cesium-credit-image';
            credit.element = element;
        }
        return credit.element;
    }

    function contains(credits, credit) {
        var len = credits.length;
        for (var i = 0; i < len; i++) {
            var existingCredit = credits[i];
            if (Credit.equals(existingCredit, credit)) {
                return true;
            }
        }
        return false;
    }

    function displayTextCredits(creditDisplay, textCredits) {
        var i;
        var index;
        var credit;
        var displayedTextCredits = creditDisplay._displayedCredits.textCredits;
        var container = creditDisplay._textContainer;
        for (i = 0; i < textCredits.length; i++) {
            credit = textCredits[i];
            if (defined(credit)) {
                index = displayedTextCredits.indexOf(credit);
                if (index === -1) {
                    var element = makeTextCredit(credit, document.createElement('span'));
                    if (defined(element)) {
                        if (container.hasChildNodes()) {
                            var del = document.createElement('span');
                            del.textContent = creditDisplay._delimiter;
                            del.className = 'cesium-credit-delimiter';
                            container.appendChild(del);
                        }
                        container.appendChild(element);
                    }
                } else {
                    displayedTextCredits.splice(index, 1);
                }
            }
        }
    }

    function displayImageCredits(creditDisplay, imageCredits) {
        var i;
        var index;
        var credit;
        var displayedImageCredits = creditDisplay._displayedCredits.imageCredits;
        var container = creditDisplay._imageContainer;
        for (i = 0; i < imageCredits.length; i++) {
            credit = imageCredits[i];
            if (defined(credit)) {
                index = displayedImageCredits.indexOf(credit);
                if (index === -1) {
                    var element = makeImageCredit(credit, document.createElement('span'), false);
                    container.appendChild(element);
                } else {
                    displayedImageCredits.splice(index, 1);
                }
            }
        }
    }

    function displayLightboxCredits(creditDisplay, lighboxCredits) {
        var i;
        var index;
        var credit;
        var displayedCredits = creditDisplay._displayedCredits.lightboxCredits;
        var container = creditDisplay._creditList;
        for (i = 0; i < lighboxCredits.length; i++) {
            credit = lighboxCredits[i];
            if (defined(credit)) {
                index = displayedCredits.indexOf(credit);
                if (index === -1) {
                    var element;
                    if (credit.hasImage()) {
                        element = makeImageCredit(credit, document.createElement('li'), true);
                    } else {
                        element = makeTextCredit(credit, document.createElement('li'));
                    }
                    container.appendChild(element);
                } else {
                    displayedCredits.splice(index, 1);
                }
            }
        }
    }

    function removeCreditDomElement(credit) {
        var element = credit.element;
        if (defined(element)) {
            var container = element.parentNode;
            if (!credit.hasImage() && credit.showOnScreen) {
                var delimiter = element.previousSibling;
                if (delimiter === null) {
                    delimiter = element.nextSibling;
                }
                if (delimiter !== null) {
                    container.removeChild(delimiter);
                }
            }
            container.removeChild(element);
        }
    }

    function removeUnusedCredits(creditDisplay) {
        var i;
        var credit;
        var displayedTextCredits = creditDisplay._displayedCredits.textCredits;
        for (i = 0; i < displayedTextCredits.length; i++) {
            credit = displayedTextCredits[i];
            if (defined(credit)) {
                removeCreditDomElement(credit);
            }
        }
        var displayedImageCredits = creditDisplay._displayedCredits.imageCredits;
        for (i = 0; i < displayedImageCredits.length; i++) {
            credit = displayedImageCredits[i];
            if (defined(credit)) {
                removeCreditDomElement(credit);
            }
        }
        var displayedLightboxCredits = creditDisplay._displayedCredits.lightboxCredits;
        for (i = 0; i < displayedLightboxCredits.length; i++) {
            credit = displayedLightboxCredits[i];
            if (defined(credit)) {
                removeCreditDomElement(credit);
            }
        }
    }

    function styleLightboxContainer(that) {
        var lightboxCredits = that._lightboxCredits;
        var width = that.viewport.clientWidth;
        var height = that.viewport.clientHeight;
        if (width !== that._lastViewportWidth) {
            if (width < mobileWidth) {
                lightboxCredits.className = 'cesium-credit-lightbox cesium-credit-lightbox-mobile';
                lightboxCredits.style.marginTop = '0';
            } else {
                lightboxCredits.className = 'cesium-credit-lightbox cesium-credit-lightbox-expanded';
                lightboxCredits.style.marginTop = Math.floor((height - lightboxCredits.clientHeight) * 0.5) + 'px';
            }
            that._lastViewportWidth = width;
        }

        if (width >= mobileWidth && height !== that._lastViewportHeight) {
            lightboxCredits.style.marginTop = Math.floor((height - lightboxCredits.clientHeight) * 0.5) + 'px';
            that._lastViewportHeight = height;
        }
    }

    function addStyle(selector, styles) {
        var style = selector + ' {';
        for (var attribute in styles) {
            if (styles.hasOwnProperty(attribute)) {
                style += attribute + ': ' + styles[attribute] + '; ';
            }
        }
        style += ' }\n';
        return style;
    }

    function appendCss() {
        var head = document.head;
        var css = document.createElement('style');
        var style = '';
        style += addStyle('.cesium-credit-lightbox-overlay', {
            display : 'none',
            'z-index' : '1', //must be at least 1 to draw over top other Cesium widgets
            position : 'absolute',
            top : '0',
            left : '0',
            width : '100%',
            height : '100%',
            'background-color' : 'rgba(80, 80, 80, 0.8)'
        });

        style += addStyle('.cesium-credit-lightbox', {
            'background-color' : '#303336',
            color : textColor,
            position : 'relative',
            'min-height' : lightboxHeight + 'px',
            margin : 'auto'
        });

        style += addStyle('.cesium-credit-lightbox > ul > li > a, .cesium-credit-lightbox > ul > li > a:visited', {
            color: textColor
        });

        style += addStyle('.cesium-credit-lightbox > ul > li > a:hover', {
            color: highlightColor
        });

        style += addStyle('.cesium-credit-lightbox.cesium-credit-lightbox-expanded', {
            border : '1px solid #444',
            'border-radius' : '5px',
            'max-width' : '370px'
        });

        style += addStyle('.cesium-credit-lightbox.cesium-credit-lightbox-mobile', {
            height : '100%',
            width : '100%'
        });

        style += addStyle('.cesium-credit-lightbox-title', {
            padding : '20px 20px 0 20px'
        });

        style += addStyle('.cesium-credit-lightbox-close', {
            'font-size' : '18pt',
            cursor : 'pointer',
            position : 'absolute',
            top : '0',
            right : '6px',
            color : textColor
        });

        style += addStyle('.cesium-credit-lightbox-close:hover', {
            color : highlightColor
        });

        style += addStyle('.cesium-credit-lightbox > ul', {
            margin : '0',
            padding : '12px 20px 12px 40px',
            'font-size' : '13px'
        });

        style += addStyle('.cesium-credit-lightbox > ul > li', {
            'padding-bottom' : '6px'
        });

        style += addStyle('.cesium-credit-expand-link', {
            'padding-left' : '5px',
            cursor : 'pointer',
            'text-decoration' : 'underline',
            color: textColor
        });
        style += addStyle('.cesium-credit-expand-link:hover', {
            'color' : highlightColor
        });

        style += addStyle('.cesium-credit-text', {
            color: textColor
        });

        css.innerHTML = style;

        head.insertBefore(css, head.firstChild);
    }

    /**
     * The credit display is responsible for displaying credits on screen.
     *
     * @param {HTMLElement} container The HTML element where credits will be displayed
     * @param {String} [delimiter= ' • '] The string to separate text credits
     * @param {HTMLElement} [viewport=document.body] The HTML element that will contain the credits popup
     *
     * @alias CreditDisplay
     * @constructor
     *
     * @example
     * var creditDisplay = new Cesium.CreditDisplay(creditContainer);
     */
    function CreditDisplay(container, delimiter, viewport) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('container', container);
        //>>includeEnd('debug');
        var that = this;

        viewport = defaultValue(viewport, document.body);

        var lightbox = document.createElement('div');
        lightbox.className = 'cesium-credit-lightbox-overlay';
        viewport.appendChild(lightbox);

        var lightboxCredits = document.createElement('div');
        lightboxCredits.className = 'cesium-credit-lightbox';
        lightbox.appendChild(lightboxCredits);
        lightbox.onclick = function(event) {
            if (event.target === lightboxCredits) {
                return;
            }
            that.hideLightbox();
        };

        var title = document.createElement('div');
        title.className = 'cesium-credit-lightbox-title';
        title.textContent = 'Data provided by:';
        lightboxCredits.appendChild(title);

        var closeButton = document.createElement('a');
        closeButton.onclick = this.hideLightbox.bind(this);
        closeButton.innerHTML = '&times;';
        closeButton.className = 'cesium-credit-lightbox-close';
        lightboxCredits.appendChild(closeButton);

        var creditList = document.createElement('ul');
        lightboxCredits.appendChild(creditList);

        var imageContainer = document.createElement('span');
        imageContainer.className = 'cesium-credit-imageContainer';
        container.appendChild(imageContainer);

        var textContainer = document.createElement('span');
        textContainer.className = 'cesium-credit-textContainer';
        container.appendChild(textContainer);

        var expandLink = document.createElement('a');
        expandLink.className = 'cesium-credit-expand-link';
        expandLink.onclick = this.showLightbox.bind(this);
        expandLink.textContent = 'Data attribution';
        container.appendChild(expandLink);

        appendCss();

        this._delimiter = defaultValue(delimiter, ' • ');
        this._textContainer = textContainer;
        this._imageContainer = imageContainer;
        this._lastViewportHeight = undefined;
        this._lastViewportWidth = undefined;
        this._lightboxCredits = lightboxCredits;
        this._creditList = creditList;
        this._lightbox = lightbox;
        this._expandLink = expandLink;
        this._expanded = false;
        this._defaultImageCredits = [];
        this._defaultTextCredits = [];

        this._displayedCredits = {
            imageCredits : [],
            textCredits : [],
            lightboxCredits : []
        };
        this._currentFrameCredits = {
            imageCredits : [],
            textCredits : [],
            lightboxCredits : []
        };

        this.viewport = viewport;

        /**
         * The HTML element where credits will be displayed.
         * @type {HTMLElement}
         */
        this.container = container;
    }

    /**
     * Adds a credit to the list of current credits to be displayed in the credit container
     *
     * @param {Credit} credit The credit to display
     */
    CreditDisplay.prototype.addCredit = function(credit) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('credit', credit);
        //>>includeEnd('debug');

        if (!credit.showOnScreen) {
            this._currentFrameCredits.lightboxCredits[credit.id] = credit;
        } else if (credit.hasImage()) {
            this._currentFrameCredits.imageCredits[credit.id] = credit;
        } else {
            this._currentFrameCredits.textCredits[credit.id] = credit;
        }
    };

    /**
     * Adds credits that will persist until they are removed
     *
     * @param {Credit} credit The credit to added to defaults
     */
    CreditDisplay.prototype.addDefaultCredit = function(credit) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('credit', credit);
        //>>includeEnd('debug');

        if (credit.hasImage()) {
            var imageCredits = this._defaultImageCredits;
            if (!contains(imageCredits, credit)) {
                imageCredits.push(credit);
            }
        } else {
            var textCredits = this._defaultTextCredits;
            if (!contains(textCredits, credit)) {
                textCredits.push(credit);
            }
        }
    };

    /**
     * Removes a default credit
     *
     * @param {Credit} credit The credit to be removed from defaults
     */
    CreditDisplay.prototype.removeDefaultCredit = function(credit) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('credit', credit);
        //>>includeEnd('debug');

        var index;
        if (credit.hasImage()) {
            index = this._defaultImageCredits.indexOf(credit);
            if (index !== -1) {
                this._defaultImageCredits.splice(index, 1);
            }
        } else {
            index = this._defaultTextCredits.indexOf(credit);
            if (index !== -1) {
                this._defaultTextCredits.splice(index, 1);
            }
        }
    };

    CreditDisplay.prototype.showLightbox = function() {
        this._lightbox.style.display = 'block';
        this._expanded = true;
    };

    CreditDisplay.prototype.hideLightbox = function() {
        this._lightbox.style.display = 'none';
        this._expanded = false;
    };

    /**
     * Resets the credit display to a beginning of frame state, clearing out current credits.
     */
    CreditDisplay.prototype.beginFrame = function() {
        this._currentFrameCredits.imageCredits.length = 0;
        this._currentFrameCredits.textCredits.length = 0;
        this._currentFrameCredits.lightboxCredits.length = 0;
    };

    /**
     * Sets the credit display to the end of frame state, displaying current credits in the credit container
     */
    CreditDisplay.prototype.endFrame = function() {
        displayImageCredits(this, this._defaultImageCredits);
        displayTextCredits(this, this._defaultTextCredits);

        displayImageCredits(this, this._currentFrameCredits.imageCredits);
        displayTextCredits(this, this._currentFrameCredits.textCredits);

        var displayedTextCredits = this._defaultTextCredits.concat(this._currentFrameCredits.textCredits);
        var displayedImageCredits = this._defaultImageCredits.concat(this._currentFrameCredits.imageCredits);
        var displayedLightboxCredits = [];

        var showLightboxLink = this._currentFrameCredits.lightboxCredits.length > 0;
        this._expandLink.style.display = showLightboxLink ? 'inline' : 'none';
        if (this._expanded) {
            styleLightboxContainer(this);
            displayLightboxCredits(this, this._currentFrameCredits.lightboxCredits);

            displayedLightboxCredits = this._currentFrameCredits.lightboxCredits.slice();
        }

        removeUnusedCredits(this);

        this._displayedCredits.textCredits = displayedTextCredits;
        this._displayedCredits.imageCredits = displayedImageCredits;
        this._displayedCredits.lightboxCredits = displayedLightboxCredits;
    };

    /**
     * Destroys the resources held by this object.  Destroying an object allows for deterministic
     * release of resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    CreditDisplay.prototype.destroy = function() {
        this.container.removeChild(this._textContainer);
        this.container.removeChild(this._imageContainer);
        this.container.removeChild(this._expandLink);
        this.viewport.removeChild(this._lightbox);

        return destroyObject(this);
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     */
    CreditDisplay.prototype.isDestroyed = function() {
        return false;
    };

    return CreditDisplay;
});
