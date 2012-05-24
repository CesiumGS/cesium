/*global define*/
define(function() {
    "use strict";

    function VisualizerCollection(visualizers) {
        this._visualizers = visualizers;
    }

    VisualizerCollection.prototype.update = function(time, buffer) {
        var czmlObjects = buffer.getObjects();
        var visualizers = this._visualizers;

        for ( var i = 0, len = visualizers.length; i < len; i++) {
            visualizers[i].update(time, czmlObjects);
        }
    };

    VisualizerCollection.prototype.clear = function(buffer) {
        var visualizers = this._visualizers;
        var czmlObjects = buffer.getObjects();

        for ( var i = 0, len = visualizers.length; i < len; i++) {
            visualizers[i].removeAll(czmlObjects);
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