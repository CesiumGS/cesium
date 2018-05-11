define([
        '../Core/buildModuleUrl',
        '../Core/Check',
        '../Core/Credit',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject'
    ], function(
        buildModuleUrl,
        Check,
        Credit,
        defaultValue,
        defined,
        defineProperties,
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

    function swapCesiumCredit(creditDisplay) {
        // We don't want to clutter the screen with the Cesium logo and the Cesium ion
        // logo at the same time. Since the ion logo is required, we just replace the
        // Cesium logo or add the logo if the Cesium one was removed.
        var previousCredit = creditDisplay._previousCesiumCredit;
        var currentCredit = creditDisplay._currentCesiumCredit;
        if (Credit.equals(currentCredit, previousCredit)) {
            return;
        }

        if (defined(previousCredit)) {
            creditDisplay._cesiumCreditContainer.removeChild(previousCredit.element);
        }
        if (defined(currentCredit)) {
            creditDisplay._cesiumCreditContainer.appendChild(currentCredit.element);
        }

        creditDisplay._previousCesiumCredit = currentCredit;
    }

    function displayCredits(creditDisplay, credits) {
        var i;
        var index;
        var credit;
        var displayedCredits = creditDisplay._displayedCredits.screenCredits;
        var container = creditDisplay._screenContainer;
        for (i = 0; i < credits.length; i++) {
            credit = credits[i];
            if (defined(credit)) {
                index = displayedCredits.indexOf(credit);
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
                    displayedCredits.splice(index, 1);
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

        if (!credit.showOnScreen) {
            container.removeChild(element.parentNode);
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
        var displayedTextCredits = creditDisplay._displayedCredits.screenCredits;
        for (i = 0; i < displayedTextCredits.length; i++) {
            credit = displayedTextCredits[i];
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

        style += addStyle('.cesium-credit-lightbox > ul > li a, .cesium-credit-lightbox > ul > li a:visited', {
            color: textColor
        });

        style += addStyle('.cesium-credit-lightbox > ul > li a:hover', {
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

        style += addStyle('.cesium-credit-lightbox > ul > li *', {
            padding : '0',
            margin : '0'
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

        style += addStyle('.cesium-credit-textContainer *, .cesium-credit-logoContainer *', {
            display: 'inline'
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

        var cesiumCreditContainer = document.createElement('div');
        cesiumCreditContainer.className = 'cesium-credit-logoContainer';
        cesiumCreditContainer.style.display = 'inline';
        container.appendChild(cesiumCreditContainer);

        var screenContainer = document.createElement('div');
        screenContainer.className = 'cesium-credit-textContainer';
        screenContainer.style.display = 'inline';
        container.appendChild(screenContainer);

        var expandLink = document.createElement('a');
        expandLink.className = 'cesium-credit-expand-link';
        expandLink.onclick = this.showLightbox.bind(this);
        expandLink.textContent = 'Data attribution';
        container.appendChild(expandLink);

        appendCss();

        this._delimiter = defaultValue(delimiter, ' • ');
        this._screenContainer = screenContainer;
        this._cesiumCreditContainer = cesiumCreditContainer;
        this._lastViewportHeight = undefined;
        this._lastViewportWidth = undefined;
        this._lightboxCredits = lightboxCredits;
        this._creditList = creditList;
        this._lightbox = lightbox;
        this._hideLightbox = hideLightbox;
        this._expandLink = expandLink;
        this._expanded = false;
        this._defaultCredits = [];
        this._previousCesiumCredit = undefined;
        this._currentCesiumCredit = CreditDisplay.cesiumCredit;

        this._displayedCredits = {
            screenCredits : [],
            lightboxCredits : []
        };
        this._currentFrameCredits = {
            screenCredits : [],
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

        var screenCredits = this._currentFrameCredits.screenCredits;

        if (credit._isIon) {
            // If this is the an ion logo credit from the ion server
            // Juse use the default credit (which is identical) to avoid blinking
            this._currentCesiumCredit = getDefaultCredit();
            return;
        }

        if (!credit.showOnScreen) {
            this._currentFrameCredits.lightboxCredits[credit.id] = credit;
        } else {
            screenCredits[credit.id] = credit;
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

        var credits = this._defaultCredits;
        if (!contains(credits, credit)) {
            credits.push(credit);
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

        var index = this._defaultCredits.indexOf(credit);
        if (index !== -1) {
            this._defaultCredits.splice(index, 1);
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
        this._currentFrameCredits.screenCredits.length = 0;
        this._currentFrameCredits.lightboxCredits.length = 0;
        this._currentCesiumCredit = CreditDisplay.cesiumCredit;
    };

    /**
     * Sets the credit display to the end of frame state, displaying credits from the last frame in the credit container.
     */
    CreditDisplay.prototype.endFrame = function() {
        displayCredits(this, this._defaultCredits);
        displayCredits(this, this._currentFrameCredits.screenCredits);

        var displayedScreenCredits = this._defaultCredits.concat(this._currentFrameCredits.screenCredits);

        var showLightboxLink = this._currentFrameCredits.lightboxCredits.length > 0;
        this._expandLink.style.display = showLightboxLink ? 'inline' : 'none';

        removeUnusedCredits(this);
        swapCesiumCredit(this);

        this._displayedCredits.screenCredits = displayedScreenCredits;

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
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    CreditDisplay.prototype.destroy = function() {
        this._lightbox.removeEventListener('click', this._hideLightbox, false);

        this.container.removeChild(this._cesiumCreditContainer);
        this.container.removeChild(this._screenContainer);
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

    CreditDisplay._cesiumCredit = undefined;
    CreditDisplay._cesiumCreditInitialized = false;

    var defaultCredit;
    function getDefaultCredit() {
        if (!defined(defaultCredit)) {
            var logo = buildModuleUrl('Assets/Images/ion-credit.png');
            defaultCredit = new Credit('<a href="https://cesium.com/" target="_blank"><img src="' + logo + '" title="Cesium ion"/></a>', true);
        }

        if (!CreditDisplay._cesiumCreditInitialized) {
            CreditDisplay._cesiumCredit = defaultCredit;
            CreditDisplay._cesiumCreditInitialized = true;
        }
        return defaultCredit;
    }

    defineProperties(CreditDisplay, {
        /**
         * Gets or sets the Cesium logo credit.
         * @memberof CreditDisplay
         * @type {Credit}
         */
        cesiumCredit: {
            get: function() {
                getDefaultCredit();
                return CreditDisplay._cesiumCredit;
            },
            set: function(value) {
                CreditDisplay._cesiumCredit = value;
                CreditDisplay._cesiumCreditInitialized = true;
            }
        }
    });

    return CreditDisplay;
});
