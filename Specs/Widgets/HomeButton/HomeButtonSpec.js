/*global defineSuite*/
defineSuite([
        'Widgets/HomeButton/HomeButton',
        'Specs/createScene',
        'Specs/destroyScene'
    ], function(
        HomeButton,
        createScene,
        destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;
    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        destroyScene(scene);
    });

    it('constructor sets default values', function() {
        var homeButton = new HomeButton(document.body, scene);
        expect(homeButton.container).toBe(document.body);
        expect(homeButton.viewModel.scene).toBe(scene);
        expect(homeButton.isDestroyed()).toEqual(false);
        homeButton.destroy();
        expect(homeButton.isDestroyed()).toEqual(true);
    });

    it('constructor sets expected values', function() {
        var homeButton = new HomeButton(document.body, scene);
        expect(homeButton.container).toBe(document.body);
        expect(homeButton.viewModel.scene).toBe(scene);
        homeButton.destroy();
    });

    it('constructor works with string id container', function() {
        var testElement = document.createElement('span');
        testElement.id = 'testElement';
        document.body.appendChild(testElement);
        var homeButton = new HomeButton('testElement', scene);
        expect(homeButton.container).toBe(testElement);
        document.body.removeChild(testElement);
        homeButton.destroy();
    });

    it('throws if container is undefined', function() {
        expect(function() {
            return new HomeButton(undefined, scene);
        }).toThrowDeveloperError();
    });

    it('throws if container string is undefined', function() {
        expect(function() {
            return new HomeButton('testElement', scene);
        }).toThrowDeveloperError();
    });
}, 'WebGL');
