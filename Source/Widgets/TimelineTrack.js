/*global document,window,define*/
define(function() {
    "use strict";

    function TimelineTrack(color, heightInPx) {
        this._color = color;
        this._height = heightInPx;
    }

    TimelineTrack.prototype.getHeight = function() {
        return this._height;
    };

    TimelineTrack.prototype.render = function(context, renderState) {
        context.fillStyle = this._color;
        context.fillRect(0, renderState.y, renderState.timeBarWidth, this._height);
        return this._height;
    };

    return TimelineTrack;
});
