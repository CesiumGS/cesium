/*global document,window,define*/
define(function() {
    "use strict";

    function TimelineTrack(color, heightInPx) {
        this._color = color;
        this._height = heightInPx;
        this._buffer = undefined;
    }

    TimelineTrack.prototype.getHeight = function() {
        return this._height;
    };

    TimelineTrack.prototype.getBuffer = function() {
        return this._buffer;
    };

    TimelineTrack.prototype.setBuffer = function(buffer) {
        this._buffer = buffer;
    };

    TimelineTrack.prototype._colorToCSS = function(color) {
        if (typeof color === 'undefined') {
            return this._color;
        }
        return "rgba(" + Math.round(color.red * 255).toString() + ", " + Math.round(color.green * 255).toString() + ", " + Math.round(color.blue * 255).toString() + ", " + color.alpha.toString() +
                ")";
    };

    TimelineTrack.prototype.render = function(context, renderState) {
        var x, oldX = 0, time, timeJulianDate, obj, color = this._color, newColor;

        context.fillStyle = color;
        context.fillRect(0, renderState.y, renderState.timeBarWidth, this._height);

        if (this._buffer) {
            obj = this._buffer.getObjects()[0];

            if (obj && ('point_color' in obj)) {
                for (x = 0; x < renderState.timeBarWidth; ++x) {
                    timeJulianDate = renderState.startJulian.addSeconds((x / renderState.timeBarWidth) * renderState.duration);
                    time = [timeJulianDate.getJulianDayNumber(), timeJulianDate.getSecondsOfDay()];
                    newColor = this._colorToCSS(obj.point.color.getValue(time));

                    if (newColor !== color) {
                        if ((x > 0) && (color !== this._color)) {
                            context.fillStyle = color;
                            context.fillRect(oldX, renderState.y, (x - 1) - oldX, this._height);
                        }
                        color = newColor;
                        oldX = x;
                    }
                }
            }
        }

        if (color !== this._color) {
            context.fillStyle = color;
            context.fillRect(oldX, renderState.y, renderState.timeBarWidth - oldX, this._height);
        }

        return this._height;
    };

    return TimelineTrack;
});
