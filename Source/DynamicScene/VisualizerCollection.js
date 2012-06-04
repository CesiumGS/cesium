/*global define*/
define(function() {
    "use strict";

    function VisualizerCollection(visualizers, czmlObjectCollection) {
        this._visualizers = visualizers;
        this.setCzmlObjectCollection(czmlObjectCollection);
    }

    VisualizerCollection.prototype.getCzmlObjectCollection = function() {
        return this._czmlObjectCollection;
    };

    VisualizerCollection.prototype.setCzmlObjectCollection = function(czmlObjectCollection) {
        var oldCollection = this._czmlObjectCollection;
        if (oldCollection !== czmlObjectCollection) {
            this._czmlObjectCollection = czmlObjectCollection;
            czmlObjectCollection.objectsRemoved.addEventListener(VisualizerCollection.prototype._onObjectsRemoved, this);
            var visualizers = this._visualizers;
            if (oldCollection) {
                oldCollection.objectsRemoved.removeEventListener(VisualizerCollection.prototype._onObjectsRemoved);
                for ( var i = visualizers.length - 1; i > -1; i--) {
                    visualizers[i].removeAll();
                }
            }
        }
    };

    VisualizerCollection.prototype.update = function(time) {
        var objects = this._czmlObjectCollection.getObjects();
        var visualizers = this._visualizers;
        for ( var i = visualizers.length - 1; i > -1; i--) {
            visualizers[i].update(time, objects);
        }
    };

    VisualizerCollection.prototype.removeAll = function() {
        var visualizers = this._visualizers;
        for ( var i = visualizers.length - 1; i > -1; i--) {
            visualizers[i].removeAll(this._czmlObjectCollection.getObjects());
        }
    };

    VisualizerCollection.prototype._onObjectsRemoved = function(collection, removedObjects) {
        var visualizers = this._visualizers;
        for ( var i = visualizers.length - 1; i > -1; i--) {
            visualizers[i].removeAll(removedObjects);
        }
    };

    return VisualizerCollection;
});