/*global defineSuite*/
defineSuite([
        'Widgets/FullscreenButton/FullscreenButtonViewModel',
        'Core/Fullscreen'
    ], function(
        FullscreenButtonViewModel,
        Fullscreen) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor sets default values', function() {
        var viewModel = new FullscreenButtonViewModel();
        expect(viewModel.fullscreenElement).toBe(document.body);
        expect(viewModel.isDestroyed()).toEqual(false);
        viewModel.destroy();
        expect(viewModel.isDestroyed()).toEqual(true);
    });

    it('constructor sets expected values', function() {
        var testElement = document.createElement('span');
        var viewModel = new FullscreenButtonViewModel(testElement);
        expect(viewModel.fullscreenElement).toBe(testElement);
        viewModel.destroy();
    });

    it('constructor can take an element id', function() {
        var testElement = document.createElement('span');
        testElement.id = 'testElement';
        document.body.appendChild(testElement);
        var viewModel = new FullscreenButtonViewModel('testElement');
        expect(viewModel.fullscreenElement).toBe(testElement);
        viewModel.destroy();
        document.body.removeChild(testElement);
    });

    it('isFullscreenEnabled work as expected', function() {
        var viewModel = new FullscreenButtonViewModel();
        expect(viewModel.isFullscreenEnabled).toEqual(Fullscreen.enabled);
        viewModel.isFullscreenEnabled = false;
        expect(viewModel.isFullscreenEnabled).toEqual(false);
        viewModel.destroy();
    });

    it('can get and set fullscreenElement', function() {
        var testElement = document.createElement('span');
        var viewModel = new FullscreenButtonViewModel();
        expect(viewModel.fullscreenElement).toNotBe(testElement);
        viewModel.fullscreenElement = testElement;
        expect(viewModel.fullscreenElement).toBe(testElement);
    });

    it('throws is setting fullscreenElement is not an Element', function() {
        var viewModel = new FullscreenButtonViewModel();
        expect(function() {
            viewModel.fullscreenElement = {};
        }).toThrowDeveloperError();
    });
});