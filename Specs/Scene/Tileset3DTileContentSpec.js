import { Cartesian3 } from '../../Source/Cesium.js';
import { HeadingPitchRange } from '../../Source/Cesium.js';
import Cesium3DTilesTester from '../Cesium3DTilesTester.js';
import createScene from '../createScene.js';

describe('Scene/Tileset3DTileContent', function() {

    var scene;
    var centerLongitude = -1.31968;
    var centerLatitude = 0.698874;

    var tilesetOfTilesetsUrl = './Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/tileset.json';

    beforeAll(function() {
        scene = createScene();

        // Point the camera at the center and far enough way to only load the root tile
        var center = Cartesian3.fromRadians(centerLongitude, centerLatitude);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 100.0));
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    afterEach(function() {
        scene.primitives.removeAll();
    });

    it('resolves readyPromise', function() {
        return Cesium3DTilesTester.resolvesReadyPromise(scene, tilesetOfTilesetsUrl);
    });

    it('destroys', function() {
        return Cesium3DTilesTester.tileDestroys(scene, tilesetOfTilesetsUrl);
    });

    it('gets properties', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetOfTilesetsUrl).then(function(tileset) {
            var tile = tileset.root;
            var content = tile.content;
            expect(content.featuresLength).toBe(0);
            expect(content.pointsLength).toBe(0);
            expect(content.trianglesLength).toBe(0);
            expect(content.geometryByteLength).toBe(0);
            expect(content.texturesByteLength).toBe(0);
            expect(content.batchTableByteLength).toBe(0);
            expect(content.innerContents).toBeUndefined();
            expect(content.readyPromise).toBeDefined();
            expect(content.tileset).toBe(tileset);
            expect(content.tile).toBe(tile);
            expect(content.url).toBeDefined();
            expect(content.batchTable).toBeUndefined();
            expect(content.hasProperty(0, 'name')).toBe(false);
            expect(content.getFeature(0)).toBeUndefined();
        });
    });

}, 'WebGL');
