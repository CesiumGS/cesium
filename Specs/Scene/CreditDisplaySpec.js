/*global defineSuite*/
defineSuite([
         'Scene/CreditDisplay',
         'Scene/Credit'
     ], function(
         CreditDisplay,
         Credit
     ) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var container;

    var imageContainerSpan = '<span class="cesium-credit-imageContainer">';
    var textContainerSpan = '<span class="cesium-credit-textContainer">';
    var textSpan = '<span class="cesium-credit-text">';
    var imageSpan = '<span class="cesium-credit-image">';
    var img = '<img src="imagesrc" style="vertical-align: bottom;">';
    var delimiterSpan = '<span class="cesium-credit-delimiter">';
    var endSpan = '</span>';

    beforeEach(function() {
        container = document.createElement('div');
        container.id = 'credit-container';
    });

    it('credit display throws with no container', function() {
        expect(function() {
            return new CreditDisplay();
        }).toThrow();
    });

    it('credit display addCredit throws when credit is undefined', function() {
        expect(function() {
            var creditDisplay = new CreditDisplay();
            creditDisplay.addCredit();
        }).toThrow();
    });

    it('credit display addDefaultCredit throws when credit is undefined', function() {
        expect(function() {
            var creditDisplay = new CreditDisplay();
            creditDisplay.addDefaultCredit();
        }).toThrow();
    });

    it('credit display removeDefaultCredit throws when credit is undefined', function() {
        expect(function() {
            var creditDisplay = new CreditDisplay();
            creditDisplay.removeDevaultCredit();
        }).toThrow();
    });

    it('credit display displays text credit', function() {
        var creditDisplay = new CreditDisplay(container);
        var credit = new Credit('credit1');
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual(imageContainerSpan + endSpan + textContainerSpan + textSpan + 'credit1' + endSpan + endSpan);
    });

    it('credit display displays image credit', function() {
        var creditDisplay = new CreditDisplay(container);
        var credit = new Credit(undefined, 'imagesrc');
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual(imageContainerSpan + imageSpan + img + endSpan + endSpan + textContainerSpan + endSpan);
    });

    it('credit display displays hyperlink credit', function() {
        var creditDisplay = new CreditDisplay(container);
        var credit = new Credit(undefined, undefined, 'http://cesium.agi.com');
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual(imageContainerSpan + endSpan + textContainerSpan + textSpan + '<a href="http://cesium.agi.com" target="_blank">http://cesium.agi.com</a>' + endSpan + endSpan);
    });

    it('credit display updates html when credits change', function() {
        var credit1 = new Credit('credit1');
        var credit2 = new Credit(undefined, 'imagesrc');

        var creditDisplay = new CreditDisplay(container);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual(imageContainerSpan + endSpan + textContainerSpan + textSpan + 'credit1' + endSpan + endSpan);

        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit2);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual(imageContainerSpan + imageSpan + img + endSpan + endSpan + textContainerSpan + endSpan);

        creditDisplay.addCredit(credit1);
        creditDisplay.addCredit(credit2);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual(imageContainerSpan + imageSpan + img + endSpan + endSpan + textContainerSpan + textSpan + 'credit1' + endSpan + endSpan);

        creditDisplay.beginFrame();
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual(imageContainerSpan + endSpan + textContainerSpan + endSpan);
    });

    it('credit display uses delimeter for text credits', function() {
        var credit1 = new Credit('credit1');
        var credit2 = new Credit('credit2');
        var creditDisplay = new CreditDisplay(container, ', ');
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.addCredit(credit2);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual(imageContainerSpan + endSpan + textContainerSpan + textSpan + 'credit1' + endSpan + delimiterSpan + ', ' + endSpan + textSpan + 'credit2' + endSpan + endSpan);
    });

    it('credit display manages delimeters correctly for text credits', function() {
        var credit1 = new Credit('credit1');
        var credit2 = new Credit('credit2');
        var credit3 = new Credit('credit3');

        var creditDisplay = new CreditDisplay(container, ', ');
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.addCredit(credit2);
        creditDisplay.addCredit(credit3);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual(imageContainerSpan + endSpan + textContainerSpan + textSpan + 'credit1' + endSpan + delimiterSpan + ', ' + endSpan + textSpan + 'credit2' + endSpan + delimiterSpan + ', ' + endSpan + textSpan + 'credit3' + endSpan + endSpan);

        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit2);
        creditDisplay.addCredit(credit3);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual(imageContainerSpan + endSpan + textContainerSpan + textSpan + 'credit2' + endSpan + delimiterSpan + ', ' + endSpan + textSpan + 'credit3' + endSpan + endSpan);

        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit2);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual(imageContainerSpan + endSpan + textContainerSpan + textSpan + 'credit2' + endSpan + endSpan);

        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit2);
        creditDisplay.addCredit(credit3);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual(imageContainerSpan + endSpan + textContainerSpan + textSpan + 'credit2' + endSpan + delimiterSpan + ', ' + endSpan + textSpan + 'credit3' + endSpan + endSpan);
    });

    it('credit display uses text as title for image credit', function() {
        var credit1 = new Credit('credit text', 'imagesrc');
        var creditDisplay = new CreditDisplay(container);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual(imageContainerSpan + imageSpan + '<img src="imagesrc" alt="credit text" title="credit text" style="vertical-align: bottom;">' + endSpan + endSpan + textContainerSpan + endSpan);
    });

    it('credit display creates image credit with hyperlink', function() {
        var credit1 = new Credit(undefined, 'imagesrc', 'link.com');
        var creditDisplay = new CreditDisplay(container);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual(imageContainerSpan + imageSpan + '<a href="link.com" target="_blank">' + img + '</a>' + endSpan + endSpan + textContainerSpan + endSpan);
    });

    it('credit display displays default credit', function() {
        var defaultCredit = new Credit('defaultCredit');
        var credit1 = new Credit('credit1');
        var creditDisplay = new CreditDisplay(container, ', ');
        creditDisplay.addDefaultCredit(defaultCredit);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual(imageContainerSpan + endSpan + textContainerSpan + textSpan + 'defaultCredit' + endSpan + delimiterSpan + ', ' + endSpan + textSpan + 'credit1' + endSpan + endSpan);

        creditDisplay.beginFrame();
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual(imageContainerSpan + endSpan + textContainerSpan + textSpan + 'defaultCredit' + endSpan + endSpan);
    });

    it('credit display displays credits when default is removed', function() {
        var defaultCredit = new Credit('defaultCredit');
        var credit1 = new Credit('credit1');

        var creditDisplay = new CreditDisplay(container, ', ');
        creditDisplay.addDefaultCredit(defaultCredit);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual(imageContainerSpan + endSpan + textContainerSpan + textSpan + 'defaultCredit' + endSpan + delimiterSpan + ', ' + endSpan + textSpan + 'credit1' + endSpan + endSpan);

        creditDisplay.removeDefaultCredit(defaultCredit);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual(imageContainerSpan + endSpan + textContainerSpan + textSpan + 'credit1' + endSpan + endSpan);
    });

    it('credit display displays default image credit', function() {
        var defaultCredit = new Credit(undefined, 'imagesrc');
        var credit1 = new Credit('credit1');
        var creditDisplay = new CreditDisplay(container, ', ');
        creditDisplay.addDefaultCredit(defaultCredit);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual(imageContainerSpan + imageSpan + img + endSpan + endSpan + textContainerSpan + textSpan + 'credit1' + endSpan + endSpan);

        creditDisplay.beginFrame();
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual(imageContainerSpan + imageSpan + img + endSpan + endSpan + textContainerSpan + endSpan);

    });

    it('credit display displays credits when default image is removed', function() {
        var defaultCredit = new Credit(undefined, 'imagesrc');
        var credit1 = new Credit('credit1');

        var creditDisplay = new CreditDisplay(container, ', ');
        creditDisplay.addDefaultCredit(defaultCredit);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual(imageContainerSpan + imageSpan + img + endSpan + endSpan + textContainerSpan + textSpan + 'credit1' + endSpan + endSpan);

        creditDisplay.removeDefaultCredit(defaultCredit);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();

        expect(container.innerHTML).toEqual(imageContainerSpan + endSpan + textContainerSpan + textSpan + 'credit1' + endSpan + endSpan);
    });

    it('credit display creates image credit with hyperlink', function() {
        var credit1 = new Credit(undefined, 'imagesrc', 'link.com');
        var creditDisplay = new CreditDisplay(container);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual(imageContainerSpan + imageSpan + '<a href="link.com" target="_blank">' + img + '</a>' + endSpan + endSpan + textContainerSpan + endSpan);
    });

    it('credit display only displays one if two image credits are equal', function() {
        var credit1 = new Credit(undefined, 'imagesrc');
        var credit2 = new Credit(undefined, 'imagesrc');
        var creditDisplay = new CreditDisplay(container);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.addCredit(credit2);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual(imageContainerSpan + imageSpan + img + endSpan + endSpan + textContainerSpan + endSpan);
    });

    it('credit display only displays one if two text credits are equal', function() {
        var credit1 = new Credit('text');
        var credit2 = new Credit('text');
        var creditDisplay = new CreditDisplay(container);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.addCredit(credit2);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual(imageContainerSpan + endSpan + textContainerSpan + textSpan + 'text' + endSpan + endSpan);
    });
});