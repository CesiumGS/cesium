/*global define*/
define([
        '../../Core/Color',
        '../../Core/defined'
       ],
        function(
         Color,
         defined) {
    "use strict";

    function TimelineTrack(interval, pixelHeight, color, backgroundColor) {
        this.interval = interval;
        this.height = pixelHeight;
        this.color = color || new Color(0.5, 0.5, 0.5, 1.0);
        this.backgroundColor = backgroundColor || new Color(0.0, 0.0, 0.0, 0.0);
    }

    TimelineTrack.prototype.render = function(context, renderState) {
        var startInterval = this.interval.start;
        var stopInterval = this.interval.stop;

        var spanStart = renderState.startJulian;
        var spanStop = renderState.startJulian.addSeconds(renderState.duration);

        if (startInterval.lessThan(spanStart) && stopInterval.greaterThan(spanStop)) {
            //The track takes up the entire visible span.
            context.fillStyle = this.color.toCssColorString();
            context.fillRect(0, renderState.y, renderState.timeBarWidth, this.height);
        } else if (startInterval.lessThanOrEquals(spanStop) && stopInterval.greaterThanOrEquals(spanStart)) {
            //The track only takes up some of the visible span, compute that span.
            var x;
            var start, stop;
            for (x = 0; x < renderState.timeBarWidth; ++x) {
                var currentTime = renderState.startJulian.addSeconds((x / renderState.timeBarWidth) * renderState.duration);
                if (!defined(start) && currentTime.greaterThanOrEquals(startInterval)) {
                    start = x;
                } else if (!defined(stop) && currentTime.greaterThanOrEquals(stopInterval)) {
                    stop = x;
                }
            }

            context.fillStyle = this.backgroundColor.toCssColorString();
            context.fillRect(0, renderState.y, renderState.timeBarWidth, this.height);

            if (defined(start)) {
                if (!defined(stop)) {
                    stop = renderState.timeBarWidth;
                }
                context.fillStyle = this.color.toCssColorString();
                context.fillRect(start, renderState.y, Math.max(stop - start, 1), this.height);
            }
        }
    };

    return TimelineTrack;
});
