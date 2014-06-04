/*global defineSuite*/
defineSuite([
        'Scene/Tile',
        'Core/CesiumTerrainProvider',
        'Core/defined',
        'Core/GeographicTilingScheme',
        'Core/Math',
        'Core/Rectangle',
        'Core/WebMercatorTilingScheme',
        'Scene/ImageryLayerCollection',
        'Scene/TerrainState',
        'Scene/TileState',
        'Specs/createContext',
        'Specs/destroyContext',
        'ThirdParty/when'
    ], function(
        Tile,
        CesiumTerrainProvider,
        defined,
        GeographicTilingScheme,
        CesiumMath,
        Rectangle,
        WebMercatorTilingScheme,
        ImageryLayerCollection,
        TerrainState,
        TileState,
        createContext,
        destroyContext,
        when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/


    it('throws without a options', function() {
        expect(function() {
            return new Tile();
        }).toThrowDeveloperError();
    });

    it('throws without options.rectangle', function() {
        expect(function() {
            return new Tile({
                x : 0,
                y : 0
            });
        }).toThrowDeveloperError();
    });

    it('throws without options.level', function() {
        expect(function() {
            return new Tile({
                rectangle : new Rectangle(
                    -CesiumMath.PI_OVER_FOUR,
                    0.0,
                    CesiumMath.PI_OVER_FOUR,
                    CesiumMath.PI_OVER_FOUR
                ),
                x : 0,
                y : 0
            });
        }).toThrowDeveloperError();
    });

    it('throws with negative x or y properties', function() {
        expect(function() {
            return new Tile({
                x : -1.0,
                y : -1.0,
                level : 1.0
            });
        }).toThrowDeveloperError();
    });

    it('creates rectangle on construction', function() {
        var desc = {tilingScheme : new WebMercatorTilingScheme(), x : 0, y : 0, level : 0};
        var tile = new Tile(desc);
        var rectangle = desc.tilingScheme.tileXYToRectangle(desc.x, desc.y, desc.level);
        expect(tile.rectangle).toEqual(rectangle);
    });

    it('throws if constructed improperly', function() {
        expect(function() {
            return new Tile();
        }).toThrowDeveloperError();

        expect(function() {
            return new Tile({
                y : 0,
                level : 0,
                tilingScheme : {
                    tileXYToRectangle : function() {
                        return undefined;
                    }
                }
            });
        }).toThrowDeveloperError();

        expect(function() {
            return new Tile({
                x : 0,
                level : 0,
                tilingScheme : {
                    tileXYToRectangle : function() {
                        return undefined;
                    }
                }
            });
        }).toThrowDeveloperError();

        expect(function() {
            return new Tile({
                x : 0,
                y : 0,
                tilingScheme : {
                    tileXYToRectangle : function() {
                        return undefined;
                    }
                }
            });
        }).toThrowDeveloperError();

        expect(function() {
            return new Tile({
                x : 0,
                y : 0,
                level : 0
            });
        }).toThrowDeveloperError();
    });

    describe('createLevelZeroTiles', function() {
        var tilingScheme1x1;
        var tilingScheme2x2;
        var tilingScheme2x1;
        var tilingScheme1x2;

        beforeEach(function() {
            tilingScheme1x1 = new GeographicTilingScheme({
                numberOfLevelZeroTilesX : 1,
                numberOfLevelZeroTilesY : 1
            });
            tilingScheme2x2 = new GeographicTilingScheme({
                numberOfLevelZeroTilesX : 2,
                numberOfLevelZeroTilesY : 2
            });
            tilingScheme2x1 = new GeographicTilingScheme({
                numberOfLevelZeroTilesX : 2,
                numberOfLevelZeroTilesY : 1
            });
            tilingScheme1x2 = new GeographicTilingScheme({
                numberOfLevelZeroTilesX : 1,
                numberOfLevelZeroTilesY : 2
            });
        });

        it('requires tilingScheme', function() {
            expect(function() {
                return Tile.createLevelZeroTiles(undefined);
            }).toThrowDeveloperError();
        });

        it('creates expected number of tiles', function() {
            var tiles = Tile.createLevelZeroTiles(tilingScheme1x1);
            expect(tiles.length).toBe(1);

            tiles = Tile.createLevelZeroTiles(tilingScheme2x2);
            expect(tiles.length).toBe(4);

            tiles = Tile.createLevelZeroTiles(tilingScheme2x1);
            expect(tiles.length).toBe(2);

            tiles = Tile.createLevelZeroTiles(tilingScheme1x2);
            expect(tiles.length).toBe(2);
        });

        it('created tiles are associated with specified tiling scheme', function() {
            var tiles = Tile.createLevelZeroTiles(tilingScheme2x2);
            for (var i = 0; i < tiles.length; ++i) {
                expect(tiles[i].tilingScheme).toBe(tilingScheme2x2);
            }
        });

        it('created tiles are ordered from the northwest and proceeding east and then south', function() {
            var tiles = Tile.createLevelZeroTiles(tilingScheme2x2);
            var northwest = tiles[0];
            var northeast = tiles[1];
            var southwest = tiles[2];
            var southeast = tiles[3];

            expect(northeast.rectangle.west).toBeGreaterThan(northwest.rectangle.west);
            expect(southeast.rectangle.west).toBeGreaterThan(southwest.rectangle.west);
            expect(northeast.rectangle.south).toBeGreaterThan(southeast.rectangle.south);
            expect(northwest.rectangle.south).toBeGreaterThan(southwest.rectangle.south);
        });
    });

    describe('processStateMachine', function() {
        var context;
        var alwaysDeferTerrainProvider;
        var alwaysFailTerrainProvider;
        var realTerrainProvider;

        var tilingScheme;
        var rootTiles;
        var rootTile;
        var imageryLayerCollection;

        beforeAll(function() {
            context = createContext();

            alwaysDeferTerrainProvider = {
                    requestTileGeometry : function(x, y, level) {
                        return undefined;
                    },
                    tilingScheme : tilingScheme,
                    hasWaterMask : function() {
                        return true;
                    }
            };

            alwaysFailTerrainProvider = {
                    requestTileGeometry : function(x, y, level) {
                        var deferred = when.defer();
                        deferred.reject();
                        return deferred.promise;
                    },
                    tilingScheme : tilingScheme,
                    hasWaterMask : function() {
                        return true;
                    }
            };

            realTerrainProvider = new CesiumTerrainProvider({
                url : 'http://cesiumjs.org/smallterrain'
            });
        });

        afterAll(function() {
            destroyContext(context);
        });

        beforeEach(function() {
            waitsFor(function() {
                return realTerrainProvider.ready;
            });

            tilingScheme = new WebMercatorTilingScheme();
            alwaysDeferTerrainProvider.tilingScheme = tilingScheme;
            alwaysFailTerrainProvider.tilingScheme = tilingScheme;
            rootTiles = Tile.createLevelZeroTiles(tilingScheme);
            rootTile = rootTiles[0];
            imageryLayerCollection = new ImageryLayerCollection();

        });

        afterEach(function() {
            for (var i = 0; i < rootTiles.length; ++i) {
                rootTiles[i].freeResources();
            }
        });

        it('starts in the START state', function() {
            for (var i = 0; i < rootTiles.length; ++i) {
                var tile = rootTiles[i];
                expect(tile.state).toBe(TileState.START);
            }
        });

        it('transitions to the LOADING state immediately', function() {
            rootTile.processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
            expect(rootTile.state).toBe(TileState.LOADING);
        });

        it('creates loadedTerrain but not upsampledTerrain for root tiles', function() {
            rootTile.processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
            expect(rootTile.loadedTerrain).toBeDefined();
            expect(rootTile.upsampledTerrain).toBeUndefined();
        });

        it('non-root tiles get neither loadedTerrain nor upsampledTerrain when their parent is not loaded or upsampled', function() {
            var children = rootTile.children;
            for (var i = 0; i < children.length; ++i) {
                children[i].processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
                expect(children[i].loadedTerrain).toBeUndefined();
                expect(children[i].upsampledTerrain).toBeUndefined();
            }
        });

        it('once a root tile is loaded, its children get both loadedTerrain and upsampledTerrain', function() {
            waitsFor(function() {
                rootTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                return rootTile.state === TileState.READY;
            }, 'root tile to become ready');

            runs(function() {
                var children = rootTile.children;
                for (var i = 0; i < children.length; ++i) {
                    children[i].processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
                    expect(children[i].loadedTerrain).toBeDefined();
                    expect(children[i].upsampledTerrain).toBeDefined();
                }
            });
        });

        it('loaded terrainData is copied to the tile once it is available', function() {
            waitsFor(function() {
                rootTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                return rootTile.loadedTerrain.state >= TerrainState.RECEIVED;
            }, 'root tile loaded terrain to be received');

            runs(function() {
                expect(rootTile.terrainData).toBeDefined();
            });
        });

        it('upsampled terrainData is copied to the tile once it is available', function() {
            waitsFor(function() {
                rootTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                return rootTile.loadedTerrain.state >= TerrainState.RECEIVED;
            }, 'root tile loaded terrain to be received');

            waitsFor(function() {
                var childTile = rootTile.children[0];
                childTile.processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
                return childTile.upsampledTerrain.state >= TerrainState.RECEIVED;
            }, 'child tile terrain to be upsampled');

            runs(function() {
                expect(rootTile.children[0].terrainData).toBeDefined();
            });
        });

        it('loaded terrain data replaces upsampled terrain data', function() {
            var childTile = rootTile.children[0];

            waitsFor(function() {
                rootTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                return rootTile.loadedTerrain.state >= TerrainState.RECEIVED;
            }, 'root tile loaded terrain to be received');

            waitsFor(function() {
                childTile.processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
                return childTile.upsampledTerrain.state >= TerrainState.RECEIVED;
            }, 'child tile terrain to be upsampled');

            var upsampledTerrainData;

            runs(function() {
                upsampledTerrainData = childTile.terrainData;
                expect(upsampledTerrainData).toBeDefined();
            });

            waitsFor(function() {
                childTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                return childTile.loadedTerrain.state >= TerrainState.RECEIVED;
            });

            runs(function() {
                expect(childTile.terrainData).not.toBe(upsampledTerrainData);
            });
        });

        it('loaded terrain replacing upsampled terrain triggers re-upsampling and re-loading of children', function() {
            var childTile = rootTile.children[0];
            var grandchildTile = childTile.children[0];

            waitsFor(function() {
                rootTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                childTile.processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
                grandchildTile.processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
                return rootTile.loadedTerrain.state >= TerrainState.RECEIVED &&
                       childTile.upsampledTerrain.state >= TerrainState.RECEIVED &&
                       grandchildTile.upsampledTerrain.state >= TerrainState.RECEIVED;
            }, 'root to be loaded and child and grandchild to be upsampled');

            var grandchildUpsampledTerrain;

            runs(function() {
                grandchildUpsampledTerrain = grandchildTile.upsampledTerrain;
                expect(grandchildTile.loadedTerrain).toBeUndefined();
            });

            waitsFor(function() {
                childTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                return childTile.loadedTerrain.state >= TerrainState.RECEIVED;
            }, 'child to be loaded');

            runs(function() {
                expect(grandchildTile.upsampledTerrain).not.toBe(grandchildUpsampledTerrain);
                expect(grandchildTile.loadedTerrain).toBeDefined();
            });
        });

        it('improved upsampled terrain triggers re-upsampling of children', function() {
            var childTile = rootTile.children[0];
            var grandchildTile = childTile.children[0];
            var greatGrandchildTile = grandchildTile.children[0];

            waitsFor(function() {
                rootTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                childTile.processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
                grandchildTile.processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
                greatGrandchildTile.processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
                return rootTile.loadedTerrain.state >= TerrainState.RECEIVED &&
                       childTile.upsampledTerrain.state >= TerrainState.RECEIVED &&
                       grandchildTile.upsampledTerrain.state >= TerrainState.RECEIVED &&
                       greatGrandchildTile.upsampledTerrain.state >= TerrainState.RECEIVED;
            }, 'root to be loaded and child, grandchild, and great-grandchild to be upsampled');

            var greatGrandchildUpsampledTerrain;

            runs(function() {
                greatGrandchildUpsampledTerrain = grandchildTile.upsampledTerrain;
            });

            waitsFor(function() {
                childTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                grandchildTile.processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
                return childTile.loadedTerrain.state >= TerrainState.RECEIVED &&
                       grandchildTile.upsampledTerrain.state >= TerrainState.RECEIVED;
            }, 'child to be loaded and grandchild to be re-upsampled');

            runs(function() {
                expect(greatGrandchildTile.upsampledTerrain).toBeDefined();
                expect(greatGrandchildTile.upsampledTerrain).not.toBe(greatGrandchildUpsampledTerrain);
            });
        });

        it('releases previous upsampled water mask when a real one is loaded', function() {
            var childTile = rootTile.children[0];

            waitsFor(function() {
                rootTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                childTile.processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
                return rootTile.isRenderable && childTile.isRenderable;
            }, 'root and child tile to be renderable');

            var childWaterMaskTexture;
            var referenceCount;

            runs(function() {
               expect(childTile.waterMaskTexture).toBeDefined();
               childWaterMaskTexture = childTile.waterMaskTexture;
               referenceCount = childWaterMaskTexture.referenceCount;
            });

            waitsFor(function() {
                childTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                return childTile.state === TileState.READY;
            }, 'child tile to be ready');

            runs(function() {
                expect(childTile.waterMaskTexture).toBeDefined();
                expect(childTile.waterMaskTexture).not.toBe(childWaterMaskTexture);
                expect(childWaterMaskTexture.referenceCount + 1).toBe(referenceCount);
            });
        });

        it('upsampled terrain is used when real terrain fails to load', function() {
            var childTile = rootTile.children[0];

            waitsFor(function() {
                rootTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                childTile.processStateMachine(context, alwaysFailTerrainProvider, imageryLayerCollection);
                return rootTile.isRenderable && childTile.isRenderable;
            }, 'root and child tile to be renderable');

            runs(function() {
                expect(childTile.loadedTerrain).toBeUndefined();
                expect(childTile.state).toBe(TileState.UPSAMPLED_ONLY);
            });
        });

        it('child of loaded tile is not re-upsampled or re-loaded if it is already loaded', function() {
            var childTile = rootTile.children[0];
            var grandchildTile = childTile.children[0];

            waitsFor(function() {
                rootTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                childTile.processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
                return rootTile.loadedTerrain.state >= TerrainState.RECEIVED &&
                       childTile.upsampledTerrain.state >= TerrainState.RECEIVED;
            }, 'root to be loaded and child to be upsampled');

            runs(function() {
                // Mark the grandchild as present even though the child is upsampled.
                childTile.terrainData._childTileMask = 15;
            });

            waitsFor(function() {
                grandchildTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                return grandchildTile.state === TileState.READY;
            }, 'grandchild to be ready');

            runs(function() {
                expect(grandchildTile.loadedTerrain).toBeUndefined();
                expect(grandchildTile.upsampledTerrain).toBeUndefined();
            });

            waitsFor(function() {
                childTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                return childTile.state === TileState.READY;
            });

            runs(function() {
                expect(grandchildTile.state).toBe(TileState.READY);
                expect(grandchildTile.loadedTerrain).toBeUndefined();
                expect(grandchildTile.upsampledTerrain).toBeUndefined();
            });
        });

        it('child of upsampled tile is not re-upsampled if it is already loaded', function() {
            var childTile = rootTile.children[0];
            var grandchildTile = childTile.children[0];
            var greatGrandchildTile = grandchildTile.children[0];

            waitsFor(function() {
                rootTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                childTile.processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
                grandchildTile.processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
                return rootTile.loadedTerrain.state >= TerrainState.RECEIVED &&
                       childTile.upsampledTerrain.state >= TerrainState.RECEIVED &&
                       grandchildTile.upsampledTerrain.state >= TerrainState.RECEIVED;
            }, 'root to be loaded and child and grandchild to be upsampled');

            runs(function() {
                // Mark the great-grandchild as present even though the grandchild is upsampled.
                grandchildTile.terrainData._childTileMask = 15;
            });

            waitsFor(function() {
                greatGrandchildTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                return greatGrandchildTile.state === TileState.READY;
            }, 'great-grandchild to be ready');

            runs(function() {
                expect(greatGrandchildTile.loadedTerrain).toBeUndefined();
                expect(greatGrandchildTile.upsampledTerrain).toBeUndefined();
            });

            waitsFor(function() {
                childTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                grandchildTile.processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
                return childTile.state === TileState.READY &&
                       !defined(grandchildTile.upsampledTerrain);
            }, 'child to be loaded and grandchild to be upsampled.');

            runs(function() {
                expect(greatGrandchildTile.state).toBe(TileState.READY);
                expect(greatGrandchildTile.loadedTerrain).toBeUndefined();
                expect(greatGrandchildTile.upsampledTerrain).toBeUndefined();
            });
        });

        it('entirely upsampled tile is marked as such', function() {
            var childTile = rootTile.children[0];

            waitsFor(function() {
                rootTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                childTile.processStateMachine(context, alwaysFailTerrainProvider, imageryLayerCollection);
                return rootTile.state >= TileState.READY &&
                       childTile.state >= TileState.READY;
            }, 'child tile to be in its final state');

            runs(function() {
                expect(rootTile.state).toBe(TileState.READY);
                expect(childTile.state).toBe(TileState.UPSAMPLED_ONLY);
            });
        });

        it('uses shared water mask texture for all water', function() {
            var allWaterTerrainProvider = {
                    requestTileGeometry : function(x, y, level) {
                        var real = realTerrainProvider.requestTileGeometry(x, y, level);
                        if (!defined(real)) {
                            return real;
                        }

                        return when(real, function(terrainData) {
                            terrainData._waterMask = new Uint8Array([255]);
                            return terrainData;
                        });
                    },
                    tilingScheme :  realTerrainProvider.tilingScheme,
                    hasWaterMask : function() {
                        return realTerrainProvider.hasWaterMask();
                    }
            };

            waitsFor(function() {
                rootTile.processStateMachine(context, allWaterTerrainProvider, imageryLayerCollection);
                return rootTile.state === TileState.READY;
            }, 'root tile to be ready');

            var childTile = rootTile.children[0];

            waitsFor(function() {
                childTile.processStateMachine(context, allWaterTerrainProvider, imageryLayerCollection);
                return childTile.state === TileState.READY;
            }, 'child tile to be ready');

            runs(function() {
                expect(childTile.waterMaskTexture).toBeDefined();
                expect(childTile.waterMaskTexture).toBe(rootTile.waterMaskTexture);
            });
        });

        it('uses shared water mask texture for all land', function() {
            var allLandTerrainProvider = {
                    requestTileGeometry : function(x, y, level) {
                        var real = realTerrainProvider.requestTileGeometry(x, y, level);
                        if (!defined(real)) {
                            return real;
                        }

                        return when(real, function(terrainData) {
                            terrainData._waterMask = new Uint8Array([0]);
                            return terrainData;
                        });
                    },
                    tilingScheme : realTerrainProvider.tilingScheme,
                    hasWaterMask : function() {
                        return realTerrainProvider.hasWaterMask();
                    }
            };

            waitsFor(function() {
                rootTile.processStateMachine(context, allLandTerrainProvider, imageryLayerCollection);
                return rootTile.state === TileState.READY;
            }, 'root tile to be ready');

            var childTile = rootTile.children[0];

            waitsFor(function() {
                childTile.processStateMachine(context, allLandTerrainProvider, imageryLayerCollection);
                return childTile.state === TileState.READY;
            }, 'child tile to be ready');

            runs(function() {
                expect(childTile.waterMaskTexture).toBeDefined();
                expect(childTile.waterMaskTexture).toBe(rootTile.waterMaskTexture);
            });
        });
    }, 'WebGL');
});
