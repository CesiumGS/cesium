/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/Cartesian2',
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Color',
        '../Scene/Material',
        '../Scene/ViewportQuad',
        './MaterialProperty'
       ], function(
         BoundingRectangle,
         Cartesian2,
         defaultValue,
         DeveloperError,
         destroyObject,
         Color,
         Material,
         ViewportQuad,
         MaterialProperty) {
    "use strict";

    /**
     * A DynamicObject visualizer which maps the DynamicScreenOverlay instance
     * in DynamicObject.screenOverlay to a ViewportQuad primitive.
     * @alias DynamicScreenOverlayVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {DynamicObjectCollection} [dynamicObjectCollection] The dynamicObjectCollection to visualize.
     *
     * @exception {DeveloperError} scene is required.
     *
     * @see DynamicScreenOverlay
     * @see Scene
     * @see DynamicObject
     * @see DynamicObjectCollection
     * @see CompositeDynamicObjectCollection
     * @see VisualizerCollection
     * @see DynamicBillboardVisualizer
     * @see DynamicConeVisualizer
     * @see DynamicConeVisualizerUsingCustomSensorr
     * @see DynamicLabelVisualizer
     * @see DynamicPointVisualizer
     * @see DynamicPolygonVisualizer
     * @see DynamicPolylineVisualizer
     */
    var DynamicScreenOverlayVisualizer = function(scene, dynamicObjectCollection) {
        if (typeof scene === 'undefined') {
            throw new DeveloperError('scene is required.');
        }
        this._scene = scene;
        this._unusedIndexes = [];
        this._primitives = scene.primitives;
        this._screenOverlayCollection = [];
        this._dynamicObjectCollection = undefined;
        this.setDynamicObjectCollection(dynamicObjectCollection);
    };

    /**
     * Returns the scene being used by this visualizer.
     *
     * @returns {Scene} The scene being used by this visualizer.
     */
    DynamicScreenOverlayVisualizer.prototype.getScene = function() {
        return this._scene;
    };

    /**
     * Gets the DynamicObjectCollection being visualized.
     *
     * @returns {DynamicObjectCollection} The DynamicObjectCollection being visualized.
     */
    DynamicScreenOverlayVisualizer.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    /**
     * Sets the DynamicObjectCollection to visualize.
     *
     * @param dynamicObjectCollection The DynamicObjectCollection to visualizer.
     */
    DynamicScreenOverlayVisualizer.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        var oldCollection = this._dynamicObjectCollection;
        if (oldCollection !== dynamicObjectCollection) {
            if (typeof oldCollection !== 'undefined') {
                oldCollection.objectsRemoved.removeEventListener(DynamicScreenOverlayVisualizer.prototype._onObjectsRemoved);
                this.removeAllPrimitives();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (typeof dynamicObjectCollection !== 'undefined') {
                dynamicObjectCollection.collectionChanged.addEventListener(DynamicScreenOverlayVisualizer.prototype._onObjectsRemoved, this);
            }
        }
    };

    /**
     * Updates all of the primitives created by this visualizer to match their
     * DynamicObject counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     *
     * @exception {DeveloperError} time is required.
     */
    DynamicScreenOverlayVisualizer.prototype.update = function(time) {
        if (typeof time === 'undefined') {
            throw new DeveloperError('time is requied.');
        }
        if (typeof this._dynamicObjectCollection !== 'undefined') {
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for ( var i = 0, len = dynamicObjects.length; i < len; i++) {
                this._updateObject(time, dynamicObjects[i]);
            }
        }
    };

    /**
     * Removes all primitives from the scene.
     */
    DynamicScreenOverlayVisualizer.prototype.removeAllPrimitives = function() {
        var i, len;
        for (i = 0, len = this._screenOverlayCollection.length; i < len; i++) {
            this._primitives.remove(this._screenOverlayCollection[i]);
        }

        if (typeof this._dynamicObjectCollection !== 'undefined') {
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for (i = dynamicObjects.length - 1; i > -1; i--) {
                dynamicObjects[i]._screenOverlayVisualizerIndex = undefined;
            }
        }

        this._unusedIndexes = [];
        this._screenOverlayCollection = [];
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof DynamicScreenOverlayVisualizer
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see DynamicScreenOverlayVisualizer#destroy
     */
    DynamicScreenOverlayVisualizer.prototype.isDestroyed = function() {
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
     * @memberof DynamicScreenOverlayVisualizer
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see DynamicScreenOverlayVisualizer#isDestroyed
     *
     * @example
     * visualizer = visualizer && visualizer.destroy();
     */
    DynamicScreenOverlayVisualizer.prototype.destroy = function() {
        this.removeAllPrimitives();
        return destroyObject(this);
    };

    var position;
    var width;
    var height;
    DynamicScreenOverlayVisualizer.prototype._updateObject = function(time, dynamicObject) {
        var dynamicScreenOverlay = dynamicObject.screenOverlay;
        if (typeof dynamicScreenOverlay === 'undefined') {
            return;
        }

        var positionProperty = dynamicScreenOverlay.position;
        if (typeof positionProperty === 'undefined') {
            return;
        }

        var widthProperty = dynamicScreenOverlay.width;
        if (typeof widthProperty === 'undefined') {
            return;
        }

        var heightProperty = dynamicScreenOverlay.height;
        if (typeof heightProperty === 'undefined') {
            return;
        }


        var screenOverlay;
        var showProperty = dynamicScreenOverlay.show;
        var screenOverlayVisualizerIndex = dynamicObject._screenOverlayVisualizerIndex;
        var show = dynamicObject.isAvailable(time) && (typeof showProperty === 'undefined' || showProperty.getValue(time));

        if (!show) {
            //don't bother creating or updating anything else
            if (typeof screenOverlayVisualizerIndex !== 'undefined') {
                screenOverlay = this._screenOverlayCollection[screenOverlayVisualizerIndex];
                screenOverlay.show = false;
                dynamicObject._screenOverlayVisualizerIndex = undefined;
                this._unusedIndexes.push(screenOverlayVisualizerIndex);
            }
            return;
        }

        if (typeof screenOverlayVisualizerIndex === 'undefined') {
            var unusedIndexes = this._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                screenOverlayVisualizerIndex = unusedIndexes.pop();
                screenOverlay = this._screenOverlayCollection[screenOverlayVisualizerIndex];
            } else {
                screenOverlayVisualizerIndex = this._screenOverlayCollection.length;
                screenOverlay = new ViewportQuad();
                screenOverlay.material = Material.fromType(Material.ColorType);

                this._screenOverlayCollection.push(screenOverlay);
                this._primitives.add(screenOverlay);
            }
            dynamicObject._screenOverlayVisualizerIndex = screenOverlayVisualizerIndex;
            screenOverlay.dynamicObject = dynamicObject;

        } else {
            screenOverlay = this._screenOverlayCollection[screenOverlayVisualizerIndex];
        }


        position = positionProperty.getValue(time, position);
        width = widthProperty.getValue(time, width);
        height = heightProperty.getValue(time, height);

        screenOverlay.show = show;

        if(typeof position !== 'undefined' && typeof width !== 'undefined' && typeof height !== 'undefined') {
            screenOverlay.rectangle = new BoundingRectangle(position.x, position.y, width, height);
        }

        screenOverlay.material = MaterialProperty.getValue(time, dynamicScreenOverlay._material, screenOverlay.material, this._scene.context);
    };

    DynamicScreenOverlayVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, dynamicObjects) {
        var thisOverlayCollection = this._screenOverlayCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var screenOverlayVisualizerIndex = dynamicObject._screenOverlayVisualizerIndex;
            if (typeof screenOverlayVisualizerIndex !== 'undefined') {
                var screenOverlay = thisOverlayCollection[screenOverlayVisualizerIndex];
                screenOverlay.show = false;
                thisUnusedIndexes.push(screenOverlayVisualizerIndex);
                dynamicObject._screenOverlayVisualizerIndex = undefined;
            }
        }
    };

    return DynamicScreenOverlayVisualizer;
});