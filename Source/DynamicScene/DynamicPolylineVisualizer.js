/*global define*/
define([
        '../Scene/Polyline'
    ], function(
         Polyline) {
    "use strict";

    //FIXME This class currently relies on storing data onto each CZML object
    //These objects may be transient and therefore storing data on them is bad.
    //We may need a slower "fallback" layer of storage in case the data doesn't exist.
    function DynamicPolylineVisualizer(scene) {
        this._scene = scene;
        this._unusedIndexes = [];
        this._primitives = scene.getPrimitives();
        this._polylineCollection = [];
    }

    DynamicPolylineVisualizer.prototype.update = function(time, czmlObjects) {
        for ( var i = 0, len = czmlObjects.length; i < len; i++) {
            this.updateObject(time, czmlObjects[i]);
        }
    };

    DynamicPolylineVisualizer.prototype.updateObject = function(time, czmlObject) {
        var dynamicPolyline = czmlObject.polyline;
        if (typeof dynamicPolyline === 'undefined') {
            return;
        }

        var vertexPositionsProperty = czmlObject.vertexPositions;
        if (typeof vertexPositionsProperty === 'undefined') {
            return;
        }

        var polyline;
        var objectId = czmlObject.id;
        var showProperty = dynamicPolyline.show;
        var polylineVisualizerIndex = czmlObject.polylineVisualizerIndex;
        var show = typeof showProperty === 'undefined' || showProperty.getValue(time);

        if (!show) {
            //don't bother creating or updating anything else
            if (typeof polylineVisualizerIndex !== 'undefined') {
                polyline = this._polylineCollection[polylineVisualizerIndex];
                polyline.show = false;
                czmlObject.polylineVisualizerIndex = undefined;
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
            czmlObject.polylineVisualizerIndex = polylineVisualizerIndex;
            polyline.id = objectId;
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

    DynamicPolylineVisualizer.prototype.removeAll = function(czmlObjects) {
        var i, len;
        for (i = 0, len = this._polylineCollection.length; i < len; i++) {
            this._primitives.remove(this._polylineCollection[i]);
        }

        for (i = 0, len = czmlObjects.length; i < len; i++) {
            czmlObjects.polylineVisualizerIndex = undefined;
        }

        this._unusedIndexes = [];
        this._polylineCollection = [];
    };

    return DynamicPolylineVisualizer;
});