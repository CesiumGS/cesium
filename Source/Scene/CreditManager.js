/*global define*/
define([
        '../Core/defaultValue'
    ], function (
        defaultValue) {
    "use strict";

    /**
     * DOC_TBA
     */

    var delimeter = ' • ';

    var CreditManager = function(container) {
        var imageContainer = document.createElement('span');
        var textContainer = document.createElement('span');
        container.appendChild(imageContainer);
        container.appendChild(textContainer);

        this.visibleImageCredits = {};
        this.container = container;
        this.textContainer = textContainer;
        this.imageContainer = imageContainer;
        this.defaultTextCredits = [];
        this.visibleTextCredits = [];
        this.previousCredits = [];
    };

    CreditManager.prototype.addDefaultCredit = function(credit) {
        if (typeof credit !== 'undefined') {
            if (typeof credit.image === 'undefined') {
                this.defaultTextCredits.push(credit);
                addTextCredits(this);
            } else {
                addImageCredit(credit, this.imageContainer);
            }
        }
    };

    CreditManager.prototype.removeDefaultCredit = function(credit) {
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

    CreditManager.prototype.showCredits = function(credits) {
        var previousCredits = this.previousCredits;
        if (previousCredits.length !== credits.length) {
            processCredits(this, credits);
            this.previousCredits = credits;
        } else {
            for (var i = 0; i < credits.length; i++) {
                if (credits[i] !== this.previousCredits[i]) {
                    processCredits(this, credits);
                    this.previousCredits = credits;
                    break;
                }
            }
        }
    };

    function processCredits(creditManager, credits) {
        var newImages = [];
        var newText = [];
        var stillVisible = {};
        var i;

        for (i = 0; i < credits.length; i++) {
            var credit = credits[i];
            if (typeof credit !== 'undefined') {
                if (typeof credit.image === 'undefined'){
                    newText.push(credit);
                } else if (!creditManager.visibleImageCredits.hasOwnProperty(credit.name)) {
                    newImages.push(credit);
                    stillVisible[credit.name] = credit;
                } else {
                    stillVisible[credit.name] = credit;
                }
            }
        }

        for (i = 0; i < newImages.length; i++) {
            var c = newImages[i];
            addImageCredit(c, creditManager.imageContainer);
        }

        creditManager.visibleTextCredits = newText;
        addTextCredits(creditManager);


        for (var a in stillVisible) {
            if (stillVisible.hasOwnProperty(a)) {
                delete creditManager.visibleImageCredits[a];
            }
        }

        for (var b in creditManager.visibleImageCredits) {
            if (creditManager.visibleImageCredits.hasOwnProperty(b)) {
                removeImageCredit(creditManager.visibleImageCredits[b], creditManager.imageContainer);
            }
        }

        creditManager.visibleImageCredits = stillVisible;
    }

    function addTextCredits(creditManager) {
        var container = creditManager.textContainer;
        var replacementContainer = document.createElement('span');
        var textCredits = creditManager.defaultTextCredits.concat(creditManager.visibleTextCredits);
        for (var i = 0; i < textCredits.length; i++) {
            var credit = textCredits[i];
            var str;
            if (i !== 0) {
                str = delimeter;
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

    return CreditManager;
});