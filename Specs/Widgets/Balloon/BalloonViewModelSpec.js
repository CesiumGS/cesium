/*global defineSuite*/
defineSuite([
         'Widgets/Balloon/BalloonViewModel',
         'Core/Ellipsoid',
         'Scene/SceneTransitioner',
         'Specs/createScene',
         'Specs/destroyScene'
     ], function(
         BalloonViewModel,
         Ellipsoid,
         SceneTransitioner,
         createScene,
         destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;
    var contentElement = document.createElement('div');
    var balloonElement = document.createElement('div');
    var container = document.createElement('div');
    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        destroyScene(scene);
    });

    it('constructor sets default values', function() {
        var viewModel = new BalloonViewModel(scene, contentElement, balloonElement);
        expect(viewModel.scene).toBe(scene);
        expect(viewModel.contentElement).toBe(contentElement);
        expect(viewModel.balloonElement).toBe(balloonElement);
    });

    it('constructor sets expected values', function() {
        var viewModel = new BalloonViewModel(scene, contentElement, balloonElement, container);
        expect(viewModel.scene).toBe(scene);
        expect(viewModel.contentElement).toBe(contentElement);
        expect(viewModel.balloonElement).toBe(balloonElement);
        expect(viewModel.container).toBe(container);
    });

    it('throws if scene is undefined', function() {
        expect(function() {
            return new BalloonViewModel(undefined);
        }).toThrow();
    });

    it('throws if contentElement is undefined', function() {
        expect(function() {
            return new BalloonViewModel(scene);
        }).toThrow();
    });

    it('throws if balloonElement is undefined', function() {
        expect(function() {
            return new BalloonViewModel(scene, contentElement);
        }).toThrow();
    });
});