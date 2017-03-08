/*global defineSuite*/
defineSuite([
        'Scene/Cesium3DTileset',
        'Core/Cartesian3',
        'Core/Color',
        'Core/defined',
        'Core/HeadingPitchRange',
        'Core/loadWithXhr',
        'Core/Matrix4',
        'Core/PrimitiveType',
        'Core/RequestScheduler',
        'Renderer/ContextLimits',
        'Scene/Cesium3DTile',
        'Scene/Cesium3DTileColorBlendMode',
        'Scene/Cesium3DTileContentState',
        'Scene/Cesium3DTileOptimizations',
        'Scene/Cesium3DTileRefine',
        'Scene/Cesium3DTileStyle',
        'Scene/CullingVolume',
        'Specs/Cesium3DTilesTester',
        'Specs/createScene',
        'Specs/pollToPromise',
        'ThirdParty/when'
    ], function(
        Cesium3DTileset,
        Cartesian3,
        Color,
        defined,
        HeadingPitchRange,
        loadWithXhr,
        Matrix4,
        PrimitiveType,
        RequestScheduler,
        ContextLimits,
        Cesium3DTile,
        Cesium3DTileColorBlendMode,
        Cesium3DTileContentState,
        Cesium3DTileOptimizations,
        Cesium3DTileRefine,
        Cesium3DTileStyle,
        CullingVolume,
        Cesium3DTilesTester,
        createScene,
        pollToPromise,
        when) {
    'use strict';

    var scene;
    var centerLongitude = -1.31968;
    var centerLatitude = 0.698874;

    // Parent tile with content and four child tiles with content
    var tilesetUrl = './Data/Cesium3DTiles/Tilesets/Tileset/';

    // One child points to an invalid url
    var tilesetInvalidUrl = './Data/Cesium3DTiles/Tilesets/TilesetInvalid/';

    // Parent tile with no content and four child tiles with content
    var tilesetEmptyRootUrl = './Data/Cesium3DTiles/Tilesets/TilesetEmptyRoot/';

    var tilesetReplacement1Url = './Data/Cesium3DTiles/Tilesets/TilesetReplacement1/';
    var tilesetReplacement2Url = './Data/Cesium3DTiles/Tilesets/TilesetReplacement2/';
    var tilesetReplacement3Url = './Data/Cesium3DTiles/Tilesets/TilesetReplacement3/';

    // 3 level tree with mix of additive and replacement refinement
    var tilesetRefinementMix = './Data/Cesium3DTiles/Tilesets/TilesetRefinementMix/';

    // tileset.json : root content points to tiles2.json
    // tiles2.json: root with b3dm content, three children with b3dm content, one child points to tiles3.json
    // tiles3.json: root with b3dm content
    var tilesetOfTilesetsUrl = './Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/';

    var withoutBatchTableUrl = './Data/Cesium3DTiles/Batched/BatchedWithoutBatchTable/';
    var withBatchTableUrl = './Data/Cesium3DTiles/Batched/BatchedWithBatchTable/';
    var noBatchIdsUrl = './Data/Cesium3DTiles/Batched/BatchedNoBatchIds/';

    var withTransformBoxUrl = './Data/Cesium3DTiles/Batched/BatchedWithTransformBox/';
    var withTransformSphereUrl = './Data/Cesium3DTiles/Batched/BatchedWithTransformSphere/';
    var withTransformRegionUrl = './Data/Cesium3DTiles/Batched/BatchedWithTransformRegion/';
    var withBoundingSphereUrl = './Data/Cesium3DTiles/Batched/BatchedWithBoundingSphere/';

    var compositeUrl = './Data/Cesium3DTiles/Composite/Composite/';
    var instancedRedMaterialUrl = './Data/Cesium3DTiles/Instanced/InstancedRedMaterial';

    // 1 tile where each feature is a different source color
    var colorsUrl = './Data/Cesium3DTiles/Batched/BatchedColors/';

    // 1 tile where each feature has a reddish texture
    var texturedUrl = './Data/Cesium3DTiles/Batched/BatchedTextured/';

    // 1 tile with translucent features
    var translucentUrl = './Data/Cesium3DTiles/Batched/BatchedTranslucent/';

    // 1 tile with opaque and translucent features
    var translucentOpaqueMixUrl = './Data/Cesium3DTiles/Batched/BatchedTranslucentOpaqueMix/';

    // Root tile is transformed from local space to wgs84, child tile is rotated, scales, and translated locally
    var tilesetWithTransformsUrl = './Data/Cesium3DTiles/Tilesets/TilesetWithTransforms';

    // Root tile with 4 b3dm children and 1 pnts child with a viewer request volume
    var tilesetWithViewerRequestVolumeUrl = './Data/Cesium3DTiles/Tilesets/TilesetWithViewerRequestVolume';

    // Parent tile with content and four child tiles with content with viewer request volume for each child
    var tilesetReplacementWithViewerRequestVolumeUrl = './Data/Cesium3DTiles/Tilesets/TilesetReplacementWithViewerRequestVolume';

    var tilesetWithExternalResources = './Data/Cesium3DTiles/Tilesets/TilesetWithExternalResources';

    var styleUrl = './Data/Cesium3DTiles/Style/style.json';

    var pointCloudUrl = './Data/Cesium3DTiles/PointCloud/PointCloudRGB';
    var pointCloudBatchedUrl = './Data/Cesium3DTiles/PointCloud/PointCloudBatched';

    var originalMaximumRequests;

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        scene.morphTo3D(0.0);
        originalMaximumRequests = RequestScheduler.maximumRequests;
        viewAllTiles();
    });

    afterEach(function() {
        RequestScheduler.maximumRequests = originalMaximumRequests;
        scene.primitives.removeAll();

        // Wait for any pending requests to complete before ending each test
        return pollToPromise(function() {
            return RequestScheduler.getNumberOfAvailableRequests() === RequestScheduler.maximumRequests;
        });
    });

    function setZoom(distance) {
        // Bird's eye view
        var center = Cartesian3.fromRadians(centerLongitude, centerLatitude);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, distance));
    }

    function viewAllTiles() {
        setZoom(20.0);
    }

    function viewRootOnly() {
        setZoom(100.0);
    }

    function viewNothing() {
        setZoom(200.0);
    }

    it('throws with undefined url', function() {
        expect(function() {
            return new Cesium3DTileset();
        }).toThrowDeveloperError();
    });

    it('rejects readyPromise with invalid tileset.json', function() {
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : 'invalid'
        }));
        scene.renderForSpecs();
        return tileset.readyPromise.then(function() {
            fail('should not resolve');
        }).otherwise(function(error) {
            expect(tileset.ready).toEqual(false);
            expect(error.statusCode).toEqual(404);
        });
    });

    it('rejects readyPromise with invalid tileset version', function() {
        var tilesetJson = {
            "asset" : {
                "version" : "2.0"
            }
        };

        var uri = 'data:text/plain;base64,' + btoa(JSON.stringify(tilesetJson));

        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : uri
        }));
        return tileset.readyPromise.then(function() {
            fail('should not resolve');
        }).otherwise(function(error) {
            expect(tileset.ready).toEqual(false);
        });
    });

    it('url and tilesetUrl set up correctly given tileset.json path', function() {
        var path = './Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/tileset.json';
        var tileset = new Cesium3DTileset({
            url : path
        });
        expect(tileset.url).toEqual(path);
        expect(tileset._tilesetUrl).toEqual(path);
    });

    it('url and tilesetUrl set up correctly given directory without trailing slash', function() {
        var path = './Data/Cesium3DTiles/Tilesets/TilesetOfTilesets';
        var tileset = new Cesium3DTileset({
            url : path
        });
        expect(tileset.url).toEqual(path);
        expect(tileset._tilesetUrl).toEqual(path + '/tileset.json');
    });

    it('url and tilesetUrl set up correctly given directory with trailing slash', function() {
        var path = './Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/';
        var tileset = new Cesium3DTileset({
            url : path
        });
        expect(tileset.url).toEqual(path);
        expect(tileset._tilesetUrl).toEqual(path + 'tileset.json');
    });

    it('url and tilesetUrl set up correctly given path with query string', function() {
        var path = './Data/Cesium3DTiles/Tilesets/TilesetOfTilesets';
        var param = '?param1=1&param2=2';
        var tileset = new Cesium3DTileset({
            url : path + param
        });
        expect(tileset.url).toEqual(path + param);
        expect(tileset._tilesetUrl).toEqual(path + '/tileset.json' + param);
    });

    it('resolves readyPromise', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            return tileset.readyPromise.then(function(tileset) {
                expect(tileset.ready).toEqual(true);
            });
        });
    });

    it('loads tileset.json', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            var asset = tileset.asset;
            expect(asset).toBeDefined();
            expect(asset.version).toEqual('0.0');
            expect(asset.tilesetVersion).toEqual('1.2.3');

            var properties = tileset.properties;
            expect(properties).toBeDefined();
            expect(properties.id).toBeDefined();
            expect(properties.id.minimum).toEqual(0);
            expect(properties.id.maximum).toEqual(9);

            expect(tileset._geometricError).toEqual(240.0);
            expect(tileset._root).toBeDefined();
            expect(tileset._root.descendantsWithContent).toBeUndefined();
            expect(tileset.url).toEqual(tilesetUrl);
        });
    });

    it('passes version in query string to tiles', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            expect(tileset._root.content._url).toEqual(tilesetUrl + 'parent.b3dm?v=1.2.3');
        });
    });

    it('passes version in query string to all external resources', function() {
        //Spy on loadWithXhr so we can verify requested urls
        spyOn(loadWithXhr, 'load').and.callThrough();

        var queryParams = '?a=1&b=boy';
        var queryParamsWithVersion = '?a=1&b=boy&v=1.2.3';
        return Cesium3DTilesTester.loadTileset(scene, tilesetWithExternalResources + queryParams).then(function(tileset) {
            var calls = loadWithXhr.load.calls.all();
            var callsLength = calls.length;
            for (var i = 0; i < callsLength; ++i) {
                var url = calls[0].args[0];
                if (url.indexOf(tilesetWithExternalResources) >= 0) {
                    var query = url.slice(url.indexOf('?'));
                    if (url.indexOf('tileset.json') >= 0) {
                        // The initial tileset.json does not have a tileset version parameter
                        expect(query).toBe(queryParams);
                    } else {
                        expect(query).toBe(queryParamsWithVersion);
                    }
                }
            }
        });
    });

    it('throws when getting asset and tileset is not ready', function() {
        var tileset = new Cesium3DTileset({
            url : tilesetUrl
        });
        expect(function() {
            return tileset.asset;
        }).toThrowDeveloperError();
    });

    it('throws when getting properties and tileset is not ready', function() {
        var tileset = new Cesium3DTileset({
            url : tilesetUrl
        });
        expect(function() {
            return tileset.properties;
        }).toThrowDeveloperError();
    });

    it('handles failed tile requests', function() {
        viewRootOnly();
        return Cesium3DTilesTester.loadTileset(scene, tilesetInvalidUrl).then(function(tileset) {
            viewAllTiles();
            scene.renderForSpecs();
            var stats = tileset._statistics;
            expect(stats.numberOfPendingRequests).toEqual(4);
            expect(stats.numberProcessing).toEqual(0);

            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                expect(stats.numberOfPendingRequests).toEqual(0);
                expect(stats.numberProcessing).toEqual(0);

                // Check that one tile has failed
                var children = tileset._root.children;
                var length = children.length;
                var failedTiles = 0;
                for (var i = 0; i < length; ++i) {
                    if (children[i].content.state === Cesium3DTileContentState.FAILED) {
                        ++failedTiles;
                    }
                }
                expect(failedTiles).toEqual(1);
            });
       });
    });

    it('renders tileset', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            scene.renderForSpecs();
            var stats = tileset._statistics;
            expect(stats.visited).toEqual(5);
            expect(stats.numberOfCommands).toEqual(5);
        });
    });

    it('renders tileset in CV', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            scene.morphToColumbusView(0.0);
            scene.renderForSpecs();
            var stats = tileset._statistics;
            expect(stats.visited).toEqual(5);
            expect(stats.numberOfCommands).toEqual(5);
        });
    });

    it('renders tileset in 2D', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            scene.morphTo2D(0.0);
            tileset.maximumScreenSpaceError = 3;
            scene.renderForSpecs();
            var stats = tileset._statistics;
            expect(stats.visited).toEqual(5);
            expect(stats.numberOfCommands).toEqual(10);
        });
    });

    it('renders tileset with empty root tile', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetEmptyRootUrl).then(function(tileset) {
            scene.renderForSpecs();
            var stats = tileset._statistics;
            expect(stats.visited).toEqual(5);
            expect(stats.numberOfCommands).toEqual(4); // Empty tile doesn't issue a command
        });
    });

    it('verify statistics', function() {
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : tilesetUrl
        }));

        // Verify initial values
        var stats = tileset._statistics;
        expect(stats.visited).toEqual(0);
        expect(stats.numberOfCommands).toEqual(0);
        expect(stats.numberOfPendingRequests).toEqual(0);
        expect(stats.numberProcessing).toEqual(0);

        return Cesium3DTilesTester.waitForReady(scene, tileset).then(function() {
            // Check that root tile is requested
            expect(stats.visited).toEqual(0);
            expect(stats.numberOfCommands).toEqual(0);
            expect(stats.numberOfPendingRequests).toEqual(1);
            expect(stats.numberProcessing).toEqual(0);

            // Update and check that child tiles are now requested
            scene.renderForSpecs();
            expect(stats.visited).toEqual(1); // Root is visited
            expect(stats.numberOfCommands).toEqual(0);
            expect(stats.numberOfPendingRequests).toEqual(5);
            expect(stats.numberProcessing).toEqual(0);

            // Wait for all tiles to load and check that they are all visited and rendered
            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                scene.renderForSpecs();
                expect(stats.visited).toEqual(5);
                expect(stats.numberOfCommands).toEqual(5);
                expect(stats.numberOfPendingRequests).toEqual(0);
                expect(stats.numberProcessing).toEqual(0);
            });
        });
    });

    function checkPointAndFeatureCounts(tileset, features, points) {
        var stats = tileset._statistics;

        expect(stats.numberOfFeaturesSelected).toEqual(0);
        expect(stats.numberOfFeaturesLoaded).toEqual(0);
        expect(stats.numberOfPointsSelected).toEqual(0);
        expect(stats.numberOfPointsLoaded).toEqual(0);

        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
            scene.renderForSpecs();
            expect(stats.numberOfFeaturesSelected).toEqual(features);
            expect(stats.numberOfFeaturesLoaded).toEqual(features);
            expect(stats.numberOfPointsSelected).toEqual(points);
            expect(stats.numberOfPointsLoaded).toEqual(points);

            viewNothing();
            scene.renderForSpecs();

            expect(stats.numberOfFeaturesSelected).toEqual(0);
            expect(stats.numberOfFeaturesLoaded).toEqual(features);
            expect(stats.numberOfPointsSelected).toEqual(0);
            expect(stats.numberOfPointsLoaded).toEqual(points);

            tileset.trimLoadedTiles();

            scene.renderForSpecs();

            expect(stats.numberOfFeaturesSelected).toEqual(0);
            expect(stats.numberOfFeaturesLoaded).toEqual(0);
            expect(stats.numberOfPointsSelected).toEqual(0);
            expect(stats.numberOfPointsLoaded).toEqual(0);
        });
    }

    it('verify batched features statistics', function() {
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : withBatchTableUrl
        }));

        return checkPointAndFeatureCounts(tileset, 10, 0);
    });

    it('verify no batch table features statistics', function() {
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : noBatchIdsUrl
        }));

        return checkPointAndFeatureCounts(tileset, 0, 0);
    });

    it('verify instanced features statistics', function() {
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : instancedRedMaterialUrl
        }));

        return checkPointAndFeatureCounts(tileset, 25, 0);
    });

    it('verify composite features statistics', function() {
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : compositeUrl
        }));

        return checkPointAndFeatureCounts(tileset, 35, 0);
    });

    it('verify tileset of tilesets features statistics', function() {
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : tilesetOfTilesetsUrl
        }));

        return checkPointAndFeatureCounts(tileset, 50, 0);
    });

    it('verify points statistics', function() {
        scene.camera.lookAt(Cartesian3.fromRadians(-1.31968, 0.698874, 5.0), new HeadingPitchRange(0.0, -1.57, 5.0));

        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : pointCloudUrl
        }));

        return checkPointAndFeatureCounts(tileset, 0, 1000);
    });

    it('verify batched points statistics', function() {
        scene.camera.lookAt(Cartesian3.fromRadians(-1.31968, 0.698874, 5.0), new HeadingPitchRange(0.0, -1.57, 5.0));

        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : pointCloudBatchedUrl
        }));

        return checkPointAndFeatureCounts(tileset, 8, 1000);
    });

    it('does not process tileset when screen space error is not met', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            scene.renderForSpecs();
            var stats = tileset._statistics;
            expect(stats.visited).toEqual(5);
            expect(stats.numberOfCommands).toEqual(5);

            // Set zoom far enough away to not meet sse
            viewNothing();
            scene.renderForSpecs();
            expect(stats.visited).toEqual(0);
            expect(stats.numberOfCommands).toEqual(0);
        });
    });

    it('does not select tiles when outside of view frustum', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            scene.renderForSpecs();
            var stats = tileset._statistics;
            expect(stats.visited).toEqual(5);
            expect(stats.numberOfCommands).toEqual(5);

            // Orient camera to face the sky
            var center = Cartesian3.fromRadians(centerLongitude, centerLatitude, 100);
            scene.camera.lookAt(center, new HeadingPitchRange(0.0, 1.57, 10.0));

            scene.renderForSpecs();
            expect(stats.visited).toEqual(0);
            expect(stats.numberOfCommands).toEqual(0);
            expect(tileset._root.visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).toEqual(CullingVolume.MASK_OUTSIDE);
        });
    });

    it('culls with content box', function() {
        // Root tile has a content box that is half the extents of its box
        // Expect to cull root tile and three child tiles
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            scene.renderForSpecs();
            var stats = tileset._statistics;
            expect(stats.visited).toEqual(5);
            expect(stats.numberOfCommands).toEqual(5);

            // Look at bottom-left corner of tileset
            scene.camera.moveLeft(200.0);
            scene.camera.moveDown(200.0);
            scene.renderForSpecs();
            expect(stats.visited).toEqual(2); // Visits root, but does not render it
            expect(stats.numberOfCommands).toEqual(1);
            expect(tileset._selectedTiles[0]).not.toBe(tileset._root);

            // Set contents box to undefined, and now root won't be culled
            tileset._root._contentBoundingVolume = undefined;
            scene.renderForSpecs();
            expect(stats.visited).toEqual(2);
            expect(stats.numberOfCommands).toEqual(2);
        });
    });

    function findTileByUrl(tiles, url) {
        var length = tiles.length;
        for (var i = 0; i < length; ++i) {
            if (tiles[i].content._url.indexOf(url) >= 0) {
                return tiles[i];
            }
        }
        return undefined;
    }

    it('selects children in front to back order', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            // After moving the camera left by 1.0 and down by 0.5, the distance from the camera should be in the order:
            // 1. lower left
            // 2. upper left
            // 3. lower right
            // 4. upper right

            scene.camera.moveLeft(1.0);
            scene.camera.moveDown(0.5);
            scene.renderForSpecs();

            var root = tileset._root;
            var llTile = findTileByUrl(root.children, 'll.b3dm');
            var lrTile = findTileByUrl(root.children, 'lr.b3dm');
            var urTile = findTileByUrl(root.children, 'ur.b3dm');
            var ulTile = findTileByUrl(root.children, 'ul.b3dm');

            var selectedTiles = tileset._selectedTiles;
            expect(selectedTiles[0]).toBe(root);
            expect(selectedTiles[1]).toBe(llTile);
            expect(selectedTiles[2]).toBe(ulTile);
            expect(selectedTiles[3]).toBe(lrTile);
            expect(selectedTiles[4]).toBe(urTile);
        });
    });

    function testDynamicScreenSpaceError(url, distance) {
        return Cesium3DTilesTester.loadTileset(scene, url).then(function(tileset) {
            scene.renderForSpecs();
            var stats = tileset._statistics;

            // Horizon view, only root is visible
            var center = Cartesian3.fromRadians(centerLongitude, centerLatitude);
            scene.camera.lookAt(center, new HeadingPitchRange(0.0, 0.0, distance));

            // Set dynamic SSE to false (default)
            tileset.dynamicScreenSpaceError = false;
            scene.renderForSpecs();
            expect(stats.visited).toEqual(1);
            expect(stats.numberOfCommands).toEqual(1);

            // Set dynamic SSE to true, now the root is not rendered
            tileset.dynamicScreenSpaceError = true;
            tileset.dynamicScreenSpaceErrorDensity = 1.0;
            tileset.dynamicScreenSpaceErrorFactor = 10.0;
            scene.renderForSpecs();
            expect(stats.visited).toEqual(0);
            expect(stats.numberOfCommands).toEqual(0);
        });
    }

    // Adjust distances for each test because the dynamic SSE takes the
    // bounding volume height into account, which differs for each bounding volume.
    it('uses dynamic screen space error for tileset with region', function() {
        return testDynamicScreenSpaceError(withTransformRegionUrl, 103.0);
    });

    it('uses dynamic screen space error for tileset with bounding sphere', function() {
        return testDynamicScreenSpaceError(withBoundingSphereUrl, 137.0);
    });

    it('uses dynamic screen space error for local tileset with box', function() {
        return testDynamicScreenSpaceError(withTransformBoxUrl, 103.0);
    });

    it('uses dynamic screen space error for local tileset with sphere', function() {
        return testDynamicScreenSpaceError(withTransformSphereUrl, 144.0);
    });

    it('additive refinement - selects root when sse is met', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            // Meets screen space error, only root tile is rendered
            viewRootOnly();
            scene.renderForSpecs();

            var stats = tileset._statistics;
            expect(stats.visited).toEqual(1);
            expect(stats.numberOfCommands).toEqual(1);
        });
    });

    it('additive refinement - selects all tiles when sse is not met', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            // Does not meet screen space error, all tiles are visible
            viewAllTiles();
            scene.renderForSpecs();

            var stats = tileset._statistics;
            expect(stats.visited).toEqual(5);
            expect(stats.numberOfCommands).toEqual(5);
        });
    });

    it('additive refinement - use parent\'s geometric error on child\'s box for early refinement', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            scene.renderForSpecs();
            var stats = tileset._statistics;
            expect(stats.visited).toEqual(5);
            expect(stats.numberOfCommands).toEqual(5);

            // Both right tiles don't meet the SSE anymore
            scene.camera.moveLeft(50.0);
            scene.renderForSpecs();
            expect(stats.visited).toEqual(3);
            expect(stats.numberOfCommands).toEqual(3);
        });
    });

    it('additive refinement - selects tile when inside viewer request volume', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetWithViewerRequestVolumeUrl).then(function(tileset) {
            var stats = tileset._statistics;
            // Force root tile to always not meet SSE since this is just checking the request volume
            tileset.maximumScreenSpaceError = 0.0;

            // Renders all 5 tiles
            setZoom(20.0);
            scene.renderForSpecs();
            expect(stats.numberOfCommands).toEqual(5);

            // No longer renders the tile with a request volume
            setZoom(1500.0);
            scene.renderForSpecs();
            expect(stats.numberOfCommands).toEqual(4);
        });
    });

    it('replacement refinement - selects root when sse is met', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            tileset._root.refine = Cesium3DTileRefine.REPLACE;

            // Meets screen space error, only root tile is rendered
            viewRootOnly();
            scene.renderForSpecs();

            var stats = tileset._statistics;
            expect(stats.visited).toEqual(1);
            expect(stats.numberOfCommands).toEqual(1);
        });
    });

    it('replacement refinement - selects children when sse is not met', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            tileset._root.refine = Cesium3DTileRefine.REPLACE;

            // Does not meet screen space error, child tiles replace root tile
            viewAllTiles();
            scene.renderForSpecs();

            var stats = tileset._statistics;
            expect(stats.visited).toEqual(5); // Visits root, but does not render it
            expect(stats.numberOfCommands).toEqual(4);
        });
    });

    it('replacement refinement - selects root when sse is not met and children are not ready', function() {
        // Set view so that only root tile is loaded initially
        viewRootOnly();

        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            var root = tileset._root;
            root.refine = Cesium3DTileRefine.REPLACE;

            // Set zoom to start loading child tiles
            viewAllTiles();
            scene.renderForSpecs();

            var stats = tileset._statistics;
            expect(stats.visited).toEqual(1);
            expect(stats.numberOfCommands).toEqual(1);
            expect(stats.numberOfPendingRequests).toEqual(4);
            expect(root.numberOfChildrenWithoutContent).toEqual(4);
        });
    });

    it('replacement refinement - refines to children when refineToVisible is false', function() {
        viewRootOnly();
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            tileset._refineToVisible = false;
            var root = tileset._root;
            root.refine = Cesium3DTileRefine.REPLACE;
            root._contentBoundingVolume = undefined; // Easier to test if the root only uses its tile bounding volume
            var ll = root.children[0];
            var stats = tileset._statistics;

            // Look at lower-left corner of tileset
            viewAllTiles();
            scene.camera.moveLeft(200.0);
            scene.camera.moveDown(200.0);

            scene.renderForSpecs();
            expect(stats.visited).toEqual(1); // Visits root only, child tiles aren't ready
            expect(stats.numberOfCommands).toEqual(1);

            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                // Even though we are only looking at the lower-left tile, all child tiles are loaded
                scene.renderForSpecs();
                expect(stats.visited).toEqual(2); // Only visible tiles are visited - root and ll
                expect(stats.numberContentReady).toEqual(5); // All tiles are loaded
                expect(stats.numberOfCommands).toEqual(1); // Root is replaced, but only ll is visible
                expect(tileset._selectedTiles[0]).toEqual(ll);

                // Now look at all tiles
                viewAllTiles();
                scene.renderForSpecs();
                expect(stats.visited).toEqual(5); // All tiles are visited
                expect(stats.numberContentReady).toEqual(5); // All tiles are loaded
                expect(stats.numberOfCommands).toEqual(4); // Root is replaced by its 4 children
            });
        });
    });

    it('replacement refinement - refines to visible ready children when refineToVisible is true', function() {
        viewRootOnly();
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            tileset._refineToVisible = true;
            var root = tileset._root;
            root.refine = Cesium3DTileRefine.REPLACE;
            root._contentBoundingVolume = undefined; // Easier to test if the root only uses its tile bounding volume
            var ll = root.children[0];
            var stats = tileset._statistics;

            // Look at lower-left corner of tileset
            viewAllTiles();
            scene.camera.moveLeft(200.0);
            scene.camera.moveDown(200.0);

            scene.renderForSpecs();
            expect(stats.visited).toEqual(1); // Visits root only, ll (lower-left child) isn't ready
            expect(stats.numberOfCommands).toEqual(1);

            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                scene.renderForSpecs();
                expect(stats.visited).toEqual(2); // Visits root and ll
                expect(stats.numberOfCommands).toEqual(1); // ll is the only visible child and is ready, so it replaces root
                expect(tileset._selectedTiles[0]).toBe(ll);

                viewAllTiles();
                scene.renderForSpecs();
                expect(stats.visited).toEqual(2); // Visits root and ll
                expect(stats.numberOfCommands).toEqual(2); // Now other children are visible but not ready. Render root and any visible ready children (only ll)

                return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                    scene.renderForSpecs();
                    expect(stats.visited).toEqual(5); // Visits root and all children
                    expect(stats.numberOfCommands).toEqual(4); // Renders children, root is replaced because all visible children are ready
                });
            });
        });
    });

    it('replacement refinement - selects tile when inside viewer request volume', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetWithViewerRequestVolumeUrl).then(function(tileset) {
            var stats = tileset._statistics;

            var root = tileset._root;
            root.refine = Cesium3DTileRefine.REPLACE;
            // Force root tile to always not meet SSE since this is just checking the request volume
            tileset.maximumScreenSpaceError = 0.0;

            // Renders all 5 tiles
            setZoom(20.0);
            scene.renderForSpecs();
            expect(stats.numberOfCommands).toEqual(5);

            // No longer renders the tile with a request volume
            setZoom(1500.0);
            scene.renderForSpecs();
            expect(stats.numberOfCommands).toEqual(4);

            // Now test when refineToVisible is true
            tileset._refineToVisible = true;

            // Renders all 5 tiles
            setZoom(20.0);
            scene.renderForSpecs();
            expect(stats.numberOfCommands).toEqual(5);

            // No longer renders the tile with a request volume
            setZoom(1500.0);
            scene.renderForSpecs();
            expect(stats.numberOfCommands).toEqual(4);
        });
    });

    it('replacement refinement - selects root when sse is not met and subtree is not refinable (1)', function() {
        // No children have content, but all grandchildren have content
        //
        //          C
        //      E       E
        //    C   C   C   C
        //

        viewRootOnly();
        return Cesium3DTilesTester.loadTileset(scene, tilesetReplacement1Url).then(function(tileset) {
            viewAllTiles();
            scene.renderForSpecs();

            var stats = tileset._statistics;
            var root = tileset._root;
            expect(root.descendantsWithContent).toBeDefined();
            expect(root.descendantsWithContent.length).toEqual(4);
            return when.join(root.children[0].readyPromise, root.children[1].readyPromise).then(function() {
                // Even though root's children are loaded, the grandchildren need to be loaded before it becomes refinable
                scene.renderForSpecs();
                expect(root.numberOfChildrenWithoutContent).toEqual(0); // Children are loaded
                expect(stats.numberOfCommands).toEqual(1); // Render root
                expect(stats.numberOfPendingRequests).toEqual(4); // Loading grandchildren

                return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                    scene.renderForSpecs();
                    expect(stats.numberOfCommands).toEqual(4); // Render children
                });
            });
        });
    });

    it('replacement refinement - selects root when sse is not met and subtree is not refinable (2)', function() {
        // Check that the root is refinable once its child is loaded
        //
        //          C
        //          E
        //        C   E
        //            C (smaller geometric error)
        //

        viewRootOnly();
        return Cesium3DTilesTester.loadTileset(scene, tilesetReplacement2Url).then(function(tileset) {
            setZoom(30.0);
            scene.renderForSpecs();

            var stats = tileset._statistics;
            var root = tileset._root;
            expect(root.descendantsWithContent).toBeDefined();
            expect(root.descendantsWithContent.length).toEqual(2);
            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                scene.renderForSpecs();
                expect(stats.numberOfCommands).toEqual(1);

                setZoom(5.0); // Zoom into the last tile, when it is ready the root is refinable
                scene.renderForSpecs();

                return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                    scene.renderForSpecs();
                    expect(stats.numberOfCommands).toEqual(2); // Renders two content tiles
                });
            });
        });
    });

    it('replacement refinement - selects root when sse is not met and subtree is not refinable (3)', function() {
        // Check that the root is refinable once its child is loaded
        //
        //          C
        //          T (external tileset ref)
        //          E (root of external tileset)
        //     C  C  C  C
        //

        viewRootOnly();
        return Cesium3DTilesTester.loadTileset(scene, tilesetReplacement3Url).then(function(tileset) {
            scene.renderForSpecs();
            var stats = tileset._statistics;
            var root = tileset._root;
            expect(root.descendantsWithContent).toBeDefined();
            expect(root.descendantsWithContent.length).toEqual(0);
            expect(stats.numberOfCommands).toEqual(1);

            viewAllTiles();
            scene.renderForSpecs();
            return root.children[0].content.readyPromise.then(function() {
                // The external tileset json is loaded, but the external tileset isn't.
                scene.renderForSpecs();
                expect(root.descendantsWithContent.length).toEqual(4);
                expect(stats.numberOfCommands).toEqual(1); // Render root
                expect(stats.numberOfPendingRequests).toEqual(4); // Loading child content tiles

                return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                    scene.renderForSpecs();
                    expect(root.selected).toEqual(false);
                    expect(stats.numberOfCommands).toEqual(4); // Render child content tiles
                });
            });
        });
    });

    it('replacement and additive refinement', function() {
        //          A
        //      A       R (not rendered)
        //    R   A   R   A
        //
        return Cesium3DTilesTester.loadTileset(scene, tilesetRefinementMix).then(function(tileset) {
            scene.renderForSpecs();
            var stats = tileset._statistics;
            expect(stats.visited).toEqual(7);
            expect(stats.numberOfCommands).toEqual(6);
        });
    });

    describe('children bound union optimization', function() {
        it('does not select visible tiles with invisible children', function() {
            return Cesium3DTilesTester.loadTileset(scene, tilesetReplacementWithViewerRequestVolumeUrl).then(function(tileset) {
                scene.camera.setView({
                    destination: Cartesian3.fromRadians(centerLongitude, centerLatitude, 22),
                    orientation: {
                        heading: 0,
                        pitch:  1.57,
                        roll: 0
                    }
                });

                var root = tileset._root;
                var childRoot = root.children[0];

                scene.renderForSpecs();

                expect(childRoot.visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);

                expect(childRoot.children[0].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).toEqual(CullingVolume.MASK_OUTSIDE);
                expect(childRoot.children[1].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).toEqual(CullingVolume.MASK_OUTSIDE);
                expect(childRoot.children[2].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).toEqual(CullingVolume.MASK_OUTSIDE);
                expect(childRoot.children[3].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).toEqual(CullingVolume.MASK_OUTSIDE);

                expect(tileset._selectedTiles.length).toEqual(0);
                expect(childRoot.selected).toBe(false);
            });
        });

        it('does not select visible tiles not meeting SSE with visible children', function() {
            return Cesium3DTilesTester.loadTileset(scene, tilesetReplacementWithViewerRequestVolumeUrl).then(function(tileset) {
                var root = tileset._root;
                var childRoot = root.children[0];
                childRoot.geometricError = 240;

                scene.camera.setView({
                    destination: Cartesian3.fromRadians(centerLongitude, centerLatitude, 49),
                    orientation: {
                        heading: 0,
                        pitch:  -1.57,
                        roll: 0
                    }
                });

                scene.renderForSpecs();

                expect(childRoot.visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);

                expect(childRoot.children[0].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
                expect(childRoot.children[1].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
                expect(childRoot.children[2].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
                expect(childRoot.children[3].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);

                expect(childRoot.selected).toBe(false);
                expect(childRoot.replaced).toBe(true);
            });
        });

        it ('does select visible tiles meeting SSE with visible children', function() {
            return Cesium3DTilesTester.loadTileset(scene, tilesetReplacementWithViewerRequestVolumeUrl).then(function(tileset) {
                var root = tileset._root;
                var childRoot = root.children[0];

                scene.camera.setView({
                    destination: Cartesian3.fromRadians(centerLongitude, centerLatitude, 49),
                    orientation: {
                        heading: 0,
                        pitch:  -1.57,
                        roll: 0
                    }
                });

                childRoot.geometricError = 0;
                scene.renderForSpecs();

                expect(childRoot.visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);

                expect(childRoot.children[0].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
                expect(childRoot.children[1].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
                expect(childRoot.children[2].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
                expect(childRoot.children[3].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);

                expect(childRoot.selected).toBe(true);
                expect(childRoot.replaced).toBe(false);
            });
        });

        it('does select visibile tiles with visible children failing request volumes', function() {
            return Cesium3DTilesTester.loadTileset(scene, tilesetReplacementWithViewerRequestVolumeUrl).then(function(tileset) {
                scene.camera.setView({
                    destination: Cartesian3.fromRadians(centerLongitude, centerLatitude, 100),
                    orientation: {
                        heading: 0,
                        pitch:  -1.57,
                        roll: 0
                    }
                });

                var root = tileset._root;
                var childRoot = root.children[0];
                childRoot.geometricError = 0;

                scene.renderForSpecs();

                expect(childRoot.visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);

                expect(childRoot.children[0].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
                expect(childRoot.children[1].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
                expect(childRoot.children[2].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
                expect(childRoot.children[3].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);

                expect(tileset._selectedTiles.length).toEqual(1);
                expect(childRoot.selected).toBe(true);
            });
        });

        it('does select visibile tiles with visible children passing request volumes', function() {
            return Cesium3DTilesTester.loadTileset(scene, tilesetReplacementWithViewerRequestVolumeUrl).then(function(tileset) {
                scene.camera.setView({
                    destination: Cartesian3.fromRadians(centerLongitude, centerLatitude, 40),
                    orientation: {
                        heading: 0,
                        pitch:  -1.57,
                        roll: 0
                    }
                });

                var root = tileset._root;
                var childRoot = root.children[0];
                childRoot.geometricError = 0;

                scene.renderForSpecs();

                expect(childRoot.visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);

                expect(childRoot.children[0].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
                expect(childRoot.children[1].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
                expect(childRoot.children[2].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
                expect(childRoot.children[3].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);

                expect(tileset._selectedTiles.length).toEqual(1);
                expect(childRoot.selected).toBe(true);

                childRoot.geometricError = 200;
                scene.renderForSpecs();
                expect(tileset._selectedTiles.length).toEqual(4);
                expect(childRoot.selected).toBe(false);
                expect(childRoot.replaced).toBe(true);
            });
        });
    });

    it('loads tileset with external tileset.json', function() {
        // Set view so that no tiles are loaded initially
        viewNothing();

        return Cesium3DTilesTester.loadTileset(scene, tilesetOfTilesetsUrl).then(function(tileset) {
            // Root points to an external tileset.json and has no children until it is requested
            var root = tileset._root;
            expect(root.hasTilesetContent).toEqual(true);
            expect(root.children.length).toEqual(0);

            // Set view so that root's content is requested
            viewRootOnly();
            scene.renderForSpecs();
            return root.content.readyPromise.then(function() {
                // Root has one child now, the root of the external tileset
                expect(root.children.length).toEqual(1);

                // Check that headers are equal
                var subtreeRoot = root.children[0];
                expect(root.geometricError).toEqual(subtreeRoot.geometricError);
                expect(root.refine).toEqual(subtreeRoot.refine);
                expect(root.contentBoundingVolume.boundingVolume).toEqual(subtreeRoot.contentBoundingVolume.boundingVolume);

                // Check that Subtree root has 4 children
                expect(subtreeRoot.hasTilesetContent).toEqual(false);
                expect(subtreeRoot.children.length).toEqual(4);
            });
        });
    });

    it('preserves query string with external tileset.json', function() {
        // Set view so that no tiles are loaded initially
        viewNothing();

        //Spy on loadWithXhr so we can verify requested urls
        spyOn(loadWithXhr, 'load').and.callThrough();

        var queryParams = '?a=1&b=boy';
        var expectedUrl = './Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/tileset.json' + queryParams;
        return Cesium3DTilesTester.loadTileset(scene, tilesetOfTilesetsUrl + queryParams).then(function(tileset) {
            //Make sure tileset.json was requested with query parameters
            expect(loadWithXhr.load.calls.argsFor(0)[0]).toEqual(expectedUrl);

            loadWithXhr.load.calls.reset();

            // Set view so that root's content is requested
            viewRootOnly();
            scene.renderForSpecs();

            return tileset._root.content.readyPromise;
        }).then(function() {
            //Make sure tileset2.json was requested with query parameters and version
            var queryParamsWithVersion = queryParams + '&v=0.0';
            expectedUrl = './Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/tileset2.json' + queryParamsWithVersion;
            expect(loadWithXhr.load.calls.argsFor(0)[0]).toEqual(expectedUrl);
        });
    });

    it('renders tileset with external tileset.json', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetOfTilesetsUrl).then(function(tileset) {
            scene.renderForSpecs();
            var stats = tileset._statistics;
            expect(stats.visited).toEqual(7); // Visits two tiles with tileset content, five tiles with b3dm content
            expect(stats.numberOfCommands).toEqual(5); // Render the five tiles with b3dm content
        });
    });

    it('debugFreezeFrame', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            viewRootOnly();
            scene.renderForSpecs();
            var stats = tileset._statistics;
            expect(stats.visited).toEqual(1);
            expect(stats.numberOfCommands).toEqual(1);

            tileset.debugFreezeFrame = true;
            viewAllTiles();
            scene.renderForSpecs();
            expect(stats.visited).toEqual(0); // selectTiles returns early, so no tiles are visited
            expect(stats.numberOfCommands).toEqual(1); // root tile is still in selectedTiles list
        });
    });

    it('debugColorizeTiles', function() {
        // More precise test is in Cesium3DTileBatchTableSpec
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            viewRootOnly();
            tileset.debugColorizeTiles = true;
            scene.renderForSpecs();
            var stats = tileset._statistics;
            expect(stats.visited).toEqual(1);
            expect(stats.numberOfCommands).toEqual(1);
        });
    });

    it('debugWireframe', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            viewRootOnly();
            tileset.debugWireframe = true;
            scene.renderForSpecs();
            var commands = scene.frameState.commandList;
            var length = commands.length;
            var i;
            for (i = 0; i < length; ++i) {
                expect(commands[i].primitiveType).toEqual(PrimitiveType.LINES);
            }

            tileset.debugWireframe = false;
            scene.renderForSpecs();
            commands = scene.frameState.commandList;
            for (i = 0; i < length; ++i) {
                expect(commands[i].primitiveType).toEqual(PrimitiveType.TRIANGLES);
            }
        });
    });

    it('debugShowBoundingVolume', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            viewRootOnly();
            tileset.debugShowBoundingVolume = true;
            scene.renderForSpecs();
            var stats = tileset._statistics;
            expect(stats.visited).toEqual(1);
            expect(stats.numberOfCommands).toEqual(2); // Tile command + bounding volume command

            tileset.debugShowBoundingVolume = false;
            scene.renderForSpecs();
            expect(stats.numberOfCommands).toEqual(1);
        });
    });

    it('debugShowContentBoundingVolume', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            viewRootOnly();
            tileset.debugShowContentBoundingVolume = true;
            scene.renderForSpecs();
            var stats = tileset._statistics;
            expect(stats.visited).toEqual(1);
            expect(stats.numberOfCommands).toEqual(2); // Tile command + bounding volume command

            tileset.debugShowContentBoundingVolume = false;
            scene.renderForSpecs();
            expect(stats.numberOfCommands).toEqual(1);
        });
    });

    it('debugShowViewerRequestVolume', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetWithViewerRequestVolumeUrl).then(function(tileset) {
            tileset.debugShowViewerRequestVolume = true;
            scene.renderForSpecs();
            var stats = tileset._statistics;
            expect(stats.visited).toEqual(6); // 1 empty root tile + 4 b3dm tiles + 1 pnts tile
            expect(stats.numberOfCommands).toEqual(6); // 5 tile commands + viewer request volume command

            tileset.debugShowViewerRequestVolume = false;
            scene.renderForSpecs();
            expect(stats.numberOfCommands).toEqual(5);
        });
    });

    it('debugShowGeometricError with regions', function() {
        // tilesetUrl has bounding regions
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            tileset.debugShowGeometricError = true;
            scene.renderForSpecs();
            expect(tileset._geometricErrorLabels).toBeDefined();
            expect(tileset._geometricErrorLabels.length).toEqual(5);
            expect(tileset._geometricErrorLabels._labels[0].text).toEqual('70');
            expect(tileset._geometricErrorLabels._labels[1].text).toEqual('0');
            expect(tileset._geometricErrorLabels._labels[2].text).toEqual('0');
            expect(tileset._geometricErrorLabels._labels[3].text).toEqual('0');
            expect(tileset._geometricErrorLabels._labels[4].text).toEqual('0');

            tileset.debugShowGeometricError = false;
            scene.renderForSpecs();
            expect(tileset._geometricErrorLabels).not.toBeDefined();
        });
    });

    it('debugShowGeometricError with boxes', function() {
        // tilesetWithTransformsUrl has bounding boxes
        return Cesium3DTilesTester.loadTileset(scene, tilesetWithTransformsUrl).then(function(tileset) {
            tileset.debugShowGeometricError = true;
            scene.renderForSpecs();
            expect(tileset._geometricErrorLabels).toBeDefined();
            expect(tileset._geometricErrorLabels.length).toEqual(2);
            expect(tileset._geometricErrorLabels._labels[0].text).toEqual('70');
            expect(tileset._geometricErrorLabels._labels[1].text).toEqual('0');

            tileset.debugShowGeometricError = false;
            scene.renderForSpecs();
            expect(tileset._geometricErrorLabels).not.toBeDefined();
        });
    });

    it('debugShowGeometricError with bounding spheres', function() {
        // tilesetWithViewerRequestVolumeUrl has bounding sphere
        return Cesium3DTilesTester.loadTileset(scene, tilesetWithViewerRequestVolumeUrl).then(function(tileset) {
            tileset.debugShowGeometricError = true;
            scene.renderForSpecs();
            expect(tileset._geometricErrorLabels).toBeDefined();
            expect(tileset._geometricErrorLabels.length).toEqual(6);
            expect(tileset._geometricErrorLabels._labels[0].text).toEqual('70');
            expect(tileset._geometricErrorLabels._labels[1].text).toEqual('0');
            expect(tileset._geometricErrorLabels._labels[2].text).toEqual('0');
            expect(tileset._geometricErrorLabels._labels[3].text).toEqual('0');
            expect(tileset._geometricErrorLabels._labels[4].text).toEqual('0');
            expect(tileset._geometricErrorLabels._labels[5].text).toEqual('0');

            tileset.debugShowGeometricError = false;
            scene.renderForSpecs();
            expect(tileset._geometricErrorLabels).not.toBeDefined();
        });
    });

    it('does not request tiles when picking', function() {
        viewNothing();
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            viewRootOnly();
            scene.pickForSpecs();
            expect(tileset._statistics.numberOfPendingRequests).toEqual(0);
            scene.renderForSpecs();
            expect(tileset._statistics.numberOfPendingRequests).toEqual(1);
        });
    });

    it('does not process tiles when picking', function() {
        var spy = spyOn(Cesium3DTile.prototype, 'process').and.callThrough();

        viewNothing();
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            viewRootOnly();
            scene.renderForSpecs(); // Request root
            expect(tileset._statistics.numberOfPendingRequests).toEqual(1);
            return tileset._root.content.contentReadyToProcessPromise.then(function() {
                scene.pickForSpecs();
                expect(spy).not.toHaveBeenCalled();
                scene.renderForSpecs();
                expect(spy).toHaveBeenCalled();
            });
        });
    });

    it('does not request tiles when the request scheduler is full', function() {
        viewRootOnly(); // Root tiles are loaded initially

        var promises = [
            Cesium3DTilesTester.loadTileset(scene, tilesetUrl),
            Cesium3DTilesTester.loadTileset(scene, tilesetUrl)
        ];

        return when.all(promises, function(tilesets) {
            // Root tiles are ready, now zoom in to request child tiles
            viewAllTiles();
            scene.renderForSpecs();

            // Maximum of 6 requests allowed. Expect the first tileset to use four,
            // and the second tileset to use the remaining two
            expect(tilesets[0]._statistics.numberOfPendingRequests).toEqual(4);
            expect(tilesets[1]._statistics.numberOfPendingRequests).toEqual(2);
            expect(RequestScheduler.hasAvailableRequestsByServer(tilesets[0]._url)).toEqual(false);
        });
    });

    it('load progress events are raised', function() {
        // [numberOfPendingRequests, numberProcessing]
        var results = [
            [1, 0],
            [0, 1],
            [0, 0]
        ];
        var spyUpdate = jasmine.createSpy('listener');

        viewNothing();
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            tileset.loadProgress.addEventListener(spyUpdate);
            viewRootOnly();
            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                scene.renderForSpecs();
                expect(spyUpdate.calls.count()).toEqual(3);
                expect(spyUpdate.calls.allArgs()).toEqual(results);
            });
        });
    });

    it('tilesLoaded', function() {
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : tilesetUrl
        }));
        expect(tileset.tilesLoaded).toBe(false);
        tileset.readyPromise.then(function() {
            expect(tileset.tilesLoaded).toBe(false);
            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                expect(tileset.tilesLoaded).toBe(true);
            });
        });
    });

    it('all tiles loaded event is raised', function() {
        // Called first when only the root is visible and it becomes loaded, and then again when
        // the rest of the tileset is visible and all tiles are loaded.
        var spyUpdate = jasmine.createSpy('listener');
        viewRootOnly();
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : tilesetUrl
        }));
        tileset.allTilesLoaded.addEventListener(spyUpdate);
        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
            viewAllTiles();
            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                expect(spyUpdate.calls.count()).toEqual(2);
            });
        });
    });

    it('tile visible event is raised', function() {
        viewRootOnly();
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            var spyUpdate = jasmine.createSpy('listener');
            tileset.tileVisible.addEventListener(spyUpdate);
            scene.renderForSpecs();
            expect(tileset._root.visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
            expect(spyUpdate.calls.count()).toEqual(1);
            expect(spyUpdate.calls.argsFor(0)[0]).toBe(tileset._root);
        });
    });

    it('destroys', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            var root = tileset._root;
            expect(tileset.isDestroyed()).toEqual(false);
            scene.primitives.remove(tileset);
            expect(tileset.isDestroyed()).toEqual(true);

            // Check that all tiles are destroyed
            expect(root.isDestroyed()).toEqual(true);
            expect(root.children[0].isDestroyed()).toEqual(true);
            expect(root.children[1].isDestroyed()).toEqual(true);
            expect(root.children[2].isDestroyed()).toEqual(true);
            expect(root.children[3].isDestroyed()).toEqual(true);
        });
    });

    it('destroys before loadTileset finishes', function() {
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : tilesetUrl
        }));
        scene.renderForSpecs();
        scene.primitives.remove(tileset);
        return tileset.readyPromise.then(function(tileset) {
            fail('should not resolve');
        }).otherwise(function(error) {
            expect(error).toEqual('tileset is destroyed');
        });
    });

    it('destroys before external tileset.json finishes loading', function() {
        viewNothing();
        return Cesium3DTilesTester.loadTileset(scene, tilesetOfTilesetsUrl).then(function(tileset) {
            var root = tileset._root;
            var content = root.content;

            viewRootOnly();
            scene.renderForSpecs(); // Request external tileset.json

            var stats = tileset._statistics;
            expect(stats.numberOfPendingRequests).toEqual(1);
            scene.primitives.remove(tileset);

            return content.readyPromise.then(function(root) {
                fail('should not resolve');
            }).otherwise(function(error) {
                // Expect the root to not have added any children from the external tileset.json
                expect(root.children.length).toEqual(0);
                expect(RequestScheduler.getNumberOfAvailableRequests()).toEqual(RequestScheduler.maximumRequests);
            });
        });
    });

    it('destroys before tile finishes loading', function() {
        viewNothing();
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            var root = tileset._root;
            var content = root.content;

            viewRootOnly();
            scene.renderForSpecs(); // Request root
            scene.primitives.remove(tileset);

            return content.readyPromise.then(function(root) {
                fail('should not resolve');
            }).otherwise(function(error) {
                expect(content.state).toEqual(Cesium3DTileContentState.FAILED);
                expect(RequestScheduler.getNumberOfAvailableRequests()).toEqual(RequestScheduler.maximumRequests);
            });
        });
    });

    ///////////////////////////////////////////////////////////////////////////
    // Styling tests

    it('applies show style to a tileset', function() {
        return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(function(tileset) {
            var hideStyle = new Cesium3DTileStyle({show : 'false'});
            tileset.style = hideStyle;
            expect(tileset.style).toBe(hideStyle);
            expect(scene).toRender([0, 0, 0, 255]);

            tileset.style = new Cesium3DTileStyle({show : 'true'});
            expect(scene).notToRender([0, 0, 0, 255]);
        });
    });

    it('applies style with complex show expression to a tileset', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(function(tileset) {
            // Each feature in the b3dm file has an id property from 0 to 9
            // ${id} >= 10 will always evaluate to false
            tileset.style = new Cesium3DTileStyle({show : '${id} >= 50 * 2'});
            expect(scene).toRender([0, 0, 0, 255]);

            // ${id} < 10 will always evaluate to true
            tileset.style = new Cesium3DTileStyle({show : '${id} < 200 / 2'});
            expect(scene).notToRender([0, 0, 0, 255]);
        });
    });

    it('applies show style to a tileset with a composite tile', function() {
        var center = Cartesian3.fromRadians(centerLongitude, centerLatitude, 5.0);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 10.0));

        return Cesium3DTilesTester.loadTileset(scene, compositeUrl).then(function(tileset) {
            tileset.style = new Cesium3DTileStyle({show : 'false'});
            expect(scene).toRender([0, 0, 0, 255]);

            tileset.style = new Cesium3DTileStyle({show : 'true'});
            expect(scene).notToRender([0, 0, 0, 255]);
        });
    });

    function expectColorStyle(tileset) {
        var color;
        expect(scene).toRenderAndCall(function(rgba) {
            color = rgba;
        });

        tileset.style = new Cesium3DTileStyle({color : 'color("blue")'});
        expect(scene).toRenderAndCall(function(rgba) {
            expect(rgba[0]).toEqual(0);
            expect(rgba[1]).toEqual(0);
            expect(rgba[2]).toBeGreaterThan(0);
            expect(rgba[3]).toEqual(255);
        });

        // set color to transparent
        tileset.style = new Cesium3DTileStyle({color : 'color("blue", 0.0)'});
        expect(scene).toRender([0, 0, 0, 255]);

        tileset.style = new Cesium3DTileStyle({color : 'color("cyan")'});
        expect(scene).toRenderAndCall(function(rgba) {
            expect(rgba[0]).toEqual(0);
            expect(rgba[1]).toBeGreaterThan(0);
            expect(rgba[2]).toBeGreaterThan(0);
            expect(rgba[3]).toEqual(255);
        });

        // Remove style
        tileset.style = undefined;
        expect(scene).toRender(color);
    }

    it('applies color style to a tileset', function() {
        return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(function(tileset) {
            expectColorStyle(tileset);
        });
    });

    it('applies color style to a tileset with translucent tiles', function() {
        return Cesium3DTilesTester.loadTileset(scene, translucentUrl).then(function(tileset) {
            expectColorStyle(tileset);
        });
    });

    it('applies color style to a tileset with translucent and opaque tiles', function() {
        return Cesium3DTilesTester.loadTileset(scene, translucentOpaqueMixUrl).then(function(tileset) {
            expectColorStyle(tileset);
        });
    });

    it('applies style when feature properties change', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(function(tileset) {
            // Initially, all feature ids are less than 10
            tileset.style = new Cesium3DTileStyle({show : '${id} < 10'});
            expect(scene).notToRender([0, 0, 0, 255]);

            // Change feature ids so the show expression will evaluate to false
            var content = tileset._root.content;
            var length = content.featuresLength;
            var i;
            var feature;
            for (i = 0; i < length; ++i) {
                feature = content.getFeature(i);
                feature.setProperty('id', feature.getProperty('id') + 10);
            }
            expect(scene).toRender([0, 0, 0, 255]);

            // Change ids back
            for (i = 0; i < length; ++i) {
                feature = content.getFeature(i);
                feature.setProperty('id', feature.getProperty('id') - 10);
            }
            expect(scene).notToRender([0, 0, 0, 255]);
        });
    });

    it('applies style with complex color expression to a tileset', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(function(tileset) {
            // Each feature in the b3dm file has an id property from 0 to 9
            // ${id} >= 10 will always evaluate to false
            tileset.style = new Cesium3DTileStyle({color : '(${id} >= 50 * 2) ? color("red") : color("blue")'});
            expect(scene).toRenderAndCall(function(rgba) {
                expect(rgba[0]).toEqual(0);
                expect(rgba[1]).toEqual(0);
                expect(rgba[2]).toBeGreaterThan(0);
                expect(rgba[3]).toEqual(255);
            });

            // ${id} < 10 will always evaluate to true
            tileset.style = new Cesium3DTileStyle({color : '(${id} < 50 * 2) ? color("red") : color("blue")'});
            expect(scene).toRenderAndCall(function(rgba) {
                expect(rgba[0]).toBeGreaterThan(0);
                expect(rgba[1]).toEqual(0);
                expect(rgba[2]).toEqual(0);
                expect(rgba[3]).toEqual(255);
            });
        });
    });

    it('applies conditional color style to a tileset', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(function(tileset) {
            // ${id} < 10 will always evaluate to true
            tileset.style = new Cesium3DTileStyle({
                color : {
                    conditions : [
                        ['${id} < 10', 'color("red")'],
                        ['true', 'color("blue")']
                    ]
                }
            });
            expect(scene).toRenderAndCall(function(rgba) {
                expect(rgba[0]).toBeGreaterThan(0);
                expect(rgba[1]).toEqual(0);
                expect(rgba[2]).toEqual(0);
                expect(rgba[3]).toEqual(255);
            });

            // ${id}>= 10 will always evaluate to false
            tileset.style = new Cesium3DTileStyle({
                color : {
                    conditions : [
                        ['${id} >= 10', 'color("red")'],
                        ['true', 'color("blue")']
                    ]
                }
            });
            expect(scene).toRenderAndCall(function(rgba) {
                expect(rgba[0]).toEqual(0);
                expect(rgba[1]).toEqual(0);
                expect(rgba[2]).toBeGreaterThan(0);
                expect(rgba[3]).toEqual(255);
            });
        });
    });

    it('loads style from uri', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(function(tileset) {
            // ${id} < 10 will always evaluate to true
            tileset.style = new Cesium3DTileStyle(styleUrl);
            return tileset.style.readyPromise.then(function(style) {
                expect(scene).toRenderAndCall(function(rgba) {
                    expect(rgba[0]).toBeGreaterThan(0);
                    expect(rgba[1]).toEqual(0);
                    expect(rgba[2]).toEqual(0);
                    expect(rgba[3]).toEqual(255);
                });
            }).otherwise(function(error) {
                expect(error).not.toBeDefined();
            });
        });
    });

    it('applies custom style to a tileset', function() {
        var style = new Cesium3DTileStyle();
        style.show = {
            evaluate : function(frameState, feature) {
                return this._value;
            },
            _value : false
        };
        style.color = {
            evaluateColor : function(frameState, feature, result) {
                return Color.clone(Color.WHITE, result);
            }
        };

        return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(function(tileset) {
            tileset.style = style;
            expect(tileset.style).toBe(style);
            expect(scene).toRender([0, 0, 0, 255]);

            style.show._value = true;
            tileset.makeStyleDirty();
            expect(scene).notToRender([0, 0, 0, 255]);
        });
    });

    function testColorBlendMode(url) {
        return Cesium3DTilesTester.loadTileset(scene, url).then(function(tileset) {
            // Check that the feature is red
            var sourceRed;
            expect(scene).toRenderAndCall(function(rgba) {
                sourceRed = rgba[0];
            });

            expect(scene).toRenderAndCall(function(rgba) {
                expect(rgba[0]).toBeGreaterThan(0);
                expect(rgba[1]).toEqual(0);
                expect(rgba[2]).toEqual(0);
                expect(rgba[3]).toEqual(255);
            });

            // Use HIGHLIGHT blending
            tileset.colorBlendMode = Cesium3DTileColorBlendMode.HIGHLIGHT;

            // Style with dark yellow. Expect the red channel to be darker than before.
            tileset.style = new Cesium3DTileStyle({
                color : 'rgb(128, 128, 0)'
            });
            expect(scene).toRenderAndCall(function(rgba) {
                expect(rgba[0]).toBeGreaterThan(0);
                expect(rgba[0]).toBeLessThan(sourceRed);
                expect(rgba[1]).toEqual(0);
                expect(rgba[2]).toEqual(0);
                expect(rgba[3]).toEqual(255);
            });

            // Style with yellow + alpha. Expect the red channel to be darker than before.
            tileset.style = new Cesium3DTileStyle({
                color : 'rgba(255, 255, 0, 0.5)'
            });
            expect(scene).toRenderAndCall(function(rgba) {
                expect(rgba[0]).toBeGreaterThan(0);
                expect(rgba[0]).toBeLessThan(sourceRed);
                expect(rgba[1]).toEqual(0);
                expect(rgba[2]).toEqual(0);
                expect(rgba[3]).toEqual(255);
            });

            // Use REPLACE blending
            tileset.colorBlendMode = Cesium3DTileColorBlendMode.REPLACE;

            // Style with dark yellow. Expect the red and green channels to be roughly dark yellow.
            tileset.style = new Cesium3DTileStyle({
                color : 'rgb(128, 128, 0)'
            });
            var replaceRed;
            var replaceGreen;
            expect(scene).toRenderAndCall(function(rgba) {
                replaceRed = rgba[0];
                replaceGreen = rgba[1];
                expect(rgba[0]).toBeGreaterThan(0);
                expect(rgba[0]).toBeLessThan(255);
                expect(rgba[1]).toBeGreaterThan(0);
                expect(rgba[1]).toBeLessThan(255);
                expect(rgba[2]).toEqual(0);
                expect(rgba[3]).toEqual(255);
            });

            // Style with yellow + alpha. Expect the red and green channels to be a shade of yellow.
            tileset.style = new Cesium3DTileStyle({
                color : 'rgba(255, 255, 0, 0.5)'
            });
            expect(scene).toRenderAndCall(function(rgba) {
                expect(rgba[0]).toBeGreaterThan(0);
                expect(rgba[0]).toBeLessThan(255);
                expect(rgba[1]).toBeGreaterThan(0);
                expect(rgba[1]).toBeLessThan(255);
                expect(rgba[2]).toEqual(0);
                expect(rgba[3]).toEqual(255);
            });

            // Use MIX blending
            tileset.colorBlendMode = Cesium3DTileColorBlendMode.MIX;
            tileset.colorBlendAmount = 0.5;

            // Style with dark yellow. Expect color to be a mix of the source and style colors.
            tileset.style = new Cesium3DTileStyle({
                color : 'rgb(128, 128, 0)'
            });
            var mixRed;
            var mixGreen;
            expect(scene).toRenderAndCall(function(rgba) {
                mixRed = rgba[0];
                mixGreen = rgba[1];
                expect(rgba[0]).toBeGreaterThan(replaceRed);
                expect(rgba[0]).toBeLessThan(sourceRed);
                expect(rgba[1]).toBeGreaterThan(0);
                expect(rgba[1]).toBeLessThan(replaceGreen);
                expect(rgba[2]).toEqual(0);
                expect(rgba[3]).toEqual(255);
            });

            // Set colorBlendAmount to 0.25. Expect color to be closer to the source color.
            tileset.colorBlendAmount = 0.25;
            expect(scene).toRenderAndCall(function(rgba) {
                expect(rgba[0]).toBeGreaterThan(mixRed);
                expect(rgba[0]).toBeLessThan(sourceRed);
                expect(rgba[1]).toBeGreaterThan(0);
                expect(rgba[1]).toBeLessThan(mixGreen);
                expect(rgba[2]).toEqual(0);
                expect(rgba[3]).toEqual(255);
            });

            // Set colorBlendAmount to 0.0. Expect color to equal the source color
            tileset.colorBlendAmount = 0.0;
            expect(scene).toRenderAndCall(function(rgba) {
                expect(rgba[0]).toEqual(sourceRed);
                expect(rgba[1]).toEqual(0);
                expect(rgba[2]).toEqual(0);
                expect(rgba[3]).toEqual(255);
            });

            // Set colorBlendAmount to 1.0. Expect color to equal the style color
            tileset.colorBlendAmount = 1.0;
            expect(scene).toRenderAndCall(function(rgba) {
                expect(rgba[0]).toEqual(replaceRed);
                expect(rgba[1]).toEqual(replaceGreen);
                expect(rgba[2]).toEqual(0);
                expect(rgba[3]).toEqual(255);
            });

            // Style with yellow + alpha. Expect color to be a mix of the source and style colors.
            tileset.colorBlendAmount = 0.5;
            tileset.style = new Cesium3DTileStyle({
                color : 'rgba(255, 255, 0, 0.5)'
            });
            expect(scene).toRenderAndCall(function(rgba) {
                expect(rgba[0]).toBeGreaterThan(0);
                expect(rgba[1]).toBeGreaterThan(0);
                expect(rgba[2]).toEqual(0);
                expect(rgba[3]).toEqual(255);
            });
        });
    }

    it('sets colorBlendMode', function() {
        return testColorBlendMode(colorsUrl);
    });

    it('sets colorBlendMode when vertex texture fetch is not supported', function() {
        // Disable VTF
        var maximumVertexTextureImageUnits = ContextLimits.maximumVertexTextureImageUnits;
        ContextLimits._maximumVertexTextureImageUnits = 0;
        return testColorBlendMode(colorsUrl).then(function() {
            // Re-enable VTF
            ContextLimits._maximumVertexTextureImageUnits = maximumVertexTextureImageUnits;
        });
    });

    it('sets colorBlendMode for textured tileset', function() {
        return testColorBlendMode(texturedUrl);
    });

    it('sets colorBlendMode for instanced tileset', function() {
        var center = Cartesian3.fromRadians(centerLongitude, centerLatitude);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 30.0));
        return testColorBlendMode(instancedRedMaterialUrl);
    });

    ///////////////////////////////////////////////////////////////////////////
    // Cache replacement tests

    it('Unload all cached tiles not required to meet SSE', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            tileset.maximumNumberOfLoadedTiles = 1;

            // Render parent and four children (using additive refinement)
            viewAllTiles();
            scene.renderForSpecs();

            var stats = tileset._statistics;
            expect(stats.numberOfCommands).toEqual(5);
            expect(stats.numberContentReady).toEqual(5); // Five loaded tiles

            // Zoom out so only root tile is needed to meet SSE.  This unloads
            // the four children since the max number of loaded tiles is one.
            viewRootOnly();
            scene.renderForSpecs();

            expect(stats.numberOfCommands).toEqual(1);
            expect(stats.numberContentReady).toEqual(1);

            // Zoom back in so all four children are re-requested.
            viewAllTiles();

            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                scene.renderForSpecs();
                expect(stats.numberOfCommands).toEqual(5);
                expect(stats.numberContentReady).toEqual(5); // Five loaded tiles
            });
        });
    });

    it('Unload some cached tiles not required to meet SSE', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            tileset.maximumNumberOfLoadedTiles = 3;

            // Render parent and four children (using additive refinement)
            viewAllTiles();
            scene.renderForSpecs();

            var stats = tileset._statistics;
            expect(stats.numberOfCommands).toEqual(5);
            expect(stats.numberContentReady).toEqual(5); // Five loaded tiles

            // Zoom out so only root tile is needed to meet SSE.  This unloads
            // two of the four children so three tiles are still loaded (the
            // root and two children) since the max number of loaded tiles is three.
            viewRootOnly();
            scene.renderForSpecs();

            expect(stats.numberOfCommands).toEqual(1);
            expect(stats.numberContentReady).toEqual(3);

            // Zoom back in so the two children are re-requested.
            viewAllTiles();

            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                scene.renderForSpecs();
                expect(stats.numberOfCommands).toEqual(5);
                expect(stats.numberContentReady).toEqual(5); // Five loaded tiles
            });
        });
    });

    it('Unloads cached tiles outside of the view frustum', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            tileset.maximumNumberOfLoadedTiles = 0;

            scene.renderForSpecs();
            var stats = tileset._statistics;
            expect(stats.numberOfCommands).toEqual(5);
            expect(stats.numberContentReady).toEqual(5);

            // Orient camera to face the sky
            var center = Cartesian3.fromRadians(centerLongitude, centerLatitude, 100);
            scene.camera.lookAt(center, new HeadingPitchRange(0.0, 1.57, 10.0));

            // All tiles are unloaded
            scene.renderForSpecs();
            expect(stats.numberOfCommands).toEqual(0);
            expect(stats.numberContentReady).toEqual(0);

            // Reset camera so all tiles are reloaded
            viewAllTiles();

            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                scene.renderForSpecs();
                expect(stats.numberOfCommands).toEqual(5);
                expect(stats.numberContentReady).toEqual(5);
            });
        });
    });

    it('Unloads cached tiles in a tileset with external tileset.json', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetOfTilesetsUrl).then(function(tileset) {
            var stats = tileset._statistics;
            var replacementList = tileset._replacementList;

            tileset.maximumNumberOfLoadedTiles = 2;

            scene.renderForSpecs();
            expect(stats.numberOfCommands).toEqual(5);
            expect(stats.numberContentReady).toEqual(5);
            expect(replacementList.length - 1).toEqual(5); // Only tiles with content are on the replacement list. -1 for sentinel.

            // Zoom out so only root tile is needed to meet SSE.  This unloads
            // all tiles except the root and one of the b3dm children
            viewRootOnly();
            scene.renderForSpecs();

            expect(stats.numberOfCommands).toEqual(1);
            expect(stats.numberContentReady).toEqual(2);
            expect(replacementList.length - 1).toEqual(2);

            // Reset camera so all tiles are reloaded
            viewAllTiles();

            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                scene.renderForSpecs();
                expect(stats.numberOfCommands).toEqual(5);
                expect(stats.numberContentReady).toEqual(5);

                expect(replacementList.length - 1).toEqual(5);
            });
        });
    });

    it('Unloads cached tiles in a tileset with empty tiles', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetEmptyRootUrl).then(function(tileset) {
            var stats = tileset._statistics;

            tileset.maximumNumberOfLoadedTiles = 2;

            scene.renderForSpecs();
            expect(stats.numberOfCommands).toEqual(4);
            expect(stats.numberContentReady).toEqual(4); // 4 children with b3dm content (does not include empty root)

            // Orient camera to face the sky
            var center = Cartesian3.fromRadians(centerLongitude, centerLatitude, 100);
            scene.camera.lookAt(center, new HeadingPitchRange(0.0, 1.57, 10.0));

            // Unload tiles to meet cache size
            scene.renderForSpecs();
            expect(stats.numberOfCommands).toEqual(0);
            expect(stats.numberContentReady).toEqual(2); // 2 children with b3dm content (does not include empty root)

            // Reset camera so all tiles are reloaded
            viewAllTiles();

            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                scene.renderForSpecs();
                expect(stats.numberOfCommands).toEqual(4);
                expect(stats.numberContentReady).toEqual(4);
            });
        });
    });

    it('Unload cached tiles when a tileset uses replacement refinement', function() {
        // No children have content, but all grandchildren have content
        //
        //          C
        //      E       E
        //    C   C   C   C
        //
        return Cesium3DTilesTester.loadTileset(scene, tilesetReplacement1Url).then(function(tileset) {
            tileset.maximumNumberOfLoadedTiles = 1;

            // Render parent and four children (using additive refinement)
            viewAllTiles();
            scene.renderForSpecs();

            var stats = tileset._statistics;
            expect(stats.numberOfCommands).toEqual(4); // 4 grandchildren. Root is replaced.
            expect(stats.numberContentReady).toEqual(5); // Root + four grandchildren (does not include empty children)

            // Zoom out so only root tile is needed to meet SSE.  This unloads
            // all grandchildren since the max number of loaded tiles is one.
            viewRootOnly();
            scene.renderForSpecs();

            expect(stats.numberOfCommands).toEqual(1);
            expect(stats.numberContentReady).toEqual(1);

            // Zoom back in so the four children are re-requested.
            viewAllTiles();

            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                scene.renderForSpecs();
                expect(stats.numberOfCommands).toEqual(4);
                expect(stats.numberContentReady).toEqual(5);
            });
        });
    });

    it('Explicitly unloads cached tiles with trimLoadedTiles', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            tileset.maximumNumberOfLoadedTiles = 5;

            // Render parent and four children (using additive refinement)
            viewAllTiles();
            scene.renderForSpecs();

            var stats = tileset._statistics;
            expect(stats.numberOfCommands).toEqual(5);
            expect(stats.numberContentReady).toEqual(5); // Five loaded tiles

            // Zoom out so only root tile is needed to meet SSE.  The children
            // are not unloaded since max number of loaded tiles is five.
            viewRootOnly();
            scene.renderForSpecs();

            expect(stats.numberOfCommands).toEqual(1);
            expect(stats.numberContentReady).toEqual(5);

            tileset.trimLoadedTiles();
            scene.renderForSpecs();

            expect(stats.numberOfCommands).toEqual(1);
            expect(stats.numberContentReady).toEqual(1);
        });
    });

    it('tileUnload event is raised', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            tileset.maximumNumberOfLoadedTiles = 1;

            // Render parent and four children (using additive refinement)
            viewAllTiles();
            scene.renderForSpecs();

            var stats = tileset._statistics;
            expect(stats.numberOfCommands).toEqual(5);
            expect(stats.numberContentReady).toEqual(5); // Five loaded tiles

            // Zoom out so only root tile is needed to meet SSE.  All the
            // children are unloaded since max number of loaded tiles is one.
            viewRootOnly();
            var spyUpdate = jasmine.createSpy('listener');
            tileset.tileUnload.addEventListener(spyUpdate);
            scene.renderForSpecs();

            expect(tileset._root.visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
            expect(spyUpdate.calls.count()).toEqual(4);
            expect(spyUpdate.calls.argsFor(0)[0]).toBe(tileset._root.children[0]);
            expect(spyUpdate.calls.argsFor(1)[0]).toBe(tileset._root.children[1]);
            expect(spyUpdate.calls.argsFor(2)[0]).toBe(tileset._root.children[2]);
            expect(spyUpdate.calls.argsFor(3)[0]).toBe(tileset._root.children[3]);
        });
    });

    it('maximumNumberOfLoadedTiles throws when negative', function() {
        var tileset = new Cesium3DTileset({
            url : tilesetUrl
        });
        expect(function() {
            tileset.maximumNumberOfLoadedTiles = -1;
        }).toThrowDeveloperError();
    });

    it('maximumScreenSpaceError throws when negative', function() {
        var tileset = new Cesium3DTileset({
            url : tilesetUrl
        });
        expect(function() {
            tileset.maximumScreenSpaceError = -1;
        }).toThrowDeveloperError();
    });

    it('propagates tile transform down the tree', function() {
        var b3dmCommands = 1;
        var i3dmCommands = scene.context.instancedArrays ? 1 : 25; // When instancing is not supported there is one command per instance
        var totalCommands = b3dmCommands + i3dmCommands;
        return Cesium3DTilesTester.loadTileset(scene, tilesetWithTransformsUrl).then(function(tileset) {
            scene.renderForSpecs();
            var stats = tileset._statistics;
            var root = tileset._root;
            var rootTransform = Matrix4.unpack(root._header.transform);

            var child = root.children[0];
            var childTransform = Matrix4.unpack(child._header.transform);
            var computedTransform = Matrix4.multiply(rootTransform, childTransform, new Matrix4());

            expect(stats.numberOfCommands).toBe(totalCommands);
            expect(root.computedTransform).toEqual(rootTransform);
            expect(child.computedTransform).toEqual(computedTransform);

            // Set the tileset's modelMatrix
            var tilesetTransform = Matrix4.fromTranslation(new Cartesian3(0.0, 1.0, 0.0));
            tileset.modelMatrix = tilesetTransform;
            computedTransform = Matrix4.multiply(tilesetTransform, computedTransform, computedTransform);
            scene.renderForSpecs();
            expect(child.computedTransform).toEqual(computedTransform);

            // Set the modelMatrix somewhere off screen
            tileset.modelMatrix = Matrix4.fromTranslation(new Cartesian3(0.0, 100000.0, 0.0));
            scene.renderForSpecs();
            expect(stats.numberOfCommands).toBe(0);

            // Now bring it back
            tileset.modelMatrix = Matrix4.IDENTITY;
            scene.renderForSpecs();
            expect(stats.numberOfCommands).toBe(totalCommands);

            // Do the same steps for a tile transform
            child.transform = Matrix4.fromTranslation(new Cartesian3(0.0, 100000.0, 0.0));
            scene.renderForSpecs();
            expect(stats.numberOfCommands).toBe(1);
            child.transform = Matrix4.IDENTITY;
            scene.renderForSpecs();
            expect(stats.numberOfCommands).toBe(totalCommands);
        });
    });

}, 'WebGL');
