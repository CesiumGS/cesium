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
        expect(viewModel.getFullscreenElement()).toBe(document.body);
        expect(viewModel.isDestroyed()).toEqual(false);
        viewModel.destroy();
        expect(viewModel.isDestroyed()).toEqual(true);
    });

    it('constructor sets expected values', function() {
        var testElement = document.createElement('span');
        var viewModel = new FullscreenButtonViewModel(testElement);
        expect(viewModel.getFullscreenElement()).toBe(testElement);
        viewModel.destroy();
    });

    it('isFullscreenEnabled work as expected', function() {
        var viewModel = new FullscreenButtonViewModel();
        expect(viewModel.isFullscreenEnabled()).toEqual(Fullscreen.isFullscreenEnabled());
        viewModel.isFullscreenEnabled(false);
        expect(viewModel.isFullscreenEnabled()).toEqual(false);
        viewModel.destroy();
    });

    it('can get and set fullscreenElement', function() {
        var testElement = document.createElement('span');
        var viewModel = new FullscreenButtonViewModel();
        expect(viewModel.getFullscreenElement()).toNotBe(testElement);
        viewModel.setFullscreenElement(testElement);
        expect(viewModel.getFullscreenElement()).toBe(testElement);
    });
});