/*global define*/
define([
    '../../Core/Cartesian3',
    '../../Core/Cartographic',
    '../../Scene/Cesium3DTileset',
    '../../Scene/Cesium3DTileStyle',
    '../../Core/Check',
    '../../Core/Color',
    '../../Core/defined',
    '../../Core/defineProperties',
    '../../Core/destroyObject',
    '../../ThirdParty/knockout',
    '../../Scene/PerformanceDisplay',
    '../../Core/ScreenSpaceEventHandler',
    '../../Core/ScreenSpaceEventType',
    '../createCommand'
    ], function(
        Cartesian3,
        Cartographic,
        Cesium3DTileset,
        Cesium3DTileStyle,
        Check,
        Color,
        defined,
        defineProperties,
        destroyObject,
        knockout,
        PerformanceDisplay,
        ScreenSpaceEventHandler,
        ScreenSpaceEventType,
        createCommand) {
    'use strict';

    function createKnockoutBindings(model, options) {
        var names = [];
        var name;
        for (name in options) {
            if (options.hasOwnProperty(name)) {
                names.push(name);
                model[name] = options[name].default;
            }
        }
        knockout.track(model, names);

        for (name in options) {
            if (options.hasOwnProperty(name)) {
                var subscription = options[name].subscribe;
                if (subscription) {
                    model._subscriptions[name] = knockout.getObservable(model, name).subscribe(subscription);
                }
            }
        }
    }

    /**
     * The view model for {@link Cesium3DTilesInspector}.
     * @alias Cesium3DTilesInspectorViewModel
     * @constructor
     *
     * @param {Scene} scene The scene instance to use.
     * @param {Function} onLoad Callback on tileset load
     * @param {Function} onUnload Callback on tileset unload
     * @param {Function} onSelect Callback on feature select
     *
     * @exception {DeveloperError} scene is required.
     */
    function Cesium3DTilesInspectorViewModel(scene, onLoad, onUnload, onSelect) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object(scene, 'scene');
        //>>includeEnd('debug');

        var that = this;
        var canvas = scene.canvas;
        var eventHandler = new ScreenSpaceEventHandler(canvas);
        this._scene = scene;
        this._canvas = canvas;
        // this._annotations = new LabelCollection();

        this._performanceDisplay = new PerformanceDisplay({
            container: document.createElement('div')
        });

        this.highlightColor = new Color(1.0, 1.0, 0.0, 0.4);
        this._style = undefined;
        this._subscriptions = {};
        var tilesetOptions = {
            /**
             * Gets or sets the flag to show stats.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default false
             */
            showStats: {
                default: true,
                subscribe: function(val) {
                    if (that._tileset) {
                        // force an update of stats because the toggle has been enabled
                        that._updateStats(false, true);
                    }
                }
            },
            /**
             * Gets or sets the flag to show pick stats.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default false
             */
            showPickStats: {
                default: true,
                subscribe: function(val) {
                    if (that._tileset && val) {
                        // force an update of pick stats because the toggle has been enabled
                        that._updateStats(true, true);
                    }
                }
            },
            /**
             * Gets or sets the flag to enable picking.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default true
             */
            picking: {
                default: true,
                subscribe: (function() {
                    return function(val) {
                        if (val) {
                            eventHandler.setInputAction(function(e) {
                                that._feature = scene.pick(e.endPosition);
                                that._updateStats(true, false);
                            }, ScreenSpaceEventType.MOUSE_MOVE);
                        } else {
                            that._feature = undefined;
                            eventHandler.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
                        }
                    };
                })()
            },
            /**
             * Gets or sets the flag to suspend updates.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default false
             */
            suspendUpdates: {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.debugFreezeFrame = val;
                    }
                }
            },
            /**
             * Gets or sets the flag to colorize tiles.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default false
             */
            colorize: {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.debugColorizeTiles = val;
                    }
                }
            },
            /**
             * Gets or sets the flag to draw with wireframe.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default false
             */
            wireframe: {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.debugWireframe = val;
                    }
                }
            },
            /**
             * Gets or sets the flag to show bounding volumes.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default false
             */
            showBoundingVolumes: {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.debugShowBoundingVolume = val;
                    }
                }
            },
            /**
             * Gets or sets the flag to show content volumes.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default false
             */
            showContentBoundingVolumes: {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.debugShowContentBoundingVolume = val;
                    }
                }
            },
            /**
             * Gets or sets the flag to show request volumes.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default false
             */
            showRequestVolumes: {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.debugShowViewerRequestVolume = val;
                    }
                }
            },
            /**
             * Gets or sets the maximum screen space error.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Number}
             * @default 16
             */
            maximumSSE : {
                default: 16,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.maximumScreenSpaceError = val;
                    }
                }
            },
            /**
             * Gets or sets the flag to enable dynamic SSE.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default false
             */
            dynamicSSE : {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.dynamicScreenSpaceError = val;
                    }
                }
            },
            /**
             * Gets or sets the dynamic SSE density.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Number}
             * @default 0.00278
             */
            dynamicSSEDensity : {
                default: 0.00278,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.dynamicScreenSpaceErrorDensity = val;
                    }
                }
            },
            /**
             * Gets or sets the dynamic SSE factor.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Number}
             * @default 4.0
             */
            dynamicSSEFactor : {
                default: 4.0,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.dynamicScreenSpaceErrorFactor = val;
                    }
                }
            },
            /**
             * Gets or sets the flag to enable performance display.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default false
             */
            performance : {
                default: false
            },
            /**
             * Gets or sets the flag to show the tile URL.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default false
             */
            showTileURL : {
                default: false
            },
            /**
             * Gets or sets the flag to ignore batch table.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default false
             */
            ignoreBatchTable : {
                default: false
            },

            /**
             * Gets or sets the flag to set stats text.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {String}
             * @default ''
             */
            statsText : {
                default: ''
            },
            /**
             * Gets or sets the flag to set pick stats text.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {String}
             * @default ''
             */
            pickStatsText : {
                default: ''
            },
            /**
             * Gets or sets the JSON for the tileset style.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {String}
             * @default undefined
             */
            styleString : {
                default: undefined,
                subscribe: function(val) {
                    if (defined(that._style)) {
                        if (val !== JSON.stringify(that._style.style)) {
                            if (defined(that._tileset)) {
                                var style = new Cesium3DTileStyle(JSON.parse(val));
                                that._tileset.style = style;
                                that._style = style;
                            }
                        }
                    }
                }
            }
        };

        createKnockoutBindings(this, tilesetOptions);
        createKnockoutBindings(this, {
            _tileset: {
                default: undefined
            },
            _feature: {
                default: undefined,
                subscribe: (function() {
                    var current = {
                        feature: undefined,
                        color: new Color()
                    };
                    return function(feature) {
                        if (current.feature !== feature) {
                            if (defined(current.feature)) {
                                // Restore original color to feature that is no longer selected
                                current.feature.color = Color.clone(current.color, current.feature.color);
                                current.feature = undefined;
                            }
                            if (defined(feature)) {
                                // Highlight new feature
                                current.feature = feature;
                                Color.clone(feature.color, current.color);
                                feature.color = Color.clone(that.highlightColor, feature.color);
                            }
                        }
                    };
                })()
            }
        });
        for (var name in tilesetOptions) {
            if (tilesetOptions.hasOwnProperty(name)) {
                // force an update on all options so default event listeners are created
                knockout.getObservable(that, name).valueHasMutated();
            }
        }

        this.tilesetURL = knockout.pureComputed(function() {
            if (!defined(that._tileset)) {
                return '<strong>URL: </strong>None';
            }
            return '<strong>URL: </strong>' + that._tileset.url;
        });
    }

    defineProperties(Cesium3DTilesInspectorViewModel.prototype, {
        /**
         * Gets or sets the tileset used for the view model
         * @memberof Cesium3DTilesInspectorViewModel.prototype
         *
         * @type {Cesium3DTileset}
         */
        tileset: {
            get: function() {
                return this._tileset;
            },
            set: function(tileset) {
                this._tileset = tileset;
                if (defined(this._statsLogger)) {
                    tileset.loadProgress.removeEventListener(this._statsLogger);
                    tileset.allTilesLoaded.removeEventListener(this._statsLogger);
                }
                if (defined(tileset)) {
                    this._statsLogger = this._updateStats.bind(this, false, false);
                    tileset.loadProgress.addEventListener(this._statsLogger);
                    tileset.allTilesLoaded.addEventListener(this._statsLogger);

                    // update tileset with existing settings
                    var settings = ['colorize',
                                    'wireframe',
                                    'showBoundingVolumes',
                                    'showContentBoundingVolumes',
                                    'showRequestVolumes',
                                    'suspendUpdates'];
                    var length = settings.length;
                    for (var i = 0; i < length; ++i) {
                        knockout.getObservable(this, settings[i]).valueHasMutated();
                    }

                    // update model with existing tileset settings
                    this.maximumSSE = tileset.maximumScreenSpaceError;
                    this.dynamicSSE = tileset.dynamicScreenSpaceError;
                    this.dynamicSSEDensity = tileset.dynamicScreenSpaceErrorDensity;
                    this.dynamicSSEFactor = tileset.dynamicScreenSpaceErrorFactor;
                }
            }
        },

        /**
         * Gets the current feature of the view model
         * @memberof Cesium3DTilesInspectorViewModel.prototype
         *
         * @type {Object}
         */
        feature: {
            get: function() {
                return this._feature;
            }
        },

        /**
         * Gets the command to trim tile cache
         * @memberof Cesium3DTilesInspectorViewModel.prototype
         *
         * @type {Command}
         */
        trimTilesCache: {
            get: function() {
                var that = this;
                return createCommand(function() {
                    if (defined(that._tileset)) {
                        that._tileset.trimLoadedTiles();
                    }
                });
            }
        },

        /**
         * Gets the command to pick a tileset
         * @memberof Cesium3DTilesInspectorViewModel.prototype
         *
         * @type {Command}
         */
        pickTileset: {
            get: function() {
                var that = this;
                return createCommand(function() {

                });
            }
        }
    });

    /**
     * Uodates the view model's stats text
     */
    Cesium3DTilesInspectorViewModel.prototype._updateStats = function(isPick, force) {
        var tileset = this._tileset;
        if (!defined(tileset)) {
            return;
        }

        var stats = tileset.statistics;
        var last = isPick ? stats.lastPick : stats.lastColor;
        var outputStats = (this.showStats && !isPick) || (this.showPickStats && isPick);
        var statsChanged =
            (last.visited !== stats.visited ||
             last.numberOfCommands !== stats.numberOfCommands ||
             last.selected !== tileset._selectedTiles.length ||
             last.numberOfAttemptedRequests !== stats.numberOfAttemptedRequests ||
             last.numberOfPendingRequests !== stats.numberOfPendingRequests ||
             last.numberProcessing !== stats.numberProcessing ||
             last.numberContentReady !== stats.numberContentReady ||
             last.numberTotal !== stats.numberTotal ||
             last.numberOfTilesStyled !== stats.numberOfTilesStyled ||
             last.numberOfFeaturesStyled !== stats.numberOfFeaturesStyled);

        if (outputStats && (force || statsChanged)) {
            // Since the pick pass uses a smaller frustum around the pixel of interest,
            // the stats will be different than the normal render pass.
            // var s = isPick ? '<strong>[Pick ]: </strong>' : '<strong>[Color]: </strong>';
            var s = '<ul class="cesium-cesiumInspector-stats">';
            s +=
                // --- Rendering stats
                '<li><strong>Visited: </strong>' + stats.visited + '</li>' +
                // Number of commands returned is likely to be higher than the number of tiles selected
                // because of tiles that create multiple commands.
                '<li><strong>Selected: </strong>' + tileset._selectedTiles.length + '</li>' +
                // Number of commands executed is likely to be higher because of commands overlapping
                // multiple frustums.
                '<li><strong>Commands: </strong>' + stats.numberOfCommands + '</li>';
            s += '</ul>';
            s += '<ul class="cesium-cesiumInspector-stats">';
            s +=
                // --- Cache/loading stats
                '<li><strong>Requests: </strong>' + stats.numberOfPendingRequests + '</li>' +
                '<li><strong>Attempted: </strong>' + stats.numberOfAttemptedRequests + '</li>' +
                '<li><strong>Processing: </strong>' + stats.numberProcessing + '</li>' +
                '<li><strong>Content Ready: </strong>' + stats.numberContentReady + '</li>' +
                // Total number of tiles includes tiles without content, so "Ready" may never reach
                // "Total."  Total also will increase when a tile with a tileset.json content is loaded.
                '<li><strong>Total: </strong>' + stats.numberTotal + '</li>';
            s += '</ul>';
            s += '<ul class="cesium-cesiumInspector-stats">';
            s +=
                // --- Styling stats
                '<li><strong>Tiles styled: </strong>' + stats.numberOfTilesStyled + '</li>' +
                '<li><strong>Features styled: </strong>' + stats.numberOfFeaturesStyled + '</li>';
            s += '</ul>';
            if (isPick) {
                this.pickStatsText = s;
            } else {
                this.statsText = s;
            }
        }

        last.visited = stats.visited;
        last.numberOfCommands = stats.numberOfCommands;
        last.selected = tileset._selectedTiles.length;
        last.numberOfAttemptedRequests = stats.numberOfAttemptedRequests;
        last.numberOfPendingRequests = stats.numberOfPendingRequests;
        last.numberProcessing = stats.numberProcessing;
        last.numberContentReady = stats.numberContentReady;
        last.numberTotal = stats.numberTotal;
        last.numberOfTilesStyled = stats.numberOfTilesStyled;
        last.numberOfFeaturesStyled = stats.numberOfFeaturesStyled;
    };

    /**
     * Updates the view model
     */
    Cesium3DTilesInspectorViewModel.prototype.update = function() {
        if (this.performance) {
            this._performanceDisplay.update();
        }

        if (defined(this._tileset) && this._style !== this._tileset.style) {
            this._style = this._tileset.style;
            if (defined(this._style)) {
                this.styleString = JSON.stringify(this._style.style, null, '    ');
            } else {
                this.styleString = '';
            }
        }
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    Cesium3DTilesInspectorViewModel.prototype.destroy = function() {
        this._eventHandler.destroy();
        for (var name in this._subscriptions) {
            if (this._subscriptions.hasOwnProperty(name)) {
                this._subscriptions[name].dispose();
            }
        }
        return destroyObject(this);
    };

    return Cesium3DTilesInspectorViewModel;
});
