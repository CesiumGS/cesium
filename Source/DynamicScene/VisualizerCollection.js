/*global define*/
define([
        '../Core/destroyObject'
       ], function(
         destroyObject) {
    "use strict";

    function VisualizerCollection(visualizers, dynamicObjectCollection) {
        this._visualizers = visualizers || [];
        this._dynamicObjectCollection = undefined;
        this.setDynamicObjectCollection(dynamicObjectCollection);
    }

    VisualizerCollection.prototype.getVisualizers = function() {
        var visualizers = this._visualizers;
        var result = [];
        for ( var i = visualizers.length - 1; i > -1; i--) {
            result.push(visualizers[i]);
        }
        return result;
    };

    VisualizerCollection.prototype.setVisualizers = function(visualizers, destroyOldVisualizers) {
        destroyOldVisualizers = (typeof destroyOldVisualizers !== 'undefined') ? destroyOldVisualizers : true;

        var i;
        var thisVisualizers = this._visualizers;
        if (destroyOldVisualizers === true) {
            for (i = thisVisualizers.length - 1; i > -1; i--) {
                var visualizer = thisVisualizers[i];
                if (visualizers.indexOf(visualizer) === -1) {
                    visualizer.destroy();
                }
            }
        }

        this._visualizers = visualizers || [];
        var dynamicObjectCollection = this._dynamicObjectCollection;
        for (i = visualizers.length - 1; i > -1; i--) {
            visualizers[i].setDynamicObjectCollection(dynamicObjectCollection);
        }
    };

    VisualizerCollection.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    VisualizerCollection.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        var oldCollection = this._dynamicObjectCollection;
        if (oldCollection !== dynamicObjectCollection) {
            this._dynamicObjectCollection = dynamicObjectCollection;
            var visualizers = this._visualizers;
            for ( var i = visualizers.length - 1; i > -1; i--) {
                visualizers[i].setDynamicObjectCollection(dynamicObjectCollection);
            }
        }
    };

    VisualizerCollection.prototype.update = function(time) {
        var visualizers = this._visualizers;
        for ( var i = visualizers.length - 1; i > -1; i--) {
            visualizers[i].update(time);
        }
    };

    VisualizerCollection.prototype.removeAll = function() {
        var visualizers = this._visualizers;
        for ( var i = visualizers.length - 1; i > -1; i--) {
            visualizers[i].removeAll();
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof VisualizerCollection
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see VisualizerCollection#destroy
     */
    VisualizerCollection.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof VisualizerCollection
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see VisualizerCollection#isDestroyed
     *
     * @example
     * visualizerCollection = visualizerCollection && visualizerCollection.destroy();
     */
    VisualizerCollection.prototype.destroy = function(destroyVisualizers) {
        destroyVisualizers = (typeof destroyVisualizers !== 'undefined') ? destroyVisualizers : true;
        this.removeAll();
        if (destroyVisualizers === true) {
            var visualizers = this._visualizers;
            for ( var i = visualizers.length - 1; i > -1; i--) {
                visualizers[i].destroy();
            }
        }
        return destroyObject(this);
    };

    return VisualizerCollection;
});