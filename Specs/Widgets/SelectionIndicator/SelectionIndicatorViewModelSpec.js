/*global defineSuite*/
defineSuite([
         'Widgets/SelectionIndicator/SelectionIndicatorViewModel',
         'Core/Ellipsoid',
         'Scene/SceneTransitioner',
         'Specs/createScene',
         'Specs/destroyScene'
     ], function(
         SelectionIndicatorViewModel,
         Ellipsoid,
         SceneTransitioner,
         createScene,
         destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;
    var selectionIndicatorElement = document.createElement('div');
    var container = document.createElement('div');
    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        destroyScene(scene);
    });

    it('constructor sets expected values', function() {
        var viewModel = new SelectionIndicatorViewModel(scene, selectionIndicatorElement, container);
        expect(viewModel.scene).toBe(scene);
        expect(viewModel.selectionIndicatorElement).toBe(selectionIndicatorElement);
        expect(viewModel.container).toBe(container);
    });

    it('throws if scene is undefined', function() {
        expect(function() {
            return new SelectionIndicatorViewModel(undefined);
        }).toThrow();
    });

    it('throws if selectionIndicatorElement is undefined', function() {
        expect(function() {
            return new SelectionIndicatorViewModel(scene);
        }).toThrow();
    });
});