/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/Cartesian2',
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Color',
        '../Scene/Material',
        '../Scene/ViewportQuad'
       ], function(
         BoundingRectangle,
         Cartesian2,
         defaultValue,
         DeveloperError,
         destroyObject,
         Color,
         Material,
         ViewportQuad) {
    "use strict";

    /**
     * A DynamicObject visualizer which maps the DynamicOverlayQuad instance
     * in DynamicObject.overlayQuad to a ViewportQuad primitive.
     * @alias DynamicOverlayQuadVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {DynamicObjectCollection} [dynamicObjectCollection] The dynamicObjectCollection to visualize.
     *
     * @exception {DeveloperError} scene is required.
     *
     * @see DynamicOverlayQuad
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
    var DynamicOverlayQuadVisualizer = function(scene, dynamicObjectCollection) {
        if (typeof scene === 'undefined') {
            throw new DeveloperError('scene is required.');
        }
        this._scene = scene;
        this._unusedIndexes = [];
        this._primitives = scene.getPrimitives();
        this._overlayQuadCollection = [];
        this._dynamicObjectCollection = undefined;
        this.setDynamicObjectCollection(dynamicObjectCollection);
    };

    /**
     * Returns the scene being used by this visualizer.
     *
     * @returns {Scene} The scene being used by this visualizer.
     */
    DynamicOverlayQuadVisualizer.prototype.getScene = function() {
        return this._scene;
    };

    /**
     * Gets the DynamicObjectCollection being visualized.
     *
     * @returns {DynamicObjectCollection} The DynamicObjectCollection being visualized.
     */
    DynamicOverlayQuadVisualizer.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    /**
     * Sets the DynamicObjectCollection to visualize.
     *
     * @param dynamicObjectCollection The DynamicObjectCollection to visualizer.
     */
    DynamicOverlayQuadVisualizer.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        var oldCollection = this._dynamicObjectCollection;
        if (oldCollection !== dynamicObjectCollection) {
            if (typeof oldCollection !== 'undefined') {
                oldCollection.objectsRemoved.removeEventListener(DynamicOverlayQuadVisualizer.prototype._onObjectsRemoved);
                this.removeAllPrimitives();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (typeof dynamicObjectCollection !== 'undefined') {
                dynamicObjectCollection.objectsRemoved.addEventListener(DynamicOverlayQuadVisualizer.prototype._onObjectsRemoved, this);
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
    DynamicOverlayQuadVisualizer.prototype.update = function(time) {
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
    DynamicOverlayQuadVisualizer.prototype.removeAllPrimitives = function() {
        var i, len;
        for (i = 0, len = this._overlayQuadCollection.length; i < len; i++) {
            this._primitives.remove(this._overlayQuadCollection[i]);
        }

        if (typeof this._dynamicObjectCollection !== 'undefined') {
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for (i = dynamicObjects.length - 1; i > -1; i--) {
                dynamicObjects[i]._overlayQuadVisualizerIndex = undefined;
            }
        }

        this._unusedIndexes = [];
        this._overlayQuadCollection = [];
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof DynamicOverlayQuadVisualizer
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see DynamicOverlayQuadVisualizer#destroy
     */
    DynamicOverlayQuadVisualizer.prototype.isDestroyed = function() {
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
     * @memberof DynamicOverlayQuadVisualizer
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see DynamicOverlayQuadVisualizer#isDestroyed
     *
     * @example
     * visualizer = visualizer && visualizer.destroy();
     */
    DynamicOverlayQuadVisualizer.prototype.destroy = function() {
        this.removeAllPrimitives();
        return destroyObject(this);
    };

    var position;
    var width;
    var height;
    DynamicOverlayQuadVisualizer.prototype._updateObject = function(time, dynamicObject) {
        var context = this._scene.getContext();
        var dynamicOverlayQuad = dynamicObject.overlayQuad;
        if (typeof dynamicOverlayQuad === 'undefined') {
            return;
        }

        var positionProperty = dynamicOverlayQuad.position;
        if (typeof positionProperty === 'undefined') {
            return;
        }

        var widthProperty = dynamicOverlayQuad.width;
        if (typeof widthProperty === 'undefined') {
            return;
        }

        var heightProperty = dynamicOverlayQuad.height;
        if (typeof heightProperty === 'undefined') {
            return;
        }


        var overlayQuad;
        var showProperty = dynamicOverlayQuad.show;
        var overlayQuadVisualizerIndex = dynamicObject._overlayQuadVisualizerIndex;
        var show = dynamicObject.isAvailable(time) && (typeof showProperty === 'undefined' || showProperty.getValue(time));

        if (!show) {
            //don't bother creating or updating anything else
            if (typeof overlayQuadVisualizerIndex !== 'undefined') {
                overlayQuad = this._overlayQuadCollection[overlayQuadVisualizerIndex];
                overlayQuad.show = false;
                dynamicObject._overlayQuadVisualizerIndex = undefined;
                this._unusedIndexes.push(overlayQuadVisualizerIndex);
            }
            return;
        }

        if (typeof overlayQuadVisualizerIndex === 'undefined') {
            var unusedIndexes = this._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                overlayQuadVisualizerIndex = unusedIndexes.pop();
                overlayQuad = this._overlayQuadCollection[overlayQuadVisualizerIndex];
            } else {
                overlayQuadVisualizerIndex = this._overlayQuadCollection.length;
                overlayQuad = new ViewportQuad();

                this._overlayQuadCollection.push(overlayQuad);
                this._primitives.add(overlayQuad);
            }
            dynamicObject._overlayQuadVisualizerIndex = overlayQuadVisualizerIndex;
            overlayQuad.dynamicObject = dynamicObject;

            overlayQuad.material = Material.fromType(context, Material.ColorType);
        } else {
            overlayQuad = this._overlayQuadCollection[overlayQuadVisualizerIndex];
        }

        position = positionProperty.getValue(time, position);
        width = widthProperty.getValue(time, width);
        height = heightProperty.getValue(time, height);

        if(typeof position !== 'undefined' && typeof width !== 'undefined' && typeof height !== 'undefined') {
            var boundRectangle = new BoundingRectangle(position.x, position.y, width, height);
            overlayQuad.setRectangle(boundRectangle);
        }

        var material = dynamicOverlayQuad.material;
        if (typeof material !== 'undefined') {
            overlayQuad.material = material.getValue(time, context, overlayQuad.material);
        }
    };

    DynamicOverlayQuadVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, dynamicObjects) {
        var thisOverlayQuadCollection = this._overlayQuadCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var overlayQuadVisualizerIndex = dynamicObject._overlayQuadVisualizerIndex;
            if (typeof overlayQuadVisualizerIndex !== 'undefined') {
                var overlayQuad = thisOverlayQuadCollection[overlayQuadVisualizerIndex];
                overlayQuad.show = false;
                thisUnusedIndexes.push(overlayQuadVisualizerIndex);
                dynamicObject._overlayQuadVisualizerIndex = undefined;
            }
        }
    };

    return DynamicOverlayQuadVisualizer;
});