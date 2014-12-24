/*global define*/
define([
        '../Core/Credit',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError'
    ], function(
        Credit,
        defaultValue,
        defined,
        destroyObject,
        DeveloperError) {
    "use strict";

    function displayTextCredit(credit, container, delimiter) {
        if (!defined(credit.element)) {
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
            credit.element = span;
        }
        if (container.hasChildNodes()) {
            var del = document.createElement('span');
            del.textContent = delimiter;
            del.className = 'cesium-credit-delimiter';
            container.appendChild(del);
        }
        container.appendChild(credit.element);
    }

    function displayImageCredit(credit, container) {
        if (!defined(credit.element)) {
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
            credit.element = span;
        }
        container.appendChild(credit.element);
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

    function removeCreditDomElement(credit) {
        var element = credit.element;
        if (defined(element)) {
            var container = element.parentNode;
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
                    displayTextCredit(credit, creditDisplay._textContainer, creditDisplay._delimiter);
                } else {
                    displayedTextCredits.splice(index, 1);
                }
            }
        }
        for (i = 0; i < displayedTextCredits.length; i++) {
            credit = displayedTextCredits[i];
            if (defined(credit)) {
                removeCreditDomElement(credit);
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
                    displayImageCredit(credit, creditDisplay._imageContainer);
                } else {
                    displayedImageCredits.splice(index, 1);
                }
            }
        }
        for (i = 0; i < displayedImageCredits.length; i++) {
            credit = displayedImageCredits[i];
            if (defined(credit)) {
                removeCreditDomElement(credit);
            }
        }
    }

    /**
     * The credit display is responsible for displaying credits on screen.
     *
     * @param {HTMLElement} container The HTML element where credits will be displayed
     * @param {String} [delimiter= ' • '] The string to separate text credits
     *
     * @alias CreditDisplay
     * @constructor
     *
     * @example
     * var creditDisplay = new Cesium.CreditDisplay(creditContainer);
     */
    var CreditDisplay = function(container, delimiter) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(container)) {
            throw new DeveloperError('credit container is required');
        }
        //>>includeEnd('debug');

        var imageContainer = document.createElement('span');
        imageContainer.className = 'cesium-credit-imageContainer';
        var textContainer = document.createElement('span');
        textContainer.className = 'cesium-credit-textContainer';
        container.appendChild(imageContainer);
        container.appendChild(textContainer);

        this._delimiter = defaultValue(delimiter, ' • ');
        this._container = container;
        this._textContainer = textContainer;
        this._imageContainer = imageContainer;
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