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

    var CreditDisplay = function(container, delimiter, canvas) {
        if (typeof container === 'undefined') {
            if (typeof canvas === 'undefined') {
                throw new DeveloperError('credit container is required');
            }
            container = document.createElement('div');
            container.style.position = "absolute";
            container.style.bottom = "0";
            container.style["text-shadow"] = "0px 0px 2px #000000";
            container.style.color = "#ffffff";
            container.style["font-size"] = "10pt";
            container.style["padding-right"] = "5px";
            canvas.parentNode.appendChild(container);
        }
        var imageContainer = document.createElement('span');
        var textContainer = document.createElement('span');
        container.appendChild(imageContainer);
        container.appendChild(textContainer);

        this.delimiter = defaultValue(delimiter, ' • ');
        this.container = container;
        this.textContainer = textContainer;
        this.imageContainer = imageContainer;
        this.defaultImageCredits = [];
        this.visibleImageCredits = [];
        this.defaultTextCredits = [];
        this.visibleTextCredits = [];
        this.previousCredits = [];
    };

    /**
     * Adds credits that will persist until they are removed
     *
     * @memberof CreditDisplay
     *
     * @param {Credit} credit The credit to added to defaults
     */
    CreditDisplay.prototype.addDefaultCredit = function(credit) {
        if (typeof credit !== 'undefined') {
            if (typeof credit.getImageUrl() === 'undefined') {
                this.defaultTextCredits.push(credit);
                addTextCredits(this);
            } else {
                this.defaultImageCredits.push(credit);
                addImageCredits(this);
            }
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
        if (typeof credit !== 'undefined') {
            var index;
            if (typeof credit.getImageUrl() === 'undefined') {
                index = this.defaultTextCredits.indexOf(credit);
                if (index !== -1) {
                    this.defaultTextCredits.splice(index, 1);
                    addTextCredits(this);
                }
            } else {
                index = this.defaultImageCredits.indexOf(credit);
                if (index !== -1) {
                    this.defaultImageCredits.splice(index, 1);
                    addImageCredits(this);
                }
            }
        }
    };

    /**
     * Displays all credits in a list to the credit container
     *
     * @memberof CreditDisplay
     *
     * @param Array {Credit} credits The credits to display
     */
    CreditDisplay.prototype.showCredits = function(credits) {
        if (typeof credits !== 'undefined') {
            var previousCredits = this.previousCredits;
            if (previousCredits.length !== credits.length) {
                processCredits(this, credits);
                this.previousCredits = credits;
            } else {
                for (var i = 0; i < credits.length; i++) {
                    if (!Credit.equals(credits[i], this.previousCredits[i])) {
                        processCredits(this, credits);
                        this.previousCredits = credits;
                        break;
                    }
                }
            }
        }
    };

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

    function processCredits(creditDisplay, credits) {
        var newImages = [];
        var newText = [];
        var i;

        credits = removeDuplicates(credits);
        for (i = 0; i < credits.length; i++) {
            var credit = credits[i];
            if (typeof credit !== 'undefined') {
                if (typeof credit.getImageUrl() === 'undefined'){
                    newText.push(credit);
                } else {
                    newImages.push(credit);
                }
            }
        }

        creditDisplay.visibleImageCredits = newImages;
        addImageCredits(creditDisplay);

        creditDisplay.visibleTextCredits = newText;
        addTextCredits(creditDisplay);
    }

    function addTextCredits(creditDisplay) {
        var container = creditDisplay.textContainer;
        var replacementContainer = document.createElement('span');
        var textCredits = creditDisplay.defaultTextCredits.concat(creditDisplay.visibleTextCredits);
        for (var i = 0; i < textCredits.length; i++) {
            var credit = textCredits[i];
            var text = credit.getText();
            var link = credit.getLink();
            var str;
            if (i !== 0) {
                str = creditDisplay.delimiter;
            } else {
                str = '';
            }
            if (typeof text !== 'undefined') {
                str += text;
            } else {
                str += link;
            }
            var txt = document.createTextNode(str);
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
            replacementContainer.appendChild(span);
        }
        if (container.innerHTML !== replacementContainer.innerHTML) {
            container.innerHTML = replacementContainer.innerHTML;
        }
    }

    function addImageCredits(creditDisplay) {
        var container = creditDisplay.imageContainer;
        var replacementContainer = document.createElement('span');
        var imageCredits = creditDisplay.defaultImageCredits.concat(creditDisplay.visibleImageCredits);
        for (var i = 0; i < imageCredits.length; i++) {
            var credit = imageCredits[i];
            var text = credit.getText();
            var link = credit.getLink();
            var span = document.createElement('span');
            var content = document.createElement('img');
            content.className = "credit-image";
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
            replacementContainer.appendChild(span);
        }
        if (container.innerHTML !== replacementContainer.innerHTML) {
            container.innerHTML = replacementContainer.innerHTML;
        }
    }

    return CreditDisplay;
});