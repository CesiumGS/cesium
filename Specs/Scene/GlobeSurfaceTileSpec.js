/*global defineSuite*/
defineSuite([
        'Scene/GlobeSurfaceTile',
        'Core/CesiumTerrainProvider',
        'Core/defined',
        'Core/WebMercatorTilingScheme',
        'Scene/ImageryLayerCollection',
        'Scene/QuadtreeTile',
        'Scene/QuadtreeTileLoadState',
        'Scene/TerrainState',
        'Specs/createContext',
        'Specs/destroyContext',
        'ThirdParty/when'
    ], function(
        GlobeSurfaceTile,
        CesiumTerrainProvider,
        defined,
        WebMercatorTilingScheme,
        ImageryLayerCollection,
        QuadtreeTile,
        QuadtreeTileLoadState,
        TerrainState,
        createContext,
        destroyContext,
        when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

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
            rootTiles = QuadtreeTile.createLevelZeroTiles(tilingScheme);
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
                expect(tile.state).toBe(QuadtreeTileLoadState.START);
            }
        });

        it('transitions to the LOADING state immediately', function() {
            GlobeSurfaceTile.processStateMachine(rootTile, context, alwaysDeferTerrainProvider, imageryLayerCollection);
            expect(rootTile.state).toBe(QuadtreeTileLoadState.LOADING);
        });

        it('creates loadedTerrain but not upsampledTerrain for root tiles', function() {
            GlobeSurfaceTile.processStateMachine(rootTile, context, alwaysDeferTerrainProvider, imageryLayerCollection);
            expect(rootTile.data.loadedTerrain).toBeDefined();
            expect(rootTile.data.upsampledTerrain).toBeUndefined();
        });

        it('non-root tiles get neither loadedTerrain nor upsampledTerrain when their parent is not loaded nor upsampled', function() {
            var children = rootTile.children;
            for (var i = 0; i < children.length; ++i) {
                GlobeSurfaceTile.processStateMachine(children[i], context, alwaysDeferTerrainProvider, imageryLayerCollection);
                expect(children[i].data.loadedTerrain).toBeUndefined();
                expect(children[i].data.upsampledTerrain).toBeUndefined();
            }
        });

        it('once a root tile is loaded, its children get both loadedTerrain and upsampledTerrain', function() {
            waitsFor(function() {
                GlobeSurfaceTile.processStateMachine(rootTile, context, realTerrainProvider, imageryLayerCollection);
                return rootTile.state === QuadtreeTileLoadState.DONE;
            }, 'root tile to become ready');

            runs(function() {
                var children = rootTile.children;
                for (var i = 0; i < children.length; ++i) {
                    GlobeSurfaceTile.processStateMachine(children[i], context, alwaysDeferTerrainProvider, imageryLayerCollection);
                    expect(children[i].data.loadedTerrain).toBeDefined();
                    expect(children[i].data.upsampledTerrain).toBeDefined();
                }
            });
        });

        it('loaded terrainData is copied to the tile once it is available', function() {
            waitsFor(function() {
                GlobeSurfaceTile.processStateMachine(rootTile, context, realTerrainProvider, imageryLayerCollection);
                return rootTile.data.loadedTerrain.state >= TerrainState.RECEIVED;
            }, 'root tile loaded terrain to be received');

            runs(function() {
                expect(rootTile.data.terrainData).toBeDefined();
            });
        });

        it('upsampled terrainData is copied to the tile once it is available', function() {
            waitsFor(function() {
                GlobeSurfaceTile.processStateMachine(rootTile, context, realTerrainProvider, imageryLayerCollection);
                return rootTile.data.loadedTerrain.state >= TerrainState.RECEIVED;
            }, 'root tile loaded terrain to be received');

            waitsFor(function() {
                var childTile = rootTile.children[0];
                GlobeSurfaceTile.processStateMachine(childTile, context, alwaysDeferTerrainProvider, imageryLayerCollection);
                return childTile.data.upsampledTerrain.state >= TerrainState.RECEIVED;
            }, 'child tile terrain to be upsampled');

            runs(function() {
                expect(rootTile.children[0].data.terrainData).toBeDefined();
            });
        });

        it('loaded terrain data replaces upsampled terrain data', function() {
            var childTile = rootTile.children[0];

            waitsFor(function() {
                GlobeSurfaceTile.processStateMachine(rootTile, context, realTerrainProvider, imageryLayerCollection);
                return rootTile.data.loadedTerrain.state >= TerrainState.RECEIVED;
            }, 'root tile loaded terrain to be received');

            waitsFor(function() {
                GlobeSurfaceTile.processStateMachine(childTile, context, alwaysDeferTerrainProvider, imageryLayerCollection);
                return childTile.data.upsampledTerrain.state >= TerrainState.RECEIVED;
            }, 'child tile terrain to be upsampled');

            var upsampledTerrainData;

            runs(function() {
                upsampledTerrainData = childTile.data.terrainData;
                expect(upsampledTerrainData).toBeDefined();
            });

            waitsFor(function() {
                GlobeSurfaceTile.processStateMachine(childTile, context, realTerrainProvider, imageryLayerCollection);
                return childTile.data.loadedTerrain.state >= TerrainState.RECEIVED;
            });

            runs(function() {
                expect(childTile.data.terrainData).not.toBe(upsampledTerrainData);
            });
        });

        it('loaded terrain replacing upsampled terrain triggers re-upsampling and re-loading of children', function() {
            var childTile = rootTile.children[0];
            var grandchildTile = childTile.children[0];

            waitsFor(function() {
                GlobeSurfaceTile.processStateMachine(rootTile, context, realTerrainProvider, imageryLayerCollection);
                GlobeSurfaceTile.processStateMachine(childTile, context, alwaysDeferTerrainProvider, imageryLayerCollection);
                GlobeSurfaceTile.processStateMachine(grandchildTile, context, alwaysDeferTerrainProvider, imageryLayerCollection);
                return rootTile.data.loadedTerrain.state >= TerrainState.RECEIVED &&
                       childTile.data.upsampledTerrain.state >= TerrainState.RECEIVED &&
                       grandchildTile.data.upsampledTerrain.state >= TerrainState.RECEIVED;
            }, 'root to be loaded and child and grandchild to be upsampled');

            var grandchildUpsampledTerrain;

            runs(function() {
                grandchildUpsampledTerrain = grandchildTile.data.upsampledTerrain;
                expect(grandchildTile.data.loadedTerrain).toBeUndefined();
            });

            waitsFor(function() {
                GlobeSurfaceTile.processStateMachine(childTile, context, realTerrainProvider, imageryLayerCollection);
                return childTile.data.loadedTerrain.state >= TerrainState.RECEIVED;
            }, 'child to be loaded');

            runs(function() {
                expect(grandchildTile.data.upsampledTerrain).not.toBe(grandchildUpsampledTerrain);
                expect(grandchildTile.data.loadedTerrain).toBeDefined();
            });
        });

        it('improved upsampled terrain triggers re-upsampling of children', function() {
            var childTile = rootTile.children[0];
            var grandchildTile = childTile.children[0];
            var greatGrandchildTile = grandchildTile.children[0];

            waitsFor(function() {
                GlobeSurfaceTile.processStateMachine(rootTile, context, realTerrainProvider, imageryLayerCollection);
                GlobeSurfaceTile.processStateMachine(childTile, context, alwaysDeferTerrainProvider, imageryLayerCollection);
                GlobeSurfaceTile.processStateMachine(grandchildTile, context, alwaysDeferTerrainProvider, imageryLayerCollection);
                GlobeSurfaceTile.processStateMachine(greatGrandchildTile, context, alwaysDeferTerrainProvider, imageryLayerCollection);
                return rootTile.data.loadedTerrain.state >= TerrainState.RECEIVED &&
                       childTile.data.upsampledTerrain.state >= TerrainState.RECEIVED &&
                       grandchildTile.data.upsampledTerrain.state >= TerrainState.RECEIVED &&
                       greatGrandchildTile.data.upsampledTerrain.state >= TerrainState.RECEIVED;
            }, 'root to be loaded and child, grandchild, and great-grandchild to be upsampled');

            var greatGrandchildUpsampledTerrain;

            runs(function() {
                greatGrandchildUpsampledTerrain = grandchildTile.data.upsampledTerrain;
            });

            waitsFor(function() {
                GlobeSurfaceTile.processStateMachine(childTile, context, realTerrainProvider, imageryLayerCollection);
                GlobeSurfaceTile.processStateMachine(grandchildTile, context, alwaysDeferTerrainProvider, imageryLayerCollection);
                return childTile.data.loadedTerrain.state >= TerrainState.RECEIVED &&
                       grandchildTile.data.upsampledTerrain.state >= TerrainState.RECEIVED;
            }, 'child to be loaded and grandchild to be re-upsampled');

            runs(function() {
                expect(greatGrandchildTile.data.upsampledTerrain).toBeDefined();
                expect(greatGrandchildTile.data.upsampledTerrain).not.toBe(greatGrandchildUpsampledTerrain);
            });
        });

        it('releases previous upsampled water mask when a real one is loaded', function() {
            var childTile = rootTile.children[0];

            waitsFor(function() {
                GlobeSurfaceTile.processStateMachine(rootTile, context, realTerrainProvider, imageryLayerCollection);
                GlobeSurfaceTile.processStateMachine(childTile, context, alwaysDeferTerrainProvider, imageryLayerCollection);
                return rootTile.renderable && childTile.renderable;
            }, 'root and child tile to be renderable');

            var childWaterMaskTexture;
            var referenceCount;

            runs(function() {
               expect(childTile.data.waterMaskTexture).toBeDefined();
               childWaterMaskTexture = childTile.data.waterMaskTexture;
               referenceCount = childWaterMaskTexture.referenceCount;
            });

            waitsFor(function() {
                GlobeSurfaceTile.processStateMachine(childTile, context, realTerrainProvider, imageryLayerCollection);
                return childTile.state === QuadtreeTileLoadState.DONE;
            }, 'child tile to be ready');

            runs(function() {
                expect(childTile.data.waterMaskTexture).toBeDefined();
                expect(childTile.data.waterMaskTexture).not.toBe(childWaterMaskTexture);
                expect(childWaterMaskTexture.referenceCount + 1).toBe(referenceCount);
            });
        });

        it('upsampled terrain is used when real terrain fails to load', function() {
            var childTile = rootTile.children[0];

            waitsFor(function() {
                GlobeSurfaceTile.processStateMachine(rootTile, context, realTerrainProvider, imageryLayerCollection);
                GlobeSurfaceTile.processStateMachine(childTile, context, alwaysFailTerrainProvider, imageryLayerCollection);
                return rootTile.renderable && childTile.renderable;
            }, 'root and child tile to be renderable');

            runs(function() {
                expect(childTile.data.loadedTerrain).toBeUndefined();
                expect(childTile.upsampledFromParent).toBe(true);
            });
        });

        it('child of loaded tile is not re-upsampled or re-loaded if it is already loaded', function() {
            var childTile = rootTile.children[0];
            var grandchildTile = childTile.children[0];

            waitsFor(function() {
                GlobeSurfaceTile.processStateMachine(rootTile, context, realTerrainProvider, imageryLayerCollection);
                GlobeSurfaceTile.processStateMachine(childTile, context, alwaysDeferTerrainProvider, imageryLayerCollection);
                return rootTile.data.loadedTerrain.state >= TerrainState.RECEIVED &&
                       childTile.data.upsampledTerrain.state >= TerrainState.RECEIVED;
            }, 'root to be loaded and child to be upsampled');

            runs(function() {
                // Mark the grandchild as present even though the child is upsampled.
                childTile.data.terrainData._childTileMask = 15;
            });

            waitsFor(function() {
                GlobeSurfaceTile.processStateMachine(grandchildTile, context, realTerrainProvider, imageryLayerCollection);
                return grandchildTile.state === QuadtreeTileLoadState.DONE;
            }, 'grandchild to be ready');

            runs(function() {
                expect(grandchildTile.data.loadedTerrain).toBeUndefined();
                expect(grandchildTile.data.upsampledTerrain).toBeUndefined();
            });

            waitsFor(function() {
                GlobeSurfaceTile.processStateMachine(childTile, context, realTerrainProvider, imageryLayerCollection);
                return childTile.state === QuadtreeTileLoadState.DONE;
            });

            runs(function() {
                expect(grandchildTile.state).toBe(QuadtreeTileLoadState.DONE);
                expect(grandchildTile.data.loadedTerrain).toBeUndefined();
                expect(grandchildTile.data.upsampledTerrain).toBeUndefined();
            });
        });

        it('child of upsampled tile is not re-upsampled if it is already loaded', function() {
            var childTile = rootTile.children[0];
            var grandchildTile = childTile.children[0];
            var greatGrandchildTile = grandchildTile.children[0];

            waitsFor(function() {
                GlobeSurfaceTile.processStateMachine(rootTile, context, realTerrainProvider, imageryLayerCollection);
                GlobeSurfaceTile.processStateMachine(childTile, context, alwaysDeferTerrainProvider, imageryLayerCollection);
                GlobeSurfaceTile.processStateMachine(grandchildTile, context, alwaysDeferTerrainProvider, imageryLayerCollection);
                return rootTile.data.loadedTerrain.state >= TerrainState.RECEIVED &&
                       childTile.data.upsampledTerrain.state >= TerrainState.RECEIVED &&
                       grandchildTile.data.upsampledTerrain.state >= TerrainState.RECEIVED;
            }, 'root to be loaded and child and grandchild to be upsampled');

            runs(function() {
                // Mark the great-grandchild as present even though the grandchild is upsampled.
                grandchildTile.data.terrainData._childTileMask = 15;
            });

            waitsFor(function() {
                GlobeSurfaceTile.processStateMachine(greatGrandchildTile, context, realTerrainProvider, imageryLayerCollection);
                return greatGrandchildTile.state === QuadtreeTileLoadState.DONE;
            }, 'great-grandchild to be ready');

            runs(function() {
                expect(greatGrandchildTile.data.loadedTerrain).toBeUndefined();
                expect(greatGrandchildTile.data.upsampledTerrain).toBeUndefined();
            });

            waitsFor(function() {
                GlobeSurfaceTile.processStateMachine(childTile, context, realTerrainProvider, imageryLayerCollection);
                GlobeSurfaceTile.processStateMachine(grandchildTile, context, alwaysDeferTerrainProvider, imageryLayerCollection);
                return childTile.state === QuadtreeTileLoadState.DONE &&
                       !defined(grandchildTile.data.upsampledTerrain);
            }, 'child to be loaded and grandchild to be upsampled.');

            runs(function() {
                expect(greatGrandchildTile.state).toBe(QuadtreeTileLoadState.DONE);
                expect(greatGrandchildTile.data.loadedTerrain).toBeUndefined();
                expect(greatGrandchildTile.data.upsampledTerrain).toBeUndefined();
            });
        });

        it('entirely upsampled tile is marked as such', function() {
            var childTile = rootTile.children[0];

            waitsFor(function() {
                GlobeSurfaceTile.processStateMachine(rootTile, context, realTerrainProvider, imageryLayerCollection);
                GlobeSurfaceTile.processStateMachine(childTile, context, alwaysFailTerrainProvider, imageryLayerCollection);
                return rootTile.state >= QuadtreeTileLoadState.DONE &&
                       childTile.state >= QuadtreeTileLoadState.DONE;
            }, 'child tile to be in its final state');

            runs(function() {
                expect(rootTile.state).toBe(QuadtreeTileLoadState.DONE);
                expect(childTile.upsampledFromParent).toBe(true);
            });
        });

        it('uses shared water mask texture for tiles that are entirely water', function() {
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
                GlobeSurfaceTile.processStateMachine(rootTile, context, allWaterTerrainProvider, imageryLayerCollection);
                return rootTile.state === QuadtreeTileLoadState.DONE;
            }, 'root tile to be ready');

            var childTile = rootTile.children[0];

            waitsFor(function() {
                GlobeSurfaceTile.processStateMachine(childTile, context, allWaterTerrainProvider, imageryLayerCollection);
                return childTile.state === QuadtreeTileLoadState.DONE;
            }, 'child tile to be ready');

            runs(function() {
                expect(childTile.data.waterMaskTexture).toBeDefined();
                expect(childTile.data.waterMaskTexture).toBe(rootTile.data.waterMaskTexture);
            });
        });

        it('uses shared water mask texture for tiles that are entirely land', function() {
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
                GlobeSurfaceTile.processStateMachine(rootTile, context, allLandTerrainProvider, imageryLayerCollection);
                return rootTile.state === QuadtreeTileLoadState.DONE;
            }, 'root tile to be ready');

            var childTile = rootTile.children[0];

            waitsFor(function() {
                GlobeSurfaceTile.processStateMachine(childTile, context, allLandTerrainProvider, imageryLayerCollection);
                return childTile.state === QuadtreeTileLoadState.DONE;
            }, 'child tile to be ready');

            runs(function() {
                expect(childTile.data.waterMaskTexture).toBeDefined();
                expect(childTile.data.waterMaskTexture).toBe(rootTile.data.waterMaskTexture);
            });
        });
    }, 'WebGL');
});
