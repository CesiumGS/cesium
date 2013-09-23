/*global defineSuite*/
defineSuite([
         'Widgets/Balloon/Balloon',
         'Core/Ellipsoid',
         'Scene/SceneTransitioner',
         'Specs/createScene',
         'Specs/destroyScene'
     ], function(
         Balloon,
         Ellipsoid,
         SceneTransitioner,
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

    it('constructor sets expected values', function() {
        var balloon = new Balloon(document.body, scene);
        expect(balloon.container).toBe(document.body);
        expect(balloon.viewModel.scene).toBe(scene);
        expect(balloon.isDestroyed()).toEqual(false);
        balloon.destroy();
        expect(balloon.isDestroyed()).toEqual(true);
    });

    it('constructor works with string id container', function() {
        var testElement = document.createElement('span');
        testElement.id = 'testElement';
        document.body.appendChild(testElement);
        var balloon = new Balloon('testElement', scene);
        expect(balloon.container).toBe(testElement);
        document.body.removeChild(testElement);
        balloon.destroy();
    });

    it('throws if container is undefined', function() {
        expect(function() {
            return new Balloon(undefined, scene);
        }).toThrow();
    });

    it('throws if container string is undefined', function() {
        expect(function() {
            return new Balloon('testElement', scene);
        }).toThrow();
    });
});