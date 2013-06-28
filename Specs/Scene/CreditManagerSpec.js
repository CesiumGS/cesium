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
        var credit2 = new Credit('credit2');

        var creditManager = new CreditManager(container);
        var credits = [credit1];
        creditManager.showCredits(credits);
        expect(container.innerHTML).toEqual('<span></span><span><span>credit1</span></span>');

        credits = [credit1, credit2];
        creditManager.showCredits(credits);
        expect(container.innerHTML).toEqual('<span></span><span><span>credit1</span><span>credit2</span></span>');

        credits = [];
        creditManager.showCredits(credits);
        expect(container.innerHTML).toEqual('<span></span><span></span>');
    });



});