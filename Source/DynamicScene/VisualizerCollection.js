/*global define*/
define([
        '../Core/destroyObject'
       ], function(
         destroyObject) {
    "use strict";

    function VisualizerCollection(visualizers, dynamicObjectCollection) {
        this._visualizers = visualizers;
        this._dynamicObjectCollection = undefined;
        this.setDynamicObjectCollection(dynamicObjectCollection);
    }

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
     * @memberof DynamicPyramidVisualizer
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see DynamicPyramidVisualizer#destroy
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
     * @memberof DynamicPyramidVisualizer
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see DynamicPyramidVisualizer#isDestroyed
     *
     * @example
     * visualizerCollection = visualizerCollection && visualizerCollection.destroy();
     */
    VisualizerCollection.prototype.destroy = function() {
        var visualizers = this._visualizers;
        for ( var i = visualizers.length - 1; i > -1; i--) {
            visualizers[i].destroy();
        }
        return destroyObject(this);
    };

    return VisualizerCollection;
});