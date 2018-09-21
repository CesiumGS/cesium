defineSuite([
        'Workers/upsampleQuantizedTerrainMesh',
        'Core/createWorldTerrain'
    ], function(
        upsampleQuantizedTerrainMesh,
        createWorldTerrain) {
    'use strict';

    it('time', function() {
        var worldTerrain = createWorldTerrain({
            requestWaterMask: true,
            requestVertexNormals: true
        });

        var total = 100;
        var remaining = total;
        var tiles = [];
        function next() {
            var current = total - remaining;
            --remaining;
            return worldTerrain.requestTileGeometry(1375 + current, 1189, 12).then(function(terrainData) {
                return terrainData.createMesh(worldTerrain.tilingScheme, 1375, 1189, 12, 1.0).then(function(mesh) {
                    tiles[current] = {
                        terrainData: terrainData,
                        mesh: mesh
                    };
                    if (remaining === 0) {
                        return tiles;
                    }
                    return next();
                });
            });
        }

        var promise = worldTerrain.readyPromise.then(function() {
            return next();
        });

        return promise.then(function(tiles) {
            var childRectangle = worldTerrain.tilingScheme.tileXYToRectangle(2750, 2378, 13);
            console.log(tiles.length);
            var start = performance.now();
            for (var i = 0; i < tiles.length; ++i) {
                var tile = tiles[i % tiles.length];
                upsampleQuantizedTerrainMesh._workerFunction({
                    isEastChild: false,
                    isNorthChild: true,
                    vertices: tile.mesh.vertices,
                    indices: tile.mesh.indices,
                    skirtIndex: tile.terrainData._skirtIndex,
                    encoding: tile.mesh.encoding,
                    exaggeration: tile.mesh.exaggeration,
                    vertexCountWithoutSkirts: tile.terrainData._vertexCountWithoutSkirts,
                    minimumHeight: tile.terrainData._minimumHeight,
                    maximumHeight: tile.terrainData._maximumHeight,
                    ellipsoid: worldTerrain.tilingScheme.ellipsoid,
                    childRectangle: childRectangle
                }, []);
            }
            var stop = performance.now();
            console.log(stop - start);
            //alert(stop - start);
        });
    });
});
