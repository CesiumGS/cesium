/*global defineSuite*/
defineSuite([
         'Widgets/InfoBox/InfoBoxViewModel',
         'Core/Ellipsoid',
         'Scene/SceneTransitioner',
         'Specs/createScene',
         'Specs/destroyScene'
     ], function(
         InfoBoxViewModel,
         Ellipsoid,
         SceneTransitioner,
         createScene,
         destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;
    var infoBoxElement = document.createElement('div');
    var container = document.createElement('div');
    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        destroyScene(scene);
    });

    it('constructor sets expected values', function() {
        var viewModel = new InfoBoxViewModel(scene, infoBoxElement, container);
        expect(viewModel.scene).toBe(scene);
        expect(viewModel.infoBoxElement).toBe(infoBoxElement);
        expect(viewModel.container).toBe(container);
    });

    it('throws if scene is undefined', function() {
        expect(function() {
            return new InfoBoxViewModel(undefined);
        }).toThrow();
    });

    it('throws if infoBoxElement is undefined', function() {
        expect(function() {
            return new InfoBoxViewModel(scene);
        }).toThrow();
    });
});