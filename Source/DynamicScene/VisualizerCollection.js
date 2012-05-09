define(function(ValueTypes) {
    "use strict";

    function VisualizerCollection(visualizers, buffer) {
        this._visualizers = visualizers;
    }

    VisualizerCollection.prototype.update = function(time, buffer) {
        var czmlObjects = buffer.getObjects();
        var visualizers = this._visualizers;

        for ( var i = 0, len = visualizers.length; i < len; i++) {
            visualizers[i].update(time, czmlObjects);
        }
    };

    VisualizerCollection.prototype.clear = function() {
        var visualizers = this._visualizers;

        for ( var i = 0, len = visualizers.length; i < len; i++) {
            visualizers[i].clear();
        }
    };

    VisualizerCollection.prototype.getVisualizer = function(type) {
        var visualizers = this._visualizers;

        for ( var i = 0, len = visualizers.length; i < len; i++) {
            if (visualizers[i] instanceof type) {
                return visualizers[i];
            }
        }
    };

    return VisualizerCollection;
});