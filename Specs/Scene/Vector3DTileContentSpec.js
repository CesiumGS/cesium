/*global defineSuite*/
defineSuite([
    'Scene/Vector3DTileContent',
    'Core/Cartesian3',
    'Core/Color',
    'Core/ColorGeometryInstanceAttribute',
    'Core/ComponentDatatype',
    'Core/defined',
    'Core/destroyObject',
    'Core/GeometryInstance',
    'Core/HeadingPitchRange',
    'Core/Rectangle',
    'Core/RectangleGeometry',
    'Scene/Cesium3DTileStyle',
    'Scene/Pass',
    'Scene/PerInstanceColorAppearance',
    'Scene/Primitive',
    'Specs/Cesium3DTilesTester',
    'Specs/createScene'
], function(
    Vector3DTileContent,
    Cartesian3,
    Color,
    ColorGeometryInstanceAttribute,
    ComponentDatatype,
    defined,
    destroyObject,
    GeometryInstance,
    HeadingPitchRange,
    Rectangle,
    RectangleGeometry,
    Cesium3DTileStyle,
    Pass,
    PerInstanceColorAppearance,
    Primitive,
    Cesium3DTilesTester,
    createScene) {
    'use strict';

    //(6378137.0 * 2.0 * Math.PI * 0.25 / (65.0 * 2.0)) / (1 << 4);

    var vectorPolygonUrl = './Data/Cesium3DTiles/Vector/VectorPolygon';
    var vectorPolygonQuantizedUrl = './Data/Cesium3DTiles/Vector/VectorPolygonQuantized';

    function MockGlobePrimitive(primitive) {
        this._primitive = primitive;
    }
    MockGlobePrimitive.prototype.update = function(frameState) {
        var commandList = frameState.commandList;
        var startLength = commandList.length;
        this._primitive.update(frameState);

        for (var i = startLength; i < commandList.length; ++i) {
            var command = commandList[i];
            command.pass = Pass.GLOBE;
        }
    };

    MockGlobePrimitive.prototype.isDestroyed = function() {
        return false;
    };

    MockGlobePrimitive.prototype.destroy = function() {
        this._primitive.destroy();
        return destroyObject(this);
    };

    var scene;
    var depthColor;
    var depthPrimitive;

    beforeAll(function() {
        // TODO: remove RTC
        // vector tiles use RTC, which for now requires scene3DOnly to be true
        scene = createScene({
            scene3DOnly : true
        });

        scene.frameState.passes.render = true;
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        var depthColorAttribute = ColorGeometryInstanceAttribute.fromColor(new Color(0.0, 0.0, 1.0, 1.0));
        depthColor = depthColorAttribute.value;
        var primitive = new Primitive({
            geometryInstances : new GeometryInstance({
                geometry : new RectangleGeometry({
                    rectangle : Rectangle.fromDegrees(-77.0, 39.0, -76.0, 40.0)
                }),
                id : 'depth rectangle',
                attributes : {
                    color : depthColorAttribute
                }
            }),
            appearance : new PerInstanceColorAppearance({
                translucent : false,
                flat : true
            }),
            asynchronous : false
        });

        // wrap rectangle primitive so it gets executed during the globe pass to lay down depth
        depthPrimitive = scene.groundPrimitives.add(new MockGlobePrimitive(primitive));

        var center = Cartesian3.fromDegrees(-76.5, 39.5);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 3500.0));
    });

    afterEach(function() {
        scene.groundPrimitives.removeAll();
        scene.primitives.removeAll();
        depthPrimitive = depthPrimitive && !depthPrimitive.isDestroyed() && depthPrimitive.destroy();
    });

    function expectRenderVectorContent(tileset) {
        tileset.show = false;
        expect(scene.renderForSpecs()).toEqual(depthColor);
        tileset.show = true;
        var pixelColor = scene.renderForSpecs();
        expect(pixelColor).not.toEqual(depthColor);
        return pixelColor;
    }

    it('resolves readyPromise', function() {
        return Cesium3DTilesTester.resolvesReadyPromise(scene, vectorPolygonQuantizedUrl);
    });

    it('rejects readyPromise on failed request', function() {
        return Cesium3DTilesTester.rejectsReadyPromiseOnFailedRequest('vctr');
    });

    it('renders quantized polygon', function() {
        return Cesium3DTilesTester.loadTileset(scene, vectorPolygonQuantizedUrl).then(expectRenderVectorContent);
    });

}, 'WebGL');