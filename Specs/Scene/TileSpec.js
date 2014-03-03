/*global defineSuite*/
defineSuite([
         'Scene/Tile',
         'Specs/createContext',
         'Specs/destroyContext',
         'Core/defined',
         'Core/Extent',
         'Core/Math',
         'Scene/CesiumTerrainProvider',
         'Scene/ImageryLayerCollection',
         'Scene/TerrainState',
         'Scene/TileState',
         'Scene/WebMercatorTilingScheme',
         'ThirdParty/when'
     ], function(
         Tile,
         createContext,
         destroyContext,
         defined,
         Extent,
         CesiumMath,
         CesiumTerrainProvider,
         ImageryLayerCollection,
         TerrainState,
         TileState,
         WebMercatorTilingScheme,
         when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/


    it('throws without a description', function() {
        expect(function() {
            return new Tile();
        }).toThrowDeveloperError();
    });

    it('throws without description.extent', function() {
        expect(function() {
            return new Tile({
                x : 0,
                y : 0
            });
        }).toThrowDeveloperError();
    });

    it('throws without description.level', function() {
        expect(function() {
            return new Tile({
                extent : new Extent(
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

    it('creates extent on construction', function() {
        var desc = {tilingScheme : new WebMercatorTilingScheme(), x : 0, y : 0, level : 0};
        var tile = new Tile(desc);
        var extent = desc.tilingScheme.tileXYToExtent(desc.x, desc.y, desc.level);
        expect(tile.extent).toEqual(extent);
    });

    it('throws if constructed improperly', function() {
        expect(function() {
            return new Tile();
        }).toThrowDeveloperError();

        expect(function() {
            return new Tile({
                x : 0,
                y : 0,
                level : 0,
                tilingScheme : {
                    tileXYToExtent : function() {
                        return undefined;
                    }
                }
            });
        }).not.toThrow();

        expect(function() {
            return new Tile({
                y : 0,
                level : 0,
                tilingScheme : {
                    tileXYToExtent : function() {
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
                    tileXYToExtent : function() {
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
                    tileXYToExtent : function() {
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
            rootTiles = tilingScheme.createLevelZeroTiles();
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
            var children = rootTile.getChildren();
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
                var children = rootTile.getChildren();
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
                return rootTile.loadedTerrain.state.value >= TerrainState.RECEIVED;
            }, 'root tile loaded terrain to be received');

            runs(function() {
                expect(rootTile.terrainData).toBeDefined();
            });
        });

        it('upsampled terrainData is copied to the tile once it is available', function() {
            waitsFor(function() {
                rootTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                return rootTile.loadedTerrain.state.value >= TerrainState.RECEIVED;
            }, 'root tile loaded terrain to be received');

            waitsFor(function() {
                var childTile = rootTile.getChildren()[0];
                childTile.processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
                return childTile.upsampledTerrain.state.value >= TerrainState.RECEIVED;
            }, 'child tile terrain to be upsampled');

            runs(function() {
                expect(rootTile.getChildren()[0].terrainData).toBeDefined();
            });
        });

        it('loaded terrain data replaces upsampled terrain data', function() {
            var childTile = rootTile.getChildren()[0];

            waitsFor(function() {
                rootTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                return rootTile.loadedTerrain.state.value >= TerrainState.RECEIVED;
            }, 'root tile loaded terrain to be received');

            waitsFor(function() {
                childTile.processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
                return childTile.upsampledTerrain.state.value >= TerrainState.RECEIVED;
            }, 'child tile terrain to be upsampled');

            var upsampledTerrainData;

            runs(function() {
                upsampledTerrainData = childTile.terrainData;
                expect(upsampledTerrainData).toBeDefined();
            });

            waitsFor(function() {
                childTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                return childTile.loadedTerrain.state.value >= TerrainState.RECEIVED;
            });

            runs(function() {
                expect(childTile.terrainData).not.toBe(upsampledTerrainData);
            });
        });

        it('loaded terrain replacing upsampled terrain triggers re-upsampling and re-loading of children', function() {
            var childTile = rootTile.getChildren()[0];
            var grandchildTile = childTile.getChildren()[0];

            waitsFor(function() {
                rootTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                childTile.processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
                grandchildTile.processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
                return rootTile.loadedTerrain.state.value >= TerrainState.RECEIVED &&
                       childTile.upsampledTerrain.state.value >= TerrainState.RECEIVED &&
                       grandchildTile.upsampledTerrain.state.value >= TerrainState.RECEIVED;
            }, 'root to be loaded and child and grandchild to be upsampled');

            var grandchildUpsampledTerrain;

            runs(function() {
                grandchildUpsampledTerrain = grandchildTile.upsampledTerrain;
                expect(grandchildTile.loadedTerrain).toBeUndefined();
            });

            waitsFor(function() {
                childTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                return childTile.loadedTerrain.state.value >= TerrainState.RECEIVED;
            }, 'child to be loaded');

            runs(function() {
                expect(grandchildTile.upsampledTerrain).not.toBe(grandchildUpsampledTerrain);
                expect(grandchildTile.loadedTerrain).toBeDefined();
            });
        });

        it('improved upsampled terrain triggers re-upsampling of children', function() {
            var childTile = rootTile.getChildren()[0];
            var grandchildTile = childTile.getChildren()[0];
            var greatGrandchildTile = grandchildTile.getChildren()[0];

            waitsFor(function() {
                rootTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                childTile.processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
                grandchildTile.processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
                greatGrandchildTile.processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
                return rootTile.loadedTerrain.state.value >= TerrainState.RECEIVED &&
                       childTile.upsampledTerrain.state.value >= TerrainState.RECEIVED &&
                       grandchildTile.upsampledTerrain.state.value >= TerrainState.RECEIVED &&
                       greatGrandchildTile.upsampledTerrain.state.value >= TerrainState.RECEIVED;
            }, 'root to be loaded and child, grandchild, and great-grandchild to be upsampled');

            var greatGrandchildUpsampledTerrain;

            runs(function() {
                greatGrandchildUpsampledTerrain = grandchildTile.upsampledTerrain;
            });

            waitsFor(function() {
                childTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                grandchildTile.processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
                return childTile.loadedTerrain.state.value >= TerrainState.RECEIVED &&
                       grandchildTile.upsampledTerrain.state.value >= TerrainState.RECEIVED;
            }, 'child to be loaded and grandchild to be re-upsampled');

            runs(function() {
                expect(greatGrandchildTile.upsampledTerrain).toBeDefined();
                expect(greatGrandchildTile.upsampledTerrain).not.toBe(greatGrandchildUpsampledTerrain);
            });
        });

        it('releases previous upsampled water mask when a real one is loaded', function() {
            var childTile = rootTile.getChildren()[0];

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
            var childTile = rootTile.getChildren()[0];

            waitsFor(function() {
                rootTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                childTile.processStateMachine(context, alwaysFailTerrainProvider, imageryLayerCollection);
                return rootTile.isRenderable && childTile.isRenderable;
            }, 'root and child tile to be renderable');

            runs(function() {
                expect(childTile.loadedTerrain).toBeUndefined();
                expect(childTile.state).toBe(TileState.READY);
            });
        });

        it('child of loaded tile is not re-upsampled or re-loaded if it is already loaded', function() {
            var childTile = rootTile.getChildren()[0];
            var grandchildTile = childTile.getChildren()[0];

            waitsFor(function() {
                rootTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                childTile.processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
                return rootTile.loadedTerrain.state.value >= TerrainState.RECEIVED &&
                       childTile.upsampledTerrain.state.value >= TerrainState.RECEIVED;
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
            var childTile = rootTile.getChildren()[0];
            var grandchildTile = childTile.getChildren()[0];
            var greatGrandchildTile = grandchildTile.getChildren()[0];

            waitsFor(function() {
                rootTile.processStateMachine(context, realTerrainProvider, imageryLayerCollection);
                childTile.processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
                grandchildTile.processStateMachine(context, alwaysDeferTerrainProvider, imageryLayerCollection);
                return rootTile.loadedTerrain.state.value >= TerrainState.RECEIVED &&
                       childTile.upsampledTerrain.state.value >= TerrainState.RECEIVED &&
                       grandchildTile.upsampledTerrain.state.value >= TerrainState.RECEIVED;
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

            var childTile = rootTile.getChildren()[0];

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

            var childTile = rootTile.getChildren()[0];

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
