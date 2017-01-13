/*global define*/
define([
    '../../Core/defined',
    '../../Scene/Cesium3DTileset',
    '../../Scene/Cesium3DTileStyle',
    '../../Core/Check',
    '../../Core/defineProperties',
    '../../Core/destroyObject',
    '../../Core/ScreenSpaceEventHandler',
    '../../ThirdParty/knockout'
    ], function(
        defined,
        Cesium3DTileset,
        Cesium3DTileStyle,
        Check,
        defineProperties,
        destroyObject,
        ScreenSpaceEventHandler,
        knockout) {
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
     *
     * @exception {DeveloperError} scene is required.
     */
    function Cesium3DTilesInspectorViewModel(scene, onLoad) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object(scene, 'scene');
        //>>includeEnd('debug');

        var that = this;
        var canvas = scene.canvas;
        var eventHandler = new ScreenSpaceEventHandler(canvas);
        this._scene = scene;
        this._canvas = canvas;
        this._tileset = undefined;

        var tilesetOptions = {
            showStats: {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.debugShowStatistics = val;
                    }
                }
            },
            showPickStats: {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.debugShowPickStatistics = val;
                    }
                }
            },
            suspendUpdates: {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.debugFreezeFrame = val;
                    }
                }
            },
            colorize: {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.debugColorizeTiles = val;
                    }
                }
            },
            wireframe: {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.debugWireframe = val;
                    }
                }
            },
            showBoundingVolumes: {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.debugShowBoundingVolume = val;
                    }
                }
            },
            showContentBoundingVolumes: {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.debugShowContentBoundingVolume = val;
                    }
                }
            },
            showRequestVolumes: {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.debugShowViewerRequestVolume = val;
                    }
                }
            },
            SSE: {
                default: 10,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.maximumScreenSpaceError = val;
                    }
                }
            },
            dynamicSSE: {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.dynamicScreenSpaceError = val;
                    }
                }
            },
            dynamicSSEDensity: {
                default: 10,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.dynamicScreenSpaceErrorDensity = val;
                    }
                }
            },
            dynamicSSEFactor: {
                default: 10,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.dynamicScreenSpaceErrorFactor = val;
                    }
                }
            },
            picking: {
                default: false,
                subscribe: function(val) {
                    console.log(val);
                }
            },
            performance: {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.debugFreezeFrame = val;
                    }
                }
            },
            showTileURL: {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.debugFreezeFrame = val;
                    }
                }
            },
            ignoreBatchTable: {
                default: false,
                subscribe: function(val) {
                    if (that._tileset) {
                        that._tileset.debugFreezeFrame = val;
                    }
                }
            }
        };
        this._subscriptions = {};
        createKnockoutBindings(this, tilesetOptions);
        createKnockoutBindings(this, {
            _tilesetOptions: {
                default: []
            },
            _selectedTileset: {
                default: undefined,
                subscribe: function(val) {
                    if (defined(that._tileset)) {
                        scene.primitives.remove(that._tileset);
                    }
                    if (defined(val)) {
                        that._tileset = that._scene.primitives.add(new Cesium3DTileset({
                            url: val.url
                        }));
                        that._tileset.readyPromise.then(tilesetLoaded);
                    } else {
                        that._tileset = undefined;
                    }
                }
            }
        });

        function tilesetLoaded(tileset) {
            for (var name in tilesetOptions) {
                if (tilesetOptions.hasOwnProperty(name)) {
                    // force an update on all options so the new tileset gets updated
                    knockout.getObservable(that, name).valueHasMutated();
                }
            }
            onLoad(tileset);
        }
    }

    defineProperties(Cesium3DTilesInspectorViewModel.prototype, {
        /**
         * Gets and sets the tilesets used for the view model
         * @memberof Cesium3DTilesInspectorViewModel.prototype
         *
         * @type Object
         */
        tilesets : {
            get : function() {
                return this._tilesets;
            },
            set: function(tilesets) {
                this._tilesets = tilesets;
                while(this._tilesetOptions.length > 0) {
                    this._tilesetOptions.pop();
                }
                for (var name in this._tilesets) {
                    if (this._tilesets.hasOwnProperty(name)) {
                        this._tilesetOptions.push({
                            name: name,
                            url: this._tilesets[name]
                        });
                    }
                }
            }
        }
    });

    Cesium3DTilesInspectorViewModel.prototype.trimTiles = function() {

    };

    Cesium3DTilesInspectorViewModel.prototype.update = function() {

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
