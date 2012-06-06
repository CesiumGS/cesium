/*global define*/
define(function() {
    "use strict";

    function VisualizerCollection(visualizers, czmlObjectCollection) {
        this._visualizers = visualizers;
        this._czmlObjectCollection = undefined;
        this.setDynamicObjectCollection(czmlObjectCollection);
    }

    VisualizerCollection.prototype.getDynamicObjectCollection = function() {
        return this._czmlObjectCollection;
    };

    VisualizerCollection.prototype.setDynamicObjectCollection = function(czmlObjectCollection) {
        var oldCollection = this._czmlObjectCollection;
        if (oldCollection !== czmlObjectCollection) {
            this._czmlObjectCollection = czmlObjectCollection;
            var visualizers = this._visualizers;
            for ( var i = visualizers.length - 1; i > -1; i--) {
                visualizers[i].setDynamicObjectCollection(czmlObjectCollection);
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