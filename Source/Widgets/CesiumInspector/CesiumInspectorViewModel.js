/*global define*/
define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/BoundingRectangle',
        '../../Scene/PerformanceDisplay',
        '../../Scene/DebugModelMatrixPrimitive',
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

    var br = new BoundingRectangle(10, 300, 100, 75);
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
        var frustumInterval;

        this.frustumStatText = knockout.observable();
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
        this.pickPrimitive = false;

        knockout.track(this, ['dropDownVisible', 'showFrustums', 'frustumStatText']);

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

        var pickBoundingSphere;
        var pickedPrimitive;
        this._toggleBoundingSphere = createCommand(function() {
            that.showBoundingSphere = !that.showBoundingSphere;
            if (that.showBoundingSphere) {
                pickBoundingSphere = function(e) {
                    var newPick = scene.pick({x: e.clientX, y: e.clientY});
                    if (defined(newPick) && newPick !== pickedPrimitive) {
                        if (defined(pickedPrimitive)) {
                            pickedPrimitive.primitive.debugShowBoundingVolume = false;
                        }
                        pickedPrimitive = newPick;
                        pickedPrimitive.primitive.debugShowBoundingVolume = true;
                    }
                };
                document.addEventListener('mousedown', pickBoundingSphere, true);
            } else {
                if (defined(pickedPrimitive)) {
                    pickedPrimitive.primitive.debugShowBoundingVolume = false;
                }
                document.removeEventListener('mousedown', pickBoundingSphere, true);
            }

            return true;
        });

        var modelMatrix;
        var modelMatrixPrimitive;
        var pickRefFrame;
        this._toggleRefFrame = createCommand(function() {
            that.showRefFrame = !that.showRefFrame;
            if (that.showRefFrame) {
                pickRefFrame = function(e) {
                    var newrfPick = scene.pick({x: e.clientX, y: e.clientY});
                    if (defined(newrfPick)) {
                        modelMatrix = newrfPick.primitive.modelMatrix;
                        if (defined(modelMatrixPrimitive)) {
                            scene.getPrimitives().remove(modelMatrixPrimitive);
                        }
                        modelMatrixPrimitive = new DebugModelMatrixPrimitive({modelMatrix: modelMatrix});
                        that._scene.getPrimitives().add(modelMatrixPrimitive);
                    }
                };
                document.addEventListener('mousedown', pickRefFrame, true);
            } else {
                that._scene.getPrimitives().remove(modelMatrixPrimitive);
                document.removeEventListener('mousedown', pickRefFrame, true);
            }
            return true;
        });

        var pickPickPrimitive;
        this._togglePickPrimitive = createCommand(function() {
            that.pickPrimitive = !that.pickPrimitive;
            if (that.pickPrimitive) {
                pickPickPrimitive = function(e) {
                    var np = scene.pick({x: e.clientX, y: e.clientY});
                    if (defined(np)) {
                        that._scene.debugCommandFilter = function(command) {
                            return command.owner === np.primitive;
                        };
                    }
                };
                document.addEventListener('mousedown', pickPickPrimitive, true);
            } else {
                that._scene.debugCommandFilter = undefined;
                document.removeEventListener('mousedown', pickPickPrimitive, true);
            }
            return true;
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

        togglePickPrimitive : {
            get : function() {
                return this._togglePickPrimitive;
            }
        }
    });

    return CesiumInspectorViewModel;
});