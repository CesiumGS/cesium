/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Color',
        '../Scene/Polyline'
       ], function(
         DeveloperError,
         destroyObject,
         Color,
         Polyline) {
    "use strict";

    /**
     * A DynamicObject visualizer which maps the DynamicPolyline instance
     * in DynamicObject.polyline to a Polyline primitive.
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {DynamicObjectCollection} [dynamicObjectCollection] The dynamicObjectCollection to visualize.
     *
     * @exception {DeveloperError} scene is required.
     *
     * @see DynamicPolyline
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
     * @see DynamicPyramidVisualizer
     *
     */
    function DynamicPolylineVisualizer(scene, dynamicObjectCollection) {
        this._scene = scene;
        this._unusedIndexes = [];
        this._primitives = scene.getPrimitives();
        this._polylineCollection = [];
        this._dynamicObjectCollection = undefined;
        this.setDynamicObjectCollection(dynamicObjectCollection);
    }

    /**
     * Returns the scene being used by this visualizer.
     *
     * @returns {Scene} The scene being used by this visualizer.
     */
    DynamicPolylineVisualizer.prototype.getScene = function() {
        return this._scene;
    };

    /**
     * Gets the DynamicObjectCollection being visualized.
     *
     * @returns {DynamicObjectCollection} The DynamicObjectCollection being visualized.
     */
    DynamicPolylineVisualizer.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    /**
     * Sets the DynamicObjectCollection to visualize.
     *
     * @param dynamicObjectCollection The DynamicObjectCollection to visualizer.
     */
    DynamicPolylineVisualizer.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        var oldCollection = this._dynamicObjectCollection;
        if (oldCollection !== dynamicObjectCollection) {
            if (typeof oldCollection !== 'undefined') {
                oldCollection.objectsRemoved.removeEventListener(DynamicPolylineVisualizer.prototype._onObjectsRemoved);
                this.removeAllPrimitives();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (typeof dynamicObjectCollection !== 'undefined') {
                dynamicObjectCollection.objectsRemoved.addEventListener(DynamicPolylineVisualizer.prototype._onObjectsRemoved, this);
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
    DynamicPolylineVisualizer.prototype.update = function(time) {
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
    DynamicPolylineVisualizer.prototype.removeAllPrimitives = function() {
        var i, len;
        for (i = 0, len = this._polylineCollection.length; i < len; i++) {
            this._primitives.remove(this._polylineCollection[i]);
        }

        if (typeof this._dynamicObjectCollection !== 'undefined') {
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for (i = dynamicObjects.length - 1; i > -1; i--) {
                dynamicObjects[i]._polylineVisualizerIndex = undefined;
            }
        }

        this._unusedIndexes = [];
        this._polylineCollection = [];
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof DynamicPolylineVisualizer
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see DynamicPolylineVisualizer#destroy
     */
    DynamicPolylineVisualizer.prototype.isDestroyed = function() {
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
     * @memberof DynamicPolylineVisualizer
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see DynamicPolylineVisualizer#isDestroyed
     *
     * @example
     * visualizer = visualizer && visualizer.destroy();
     */
    DynamicPolylineVisualizer.prototype.destroy = function() {
        this.removeAllPrimitives();
        return destroyObject(this);
    };

    DynamicPolylineVisualizer.prototype._updateObject = function(time, dynamicObject) {
        var dynamicPolyline = dynamicObject.polyline;
        if (typeof dynamicPolyline === 'undefined') {
            return;
        }

        var vertexPositionsProperty = dynamicObject.vertexPositions;
        if (typeof vertexPositionsProperty === 'undefined') {
            return;
        }

        var polyline;
        var showProperty = dynamicPolyline.show;
        var polylineVisualizerIndex = dynamicObject._polylineVisualizerIndex;
        var show = dynamicObject.isAvailable(time) && (typeof showProperty === 'undefined' || showProperty.getValue(time));

        if (!show) {
            //don't bother creating or updating anything else
            if (typeof polylineVisualizerIndex !== 'undefined') {
                polyline = this._polylineCollection[polylineVisualizerIndex];
                polyline.show = false;
                dynamicObject._polylineVisualizerIndex = undefined;
                this._unusedIndexes.push(polylineVisualizerIndex);
            }
            return;
        }

        if (typeof polylineVisualizerIndex === 'undefined') {
            var unusedIndexes = this._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                polylineVisualizerIndex = unusedIndexes.pop();
                polyline = this._polylineCollection[polylineVisualizerIndex];
            } else {
                polylineVisualizerIndex = this._polylineCollection.length;
                polyline = new Polyline();
                this._polylineCollection.push(polyline);
                this._primitives.add(polyline);
            }
            dynamicObject._polylineVisualizerIndex = polylineVisualizerIndex;
            polyline.dynamicObject = dynamicObject;

            // CZML_TODO Determine official defaults
            polyline.color = Color.WHITE.clone(polyline.color);
            polyline.outlineColor = Color.BLACK.clone(polyline.outlineColor);
            polyline.outlineWidth = 1;
            polyline.width = 1;
        } else {
            polyline = this._polylineCollection[polylineVisualizerIndex];
        }

        polyline.show = true;

        var vertexPositions = vertexPositionsProperty.getValueCartesian(time);
        if (typeof vertexPositions !== 'undefined' && polyline._visualizerPositions !== vertexPositions) {
            polyline.setPositions(vertexPositions);
            polyline._visualizerPositions = vertexPositions;
        }

        var property = dynamicPolyline.color;
        if (typeof property !== 'undefined') {
            polyline.color = property.getValue(time, polyline.color);
        }

        property = dynamicPolyline.outlineColor;
        if (typeof property !== 'undefined') {
            polyline.outlineColor = property.getValue(time, polyline.outlineColor);
        }

        property = dynamicPolyline.outlineWidth;
        if (typeof property !== 'undefined') {
            var outlineWidth = property.getValue(time);
            if (typeof outlineWidth !== 'undefined') {
                polyline.outlineWidth = outlineWidth;
            }
        }

        property = dynamicPolyline.width;
        if (typeof property !== 'undefined') {
            var width = property.getValue(time);
            if (typeof width !== 'undefined') {
                polyline.width = width;
            }
        }
    };

    DynamicPolylineVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, dynamicObjects) {
        var thisPolylineCollection = this._polylineCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var polylineVisualizerIndex = dynamicObject._polylineVisualizerIndex;
            if (typeof polylineVisualizerIndex !== 'undefined') {
                var polyline = thisPolylineCollection[polylineVisualizerIndex];
                polyline.show = false;
                thisUnusedIndexes.push(polylineVisualizerIndex);
                dynamicObject._polylineVisualizerIndex = undefined;
            }
        }
    };

    return DynamicPolylineVisualizer;
});