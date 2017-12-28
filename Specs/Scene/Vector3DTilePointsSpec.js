defineSuite([
        'Scene/Vector3DTilePoints',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/combine',
        'Core/Ellipsoid',
        'Core/Math',
        'Core/Matrix4',
        'Core/Rectangle',
        'Scene/Cesium3DTileBatchTable',
        'Specs/createScene',
        'Specs/pollToPromise'
    ], function(
        Vector3DTilePoints,
        Cartesian3,
        Cartographic,
        combine,
        Ellipsoid,
        CesiumMath,
        Matrix4,
        Rectangle,
        Cesium3DTileBatchTable,
        createScene,
        pollToPromise) {
    'use strict';

    var scene;
    var rectangle;
    var points;

    var ellipsoid = Ellipsoid.WGS84;

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    var mockTileset = {
        _statistics : {
            texturesByteLength : 0
        },
        _tileset : {
            _statistics : {
                batchTableByteLength : 0
            }
        },
        tileset : {
            ellipsoid : Ellipsoid.WGS84
        }
    };

    beforeEach(function() {
        rectangle = Rectangle.fromDegrees(-40.0, -40.0, 40.0, 40.0);
    });

    afterEach(function() {
        scene.primitives.removeAll();
        points = points && !points.isDestroyed() && points.destroy();
    });

    function loadPoints(points) {
        var ready = false;
        points.readyPromise.then(function() {
            ready = true;
        });
        return pollToPromise(function() {
            points.update(scene.frameState);
            scene.frameState.commandList.length = 0;
            return ready;
        });
    }

    function zigZag(value) {
        return ((value << 1) ^ (value >> 15)) & 0xFFFF;
    }

    var maxShort = 32767;

    function encodePositions(rectangle, minimumHeight, maximumHeight, positions) {
        var length = positions.length;
        var buffer = new Uint16Array(length * 3);

        var lastU = 0;
        var lastV = 0;
        var lastH = 0;

        for (var i = 0; i < length; ++i) {
            var position = positions[i];

            var u = (position.longitude - rectangle.west) / rectangle.width;
            var v = (position.latitude - rectangle.south) / rectangle.height;
            var h = (position.height - minimumHeight) / (maximumHeight - minimumHeight);

            u = CesiumMath.clamp(u, 0.0, 1.0);
            v = CesiumMath.clamp(v, 0.0, 1.0);
            h = CesiumMath.clamp(h, 0.0, 1.0);

            u = Math.floor(u * maxShort);
            v = Math.floor(v * maxShort);
            h = Math.floor(h * maxShort);

            buffer[i] = zigZag(u - lastU);
            buffer[i + length] = zigZag(v - lastV);
            buffer[i + length * 2] = zigZag(h - lastH);

            lastU = u;
            lastV = v;
            lastH = h;
        }

        return buffer;
    }

    it('renders a point', function() {
        var minHeight = 0.0;
        var maxHeight = 100.0;
        var cartoPositions = [Cartographic.fromDegrees(0.0, 0.0, 10.0)];
        var positions = encodePositions(rectangle, minHeight, maxHeight, cartoPositions);

        var batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
        batchTable.update(mockTileset, scene.frameState);

        points = scene.primitives.add(new Vector3DTilePoints({
            positions : positions,
            batchTable : batchTable,
            batchIds : new Uint16Array([0]),
            rectangle : rectangle,
            minimumHeight : minHeight,
            maximumHeight : maxHeight
        }));
        return loadPoints(points).then(function() {
            var features = [];
            points.createFeatures(mockTileset, features);
            points.applyStyle(scene.frameState, undefined, features);

            scene.camera.lookAt(Cartesian3.fromDegrees(0.0, 0.0, 10.0), new Cartesian3(0.0, 0.0, 50.0));
            expect(scene).toRender([255, 255, 255, 255]);
        });
    });

    it('renders multiple points', function() {
        var minHeight = 0.0;
        var maxHeight = 100.0;
        var cartoPositions = [
            Cartographic.fromDegrees(0.0, 0.0, 10.0),
            Cartographic.fromDegrees(5.0, 0.0, 20.0),
            Cartographic.fromDegrees(-5.0, 0.0, 1.0),
            Cartographic.fromDegrees(0.0, 6.0, 5.0),
            Cartographic.fromDegrees(0.0, -6.0, 90.0)
        ];
        var positions = encodePositions(rectangle, minHeight, maxHeight, cartoPositions);

        var batchTable = new Cesium3DTileBatchTable(mockTileset, 5);
        batchTable.update(mockTileset, scene.frameState);

        points = scene.primitives.add(new Vector3DTilePoints({
            positions : positions,
            batchTable : batchTable,
            batchIds : new Uint16Array([0, 1, 2, 3, 4]),
            rectangle : rectangle,
            minimumHeight : minHeight,
            maximumHeight : maxHeight
        }));
        return loadPoints(points).then(function() {
            var features = [];
            points.createFeatures(mockTileset, features);
            points.applyStyle(scene.frameState, undefined, features);

            for (var i = 0; i < cartoPositions.length; ++i) {
                var position = ellipsoid.cartographicToCartesian(cartoPositions[i]);
                scene.camera.lookAt(position, new Cartesian3(0.0, 0.0, 50.0));
                expect(scene).toRenderAndCall(function (rgba) {
                    expect(rgba[0]).toBeGreaterThan(0);
                    expect(rgba[0]).toEqual(rgba[1]);
                    expect(rgba[0]).toEqual(rgba[2]);
                    expect(rgba[3]).toEqual(255);
                });
            }
        });
    });

    it('picks a point', function() {
        var minHeight = 0.0;
        var maxHeight = 100.0;
        var cartoPositions = [Cartographic.fromDegrees(0.0, 0.0, 10.0)];
        var positions = encodePositions(rectangle, minHeight, maxHeight, cartoPositions);

        var batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
        batchTable.update(mockTileset, scene.frameState);

        points = scene.primitives.add(new Vector3DTilePoints({
            positions : positions,
            batchTable : batchTable,
            batchIds : new Uint16Array([0]),
            rectangle : rectangle,
            minimumHeight : minHeight,
            maximumHeight : maxHeight
        }));
        return loadPoints(points).then(function() {
            scene.camera.lookAt(Cartesian3.fromDegrees(0.0, 0.0, 10.0), new Cartesian3(0.0, 0.0, 50.0));

            var features = [];
            points.createFeatures(mockTileset, features);
            points.applyStyle(scene.frameState, undefined, features);
            mockTileset.getFeature = function(index) {
                return features[index];
            };

            scene.frameState.passes.pick = true;
            batchTable.update(mockTileset, scene.frameState);
            expect(scene).toPickAndCall(function (result) {
                expect(result).toBe(features[0]);
            });

            mockTileset.getFeature = undefined;
        });
    });

    it('isDestroyed', function() {
        points = new Vector3DTilePoints({});
        expect(points.isDestroyed()).toEqual(false);
        points.destroy();
        expect(points.isDestroyed()).toEqual(true);
    });
});
