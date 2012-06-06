/*global define*/
define(function() {
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

    return VisualizerCollection;
});