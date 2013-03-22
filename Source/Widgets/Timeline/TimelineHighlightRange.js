/*global define*/
define(function() {
    "use strict";

    function TimelineHighlightRange(color, heightInPx) {
        this._color = color;
        this._height = heightInPx;
    }

    TimelineHighlightRange.prototype.getHeight = function() {
        return this._height;
    };

    TimelineHighlightRange.prototype.getStartTime = function() {
        return this._start;
    };

    TimelineHighlightRange.prototype.getStopTime = function() {
        return this._stop;
    };

    TimelineHighlightRange.prototype.setRange = function(start, stop) {
        this._start = start;
        this._stop = stop;
    };

    TimelineHighlightRange.prototype.render = function(renderState) {
        var range = '';
        if (this._start && this._stop && this._color) {
            var highlightStart = renderState.epochJulian.getSecondsDifference(this._start);
            var highlightLeft = Math.round(renderState.timeBarWidth * renderState.getAlpha(highlightStart));
            var highlightStop = renderState.epochJulian.getSecondsDifference(this._stop);
            var highlightWidth = Math.round(renderState.timeBarWidth * renderState.getAlpha(highlightStop)) - highlightLeft;
            if (highlightLeft < 0) {
                highlightWidth += highlightLeft;
                highlightLeft = 0;
            }
            if ((highlightLeft + highlightWidth) > renderState.timeBarWidth) {
                highlightWidth = renderState.timeBarWidth - highlightLeft;
            }
            if (highlightWidth > 0) {
                range = '<span class="cesium-timeline-highlight" style="left: ' + highlightLeft.toString() + 'px; width: ' + highlightWidth.toString() + 'px; bottom: ' + renderState.y.toString() +
                        'px; height: ' + this._height + 'px; background-color: ' + this._color + ';"></span>';
            }
        }
        renderState.y += this._height;
        return range;
    };

    return TimelineHighlightRange;
});
