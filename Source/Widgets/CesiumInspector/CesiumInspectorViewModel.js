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

    function setFilter(viewModel) {
        if (viewModel.filterPrimitive) {
            viewModel._scene.debugCommandFilter = function(command) {
                return command.owner === viewModel._primitive.primitive;
            };
        } else {
            viewModel._scene.debugCommandFilter = undefined;
        }
    }

    function setRefFrame(viewModel) {
        if (viewModel.showRefFrame) {
            var modelMatrix = viewModel._primitive.primitive.modelMatrix;
            viewModel._modelMatrixPrimitive = new DebugModelMatrixPrimitive({modelMatrix: modelMatrix});
            viewModel._scene.getPrimitives().add(viewModel._modelMatrixPrimitive);
        } else if (defined(viewModel._modelMatrixPrimitive)){
            viewModel._scene.getPrimitives().remove(viewModel._modelMatrixPrimitive);
            viewModel._modelMatrixPrimitive = undefined;
        }
    }

    function setBoundingSphere(viewModel) {
        viewModel._primitive.primitive.debugShowBoundingVolume = viewModel.showBoundingSphere;
    }

    var br = new BoundingRectangle(210, 10, 100, 75);
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
    var CesiumInspectorViewModel = function(scene) {
        if (!defined(scene)) {
            throw new DeveloperError('scene is required');
        }

        var that = this;

        this._scene = scene;
        this._primitive = undefined;
        this._modelMatrixPrimitive = undefined;

        var frustumInterval;

        this.frustumStatText = '';
        this.tileText = '';

        /**
         * Gets or sets whether the imagery selection drop-down is currently visible.
         * @type {Boolean}
         * @default false
         */
        this.dropDownVisible = false;
        this.showFrustums = false;
        this.showPerformance = false;
        this.showBoundingSphere = false;
        this.showRefFrame = false;
        this.wireframe = false;
        this.filterPrimitive = false;
        this.pickPrimitiveActive = false;
        this.pickTileActive = false;
        this.hasPickedPrimitive = false;

        knockout.track(this, ['dropDownVisible', 'showFrustums', 'frustumStatText', 'pickTileActive', 'pickPrimitiveActive', 'hasPickedPrimitive', 'tileText']);

        this._toggleDropDown = createCommand(function() {
            that.dropDownVisible = !that.dropDownVisible;
        });

        this._toggleFrustums = createCommand(function(){
            that.showFrustums = !that.showFrustums;
            if (that.showFrustums) {
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

        var performanceDisplay;
        this._togglePerformance = createCommand(function(){
            that.showPerformance = !that.showPerformance;
            if (that.showPerformance) {
                performanceDisplay = new PerformanceDisplay({
                    rectangle : br,
                    backgroundColor: bc,
                    font: "12px arial,sans-serif"
                });
                that._scene.getPrimitives().add(performanceDisplay);
            } else {
                that._scene.getPrimitives().remove(performanceDisplay);
            }
            return true;
        });

        this._toggleBoundingSphere = createCommand(function() {
            that.showBoundingSphere = !that.showBoundingSphere;
            setBoundingSphere(that);
            return true;
        });

        this._toggleRefFrame = createCommand(function() {
            that.showRefFrame = !that.showRefFrame;
            setRefFrame(that);
            return true;
        });

        this._toggleFilterPrimitive = createCommand(function() {
            that.filterPrimitive = !that.filterPrimitive;
            setFilter(that);
            return true;
        });

        var centralBody = this._scene.getPrimitives().getCentralBody();
        this._toggleWireframe = createCommand(function() {
            that.wireframe = !that.wireframe;
            centralBody._surface._debug.wireframe = that.wireframe;
            return true;
        });

        this._toggleSuspendUpdates = createCommand(function() {
            that.suspendUpdates = !that.suspendUpdates;
            centralBody._surface._debug.suspendLodUpdate = that.suspendUpdates;
//            if (!that.suspendUpdates) {
  //              renderSelectedTileOnlyCheckbox.set("checked", false);
    //        }
            return true;
        });

        var tileBoundariesLayer;
        this._toggleShowTileCoords = createCommand(function() {
            that.showTileCoords = !that.showTileCoords;
            if (that.showTileCoords && !defined(tileBoundariesLayer)) {
                tileBoundariesLayer = centralBody.getImageryLayers().addImageryProvider(new TileCoordinatesImageryProvider({
                    tilingScheme : centralBody.terrainProvider.getTilingScheme()
                }));
            } else if (!that.showTileCoords && defined(tileBoundariesLayer)) {
                centralBody.getImageryLayers().remove(tileBoundariesLayer);
                tileBoundariesLayer = undefined;
            }
            return true;
        });

        this._pickPrimitive = createCommand(function() {
            that.pickPrimitiveActive = true;
            var pickPrimitive = function(e) {
                var newPick = scene.pick({x: e.clientX, y: e.clientY});
                if (defined(newPick)) {
                    that.primitive = newPick;
                }
                document.removeEventListener('mousedown', pickPrimitive, true);
                that.pickPrimitiveActive = false;
            };
            document.addEventListener('mousedown', pickPrimitive, true);
        });

        this._pickTile = createCommand(function() {

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

        toggleFrustums : {
            get : function() {
                return this._toggleFrustums;
            }
        },

        togglePerformance : {
            get : function() {
                return this._togglePerformance;
            }
        },

        toggleBoundingSphere : {
            get : function() {
                return this._toggleBoundingSphere;
            }
        },

        toggleRefFrame : {
            get : function() {
                return this._toggleRefFrame;
            }
        },

        toggleFilterPrimitive : {
            get : function() {
                return this._toggleFilterPrimitive;
            }
        },

        toggleWireframe : {
            get : function() {
                return this._toggleWireframe;
            }
        },

        toggleSuspendUpdates : {
            get : function() {
                return this._toggleSuspendUpdates;
            }
        },

        toggleShowTileCoords : {
            get : function() {
                return this._toggleShowTileCoords;
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
                    if (!defined(oldPrimitive)) {
                        this.hasPickedPrimitive = true;
                    } else {
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
                    setBoundingSphere(this);
                    setRefFrame(this);
                    setFilter(this);
                }
            },

            get : function() {
                return this._primitive;
            }
        }
    });

    return CesiumInspectorViewModel;
});