/*global defineSuite*/
defineSuite([
        'Scene/SceneTransforms',
        'Core/Cartographic',
        'Core/Ellipsoid',
        'Core/Math',
        'Specs/createScene',
        'Specs/destroyScene'
    ], function(
        SceneTransforms,
        Cartographic,
        Ellipsoid,
        CesiumMath,
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
        }).toThrowDeveloperError();
    });

    it('throws an exception without position', function() {
        expect(function() {
            SceneTransforms.wgs84ToWindowCoordinates(scene);
        }).toThrowDeveloperError();
    });

    it('returns correct window position', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var positionCartographic = ellipsoid.cartesianToCartographic(scene.camera.position);
        positionCartographic.height = 0.0;
        var position = ellipsoid.cartographicToCartesian(positionCartographic);

        // Update scene state
        scene.initializeFrame();

        var windowCoordinates = SceneTransforms.wgs84ToWindowCoordinates(scene, position);
        expect(windowCoordinates.x).toEqualEpsilon(0.5, CesiumMath.EPSILON3);
        expect(windowCoordinates.y).toEqualEpsilon(0.5, CesiumMath.EPSILON3);
    });

    it('returns correct drawing buffer position', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var positionCartographic = ellipsoid.cartesianToCartographic(scene.camera.position);
        positionCartographic.height = 0.0;
        var position = ellipsoid.cartographicToCartesian(positionCartographic);

        // Update scene state
        scene.initializeFrame();
        scene.render();

        var drawingBufferCoordinates = SceneTransforms.wgs84ToDrawingBufferCoordinates(scene, position);
        expect(drawingBufferCoordinates.x).toEqualEpsilon(0.5, CesiumMath.EPSILON3);
        expect(drawingBufferCoordinates.y).toEqualEpsilon(0.5, CesiumMath.EPSILON3);
    });

}, 'WebGL');
