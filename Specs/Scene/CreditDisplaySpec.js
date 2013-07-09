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
        expect(container.innerHTML).toEqual('<span></span><span><span class="cesium-credit-text">credit1</span></span>');
    });

    it('credit display displays image credit', function() {
        var creditDisplay = new CreditDisplay(container);
        var credit = new Credit(undefined, 'imagesrc');
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual('<span><span class="cesium-credit-image"><img src="imagesrc" style="vertical-align: bottom;"></span></span><span></span>');
    });

    it('credit display displays hyperlink credit', function() {
        var creditDisplay = new CreditDisplay(container);
        var credit = new Credit(undefined, undefined, 'http://cesium.agi.com');
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual('<span></span><span><span class="cesium-credit-text"><a href="http://cesium.agi.com" target="_blank">http://cesium.agi.com</a></span></span>');
    });

    it('credit display updates html when credits change', function() {
        var credit1 = new Credit('credit1');
        var credit2 = new Credit(undefined, 'imagesrc');

        var creditDisplay = new CreditDisplay(container);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual('<span></span><span><span class="cesium-credit-text">credit1</span></span>');

        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit2);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual('<span><span class="cesium-credit-image"><img src="imagesrc" style="vertical-align: bottom;"></span></span><span></span>');

        creditDisplay.addCredit(credit1);
        creditDisplay.addCredit(credit2);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual('<span><span class="cesium-credit-image"><img src="imagesrc" style="vertical-align: bottom;"></span></span><span><span class="cesium-credit-text">credit1</span></span>');

        creditDisplay.beginFrame();
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual('<span></span><span></span>');
    });

    it('credit display uses delimeter for text credits', function() {
        var credit1 = new Credit('credit1');
        var credit2 = new Credit('credit2');
        var creditDisplay = new CreditDisplay(container, ', ');
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.addCredit(credit2);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual('<span></span><span><span class="cesium-credit-text">credit1</span><span class="cesium-credit-delimiter">, </span><span class="cesium-credit-text">credit2</span></span>');
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
        expect(container.innerHTML).toEqual('<span></span><span><span class="cesium-credit-text">credit1</span><span class="cesium-credit-delimiter">, </span><span class="cesium-credit-text">credit2</span><span class="cesium-credit-delimiter">, </span><span class="cesium-credit-text">credit3</span></span>');

        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit2);
        creditDisplay.addCredit(credit3);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual('<span></span><span><span class="cesium-credit-text">credit2</span><span class="cesium-credit-delimiter">, </span><span class="cesium-credit-text">credit3</span></span>');

        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit2);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual('<span></span><span><span class="cesium-credit-text">credit2</span></span>');

        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit2);
        creditDisplay.addCredit(credit3);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual('<span></span><span><span class="cesium-credit-text">credit2</span><span class="cesium-credit-delimiter">, </span><span class="cesium-credit-text">credit3</span></span>');
    });

    it('credit display uses text as title for image credit', function() {
        var credit1 = new Credit('credit text', 'imagesrc');
        var creditDisplay = new CreditDisplay(container);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual('<span><span class="cesium-credit-image"><img src="imagesrc" alt="credit text" title="credit text" style="vertical-align: bottom;"></span></span><span></span>');
    });

    it('credit display creates image credit with hyperlink', function() {
        var credit1 = new Credit(undefined, 'imagesrc', 'link.com');
        var creditDisplay = new CreditDisplay(container);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual('<span><span class="cesium-credit-image"><a href="link.com" target="_blank"><img src="imagesrc" style="vertical-align: bottom;"></a></span></span><span></span>');
    });

    it('credit display displays default credit', function() {
        var defaultCredit = new Credit('defaultCredit');
        var credit1 = new Credit('credit1');
        var creditDisplay = new CreditDisplay(container, ', ');
        creditDisplay.addDefaultCredit(defaultCredit);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual('<span></span><span><span class="cesium-credit-text">defaultCredit</span><span class="cesium-credit-delimiter">, </span><span class="cesium-credit-text">credit1</span></span>');

        creditDisplay.beginFrame();
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual('<span></span><span><span class="cesium-credit-text">defaultCredit</span></span>');
    });

    it('credit display displays credits when default is removed', function() {
        var defaultCredit = new Credit('defaultCredit');
        var credit1 = new Credit('credit1');

        var creditDisplay = new CreditDisplay(container, ', ');
        creditDisplay.addDefaultCredit(defaultCredit);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual('<span></span><span><span class="cesium-credit-text">defaultCredit</span><span class="cesium-credit-delimiter">, </span><span class="cesium-credit-text">credit1</span></span>');

        creditDisplay.removeDefaultCredit(defaultCredit);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual('<span></span><span><span class="cesium-credit-text">credit1</span></span>');
    });

    it('credit display displays default image credit', function() {
        var defaultCredit = new Credit(undefined, 'imagesrc');
        var credit1 = new Credit('credit1');
        var creditDisplay = new CreditDisplay(container, ', ');
        creditDisplay.addDefaultCredit(defaultCredit);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual('<span><span class="cesium-credit-image"><img src="imagesrc" style="vertical-align: bottom;"></span></span><span><span class="cesium-credit-text">credit1</span></span>');

        creditDisplay.beginFrame();
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual('<span><span class="cesium-credit-image"><img src="imagesrc" style="vertical-align: bottom;"></span></span><span></span>');

    });

    it('credit display displays credits when default image is removed', function() {
        var defaultCredit = new Credit(undefined, 'imagesrc');
        var credit1 = new Credit('credit1');

        var creditDisplay = new CreditDisplay(container, ', ');
        creditDisplay.addDefaultCredit(defaultCredit);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual('<span><span class="cesium-credit-image"><img src="imagesrc" style="vertical-align: bottom;"></span></span><span><span class="cesium-credit-text">credit1</span></span>');

        creditDisplay.removeDefaultCredit(defaultCredit);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();

        expect(container.innerHTML).toEqual('<span></span><span><span class="cesium-credit-text">credit1</span></span>');
    });

    it('credit display creates image credit with hyperlink', function() {
        var credit1 = new Credit(undefined, 'imagesrc', 'link.com');
        var creditDisplay = new CreditDisplay(container);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual('<span><span class="cesium-credit-image"><a href="link.com" target="_blank"><img src="imagesrc" style="vertical-align: bottom;"></a></span></span><span></span>');
    });

    it('credit display only displays one if two image credits are equal', function() {
        var credit1 = new Credit(undefined, 'imagesrc');
        var credit2 = new Credit(undefined, 'imagesrc');
        var creditDisplay = new CreditDisplay(container);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.addCredit(credit2);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual('<span><span class="cesium-credit-image"><img src="imagesrc" style="vertical-align: bottom;"></span></span><span></span>');
    });

    it('credit display only displays one if two text credits are equal', function() {
        var credit1 = new Credit('text');
        var credit2 = new Credit('text');
        var creditDisplay = new CreditDisplay(container);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.addCredit(credit2);
        creditDisplay.endFrame();
        expect(container.innerHTML).toEqual('<span></span><span><span class="cesium-credit-text">text</span></span>');
    });
});