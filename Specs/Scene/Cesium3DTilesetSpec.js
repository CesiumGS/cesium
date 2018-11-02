defineSuite([
        'Scene/Cesium3DTileset',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Color',
        'Core/defined',
        'Core/CullingVolume',
        'Core/getAbsoluteUri',
        'Core/getStringFromTypedArray',
        'Core/HeadingPitchRange',
        'Core/Intersect',
        'Core/JulianDate',
        'Core/Math',
        'Core/Matrix4',
        'Core/PerspectiveFrustum',
        'Core/PrimitiveType',
        'Core/RequestScheduler',
        'Core/Resource',
        'Core/Transforms',
        'Renderer/ClearCommand',
        'Renderer/ContextLimits',
        'Scene/Cesium3DTile',
        'Scene/Cesium3DTileColorBlendMode',
        'Scene/Cesium3DTileContentState',
        'Scene/Cesium3DTileRefine',
        'Scene/Cesium3DTileStyle',
        'Scene/ClippingPlane',
        'Scene/ClippingPlaneCollection',
        'Scene/CullFace',
        'Specs/Cesium3DTilesTester',
        'Specs/createScene',
        'Specs/pollToPromise',
        'ThirdParty/when'
    ], function(
        Cesium3DTileset,
        Cartesian2,
        Cartesian3,
        Color,
        defined,
        CullingVolume,
        getAbsoluteUri,
        getStringFromTypedArray,
        HeadingPitchRange,
        Intersect,
        JulianDate,
        CesiumMath,
        Matrix4,
        PerspectiveFrustum,
        PrimitiveType,
        RequestScheduler,
        Resource,
        Transforms,
        ClearCommand,
        ContextLimits,
        Cesium3DTile,
        Cesium3DTileColorBlendMode,
        Cesium3DTileContentState,
        Cesium3DTileRefine,
        Cesium3DTileStyle,
        ClippingPlane,
        ClippingPlaneCollection,
        CullFace,
        Cesium3DTilesTester,
        createScene,
        pollToPromise,
        when) {
    'use strict';

    var scene;
    var centerLongitude = -1.31968;
    var centerLatitude = 0.698874;

    // Parent tile with content and four child tiles with content
    var tilesetUrl = 'Data/Cesium3DTiles/Tilesets/Tileset/tileset.json';

    // Parent tile with no content and four child tiles with content
    var tilesetEmptyRootUrl = 'Data/Cesium3DTiles/Tilesets/TilesetEmptyRoot/tileset.json';

    var tilesetReplacement1Url = 'Data/Cesium3DTiles/Tilesets/TilesetReplacement1/tileset.json';
    var tilesetReplacement2Url = 'Data/Cesium3DTiles/Tilesets/TilesetReplacement2/tileset.json';
    var tilesetReplacement3Url = 'Data/Cesium3DTiles/Tilesets/TilesetReplacement3/tileset.json';

    // 3 level tree with mix of additive and replacement refinement
    var tilesetRefinementMix = 'Data/Cesium3DTiles/Tilesets/TilesetRefinementMix/tileset.json';

    // tileset.json : root content points to tiles2.json
    // tiles2.json: root with b3dm content, three children with b3dm content, one child points to tiles3.json
    // tiles3.json: root with b3dm content
    var tilesetOfTilesetsUrl = 'Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/tileset.json';

    var withoutBatchTableUrl = 'Data/Cesium3DTiles/Batched/BatchedWithoutBatchTable/tileset.json';
    var withBatchTableUrl = 'Data/Cesium3DTiles/Batched/BatchedWithBatchTable/tileset.json';
    var noBatchIdsUrl = 'Data/Cesium3DTiles/Batched/BatchedNoBatchIds/tileset.json';

    var withBatchTableHierarchyUrl = 'Data/Cesium3DTiles/Hierarchy/BatchTableHierarchy/tileset.json';

    var withTransformBoxUrl = 'Data/Cesium3DTiles/Batched/BatchedWithTransformBox/tileset.json';
    var withTransformSphereUrl = 'Data/Cesium3DTiles/Batched/BatchedWithTransformSphere/tileset.json';
    var withTransformRegionUrl = 'Data/Cesium3DTiles/Batched/BatchedWithTransformRegion/tileset.json';
    var withBoundingSphereUrl = 'Data/Cesium3DTiles/Batched/BatchedWithBoundingSphere/tileset.json';

    var compositeUrl = 'Data/Cesium3DTiles/Composite/Composite/tileset.json';
    var instancedUrl = 'Data/Cesium3DTiles/Instanced/InstancedWithBatchTable/tileset.json';
    var instancedRedMaterialUrl = 'Data/Cesium3DTiles/Instanced/InstancedRedMaterial/tileset.json';

    // 1 tile where each feature is a different source color
    var colorsUrl = 'Data/Cesium3DTiles/Batched/BatchedColors/tileset.json';

    // 1 tile where each feature has a reddish texture
    var texturedUrl = 'Data/Cesium3DTiles/Batched/BatchedTextured/tileset.json';

    // 1 tile with translucent features
    var translucentUrl = 'Data/Cesium3DTiles/Batched/BatchedTranslucent/tileset.json';

    // 1 tile with opaque and translucent features
    var translucentOpaqueMixUrl = 'Data/Cesium3DTiles/Batched/BatchedTranslucentOpaqueMix/tileset.json';

    // Root tile is transformed from local space to wgs84, child tile is rotated, scaled, and translated locally
    var tilesetWithTransformsUrl = 'Data/Cesium3DTiles/Tilesets/TilesetWithTransforms/tileset.json';

    // Root tile with 4 b3dm children and 1 pnts child with a viewer request volume
    var tilesetWithViewerRequestVolumeUrl = 'Data/Cesium3DTiles/Tilesets/TilesetWithViewerRequestVolume/tileset.json';

    // Parent tile with content and four child tiles with content with viewer request volume for each child
    var tilesetReplacementWithViewerRequestVolumeUrl = 'Data/Cesium3DTiles/Tilesets/TilesetReplacementWithViewerRequestVolume/tileset.json';

    var tilesetWithExternalResourcesUrl = 'Data/Cesium3DTiles/Tilesets/TilesetWithExternalResources/tileset.json';
    var tilesetUrlWithContentUri = 'Data/Cesium3DTiles/Batched/BatchedWithContentDataUri/tileset.json';

    var tilesetSubtreeExpirationUrl = 'Data/Cesium3DTiles/Tilesets/TilesetSubtreeExpiration/tileset.json';
    var tilesetSubtreeUrl = 'Data/Cesium3DTiles/Tilesets/TilesetSubtreeExpiration/subtree.json';
    var batchedExpirationUrl = 'Data/Cesium3DTiles/Batched/BatchedExpiration/tileset.json';
    var batchedColorsB3dmUrl = 'Data/Cesium3DTiles/Batched/BatchedColors/batchedColors.b3dm';
    var batchedVertexColorsUrl = 'Data/Cesium3DTiles/Batched/BatchedWithVertexColors/tileset.json';

    var styleUrl = 'Data/Cesium3DTiles/Style/style.json';

    var pointCloudUrl = 'Data/Cesium3DTiles/PointCloud/PointCloudRGB/tileset.json';
    var pointCloudBatchedUrl = 'Data/Cesium3DTiles/PointCloud/PointCloudBatched/tileset.json';

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        RequestScheduler.clearForSpecs();
        scene.morphTo3D(0.0);

        var camera = scene.camera;
        camera.frustum = new PerspectiveFrustum();
        camera.frustum.aspectRatio = scene.drawingBufferWidth / scene.drawingBufferHeight;
        camera.frustum.fov = CesiumMath.toRadians(60.0);

        viewAllTiles();
    });

    afterEach(function() {
        scene.primitives.removeAll();
    });

    function setZoom(distance) {
        // Bird's eye view
        var center = Cartesian3.fromRadians(centerLongitude, centerLatitude);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, distance));
    }

    function viewAllTiles() {
        setZoom(15.0);
    }

    function viewRootOnly() {
        setZoom(100.0);
    }

    function viewNothing() {
        setZoom(200.0);
    }

    function viewSky() {
        var center = Cartesian3.fromRadians(centerLongitude, centerLatitude, 100);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, 1.57, 10.0));
    }

    function viewBottomLeft() {
        viewAllTiles();
        scene.camera.moveLeft(200.0);
        scene.camera.moveDown(200.0);
    }

    function viewInstances() {
        setZoom(30.0);
    }

    function viewPointCloud() {
        setZoom(5.0);
    }

    function isSelected(tileset, tile) {
        return tileset._selectedTiles.indexOf(tile) > -1;
    }

    it('throws with undefined url', function() {
        expect(function() {
            return new Cesium3DTileset();
        }).toThrowDeveloperError();
    });

    it('rejects readyPromise with invalid tileset JSON fiile', function() {
        spyOn(Resource._Implementations, 'loadWithXhr').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            deferred.reject();
        });

        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : 'invalid.json'
        }));
        return tileset.readyPromise.then(function() {
            fail('should not resolve');
        }).otherwise(function(error) {
            expect(tileset.ready).toEqual(false);
        });
    });

    it('loads json with static loadJson method', function() {
        var tilesetJson = {
            asset : {
                version : 2.0
            }
        };

        var uri = 'data:text/plain;base64,' + btoa(JSON.stringify(tilesetJson));

        Cesium3DTileset.loadJson(uri).then(function(result) {
            expect(result).toEqual(tilesetJson);
        }).otherwise(function(error) {
            fail('should not fail');
        });
    });

    it('static method loadJson is used in Cesium3DTileset constructor', function() {
        var path = 'Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/tileset.json';

        var originalLoadJson = Cesium3DTileset.loadJson;

        // override loadJson and replace incorrect url with correct url
        Cesium3DTileset.loadJson = function(tilesetUrl) {
            return originalLoadJson(path);
        };

        // setup tileset with invalid url (overridden loadJson should replace invalid url with correct url)
        var tileset = new Cesium3DTileset({
            url : 'invalid.json'
        });

        // restore original version
        Cesium3DTileset.loadJson = originalLoadJson;

        return tileset.readyPromise.then(function() {
            expect(tileset.ready).toEqual(true);
        }).otherwise(function(error) {
            fail('should not fail');
        });
    });

    it('Constructor works with promise to resource', function() {
        var resource = new Resource({
            url: 'Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/tileset.json'
        });

        // setup tileset with invalid url (overridden loadJson should replace invalid url with correct url)
        var tileset = new Cesium3DTileset({
            url : when.resolve(resource)
        });

        return tileset.readyPromise.then(function() {
            expect(tileset.ready).toEqual(true);
        }).otherwise(function(error) {
            fail('should not fail');
        });
    });

    it('Constructor works with file resource', function() {
        var resource = new Resource({
            url: 'Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/tileset.json'
        });

        // setup tileset with invalid url (overridden loadJson should replace invalid url with correct url)
        var tileset = new Cesium3DTileset({
            url : resource
        });

        return tileset.readyPromise.then(function() {
            expect(tileset.ready).toEqual(true);
        }).otherwise(function(error) {
            fail('should not fail');
        });
    });

     it('rejects readyPromise with invalid tileset version', function() {
        var tilesetJson = {
            asset : {
                version : 2.0
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

    it('url and tilesetUrl set up correctly given tileset JSON filepath', function() {
        var path = 'Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/tileset.json';
        var tileset = new Cesium3DTileset({
            url : path
        });
        expect(tileset.url).toEqual(path);
    });

    it('url and tilesetUrl set up correctly given path with query string', function() {
        var path = 'Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/tileset.json';
        var param = '?param1=1&param2=2';
        var tileset = new Cesium3DTileset({
            url : path + param
        });
        expect(tileset.url).toEqual(path + param);
    });

    it('resolves readyPromise', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            return tileset.readyPromise.then(function(tileset) {
                expect(tileset.ready).toEqual(true);
            });
        });
    });

    it('loads tileset JSON file', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            var asset = tileset.asset;
            expect(asset).toBeDefined();
            expect(asset.version).toEqual('1.0');
            expect(asset.tilesetVersion).toEqual('1.2.3');

            var properties = tileset.properties;
            expect(properties).toBeDefined();
            expect(properties.id).toBeDefined();
            expect(properties.id.minimum).toEqual(0);
            expect(properties.id.maximum).toEqual(9);

            expect(tileset._geometricError).toEqual(240.0);
            expect(tileset.root).toBeDefined();
            expect(tileset.url).toEqual(tilesetUrl);
        });
    });

    it('loads tileset with extras', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            expect(tileset.extras).toEqual({ 'name': 'Sample Tileset' });
            expect(tileset.root.extras).toBeUndefined();

            var length = tileset.root.children.length;
            var taggedChildren = 0;
            for (var i = 0; i < length; ++i) {
                if (defined(tileset.root.children[i].extras)) {
                    expect(tileset.root.children[i].extras).toEqual({ 'id': 'Special Tile' });
                    ++taggedChildren;
                }
            }

            expect(taggedChildren).toEqual(1);
        });
    });

    it('gets root tile', function() {
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : tilesetUrl
        }));
        expect(function() {
            return tileset.root;
        }).toThrowDeveloperError();
        return tileset.readyPromise.then(function() {
            expect(tileset.root).toBeDefined();
        });
    });

    it('hasExtension returns true if the tileset JSON file uses the specified extension', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableHierarchyUrl).then(function(tileset) {
            expect(tileset.hasExtension('3DTILES_batch_table_hierarchy')).toBe(true);
            expect(tileset.hasExtension('3DTILES_nonexistant_extension')).toBe(false);
        });
    });

    it('passes version in query string to tiles', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            expect(tileset.root.content._resource.url).toEqual(getAbsoluteUri(tilesetUrl.replace('tileset.json','parent.b3dm?v=1.2.3')));
        });
    });

    it('passes version in query string to all external resources', function() {
        // Spy on loadWithXhr so we can verify requested urls
        spyOn(Resource._Implementations, 'loadWithXhr').and.callThrough();

        var queryParams = '?a=1&b=boy';
        var queryParamsWithVersion = '?a=1&b=boy&v=1.2.3';
        return Cesium3DTilesTester.loadTileset(scene, tilesetWithExternalResourcesUrl + queryParams).then(function(tileset) {
            var calls = Resource._Implementations.loadWithXhr.calls.all();
            var callsLength = calls.length;
            for (var i = 0; i < callsLength; ++i) {
                var url = calls[0].args[0];
                if (url.indexOf(tilesetWithExternalResourcesUrl) >= 0) {
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

    it('throws when getting extras and tileset is not ready', function() {
        var tileset = new Cesium3DTileset({
            url : tilesetUrl
        });
        expect(function() {
            return tileset.extras;
        }).toThrowDeveloperError();
    });

    it('requests tile with invalid magic', function() {
        var invalidMagicBuffer = Cesium3DTilesTester.generateBatchedTileBuffer({
            magic : [120, 120, 120, 120]
        });
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : tilesetUrl
        }));
        return tileset.readyPromise.then(function(tileset) {
            // Start spying after the tileset json has been loaded
            spyOn(Resource._Implementations, 'loadWithXhr').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                deferred.resolve(invalidMagicBuffer);
            });
            scene.renderForSpecs(); // Request root
            var root = tileset.root;
            return root.contentReadyPromise.then(function() {
                fail('should not resolve');
            }).otherwise(function(error) {
                expect(error.message).toBe('Invalid tile content.');
                expect(root._contentState).toEqual(Cesium3DTileContentState.FAILED);
            });
        });
    });

    it('handles failed tile requests', function() {
        viewRootOnly();
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : tilesetUrl
        }));
        return tileset.readyPromise.then(function(tileset) {
            // Start spying after the tileset json has been loaded
            spyOn(Resource._Implementations, 'loadWithXhr').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                deferred.reject();
            });
            scene.renderForSpecs(); // Request root
            var root = tileset.root;
            return root.contentReadyPromise.then(function() {
                fail('should not resolve');
            }).otherwise(function(error) {
                expect(root._contentState).toEqual(Cesium3DTileContentState.FAILED);
                var statistics = tileset.statistics;
                expect(statistics.numberOfAttemptedRequests).toBe(0);
                expect(statistics.numberOfPendingRequests).toBe(0);
                expect(statistics.numberOfTilesProcessing).toBe(0);
                expect(statistics.numberOfTilesWithContentReady).toBe(0);
            });
        });
    });

    it('handles failed tile processing', function() {
        viewRootOnly();
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : tilesetUrl
        }));
        return tileset.readyPromise.then(function(tileset) {
            // Start spying after the tileset json has been loaded
            spyOn(Resource._Implementations, 'loadWithXhr').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                deferred.resolve(Cesium3DTilesTester.generateBatchedTileBuffer({
                    version : 0 // Invalid version
                }));
            });
            scene.renderForSpecs(); // Request root
            var root = tileset.root;
            return root.contentReadyPromise.then(function() {
                fail('should not resolve');
            }).otherwise(function(error) {
                expect(root._contentState).toEqual(Cesium3DTileContentState.FAILED);
                var statistics = tileset.statistics;
                expect(statistics.numberOfAttemptedRequests).toBe(0);
                expect(statistics.numberOfPendingRequests).toBe(0);
                expect(statistics.numberOfTilesProcessing).toBe(0);
                expect(statistics.numberOfTilesWithContentReady).toBe(0);
            });
        });
    });

    it('renders tileset', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            var statistics = tileset._statistics;
            expect(statistics.visited).toEqual(5);
            expect(statistics.numberOfCommands).toEqual(5);
        });
    });

    it('renders tileset in CV', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            scene.morphToColumbusView(0.0);
            scene.renderForSpecs();
            var statistics = tileset._statistics;
            expect(statistics.visited).toEqual(5);
            expect(statistics.numberOfCommands).toEqual(5);
        });
    });

    it('renders tileset in 2D', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            scene.morphTo2D(0.0);
            tileset.maximumScreenSpaceError = 3;
            scene.renderForSpecs();
            var statistics = tileset._statistics;
            expect(statistics.visited).toEqual(5);
            expect(statistics.numberOfCommands).toEqual(10);
        });
    });

    it('does not render during morph', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            var commandList = scene.frameState.commandList;
            scene.renderForSpecs();
            expect(commandList.length).toBeGreaterThan(0);
            scene.morphToColumbusView(1.0);
            scene.renderForSpecs();
            expect(commandList.length).toBe(0);
        });
    });

    it('renders tileset with empty root tile', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetEmptyRootUrl).then(function(tileset) {
            var statistics = tileset._statistics;
            expect(statistics.visited).toEqual(5);
            expect(statistics.numberOfCommands).toEqual(4); // Empty tile doesn't issue a command
        });
    });

    it('verify statistics', function() {
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : tilesetUrl
        }));

        // Verify initial values
        var statistics = tileset._statistics;
        expect(statistics.visited).toEqual(0);
        expect(statistics.numberOfCommands).toEqual(0);
        expect(statistics.numberOfPendingRequests).toEqual(0);
        expect(statistics.numberOfTilesProcessing).toEqual(0);

        return Cesium3DTilesTester.waitForReady(scene, tileset).then(function() {
            // Check that root and children are requested
            expect(statistics.visited).toEqual(5);
            expect(statistics.numberOfCommands).toEqual(0);
            expect(statistics.numberOfPendingRequests).toEqual(5);
            expect(statistics.numberOfTilesProcessing).toEqual(0);

            // Wait for all tiles to load and check that they are all visited and rendered
            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                expect(statistics.visited).toEqual(5);
                expect(statistics.numberOfCommands).toEqual(5);
                expect(statistics.numberOfPendingRequests).toEqual(0);
                expect(statistics.numberOfTilesProcessing).toEqual(0);
            });
        });
    });

    function checkPointAndFeatureCounts(tileset, features, points, triangles) {
        var statistics = tileset._statistics;

        expect(statistics.numberOfFeaturesSelected).toEqual(0);
        expect(statistics.numberOfFeaturesLoaded).toEqual(0);
        expect(statistics.numberOfPointsSelected).toEqual(0);
        expect(statistics.numberOfPointsLoaded).toEqual(0);
        expect(statistics.numberOfTrianglesSelected).toEqual(0);

        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
            expect(statistics.numberOfFeaturesSelected).toEqual(features);
            expect(statistics.numberOfFeaturesLoaded).toEqual(features);
            expect(statistics.numberOfPointsSelected).toEqual(points);
            expect(statistics.numberOfPointsLoaded).toEqual(points);
            expect(statistics.numberOfTrianglesSelected).toEqual(triangles);

            viewNothing();
            scene.renderForSpecs();

            expect(statistics.numberOfFeaturesSelected).toEqual(0);
            expect(statistics.numberOfFeaturesLoaded).toEqual(features);
            expect(statistics.numberOfPointsSelected).toEqual(0);
            expect(statistics.numberOfPointsLoaded).toEqual(points);
            expect(statistics.numberOfTrianglesSelected).toEqual(0);

            tileset.trimLoadedTiles();
            scene.renderForSpecs();

            expect(statistics.numberOfFeaturesSelected).toEqual(0);
            expect(statistics.numberOfFeaturesLoaded).toEqual(0);
            expect(statistics.numberOfPointsSelected).toEqual(0);
            expect(statistics.numberOfPointsLoaded).toEqual(0);
            expect(statistics.numberOfTrianglesSelected).toEqual(0);
        });
    }

    it('verify batched features statistics', function() {
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : withBatchTableUrl
        }));

        return checkPointAndFeatureCounts(tileset, 10, 0, 120);
    });

    it('verify no batch table features statistics', function() {
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : noBatchIdsUrl
        }));

        return checkPointAndFeatureCounts(tileset, 0, 0, 120);
    });

    it('verify instanced features statistics', function() {
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : instancedRedMaterialUrl
        }));

        return checkPointAndFeatureCounts(tileset, 25, 0, 12);
    });

    it('verify composite features statistics', function() {
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : compositeUrl
        }));

        return checkPointAndFeatureCounts(tileset, 35, 0, 132);
    });

    it('verify tileset of tilesets features statistics', function() {
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : tilesetOfTilesetsUrl
        }));

        return checkPointAndFeatureCounts(tileset, 50, 0, 600);
    });

    it('verify points statistics', function() {
        viewPointCloud();

        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : pointCloudUrl
        }));

        return checkPointAndFeatureCounts(tileset, 0, 1000, 0);
    });

    it('verify triangle statistics', function() {
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : tilesetEmptyRootUrl
        }));

        return checkPointAndFeatureCounts(tileset, 40, 0, 480);
    });

    it('verify batched points statistics', function() {
        viewPointCloud();

        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : pointCloudBatchedUrl
        }));

        return checkPointAndFeatureCounts(tileset, 8, 1000, 0);
    });

    it('verify memory usage statistics', function() {
        // Calculations in Batched3DModel3DTileContentSpec, minus uvs
        var singleTileGeometryMemory = 7440;
        var singleTileTextureMemory = 0;
        var singleTileBatchTextureMemory = 40;
        var singleTilePickTextureMemory = 40;
        var tilesLength = 5;

        viewNothing();
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            var statistics = tileset._statistics;

            // No tiles loaded
            expect(statistics.geometryByteLength).toEqual(0);
            expect(statistics.texturesByteLength).toEqual(0);
            expect(statistics.batchTableByteLength).toEqual(0);

            viewRootOnly();
            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                // Root tile loaded
                expect(statistics.geometryByteLength).toEqual(singleTileGeometryMemory);
                expect(statistics.texturesByteLength).toEqual(singleTileTextureMemory);
                expect(statistics.batchTableByteLength).toEqual(0);

                viewAllTiles();
                return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                    // All tiles loaded
                    expect(statistics.geometryByteLength).toEqual(singleTileGeometryMemory * tilesLength);
                    expect(statistics.texturesByteLength).toEqual(singleTileTextureMemory * tilesLength);
                    expect(statistics.batchTableByteLength).toEqual(0);

                    // One feature colored, the batch table memory is now higher
                    tileset.root.content.getFeature(0).color = Color.RED;
                    scene.renderForSpecs();
                    expect(statistics.geometryByteLength).toEqual(singleTileGeometryMemory * tilesLength);
                    expect(statistics.texturesByteLength).toEqual(singleTileTextureMemory * tilesLength);
                    expect(statistics.batchTableByteLength).toEqual(singleTileBatchTextureMemory);

                    // All tiles picked, the texture memory is now higher
                    scene.pickForSpecs();
                    expect(statistics.geometryByteLength).toEqual(singleTileGeometryMemory * tilesLength);
                    expect(statistics.texturesByteLength).toEqual(singleTileTextureMemory * tilesLength);
                    expect(statistics.batchTableByteLength).toEqual(singleTileBatchTextureMemory + singleTilePickTextureMemory * tilesLength);

                    // Tiles are still in memory when zoomed out
                    viewNothing();
                    scene.renderForSpecs();
                    expect(statistics.geometryByteLength).toEqual(singleTileGeometryMemory * tilesLength);
                    expect(statistics.texturesByteLength).toEqual(singleTileTextureMemory * tilesLength);
                    expect(statistics.batchTableByteLength).toEqual(singleTileBatchTextureMemory + singleTilePickTextureMemory * tilesLength);

                    // Trim loaded tiles, expect the memory statistics to be 0
                    tileset.trimLoadedTiles();
                    scene.renderForSpecs();
                    expect(statistics.geometryByteLength).toEqual(0);
                    expect(statistics.texturesByteLength).toEqual(0);
                    expect(statistics.batchTableByteLength).toEqual(0);
                });
            });
        });
    });

    it('verify memory usage statistics for shared resources', function() {
        // Six tiles total:
        // * Two b3dm tiles - no shared resources
        // * Two i3dm tiles with embedded glTF - no shared resources
        // * Two i3dm tiles with external glTF - shared resources
        // Expect to see some saving with memory usage since two of the tiles share resources
        // All tiles reference the same external texture but texture caching is not supported yet
        // TODO : tweak test when #5051 is in

        var b3dmGeometryMemory = 840; // Only one box in the tile, unlike most other test tiles
        var i3dmGeometryMemory = 840;

        // Texture is 128x128 RGBA bytes, not mipmapped
        var texturesByteLength = 65536;

        var expectedGeometryMemory = b3dmGeometryMemory * 2 + i3dmGeometryMemory * 3;
        var expectedTextureMemory = texturesByteLength * 5;

        return Cesium3DTilesTester.loadTileset(scene, tilesetWithExternalResourcesUrl).then(function(tileset) {
            var statistics = tileset._statistics;
            expect(statistics.geometryByteLength).toBe(expectedGeometryMemory);
            expect(statistics.texturesByteLength).toBe(expectedTextureMemory);
        });
    });

    it('does not process tileset when screen space error is not met', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            var statistics = tileset._statistics;
            expect(statistics.visited).toEqual(5);
            expect(statistics.numberOfCommands).toEqual(5);

            // Set zoom far enough away to not meet sse
            viewNothing();
            scene.renderForSpecs();
            expect(statistics.visited).toEqual(0);
            expect(statistics.numberOfCommands).toEqual(0);
        });
    });

    it('does not select tiles when outside of view frustum', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            var statistics = tileset._statistics;
            expect(statistics.visited).toEqual(5);
            expect(statistics.numberOfCommands).toEqual(5);

            viewSky();

            scene.renderForSpecs();
            expect(statistics.visited).toEqual(0);
            expect(statistics.numberOfCommands).toEqual(0);
            expect(tileset.root.visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).toEqual(CullingVolume.MASK_OUTSIDE);
        });
    });

    it('does not load additive tiles that are out of view', function() {
        viewBottomLeft();
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            var statistics = tileset._statistics;
            expect(statistics.numberOfTilesWithContentReady).toEqual(2);
        });
    });

    it('culls with content box', function() {
        // Root tile has a content box that is half the extents of its box
        // Expect to cull root tile and three child tiles
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            var statistics = tileset._statistics;
            expect(statistics.visited).toEqual(5);
            expect(statistics.numberOfCommands).toEqual(5);

            viewBottomLeft();
            scene.renderForSpecs();
            expect(statistics.visited).toEqual(2); // Visits root, but does not render it
            expect(statistics.numberOfCommands).toEqual(1);
            expect(tileset._selectedTiles[0]).not.toBe(tileset.root);

            // Set contents box to undefined, and now root won't be culled
            tileset.root._contentBoundingVolume = undefined;
            scene.renderForSpecs();
            expect(statistics.visited).toEqual(2);
            expect(statistics.numberOfCommands).toEqual(2);
        });
    });

    function findTileByUri(tiles, uri) {
        var length = tiles.length;
        for (var i = 0; i < length; ++i) {
            var tile = tiles[i];
            var contentHeader = tile._header.content;
            if (defined(contentHeader)) {
                if (contentHeader.uri.indexOf(uri) >= 0) {
                    return tile;
                }
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

            var root = tileset.root;
            var llTile = findTileByUri(root.children, 'll.b3dm');
            var lrTile = findTileByUri(root.children, 'lr.b3dm');
            var urTile = findTileByUri(root.children, 'ur.b3dm');
            var ulTile = findTileByUri(root.children, 'ul.b3dm');

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
            var statistics = tileset._statistics;

            // Horizon view, only root is visible
            var center = Cartesian3.fromRadians(centerLongitude, centerLatitude);
            scene.camera.lookAt(center, new HeadingPitchRange(0.0, 0.0, distance));

            // Set dynamic SSE to false (default)
            tileset.dynamicScreenSpaceError = false;
            scene.renderForSpecs();
            expect(statistics.visited).toEqual(1);
            expect(statistics.numberOfCommands).toEqual(1);

            // Set dynamic SSE to true, now the root is not rendered
            tileset.dynamicScreenSpaceError = true;
            tileset.dynamicScreenSpaceErrorDensity = 1.0;
            tileset.dynamicScreenSpaceErrorFactor = 10.0;
            scene.renderForSpecs();
            expect(statistics.visited).toEqual(0);
            expect(statistics.numberOfCommands).toEqual(0);
        });
    }

    function numberOfChildrenWithoutContent(tile) {
        var children = tile.children;
        var length = children.length;
        var count = 0;
        for (var i = 0; i < length; ++i) {
            var child = children[i];
            if (!child.contentReady) {
                ++count;
            }
        }
        return count;
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
        viewRootOnly();
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            // Meets screen space error, only root tile is rendered
            var statistics = tileset._statistics;
            expect(statistics.visited).toEqual(1);
            expect(statistics.numberOfCommands).toEqual(1);
        });
    });

    it('additive refinement - selects all tiles when sse is not met', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            // Does not meet screen space error, all tiles are visible
            var statistics = tileset._statistics;
            expect(statistics.visited).toEqual(5);
            expect(statistics.numberOfCommands).toEqual(5);
        });
    });

    it('additive refinement - use parent\'s geometric error on child\'s box for early refinement', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            var statistics = tileset._statistics;
            expect(statistics.visited).toEqual(5);
            expect(statistics.numberOfCommands).toEqual(5);

            // Both right tiles don't meet the SSE anymore
            scene.camera.moveLeft(50.0);
            scene.renderForSpecs();
            expect(statistics.visited).toEqual(3);
            expect(statistics.numberOfCommands).toEqual(3);
        });
    });

    it('additive refinement - selects tile when inside viewer request volume', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetWithViewerRequestVolumeUrl).then(function(tileset) {
            var statistics = tileset._statistics;
            // Force root tile to always not meet SSE since this is just checking the request volume
            tileset.maximumScreenSpaceError = 0.0;

            // Renders all 5 tiles
            setZoom(20.0);
            scene.renderForSpecs();
            expect(statistics.numberOfCommands).toEqual(5);

            // No longer renders the tile with a request volume
            setZoom(1500.0);
            scene.renderForSpecs();
            expect(statistics.numberOfCommands).toEqual(4);
        });
    });

    it('replacement refinement - selects root when sse is met', function() {
        viewRootOnly();
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            tileset.root.refine = Cesium3DTileRefine.REPLACE;

            // Meets screen space error, only root tile is rendered
            scene.renderForSpecs();

            var statistics = tileset._statistics;
            expect(statistics.visited).toEqual(1);
            expect(statistics.numberOfCommands).toEqual(1);
        });
    });

    it('replacement refinement - selects children when sse is not met', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            tileset.root.refine = Cesium3DTileRefine.REPLACE;

            // Does not meet screen space error, child tiles replace root tile
            scene.renderForSpecs();

            var statistics = tileset._statistics;
            expect(statistics.visited).toEqual(5); // Visits root, but does not render it
            expect(statistics.numberOfCommands).toEqual(4);
        });
    });

    it('replacement refinement - selects root when sse is not met and children are not ready', function() {
        viewRootOnly();
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            var root = tileset.root;
            root.refine = Cesium3DTileRefine.REPLACE;

            // Set zoom to start loading child tiles
            viewAllTiles();
            scene.renderForSpecs();

            var statistics = tileset._statistics;
            // LOD skipping visits all visible
            expect(statistics.visited).toEqual(5);
            // no stencil clear command because only the root tile
            expect(statistics.numberOfCommands).toEqual(1);
            expect(statistics.numberOfPendingRequests).toEqual(4);
            expect(numberOfChildrenWithoutContent(root)).toEqual(4);
        });
    });

    it('replacement refinement - selects tile when inside viewer request volume', function() {
        var options = {
            skipLevelOfDetail : false
        };
        return Cesium3DTilesTester.loadTileset(scene, tilesetWithViewerRequestVolumeUrl, options).then(function(tileset) {
            var statistics = tileset._statistics;

            var root = tileset.root;
            root.refine = Cesium3DTileRefine.REPLACE;
            root.hasEmptyContent = false; // mock content
            tileset.maximumScreenSpaceError = 0.0; // Force root tile to always not meet SSE since this is just checking the request volume

            // Renders all 5 tiles
            setZoom(20.0);
            scene.renderForSpecs();
            expect(statistics.numberOfCommands).toEqual(5);
            expect(isSelected(tileset, root)).toBe(false);

            // No longer renders the tile with a request volume
            setZoom(1500.0);
            scene.renderForSpecs();
            expect(statistics.numberOfCommands).toEqual(4);
            expect(isSelected(tileset, root)).toBe(true); // one child is no longer selected. root is chosen instead
        });
    });

    it('replacement refinement - selects upwards when traversal stops at empty tile', function() {
        // No children have content, but all grandchildren have content
        //
        //          C
        //      E       E
        //    C   C   C   C
        //
        return Cesium3DTilesTester.loadTileset(scene, tilesetReplacement1Url).then(function(tileset) {
            tileset.root.geometricError = 90;
            setZoom(80);
            scene.renderForSpecs();

            var statistics = tileset._statistics;
            expect(statistics.selected).toEqual(1);
            expect(statistics.visited).toEqual(3);
            expect(isSelected(tileset, tileset.root)).toBe(true);
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
            tileset.skipLevelOfDetail = false;
            viewAllTiles();
            scene.renderForSpecs();

            var statistics = tileset._statistics;
            var root = tileset.root;

            // Even though root's children are loaded, the grandchildren need to be loaded before it becomes refinable
            expect(numberOfChildrenWithoutContent(root)).toEqual(0); // Children are loaded
            expect(statistics.numberOfCommands).toEqual(1); // No stencil or backface commands; no mixed content
            expect(statistics.numberOfPendingRequests).toEqual(4); // Loading grandchildren

            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                scene.renderForSpecs();
                expect(statistics.numberOfCommands).toEqual(4); // Render children
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
            tileset.skipLevelOfDetail = false;
            var statistics = tileset._statistics;
            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                expect(statistics.numberOfCommands).toEqual(1);

                setZoom(5.0); // Zoom into the last tile, when it is ready the root is refinable
                scene.renderForSpecs();

                return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                    expect(statistics.numberOfCommands).toEqual(2); // Renders two content tiles
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
            tileset.skipLevelOfDetail = false;
            var statistics = tileset._statistics;
            var root = tileset.root;
            expect(statistics.numberOfCommands).toEqual(1);

            viewAllTiles();
            scene.renderForSpecs();
            return root.children[0].contentReadyPromise.then(function() {
                // The external tileset json is loaded, but the external tileset isn't.
                scene.renderForSpecs();
                expect(statistics.numberOfCommands).toEqual(1); // root
                expect(statistics.numberOfPendingRequests).toEqual(4); // Loading child content tiles

                return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                    expect(isSelected(tileset, root)).toEqual(false);
                    expect(statistics.numberOfCommands).toEqual(4); // Render child content tiles
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
            var statistics = tileset._statistics;
            expect(statistics.visited).toEqual(7);
            expect(statistics.numberOfCommands).toEqual(6);
        });
    });

    describe('children bound union optimization', function() {
        it('does not select visible tiles with invisible children', function() {
            return Cesium3DTilesTester.loadTileset(scene, tilesetReplacementWithViewerRequestVolumeUrl).then(function(tileset) {
                var center = Cartesian3.fromRadians(centerLongitude, centerLatitude, 22.0);
                scene.camera.lookAt(center, new HeadingPitchRange(0.0, 1.57, 1.0));

                var root = tileset.root;
                var childRoot = root.children[0];

                scene.renderForSpecs();

                expect(childRoot.visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);

                expect(childRoot.children[0].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).toEqual(CullingVolume.MASK_OUTSIDE);
                expect(childRoot.children[1].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).toEqual(CullingVolume.MASK_OUTSIDE);
                expect(childRoot.children[2].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).toEqual(CullingVolume.MASK_OUTSIDE);
                expect(childRoot.children[3].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).toEqual(CullingVolume.MASK_OUTSIDE);

                expect(tileset._selectedTiles.length).toEqual(0);
                expect(isSelected(tileset, childRoot)).toBe(false);
            });
        });

        it('does not select external tileset whose root has invisible children', function() {
            return Cesium3DTilesTester.loadTileset(scene, tilesetOfTilesetsUrl).then(function(tileset) {
                var center = Cartesian3.fromRadians(centerLongitude, centerLatitude, 50.0);
                scene.camera.lookAt(center, new HeadingPitchRange(0.0, 1.57, 1.0));
                var root = tileset.root;
                var externalRoot = root.children[0];
                externalRoot.refine = Cesium3DTileRefine.REPLACE;
                scene.renderForSpecs();

                expect(isSelected(tileset, root)).toBe(false);
                expect(isSelected(tileset, externalRoot)).toBe(false);
                expect(root._visible).toBe(false);
                expect(externalRoot._visible).toBe(false);
                expect(tileset.statistics.numberOfTilesCulledWithChildrenUnion).toBe(1);
            });
        });

        it('does not select visible tiles not meeting SSE with visible children', function() {
            return Cesium3DTilesTester.loadTileset(scene, tilesetReplacementWithViewerRequestVolumeUrl).then(function(tileset) {
                var root = tileset.root;
                var childRoot = root.children[0];
                childRoot.geometricError = 240;

                scene.renderForSpecs();

                expect(childRoot.visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);

                expect(childRoot.children[0].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
                expect(childRoot.children[1].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
                expect(childRoot.children[2].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
                expect(childRoot.children[3].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);

                expect(isSelected(tileset, childRoot)).toBe(false);
            });
        });

        it('does select visible tiles meeting SSE with visible children', function() {
            return Cesium3DTilesTester.loadTileset(scene, tilesetReplacementWithViewerRequestVolumeUrl).then(function(tileset) {
                var root = tileset.root;
                var childRoot = root.children[0];

                childRoot.geometricError = 0; // child root should meet SSE and children should not be drawn
                scene.renderForSpecs();
                // wait for load because geometric error has changed
                return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function(tileset) {
                    expect(childRoot.visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);

                    expect(childRoot.children[0].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
                    expect(childRoot.children[1].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
                    expect(childRoot.children[2].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
                    expect(childRoot.children[3].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);

                    expect(isSelected(tileset, childRoot)).toBe(true);
                });
            });
        });

        it('does select visible tiles with visible children failing request volumes', function() {
            var options = {
                cullWithChildrenBounds : false
            };
            viewRootOnly();
            return Cesium3DTilesTester.loadTileset(scene, tilesetReplacementWithViewerRequestVolumeUrl, options).then(function(tileset) {
                var root = tileset.root;
                var childRoot = root.children[0];

                expect(childRoot.visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);

                expect(childRoot.children[0].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
                expect(childRoot.children[1].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
                expect(childRoot.children[2].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
                expect(childRoot.children[3].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);

                expect(tileset._selectedTiles.length).toEqual(1);
                expect(isSelected(tileset, childRoot)).toBe(true);
            });
        });

        it('does select visible tiles with visible children passing request volumes', function() {
            return Cesium3DTilesTester.loadTileset(scene, tilesetReplacementWithViewerRequestVolumeUrl).then(function(tileset) {
                var root = tileset.root;
                var childRoot = root.children[0];
                childRoot.geometricError = 0;

                // wait for load because geometric error has changed
                return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function(tileset) {
                    expect(childRoot.visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);

                    expect(childRoot.children[0].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
                    expect(childRoot.children[1].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
                    expect(childRoot.children[2].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
                    expect(childRoot.children[3].visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);

                    expect(tileset._selectedTiles.length).toEqual(1);
                    expect(isSelected(tileset, childRoot)).toBe(true);

                    childRoot.geometricError = 200;
                    scene.renderForSpecs();
                    expect(tileset._selectedTiles.length).toEqual(4);
                    expect(isSelected(tileset, childRoot)).toBe(false);
                });
            });
        });
    });

    it('loads tileset with external tileset JSON file', function() {
        // Set view so that no tiles are loaded initially
        viewNothing();

        return Cesium3DTilesTester.loadTileset(scene, tilesetOfTilesetsUrl).then(function(tileset) {
            // Root points to an external tileset JSON file and has no children until it is requested
            var root = tileset.root;
            expect(root.children.length).toEqual(0);

            // Set view so that root's content is requested
            viewRootOnly();
            scene.renderForSpecs();
            return root.contentReadyPromise.then(function() {
                expect(root.hasTilesetContent).toEqual(true);

                // Root has one child now, the root of the external tileset
                expect(root.children.length).toEqual(1);

                // Check that headers are equal
                var subtreeRoot = root.children[0];
                expect(root.refine).toEqual(subtreeRoot.refine);
                expect(root.contentBoundingVolume.boundingVolume).toEqual(subtreeRoot.contentBoundingVolume.boundingVolume);

                // Check that subtree root has 4 children
                expect(subtreeRoot.hasTilesetContent).toEqual(false);
                expect(subtreeRoot.children.length).toEqual(4);
            });
        });
    });

    it('preserves query string with external tileset JSON file', function() {
        // Set view so that no tiles are loaded initially
        viewNothing();

        //Spy on loadWithXhr so we can verify requested urls
        spyOn(Resource._Implementations, 'loadWithXhr').and.callThrough();

        var queryParams = 'a=1&b=boy';
        var expectedUrl = 'Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/tileset.json?' + queryParams;
        return Cesium3DTilesTester.loadTileset(scene, tilesetOfTilesetsUrl + '?' + queryParams).then(function(tileset) {
            //Make sure tileset JSON file was requested with query parameters
            expect(Resource._Implementations.loadWithXhr.calls.argsFor(0)[0]).toEqual(expectedUrl);

            Resource._Implementations.loadWithXhr.calls.reset();

            // Set view so that root's content is requested
            viewRootOnly();
            scene.renderForSpecs();

            return tileset.root.contentReadyPromise;
        }).then(function() {
            //Make sure tileset2.json was requested with query parameters and does not use parent tilesetVersion
            expectedUrl = getAbsoluteUri('Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/tileset2.json?v=1.2.3&' + queryParams);
            expect(Resource._Implementations.loadWithXhr.calls.argsFor(0)[0]).toEqual(expectedUrl);
        });
    });

    it('renders tileset with external tileset JSON file', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetOfTilesetsUrl).then(function(tileset) {
            var statistics = tileset._statistics;
            expect(statistics.visited).toEqual(7); // Visits two tiles with tileset content, five tiles with b3dm content
            expect(statistics.numberOfCommands).toEqual(5); // Render the five tiles with b3dm content
        });
    });

    it('always visits external tileset root', function() {
        viewRootOnly();
        return Cesium3DTilesTester.loadTileset(scene, tilesetOfTilesetsUrl).then(function(tileset) {
            var statistics = tileset._statistics;
            expect(statistics.visited).toEqual(2); // Visits external tileset tile, and external tileset root
            expect(statistics.numberOfCommands).toEqual(1); // Renders external tileset root
        });
    });

    it('set tile color', function() {
        return Cesium3DTilesTester.loadTileset(scene, noBatchIdsUrl).then(function(tileset) {
            // Get initial color
            var color;
            Cesium3DTilesTester.expectRender(scene, tileset, function(rgba) {
                color = rgba;
            });

            // Check for color
            tileset.root.color = Color.RED;
            Cesium3DTilesTester.expectRender(scene, tileset, function(rgba) {
                expect(rgba).not.toEqual(color);
            });
        });
    });

    it('debugFreezeFrame', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            viewRootOnly();
            scene.renderForSpecs();
            var statistics = tileset._statistics;
            expect(statistics.visited).toEqual(1);
            expect(statistics.numberOfCommands).toEqual(1);

            tileset.debugFreezeFrame = true;
            viewAllTiles();
            scene.renderForSpecs();
            expect(statistics.visited).toEqual(0); // selectTiles returns early, so no tiles are visited
            expect(statistics.numberOfCommands).toEqual(1); // root tile is still in selectedTiles list
        });
    });

    function checkDebugColorizeTiles(url) {
        return Cesium3DTilesTester.loadTileset(scene, url).then(function(tileset) {
            // Get initial color
            var color;
            Cesium3DTilesTester.expectRender(scene, tileset, function(rgba) {
                color = rgba;
            });

            // Check for debug color
            tileset.debugColorizeTiles = true;
            Cesium3DTilesTester.expectRender(scene, tileset, function(rgba) {
                expect(rgba).not.toEqual(color);
            });

            // Check for original color
            tileset.debugColorizeTiles = false;
            Cesium3DTilesTester.expectRender(scene, tileset, function(rgba) {
                expect(rgba).toEqual(color);
            });
        });
    }

    it('debugColorizeTiles for b3dm with batch table', function() {
        return checkDebugColorizeTiles(withBatchTableUrl);
    });

    it('debugColorizeTiles for b3dm without batch table', function() {
        return checkDebugColorizeTiles(noBatchIdsUrl);
    });

    it('debugColorizeTiles for i3dm', function() {
        viewInstances();
        return checkDebugColorizeTiles(instancedUrl);
    });

    it('debugColorizeTiles for cmpt', function() {
        return checkDebugColorizeTiles(compositeUrl);
    });

    it('debugColorizeTiles for pnts with batch table', function() {
        viewPointCloud();
        return checkDebugColorizeTiles(pointCloudBatchedUrl);
    });

    it('debugColorizeTiles for pnts without batch table', function() {
        viewPointCloud();
        return checkDebugColorizeTiles(pointCloudUrl);
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
            var statistics = tileset._statistics;
            expect(statistics.visited).toEqual(1);
            expect(statistics.numberOfCommands).toEqual(2); // Tile command + bounding volume command

            tileset.debugShowBoundingVolume = false;
            scene.renderForSpecs();
            expect(statistics.numberOfCommands).toEqual(1);
        });
    });

    it('debugShowContentBoundingVolume', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            viewRootOnly();
            tileset.debugShowContentBoundingVolume = true;
            scene.renderForSpecs();
            var statistics = tileset._statistics;
            expect(statistics.visited).toEqual(1);
            expect(statistics.numberOfCommands).toEqual(2); // Tile command + bounding volume command

            tileset.debugShowContentBoundingVolume = false;
            scene.renderForSpecs();
            expect(statistics.numberOfCommands).toEqual(1);
        });
    });

    it('debugShowViewerRequestVolume', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetWithViewerRequestVolumeUrl).then(function(tileset) {
            tileset.debugShowViewerRequestVolume = true;
            scene.renderForSpecs();
            var statistics = tileset._statistics;
            expect(statistics.visited).toEqual(6); // 1 empty root tile + 4 b3dm tiles + 1 pnts tile
            expect(statistics.numberOfCommands).toEqual(6); // 5 tile commands + viewer request volume command

            tileset.debugShowViewerRequestVolume = false;
            scene.renderForSpecs();
            expect(statistics.numberOfCommands).toEqual(5);
        });
    });

    it('show tile debug labels with regions', function() {
        // tilesetUrl has bounding regions
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            tileset.debugShowGeometricError = true;
            scene.renderForSpecs();
            expect(tileset._tileDebugLabels).toBeDefined();
            expect(tileset._tileDebugLabels.length).toEqual(5);

            var root = tileset.root;
            expect(tileset._tileDebugLabels._labels[0].text).toEqual('Geometric error: ' + root.geometricError);
            expect(tileset._tileDebugLabels._labels[1].text).toEqual('Geometric error: ' + root.children[0].geometricError);
            expect(tileset._tileDebugLabels._labels[2].text).toEqual('Geometric error: ' + root.children[1].geometricError);
            expect(tileset._tileDebugLabels._labels[3].text).toEqual('Geometric error: ' + root.children[2].geometricError);
            expect(tileset._tileDebugLabels._labels[4].text).toEqual('Geometric error: ' + root.children[3].geometricError);

            tileset.debugShowGeometricError = false;
            scene.renderForSpecs();
            expect(tileset._tileDebugLabels).not.toBeDefined();
        });
    });

    it('show tile debug labels with boxes', function() {
        // tilesetWithTransformsUrl has bounding boxes
        return Cesium3DTilesTester.loadTileset(scene, tilesetWithTransformsUrl).then(function(tileset) {
            tileset.debugShowGeometricError = true;
            scene.renderForSpecs();
            expect(tileset._tileDebugLabels).toBeDefined();
            expect(tileset._tileDebugLabels.length).toEqual(2);

            var root = tileset.root;
            expect(tileset._tileDebugLabels._labels[0].text).toEqual('Geometric error: ' + root.geometricError);
            expect(tileset._tileDebugLabels._labels[1].text).toEqual('Geometric error: ' + root.children[0].geometricError);

            tileset.debugShowGeometricError = false;
            scene.renderForSpecs();
            expect(tileset._tileDebugLabels).not.toBeDefined();
        });
    });

    it('show tile debug labels with bounding spheres', function() {
        // tilesetWithViewerRequestVolumeUrl has bounding sphere
        return Cesium3DTilesTester.loadTileset(scene, tilesetWithViewerRequestVolumeUrl).then(function(tileset) {
            tileset.debugShowGeometricError = true;
            scene.renderForSpecs();

            var length = tileset._selectedTiles.length;
            expect(tileset._tileDebugLabels).toBeDefined();
            expect(tileset._tileDebugLabels.length).toEqual(length);

            for (var i = 0; i < length; ++i) {
                expect(tileset._tileDebugLabels._labels[i].text).toEqual('Geometric error: ' + tileset._selectedTiles[i].geometricError);
            }

            tileset.debugShowGeometricError = false;
            scene.renderForSpecs();
            expect(tileset._tileDebugLabels).not.toBeDefined();
        });
    });

    it('show tile debug labels with rendering statistics', function() {
        // tilesetUrl has bounding regions
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            tileset.debugShowRenderingStatistics = true;
            viewRootOnly();
            scene.renderForSpecs();
            expect(tileset._tileDebugLabels).toBeDefined();
            expect(tileset._tileDebugLabels.length).toEqual(1);

            var content = tileset.root.content;
            var expected = 'Commands: ' + tileset.root.commandsLength + '\n' +
                           'Triangles: ' + content.trianglesLength + '\n' +
                           'Features: ' + content.featuresLength;

            expect(tileset._tileDebugLabels._labels[0].text).toEqual(expected);

            tileset.debugShowRenderingStatistics = false;
            scene.renderForSpecs();
            expect(tileset._tileDebugLabels).not.toBeDefined();
        });
    });

    it('show tile debug labels with memory usage', function() {
        // tilesetUrl has bounding regions
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            tileset.debugShowMemoryUsage = true;
            viewRootOnly();
            scene.renderForSpecs();
            expect(tileset._tileDebugLabels).toBeDefined();
            expect(tileset._tileDebugLabels.length).toEqual(1);

            var expected = 'Texture Memory: 0\n' +
                           'Geometry Memory: 0.007';

            expect(tileset._tileDebugLabels._labels[0].text).toEqual(expected);

            tileset.debugShowMemoryUsage = false;
            scene.renderForSpecs();
            expect(tileset._tileDebugLabels).not.toBeDefined();
        });
    });

    it('show tile debug labels with all statistics', function() {
        // tilesetUrl has bounding regions
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            tileset.debugShowGeometricError = true;
            tileset.debugShowRenderingStatistics = true;
            tileset.debugShowMemoryUsage = true;
            tileset.debugShowUrl = true;
            viewRootOnly();
            scene.renderForSpecs();
            expect(tileset._tileDebugLabels).toBeDefined();

            var expected = 'Geometric error: 70\n' +
                           'Commands: 1\n' +
                           'Triangles: 120\n' +
                           'Features: 10\n' +
                           'Texture Memory: 0\n' +
                           'Geometry Memory: 0.007\n' +
                           'Url: parent.b3dm';
            expect(tileset._tileDebugLabels._labels[0].text).toEqual(expected);

            tileset.debugShowGeometricError = false;
            tileset.debugShowRenderingStatistics = false;
            tileset.debugShowMemoryUsage = false;
            tileset.debugShowUrl = false;
            scene.renderForSpecs();
            expect(tileset._tileDebugLabels).not.toBeDefined();
        });
    });

    it('show only picked tile debug label with all stats', function() {
        // tilesetUrl has bounding regions
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            tileset.debugShowGeometricError = true;
            tileset.debugShowRenderingStatistics = true;
            tileset.debugShowMemoryUsage = true;
            tileset.debugShowUrl = true;
            tileset.debugPickedTileLabelOnly = true;

            var scratchPosition = new Cartesian3(1.0, 1.0, 1.0);
            tileset.debugPickedTile = tileset.root;
            tileset.debugPickPosition = scratchPosition;

            scene.renderForSpecs();
            expect(tileset._tileDebugLabels).toBeDefined();

            var expected = 'Geometric error: 70\n' +
                           'Commands: 1\n' +
                           'Triangles: 120\n' +
                           'Features: 10\n' +
                           'Texture Memory: 0\n' +
                           'Geometry Memory: 0.007\n' +
                           'Url: parent.b3dm';
            expect(tileset._tileDebugLabels.get(0).text).toEqual(expected);
            expect(tileset._tileDebugLabels.get(0).position).toEqual(scratchPosition);

            tileset.debugPickedTile = undefined;
            scene.renderForSpecs();
            expect(tileset._tileDebugLabels.length).toEqual(0);
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
            return tileset.root.contentReadyToProcessPromise.then(function() {
                scene.pickForSpecs();
                expect(spy).not.toHaveBeenCalled();
                scene.renderForSpecs();
                expect(spy).toHaveBeenCalled();
            });
        });
    });

    it('does not request tiles when the request scheduler is full', function() {
        viewRootOnly(); // Root tiles are loaded initially
        var options = {
            skipLevelOfDetail : false
        };
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl, options).then(function(tileset) {
            // Try to load 4 children. Only 3 requests will go through, 1 will be attempted.
            var oldMaximumRequestsPerServer = RequestScheduler.maximumRequestsPerServer;
            RequestScheduler.maximumRequestsPerServer = 3;

            viewAllTiles();
            scene.renderForSpecs();

            expect(tileset._statistics.numberOfPendingRequests).toEqual(3);
            expect(tileset._statistics.numberOfAttemptedRequests).toEqual(1);

            RequestScheduler.maximumRequestsPerServer = oldMaximumRequestsPerServer;
        });
    });

    it('load progress events are raised', function() {
        // [numberOfPendingRequests, numberOfTilesProcessing]
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
        var spyUpdate1 = jasmine.createSpy('listener');
        var spyUpdate2 = jasmine.createSpy('listener');
        viewRootOnly();
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : tilesetUrl
        }));
        tileset.allTilesLoaded.addEventListener(spyUpdate1);
        tileset.initialTilesLoaded.addEventListener(spyUpdate2);
        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
            viewAllTiles();
            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                expect(spyUpdate1.calls.count()).toEqual(2);
                expect(spyUpdate2.calls.count()).toEqual(1);
            });
        });
    });

    it('tile visible event is raised', function() {
        viewRootOnly();
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            var spyUpdate = jasmine.createSpy('listener');
            tileset.tileVisible.addEventListener(spyUpdate);
            scene.renderForSpecs();
            expect(tileset.root.visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
            expect(spyUpdate.calls.count()).toEqual(1);
            expect(spyUpdate.calls.argsFor(0)[0]).toBe(tileset.root);
        });
    });

    it('tile load event is raised', function() {
        viewNothing();
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            var spyUpdate = jasmine.createSpy('listener');
            tileset.tileLoad.addEventListener(spyUpdate);
            tileset.maximumMemoryUsage = 0;
            viewRootOnly();
            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                // Root is loaded
                expect(spyUpdate.calls.count()).toEqual(1);
                expect(spyUpdate.calls.argsFor(0)[0]).toBe(tileset.root);
                spyUpdate.calls.reset();

                // Unload from cache
                viewNothing();
                scene.renderForSpecs();
                expect(tileset.statistics.numberOfTilesWithContentReady).toEqual(0);

                // Look at root again
                viewRootOnly();
                return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                    expect(spyUpdate.calls.count()).toEqual(1);
                    expect(spyUpdate.calls.argsFor(0)[0]).toBe(tileset.root);
                });
            });
        });
    });

    it('tile failed event is raised', function() {
        viewNothing();
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            spyOn(Resource._Implementations, 'loadWithXhr').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                deferred.reject('404');
            });
            var spyUpdate = jasmine.createSpy('listener');
            tileset.tileFailed.addEventListener(spyUpdate);
            tileset.maximumMemoryUsage = 0;
            viewRootOnly();
            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                expect(spyUpdate.calls.count()).toEqual(1);

                var arg = spyUpdate.calls.argsFor(0)[0];
                expect(arg).toBeDefined();
                expect(arg.url).toContain('parent.b3dm');
                expect(arg.message).toBeDefined();
            });
        });
    });

    it('destroys', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            var root = tileset.root;
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

    it('destroys before external tileset JSON file finishes loading', function() {
        viewNothing();
        return Cesium3DTilesTester.loadTileset(scene, tilesetOfTilesetsUrl).then(function(tileset) {
            var root = tileset.root;

            viewRootOnly();
            scene.renderForSpecs(); // Request external tileset JSON file

            var statistics = tileset._statistics;
            expect(statistics.numberOfPendingRequests).toEqual(1);
            scene.primitives.remove(tileset);

            return root.contentReadyPromise.then(function(root) {
                fail('should not resolve');
            }).otherwise(function(error) {
                // Expect the root to not have added any children from the external tileset JSON file
                expect(root.children.length).toEqual(0);
            });
        });
    });

    it('destroys before tile finishes loading', function() {
        viewRootOnly();
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : tilesetUrl
        }));
        return tileset.readyPromise.then(function(tileset) {
            var root = tileset.root;
            scene.renderForSpecs(); // Request root
            scene.primitives.remove(tileset);

            return root.contentReadyPromise.then(function(content) {
                fail('should not resolve');
            }).otherwise(function(error) {
                expect(root._contentState).toBe(Cesium3DTileContentState.FAILED);
            });
        });
    });

    it('renders with imageBaseLightingFactor', function() {
        return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(function(tileset) {
            expect(scene).toRenderAndCall(function(rgba) {
                expect(rgba).not.toEqual([0, 0, 0, 255]);
                tileset.imageBasedLightingFactor = new Cartesian2(0.0, 0.0);
                expect(scene).notToRender(rgba);
            });
        });
    });

    it('renders with lightColor', function() {
        return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(function(tileset) {
            expect(scene).toRenderAndCall(function(rgba) {
                expect(rgba).not.toEqual([0, 0, 0, 255]);
                tileset.imageBasedLightingFactor = new Cartesian2(0.0, 0.0);
                expect(scene).toRenderAndCall(function(rgba2) {
                    expect(rgba2).not.toEqual(rgba);
                    tileset.lightColor = new Cartesian3(5.0, 5.0, 5.0);
                    expect(scene).notToRender(rgba2);
                });
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
            var content = tileset.root.content;
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

    it('applies style when tile is selected after new style is applied', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(function(tileset) {
            var feature = tileset.root.content.getFeature(0);
            tileset.style = new Cesium3DTileStyle({color: 'color("red")'});
            scene.renderForSpecs();
            expect(feature.color).toEqual(Color.RED);

            tileset.style = new Cesium3DTileStyle({color: 'color("blue")'});
            scene.renderForSpecs();
            expect(feature.color).toEqual(Color.BLUE);

            viewNothing();
            tileset.style = new Cesium3DTileStyle({color: 'color("lime")'});
            scene.renderForSpecs();
            expect(feature.color).toEqual(Color.BLUE); // Hasn't been selected yet

            viewAllTiles();
            scene.renderForSpecs();
            expect(feature.color).toEqual(Color.LIME);

            // Feature's show property is preserved if the style hasn't changed and the feature is newly selected
            feature.show = false;
            scene.renderForSpecs();
            expect(feature.show).toBe(false);
            viewNothing();
            scene.renderForSpecs();
            expect(feature.show).toBe(false);
            viewAllTiles();
            expect(feature.show).toBe(false);
        });
    });

    it('does not reapply style during pick pass', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(function(tileset) {
            tileset.style = new Cesium3DTileStyle({color: 'color("red")'});
            scene.renderForSpecs();
            expect(tileset._statisticsLastRender.numberOfTilesStyled).toBe(1);
            scene.pickForSpecs();
            expect(tileset._statisticsLastPick.numberOfTilesStyled).toBe(0);
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
            evaluate : function(feature) {
                return this._value;
            },
            _value : false
        };
        style.color = {
            evaluateColor : function(feature, result) {
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
            var renderOptions = {
                scene : scene,
                time : new JulianDate(2457522.154792)
            };
            expect(renderOptions).toRenderAndCall(function(rgba) {
                sourceRed = rgba[0];
            });

            expect(renderOptions).toRenderAndCall(function(rgba) {
                expect(rgba[0]).toBeGreaterThan(200);
                expect(rgba[1]).toBeLessThan(25);
                expect(rgba[2]).toBeLessThan(25);
                expect(rgba[3]).toEqual(255);
            });

            // Use HIGHLIGHT blending
            tileset.colorBlendMode = Cesium3DTileColorBlendMode.HIGHLIGHT;

            // Style with dark yellow. Expect the red channel to be darker than before.
            tileset.style = new Cesium3DTileStyle({
                color : 'rgb(128, 128, 0)'
            });
            expect(renderOptions).toRenderAndCall(function(rgba) {
                expect(rgba[0]).toBeGreaterThan(100);
                expect(rgba[0]).toBeLessThan(sourceRed);
                expect(rgba[1]).toBeLessThan(25);
                expect(rgba[2]).toBeLessThan(25);
                expect(rgba[3]).toEqual(255);
            });

            // Style with yellow + alpha. Expect the red channel to be darker than before.
            tileset.style = new Cesium3DTileStyle({
                color : 'rgba(255, 255, 0, 0.5)'
            });
            expect(renderOptions).toRenderAndCall(function(rgba) {
                expect(rgba[0]).toBeGreaterThan(100);
                expect(rgba[0]).toBeLessThan(sourceRed);
                expect(rgba[1]).toBeLessThan(25);
                expect(rgba[2]).toBeLessThan(25);
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
            expect(renderOptions).toRenderAndCall(function(rgba) {
                replaceRed = rgba[0];
                replaceGreen = rgba[1];
                expect(rgba[0]).toBeGreaterThan(100);
                expect(rgba[0]).toBeLessThan(255);
                expect(rgba[1]).toBeGreaterThan(100);
                expect(rgba[1]).toBeLessThan(255);
                expect(rgba[2]).toBeLessThan(25);
                expect(rgba[3]).toEqual(255);
            });

            // Style with yellow + alpha. Expect the red and green channels to be a shade of yellow.
            tileset.style = new Cesium3DTileStyle({
                color : 'rgba(255, 255, 0, 0.5)'
            });
            expect(renderOptions).toRenderAndCall(function(rgba) {
                expect(rgba[0]).toBeGreaterThan(100);
                expect(rgba[0]).toBeLessThan(255);
                expect(rgba[1]).toBeGreaterThan(100);
                expect(rgba[1]).toBeLessThan(255);
                expect(rgba[2]).toBeLessThan(25);
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
            expect(renderOptions).toRenderAndCall(function(rgba) {
                mixRed = rgba[0];
                mixGreen = rgba[1];
                expect(rgba[0]).toBeGreaterThan(replaceRed);
                expect(rgba[0]).toBeLessThan(sourceRed);
                expect(rgba[1]).toBeGreaterThan(50);
                expect(rgba[1]).toBeLessThan(replaceGreen);
                expect(rgba[2]).toBeLessThan(25);
                expect(rgba[3]).toEqual(255);
            });

            // Set colorBlendAmount to 0.25. Expect color to be closer to the source color.
            tileset.colorBlendAmount = 0.25;
            expect(renderOptions).toRenderAndCall(function(rgba) {
                expect(rgba[0]).toBeGreaterThan(mixRed);
                expect(rgba[0]).toBeLessThan(sourceRed);
                expect(rgba[1]).toBeGreaterThan(0);
                expect(rgba[1]).toBeLessThan(mixGreen);
                expect(rgba[2]).toBeLessThan(25);
                expect(rgba[3]).toEqual(255);
            });

            // Set colorBlendAmount to 0.0. Expect color to equal the source color
            tileset.colorBlendAmount = 0.0;
            expect(renderOptions).toRenderAndCall(function(rgba) {
                expect(rgba[0]).toEqual(sourceRed);
                expect(rgba[1]).toBeLessThan(25);
                expect(rgba[2]).toBeLessThan(25);
                expect(rgba[3]).toEqual(255);
            });

            // Set colorBlendAmount to 1.0. Expect color to equal the style color
            tileset.colorBlendAmount = 1.0;
            expect(renderOptions).toRenderAndCall(function(rgba) {
                expect(rgba[0]).toEqual(replaceRed);
                expect(rgba[1]).toEqual(replaceGreen);
                expect(rgba[2]).toBeLessThan(25);
                expect(rgba[3]).toEqual(255);
            });

            // Style with yellow + alpha. Expect color to be a mix of the source and style colors.
            tileset.colorBlendAmount = 0.5;
            tileset.style = new Cesium3DTileStyle({
                color : 'rgba(255, 255, 0, 0.5)'
            });
            expect(renderOptions).toRenderAndCall(function(rgba) {
                expect(rgba[0]).toBeGreaterThan(0);
                expect(rgba[1]).toBeGreaterThan(0);
                expect(rgba[2]).toBeLessThan(25);
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
        viewInstances();
        return testColorBlendMode(instancedRedMaterialUrl);
    });

    it('sets colorBlendMode for vertex color tileset', function() {
        return testColorBlendMode(batchedVertexColorsUrl);
    });

    ///////////////////////////////////////////////////////////////////////////
    // Cache replacement tests

    it('Unload all cached tiles not required to meet SSE using maximumMemoryUsage', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            tileset.maximumMemoryUsage = 0;

            // Render parent and four children (using additive refinement)
            viewAllTiles();
            scene.renderForSpecs();

            var statistics = tileset._statistics;
            expect(statistics.numberOfCommands).toEqual(5);
            expect(statistics.numberOfTilesWithContentReady).toEqual(5); // Five loaded tiles
            expect(tileset.totalMemoryUsageInBytes).toEqual(37200); // Specific to this tileset

            // Zoom out so only root tile is needed to meet SSE.  This unloads
            // the four children since the maximum memory usage is zero.
            viewRootOnly();
            scene.renderForSpecs();

            expect(statistics.numberOfCommands).toEqual(1);
            expect(statistics.numberOfTilesWithContentReady).toEqual(1);
            expect(tileset.totalMemoryUsageInBytes).toEqual(7440); // Specific to this tileset

            // Zoom back in so all four children are re-requested.
            viewAllTiles();

            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                expect(statistics.numberOfCommands).toEqual(5);
                expect(statistics.numberOfTilesWithContentReady).toEqual(5); // Five loaded tiles
                expect(tileset.totalMemoryUsageInBytes).toEqual(37200); // Specific to this tileset
            });
        });
    });

    it('Unload some cached tiles not required to meet SSE using maximumMemoryUsage', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            tileset.maximumMemoryUsage = 0.025;  // Just enough memory to allow 3 tiles to remain
            // Render parent and four children (using additive refinement)
            viewAllTiles();
            scene.renderForSpecs();

            var statistics = tileset._statistics;
            expect(statistics.numberOfCommands).toEqual(5);
            expect(statistics.numberOfTilesWithContentReady).toEqual(5); // Five loaded tiles

            // Zoom out so only root tile is needed to meet SSE.  This unloads
            // two of the four children so three tiles are still loaded (the
            // root and two children) since the maximum memory usage is sufficient.
            viewRootOnly();
            scene.renderForSpecs();

            expect(statistics.numberOfCommands).toEqual(1);
            expect(statistics.numberOfTilesWithContentReady).toEqual(3);

            // Zoom back in so the two children are re-requested.
            viewAllTiles();

            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                expect(statistics.numberOfCommands).toEqual(5);
                expect(statistics.numberOfTilesWithContentReady).toEqual(5); // Five loaded tiles
            });
        });
    });

    it('Unloads cached tiles outside of the view frustum using maximumMemoryUsage', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            tileset.maximumMemoryUsage = 0;

            scene.renderForSpecs();
            var statistics = tileset._statistics;
            expect(statistics.numberOfCommands).toEqual(5);
            expect(statistics.numberOfTilesWithContentReady).toEqual(5);

            viewSky();

            // All tiles are unloaded
            scene.renderForSpecs();
            expect(statistics.numberOfCommands).toEqual(0);
            expect(statistics.numberOfTilesWithContentReady).toEqual(0);

            // Reset camera so all tiles are reloaded
            viewAllTiles();

            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                expect(statistics.numberOfCommands).toEqual(5);
                expect(statistics.numberOfTilesWithContentReady).toEqual(5);
            });
        });
    });

    it('Unloads cached tiles in a tileset with external tileset JSON file using maximumMemoryUsage', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetOfTilesetsUrl).then(function(tileset) {
            var statistics = tileset._statistics;
            var cacheList = tileset._cache._list;

            tileset.maximumMemoryUsage = 0.02;

            scene.renderForSpecs();
            expect(statistics.numberOfCommands).toEqual(5);
            expect(statistics.numberOfTilesWithContentReady).toEqual(5);
            expect(cacheList.length - 1).toEqual(5); // Only tiles with content are on the replacement list. -1 for sentinel.

            // Zoom out so only root tile is needed to meet SSE.  This unloads
            // all tiles except the root and one of the b3dm children
            viewRootOnly();
            scene.renderForSpecs();

            expect(statistics.numberOfCommands).toEqual(1);
            expect(statistics.numberOfTilesWithContentReady).toEqual(2);
            expect(cacheList.length - 1).toEqual(2);

            // Reset camera so all tiles are reloaded
            viewAllTiles();

            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                expect(statistics.numberOfCommands).toEqual(5);
                expect(statistics.numberOfTilesWithContentReady).toEqual(5);

                expect(cacheList.length - 1).toEqual(5);
            });
        });
    });

    it('Unloads cached tiles in a tileset with empty tiles using maximumMemoryUsage', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetEmptyRootUrl).then(function(tileset) {
            var statistics = tileset._statistics;

            tileset.maximumMemoryUsage = 0.02;

            scene.renderForSpecs();
            expect(statistics.numberOfCommands).toEqual(4);
            expect(statistics.numberOfTilesWithContentReady).toEqual(4); // 4 children with b3dm content (does not include empty root)

            viewSky();

            // Unload tiles to meet cache size
            scene.renderForSpecs();
            expect(statistics.numberOfCommands).toEqual(0);
            expect(statistics.numberOfTilesWithContentReady).toEqual(2); // 2 children with b3dm content (does not include empty root)

            // Reset camera so all tiles are reloaded
            viewAllTiles();

            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                expect(statistics.numberOfCommands).toEqual(4);
                expect(statistics.numberOfTilesWithContentReady).toEqual(4);
            });
        });
    });

    it('Unload cached tiles when a tileset uses replacement refinement using maximumMemoryUsage', function() {
        // No children have content, but all grandchildren have content
        //
        //          C
        //      E       E
        //    C   C   C   C
        //
        return Cesium3DTilesTester.loadTileset(scene, tilesetReplacement1Url).then(function(tileset) {
            tileset.maximumMemoryUsage = 0; // Only root needs to be visible

            // Render parent and four children (using additive refinement)
            viewAllTiles();
            scene.renderForSpecs();

            var statistics = tileset._statistics;
            expect(statistics.numberOfCommands).toEqual(4); // 4 grandchildren. Root is replaced.
            expect(statistics.numberOfTilesWithContentReady).toEqual(5); // Root + four grandchildren (does not include empty children)

            // Zoom out so only root tile is needed to meet SSE.  This unloads
            // all grandchildren since the max number of loaded tiles is one.
            viewRootOnly();
            scene.renderForSpecs();

            expect(statistics.numberOfCommands).toEqual(1);
            expect(statistics.numberOfTilesWithContentReady).toEqual(1);

            // Zoom back in so the four children are re-requested.
            viewAllTiles();

            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function() {
                expect(statistics.numberOfCommands).toEqual(4);
                expect(statistics.numberOfTilesWithContentReady).toEqual(5);
            });
        });
    });

    it('Explicitly unloads cached tiles with trimLoadedTiles', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            tileset.maximumMemoryUsage = 0.05;

            // Render parent and four children (using additive refinement)
            viewAllTiles();
            scene.renderForSpecs();

            var statistics = tileset._statistics;
            expect(statistics.numberOfCommands).toEqual(5);
            expect(statistics.numberOfTilesWithContentReady).toEqual(5); // Five loaded tiles

            // Zoom out so only root tile is needed to meet SSE.  The children
            // are not unloaded since max number of loaded tiles is five.
            viewRootOnly();
            scene.renderForSpecs();

            expect(statistics.numberOfCommands).toEqual(1);
            expect(statistics.numberOfTilesWithContentReady).toEqual(5);

            tileset.trimLoadedTiles();
            scene.renderForSpecs();

            expect(statistics.numberOfCommands).toEqual(1);
            expect(statistics.numberOfTilesWithContentReady).toEqual(1);
        });
    });

    it('tileUnload event is raised', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            tileset.maximumMemoryUsage = 0;

            // Render parent and four children (using additive refinement)
            viewAllTiles();
            scene.renderForSpecs();

            var statistics = tileset._statistics;
            expect(statistics.numberOfCommands).toEqual(5);
            expect(statistics.numberOfTilesWithContentReady).toEqual(5); // Five loaded tiles

            // Zoom out so only root tile is needed to meet SSE.  All the
            // children are unloaded since max number of loaded tiles is one.
            viewRootOnly();
            var spyUpdate = jasmine.createSpy('listener');
            tileset.tileUnload.addEventListener(spyUpdate);
            scene.renderForSpecs();

            expect(tileset.root.visibility(scene.frameState, CullingVolume.MASK_INDETERMINATE)).not.toEqual(CullingVolume.MASK_OUTSIDE);
            expect(spyUpdate.calls.count()).toEqual(4);
            expect(spyUpdate.calls.argsFor(0)[0]).toBe(tileset.root.children[0]);
            expect(spyUpdate.calls.argsFor(1)[0]).toBe(tileset.root.children[1]);
            expect(spyUpdate.calls.argsFor(2)[0]).toBe(tileset.root.children[2]);
            expect(spyUpdate.calls.argsFor(3)[0]).toBe(tileset.root.children[3]);
        });
    });

    it('maximumMemoryUsage throws when negative', function() {
        var tileset = new Cesium3DTileset({
            url : tilesetUrl
        });
        expect(function() {
            tileset.maximumMemoryUsage = -1;
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
            var statistics = tileset._statistics;
            var root = tileset.root;
            var rootTransform = Matrix4.unpack(root._header.transform);

            var child = root.children[0];
            var childTransform = Matrix4.unpack(child._header.transform);
            var computedTransform = Matrix4.multiply(rootTransform, childTransform, new Matrix4());

            expect(statistics.numberOfCommands).toBe(totalCommands);
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
            expect(statistics.numberOfCommands).toBe(0);

            // Now bring it back
            tileset.modelMatrix = Matrix4.IDENTITY;
            scene.renderForSpecs();
            expect(statistics.numberOfCommands).toBe(totalCommands);

            // Do the same steps for a tile transform
            child.transform = Matrix4.fromTranslation(new Cartesian3(0.0, 100000.0, 0.0));
            scene.renderForSpecs();
            expect(statistics.numberOfCommands).toBe(1);
            child.transform = Matrix4.IDENTITY;
            scene.renderForSpecs();
            expect(statistics.numberOfCommands).toBe(totalCommands);
        });
    });

    it('does not mark tileset as refining when tiles have selection depth 0', function() {
        viewRootOnly();
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            viewAllTiles();
            scene.renderForSpecs();
            var statistics = tileset._statistics;
            expect(statistics.numberOfTilesWithContentReady).toEqual(1);
            expect(tileset._selectedTiles[0]._selectionDepth).toEqual(0);
            expect(tileset._hasMixedContent).toBe(false);

            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function(tileset) {
                expect(statistics.numberOfTilesWithContentReady).toEqual(5);
                expect(tileset._hasMixedContent).toBe(false);
            });
        });
    });

    it('marks tileset as mixed when tiles have nonzero selection depth', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetReplacement3Url).then(function(tileset) {
            var statistics = tileset._statistics;

            tileset.root.children[0].children[0].children[0].unloadContent();
            tileset.root.children[0].children[0].children[1].unloadContent();
            tileset.root.children[0].children[0].children[2].unloadContent();
            statistics.numberOfTilesWithContentReady -= 3;

            scene.renderForSpecs();

            expect(tileset._hasMixedContent).toBe(true);
            expect(statistics.numberOfTilesWithContentReady).toEqual(2);
            expect(tileset.root.children[0].children[0].children[3]._selectionDepth).toEqual(1);
            expect(tileset.root._selectionDepth).toEqual(0);

            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function(tileset) {
                expect(statistics.numberOfTilesWithContentReady).toEqual(5);
                expect(tileset._hasMixedContent).toBe(false);
            });
        });
    });

    it('adds stencil clear command first when unresolved', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetReplacement3Url).then(function(tileset) {
            tileset.root.children[0].children[0].children[0].unloadContent();
            tileset.root.children[0].children[0].children[1].unloadContent();
            tileset.root.children[0].children[0].children[2].unloadContent();

            scene.renderForSpecs();
            var commandList = scene.frameState.commandList;
            expect(commandList[0] instanceof ClearCommand).toBe(true);
            expect(commandList[0].stencil).toBe(0);
        });
    });

    it('creates duplicate backface commands', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetReplacement3Url).then(function(tileset) {
            var statistics = tileset._statistics;
            var root = tileset.root;

            tileset.root.children[0].children[0].children[0].unloadContent();
            tileset.root.children[0].children[0].children[1].unloadContent();
            tileset.root.children[0].children[0].children[2].unloadContent();

            scene.renderForSpecs();

            // 2 for root tile, 1 for child, 1 for stencil clear
            // Tiles that are marked as finalResolution, including leaves, do not create back face commands
            expect(statistics.numberOfCommands).toEqual(4);
            expect(isSelected(tileset, root)).toBe(true);
            expect(root._finalResolution).toBe(false);
            expect(isSelected(tileset, root.children[0].children[0].children[3])).toBe(true);
            expect(root.children[0].children[0].children[3]._finalResolution).toBe(true);
            expect(tileset._hasMixedContent).toBe(true);

            var commandList = scene.frameState.commandList;
            var rs = commandList[1].renderState;
            expect(rs.cull.enabled).toBe(true);
            expect(rs.cull.face).toBe(CullFace.FRONT);
            expect(rs.polygonOffset.enabled).toBe(true);
        });
    });

    it('does not create duplicate backface commands if no selected descendants', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetReplacement3Url).then(function(tileset) {
            var statistics = tileset._statistics;
            var root = tileset.root;

            tileset.root.children[0].children[0].children[0].unloadContent();
            tileset.root.children[0].children[0].children[1].unloadContent();
            tileset.root.children[0].children[0].children[2].unloadContent();
            tileset.root.children[0].children[0].children[3].unloadContent();

            scene.renderForSpecs();

            // 2 for root tile, 1 for child, 1 for stencil clear
            expect(statistics.numberOfCommands).toEqual(1);
            expect(isSelected(tileset, root)).toBe(true);
            expect(root._finalResolution).toBe(true);
            expect(isSelected(tileset, root.children[0].children[0].children[0])).toBe(false);
            expect(isSelected(tileset, root.children[0].children[0].children[1])).toBe(false);
            expect(isSelected(tileset, root.children[0].children[0].children[2])).toBe(false);
            expect(isSelected(tileset, root.children[0].children[0].children[3])).toBe(false);
            expect(tileset._hasMixedContent).toBe(false);
        });
    });

    it('does not add commands or stencil clear command with no selected tiles', function() {
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : tilesetUrl
        }));
        scene.renderForSpecs();
        var statistics = tileset._statistics;
        expect(tileset._selectedTiles.length).toEqual(0);
        expect(statistics.numberOfCommands).toEqual(0);
    });

    it('does not add stencil clear command or backface commands when fully resolved', function() {
        viewAllTiles();
        return Cesium3DTilesTester.loadTileset(scene, tilesetReplacement3Url).then(function(tileset) {
            var statistics = tileset._statistics;
            expect(statistics.numberOfCommands).toEqual(tileset._selectedTiles.length);

            var commandList = scene.frameState.commandList;
            var length = commandList.length;
            for (var i = 0; i < length; ++i) {
                var command = commandList[i];
                expect(command instanceof ClearCommand).toBe(false);
                expect(command.renderState.cull.face).not.toBe(CullFace.FRONT);
            }
        });
    });

    it('loadSiblings', function() {
        viewBottomLeft();
        return Cesium3DTilesTester.loadTileset(scene, tilesetReplacement3Url, {
            loadSiblings : false
        }).then(function(tileset) {
            var statistics = tileset._statistics;
            expect(statistics.numberOfTilesWithContentReady).toBe(2);
            tileset.loadSiblings = true;
            scene.renderForSpecs();
            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function(tileset) {
                expect(statistics.numberOfTilesWithContentReady).toBe(5);
            });
        });
    });

    it('immediatelyLoadDesiredLevelOfDetail', function() {
        viewNothing();
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl, {
            immediatelyLoadDesiredLevelOfDetail : true
        }).then(function(tileset) {
            var root = tileset.root;
            var child = findTileByUri(root.children, 'll.b3dm');
            tileset.root.refine = Cesium3DTileRefine.REPLACE;
            tileset._allTilesAdditive = false;
            viewBottomLeft();
            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function(tileset) {
                expect(isSelected(tileset, child));
                expect(!isSelected(tileset, root));
                expect(root.contentUnloaded).toBe(true);
                // Renders child while parent loads
                viewRootOnly();
                scene.renderForSpecs();
                expect(isSelected(tileset, child));
                expect(!isSelected(tileset, root));
                return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(function(tileset) {
                    expect(!isSelected(tileset, child));
                    expect(isSelected(tileset, root));
                });
            });
        });
    });

    it('selects children if no ancestors available', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetOfTilesetsUrl).then(function(tileset) {
            var statistics = tileset._statistics;
            var parent = tileset.root.children[0];
            var child = parent.children[3].children[0];
            parent.refine = Cesium3DTileRefine.REPLACE;
            parent.unloadContent();

            viewBottomLeft();
            scene.renderForSpecs();

            expect(child.contentReady).toBe(true);
            expect(parent.contentReady).toBe(false);
            expect(isSelected(tileset, child)).toBe(true);
            expect(isSelected(tileset, parent)).toBe(false);
            expect(statistics.numberOfCommands).toEqual(1);
        });
    });

    it('tile expires', function() {
        return Cesium3DTilesTester.loadTileset(scene, batchedExpirationUrl).then(function(tileset) {
            // Intercept the request and load content that produces more draw commands, to simulate fetching new content after the original expires
            spyOn(Resource._Implementations, 'loadWithXhr').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                Resource._DefaultImplementations.loadWithXhr(batchedColorsB3dmUrl, responseType, method, data, headers, deferred, overrideMimeType);
            });
            var tile = tileset.root;
            var statistics = tileset._statistics;
            var expiredContent;
            tileset.style = new Cesium3DTileStyle({
                color : 'color("red")'
            });

            // Check that expireDuration and expireDate are correctly set
            var expireDate = JulianDate.addSeconds(JulianDate.now(), 5.0, new JulianDate());
            expect(JulianDate.secondsDifference(tile.expireDate, expireDate)).toEqualEpsilon(0.0, CesiumMath.EPSILON1);
            expect(tile.expireDuration).toBe(5.0);
            expect(tile.contentExpired).toBe(false);
            expect(tile.contentReady).toBe(true);
            expect(tile.contentAvailable).toBe(true);
            expect(tile._expiredContent).toBeUndefined();

            // Check statistics
            expect(statistics.numberOfCommands).toBe(1);
            expect(statistics.numberOfTilesTotal).toBe(1);

            // Trigger expiration to happen next frame
            tile.expireDate = JulianDate.addSeconds(JulianDate.now(), -1.0, new JulianDate());

            // Stays in the expired state until the request goes through
            var originalMaxmimumRequests = RequestScheduler.maximumRequests;
            RequestScheduler.maximumRequests = 0; // Artificially limit Request Scheduler so the request won't go through
            scene.renderForSpecs();
            RequestScheduler.maximumRequests = originalMaxmimumRequests;
            expiredContent = tile._expiredContent;
            expect(tile.contentExpired).toBe(true);
            expect(tile.contentAvailable).toBe(true); // Expired content now exists
            expect(expiredContent).toBeDefined();

            // Expired content renders while new content loads in
            expect(statistics.numberOfCommands).toBe(1);
            expect(statistics.numberOfTilesTotal).toBe(1);

            // Request goes through, now in the LOADING state
            scene.renderForSpecs();
            expect(tile.contentExpired).toBe(false);
            expect(tile.contentReady).toBe(false);
            expect(tile.contentAvailable).toBe(true);
            expect(tile._contentState).toBe(Cesium3DTileContentState.LOADING);
            expect(tile._expiredContent).toBeDefined(); // Still holds onto expired content until the content state is READY

            // Check that url contains a query param with the timestamp
            var url = Resource._Implementations.loadWithXhr.calls.first().args[0];
            expect(url.indexOf('expired=') >= 0).toBe(true);

            // statistics are still the same
            expect(statistics.numberOfCommands).toBe(1);
            expect(statistics.numberOfTilesTotal).toBe(1);

            return pollToPromise(function() {
                expect(statistics.numberOfCommands).toBe(1); // Still renders expired content
                scene.renderForSpecs();
                return tile.contentReady;
            }).then(function() {
                scene.renderForSpecs();

                // Expired content is destroyed
                expect(tile._expiredContent).toBeUndefined();
                expect(expiredContent.isDestroyed()).toBe(true);

                // Expect the style to be reapplied
                expect(tile.content.getFeature(0).color).toEqual(Color.RED);

                // statistics for new content
                expect(statistics.numberOfCommands).toBe(10);
                expect(statistics.numberOfTilesTotal).toBe(1);
            });
        });
    });

    function modifySubtreeBuffer(arrayBuffer) {
        var uint8Array = new Uint8Array(arrayBuffer);
        var jsonString = getStringFromTypedArray(uint8Array);
        var json = JSON.parse(jsonString);
        json.root.children.splice(0, 1);

        jsonString = JSON.stringify(json);
        var length = jsonString.length;
        uint8Array = new Uint8Array(length);
        for (var i = 0; i < length; i++) {
            uint8Array[i] = jsonString.charCodeAt(i);
        }
        return uint8Array.buffer;
    }

    it('tile with tileset content expires', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetSubtreeExpirationUrl).then(function(tileset) {
            // Intercept the request and load a subtree with one less child. Still want to make an actual request to simulate
            // real use cases instead of immediately returning a pre-created array buffer.
            spyOn(Resource._Implementations, 'loadWithXhr').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                var newDeferred = when.defer();
                Resource._DefaultImplementations.loadWithXhr(tilesetSubtreeUrl, responseType, method, data, headers, newDeferred, overrideMimeType);
                newDeferred.promise.then(function(arrayBuffer) {
                    deferred.resolve(modifySubtreeBuffer(arrayBuffer));
                });
            });

            var subtreeRoot = tileset.root.children[0];
            var subtreeChildren = subtreeRoot.children[0].children;
            var childrenLength = subtreeChildren.length;
            var statistics = tileset._statistics;

            // Check statistics
            expect(statistics.numberOfCommands).toBe(5);
            expect(statistics.numberOfTilesTotal).toBe(7);
            expect(statistics.numberOfTilesWithContentReady).toBe(5);

            // Trigger expiration to happen next frame
            subtreeRoot.expireDate = JulianDate.addSeconds(JulianDate.now(), -1.0, new JulianDate());

            // Listen to tile unload events
            var spyUpdate = jasmine.createSpy('listener');
            tileset.tileUnload.addEventListener(spyUpdate);

            // Tiles in the subtree are removed from the cache and destroyed.
            scene.renderForSpecs(); // Becomes expired
            scene.renderForSpecs(); // Makes request
            expect(subtreeRoot.children).toEqual([]);
            for (var i = 0; i < childrenLength; ++i) {
                expect(subtreeChildren[0].isDestroyed()).toBe(true);
            }
            expect(spyUpdate.calls.count()).toEqual(4);

            // Remove the spy so new tiles load in normally
            Resource._Implementations.loadWithXhr = Resource._DefaultImplementations.loadWithXhr;

            // Wait for the new tileset content to come in with one less leaf
            return pollToPromise(function() {
                scene.renderForSpecs();
                return subtreeRoot.contentReady && tileset.tilesLoaded;
            }).then(function() {
                scene.renderForSpecs();
                expect(statistics.numberOfCommands).toBe(4);
                expect(statistics.numberOfTilesTotal).toBe(6);
                expect(statistics.numberOfTilesWithContentReady).toBe(4);
            });
        });
    });

    it('tile expires and request fails', function() {
        return Cesium3DTilesTester.loadTileset(scene, batchedExpirationUrl).then(function(tileset) {
            spyOn(Resource._Implementations, 'loadWithXhr').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                deferred.reject();
            });
            var tile = tileset.root;
            var statistics = tileset._statistics;

            // Trigger expiration to happen next frame
            tile.expireDate = JulianDate.addSeconds(JulianDate.now(), -1.0, new JulianDate());

            // After update the tile is expired
            scene.renderForSpecs();

            // Make request (it will fail)
            scene.renderForSpecs();

            // Render scene
            scene.renderForSpecs();
            expect(tile._contentState).toBe(Cesium3DTileContentState.FAILED);
            expect(statistics.numberOfCommands).toBe(0);
            expect(statistics.numberOfTilesTotal).toBe(1);
        });
    });

    it('tile expiration date', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            var tile = tileset.root;

            // Trigger expiration to happen next frame
            tile.expireDate = JulianDate.addSeconds(JulianDate.now(), -1.0, new JulianDate());

            // Stays in the expired state until the request goes through
            var originalMaxmimumRequests = RequestScheduler.maximumRequests;
            RequestScheduler.maximumRequests = 0; // Artificially limit Request Scheduler so the request won't go through
            scene.renderForSpecs();
            RequestScheduler.maximumRequests = originalMaxmimumRequests;

            expect(tile.contentExpired).toBe(true);

            return pollToPromise(function() {
                scene.renderForSpecs();
                return tile.contentReady;
            }).then(function() {
                scene.renderForSpecs();
                expect(tile._expiredContent).toBeUndefined();
                expect(tile.expireDate).toBeUndefined();
            });
        });
    });

    it('supports content data URIs', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrlWithContentUri).then(function(tileset) {
            var statistics = tileset._statistics;
            expect(statistics.visited).toEqual(1);
            expect(statistics.numberOfCommands).toEqual(1);
        });
    });

    it('destroys attached ClippingPlaneCollections and ClippingPlaneCollections that have been detached', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            var clippingPlaneCollection1 = new ClippingPlaneCollection({
                planes : [
                    new ClippingPlane(Cartesian3.UNIT_Z, -100000000.0)
                ]
            });
            expect(clippingPlaneCollection1.owner).not.toBeDefined();

            tileset.clippingPlanes = clippingPlaneCollection1;
            var clippingPlaneCollection2 = new ClippingPlaneCollection({
                planes : [
                    new ClippingPlane(Cartesian3.UNIT_Z, -100000000.0)
                ]
            });

            tileset.clippingPlanes = clippingPlaneCollection2;
            expect(clippingPlaneCollection1.isDestroyed()).toBe(true);

            scene.primitives.remove(tileset);
            expect(clippingPlaneCollection2.isDestroyed()).toBe(true);
        });
    });

    it('throws a DeveloperError when given a ClippingPlaneCollection attached to another Tileset', function() {
        var clippingPlanes;
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset1) {
            clippingPlanes = new ClippingPlaneCollection({
                planes : [
                    new ClippingPlane(Cartesian3.UNIT_X, 0.0)
                ]
            });
            tileset1.clippingPlanes = clippingPlanes;

            return Cesium3DTilesTester.loadTileset(scene, tilesetUrl);
        })
        .then(function(tileset2) {
            expect(function() {
                tileset2.clippingPlanes = clippingPlanes;
            }).toThrowDeveloperError();
        });
    });

    it('clipping planes cull hidden tiles', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            var visibility = tileset.root.visibility(scene.frameState, CullingVolume.MASK_INSIDE);

            expect(visibility).not.toBe(CullingVolume.MASK_OUTSIDE);

            var plane = new ClippingPlane(Cartesian3.UNIT_Z, -100000000.0);
            tileset.clippingPlanes = new ClippingPlaneCollection({
                planes : [
                    plane
                ]
            });

            visibility = tileset.root.visibility(scene.frameState, CullingVolume.MASK_INSIDE);

            expect(visibility).toBe(CullingVolume.MASK_OUTSIDE);

            plane.distance = 0.0;
            visibility = tileset.root.visibility(scene.frameState, CullingVolume.MASK_INSIDE);

            expect(visibility).not.toBe(CullingVolume.MASK_OUTSIDE);
        });
    });

    it('clipping planes cull hidden content', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            var visibility = tileset.root.contentVisibility(scene.frameState);

            expect(visibility).not.toBe(Intersect.OUTSIDE);

            var plane = new ClippingPlane(Cartesian3.UNIT_Z, -100000000.0);
            tileset.clippingPlanes = new ClippingPlaneCollection({
                planes : [
                    plane
                ]
            });

            visibility = tileset.root.contentVisibility(scene.frameState);

            expect(visibility).toBe(Intersect.OUTSIDE);

            plane.distance = 0.0;
            visibility = tileset.root.contentVisibility(scene.frameState);

            expect(visibility).not.toBe(Intersect.OUTSIDE);
        });
    });

    it('clipping planes cull tiles completely inside clipping region', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
            var statistics = tileset._statistics;
            var root = tileset.root;

            scene.renderForSpecs();

            expect(statistics.numberOfCommands).toEqual(5);

            tileset.update(scene.frameState);

            var radius = 287.0736139905632;

            var plane = new ClippingPlane(Cartesian3.UNIT_X, radius);
            tileset.clippingPlanes = new ClippingPlaneCollection({
                planes : [
                    plane
                ]
            });

            tileset.update(scene.frameState);
            scene.renderForSpecs();

            expect(statistics.numberOfCommands).toEqual(5);
            expect(root._isClipped).toBe(false);

            plane.distance = -1;

            tileset.update(scene.frameState);
            scene.renderForSpecs();

            expect(statistics.numberOfCommands).toEqual(3);
            expect(root._isClipped).toBe(true);

            plane.distance = -radius;

            tileset.update(scene.frameState);
            scene.renderForSpecs();

            expect(statistics.numberOfCommands).toEqual(0);
            expect(root._isClipped).toBe(true);
        });
    });

    it('clipping planes cull tiles completely inside clipping region for i3dm', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetWithExternalResourcesUrl).then(function(tileset) {
            var statistics = tileset._statistics;
            var root = tileset.root;

            scene.renderForSpecs();

            expect(statistics.numberOfCommands).toEqual(6);

            tileset.update(scene.frameState);

            var radius = 142.19001637409772;

            var plane = new ClippingPlane(Cartesian3.UNIT_Z, radius);
            tileset.clippingPlanes = new ClippingPlaneCollection({
                planes : [
                    plane
                ]
            });

            tileset.update(scene.frameState);
            scene.renderForSpecs();

            expect(statistics.numberOfCommands).toEqual(6);
            expect(root._isClipped).toBe(false);

            plane.distance = 0;

            tileset.update(scene.frameState);
            scene.renderForSpecs();

            expect(statistics.numberOfCommands).toEqual(6);
            expect(root._isClipped).toBe(true);

            plane.distance = -radius;

            tileset.update(scene.frameState);
            scene.renderForSpecs();

            expect(statistics.numberOfCommands).toEqual(0);
            expect(root._isClipped).toBe(true);
        });
    });

    it('clippingPlanesOriginMatrix has correct orientation', function() {
        return Cesium3DTilesTester.loadTileset(scene, withTransformBoxUrl).then(function(tileset) {
            // The bounding volume of this tileset puts it under the surface, so no
            // east-north-up should be applied. Check that it matches the orientation
            // of the original transform.
            var offsetMatrix = tileset.clippingPlanesOriginMatrix;

            expect(Matrix4.equals(offsetMatrix, tileset.root.computedTransform)).toBe(true);

            return Cesium3DTilesTester.loadTileset(scene, tilesetUrl).then(function(tileset) {
                // The bounding volume of this tileset puts it on the surface,
                //  so we want to apply east-north-up as our best guess.
                offsetMatrix = tileset.clippingPlanesOriginMatrix;
                // The clipping plane matrix is not the same as the original because we applied east-north-up.
                expect(Matrix4.equals(offsetMatrix, tileset.root.computedTransform)).toBe(false);

                // But they have the same translation.
                var clippingPlanesOrigin = Matrix4.getTranslation(offsetMatrix, new Cartesian3());
                expect(Cartesian3.equals(tileset.root.boundingSphere.center, clippingPlanesOrigin)).toBe(true);
            });
        });
    });

    it('clippingPlanesOriginMatrix matches root tile bounding sphere', function() {
        return Cesium3DTilesTester.loadTileset(scene, tilesetOfTilesetsUrl).then(function(tileset) {
            var offsetMatrix = Matrix4.clone(tileset.clippingPlanesOriginMatrix, new Matrix4());
            var boundingSphereEastNorthUp = Transforms.eastNorthUpToFixedFrame(tileset.root.boundingSphere.center);
            expect(Matrix4.equals(offsetMatrix, boundingSphereEastNorthUp)).toBe(true);

            // Changing the model matrix should change the clipping planes matrix
            tileset.modelMatrix = Matrix4.fromTranslation(new Cartesian3(100, 0, 0));
            scene.renderForSpecs();
            expect(Matrix4.equals(offsetMatrix, tileset.clippingPlanesOriginMatrix)).toBe(false);

            boundingSphereEastNorthUp = Transforms.eastNorthUpToFixedFrame(tileset.root.boundingSphere.center);
            offsetMatrix = tileset.clippingPlanesOriginMatrix;
            expect(offsetMatrix).toEqualEpsilon(boundingSphereEastNorthUp, CesiumMath.EPSILON3);
        });
    });
}, 'WebGL');
