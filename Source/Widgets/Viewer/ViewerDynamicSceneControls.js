/*global define*/
define(['../../Core/defaultValue',
        '../../Core/DeveloperError',
        '../../Core/destroyObject',
        '../../Core/Event',
        '../../Core/ScreenSpaceEventType',
        '../../DynamicScene/DynamicObjectView'
        ], function(
                defaultValue,
                DeveloperError,
                destroyObject,
                Event,
                ScreenSpaceEventType,
                DynamicObjectView) {
    "use strict";

    /**
     * Adds default mouse interaction for DynamicScene objects to the Viewer widget.
     *
     * @alias ViewerDynamicSceneControls
     * @constructor
     */
    var ViewerDynamicSceneControls = function(viewer) {
        var that = this;

        this._onTick = function(clock) {
            if (typeof that._dynamicObjectView !== 'undefined') {
                that._dynamicObjectView.update(clock.currentTime);
            }
        };

        this._onHomeButton = function() {
            that._dynamicObjectView = undefined;
        };

        this._onLeftClick = function(e) {
            var pickedPrimitive = viewer.scene.pick(e.position);
            if (typeof pickedPrimitive !== 'undefined' && typeof pickedPrimitive.dynamicObject !== 'undefined') {
                that.trackedObject = pickedPrimitive.dynamicObject;
            }
        };

        viewer.clock.onTick.addEventListener(this._onTick);
        if (typeof viewer.homeButton !== 'undefined') {
            viewer.homeButton.viewModel.command.beforeExecute.addEventListener(this._onHomeButton);
        }
        viewer.screenSpaceEventHandler.setInputAction(this._onLeftClick, ScreenSpaceEventType.LEFT_CLICK);
        this._viewer = viewer;
    };

    Object.defineProperties(ViewerDynamicSceneControls.prototype, {
        /**
         * Gets the viewer instance being used.
         * @memberof ViewerDynamicSceneControls.prototype
         * @type {Viewer}
         */
        viewer : {
            get : function() {
                return this._viewer;
            }
        },

        /**
         * Gets or sets the DynamicObject instance currently being tracked by the camera.
         * @memberof ViewerDynamicSceneControls.prototype
         * @type {DynamicObject}
         */
        trackedObject : {
            get : function() {
                return this._trackedObject;
            },
            set : function(value) {
                this._trackedObject = value;
                this._dynamicObjectView = typeof value !== 'undefined' ? new DynamicObjectView(value, this.viewer.scene, this.viewer.centralBody.getEllipsoid()) : undefined;
            }
        }
    });

    /**
     * @memberof ViewerDynamicSceneControls
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    ViewerDynamicSceneControls.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the object.
     * @memberof Viewer
     */
    ViewerDynamicSceneControls.prototype.destroy = function() {
        var viewer = this.viewer;
        viewer.clock.onTick.removeEventListener(this._onTick, this);
        if (typeof viewer.homeButton !== 'undefined') {
            viewer.homeButton.viewModel.command.beforeExecute.removeEventListener(this._onHomeButton, this);
        }
        viewer.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
        return destroyObject(this);
    };

    return ViewerDynamicSceneControls;
});