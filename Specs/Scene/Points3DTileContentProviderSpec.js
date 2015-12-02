/*global defineSuite*/
defineSuite([
        'Scene/Points3DTileContentProvider',
        'Core/Cartesian3',
        'Core/defaultValue',
        'Core/HeadingPitchRange',
        'Core/OrientedBoundingBox',
        'Scene/Cesium3DTileContentState',
        'Scene/Cesium3DTileset',
        'Specs/createScene',
        'Specs/pollToPromise'
    ], function(
        Points3DTileContentProvider,
        Cartesian3,
        defaultValue,
        HeadingPitchRange,
        OrientedBoundingBox,
        Cesium3DTileContentState,
        Cesium3DTileset,
        createScene,
        pollToPromise) {
    "use strict";

    var scene;
    var centerLongitude = -1.31995;
    var centerLatitude = 0.69871;

    var pointsUrl = './Data/Cesium3DTiles/Points/Points';

    beforeAll(function() {
        // Point tiles use RTC, which for now requires scene3DOnly to be true
        scene = createScene({
            scene3DOnly : true
        });

        scene.frameState.passes.render = true;

        // Point the camera to the center of the tile
        var center = Cartesian3.fromRadians(centerLongitude, centerLatitude, 5.0);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 10.0));
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    afterEach(function() {
        scene.primitives.removeAll();
    });

    function verifyRender(tileset) {
        tileset.show = false;
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        tileset.show = true;
        var pixelColor = scene.renderForSpecs();
        expect(pixelColor).not.toEqual([0, 0, 0, 255]);
        return pixelColor;
    }

    function loadTileset(url) {
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : url
        }));

        return pollToPromise(function() {
            // Render scene to progressively load the content
            scene.renderForSpecs();
            return tileset.ready && (tileset._root.isReady());
        }).then(function() {
            return tileset;
        });
    }

    function loadTileExpectError(arrayBuffer) {
        var tileset = {};
        var tile = {
            orientedBoundingBox : new OrientedBoundingBox()
        };
        var url = '';
        var pointsTile = new Points3DTileContentProvider(tileset, tile, url);
        expect(function() {
            pointsTile.initialize(arrayBuffer);
            pointsTile.update(tileset, scene.frameState);
        }).toThrowDeveloperError();
    }

    function generateTileBuffer(options) {
        // Procedurally generate the tile array buffer for testing purposes
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var magic = defaultValue(options.magic, [112, 110, 116, 115]);
        var version = defaultValue(options.version, 1);

        var headerByteLength = 16;
        var byteLength = headerByteLength;
        var buffer = new ArrayBuffer(byteLength);
        var view = new DataView(buffer);
        view.setUint8(0, magic[0]);
        view.setUint8(1, magic[1]);
        view.setUint8(2, magic[2]);
        view.setUint8(3, magic[3]);
        view.setUint32(4, version, true);          // version
        view.setUint32(8, byteLength, true);       // byteLength
        view.setUint32(12, 0, true);               // pointsLength

        return buffer;
    }

    it('throws with invalid magic', function() {
        loadTileExpectError(generateTileBuffer({
            magic : [120, 120, 120, 120]
        }));
    });

    it('throws with invalid version', function() {
        loadTileExpectError(generateTileBuffer({
            version: 2
        }));
    });

    it('throws with no points', function() {
        // Throws in Buffer due to vertex buffer size of zero
        loadTileExpectError(generateTileBuffer());
    });

    it('resolves readyPromise', function() {
        return loadTileset(pointsUrl).then(function(tileset) {
            var content = tileset._root.content;
            content.readyPromise.then(function(content) {
                verifyRender(tileset);
            });
        });
    });

    it('rejects readyPromise on failed request', function() {
        var tileset = {};
        var tile = {
            orientedBoundingBox : new OrientedBoundingBox()
        };
        var url = 'invalid.pnts';
        var pointsTile = new Points3DTileContentProvider(tileset, tile, url);
        pointsTile.request();

        return pointsTile.readyPromise.then(function(pointsTile) {
            fail('should not resolve');
        }).otherwise(function(error) {
            expect(pointsTile.state).toEqual(Cesium3DTileContentState.FAILED);
            expect(error.statusCode).toEqual(404);
        });
    });

    it('renders points', function() {
        return loadTileset(pointsUrl).then(verifyRender);
    });

    it('renders with debug color', function() {
        return loadTileset(pointsUrl).then(function(tileset) {
            var color = verifyRender(tileset);
            tileset.debugColorizeTiles = true;
            var debugColor = verifyRender(tileset);
            expect(debugColor).not.toEqual(color);
            tileset.debugColorizeTiles = false;
            debugColor = verifyRender(tileset);
            expect(debugColor).toEqual(color);
        });
    });

    it('destroys', function() {
        return loadTileset(pointsUrl).then(function(tileset) {
            var content = tileset._root.content;
            expect(content.isDestroyed()).toEqual(false);
            content.destroy();
            expect(content.isDestroyed()).toEqual(true);
        });
    });
});
