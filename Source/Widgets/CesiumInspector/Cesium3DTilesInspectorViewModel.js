/*global define*/
define([
        '../../Core/Cartesian3',
        '../../Core/Cartographic',
        '../../Scene/Cesium3DTileFeature',
        '../../Scene/Cesium3DTileset',
        '../../Scene/Cesium3DTileStyle',
        '../../Scene/Cesium3DTileColorBlendMode',
        '../../Core/Check',
        '../../Core/Color',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../ThirdParty/knockout',
        '../../Scene/PerformanceDisplay',
        '../../Core/ScreenSpaceEventHandler',
        '../../Core/ScreenSpaceEventType',
        '../../ThirdParty/when',
        '../createCommand'
    ], function(
        Cartesian3,
        Cartographic,
        Cesium3DTileFeature,
        Cesium3DTileset,
        Cesium3DTileStyle,
        Cesium3DTileColorBlendMode,
        Check,
        Color,
        defined,
        defineProperties,
        destroyObject,
        knockout,
        PerformanceDisplay,
        ScreenSpaceEventHandler,
        ScreenSpaceEventType,
        when,
        createCommand) {
    'use strict';

    function createKnockoutBindings(viewModel, options) {
        var names = [];
        var name;
        for (name in options) {
            if (options.hasOwnProperty(name)) {
                names.push(name);
                viewModel[name] = options[name].default;
            }
        }
        knockout.track(viewModel, names);

        for (name in options) {
            if (options.hasOwnProperty(name)) {
                var subscription = options[name].subscribe;
                if (subscription) {
                    viewModel._subscriptions[name] = knockout.getObservable(viewModel, name).subscribe(subscription);
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
     */
    function Cesium3DTilesInspectorViewModel(scene) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('scene', scene);
        //>>includeEnd('debug');

        var that = this;
        var canvas = scene.canvas;
        this._eventHandler = new ScreenSpaceEventHandler(canvas);
        this._scene = scene;
        this._canvas = canvas;

        function pickTileset(e) {
            var pick = that._scene.pick(e.position);
            if (defined(pick) && pick.primitive instanceof Cesium3DTileset) {
                that.tileset = pick.primitive;
            }
            that._pickActive = false;
        }

        this._togglePickTileset = createCommand(function() {
            that._pickActive = !that._pickActive;
        });

        this._performanceDisplay = new PerformanceDisplay({
            container: document.createElement('div')
        });

        this.highlightColor = new Color(1.0, 1.0, 0.0, 0.4);
        this._colorBlendModes =  [
            {
                text: 'Highlight',
                val: Cesium3DTileColorBlendMode.HIGHLIGHT
            },
            {
                text: 'Replace',
                val: Cesium3DTileColorBlendMode.REPLACE
            },
            {
                text: 'Mix',
                val: Cesium3DTileColorBlendMode.MIX
            }
        ];

        this._style = undefined;
        this._shouldStyle = false;
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
                        that._updateStats(false);
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
                    if (that._tileset) {
                        that._updateStats(true);
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
                            that._eventHandler.setInputAction(function(e) {
                                var picked = scene.pick(e.endPosition);
                                if (picked instanceof Cesium3DTileFeature) {
                                    that._feature = picked;
                                    that._updateStats(true);
                                }
                            }, ScreenSpaceEventType.MOUSE_MOVE);
                        } else {
                            that._feature = undefined;
                            that._eventHandler.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
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
            freezeFrame: {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.debugFreezeFrame = val;
                        that._scene.debugShowFrustumPlanes = val;
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
                    if (defined(that._tileset)) {
                        that._tileset.debugColorizeTiles = val;
                        if (!val) {
                            that._shouldStyle = true;
                        }
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
             * Gets or sets the flag to show tile geometric error.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Boolean}
             * @default false
             */
            showGeometricError: {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.debugShowGeometricError = val;
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
             * @default '{}'
             */
            styleString : {
                default: '{}',
                subscribe: function(val) {
                    that._styleString = val;
                    that._applyStyle();
                }
            },

            /**
             * Gets or sets the color blend mode.  This property is observable.
             * @memberof Cesium3DTilesInspectorViewModel.prototype
             *
             * @type {Cesium3DTileColorBlendMode}
             * @default Cesium3DTileColorBlendMode.HIGHLIGHT
             */
            colorBlendMode: {
                default: Cesium3DTileColorBlendMode.HIGHLIGHT,
                subscribe: function(val) {
                    if (defined(that._tileset)) {
                        that._tileset.colorBlendMode = val;
                    }
                }
            }
        };

        createKnockoutBindings(this, tilesetOptions);
        createKnockoutBindings(this, {
            _tileset: {
                default: undefined,
                subscribe: function(tileset) {
                    that._style = undefined;
                    that.statsText = '';
                    that.pickStatsText = '';
                    that._properties = {};

                    if (defined(tileset)) {
                        tileset.readyPromise.then(function(tileset) {
                            that._properties = tileset.properties;
                            that._tilesetLoaded.resolve(tileset);
                        });

                        // update tileset with existing settings
                        var settings = ['colorize',
                                        'wireframe',
                                        'showBoundingVolumes',
                                        'showContentBoundingVolumes',
                                        'showRequestVolumes',
                                        'showGeometricError',
                                        'freezeFrame'];
                        var length = settings.length;
                        for (var i = 0; i < length; ++i) {
                            knockout.getObservable(that, settings[i]).valueHasMutated();
                        }

                        // update view model with existing tileset settings
                        that.maximumSSE = tileset.maximumScreenSpaceError;
                        that.dynamicSSE = tileset.dynamicScreenSpaceError;
                        that.dynamicSSEDensity = tileset.dynamicScreenSpaceErrorDensity;
                        that.dynamicSSEFactor = tileset.dynamicScreenSpaceErrorFactor;
                        that.colorBlendMode = tileset.colorBlendMode;

                        that._updateStats(false);
                        that._updateStats(true);
                    }
                }
            },
            _feature: {
                default: undefined,
                subscribe: (function() {
                    var current;
                    var scratchColor = new Color();
                    var oldColor = new Color();
                    return function(feature) {
                        if (current !== feature) {
                            if (defined(current) && defined(current._batchTable) && !current._batchTable.isDestroyed()) {
                                // Restore original color to feature that is no longer selected
                                var frameState = that._scene.frameState;
                                if (!that._colorOverriden && defined(that._style)) {
                                    current.color = that._style.color.evaluateColor(frameState, current, scratchColor);
                                } else {
                                    current.color = oldColor;
                                }
                                current = undefined;
                            }
                            if (defined(feature)) {
                                // Highlight new feature
                                current = feature;
                                Color.clone(feature.color, oldColor);
                                feature.color = that.highlightColor;
                            }
                        }
                    };
                })()
            },
            _pickActive: {
                default: false,
                subscribe: function(val) {
                    if (val) {
                        that._eventHandler.setInputAction(pickTileset, ScreenSpaceEventType.LEFT_CLICK);
                    } else {
                        that._eventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
                    }
                }
            },
            _styleString: {
                default: '{}'
            },
            _editorError: {
                default: ''
            },
            _properties: {
                default: {}
            }
        });
        for (var name in tilesetOptions) {
            if (tilesetOptions.hasOwnProperty(name)) {
                // force an update on all options so default event listeners are created
                knockout.getObservable(that, name).valueHasMutated();
            }
        }

        this.propertiesText = knockout.pureComputed(function() {
            var names = [];
            for (var prop in that._properties) {
                if (that._properties.hasOwnProperty(prop)) {
                    names.push(prop);
                }
            }
            return names.join(', ');
        });
    }

    defineProperties(Cesium3DTilesInspectorViewModel.prototype, {
        /**
         * Gets or sets the tileset of the view model
         * @memberof Cesium3DTilesInspectorViewModel.prototype
         *
         * @type {Cesium3DTileset}
         */
        tileset: {
            get: function() {
                return this._tileset;
            },

            set: function(tileset) {
                this._feature = undefined;
                this._tilesetLoaded = when.defer();
                this._tileset = tileset;
            }
        },

        /**
         * Gets the current feature of the view model
         * @memberof Cesium3DTilesInspectorViewModel.prototype
         *
         * @type {Cesium3DTileFeature}
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

        _compileStyle: {
            get: function() {
                var that = this;
                return createCommand(function() {
                    that.styleString = that._styleString;
                    that._applyStyle();
                });
            }
        },

        _checkCompile: {
            get: function() {
                var that = this;
                return createCommand(function(sender, event) {
                    if (event.ctrlKey && (event.keyCode === 10 || event.keyCode === 13)) {
                        that._compileStyle();
                    }
                    return true;
                });
            }
        },

        _colorOverriden: {
            get: function() {
                return this.colorize;
            }
        }
    });


    Cesium3DTilesInspectorViewModel.prototype._applyStyle = function() {
        if (defined(this._style)) {
            if (this._styleString !== JSON.stringify(this._style.style)) {
                if (defined(this._tileset)) {
                    var old = this._tileset.style;
                    this._editorError = '';
                    try {
                        if (this._styleString.length === 0) {
                            this._styleString = '{}';
                        }
                        var style = new Cesium3DTileStyle(JSON.parse(this._styleString));
                        this._tileset.style = style;
                        this._style = style;
                        this._tileset.update(this._scene.frameState);
                    } catch(err) {
                        this._tileset.style = old;
                        this._style = old;
                        this._editorError = err.toString();
                    }

                    // set feature again so pick coloring is set
                    var temp = this._feature;
                    this._feature = undefined;
                    this._feature = temp;
                }
            }
        }
    };

    /**
     * Updates the view model's stats text
     */
    Cesium3DTilesInspectorViewModel.prototype._updateStats = function(isPick) {
        var tileset = this._tileset;
        if (!defined(tileset)) {
            return;
        }

        var stats = tileset.statistics;
        var outputStats = (this.showStats && !isPick) || (this.showPickStats && isPick);

        if (outputStats) {
            // Since the pick pass uses a smaller frustum around the pixel of interest,
            // the stats will be different than the normal render pass.
            var s = '<ul class="cesium-cesiumInspector-stats">';
            s +=
                // --- Rendering stats
                '<li><strong>Visited: </strong>' + stats.visited.toLocaleString() + '</li>' +
                // Number of commands returned is likely to be higher than the number of tiles selected
                // because of tiles that create multiple commands.
                '<li><strong>Selected: </strong>' + tileset._selectedTiles.length.toLocaleString() + '</li>' +
                // Number of commands executed is likely to be higher because of commands overlapping
                // multiple frustums.
                '<li><strong>Commands: </strong>' + stats.numberOfCommands.toLocaleString() + '</li>';
            s += '</ul>';
            s += '<ul class="cesium-cesiumInspector-stats">';
            if (!isPick) {
                s +=
                    // --- Cache/loading stats
                    '<li><strong>Requests: </strong>' + stats.numberOfPendingRequests.toLocaleString() + '</li>' +
                    '<li><strong>Attempted: </strong>' + stats.numberOfAttemptedRequests.toLocaleString() + '</li>' +
                    '<li><strong>Processing: </strong>' + stats.numberProcessing.toLocaleString() + '</li>' +
                    '<li><strong>Content Ready: </strong>' + stats.numberContentReady.toLocaleString() + '</li>' +
                    // Total number of tiles includes tiles without content, so "Ready" may never reach
                    // "Total."  Total also will increase when a tile with a tileset.json content is loaded.
                    '<li><strong>Total: </strong>' + stats.numberTotal.toLocaleString() + '</li>';
                s += '</ul>';
                s += '<ul class="cesium-cesiumInspector-stats">';
                s +=
                    // --- Features stats
                    '<li><strong>Features Selected: </strong>' + stats.numberOfFeaturesSelected.toLocaleString() + '</li>' +
                    '<li><strong>Features Loaded: </strong>' + stats.numberOfFeaturesLoaded.toLocaleString() + '</li>' +
                    '<li><strong>Points Selected: </strong>' + stats.numberOfPointsSelected.toLocaleString() + '</li>' +
                    '<li><strong>Points Loaded: </strong>' + stats.numberOfPointsLoaded.toLocaleString() + '</li>';
                s += '</ul>';
                s += '<ul class="cesium-cesiumInspector-stats">';
                s +=
                    // --- Styling stats
                    '<li><strong>Tiles styled: </strong>' + stats.numberOfTilesStyled.toLocaleString() + '</li>' +
                    '<li><strong>Features styled: </strong>' + stats.numberOfFeaturesStyled.toLocaleString() + '</li>';
                s += '</ul>';
                s += '<ul class="cesium-cesiumInspector-stats">';
                s +=
                    // --- Optimization stats
                    '<li><strong>Children Union Culled: </strong>' + stats.numberOfTilesCulledWithChildrenUnion.toLocaleString() + '</li>';
                s += '</ul>';
            }

            if (isPick) {
                this.pickStatsText = s;
            } else {
                this.statsText = s;
            }
        }

        this.pickStatsText = this.showPickStats ? this.pickStatsText : '';
        this.statsText = this.showStats ? this.statsText : '';
    };

    /**
     * Updates the view model
     */
    Cesium3DTilesInspectorViewModel.prototype.update = function() {
        var tileset = this._tileset;

        if (this.performance) {
            this._performanceDisplay.update();
        }

        if (defined(tileset) && (!defined(this._style) || this._style !== tileset.style)) {
            this._style = tileset.style;
            if (defined(this._style)) {
                this.styleString = JSON.stringify(this._style.style, null, '  ');
            } else {
                this.styleString = '';
            }
        }

        if (this._shouldStyle && defined(tileset)) {
            tileset._styleEngine.makeDirty();
            this._shouldStyle = false;
        }

        this._updateStats(false);
    };

    /**
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    Cesium3DTilesInspectorViewModel.prototype.isDestroyed = function() {
        return false;
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
