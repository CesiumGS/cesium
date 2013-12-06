/*global define*/
define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/BoundingRectangle',
        '../../Scene/PerformanceDisplay',
        '../../Scene/DebugModelMatrixPrimitive',
        '../../Scene/TileCoordinatesImageryProvider',
        '../../Core/Color',
        '../createCommand',
        '../../ThirdParty/knockout'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        BoundingRectangle,
        PerformanceDisplay,
        DebugModelMatrixPrimitive,
        TileCoordinatesImageryProvider,
        Color,
        createCommand,
        knockout) {
    "use strict";

    function frustumStatsToString(stats) {
        var str;
        if (defined(stats)) {
            str = 'Total commands: ' + stats.totalCommands + '<br>Commands in frustums:';
            var com = stats.commandsInFrustums;
            for (var n in com) {
                if (com.hasOwnProperty(n)) {
                    str += '<br>&nbsp;&nbsp;&nbsp;&nbsp;' + n + ': ' + com[n];
                }
            }
        }

        return str;
    }

    var br = new BoundingRectangle(220, 5, 100, 75);
    var bc = new Color(0.15, 0.15, 0.15, 0.75);

    /**
     * The view model for {@link CesiumInspector}.
     * @alias CesiumInspectorViewModel
     * @constructor
     *
     * @param {Scene} scene The scene instance to use.
     *
     * @exception {DeveloperError} scene is required.
     */
    var CesiumInspectorViewModel = function(scene, canvas) {
        if (!defined(scene)) {
            throw new DeveloperError('scene is required');
        }

        var that = this;

        this._scene = scene;
        this._canvas = canvas;
        this._primitive = undefined;
        this._tile = undefined;
        this._modelMatrixPrimitive = undefined;
        this._performanceDisplay = undefined;

        this.frustums = false;
        this.performance = false;
        this.primitiveBoundingSphere = false;
        this.primitiveRefFrame = false;
        this.filterPrimitive = false;
        this.tileBoundingSphere = false;
        this.filterTile = false;
        this.wireframe = false;
        this.suspendUpdates = false;
        this.tileCoords = false;

        this.frustumStatText = '';
        this.tileText = '';

        this.hasPickedPrimitive = false;
        this.hasPickedTile = false;

        this.pickPrimitiveActive = false;
        this.pickTileActive = false;

        this.dropDownVisible = true;
        this.generalVisible = true;
        this.primitivesVisible = false;
        this.terrainVisible = false;

        this.generalSwitchText = '-';
        this.primitivesSwitchText = '+';
        this.terrainSwitchText = '+';

        knockout.track(this, ['filterTile', 'suspendUpdates', 'dropDownVisible', 'frustums',
                              'frustumStatText', 'pickTileActive', 'pickPrimitiveActive', 'hasPickedPrimitive',
                              'hasPickedTile', 'tileText', 'generalVisible', 'generalSwitchText',
                              'primitivesVisible', 'primitivesSwitchText', 'terrainVisible', 'terrainSwitchText']);

        this._toggleDropDown = createCommand(function() {
            that.dropDownVisible = !that.dropDownVisible;
        });

        this._toggleGeneral = createCommand(function() {
            that.generalVisible = ! that.generalVisible;
            that.generalSwitchText = that.generalVisible ? '-' : '+';
        });

        this._togglePrimitives = createCommand(function() {
            that.primitivesVisible = ! that.primitivesVisible;
            that.primitivesSwitchText = that.primitivesVisible ? '-' : '+';
        });

        this._toggleTerrain = createCommand(function() {
            that.terrainVisible = ! that.terrainVisible;
            that.terrainSwitchText = that.terrainVisible ? '-' : '+';
        });

        this._showFrustums = createCommand(function() {
            if (that.frustums) {
                that._scene.debugShowFrustums = true;
                that._frustumInterval = setInterval(function() {
                    that.frustumStatText = frustumStatsToString(scene.debugFrustumStatistics);
                }, 100);
            } else {
                clearInterval(that._frustumInterval);
                that._scene.debugShowFrustums = false;
            }
            return true;
        });

        this._showPerformance = createCommand(function() {
            if (that.performance) {
                that._performanceDisplay = new PerformanceDisplay({
                    rectangle : br,
                    backgroundColor: bc,
                    font: "12px arial,sans-serif"
                });
                that._scene.getPrimitives().add(that._performanceDisplay);
            } else {
                that._scene.getPrimitives().remove(that._performanceDisplay);
            }
            return true;
        });

        this._showPrimitiveBoundingSphere = createCommand(function() {
            that._primitive.primitive.debugShowBoundingVolume = that.primitiveBoundingSphere;
            return true;
        });

        this._showPrimitiveRefFrame = createCommand(function() {
            if (that.primitiveRefFrame) {
                var modelMatrix = that._primitive.primitive.modelMatrix;
                that._modelMatrixPrimitive = new DebugModelMatrixPrimitive({modelMatrix: modelMatrix});
                that._scene.getPrimitives().add(that._modelMatrixPrimitive);
            } else if (defined(that._modelMatrixPrimitive)){
                that._scene.getPrimitives().remove(that._modelMatrixPrimitive);
                that._modelMatrixPrimitive = undefined;
            }
            return true;
        });

        this._doFilterPrimitive = createCommand(function() {
            if (that.filterPrimitive) {
                that._scene.debugCommandFilter = function(command) {
                    return command.owner === that._primitive.primitive;
                };
            } else {
                that._scene.debugCommandFilter = undefined;
            }
            return true;
        });

        var centralBody = this._scene.getPrimitives().getCentralBody();
        this._showWireframe = createCommand(function() {
            centralBody._surface._debug.wireframe = that.wireframe;
            return true;
        });

        this._doSuspendUpdates = createCommand(function() {
            centralBody._surface._debug.suspendLodUpdate = that.suspendUpdates;
            if (!that.suspendUpdates) {
                that.filterTile = false;
            }
            return true;
        });

        var tileBoundariesLayer;
        this._showTileCoords = createCommand(function() {
            if (that.tileCoords && !defined(tileBoundariesLayer)) {
                tileBoundariesLayer = centralBody.getImageryLayers().addImageryProvider(new TileCoordinatesImageryProvider({
                    tilingScheme : centralBody.terrainProvider.getTilingScheme()
                }));
            } else if (!that.tileCoords && defined(tileBoundariesLayer)) {
                centralBody.getImageryLayers().remove(tileBoundariesLayer);
                tileBoundariesLayer = undefined;
            }
            return true;
        });

        this._showTileBoundingSphere = createCommand(function() {
            if (that.tileBoundingSphere) {
                centralBody._surface._debug.boundingSphereTile = that._tile;
            } else {
                centralBody._surface._debug.boundingSphereTile = undefined;
            }
            return true;
        });

        this._doFilterTile = createCommand(function() {
            if (!that.filterTile) {
                that.suspendUpdates = false;
                that.doSuspendUpdates();
            } else {
                that.suspendUpdates = true;
                that.doSuspendUpdates();

                centralBody._surface._tilesToRenderByTextureCount = [];

                if (defined(that._tile)) {
                    var readyTextureCount = 0;
                    var tileImageryCollection = that._tile.imagery;
                    for (var i = 0, len = tileImageryCollection.length; i < len; ++i) {
                        var tileImagery = tileImageryCollection[i];
                        if (defined(tileImagery.readyImagery) && tileImagery.readyImagery.imageryLayer.alpha !== 0.0) {
                            ++readyTextureCount;
                        }
                    }

                    centralBody._surface._tilesToRenderByTextureCount[readyTextureCount] = [that._tile];
                }
            }
            return true;
        });

        var pickPrimitive = function(e) {
            var newPick = that._scene.pick({x: e.clientX, y: e.clientY});
            if (defined(newPick)) {
                that.primitive = newPick;
            }
            canvas.removeEventListener('mousedown', pickPrimitive, false);
            that.pickPrimitiveActive = false;
        };

        this._pickPrimitive = createCommand(function() {
            that.pickPrimitiveActive = !that.pickPrimitiveActive;
            if (that.pickPrimitiveActive) {
                canvas.addEventListener('mousedown', pickPrimitive, false);
            } else {
                canvas.removeEventListener('mousedown', pickPrimitive, false);
            }
        });

        var selectTile = function (e) {
            var selectedTile;
            var ellipsoid = centralBody.getEllipsoid();
            var cartesian = that._scene.getCamera().controller.pickEllipsoid({x: event.clientX, y: event.clientY}, ellipsoid);

            if (defined(cartesian)) {
                var cartographic = ellipsoid.cartesianToCartographic(cartesian);
                var tilesRendered = centralBody._surface._tilesToRenderByTextureCount;
                for (var textureCount = 0; !selectedTile && textureCount < tilesRendered.length; ++textureCount) {
                    var tilesRenderedByTextureCount = tilesRendered[textureCount];
                    if (!defined(tilesRenderedByTextureCount)) {
                        continue;
                    }

                    for (var tileIndex = 0; !selectedTile && tileIndex < tilesRenderedByTextureCount.length; ++tileIndex) {
                        var tile = tilesRenderedByTextureCount[tileIndex];
                        if (tile.extent.contains(cartographic)) {
                            selectedTile = tile;
                        }
                    }
                }
            }

            that.tile = selectedTile;

            canvas.removeEventListener('mousedown', selectTile, false);
            that.pickTileActive = false;
        };

        this._pickTile = createCommand(function() {
            that.pickTileActive = !that.pickTileActive;

            if (that.pickTileActive) {
                canvas.addEventListener('mousedown', selectTile, false);
            } else {
                canvas.removeEventListener('mousedown', selectTile, false);
            }
        });
    };

    defineProperties(CesiumInspectorViewModel.prototype, {
        /**
         * Gets the command to toggle the visibility of the drop down.
         * @memberof BaseLayerPickerViewModel.prototype
         *
         * @type {Command}
         */
        toggleDropDown : {
            get : function() {
                return this._toggleDropDown;
            }
        },

        showFrustums : {
            get : function() {
                return this._showFrustums;
            }
        },

        showPerformance : {
            get : function() {
                return this._showPerformance;
            }
        },

        showPrimitiveBoundingSphere : {
            get : function() {
                return this._showPrimitiveBoundingSphere;
            }
        },

        showPrimitiveRefFrame : {
            get : function() {
                return this._showPrimitiveRefFrame;
            }
        },

        doFilterPrimitive : {
            get : function() {
                return this._doFilterPrimitive;
            }
        },

        showWireframe : {
            get : function() {
                return this._showWireframe;
            }
        },

        doSuspendUpdates : {
            get : function() {
                return this._doSuspendUpdates;
            }
        },

        showTileCoords : {
            get : function() {
                return this._showTileCoords;
            }
        },

        showTileBoundingSphere : {
            get : function() {
                return this._showTileBoundingSphere;
            }
        },

        doFilterTile : {
            get : function() {
                return this._doFilterTile;
            }
        },

        toggleGeneral : {
            get : function() {
                return this._toggleGeneral;
            }
        },

        togglePrimitives : {
            get : function() {
                return this._togglePrimitives;
            }
        },

        toggleTerrain : {
            get : function() {
                return this._toggleTerrain;
            }
        },

        pickPrimitive : {
            get : function() {
                return this._pickPrimitive;
            }
        },

        pickTile : {
            get : function() {
                return this._pickTile;
            }
        },

        primitive: {
            set : function(newPrimitive) {
                var oldPrimitive = this._primitive;
                if (newPrimitive !== oldPrimitive) {
                    this.hasPickedPrimitive = true;
                    if (defined(oldPrimitive)) {
                        oldPrimitive.primitive.debugShowBoundingVolume = false;
                    }
                    this._scene.debugCommandFilter = undefined;
                    if (defined(this._modelMatrixPrimitive)) {
                        this._scene.getPrimitives().remove(this._modelMatrixPrimitive);
                        this._modelMatrixPrimitive = undefined;
                    }
                    this._primitive = newPrimitive;
                    newPrimitive.primitive.show = false;
                    setTimeout(function(){
                        newPrimitive.primitive.show = true;
                    }, 50);
                    this.showPrimitiveBoundingSphere();
                    this.showPrimitiveRefFrame();
                    this.doFilterPrimitive();
                }
            },

            get : function() {
                return this._primitive;
            }
        },

        tile: {
            set : function(newTile) {
                if (defined(newTile)) {
                    this.hasPickedTile = true;
                    var oldTile = this._tile;
                    if (newTile !== oldTile) {
                        this.tileText = 'L: ' + newTile.level + ' X: ' + newTile.x + ' Y: ' + newTile.y;
                        this.tileText += '<br>SW corner: ' + newTile.extent.west + ', ' + newTile.extent.south;
                        this.tileText += '<br>NE corner: ' + newTile.extent.east + ', ' + newTile.extent.north;
                    }
                    this._tile = newTile;
                    this.showTileBoundingSphere();
                    this.doFilterTile();
                } else {
                    this.hasPickedTile = false;
                    this._tile = undefined;
                }
            },

            get : function() {
                return this._tile;
            }
        }
    });

    return CesiumInspectorViewModel;
});