/*global define*/
define([
        '../Core/defaultValue'
    ], function (
        defaultValue) {
    "use strict";

    /**
     * DOC_TBA
     */

    var interpunct;
    var delimeter = ' • ';
    function createFirstInterpunct() {
        interpunct = document.createElement('span');
        interpunct.id = 'interpunct';
        interpunct.appendChild(document.createTextNode(delimeter));
        interpunct.style.padding = "3px";
    }

    var CreditManager = function(container) {
        this.visibleCredits = {};
        this.countDefaultCredits = 0;
        this.hasVisibleCredits = false;
        this.container = container;
        createFirstInterpunct();
    };

    CreditManager.prototype.addDefaultCredit = function(credit) {
        if (typeof credit !== 'undefined') {
            if (this.countDefaultCredits === 0) {
                this.container.appendChild(interpunct);
            }
            this.countDefaultCredits++;
            showCredit(credit, this.container);
        }
    };

    CreditManager.prototype.removeDefaultCredit = function(credit) {
        if (typeof credit !== 'undefined') {
            this.countDefaultCredits--;
            if (this.countDefaultCredits === 0) {
                this.container.removeChild(interpunct);
            }
            hideCredit(credit, this.container);
        }
    };

    CreditManager.prototype.showCredits = function(credits) {
        var newVisible = [];
        var stillVisible = {};
        var i;
        var undefinedCredits = 0;

        for (i = 0; i < credits.length; i++) {
            var credit = credits[i];
            if (typeof credit !== 'undefined') {
                if (this.visibleCredits.hasOwnProperty(credit.name)) {
                    stillVisible[credit.name] = credit;
                } else {
                    newVisible.push(credit);
                }
            } else {
                undefinedCredits++;
            }
        }

        if (this.countDefaultCredits === 0) {
            if (credits.length === undefinedCredits) {
                if (this.hasVisibleCredits) {
                    this.container.removeChild(interpunct);
                    this.hasVisibleCredits = false;
                }
            }

            if (newVisible.length > 0) {
                if (!this.hasVisibleCredits) {
                    this.container.appendChild(interpunct);
                    this.hasVisibleCredits = true;
                }
            }
        }

        for (i = 0; i < newVisible.length; i++) {
            showCredit(newVisible[i], this.container);
            stillVisible[newVisible[i].name] = newVisible[i];
        }

        for (var a in stillVisible) {
            if (stillVisible.hasOwnProperty(a)) {
                delete this.visibleCredits[a];
            }
        }

        for (var b in this.visibleCredits) {
            if (this.visibleCredits.hasOwnProperty(b)) {
                hideCredit(this.visibleCredits[b], this.container);
            }
        }
        this.visibleCredits = stillVisible;
    };

    function showCredit(credit, container) {
        if (typeof credit !== 'undefined') {
            var name = credit.name;
            if (typeof credit !== 'undefined') {
                var span = document.createElement('span');
                span.id = name;
                var content;
                if (typeof credit.image !== 'undefined') {
                    content = document.createElement('img');
                    content.className = "credit-image";
                    content.src = credit.image;
                    content.style["vertical-align"] = "bottom";
                    if (typeof credit.text !== 'undefined') {
                        content.alt = credit.text;
                        content.title = credit.text;
                    }
                } else if (typeof credit.text !== 'undefined') {
                    content = document.createTextNode(credit.text);
                } else {
                    content = document.createTextNode(credit.link);
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
                span.appendChild(document.createTextNode(delimeter));
                container.appendChild(span);
            }
        }
    }

    function hideCredit(credit, container) {
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