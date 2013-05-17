/*global defineSuite*/
defineSuite([
         'Scene/SceneTransforms',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Specs/createScene',
         'Specs/destroyScene'
     ], function(
         SceneTransforms,
         Cartographic,
         Ellipsoid,
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
    it('throws an exception without scene', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var position = ellipsoid.cartographicToCartesian(new Cartographic(0.0, 0.0));
        expect(function() {
            SceneTransforms.wgs84ToWindowCoordinates(undefined, position);
        }).toThrow();
    });

    it('throws an exception without position', function() {
        expect(function() {
            SceneTransforms.wgs84ToWindowCoordinates(scene);
        }).toThrow();
    });

    it('returns correct position', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var position = ellipsoid.cartographicToCartesian(new Cartographic(0.0, 0.0));
        var windowCoordinates = SceneTransforms.wgs84ToWindowCoordinates(scene, position);
        expect(windowCoordinates.x).toBeGreaterThan(0);
        expect(windowCoordinates.y).toBeGreaterThan(0);
    });

}, 'WebGL');
