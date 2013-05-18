/*global defineSuite*/
defineSuite([
             'Widgets/FullscreenButton/FullscreenButton',
             'Widgets/FullscreenButton/FullscreenButtonViewModel'
            ], function(
              FullscreenButton,
              FullscreenButtonViewModel) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor sets default values', function() {
        var fullscreenButton = new FullscreenButton(document.body);
        expect(fullscreenButton.container).toBe(document.body);
        expect(fullscreenButton.viewModel.fullscreenElement()).toBe(document.body);
        fullscreenButton.destroy();
    });

    it('constructor sets expected values', function() {
        var testElement = document.createElement('span');
        var fullscreenButton = new FullscreenButton(document.body, testElement);
        expect(fullscreenButton.container).toBe(document.body);
        expect(fullscreenButton.viewModel.fullscreenElement()).toBe(testElement);
        fullscreenButton.destroy();
    });

    it('constructor works with string id container', function() {
        var testElement = document.createElement('span');
        testElement.id = 'testElement';
        document.body.appendChild(testElement);
        var fullscreenButton = new FullscreenButton('testElement');
        expect(fullscreenButton.container).toBe(testElement);
        document.body.removeChild(testElement);
        fullscreenButton.destroy();
    });

    it('throws if container is undefined', function() {
        expect(function() {
            return new FullscreenButton(undefined);
        }).toThrow();
    });

    it('throws if container string is undefined', function() {
        expect(function() {
            return new FullscreenButton('testElement');
        }).toThrow();
    });
});