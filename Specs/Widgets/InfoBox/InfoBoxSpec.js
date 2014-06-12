/*global defineSuite*/
defineSuite([
        'Widgets/InfoBox/InfoBox'
    ], function(
        InfoBox) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor sets expected values', function() {
        var testElement = document.createElement('span');
        var infoBox = new InfoBox(testElement);
        expect(infoBox.container).toBe(testElement);
        expect(infoBox.viewModel).toBeDefined();
        expect(infoBox.isDestroyed()).toEqual(false);
        infoBox.destroy();
        expect(infoBox.isDestroyed()).toEqual(true);
    });

    it('constructor works with string id container', function() {
        var testElement = document.createElement('span');
        testElement.id = 'testElement';
        document.body.appendChild(testElement);
        var infoBox = new InfoBox('testElement');
        expect(infoBox.container).toBe(testElement);
        document.body.removeChild(testElement);
        infoBox.destroy();
    });

    it('throws if container is undefined', function() {
        expect(function() {
            return new InfoBox(undefined);
        }).toThrowDeveloperError();
    });

    it('throws if container string is undefined', function() {
        expect(function() {
            return new InfoBox('testElement');
        }).toThrowDeveloperError();
    });
});