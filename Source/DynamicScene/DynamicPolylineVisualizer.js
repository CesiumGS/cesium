/*global define*/
define([
        '../Core/destroyObject',
        '../Core/Color',
        '../Scene/Polyline'
       ], function(
         destroyObject,
         Color,
         Polyline) {
    "use strict";

    function DynamicPolylineVisualizer(scene, dynamicObjectCollection) {
        this._scene = scene;
        this._unusedIndexes = [];
        this._primitives = scene.getPrimitives();
        this._polylineCollection = [];
        this._dynamicObjectCollection = undefined;
        this.setDynamicObjectCollection(dynamicObjectCollection);
    }

    DynamicPolylineVisualizer.prototype.getScene = function() {
        return this._scene;
    };

    DynamicPolylineVisualizer.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    DynamicPolylineVisualizer.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        var oldCollection = this._dynamicObjectCollection;
        if (oldCollection !== dynamicObjectCollection) {
            if (typeof oldCollection !== 'undefined') {
                oldCollection.objectsRemoved.removeEventListener(DynamicPolylineVisualizer.prototype._onObjectsRemoved);
                this.removeAll();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (typeof dynamicObjectCollection !== 'undefined') {
                dynamicObjectCollection.objectsRemoved.addEventListener(DynamicPolylineVisualizer.prototype._onObjectsRemoved, this);
            }
        }
    };

    DynamicPolylineVisualizer.prototype.update = function(time) {
        var dynamicObjects = this._dynamicObjectCollection.getObjects();
        for ( var i = 0, len = dynamicObjects.length; i < len; i++) {
            this.updateObject(time, dynamicObjects[i]);
        }
    };

    DynamicPolylineVisualizer.prototype.updateObject = function(time, dynamicObject) {
        var dynamicPolyline = dynamicObject.polyline;
        if (typeof dynamicPolyline === 'undefined') {
            return;
        }

        var vertexPositionsProperty = dynamicObject.vertexPositions;
        if (typeof vertexPositionsProperty === 'undefined') {
            return;
        }

        var polyline;
        var objectId = dynamicObject.id;
        var showProperty = dynamicPolyline.show;
        var polylineVisualizerIndex = dynamicObject.polylineVisualizerIndex;
        var show = dynamicObject.isAvailable(time) && (typeof showProperty === 'undefined' || showProperty.getValue(time));

        if (!show) {
            //don't bother creating or updating anything else
            if (typeof polylineVisualizerIndex !== 'undefined') {
                polyline = this._polylineCollection[polylineVisualizerIndex];
                polyline.show = false;
                dynamicObject.polylineVisualizerIndex = undefined;
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
            dynamicObject.polylineVisualizerIndex = polylineVisualizerIndex;
            polyline.id = objectId;

            // CZML_TODO Determine official defaults
            polyline.color = Color.WHITE;
            polyline.outlineColor = Color.BLACK;
            polyline.outlineWidth = 1;
            polyline.width = 1;
        } else {
            polyline = this._polylineCollection[polylineVisualizerIndex];
        }

        polyline.show = true;

        var value = vertexPositionsProperty.getValueCartesian(time);
        if (typeof value !== 'undefined' && polyline.last_position !== value) {
            polyline.setPositions(value);
            polyline.last_position = value;
        }

        var property = dynamicPolyline.color;
        if (typeof property !== 'undefined') {
            value = property.getValue(time);
            if (typeof value !== 'undefined') {
                polyline.color = value;
            }
        }

        property = dynamicPolyline.outlineColor;
        if (typeof property !== 'undefined') {
            value = property.getValue(time);
            if (typeof value !== 'undefined') {
                polyline.outlineColor = value;
            }
        }

        property = dynamicPolyline.outlineWidth;
        if (typeof property !== 'undefined') {
            value = property.getValue(time);
            if (typeof value !== 'undefined') {
                polyline.outlineWidth = value;
            }
        }

        property = dynamicPolyline.width;
        if (typeof property !== 'undefined') {
            value = property.getValue(time);
            if (typeof value !== 'undefined') {
                polyline.width = value;
            }
        }
    };

    DynamicPolylineVisualizer.prototype.removeAll = function() {
        var i, len;
        for (i = 0, len = this._polylineCollection.length; i < len; i++) {
            this._primitives.remove(this._polylineCollection[i]);
        }

        var dynamicObjects = this._dynamicObjectCollection.getObjects();
        for (i = dynamicObjects.length - 1; i > -1; i--) {
            dynamicObjects[i].polylineVisualizerIndex = undefined;
        }

        this._unusedIndexes = [];
        this._polylineCollection = [];
    };

    DynamicPolylineVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, dynamicObjects) {
        var thisPolylineCollection = this._polylineCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var polylineVisualizerIndex = dynamicObject.polylineVisualizerIndex;
            if (typeof polylineVisualizerIndex !== 'undefined') {
                var polyline = thisPolylineCollection[polylineVisualizerIndex];
                polyline.show = false;
                thisUnusedIndexes.push(polylineVisualizerIndex);
                dynamicObject.polylineVisualizerIndex = undefined;
            }
        }
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
        this.removeAll();
        return destroyObject(this);
    };

    return DynamicPolylineVisualizer;
});