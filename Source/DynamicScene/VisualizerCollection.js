/*global define*/
define([
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        './CzmlDefaults'
    ], function(
        defaultValue,
        destroyObject,
        DeveloperError,
        CzmlDefaults) {
    "use strict";

    /**
     * A collection of visualizers which makes it easy to manage and
     * update them in unison.
     * @alias VisualizerCollection
     * @constructor
     *
     * @param {Object} The array of visualizers to use.
     * @param {DynamicObjectCollection} The objects to be visualized.
     *
     * @see CzmlDefaults#createVisualizers
     */
    var VisualizerCollection = function(visualizers, dynamicObjectCollection) {
        this._visualizers = typeof visualizers !== 'undefined' ? visualizers : [];
        this._dynamicObjectCollection = undefined;
        this.setDynamicObjectCollection(dynamicObjectCollection);
    };

    /**
     * Creates a new VisualizerCollection which includes all standard visualizers.
     *
     * @memberof VisualizerCollection
     *
     * @param {Scene} The scene where visualization will take place.
     * @param {DynamicObjectCollection} The objects to be visualized.
     *
     * @exception {DeveloperError} scene is required.
     *
     * @see CzmlDefaults#createVisualizers
     */
    VisualizerCollection.createCzmlStandardCollection = function(scene, dynamicObjectCollection) {
        if (typeof scene === 'undefined') {
            throw new DeveloperError('scene is required.');
        }
        return new VisualizerCollection(CzmlDefaults.createVisualizers(scene), dynamicObjectCollection);
    };

    /**
     * Gets a copy of the array of visualizers in the collection.
     * @returns {Array} the array of visualizers in the collection.
     */
    VisualizerCollection.prototype.getVisualizers = function() {
        return this._visualizers.slice(0);
    };

    /**
     * Sets the array of visualizers in the collection.
     *
     * @param {Array} visualizers The new array of visualizers.  This array can partially overlap with visualizers currently in the collection.
     * @param {Boolean} destroyOldVisualizers If true, visualizers no longer in the collection will be destroyed.
     */
    VisualizerCollection.prototype.setVisualizers = function(visualizers, destroyOldVisualizers) {
        destroyOldVisualizers = defaultValue(destroyOldVisualizers, true);

        var i;
        var thisVisualizers = this._visualizers;
        if (destroyOldVisualizers) {
            for (i = thisVisualizers.length - 1; i > -1; i--) {
                var visualizer = thisVisualizers[i];
                if (visualizers.indexOf(visualizer) === -1) {
                    visualizer.destroy();
                }
            }
        }

        if (typeof visualizers === 'undefined') {
            visualizers = [];
        }
        this._visualizers = visualizers;
        var dynamicObjectCollection = this._dynamicObjectCollection;
        for (i = visualizers.length - 1; i > -1; i--) {
            visualizers[i].setDynamicObjectCollection(dynamicObjectCollection);
        }
    };

    /**
     * Gets the DynamicObjectCollection being visualized.
     * @returns the DynamicObjectCollection being visualized
     */
    VisualizerCollection.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    /**
     * Sets the DynamicObjectCollection being visualized.
     * @param {DynamicObjectCollection} dynamicObjectCollection the DynamicObjectCollection being visualized.
     */
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

    /**
     * Updates all visualizers to the provided time.
     * @param {JulianDate} time The time to updated to.
     */
    VisualizerCollection.prototype.update = function(time) {
        var visualizers = this._visualizers;
        for ( var i = visualizers.length - 1; i > -1; i--) {
            visualizers[i].update(time);
        }
    };

    /**
     * Removes all primitives from visualization.
     */
    VisualizerCollection.prototype.removeAllPrimitives = function() {
        var visualizers = this._visualizers;
        for ( var i = visualizers.length - 1; i > -1; i--) {
            visualizers[i].removeAllPrimitives();
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
        destroyVisualizers = defaultValue(destroyVisualizers, true);
        this.removeAllPrimitives();
        if (destroyVisualizers) {
            var visualizers = this._visualizers;
            for ( var i = visualizers.length - 1; i > -1; i--) {
                visualizers[i].destroy();
            }
        }
        return destroyObject(this);
    };

    return VisualizerCollection;
});