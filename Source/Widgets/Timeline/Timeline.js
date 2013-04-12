/*global define*/
define([
        './TimelineTrack',
        './TimelineHighlightRange',
        '../../Core/DeveloperError',
        '../../Core/Clock',
        '../../Core/ClockRange',
        '../../Core/JulianDate'
    ], function (
         TimelineTrack,
         TimelineHighlightRange,
         DeveloperError,
         Clock,
         ClockRange,
         JulianDate) {
    "use strict";

    var timelineWheelDelta = 1e12;

    var timelineMouseMode = {
        none : 0,
        scrub : 1,
        slide : 2,
        zoom : 3,
        touchOnly : 4
    };
    var timelineTouchMode = {
        none : 0,
        scrub : 1,
        slideZoom : 2,
        singleTap : 3,
        ignore : 4
    };

    var timelineTicScales = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 15.0, 30.0, 60.0, // 1min
    120.0, // 2min
    300.0, // 5min
    600.0, // 10min
    900.0, // 15min
    1800.0, // 30min
    3600.0, // 1hr
    7200.0, // 2hr
    14400.0, // 4hr
    21600.0, // 6hr
    43200.0, // 12hr
    86400.0, // 24hr
    172800.0, // 2days
    345600.0, // 4days
    604800.0, // 7days
    1296000.0, // 15days
    2592000.0, // 30days
    5184000.0, // 60days
    7776000.0, // 90days
    15552000.0, // 180days
    31536000.0, // 365days
    63072000.0, // 2years
    126144000.0, // 4years
    157680000.0, // 5years
    315360000.0, // 10years
    630720000.0, // 20years
    1261440000.0, // 40years
    1576800000.0, // 50years
    3153600000.0, // 100years
    6307200000.0, // 200years
    12614400000.0, // 400years
    15768000000.0, // 500years
    31536000000.0 // 1000years
    ];

    var timelineMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    function Timeline(container, clock) {
        if (typeof container === 'undefined') {
            throw new DeveloperError('container is required.');
        }

        if (typeof container === 'string') {
            var tmp = document.getElementById(container);
            if (tmp === null) {
                throw new DeveloperError('Element with id "' + container + '" does not exist in the document.');
            }
            container = tmp;
        }

        if (typeof clock === 'undefined') {
            throw new DeveloperError('clock is required.');
        }

        /**
         * Gets the parent container.
         * @memberof Timeline
         * @type {Element}
         */
        this.container = container;

        this._endJulian = undefined;
        this._epochJulian = undefined;
        this._lastXPos = undefined;
        this._scrubElement = undefined;
        this._startJulian = undefined;
        this._timeBarSecondsSpan = undefined;
        this._clock = clock;
        this._scrubJulian = clock.currentTime;
        this._mainTicSpan = -1;
        this._mouseMode = timelineMouseMode.none;
        this._touchMode = timelineTouchMode.none;
        this._touchState = {
            centerX : 0,
            spanX : 0
        };
        this._mouseX = 0;
        var widget = this;

        this.container.className += ' cesium-timeline-main';
        this.container.innerHTML = '<div class="cesium-timeline-bar"></div><div class="cesium-timeline-trackContainer">' +
                                     '<canvas class="cesium-timeline-tracks" width="10" height="1">' +
                                     '</canvas></div><div class="cesium-timeline-needle"></div><span class="cesium-timeline-ruler"></span>';
        this._timeBarEle = this.container.childNodes[0];
        this._trackContainer = this.container.childNodes[1];
        this._trackListEle = this.container.childNodes[1].childNodes[0];
        this._needleEle = this.container.childNodes[2];
        this._rulerEle = this.container.childNodes[3];
        this._context = this._trackListEle.getContext('2d');

        this._trackList = [];
        this._highlightRanges = [];

        this.zoomTo(clock.startTime, clock.stopTime);

        this._timeBarEle.addEventListener('mousedown', function(e) {
            widget._handleMouseDown(e);
        }, false);
        document.addEventListener('mouseup', function(e) {
            widget._handleMouseUp(e);
        }, false);
        document.addEventListener('mousemove', function(e) {
            widget._handleMouseMove(e);
        }, false);
        this._timeBarEle.addEventListener('DOMMouseScroll', function(e) {
            widget._handleMouseWheel(e);
        }, false); // Mozilla mouse wheel
        this._timeBarEle.addEventListener('mousewheel', function(e) {
            widget._handleMouseWheel(e);
        }, false);
        this._timeBarEle.addEventListener('touchstart', function(e) {
            widget._handleTouchStart(e);
        }, false);
        document.addEventListener('touchmove', function(e) {
            widget._handleTouchMove(e);
        }, false);
        document.addEventListener('touchend', function(e) {
            widget._handleTouchEnd(e);
        }, false);
        this.container.oncontextmenu = function() {
            return false;
        };

        window.addEventListener('resize', function() {
            widget.handleResize();
        }, false);

        this.addEventListener = function(type, listener, useCapture) {
            widget.container.addEventListener(type, listener, useCapture);
        };

        clock.onTick.addEventListener(this.updateFromClock, this);
        this.updateFromClock();
    }

    Timeline.prototype.addHighlightRange = function(color, heightInPx) {
        var newHighlightRange = new TimelineHighlightRange(color, heightInPx);
        this._highlightRanges.push(newHighlightRange);
        this.handleResize();
        return newHighlightRange;
    };

    Timeline.prototype.addTrack = function(interval, heightInPx, color, backgroundColor) {
        var newTrack = new TimelineTrack(interval, heightInPx, color, backgroundColor);
        this._trackList.push(newTrack);
        this.handleResize();
        return newTrack;
    };

    Timeline.prototype.zoomTo = function(startJulianDate, endJulianDate) {
        this._timeBarSecondsSpan = startJulianDate.getSecondsDifference(endJulianDate);
        if (this._timeBarSecondsSpan <= 0) {
            throw new DeveloperError('Start time must come before end time.');
        }
        this._startJulian = startJulianDate;
        this._endJulian = endJulianDate;

        // If clock is not unbounded, clamp timeline range to clock.
        if (this._clock && (this._clock.clockRange !== ClockRange.UNBOUNDED)) {
            var clockStart = this._clock.startTime;
            var clockEnd = this._clock.stopTime;
            var clockSpan = clockStart.getSecondsDifference(clockEnd);
            var startOffset = this._startJulian.getSecondsDifference(clockStart);
            var endOffset = this._endJulian.getSecondsDifference(clockEnd);

            if (this._timeBarSecondsSpan >= clockSpan) {
                // if new duration longer than clock range duration, clamp to full range.
                this._timeBarSecondsSpan = clockSpan;
                this._startJulian = this._clock.startTime;
                this._endJulian = this._clock.stopTime;
            } else if (startOffset > 0) {
                // if timeline start is before clock start, shift right
                this._endJulian = this._endJulian.addSeconds(startOffset);
                this._startJulian = clockStart;
                this._timeBarSecondsSpan = this._startJulian.getSecondsDifference(this._endJulian);
            } else if (endOffset < 0) {
                // if timeline end is after clock end, shift left
                this._startJulian = this._startJulian.addSeconds(endOffset);
                this._endJulian = clockEnd;
                this._timeBarSecondsSpan = this._startJulian.getSecondsDifference(this._endJulian);
            }
        }

        this.handleResize();

        var evt = document.createEvent('Event');
        evt.initEvent('setzoom', true, true);
        evt.startJulian = this._startJulian;
        evt.endJulian = this._endJulian;
        evt.epochJulian = this._epochJulian;
        evt.totalSpan = this._timeBarSecondsSpan;
        evt.mainTicSpan = this._mainTicSpan;
        this.container.dispatchEvent(evt);
    };

    Timeline.prototype.zoomFrom = function(amount) {
        var centerSec = this._startJulian.getSecondsDifference(this._scrubJulian);
        if ((amount > 1) || (centerSec < 0) || (centerSec > this._timeBarSecondsSpan)) {
            centerSec = this._timeBarSecondsSpan * 0.5;
        } else {
            centerSec += (centerSec - this._timeBarSecondsSpan * 0.5);
        }
        var centerSecFlip = this._timeBarSecondsSpan - centerSec;
        this.zoomTo(this._startJulian.addSeconds(centerSec - (centerSec * amount)), this._endJulian.addSeconds((centerSecFlip * amount) - centerSecFlip));
    };

    function twoDigits(num) {
        return ((num < 10) ? ('0' + num.toString()) : num.toString());
    }

    Timeline.prototype.makeLabel = function(julianDate) {
        var gregorian = julianDate.toGregorianDate();
        var hour = gregorian.hour;
        var ampm = (hour < 12) ? ' AM' : ' PM';
        if (hour >= 13) {
            hour -= 12;
        } else if (hour === 0) {
            hour = 12;
        }
        var millisecond = gregorian.millisecond, millisecondString = '';
        if ((millisecond > 0) && (this._timeBarSecondsSpan < 3600)) {
            millisecondString = Math.floor(millisecond).toString();
            while (millisecondString.length < 3) {
                millisecondString = '0' + millisecondString;
            }
            millisecondString = '.' + millisecondString;
        }

        return timelineMonthNames[gregorian.month - 1] + ' ' + gregorian.day + ' ' + gregorian.year + ' ' + twoDigits(hour) + ':' +
            twoDigits(gregorian.minute) + ':' + twoDigits(gregorian.second) + millisecondString + ampm;
    };

    Timeline.prototype.smallestTicInPixels = 7.0;

    Timeline.prototype._makeTics = function() {
        var timeBar = this._timeBarEle;

        var seconds = this._startJulian.getSecondsDifference(this._scrubJulian);
        var xPos = Math.round(seconds * this.container.clientWidth / this._timeBarSecondsSpan);
        var scrubX = xPos - 8, tic;
        var widget = this;

        this._needleEle.style.left = xPos.toString() + 'px';

        var tics = '<span class="cesium-timeline-icon16" style="left:' + scrubX + 'px;bottom:0;background-position: 0px 0px;"></span>';

        var minimumDuration = 0.01;
        var maximumDuration = 31536000000.0; // ~1000 years
        var epsilon = 1e-10;

        // If time step size is known, enter it here...
        var minSize = 0;

        var duration = this._timeBarSecondsSpan;
        if (duration < minimumDuration) {
            duration = minimumDuration;
            this._timeBarSecondsSpan = minimumDuration;
            this._endJulian = this._startJulian.addSeconds(minimumDuration);
        } else if (duration > maximumDuration) {
            duration = maximumDuration;
            this._timeBarSecondsSpan = maximumDuration;
            this._endJulian = this._startJulian.addSeconds(maximumDuration);
        }

        var timeBarWidth = this._timeBarEle.clientWidth;
        if (timeBarWidth < 10) {
            timeBarWidth = 10;
        }
        var startJulian = this._startJulian;

        // epsilonTime: a small fraction of one pixel width of the timeline, measured in seconds.
        var epsilonTime = Math.min((duration / timeBarWidth) * 1e-5, 0.4);

        // epochJulian: a nearby time to be considered "zero seconds", should be a round-ish number by human standards.
        var epochJulian;
        if (duration > 315360000) { // 3650+ days visible, epoch is start of the first visible century.
            epochJulian = JulianDate.fromIso8601(startJulian.toDate().toISOString().substring(0, 2) + '00-01-01T00:00:00Z');
        } else if (duration > 31536000) { // 365+ days visible, epoch is start of the first visible decade.
            epochJulian = JulianDate.fromIso8601(startJulian.toDate().toISOString().substring(0, 3) + '0-01-01T00:00:00Z');
        } else if (duration > 86400) { // 1+ day(s) visible, epoch is start of the year.
            epochJulian = JulianDate.fromIso8601(startJulian.toDate().toISOString().substring(0, 4) + '-01-01T00:00:00Z');
        } else { // Less than a day on timeline, epoch is midnight of the visible day.
            epochJulian = JulianDate.fromIso8601(startJulian.toDate().toISOString().substring(0, 10) + 'T00:00:00Z');
        }
        // startTime: Seconds offset of the left side of the timeline from epochJulian.
        var startTime = epochJulian.addSeconds(epsilonTime).getSecondsDifference(this._startJulian);
        // endTime: Seconds offset of the right side of the timeline from epochJulian.
        var endTime = startTime + duration;
        this._epochJulian = epochJulian;

        function getStartTic(ticScale) {
            return Math.floor(startTime / ticScale) * ticScale;
        }

        function getNextTic(tic, ticScale) {
            return Math.ceil((tic / ticScale) + 0.5) * ticScale;
        }

        function getAlpha(time) {
            return (time - startTime) / duration;
        }

        function remainder(x, y) {
            //return x % y;
            return x - (y * Math.round(x / y));
        }

        // Width in pixels of a typical label, plus padding
        this._rulerEle.innerHTML = this.makeLabel(this._endJulian.addSeconds(-minimumDuration));
        var sampleWidth = this._rulerEle.offsetWidth + 20;

        var origMinSize = minSize;
        minSize -= epsilon;

        var renderState = {
            y : 0,
            startTime : startTime,
            startJulian : startJulian,
            epochJulian : epochJulian,
            duration : duration,
            timeBarWidth : timeBarWidth,
            getAlpha : getAlpha
        };
        this._highlightRanges.forEach(function(highlightRange) {
            tics += highlightRange.render(renderState);
        });

        // Calculate tic mark label spacing in the TimeBar.
        var mainTic = 0.0, subTic = 0.0, tinyTic = 0.0;
        // Ideal labeled tic as percentage of zoom interval
        var idealTic = sampleWidth / timeBarWidth;
        if (idealTic > 1.0) {
            // Clamp to width of window, for thin windows.
            idealTic = 1.0;
        }
        // Ideal labeled tic size in seconds
        idealTic *= this._timeBarSecondsSpan;
        var ticIndex = -1, smallestIndex = -1;

        var i, ticScaleLen = timelineTicScales.length;
        for (i = 0; i < ticScaleLen; ++i) {
            var sc = timelineTicScales[i];
            ++ticIndex;
            mainTic = sc;
            // Find acceptable main tic size not smaller than ideal size.
            if ((sc > idealTic) && (sc > minSize)) {
                break;
            }
            if ((smallestIndex < 0) && ((timeBarWidth * (sc / this._timeBarSecondsSpan)) >= this.smallestTicInPixels)) {
                smallestIndex = ticIndex;
            }
        }
        if (ticIndex > 0) {
            while (ticIndex > 0) // Compute sub-tic size that evenly divides main tic.
            {
                --ticIndex;
                if (Math.abs(remainder(mainTic, timelineTicScales[ticIndex])) < 0.00001) {
                    if (timelineTicScales[ticIndex] >= minSize) {
                        subTic = timelineTicScales[ticIndex];
                    }
                    break;
                }
            }

            if (smallestIndex >= 0) {
                while (smallestIndex < ticIndex) // Compute tiny tic size that evenly divides sub-tic.
                {
                    if ((Math.abs(remainder(subTic, timelineTicScales[smallestIndex])) < 0.00001) && (timelineTicScales[smallestIndex] >= minSize)) {
                        tinyTic = timelineTicScales[smallestIndex];
                        break;
                    }
                    ++smallestIndex;
                }
            }
        }

        minSize = origMinSize;
        if ((minSize > epsilon) && (tinyTic < 0.00001) && (Math.abs(minSize - mainTic) > epsilon)) {
            tinyTic = minSize;
            if (minSize <= (mainTic + epsilon)) {
                subTic = 0.0;
            }
        }

        var lastTextLeft = -999999, textWidth;
        if ((timeBarWidth * (tinyTic / this._timeBarSecondsSpan)) >= 3.0) {
            for (tic = getStartTic(tinyTic); tic <= endTime; tic = getNextTic(tic, tinyTic)) {
                tics += '<span class="cesium-timeline-ticTiny" style="left: ' + Math.round(timeBarWidth * getAlpha(tic)).toString() + 'px;"></span>';
            }
        }
        if ((timeBarWidth * (subTic / this._timeBarSecondsSpan)) >= 3.0) {
            for (tic = getStartTic(subTic); tic <= endTime; tic = getNextTic(tic, subTic)) {
                tics += '<span class="cesium-timeline-ticSub" style="left: ' + Math.round(timeBarWidth * getAlpha(tic)).toString() + 'px;"></span>';
            }
        }
        if ((timeBarWidth * (mainTic / this._timeBarSecondsSpan)) >= 2.0) {
            this._mainTicSpan = mainTic;
            endTime += mainTic;
            tic = getStartTic(mainTic);
            var leapSecond = epochJulian.getTaiMinusUtc();
            while (tic <= endTime) {
                var ticTime = startJulian.addSeconds(tic - startTime);
                if (mainTic > 2.1) {
                    var ticLeap = ticTime.getTaiMinusUtc();
                    if (Math.abs(ticLeap - leapSecond) > 0.1) {
                        tic += (ticLeap - leapSecond);
                        ticTime = startJulian.addSeconds(tic - startTime);
                    }
                }
                var ticLeft = Math.round(timeBarWidth * getAlpha(tic));
                var ticLabel = this.makeLabel(ticTime);
                this._rulerEle.innerHTML = ticLabel;
                textWidth = this._rulerEle.offsetWidth;
                var labelLeft = ticLeft - ((textWidth / 2) - 1);
                if (labelLeft > lastTextLeft) {
                    lastTextLeft = labelLeft + textWidth + 5;
                    tics += '<span class="cesium-timeline-ticMain" style="left: ' + ticLeft.toString() + 'px;"></span>' + '<span class="cesium-timeline-ticLabel" style="left: ' + labelLeft.toString() +
                            'px;">' + ticLabel + '</span>';
                } else {
                    tics += '<span class="cesium-timeline-ticSub" style="left: ' + ticLeft.toString() + 'px;"></span>';
                }
                tic = getNextTic(tic, mainTic);
            }
        } else {
            this._mainTicSpan = -1;
        }

        timeBar.innerHTML = tics;
        this._scrubElement = timeBar.childNodes[0];

        renderState.y = 0;
        this._trackList.forEach(function(track) {
            track.render(widget._context, renderState);
            renderState.y += track.height;
        });
    };

    Timeline.prototype.updateFromClock = function() {
        this._scrubJulian = this._clock.currentTime;
        var scrubElement = this._scrubElement;
        if (typeof this._scrubElement !== 'undefined') {
            var seconds = this._startJulian.getSecondsDifference(this._scrubJulian);
            var xPos = Math.round(seconds * this.container.clientWidth / this._timeBarSecondsSpan);

            if (this._lastXPos !== xPos) {
                this._lastXPos = xPos;

                scrubElement.style.left = (xPos - 8) + 'px';
                this._needleEle.style.left = xPos + 'px';
            }
        }
    };

    Timeline.prototype._setTimeBarTime = function(xPos, seconds) {
        xPos = Math.round(xPos);
        this._scrubJulian = this._startJulian.addSeconds(seconds);
        if (this._scrubElement) {
            var scrubX = xPos - 8;
            this._scrubElement.style.left = scrubX.toString() + 'px';
            this._needleEle.style.left = xPos.toString() + 'px';
        }

        var evt = document.createEvent('Event');
        evt.initEvent('settime', true, true);
        evt.clientX = xPos;
        evt.timeSeconds = seconds;
        evt.timeJulian = this._scrubJulian;
        this.container.dispatchEvent(evt);
    };

    Timeline.prototype._handleMouseDown = function(e) {
        if (this._mouseMode !== timelineMouseMode.touchOnly) {
            if (e.button === 0) {
                this._mouseMode = timelineMouseMode.scrub;
                if (this._scrubElement) {
                    this._scrubElement.style.backgroundPosition = '-16px 0';
                }
                this._handleMouseMove(e);
            } else {
                this._mouseX = e.clientX;
                if (e.button === 2) {
                    this._mouseMode = timelineMouseMode.zoom;
                } else {
                    this._mouseMode = timelineMouseMode.slide;
                }
            }
        }
        e.preventDefault();
    };
    Timeline.prototype._handleMouseUp = function(e) {
        this._mouseMode = timelineMouseMode.none;
        if (this._scrubElement) {
            this._scrubElement.style.backgroundPosition = '0px 0px';
        }
    };
    Timeline.prototype._handleMouseMove = function(e) {
        var dx;
        if (this._mouseMode === timelineMouseMode.scrub) {
            e.preventDefault();
            var x = e.clientX - this.container.getBoundingClientRect().left;
            if ((x >= 0) && (x <= this.container.clientWidth)) {
                this._setTimeBarTime(x, x * this._timeBarSecondsSpan / this.container.clientWidth);
            }
        } else if (this._mouseMode === timelineMouseMode.slide) {
            dx = this._mouseX - e.clientX;
            this._mouseX = e.clientX;
            if (dx !== 0) {
                var dsec = dx * this._timeBarSecondsSpan / this.container.clientWidth;
                this.zoomTo(this._startJulian.addSeconds(dsec), this._endJulian.addSeconds(dsec));
            }
        } else if (this._mouseMode === timelineMouseMode.zoom) {
            dx = this._mouseX - e.clientX;
            this._mouseX = e.clientX;
            if (dx !== 0) {
                this.zoomFrom(Math.pow(1.01, dx));
            }
        }
    };
    Timeline.prototype._handleMouseWheel = function(e) {
        var dy = e.wheelDeltaY || e.wheelDelta || (-e.detail);
        timelineWheelDelta = Math.max(Math.min(Math.abs(dy), timelineWheelDelta), 1);
        dy /= timelineWheelDelta;
        this.zoomFrom(Math.pow(1.05, -dy));
    };

    Timeline.prototype._handleTouchStart = function(e) {
        var len = e.touches.length, seconds, xPos, leftX = this.container.getBoundingClientRect().left;
        e.preventDefault();
        this._mouseMode = timelineMouseMode.touchOnly;
        if (len === 1) {
            seconds = this._startJulian.getSecondsDifference(this._scrubJulian);
            xPos = Math.round(seconds * this.container.clientWidth / this._timeBarSecondsSpan + leftX);
            if (Math.abs(e.touches[0].clientX - xPos) < 50) {
                this._touchMode = timelineTouchMode.scrub;
                if (this._scrubElement) {
                    this._scrubElement.style.backgroundPosition = (len === 1) ? '-16px 0' : '0 0';
                }
            } else {
                this._touchMode = timelineTouchMode.singleTap;
                this._touchState.centerX = e.touches[0].clientX - leftX;
            }
        } else if (len === 2) {
            this._touchMode = timelineTouchMode.slideZoom;
            this._touchState.centerX = (e.touches[0].clientX + e.touches[1].clientX) * 0.5 - leftX;
            this._touchState.spanX = Math.abs(e.touches[0].clientX - e.touches[1].clientX);
        } else {
            this._touchMode = timelineTouchMode.ignore;
        }
    };
    Timeline.prototype._handleTouchEnd = function(e) {
        var len = e.touches.length, leftX = this.container.getBoundingClientRect().left;
        if (this._touchMode === timelineTouchMode.singleTap) {
            this._touchMode = timelineTouchMode.scrub;
            this._handleTouchMove(e);
        } else if (this._touchMode === timelineTouchMode.scrub) {
            this._handleTouchMove(e);
        }
        this._mouseMode = timelineMouseMode.touchOnly;
        if (len !== 1) {
            this._touchMode = (len > 0) ? timelineTouchMode.ignore : timelineTouchMode.none;
        } else if (this._touchMode === timelineTouchMode.slideZoom) {
            this._touchState.centerX = e.touches[0].clientX - leftX;
        }
        if (this._scrubElement) {
            this._scrubElement.style.backgroundPosition = '0 0';
        }
    };
    Timeline.prototype._handleTouchMove = function(e) {
        var dx, x, len, newCenter, newSpan, newStartTime, zoom = 1, leftX = this.container.getBoundingClientRect().left;
        if (this._touchMode === timelineTouchMode.singleTap) {
            this._touchMode = timelineTouchMode.slideZoom;
        }
        this._mouseMode = timelineMouseMode.touchOnly;
        if (this._touchMode === timelineTouchMode.scrub) {
            e.preventDefault();
            if (e.changedTouches.length === 1) {
                x = e.changedTouches[0].clientX - leftX;
                if ((x >= 0) && (x <= this.container.clientWidth)) {
                    this._setTimeBarTime(x, x * this._timeBarSecondsSpan / this.container.clientWidth);
                }
            }
        } else if (this._touchMode === timelineTouchMode.slideZoom) {
            len = e.touches.length;
            if (len === 2) {
                newCenter = (e.touches[0].clientX + e.touches[1].clientX) * 0.5 - leftX;
                newSpan = Math.abs(e.touches[0].clientX - e.touches[1].clientX);
            } else if (len === 1) {
                newCenter = e.touches[0].clientX - leftX;
                newSpan = 0;
            }

            if (typeof newCenter !== 'undefined') {
                if ((newSpan > 0) && (this._touchState.spanX > 0)) {
                    // Zoom and slide
                    zoom = (this._touchState.spanX / newSpan);
                    newStartTime = this._startJulian.addSeconds(((this._touchState.centerX * this._timeBarSecondsSpan) - (newCenter * this._timeBarSecondsSpan * zoom)) /
                            this.container.clientWidth);
                } else {
                    // Slide to newCenter
                    dx = this._touchState.centerX - newCenter;
                    newStartTime = this._startJulian.addSeconds(dx * this._timeBarSecondsSpan / this.container.clientWidth);
                }

                this.zoomTo(newStartTime, newStartTime.addSeconds(this._timeBarSecondsSpan * zoom));
                this._touchState.centerX = newCenter;
                this._touchState.spanX = newSpan;
            }
        }
    };

    Timeline.prototype.handleResize = function() {
        var containerHeight = this.container.getBoundingClientRect().height - this._timeBarEle.getBoundingClientRect().height - 2;
        this._trackContainer.style.height = containerHeight.toString() + 'px';

        var trackListHeight = 1;
        this._trackList.forEach(function(track) {
            trackListHeight += track.height;
        });
        this._trackListEle.style.height = trackListHeight.toString() + 'px';
        this._trackListEle.width = this._trackListEle.clientWidth;
        this._trackListEle.height = trackListHeight;
        this._makeTics();
    };

    return Timeline;
});