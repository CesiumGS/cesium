/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        './Credit'
    ], function (
        defaultValue,
        DeveloperError,
        Credit) {
    "use strict";

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
     * var CreditDisplay = new CreditDisplay(creditContainer);
     */

    var CreditDisplay = function(container, delimiter) {
        if (typeof container === 'undefined') {
            throw new DeveloperError('credit container is required');
        }
        var imageContainer = document.createElement('span');
        var textContainer = document.createElement('span');
        container.appendChild(imageContainer);
        container.appendChild(textContainer);

        this._delimiter = defaultValue(delimiter, ' • ');
        this._container = container;
        this._textContainer = textContainer;
        this._imageContainer = imageContainer;
        this._defaultImageCredits = [];
        this._defaultTextCredits = [];

        this._displayedCredits = {
                imageCredits: [],
                textCredits: []
        };
        this._currentFrameCredits = {
                imageCredits: [],
                textCredits: []
        };
    };

    /**
     * Adds a credit to the list of current credits to be displayed in the in the credit container
     *
     * @memberof CreditDisplay
     *
     * @param {Credit} credit The credit to display
     */
    CreditDisplay.prototype.addCredit = function(credit) {
        if (typeof credit === 'undefined') {
            throw new DeveloperError('credit must be defined');
        }

        if (typeof credit.getImageUrl() !== 'undefined') {
            this._currentFrameCredits.imageCredits.push(credit);
        } else {
            this._currentFrameCredits.textCredits.push(credit);
        }
    };

    /**
     * Adds credits that will persist until they are removed
     *
     * @memberof CreditDisplay
     *
     * @param {Credit} credit The credit to added to defaults
     */
    CreditDisplay.prototype.addDefaultCredit = function(credit) {
        if (typeof credit === 'undefined') {
            throw new DeveloperError('credit must be defined');
        }

        if (typeof credit.getImageUrl() === 'undefined') {
            this._defaultTextCredits.push(credit);
            this._currentFrameCredits.imageCredits.push(credit);
        } else {
            this._defaultImageCredits.push(credit);
            this._currentFrameCredits.textCredits.push(credit);
        }
    };

    /**
     * Removes a default credit
     *
     * @memberof CreditDisplay
     *
     * @param {Credit} credit The credit to be removed from defaults
     */
    CreditDisplay.prototype.removeDefaultCredit = function(credit) {
        if (typeof credit === 'undefined') {
            throw new DeveloperError('credit must be defined');
        }

        var index;
        if (typeof credit.getImageUrl() === 'undefined') {
            index = this._defaultTextCredits.indexOf(credit);
            if (index !== -1) {
                this._defaultTextCredits.splice(index, 1);
            }
        } else {
            index = this._defaultImageCredits.indexOf(credit);
            if (index !== -1) {
                this._defaultImageCredits.splice(index, 1);
            }
        }
    };

    /**
     * Resets the credit display to a beginning of frame state, clearing out current credits.
     *
     * @memberof CreditDisplay
     *
     * @param {Credit} credit The credit to display
     */
    CreditDisplay.prototype.beginFrame = function() {
        this._currentFrameCredits.imageCredits = this._defaultImageCredits.slice(0);
        this._currentFrameCredits.textCredits = this._defaultTextCredits.slice(0);
    };

    /**
     * Sets the credit display to the end of frame state, displaying current credits in the credit container
     *
     * @memberof CreditDisplay
     *
     * @param {Credit} credit The credit to display
     */
    CreditDisplay.prototype.endFrame = function() {
        var credit;
        var displayedTextCredits = this._displayedCredits.textCredits;
        var displayedImageCredits = this._displayedCredits.imageCredits;
        var textCredits = removeDuplicates(this._currentFrameCredits.textCredits);
        var imageCredits = removeDuplicates(this._currentFrameCredits.imageCredits);
        var i;
        var index;
        for(i = 0; i < textCredits.length; i++) {
            credit = textCredits[i];
            index = displayedTextCredits.indexOf(credit);
            if (index === -1) {
                displayTextCredit(credit, this._textContainer, this._delimiter);
            } else {
                displayedTextCredits.splice(index, 1);
            }
        }
        for (i = 0; i < displayedTextCredits.length; i++) {
            credit = displayedTextCredits[i];
            hideCredit(credit, true);
        }

        for(i = 0; i < imageCredits.length; i++) {
            credit = imageCredits[i];
            index = displayedImageCredits.indexOf(credit);
            if (index === -1) {
                displayImageCredit(credit, this._imageContainer);
            } else {
                displayedImageCredits.splice(index, 1);
            }
        }
        for (i = 0; i < displayedImageCredits.length; i++) {
            credit = displayedImageCredits[i];
            hideCredit(credit, false);
        }

        this._displayedCredits.textCredits = textCredits;
        this._displayedCredits.imageCredits = imageCredits;
    };



    function displayTextCredit(credit, container, delimiter) {
        if (typeof credit.element === 'undefined') {
            var text = credit.getText();
            var link = credit.getLink();
            var txt;
            if (typeof text !== 'undefined') {
                txt = document.createTextNode(text);
            } else {
                txt = document.createTextNode(link);
            }
            var span = document.createElement('span');
            if (typeof link !== 'undefined') {
                var a = document.createElement('a');
                a.appendChild(txt);
                a.href = link;
                a.target = "_blank";
                span.appendChild(a);
            } else {
                span.appendChild(txt);
            }
            span.className = "cesium-credit-text";
            credit.element = span;
        }
        if (container.hasChildNodes()) {
            var del = document.createTextNode(delimiter);
            var delSpan = document.createElement('span');
            delSpan.appendChild(del);
            delSpan.className = "cesium-credit-delimiter";
            container.appendChild(delSpan);
        }
        container.appendChild(credit.element);
    }

    function displayImageCredit(credit, container) {
        if (typeof credit.element === 'undefined') {
            var text = credit.getText();
            var link = credit.getLink();
            var span = document.createElement('span');
            var content = document.createElement('img');
            content.src = credit.getImageUrl();
            content.style["vertical-align"] = "bottom";
            if (typeof text !== 'undefined') {
                content.alt = text;
                content.title = text;
            }

            if (typeof link !== 'undefined') {
                var a = document.createElement('a');
                a.appendChild(content);
                a.href = link;
                a.target = "_blank";
                span.appendChild(a);
            } else {
                span.appendChild(content);
            }
            span.className = "cesium-credit-image";
            credit.element = span;
        }
        container.appendChild(credit.element);
    }

    function removeDuplicates(credits) {
        var cleanedCredits = [];
        var len = credits.length;
        for (var i = 0; i < len; i++) {
            var credit = credits[i];
            cleanedCredits.push(credit);
            for (var j = i + 1; j < len; j++) {
                if (Credit.equals(credit, credits[j])) {
                    credits.splice(j, 1);
                    len--;
                    j--;
                }
            }
        }
        return cleanedCredits;
    }

    function hideCredit(credit, isText) {
        var element = credit.element;
        if (typeof element !== 'undefined') {
            var container = element.parentNode;
            if (isText) {
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

    return CreditDisplay;
});