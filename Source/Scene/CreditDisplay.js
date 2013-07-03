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
     * @param {String} [delimeter= ' • '] The string to separate text credits
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

        this.delimiter = defaultValue(delimiter, ' • ');
        this.container = container;
        this.textContainer = textContainer;
        this.imageContainer = imageContainer;
        this.visibleImageCredits = {};
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
            if (typeof credit.image === 'undefined') {
                this.defaultTextCredits.push(credit);
                addTextCredits(this);
            } else {
                addImageCredit(credit, this.imageContainer);
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
            if (typeof credit.image === 'undefined') {
                var index = this.defaultTextCredits.indexOf(credit);
                if (index !== -1) {
                    this.defaultTextCredits.splice(index, 1);
                    addTextCredits(this);
                }
            } else {
                removeImageCredit(credit, this.imageContainer);
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
        var stillVisible = {};
        var i;

        credits = removeDuplicates(credits);
        for (i = 0; i < credits.length; i++) {
            var credit = credits[i];
            if (typeof credit !== 'undefined') {
                if (typeof credit.image === 'undefined'){
                    newText.push(credit);
                } else if (!creditDisplay.visibleImageCredits.hasOwnProperty(credit.name) || !Credit.equals(creditDisplay.visibleImageCredits[credit.name], credit)) {
                    newImages.push(credit);
                    stillVisible[credit.name] = credit;
                } else {
                    stillVisible[credit.name] = credit;
                }
            }
        }

        for (i = 0; i < newImages.length; i++) {
            var c = newImages[i];
            addImageCredit(c, creditDisplay.imageContainer);
        }

        creditDisplay.visibleTextCredits = newText;
        addTextCredits(creditDisplay);


        for (var a in stillVisible) {
            if (stillVisible.hasOwnProperty(a)) {
                delete creditDisplay.visibleImageCredits[a];
            }
        }

        for (var b in creditDisplay.visibleImageCredits) {
            if (creditDisplay.visibleImageCredits.hasOwnProperty(b)) {
                removeImageCredit(creditDisplay.visibleImageCredits[b], creditDisplay.imageContainer);
            }
        }

        creditDisplay.visibleImageCredits = stillVisible;
    }

    function addTextCredits(creditDisplay) {
        var container = creditDisplay.textContainer;
        var replacementContainer = document.createElement('span');
        var textCredits = creditDisplay.defaultTextCredits.concat(creditDisplay.visibleTextCredits);
        for (var i = 0; i < textCredits.length; i++) {
            var credit = textCredits[i];
            var str;
            if (i !== 0) {
                str = creditDisplay.delimiter;
            } else {
                str = '';
            }
            if (typeof credit.text !== 'undefined') {
                str += credit.text;
            } else {
                str += credit.link;
            }
            var text = document.createTextNode(str);
            var span = document.createElement('span');
            if (typeof credit.link !== 'undefined') {
                var link = document.createElement('a');
                link.appendChild(text);
                link.href = credit.link;
                link.target = "_blank";

                span.appendChild(link);
            } else {
                span.appendChild(text);
            }
            replacementContainer.appendChild(span);
        }
        if (container.innerHTML !== replacementContainer.innerHTML) {
            container.innerHTML = replacementContainer.innerHTML;
        }
    }

    function addImageCredit(credit, container) {
        var name = credit.name;
        var span = document.createElement('span');
        span.id = name;
        var content = document.createElement('img');
        content.className = "credit-image";
        content.src = credit.image;
        content.style["vertical-align"] = "bottom";
        if (typeof credit.text !== 'undefined') {
            content.alt = credit.text;
            content.title = credit.text;
        }

        if (typeof credit.link !== 'undefined') {
            var link = document.createElement('a');
            link.appendChild(content);
            link.href = credit.link;
            link.target = "_blank";
            span.appendChild(link);
        } else {
            span.appendChild(content);
        }

        container.appendChild(span);
    }

    function removeImageCredit(credit, container) {
        if (typeof credit !== 'undefined') {
            var name = credit.name;
            if (typeof credit !== 'undefined') {
                var span = document.getElementById(name);
                if (typeof span !== 'undefined') {
                    container.removeChild(span);
                }
            }
        }
    }

    return CreditDisplay;
});