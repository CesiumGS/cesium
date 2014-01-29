/*global defineSuite*/
defineSuite([
         'Widgets/InfoBox/InfoBox',
         'Core/Ellipsoid',
         'Scene/SceneTransitioner',
         'Specs/createScene',
         'Specs/destroyScene'
     ], function(
         InfoBox,
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
        var infoBox = new InfoBox(document.body, scene);
        expect(infoBox.container).toBe(document.body);
        expect(infoBox.viewModel.scene).toBe(scene);
        expect(infoBox.isDestroyed()).toEqual(false);
        infoBox.destroy();
        expect(infoBox.isDestroyed()).toEqual(true);
    });

    it('constructor works with string id container', function() {
        var testElement = document.createElement('span');
        testElement.id = 'testElement';
        document.body.appendChild(testElement);
        var infoBox = new InfoBox('testElement', scene);
        expect(infoBox.container).toBe(testElement);
        document.body.removeChild(testElement);
        infoBox.destroy();
    });

    it('throws if container is undefined', function() {
        expect(function() {
            return new InfoBox(undefined, scene);
        }).toThrow();
    });

    it('throws if container string is undefined', function() {
        expect(function() {
            return new InfoBox('testElement', scene);
        }).toThrow();
    });
});