/*global defineSuite*/
defineSuite([
         'Scene/Scene',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Ellipsoid',
         'Core/EquidistantCylindricalProjection',
         'Core/Math',
         'Scene/OrthographicFrustum',
         'Scene/SceneMode',
         'Specs/createScene',
         'Specs/destroyScene'
     ], function(
         Scene,
         Cartesian2,
         Cartesian3,
         Ellipsoid,
         EquidistantCylindricalProjection,
         CesiumMath,
         OrthographicFrustum,
         SceneMode,
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

    it('get canvas', function() {
        expect(scene.getCanvas()).toBeDefined();
    });

    it('get context', function() {
        expect(scene.getContext()).toBeDefined();
    });

    it('get primitives', function() {
        expect(scene.getPrimitives()).toBeDefined();
    });

    it('get camera', function() {
        expect(scene.getCamera()).toBeDefined();
    });

    it('get uniform state', function() {
        expect(scene.getUniformState()).toBeDefined();
    });

    it('get animations', function() {
        expect(scene.getAnimations()).toBeDefined();
    });

    it('get and set sun position', function() {
        var position = Cartesian3.UNIT_X;
        scene.setSunPosition(position);
        expect(scene.getSunPosition()).toEqual(position);
    });

    it('isDestroyed', function() {
        var s = createScene();
        expect(s.isDestroyed()).toEqual(false);
        destroyScene(s);
        expect(s.isDestroyed()).toEqual(true);
    });
});