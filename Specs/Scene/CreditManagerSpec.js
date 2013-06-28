/*global defineSuite*/
defineSuite([
         'Scene/CreditManager',
         'Scene/Credit'
     ], function(
         CreditManager,
         Credit
     ) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var container;

    beforeEach(function() {
        container = document.createElement('div');
        container.id = 'credit-container';
        document.body.appendChild(container);
    });

    afterEach(function() {
        document.body.removeChild(container);
    });

    it('credit manager displays text credit', function() {
        var creditManager = new CreditManager(container);
        var credits = [new Credit('credit1')];
        creditManager.showCredits(credits);
        expect(container.innerHTML).toEqual('<span></span><span><span>credit1</span></span>');
    });

    it('credit manager displays image credit', function() {
        var creditManager = new CreditManager(container);
        var credits = [new Credit('credit1', undefined, 'imagesrc')];
        creditManager.showCredits(credits);
        expect(container.innerHTML).toEqual('<span><span id="credit1"><img class="credit-image" src="imagesrc" style="vertical-align: bottom;"></span></span><span></span>');
    });

    it('credit manager displays hyperlink credit', function() {
        var creditManager = new CreditManager(container);
        var credits = [new Credit('credit1', undefined, undefined, 'http://cesium.agi.com')];
        creditManager.showCredits(credits);
        expect(container.innerHTML).toEqual('<span></span><span><span><a href="http://cesium.agi.com" target="_blank">http://cesium.agi.com</a></span></span>');
    });

    it('credit manager updates html when credits change', function() {
        var credit1 = new Credit('credit1');
        var credit2 = new Credit('credit2', undefined, 'imagesrc');

        var creditManager = new CreditManager(container);
        var credits = [credit1];
        creditManager.showCredits(credits);
        expect(container.innerHTML).toEqual('<span></span><span><span>credit1</span></span>');

        credits = [credit2];
        creditManager.showCredits(credits);
        expect(container.innerHTML).toEqual('<span><span id="credit2"><img class="credit-image" src="imagesrc" style="vertical-align: bottom;"></span></span><span></span>');

        credits = [credit1, credit2];
        creditManager.showCredits(credits);
        expect(container.innerHTML).toEqual('<span><span id="credit2"><img class="credit-image" src="imagesrc" style="vertical-align: bottom;"></span></span><span><span>credit1</span></span>');

        credits = [];
        creditManager.showCredits(credits);
        expect(container.innerHTML).toEqual('<span></span><span></span>');
    });

    it('credit manager uses delimeter for text credits', function() {
        var credit1 = new Credit('credit1');
        var credit2 = new Credit('credit2');

        var credits = [credit1, credit2];
        var creditManager = new CreditManager(container, ', ');
        creditManager.showCredits(credits);
        expect(container.innerHTML).toEqual('<span></span><span><span>credit1</span><span>, credit2</span></span>');
    });

    it('credit manager uses text as title for image credit', function() {
        var credit1 = new Credit('credit1', 'credit text', 'imagesrc');

        var credits = [credit1];
        var creditManager = new CreditManager(container);
        creditManager.showCredits(credits);
        expect(container.innerHTML).toEqual('<span><span id="credit1"><img class="credit-image" src="imagesrc" alt="credit text" title="credit text" style="vertical-align: bottom;"></span></span><span></span>');
    });

    it('credit manager creates image credit with hyperlink', function() {
        var credit1 = new Credit('credit1', undefined, 'imagesrc', 'link.com');

        var credits = [credit1];
        var creditManager = new CreditManager(container);
        creditManager.showCredits(credits);
        expect(container.innerHTML).toEqual('<span><span id="credit1"><a href="link.com" target="_blank"><img class="credit-image" src="imagesrc" style="vertical-align: bottom;"></a></span></span><span></span>');
    });

    it('credit manager displays default credit', function() {
        var defaultCredit = new Credit('defaultCredit');
        var credit1 = new Credit('credit1');

        var credits = [credit1];
        var creditManager = new CreditManager(container, ', ');
        creditManager.addDefaultCredit(defaultCredit);
        creditManager.showCredits(credits);
        expect(container.innerHTML).toEqual('<span></span><span><span>defaultCredit</span><span>, credit1</span></span>');
    });

    it('credit manager displays credits when default is removed', function() {
        var defaultCredit = new Credit('defaultCredit');
        var credit1 = new Credit('credit1');

        var credits = [credit1];
        var creditManager = new CreditManager(container, ', ');
        creditManager.addDefaultCredit(defaultCredit);
        creditManager.showCredits(credits);
        expect(container.innerHTML).toEqual('<span></span><span><span>defaultCredit</span><span>, credit1</span></span>');

        creditManager.removeDefaultCredit(defaultCredit);
        expect(container.innerHTML).toEqual('<span></span><span><span>credit1</span></span>');
    });

    it('credit manager displays default image credit', function() {
        var defaultCredit = new Credit('defaultCredit', undefined, 'imagesrc');
        var credit1 = new Credit('credit1');

        var credits = [credit1];
        var creditManager = new CreditManager(container, ', ');
        creditManager.addDefaultCredit(defaultCredit);
        creditManager.showCredits(credits);
        expect(container.innerHTML).toEqual('<span><span id="defaultCredit"><img class="credit-image" src="imagesrc" style="vertical-align: bottom;"></span></span><span><span>credit1</span></span>');
    });

    it('credit manager displays credits when default image is removed', function() {
        var defaultCredit = new Credit('defaultCredit', undefined, 'imagesrc');
        var credit1 = new Credit('credit1');

        var credits = [credit1];
        var creditManager = new CreditManager(container, ', ');
        creditManager.addDefaultCredit(defaultCredit);
        creditManager.showCredits(credits);
        expect(container.innerHTML).toEqual('<span><span id="defaultCredit"><img class="credit-image" src="imagesrc" style="vertical-align: bottom;"></span></span><span><span>credit1</span></span>');

        creditManager.removeDefaultCredit(defaultCredit);
        expect(container.innerHTML).toEqual('<span></span><span><span>credit1</span></span>');
    });

    it('credit manager creates image credit with hyperlink', function() {
        var credit1 = new Credit('credit1', undefined, 'imagesrc', 'link.com');

        var credits = [credit1];
        var creditManager = new CreditManager(container);
        creditManager.showCredits(credits);
        expect(container.innerHTML).toEqual('<span><span id="credit1"><a href="link.com" target="_blank"><img class="credit-image" src="imagesrc" style="vertical-align: bottom;"></a></span></span><span></span>');
    });

    it('credit manager only displays one if two image credits are equal', function() {
        var credit1 = new Credit('credit1', undefined, 'imagesrc');
        var credit2 = new Credit('credit1', undefined, 'imagesrc');

        var credits = [credit1, credit2];
        var creditManager = new CreditManager(container);
        creditManager.showCredits(credits);
        expect(container.innerHTML).toEqual('<span><span id="credit1"><img class="credit-image" src="imagesrc" style="vertical-align: bottom;"></span></span><span></span>');
    });

    it('credit manager only displays one if two text credits are equal', function() {
        var credit1 = new Credit('credit1', 'text');
        var credit2 = new Credit('credit1', 'text');

        var credits = [credit1, credit2];
        var creditManager = new CreditManager(container);
        creditManager.showCredits(credits);
        expect(container.innerHTML).toEqual('<span></span><span><span>text</span></span>');
    });
});