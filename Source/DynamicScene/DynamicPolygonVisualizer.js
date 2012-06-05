/*global define*/
define([
        '../Scene/Polygon'
    ], function(
         Polygon) {
    "use strict";

    function DynamicPolygonVisualizer(scene) {
        this._scene = scene;
        this._unusedIndexes = [];
        this._primitives = scene.getPrimitives();
        this._polygonCollection = [];
    }

    DynamicPolygonVisualizer.prototype.update = function(time, czmlObjects) {
        for ( var i = 0, len = czmlObjects.length; i < len; i++) {
            this.updateObject(time, czmlObjects[i]);
        }
    };

    DynamicPolygonVisualizer.prototype.updateObject = function(time, czmlObject) {
        var dynamicPolygon = czmlObject.polygon;
        if (typeof dynamicPolygon === 'undefined') {
            return;
        }

        var vertexPositionsProperty = czmlObject.vertexPositions;
        if (typeof vertexPositionsProperty === 'undefined') {
            return;
        }

        var polygon;
        var objectId = czmlObject.id;
        var showProperty = dynamicPolygon.show;
        var polygonVisualizerIndex = czmlObject.polygonVisualizerIndex;
        var show = czmlObject.isAvailable(time) && (typeof showProperty === 'undefined' || showProperty.getValue(time));

        if (!show) {
            //don't bother creating or updating anything else
            if (typeof polygonVisualizerIndex !== 'undefined') {
                polygon = this._polygonCollection[polygonVisualizerIndex];
                polygon.show = false;
                czmlObject.polygonVisualizerIndex = undefined;
                this._unusedIndexes.push(polygonVisualizerIndex);
            }
            return;
        }

        if (typeof polygonVisualizerIndex === 'undefined') {
            var unusedIndexes = this._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                polygonVisualizerIndex = unusedIndexes.pop();
                polygon = this._polygonCollection[polygonVisualizerIndex];
            } else {
                polygonVisualizerIndex = this._polygonCollection.length;
                polygon = new Polygon();
                this._polygonCollection.push(polygon);
                this._primitives.add(polygon);
            }
            czmlObject.polygonVisualizerIndex = polygonVisualizerIndex;
            polygon.id = objectId;
        } else {
            polygon = this._polygonCollection[polygonVisualizerIndex];
        }

        polygon.show = true;

        var value = vertexPositionsProperty.getValueCartesian(time);
        if (typeof value !== 'undefined' && polygon.last_position !== value) {
            polygon.setPositions(value);
            polygon.last_position = value;
        }

        var material = dynamicPolygon.material;
        if (typeof material !== 'undefined') {
            polygon.material = material.applyToMaterial(time, polygon.material, this._scene);
        }
    };

    DynamicPolygonVisualizer.prototype.removeAll = function(czmlObjects) {
        var i, len;
        for (i = 0, len = this._polygonCollection.length; i < len; i++) {
            this._primitives.remove(this._polygonCollection[i]);
        }

        for (i = 0, len = czmlObjects.length; i < len; i++) {
            czmlObjects.polygonVisualizerIndex = undefined;
        }

        this._unusedIndexes = [];
        this._polygonCollection = [];
    };

    return DynamicPolygonVisualizer;
});