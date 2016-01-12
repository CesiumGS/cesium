/*global define*/
define([
        '../Core/Credit',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError'
    ], function(
        Credit,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError) {
    "use strict";

    function createDelimiterElement(delimiter) {
        var del = document.createElement('span');
        del.textContent = delimiter;
        del.className = 'cesium-credit-delimiter';
        return del;
    }

    function createTextElement(credit) {
        var text = credit.text;
        var link = credit.link;
        var span = document.createElement('span');
        if (credit.hasLink()) {
            var a = document.createElement('a');
            a.textContent = text;
            a.href = link;
            a.target = '_blank';
            span.appendChild(a);
        } else {
            span.textContent = text;
        }
        span.className = 'cesium-credit-text';
        return span;
    }

    function displayTextCredit(creditDisplay, credit) {
        var delimiter = creditDisplay._delimiter;

        if (!creditDisplay.useWebVR) {
            if (!defined(credit.element)) {
                credit.element = createTextElement(credit);
            }
            if (creditDisplay._textContainer.hasChildNodes()) {
                creditDisplay._textContainer.appendChild(createDelimiterElement(delimiter));
            }
            creditDisplay._textContainer.appendChild(credit.element);
        } else {
            if (!defined(credit.leftElement)) {
                credit.leftElement = createTextElement(credit);
                credit.rightElement = createTextElement(credit);
            }
            if (creditDisplay._leftTextContainer.hasChildNodes()) {
                creditDisplay._leftTextContainer.appendChild(createDelimiterElement(delimiter));
                creditDisplay._rightTextContainer.appendChild(createDelimiterElement(delimiter));
            }
            creditDisplay._leftTextContainer.appendChild(credit.leftElement);
            creditDisplay._rightTextContainer.appendChild(credit.rightElement);
        }
    }

    function createImageElement(credit) {
        var text = credit.text;
        var link = credit.link;
        var span = document.createElement('span');
        var content = document.createElement('img');
        content.src = credit.imageUrl;
        content.style['vertical-align'] = 'bottom';
        if (defined(text)) {
            content.alt = text;
            content.title = text;
        }

        if (credit.hasLink()) {
            var a = document.createElement('a');
            a.appendChild(content);
            a.href = link;
            a.target = '_blank';
            span.appendChild(a);
        } else {
            span.appendChild(content);
        }
        span.className = 'cesium-credit-image';
        return span;
    }

    function displayImageCredit(creditDisplay, credit) {
        if (!creditDisplay.useWebVR) {
            if (!defined(credit.element)) {
                credit.element = createImageElement(credit);
            }
            creditDisplay._imageContainer.appendChild(credit.element);
        } else {
            if (!defined(credit.leftElement)) {
                credit.leftElement = createImageElement(credit);
                credit.rightElement = createImageElement(credit);
            }
            creditDisplay._leftImageContainer.appendChild(credit.leftElement);
            creditDisplay._rightImageContainer.appendChild(credit.rightElement);
        }
    }

    function contains(credits, credit) {
        var len = credits.length;
        for ( var i = 0; i < len; i++) {
            var existingCredit = credits[i];
            if (Credit.equals(existingCredit, credit)) {
                return true;
            }
        }
        return false;
    }

    function removeCreditDomElement(credit, element) {
        var container = element.parentNode;
        if (!container) {
            return;
        }

        if (!credit.hasImage()) {
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

    function removeCredit(credit) {
        var element = credit.element;
        if (defined(element)) {
            removeCreditDomElement(credit, element);
        }

        var leftElement = credit.leftElement;
        if (defined(leftElement)) {
            removeCreditDomElement(credit, leftElement);
            removeCreditDomElement(credit, credit.rightElement);
        }
    }

    function displayTextCredits(creditDisplay, textCredits) {
        var i;
        var index;
        var credit;
        var displayedTextCredits = creditDisplay._displayedCredits.textCredits;
        for (i = 0; i < textCredits.length; i++) {
            credit = textCredits[i];
            if (defined(credit)) {
                index = displayedTextCredits.indexOf(credit);
                if (index === -1) {
                    displayTextCredit(creditDisplay, credit);
                } else {
                    displayedTextCredits.splice(index, 1);
                }
            }
        }
        for (i = 0; i < displayedTextCredits.length; i++) {
            credit = displayedTextCredits[i];
            if (defined(credit)) {
                removeCredit(credit);
            }
        }

    }

    function displayImageCredits(creditDisplay, imageCredits) {
        var i;
        var index;
        var credit;
        var displayedImageCredits = creditDisplay._displayedCredits.imageCredits;
        for (i = 0; i < imageCredits.length; i++) {
            credit = imageCredits[i];
            if (defined(credit)) {
                index = displayedImageCredits.indexOf(credit);
                if (index === -1) {
                    displayImageCredit(creditDisplay, credit);
                } else {
                    displayedImageCredits.splice(index, 1);
                }
            }
        }
        for (i = 0; i < displayedImageCredits.length; i++) {
            credit = displayedImageCredits[i];
            if (defined(credit)) {
                removeCredit(credit);
            }
        }
    }

    function createImageContainer() {
        var imageContainer = document.createElement('span');
        imageContainer.className = 'cesium-credit-imageContainer';
        return imageContainer;
    }

    function createTextContainer() {
        var textContainer = document.createElement('span');
        textContainer.className = 'cesium-credit-textContainer';
        return textContainer;
    }

    /**
     * The credit display is responsible for displaying credits on screen.
     *
     * @param {HTMLElement} container The HTML element where credits will be displayed
     * @param {HTMLElement} leftContainer The HTML element for the left eye when using VR.
     * @param {HTMLElement} rightContainer The HTML element for the right eye when using VR.
     * @param {String} [delimiter= ' • '] The string to separate text credits
     *
     * @alias CreditDisplay
     * @constructor
     *
     * @example
     * var creditDisplay = new Cesium.CreditDisplay(creditContainer);
     */
    function CreditDisplay(container, leftContainer, rightContainer, delimiter) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(container)) {
            throw new DeveloperError('credit container is required');
        }
        //>>includeEnd('debug');

        var imageContainer = createImageContainer();
        var textContainer = createTextContainer();
        container.appendChild(imageContainer);
        container.appendChild(textContainer);

        this._container = container;
        this._textContainer = textContainer;
        this._imageContainer = imageContainer;

        var leftImageContainer = createImageContainer();
        var leftTextContainer = createTextContainer();
        leftContainer.appendChild(leftImageContainer);
        leftContainer.appendChild(leftTextContainer);

        this._leftContainer = leftContainer;
        this._leftImageContainer = leftImageContainer;
        this._leftTextContainer = leftTextContainer;

        var rightImageContainer = createImageContainer();
        var rightTextContainer = createTextContainer();
        rightContainer.appendChild(rightImageContainer);
        rightContainer.appendChild(rightTextContainer);

        this._rightContainer = rightContainer;
        this._rightImageContainer = rightImageContainer;
        this._rightTextContainer = rightTextContainer;

        this._delimiter = defaultValue(delimiter, ' • ');
        this._defaultImageCredits = [];
        this._defaultTextCredits = [];

        this._displayedCredits = {
            imageCredits : [],
            textCredits : []
        };
        this._currentFrameCredits = {
            imageCredits : [],
            textCredits : []
        };

        this._useWebVR = false;
        this._leftContainer.style.display = 'none';
        this._rightContainer.style.display = 'none';
    }

    defineProperties(CreditDisplay.prototype, {
        /**
         * Defines whether VR is being used and the credits should be displayed in the left and right
         * eye containers pr the single container for the normal view.
         * @memberof CreditDisplay.prototype
         * @type {Boolean}
         * @default false
         */
        useWebVR : {
            get : function() {
                return this._useWebVR;
            },
            set : function(value) {
                this._useWebVR = value;
                if (this._useWebVR) {
                    this._container.style.display = 'none';
                    this._leftContainer.style.display = 'block';
                    this._rightContainer.style.display = 'block';
                } else {
                    this._container.style.display = 'block';
                    this._leftContainer.style.display = 'none';
                    this._rightContainer.style.display = 'none';
                }
            }
        }
    });

    CreditDisplay.createDefaultContainer = function() {
        var creditContainer = document.createElement('div');
        creditContainer.style.position = 'absolute';
        creditContainer.style.bottom = '0';
        creditContainer.style['text-shadow'] = '0px 0px 2px #000000';
        creditContainer.style.color = '#ffffff';
        creditContainer.style['font-size'] = '10px';
        creditContainer.style['padding-right'] = '5px';
        return creditContainer;
    };

    /**
     * Adds a credit to the list of current credits to be displayed in the credit container
     *
     * @param {Credit} credit The credit to display
     */
    CreditDisplay.prototype.addCredit = function(credit) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(credit)) {
            throw new DeveloperError('credit must be defined');
        }
        //>>includeEnd('debug');

        if (credit.hasImage()) {
            var imageCredits = this._currentFrameCredits.imageCredits;
            if (!contains(this._defaultImageCredits, credit)) {
                imageCredits[credit.id] = credit;
            }
        } else {
            var textCredits = this._currentFrameCredits.textCredits;
            if (!contains(this._defaultTextCredits, credit)) {
                textCredits[credit.id] = credit;
            }
        }
    };

    /**
     * Adds credits that will persist until they are removed
     *
     * @param {Credit} credit The credit to added to defaults
     */
    CreditDisplay.prototype.addDefaultCredit = function(credit) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(credit)) {
            throw new DeveloperError('credit must be defined');
        }
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
        if (!defined(credit)) {
            throw new DeveloperError('credit must be defined');
        }
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

    /**
     * Resets the credit display to a beginning of frame state, clearing out current credits.
     *
     * @param {Credit} credit The credit to display
     */
    CreditDisplay.prototype.beginFrame = function() {
        this._currentFrameCredits.imageCredits.length = 0;
        this._currentFrameCredits.textCredits.length = 0;
    };

    /**
     * Sets the credit display to the end of frame state, displaying current credits in the credit container
     *
     * @param {Credit} credit The credit to display
     */
    CreditDisplay.prototype.endFrame = function() {
        var textCredits = this._defaultTextCredits.concat(this._currentFrameCredits.textCredits);
        var imageCredits = this._defaultImageCredits.concat(this._currentFrameCredits.imageCredits);

        displayTextCredits(this, textCredits);
        displayImageCredits(this, imageCredits);

        this._displayedCredits.textCredits = textCredits;
        this._displayedCredits.imageCredits = imageCredits;
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
        this._container.removeChild(this._textContainer);
        this._container.removeChild(this._imageContainer);
        this._leftContainer.removeChild(this._leftTextContainer);
        this._leftContainer.removeChild(this._leftImageContainer);
        this._rightContainer.removeChild(this._rightTextContainer);
        this._rightContainer.removeChild(this._rightImageContainer);
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
