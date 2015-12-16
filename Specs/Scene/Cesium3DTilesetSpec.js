/*global defineSuite*/
defineSuite([
        'Scene/Cesium3DTileset',
        'Core/Cartesian3',
        'Core/defined',
        'Core/HeadingPitchRange',
        'Scene/Cesium3DTile',
        'Scene/Cesium3DTileContentState',
        'Scene/Cesium3DTileRefine',
        'Scene/CullingVolume',
        'Specs/Cesium3DTilesTester',
        'Specs/createScene',
        'ThirdParty/when'
    ], function(
        Cesium3DTileset,
        Cartesian3,
        defined,
        HeadingPitchRange,
        Cesium3DTile,
        Cesium3DTileContentState,
        Cesium3DTileRefine,
        CullingVolume,
        Cesium3DTilesTester,
        createScene,
        when) {
    "use strict";

    var scene;
    var centerLongitude = -1.31995;
    var centerLatitude = 0.69871;

    // Parent tile with content and four child tiles with content
    var tilesetUrl = './Data/Cesium3DTiles/Tilesets/Tileset/';

    // One child points to and invalid url
    var tilesetInvalidUrl = './Data/Cesium3DTiles/Tilesets/TilesetInvalid/';

    // Parent tile with no content and four child tiles with content
    var tilesetEmptyRootUrl = './Data/Cesium3DTiles/Tilesets/TilesetEmptyRoot/';

    // Same formation as tilesetUrl, but with multiple tiles.json files
    // tiles.json : root content points to tiles2.json
    // tiles2.json: three children with b3dm content, one child points to tiles3.json
    // tiles3.json: root with b3dm content
    var tilesetOfTilesetsUrl = './Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/';

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        viewAllTiles();
    });

    afterEach(function() {
        // Wait for any pending requests to complete before ending each test
        var promises = [];
        var length = scene.primitives.length;
        for (var i = 0; i < length; ++i) {
            var tileset = scene.primitives.get(i);
            promises.push(Cesium3DTilesTester.waitForPendingRequests(scene, tileset));
        }
        return when.all(promises, function() {
            scene.primitives.removeAll();
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

    it('rejects readyPromise with invalid tiles.json', function() {
        var tileset = new Cesium3DTileset({
            url : 'invalid'
        });
        return tileset.readyPromise.then(function(tileset) {
            fail('should not resolve');
        }).otherwise(function(error) {
            expect(tileset.ready).toEqual(false);
            expect(error.statusCode).toEqual(404);
        });
    });

    it('resolves readyPromise', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            return tileset.readyPromise.then(function(tileset) {
                expect(tileset.ready).toEqual(true);
            });
        });
    });

    it('loads tiles.json', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            var properties = tileset.properties;
            expect(properties).toBeDefined();
            expect(properties.id).toBeDefined();
            expect(tileset._geometricError).toEqual(240.0);
            expect(tileset._root).toBeDefined();
            expect(tileset.url).toEqual(tilesetUrl);
        });
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

            return Cesium3DTilesTester.waitForPendingRequests(scene, tileset).then(function() {
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

        return tileset.readyPromise.then(function(tileset) {
            // Verify initial values
            var stats = tileset._statistics;
            expect(stats.visited).toEqual(0);
            expect(stats.numberOfCommands).toEqual(0);
            expect(stats.numberOfPendingRequests).toEqual(0);
            expect(stats.numberProcessing).toEqual(0);

            // Update and check that root tile is requested
            scene.renderForSpecs();
            expect(stats.visited).toEqual(0);
            expect(stats.numberOfCommands).toEqual(0);
            expect(stats.numberOfPendingRequests).toEqual(1);
            expect(stats.numberProcessing).toEqual(0);

            // Update again and check that child tiles are now requested
            scene.renderForSpecs();
            expect(stats.visited).toEqual(1); // Root is visited
            expect(stats.numberOfCommands).toEqual(0);
            expect(stats.numberOfPendingRequests).toEqual(5);
            expect(stats.numberProcessing).toEqual(0);

            // Wait for all tiles to load and check that they are all visited and rendered
            return Cesium3DTilesTester.waitForPendingRequests(scene, tileset).then(function() {
                scene.renderForSpecs();
                expect(stats.visited).toEqual(5);
                expect(stats.numberOfCommands).toEqual(5);
                expect(stats.numberOfPendingRequests).toEqual(0);
                expect(stats.numberProcessing).toEqual(0);
            });
        });
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
            expect(stats.visited).toEqual(1); // Visits the root, but stops early
            expect(stats.numberOfCommands).toEqual(0);
            expect(tileset._root.visibility(scene.frameState.cullingVolume)).toEqual(CullingVolume.MASK_OUTSIDE);
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
            tileset._root._contentsOrientedBoundingBox = undefined;
            scene.renderForSpecs();
            expect(stats.visited).toEqual(2);
            expect(stats.numberOfCommands).toEqual(2);
        });
    });

    it('additive refinement - selects root when sse is met', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            tileset._root.refine = Cesium3DTileRefine.ADD;

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
            tileset._root.refine = Cesium3DTileRefine.ADD;

            // Does not meet screen space error, all tiles are visible
            viewAllTiles();
            scene.renderForSpecs();

            var stats = tileset._statistics;
            expect(stats.visited).toEqual(5);
            expect(stats.numberOfCommands).toEqual(5);
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

    it('loads tileset with external tiles.json', function() {
        // Set view so that no tiles are loaded initially
        viewNothing();

        return Cesium3DTilesTester.loadTileset(scene, tilesetOfTilesetsUrl).then(function(tileset) {
            // Root points to an external tiles.json and has no children until it is requested
            var root = tileset._root;
            expect(root.hasTilesetContent).toEqual(true);
            expect(root.children.length).toEqual(0);

            // Set view so that root's content is requested
            viewRootOnly();
            scene.renderForSpecs();
            return root.readyPromise.then(function() {
                // Root has one child now, the root of the external tileset
                expect(root.children.length).toEqual(1);

                // Check that headers are equal
                var subtreeRoot = root.children[0];
                expect(root.geometricError).toEqual(subtreeRoot.geometricError);
                expect(root.refine).toEqual(subtreeRoot.refine);
                expect(root._tileBoundingBox).toEqual(subtreeRoot._tileBoundingBox);

                // Check that Subtree root has 4 children
                expect(subtreeRoot.hasTilesetContent).toEqual(false);
                expect(subtreeRoot.children.length).toEqual(4);
            });
        });
    });

    it('renders tileset with external tiles.json', function() {
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

    it('debugShowStatistics', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            tileset.debugShowStatistics = true;
            scene.renderForSpecs();
            // TODO : not sure how to test this
        });
    });

    it('does not request tiles when out of core', function() {
        viewNothing();
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            viewRootOnly();
            scene.pickForSpecs();
            expect(tileset._statistics.numberOfPendingRequests).toEqual(0);
            scene.renderForSpecs();
            expect(tileset._statistics.numberOfPendingRequests).toEqual(1);
        });
    });

    it('does not process tiles when out of core', function() {
        var spy = spyOn(Cesium3DTile.prototype, 'process').and.callThrough();

        viewNothing();
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            viewRootOnly();
            scene.renderForSpecs(); // Request root
            expect(tileset._statistics.numberOfPendingRequests).toEqual(1);
            return tileset._root.processingPromise.then(function() {
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
        });
    });

    it('load progress events are raised', function() {
        // [numberOfPendingRequests, numberProcessing]
        var results = [
            [1, 0],
            [0, 1],
            [0, 0]
        ];
        var i = 0;

        viewNothing();
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            tileset.loadProgress.addEventListener(function(numberOfPendingRequests, numberProcessing) {
                var expected = results[i++];
                expect(numberOfPendingRequests).toEqual(expected[0]);
                expect(numberProcessing).toEqual(expected[1]);
            });
            viewRootOnly();
            scene.renderForSpecs();
            return Cesium3DTilesTester.waitForPendingRequests(scene, tileset);
        });
    });

    it('tile visible event is raised', function() {
        viewRootOnly();
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            tileset.tileVisible.addEventListener(function(tile) {
                expect(tile).toBe(tileset._root);
                expect(tileset._root.visibility(scene.frameState.cullingVolume)).not.toEqual(CullingVolume.MASK_OUTSIDE);
            });

            scene.renderForSpecs();
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

    it('destroys before loadTilesJson finishes', function() {
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : tilesetUrl
        }));
        scene.primitives.remove(tileset);
        // TODO : hard to test this one (check that promise never resolves or rejects?)
        // Should destroy function reject ready promise?
    });

    it('destroys before external tiles.json finishes loading', function() {
        viewNothing();
        return Cesium3DTilesTester.loadTileset(scene, tilesetOfTilesetsUrl).then(function(tileset) {
            var root = tileset._root;

            viewRootOnly();
            scene.renderForSpecs(); // Request external tiles.json

            var stats = tileset._statistics;
            expect(stats.numberOfPendingRequests).toEqual(1);
            scene.primitives.remove(tileset);

            return root.readyPromise.then(function(root) {
                fail('should not resolve');
            }).otherwise(function(error) {
                // Expect the root to not have added any children from the external tiles.json
                expect(root.children.length).toEqual(0);
                // TODO : check that request scheduler is empty
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

            return root.readyPromise.then(function(root) {
                fail('should not resolve');
            }).otherwise(function(error) {
                expect(content.state).toEqual(Cesium3DTileContentState.FAILED);
                // TODO : check that request schedule is empty
            });
        });
    });

}, 'WebGL');
