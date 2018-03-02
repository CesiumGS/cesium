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
                    var element = credit.element;
                    if (container.hasChildNodes()) {
                        var del = document.createElement('span');
                        del.textContent = creditDisplay._delimiter;
                        del.className = 'cesium-credit-delimiter';
                        container.appendChild(del);
                    }
                    container.appendChild(element);
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
                    container.appendChild(credit.element);
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
                    var li = document.createElement('li');
                    var element = credit.element;
                    li.appendChild(element);
                    container.appendChild(li);
                } else {
                    displayedCredits.splice(index, 1);
                }
            }
        }
    }

    function removeCreditDomElement(credit) {
        var element = credit.element;

        var container = credit.showOnScreen ? element.parentNode : element.parentNode.parentNode;

        if (credit.hasImage() || !credit.showOnScreen) {
            if (credit.showOnScreen) {
                container.removeChild(element);
            } else {
                container.removeChild(element.parentNode);
            }
            return;
        }

        var delimiter = element.previousSibling;
        if (delimiter === null) {
            delimiter = element.nextSibling;
        }
        if (delimiter !== null) {
            container.removeChild(delimiter);
        }
        container.removeChild(element);
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
    }

    function removeUnusedLightboxCredits(creditDisplay) {
        var i;
        var credit;
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

        style += addStyle('.cesium-credit-lightbox > ul > li > span > a, .cesium-credit-lightbox > ul > li > span > a:visited', {
            color: textColor
        });

        style += addStyle('.cesium-credit-lightbox > ul > li > span > a:hover', {
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

    var cesiumCredit = new Credit({
        text: 'CesiumJS',
        imageUrl: 'data:image/png;base64,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',
        link: 'https://cesiumjs.org/',
        showOnScreen: true
    });

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

        function hideLightbox(event) {
            if (lightboxCredits.contains(event.target)) {
                return;
            }
            that.hideLightbox();
        }
        lightbox.addEventListener('click', hideLightbox, false);


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
        this._hideLightbox = hideLightbox;
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

        var imageCredits = this._currentFrameCredits.imageCredits;

        if (credit.text === 'Cesium ion') {
            // We don't want to clutter the screen with the Cesium logo and the Cesium ion
            // logo at the same time. Since the ion logo is required, we just replace the
            // Cesium logo or add the logo if the Cesium one was removed.
            if (defined(imageCredits[cesiumCredit.id])) {
                imageCredits[cesiumCredit.id] = credit;
            } else {
                imageCredits[credit.id] = credit;
            }
        } else if (!credit.showOnScreen) {
            this._currentFrameCredits.lightboxCredits[credit.id] = credit;
        } else if (credit.hasImage()) {
            imageCredits[credit.id] = credit;
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
     * Updates the credit display before a new frame is rendered.
     */
    CreditDisplay.prototype.update = function() {
        var displayedLightboxCredits = [];

        if (this._expanded && defined(this._creditsToUpdate)) {
            styleLightboxContainer(this);
            displayLightboxCredits(this, this._creditsToUpdate);
            displayedLightboxCredits = this._creditsToUpdate.slice();
        }

        removeUnusedLightboxCredits(this);

        this._displayedCredits.lightboxCredits = displayedLightboxCredits;
    };

    /**
     * Resets the credit display to a beginning of frame state, clearing out current credits.
     */
    CreditDisplay.prototype.beginFrame = function() {
        this._currentFrameCredits.imageCredits.length = 0;
        this._currentFrameCredits.textCredits.length = 0;
        this._currentFrameCredits.lightboxCredits.length = 0;

        var cesiumCredit = CreditDisplay.cesiumCredit;
        if (defined(cesiumCredit)) {
            this._currentFrameCredits.imageCredits[cesiumCredit.id] = cesiumCredit;
        }
    };

    /**
     * Sets the credit display to the end of frame state, displaying credits from the last frame in the credit container.
     */
    CreditDisplay.prototype.endFrame = function() {
        displayImageCredits(this, this._defaultImageCredits);
        displayTextCredits(this, this._defaultTextCredits);

        displayImageCredits(this, this._currentFrameCredits.imageCredits);
        displayTextCredits(this, this._currentFrameCredits.textCredits);

        var displayedTextCredits = this._defaultTextCredits.concat(this._currentFrameCredits.textCredits);
        var displayedImageCredits = this._defaultImageCredits.concat(this._currentFrameCredits.imageCredits);

        var showLightboxLink = this._currentFrameCredits.lightboxCredits.length > 0;
        this._expandLink.style.display = showLightboxLink ? 'inline' : 'none';

        removeUnusedCredits(this);

        this._displayedCredits.textCredits = displayedTextCredits;
        this._displayedCredits.imageCredits = displayedImageCredits;

        this._creditsToUpdate = this._currentFrameCredits.lightboxCredits.slice();
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
        this._lightbox.removeEventListener('click', this._hideLightbox, false);

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

    /**
     * Gets or sets the Cesium logo credit.
     * @type {Credit}
     */
    CreditDisplay.cesiumCredit = cesiumCredit;

    return CreditDisplay;
});
