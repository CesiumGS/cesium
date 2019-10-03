import Check from '../Core/Check.js';
import defaultValue from '../Core/defaultValue.js';
import defined from '../Core/defined.js';
import defineProperties from '../Core/defineProperties.js';
import DeveloperError from '../Core/DeveloperError.js';
import JulianDate from '../Core/JulianDate.js';
import Request from '../Core/Request.js';
import RequestType from '../Core/RequestType.js';

    /**
     * Provides functionality for ImageryProviders that have time dynamic imagery
     *
     * @alias TimeDynamicImagery
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Clock} options.clock A Clock instance that is used when determining the value for the time dimension. Required when <code>options.times</code> is specified.
     * @param {TimeIntervalCollection} options.times TimeIntervalCollection with its <code>data</code> property being an object containing time dynamic dimension and their values.
     * @param {Function} options.requestImageFunction A function that will request imagery tiles.
     * @param {Function} options.reloadFunction A function that will be called when all imagery tiles need to be reloaded.
     */
    function TimeDynamicImagery(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('options.clock', options.clock);
        Check.typeOf.object('options.times', options.times);
        Check.typeOf.func('options.requestImageFunction', options.requestImageFunction);
        Check.typeOf.func('options.reloadFunction', options.reloadFunction);
        //>>includeEnd('debug');

        this._tileCache = {};
        this._tilesRequestedForInterval = [];

        var clock = this._clock = options.clock;
        this._times = options.times;
        this._requestImageFunction = options.requestImageFunction;
        this._reloadFunction = options.reloadFunction;
        this._currentIntervalIndex = -1;

        clock.onTick.addEventListener(this._clockOnTick, this);
        this._clockOnTick(clock);
    }

    defineProperties(TimeDynamicImagery.prototype, {
        /**
         * Gets or sets a clock that is used to get keep the time used for time dynamic parameters.
         * @memberof TimeDynamicImagery.prototype
         * @type {Clock}
         */
        clock : {
            get : function() {
                return this._clock;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(value)) {
                    throw new DeveloperError('value is required.');
                }
                //>>includeEnd('debug');

                if (this._clock !== value) {
                    this._clock = value;
                    this._clockOnTick(value);
                    this._reloadFunction();
                }
            }
        },
        /**
         * Gets or sets a time interval collection.
         * @memberof TimeDynamicImagery.prototype
         * @type {TimeIntervalCollection}
         */
        times : {
            get : function() {
                return this._times;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(value)) {
                    throw new DeveloperError('value is required.');
                }
                //>>includeEnd('debug');

                if (this._times !== value) {
                    this._times = value;
                    this._clockOnTick(this._clock);
                    this._reloadFunction();
                }
            }
        },
        /**
         * Gets the current interval.
         * @memberof TimeDynamicImagery.prototype
         * @type {TimeInterval}
         */
        currentInterval : {
            get : function() {
                return this._times.get(this._currentIntervalIndex);
            }
        }
    });

    /**
     * Gets the tile from the cache if its available.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @param {Request} [request] The request object. Intended for internal use only.
     *
     * @returns {Promise.<Image>|undefined} A promise for the image that will resolve when the image is available, or
     *          undefined if the tile is not in the cache.
     */
    TimeDynamicImagery.prototype.getFromCache = function(x, y, level, request) {
        var key = getKey(x, y, level);
        var result;
        var cache = this._tileCache[this._currentIntervalIndex];
        if (defined(cache) && defined(cache[key])) {
            var item = cache[key];
            result = item.promise
                .otherwise(function(e) {
                    // Set the correct state in case it was cancelled
                    request.state = item.request.state;
                    throw e;
                });
            delete cache[key];
        }

        return result;
    };

    /**
     * Checks if the next interval is approaching and will start preload the tile if necessary. Otherwise it will
     * just add the tile to a list to preload when we approach the next interval.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @param {Request} [request] The request object. Intended for internal use only.
     */
    TimeDynamicImagery.prototype.checkApproachingInterval = function(x, y, level, request) {
        var key = getKey(x, y, level);
        var tilesRequestedForInterval = this._tilesRequestedForInterval;

        // If we are approaching an interval, preload this tile in the next interval
        var approachingInterval = getApproachingInterval(this);
        var tile = {
            key : key,
            // Determines priority based on camera distance to the tile.
            // Since the imagery regardless of time will be attached to the same tile we can just steal it.
            priorityFunction : request.priorityFunction
        };
        if (!defined(approachingInterval) || !addToCache(this, tile, approachingInterval)) {
            // Add to recent request list if we aren't approaching and interval or the request was throttled
            tilesRequestedForInterval.push(tile);
        }

        // Don't let the tile list get out of hand
        if (tilesRequestedForInterval.length >= 512) {
            tilesRequestedForInterval.splice(0, 256);
        }
    };

    TimeDynamicImagery.prototype._clockOnTick = function(clock) {
        var time = clock.currentTime;
        var times = this._times;
        var index = times.indexOf(time);
        var currentIntervalIndex = this._currentIntervalIndex;

        if (index !== currentIntervalIndex) {
            // Cancel all outstanding requests and clear out caches not from current time interval
            var currentCache = this._tileCache[currentIntervalIndex];
            for (var t in currentCache) {
                if (currentCache.hasOwnProperty(t)) {
                    currentCache[t].request.cancel();
                }
            }
            delete this._tileCache[currentIntervalIndex];
            this._tilesRequestedForInterval = [];

            this._currentIntervalIndex = index;
            this._reloadFunction();

            return;
        }

        var approachingInterval = getApproachingInterval(this);
        if (defined(approachingInterval)) {
            // Start loading recent tiles from end of this._tilesRequestedForInterval
            //  We keep preloading until we hit a throttling limit.
            var tilesRequested = this._tilesRequestedForInterval;
            var success = true;
            while (success) {
                if (tilesRequested.length === 0) {
                    break;
                }

                var tile = tilesRequested.pop();
                success = addToCache(this, tile, approachingInterval);
                if (!success) {
                    tilesRequested.push(tile);
                }
            }
        }
    };

    function getKey(x, y, level) {
        return x + '-' + y + '-' + level;
    }

    function getKeyElements(key) {
        var s = key.split('-');
        if (s.length !== 3) {
            return undefined;
        }

        return {
            x : Number(s[0]),
            y : Number(s[1]),
            level : Number(s[2])
        };
    }

    function getApproachingInterval(that) {
        var times = that._times;
        if (!defined(times)) {
            return undefined;
        }
        var clock = that._clock;
        var time = clock.currentTime;
        var isAnimating = clock.canAnimate && clock.shouldAnimate;
        var multiplier = clock.multiplier;

        if (!isAnimating && multiplier !== 0) {
            return undefined;
        }

        var seconds;
        var index = times.indexOf(time);
        if (index < 0) {
            return undefined;
        }

        var interval = times.get(index);
        if (multiplier > 0) { // animating forward
            seconds = JulianDate.secondsDifference(interval.stop, time);
            ++index;
        } else { //backwards
            seconds = JulianDate.secondsDifference(interval.start, time); // Will be negative
            --index;
        }
        seconds /= multiplier; // Will always be positive

        // Less than 5 wall time seconds
        return (index >= 0 && seconds <= 5.0) ? times.get(index) : undefined;
    }

    function addToCache(that, tile, interval) {
        var index = that._times.indexOf(interval.start);
        var tileCache = that._tileCache;
        var intervalTileCache = tileCache[index];
        if (!defined(intervalTileCache)) {
            intervalTileCache = tileCache[index] = {};
        }

        var key = tile.key;
        if (defined(intervalTileCache[key])) {
            return true; // Already in the cache
        }

        var keyElements = getKeyElements(key);
        var request = new Request({
            throttle : true,
            throttleByServer : true,
            type : RequestType.IMAGERY,
            priorityFunction : tile.priorityFunction
        });
        var promise = that._requestImageFunction(keyElements.x, keyElements.y, keyElements.level, request, interval);
        if (!defined(promise)) {
            return false;
        }

        intervalTileCache[key] = {
            promise : promise,
            request : request
        };

        return true;
    }
export default TimeDynamicImagery;
