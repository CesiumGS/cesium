/*global define*/
define([
        '../../Core/Color',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../../Core/Rectangle',
        '../../Core/ScreenSpaceEventHandler',
        '../../Core/ScreenSpaceEventType',
        '../../Scene/DebugModelMatrixPrimitive',
        '../../Scene/PerformanceDisplay',
        '../../Scene/TileCoordinatesImageryProvider',
        '../../ThirdParty/knockout',
        '../createCommand'
    ], function(
        Color,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        Rectangle,
        ScreenSpaceEventHandler,
        ScreenSpaceEventType,
        DebugModelMatrixPrimitive,
        PerformanceDisplay,
        TileCoordinatesImageryProvider,
        knockout,
        createCommand) {
    "use strict";

    function frustumStatsToString(stats) {
        var str;
        if (defined(stats)) {
            str = 'Command Statistics';
            var com = stats.commandsInFrustums;
            for (var n in com) {
                if (com.hasOwnProperty(n)) {
                    var num = parseInt(n, 10);
                    var s;
                    if (num === 7) {
                        s = '1, 2 and 3';
                    } else {
                        var f = [];
                        for (var i = 2; i >= 0; i--) {
                            var p = Math.pow(2, i);
                            if (num >= p) {
                                f.push(i + 1);
                                num -= p;
                            }
                        }
                        s = f.reverse().join(' and ');
                    }
                    str += '<br>&nbsp;&nbsp;&nbsp;&nbsp;' + com[n] + ' in frustum ' + s;
                }
            }
            str += '<br>Total: ' + stats.totalCommands;
        }

        return str;
    }

    function boundDepthFrustum(lower, upper, proposed) {
        var bounded = Math.min(proposed, upper);
        bounded = Math.max(bounded, lower);
        return bounded;
    }

    /**
     * The view model for {@link CesiumInspector}.
     * @alias CesiumInspectorViewModel
     * @constructor
     *
     * @param {Scene} scene The scene instance to use.
     *
     * @exception {DeveloperError} scene is required.
     */
    var CesiumInspectorViewModel = function(scene, performanceContainer) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required');
        }

        if (!defined(performanceContainer)) {
            throw new DeveloperError('performanceContainer is required');
        }
        //>>includeEnd('debug');

        var that = this;
        var canvas = scene.canvas;
        var eventHandler = new ScreenSpaceEventHandler(canvas);
        this._eventHandler = eventHandler;
        this._scene = scene;
        this._canvas = canvas;
        this._primitive = undefined;
        this._tile = undefined;
        this._modelMatrixPrimitive = undefined;
        this._performanceDisplay = undefined;
        this._performanceContainer = performanceContainer;

        var globe = this._scene.globe;
        globe.depthTestAgainstTerrain = true;

        /**
         * Gets or sets the show frustums state.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.frustums = false;

        /**
         * Gets or sets the show performance display state.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.performance = false;

        /**
         * Gets or sets the shader cache text.  This property is observable.
         * @type {String}
         * @default ''
         */
        this.shaderCacheText = '';

        /**
         * Gets or sets the show primitive bounding sphere state.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.primitiveBoundingSphere = false;

        /**
         * Gets or sets the show primitive reference frame state.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.primitiveReferenceFrame = false;

        /**
         * Gets or sets the filter primitive state.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.filterPrimitive = false;

        /**
         * Gets or sets the show tile bounding sphere state.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.tileBoundingSphere = false;

        /**
         * Gets or sets the filter tile state.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.filterTile = false;

        /**
         * Gets or sets the show wireframe state.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.wireframe = false;

        /**
         * Gets or sets the show globe depth state.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.globeDepth = false;

        /**
         * Gets or sets the show pick depth state.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.pickDepth = false;

        /**
         * Gets or sets the index of the depth frustum to display.  This property is observable.
         * @type {Number}
         * @default 1
         */
        this.depthFrustum = 1;
        this._numberOfFrustums = 1;

        /**
         * Gets or sets the index of the depth frustum text.  This property is observable.
         * @type {String}
         * @default '1 of 1'
         */
        this.depthFrustumText = '1 of 1';

        /**
         * Gets or sets the suspend updates state.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.suspendUpdates = false;

        /**
         * Gets or sets the show tile coordinates state.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.tileCoordinates = false;

        /**
         * Gets or sets the frustum statistic text.  This property is observable.
         * @type {String}
         * @default ''
         */
        this.frustumStatisticText = '';

        /**
         * Gets or sets the selected tile information text.  This property is observable.
         * @type {String}
         * @default ''
         */
        this.tileText = '';

        /**
         * Gets if a primitive has been selected.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.hasPickedPrimitive = false;

        /**
         * Gets if a tile has been selected.  This property is observable
         * @type {Boolean}
         * @default false
         */
        this.hasPickedTile = false;

        /**
         * Gets if the picking primitive command is active.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.pickPimitiveActive = false;

        /**
         * Gets if the picking tile command is active.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.pickTileActive = false;

        /**
         * Gets or sets if the cesium inspector drop down is visible.  This property is observable.
         * @type {Boolean}
         * @default true
         */
        this.dropDownVisible = true;

        /**
         * Gets or sets if the general section is visible.  This property is observable.
         * @type {Boolean}
         * @default true
         */
        this.generalVisible = true;

        /**
         * Gets or sets if the primitive section is visible.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.primitivesVisible = false;

        /**
         * Gets or sets if the terrain section is visible.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.terrainVisible = false;

        /**
         * Gets or sets if the text on the general section expand button.  This property is observable.
         * @type {String}
         * @default '-'
         */
        this.generalSwitchText = '-';

        /**
         * Gets or sets if the text on the primitive section expand button.  This property is observable.
         * @type {String}
         * @default '+'
         */
        this.primitivesSwitchText = '+';

        /**
         * Gets or sets if the text on the terrain section expand button.  This property is observable.
         * @type {String}
         * @default '+'
         */
        this.terrainSwitchText = '+';

        knockout.track(this, ['filterTile', 'suspendUpdates', 'dropDownVisible', 'shaderCacheText', 'frustums',
                              'frustumStatisticText', 'pickTileActive', 'pickPrimitiveActive', 'hasPickedPrimitive',
                              'hasPickedTile', 'tileText', 'generalVisible', 'generalSwitchText',
                              'primitivesVisible', 'primitivesSwitchText', 'terrainVisible', 'terrainSwitchText', 'depthFrustumText']);

        this._toggleDropDown = createCommand(function() {
            that.dropDownVisible = !that.dropDownVisible;
        });

        this._toggleGeneral = createCommand(function() {
            that.generalVisible = !that.generalVisible;
            that.generalSwitchText = that.generalVisible ? '-' : '+';
        });

        this._togglePrimitives = createCommand(function() {
            that.primitivesVisible = !that.primitivesVisible;
            that.primitivesSwitchText = that.primitivesVisible ? '-' : '+';
        });

        this._toggleTerrain = createCommand(function() {
            that.terrainVisible = !that.terrainVisible;
            that.terrainSwitchText = that.terrainVisible ? '-' : '+';
        });

        this._showFrustums = createCommand(function() {
            if (that.frustums) {
                that._scene.debugShowFrustums = true;
            } else {
                that._scene.debugShowFrustums = false;
            }
            return true;
        });

        this._showPerformance = createCommand(function() {
            if (that.performance) {
                that._performanceDisplay = new PerformanceDisplay({
                    container : that._performanceContainer
                });
            } else {
                that._performanceContainer.innerHTML = '';
            }
            return true;
        });

        this._showPrimitiveBoundingSphere = createCommand(function() {
            that._primitive.debugShowBoundingVolume = that.primitiveBoundingSphere;
            return true;
        });

        this._showPrimitiveReferenceFrame = createCommand(function() {
            if (that.primitiveReferenceFrame) {
                var modelMatrix = that._primitive.modelMatrix;
                that._modelMatrixPrimitive = new DebugModelMatrixPrimitive({
                    modelMatrix : modelMatrix
                });
                that._scene.primitives.add(that._modelMatrixPrimitive);
            } else if (defined(that._modelMatrixPrimitive)) {
                that._scene.primitives.remove(that._modelMatrixPrimitive);
                that._modelMatrixPrimitive = undefined;
            }
            return true;
        });

        this._doFilterPrimitive = createCommand(function() {
            if (that.filterPrimitive) {
                that._scene.debugCommandFilter = function(command) {
                    if (defined(that._modelMatrixPrimitive) && command.owner === that._modelMatrixPrimitive._primitive) {
                        return true;
                    } else if (defined(that._primitive)) {
                        return command.owner === that._primitive || command.owner === that._primitive._billboardCollection || command.owner.primitive === that._primitive;
                    }
                    return false;
                };
            } else {
                that._scene.debugCommandFilter = undefined;
            }
            return true;
        });

        this._showWireframe = createCommand(function() {
            globe._surface.tileProvider._debug.wireframe = that.wireframe;
            return true;
        });

        this._showGlobeDepth = createCommand(function() {
            that._scene.debugShowGlobeDepth = that.globeDepth;
            return true;
        });

        this._showPickDepth = createCommand(function() {
            that._scene.debugShowPickDepth = that.pickDepth;
            return true;
        });

        this._incrementDepthFrustum = createCommand(function() {
            var next = that.depthFrustum + 1;
            that.depthFrustum = boundDepthFrustum(1, that._numberOfFrustums, next);
            that.scene.debugShowDepthFrustum = that.depthFrustum;
            return true;
        });

        this._decrementDepthFrustum = createCommand(function() {
            var next = that.depthFrustum - 1;
            that.depthFrustum = boundDepthFrustum(1, that._numberOfFrustums, next);
            that.scene.debugShowDepthFrustum = that.depthFrustum;
            return true;
        });

        this._doSuspendUpdates = createCommand(function() {
            globe._surface._debug.suspendLodUpdate = that.suspendUpdates;
            if (!that.suspendUpdates) {
                that.filterTile = false;
            }
            return true;
        });

        var tileBoundariesLayer;
        this._showTileCoordinates = createCommand(function() {
            if (that.tileCoordinates && !defined(tileBoundariesLayer)) {
                tileBoundariesLayer = scene.imageryLayers.addImageryProvider(new TileCoordinatesImageryProvider({
                    tilingScheme : scene.terrainProvider.tilingScheme
                }));
            } else if (!that.tileCoordinates && defined(tileBoundariesLayer)) {
                scene.imageryLayers.remove(tileBoundariesLayer);
                tileBoundariesLayer = undefined;
            }
            return true;
        });

        this._showTileBoundingSphere = createCommand(function() {
            if (that.tileBoundingSphere) {
                globe._surface.tileProvider._debug.boundingSphereTile = that._tile;
            } else {
                globe._surface.tileProvider._debug.boundingSphereTile = undefined;
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

                globe._surface._tilesToRender = [];

                if (defined(that._tile)) {
                    globe._surface._tilesToRender.push(that._tile);
                }
            }
            return true;
        });

        var pickPrimitive = function(e) {
            eventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
            that.pickPrimitiveActive = false;
            var newPick = that._scene.pick({
                x : e.position.x,
                y : e.position.y
            });
            if (defined(newPick)) {
                that.primitive = defined(newPick.collection) ? newPick.collection : newPick.primitive;
            }
        };

        this._pickPrimitive = createCommand(function() {
            that.pickPrimitiveActive = !that.pickPrimitiveActive;
            if (that.pickPrimitiveActive) {
                eventHandler.setInputAction(pickPrimitive, ScreenSpaceEventType.LEFT_CLICK);
            } else {
                eventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
            }
        });

        var selectTile = function(e) {
            var selectedTile;
            var ellipsoid = globe.ellipsoid;
            var cartesian = that._scene.camera.pickEllipsoid({
                x : e.position.x,
                y : e.position.y
            }, ellipsoid);

            if (defined(cartesian)) {
                var cartographic = ellipsoid.cartesianToCartographic(cartesian);
                var tilesRendered = globe._surface.tileProvider._tilesToRenderByTextureCount;
                for (var textureCount = 0; !selectedTile && textureCount < tilesRendered.length; ++textureCount) {
                    var tilesRenderedByTextureCount = tilesRendered[textureCount];
                    if (!defined(tilesRenderedByTextureCount)) {
                        continue;
                    }

                    for (var tileIndex = 0; !selectedTile && tileIndex < tilesRenderedByTextureCount.length; ++tileIndex) {
                        var tile = tilesRenderedByTextureCount[tileIndex];
                        if (Rectangle.contains(tile.rectangle, cartographic)) {
                            selectedTile = tile;
                        }
                    }
                }
            }

            that.tile = selectedTile;

            eventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
            that.pickTileActive = false;
        };

        this._pickTile = createCommand(function() {
            that.pickTileActive = !that.pickTileActive;

            if (that.pickTileActive) {
                eventHandler.setInputAction(selectTile, ScreenSpaceEventType.LEFT_CLICK);
            } else {
                eventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
            }
        });
    };

    defineProperties(CesiumInspectorViewModel.prototype, {
        /**
         * Gets the scene to control.
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Scene}
         */
        scene : {
            get : function() {
                return this._scene;
            }
        },

        /**
         * Gets the container of the PerformanceDisplay
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Element}
         */
        performanceContainer : {
            get : function() {
                return this._performanceContainer;
            }
        },

        /**
         * Gets the command to toggle the visibility of the drop down.
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        toggleDropDown : {
            get : function() {
                return this._toggleDropDown;
            }
        },

        /**
         * Gets the command to toggle {@link Scene.debugShowFrustums}
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        showFrustums : {
            get : function() {
                return this._showFrustums;
            }
        },

        /**
         * Gets the command to toggle the visibility of the performance display.
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        showPerformance : {
            get : function() {
                return this._showPerformance;
            }
        },

        /**
         * Gets the command to toggle the visibility of a BoundingSphere for a primitive
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        showPrimitiveBoundingSphere : {
            get : function() {
                return this._showPrimitiveBoundingSphere;
            }
        },

        /**
         * Gets the command to toggle the visibility of a {@link DebugModelMatrixPrimitive} for the model matrix of a primitive
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        showPrimitiveReferenceFrame : {
            get : function() {
                return this._showPrimitiveReferenceFrame;
            }
        },

        /**
         * Gets the command to toggle a filter that renders only a selected primitive
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        doFilterPrimitive : {
            get : function() {
                return this._doFilterPrimitive;
            }
        },

        /**
         * Gets the command to toggle the view of the Globe as a wireframe
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        showWireframe : {
            get : function() {
                return this._showWireframe;
            }
        },

        /**
         * Gets the command to toggle the view of the Globe depth buffer
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        showGlobeDepth : {
            get : function() {
                return this._showGlobeDepth;
            }
        },

        /**
         * Gets the command to toggle the view of the pick depth buffer
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        showPickDepth : {
            get : function() {
                return this._showPickDepth;
            }
        },

        /**
         * Gets the command to increment the depth frustum index to be shown
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        incrementDepthFrustum : {
            get : function() {
                return this._incrementDepthFrustum;
            }
        },

        /**
         * Gets the command to decrement the depth frustum index to be shown
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        decrementDepthFrustum : {
            get : function() {
                return this._decrementDepthFrustum;
            }
        },

        /**
         * Gets the command to toggle whether to suspend tile updates
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        doSuspendUpdates : {
            get : function() {
                return this._doSuspendUpdates;
            }
        },

        /**
         * Gets the command to toggle the visibility of tile coordinates
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        showTileCoordinates : {
            get : function() {
                return this._showTileCoordinates;
            }
        },

        /**
         * Gets the command to toggle the visibility of a BoundingSphere for a selected tile
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        showTileBoundingSphere : {
            get : function() {
                return this._showTileBoundingSphere;
            }
        },

        /**
         * Gets the command to toggle a filter that renders only a selected tile
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        doFilterTile : {
            get : function() {
                return this._doFilterTile;
            }
        },

        /**
         * Gets the command to expand and collapse the general section
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        toggleGeneral : {
            get : function() {
                return this._toggleGeneral;
            }
        },

        /**
         * Gets the command to expand and collapse the primitives section
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        togglePrimitives : {
            get : function() {
                return this._togglePrimitives;
            }
        },

        /**
         * Gets the command to expand and collapse the terrain section
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        toggleTerrain : {
            get : function() {
                return this._toggleTerrain;
            }
        },

        /**
         * Gets the command to pick a primitive
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        pickPrimitive : {
            get : function() {
                return this._pickPrimitive;
            }
        },

        /**
         * Gets the command to pick a tile
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        pickTile : {
            get : function() {
                return this._pickTile;
            }
        },

        /**
         * Gets the command to pick a tile
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        selectParent : {
            get : function() {
                var that = this;
                return createCommand(function() {
                    that.tile = that.tile.parent;
                });
            }
        },

        /**
         * Gets the command to pick a tile
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        selectNW : {
            get : function() {
                var that = this;
                return createCommand(function() {
                    that.tile = that.tile.children[0];
                });
            }
        },

        /**
         * Gets the command to pick a tile
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        selectNE : {
            get : function() {
                var that = this;
                return createCommand(function() {
                    that.tile = that.tile.children[1];
                });
            }
        },

        /**
         * Gets the command to pick a tile
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        selectSW : {
            get : function() {
                var that = this;
                return createCommand(function() {
                    that.tile = that.tile.children[2];
                });
            }
        },

        /**
         * Gets the command to pick a tile
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        selectSE : {
            get : function() {
                var that = this;
                return createCommand(function() {
                    that.tile = that.tile.children[3];
                });
            }
        },

        /**
         * Gets or sets the current selected primitive
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        primitive : {
            set : function(newPrimitive) {
                var oldPrimitive = this._primitive;
                if (newPrimitive !== oldPrimitive) {
                    this.hasPickedPrimitive = true;
                    if (defined(oldPrimitive)) {
                        oldPrimitive.debugShowBoundingVolume = false;
                    }
                    this._scene.debugCommandFilter = undefined;
                    if (defined(this._modelMatrixPrimitive)) {
                        this._scene.primitives.remove(this._modelMatrixPrimitive);
                        this._modelMatrixPrimitive = undefined;
                    }
                    this._primitive = newPrimitive;
                    newPrimitive.show = false;
                    setTimeout(function() {
                        newPrimitive.show = true;
                    }, 50);
                    this.showPrimitiveBoundingSphere();
                    this.showPrimitiveReferenceFrame();
                    this.doFilterPrimitive();
                }
            },

            get : function() {
                return this._primitive;
            }
        },

        /**
         * Gets or sets the current selected tile
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        tile : {
            set : function(newTile) {
                if (defined(newTile)) {
                    this.hasPickedTile = true;
                    var oldTile = this._tile;
                    if (newTile !== oldTile) {
                        this.tileText = 'L: ' + newTile.level + ' X: ' + newTile.x + ' Y: ' + newTile.y;
                        this.tileText += '<br>SW corner: ' + newTile.rectangle.west + ', ' + newTile.rectangle.south;
                        this.tileText += '<br>NE corner: ' + newTile.rectangle.east + ', ' + newTile.rectangle.north;
                        this.tileText += '<br>Min: ' + newTile.data.minimumHeight + ' Max: ' + newTile.data.maximumHeight;
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
        },

        update : {
            get : function() {
                var that = this;
                return function() {
                    if (that.frustums) {
                        that.frustumStatisticText = frustumStatsToString(that._scene.debugFrustumStatistics);
                    }

                    // Determine the number of frustums being used.
                    var numberOfFrustums = that._scene.numberOfFrustums;
                    that._numberOfFrustums = numberOfFrustums;
                    // Bound the frustum to be displayed.
                    var depthFrustum = boundDepthFrustum(1, numberOfFrustums, that.depthFrustum);
                    that.depthFrustum = depthFrustum;
                    that.scene.debugShowDepthFrustum = depthFrustum;
                    // Update the displayed text.
                    that.depthFrustumText = depthFrustum + ' of ' + numberOfFrustums;

                    if (that.performance) {
                        that._performanceDisplay.update();
                    }
                    if (that.primitiveReferenceFrame) {
                        that._modelMatrixPrimitive.modelMatrix = that._primitive.modelMatrix;
                    }

                    that.shaderCacheText = 'Cached shaders: ' + that._scene.context.shaderCache.numberOfShaders;
                };
            }
        }
    });

    /**
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    CesiumInspectorViewModel.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    CesiumInspectorViewModel.prototype.destroy = function() {
        this._eventHandler.destroy();
        return destroyObject(this);
    };

    return CesiumInspectorViewModel;
});
