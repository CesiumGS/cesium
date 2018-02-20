define([
        './Check',
        './defineProperties'
    ], function(
        Check,
        defineProperties) {
    'use strict';

    /**
     * Priority queue for the {@link RequestScheduler} implemented as a sorted array.
     * The request with the highest priority is placed at index 0 and the request
     * with lowest priority is placed at index <code>length - 1</code>.
     * <p>
     * A lower <code>request.priority</code> value indicates that the request has higher priority. See {@link Request#priority}.
     * </p>
     *
     * @alias RequestQueue
     * @constructor
     * @private
     *
     * @param {Number} maximumLength The maximum length of the queue.
     */
    function RequestQueue(maximumLength) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.number('maximumLength', maximumLength);
        //>>includeEnd('debug');

        this._array = new Array(maximumLength);
        this._length = 0;
        this._maximumLength = maximumLength;
    }

    defineProperties(RequestQueue.prototype, {
        /**
         * Gets the length of the queue.
         *
         * @memberof RequestQueue.prototype
         *
         * @type {Number}
         * @readonly
         */
        length : {
            get : function() {
                return this._length;
            }
        }
    });

    /**
     * Get the request at the given index.
     *
     * @param {Number} index The index of the request.
     *
     * @return {Request} The request at the given index.
     */
    RequestQueue.prototype.get = function(index) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.number.greaterThanOrEquals('index', index, 0);
        Check.typeOf.number.lessThan('index', index, this._length);
        //>>includeEnd('debug');
        return this._array[index];
    };

    /**
     * Insert a request into the queue. If the length would grow greater than the maximum length
     * of the queue, the lowest priority request is removed and returned.
     *
     * @param {Request} request The request to insert.
     *
     * @return {Request|undefined} The request that was removed from the queue if the queue is at full capacity.
     */
    RequestQueue.prototype.insert = function(request) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('request', request);
        //>>includeEnd('debug');

        var array = this._array;
        var previousLength = this._length;
        var length = this._length;
        var maximumLength = this._maximumLength;

        if (length < maximumLength)
        {
            ++this._length;
        }

        if (previousLength === 0)
        {
            array[0] = request;
            return;
        }

        var removedRequest;
        var lastIndex = previousLength - 1;

        if (previousLength === maximumLength) {
            var lastRequest = array[lastIndex];
            if (request.priority >= lastRequest.priority) {
                // The array is full and the priority value of this request is too high to be inserted.
                return request;
            }
            // The array is full and the inserted request pushes off the last request
            removedRequest = lastRequest;
            --lastIndex;
        }

        while (lastIndex >= 0 && request.priority < array[lastIndex].priority) {
            array[lastIndex + 1] = array[lastIndex]; // Shift element to the right
            --lastIndex;
        }
        array[lastIndex + 1] = request;

        return removedRequest;
    };

    /**
     * Call the given function for each request in the queue.
     *
     * @type {RequestQueue~ForEachCallback} The function to call.
     */
    RequestQueue.prototype.forEach = function(callback) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.func('callback', callback);
        //>>includeEnd('debug');

        var array = this._array;
        var length = this._length;
        for (var i = 0; i < length; ++i) {
            callback(array[i]);
        }
    };

    /**
     * Sorts the queue.
     */
    RequestQueue.prototype.sort = function() {
        var array = this._array;
        var length = this._length;

        // Use insertion sort since our array is small and likely to be mostly sorted already.
        // Additionally length may be smaller than the array's actual length, so calling array.sort will lead to incorrect results for uninitialized values.
        for (var i = 1; i < length; ++i) {
            var j = i;
            while ((j > 0) && (array[j - 1].priority > array[j].priority)) {
                var temp = array[j - 1];
                array[j - 1] = array[j];
                array[j] = temp;
                --j;
            }
        }
    };

    /**
     * Remove <code>length</code> number of requests from the top of the queue.
     *
     * @param {Number} length The number of requests to remove.
     */
    RequestQueue.prototype.remove = function(length) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.number.greaterThanOrEquals('length', length, 0);
        Check.typeOf.number.lessThanOrEquals('length', length, this._length);
        //>>includeEnd('debug');
        if (length === 0) {
            return;
        }
        if (length === this._length) {
            this._length = 0;
            return;
        }

        // Shift remaining requests back to the left
        var array = this._array;
        for (var i = length; i < this._length; ++i) {
            array[i - length] = array[i];
        }
        this._length -= length;
    };

    /**
     * The callback to use in forEach.
     * @callback RequestQueue~ForEachCallback
     * @param {Request} request The request.
     */

    return RequestQueue;
});
