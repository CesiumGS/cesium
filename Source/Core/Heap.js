/*global define*/
define([
        './Check',
        './defaultValue',
        './defined',
        './defineProperties'
    ], function(
        Check,
        defaultValue,
        defined,
        defineProperties) {
    'use strict';

    /**
     * @alias Heap
     * @constructor
     * @private
     *
     * @param {Function} comparator The comparator to use for the heap. If comparator(a, b) is less than 0, sort a to a lower index than b, otherwise sort to a higher index.
     */
    function Heap(comparator) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('comparator', comparator);
        //>>includeEnd('debug');

        this._comparator = comparator;
        this._data = [];
        this._length = 0;
        this._maximumSize = 0;
    }

    defineProperties(Heap.prototype, {
        /**
         * Gets the internal data in the heap.
         *
         * @memberof Heap.prototype
         *
         * @type {Array}
         * @readonly
         */
        data : {
            get : function() {
                return this._data;
            }
        },

        /**
         * Gets the length of the heap.
         *
         * @memberof Heap.prototype
         *
         * @type {Number}
         * @readonly
         */
        length : {
            get : function() {
                return this._length;
            }
        },

        /**
         * Gets and sets the maximum size of the heap.
         *
         * @memberof Heap.prototype
         *
         * @type {Number}
         */
        maximumSize : {
            get: function() {
                return this._maximumSize;
            },

            set: function(value) {
                this._maximumSize = value;
                if (this._length > this._maximumSize && this._maximumSize > 0) {
                    this._length = this._maximumSize;
                    this._data.length = this._maximumSize;
                }
            }
        }
    });

    function swap(data, a, b) {
        var temp = data[a];
        data[a] = data[b];
        data[b] = temp;
    }

    /**
     * Resizes the internal array of the heap.
     *
     * @param {Number} [length] The length to resize internal array to. Defaults to the current size of the heap.
     */
    Heap.prototype.reserve = function(length) {
        length = defaultValue(length, this._length);
        this._data.length = length;
    };

    /**
     * Heapify. Update the heap so that index and all descendants satisfy the heap property.
     *
     * @param {Number} index The starting index to heapify from.
     */
    Heap.prototype.heapify = function(index) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.number.greaterThanOrEquals('index', index, 0);
        //>>includeEnd('debug');

        var length = this._length;
        var comparator = this._comparator;
        var data = this._data;
        var candidate = -1;

        while (true) {
            var right = 2 * (index + 1);
            var left = right - 1;

            if (left < length && comparator(data[left], data[index]) < 0) {
                candidate = left;
            } else {
                candidate = index;
            }

            if (right < length && comparator(data[right], data[candidate]) < 0) {
                candidate = right;
            }
            if (candidate !== index) {
                swap(data, candidate, index);

                index = candidate;
            } else {
                break;
            }
        }

        if (this._length > this._maximumSize && this._maximumSize > 0) {
            this._length = this._maximumSize;
            this._data.length = this._maximumSize;
        }
    };

    /**
     * Create a heap from an existing array. This will modify the original array.
     *
     * @param {Array} data The array to convert to a heap.
     */
    Heap.prototype.buildHeap = function(data) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('data', data);
        //>>includeEnd('debug');

        var length = data.length;
        this._data = data;
        this._length = length;

        for (var i = Math.ceil(length / 2); i >= 0; --i) {
            this.heapify(i);
        }
    };

    /**
     * Insert an element into the heap. If the length would grow greater than maximumSize
     * of the heap, extra elements are removed.
     *
     * @param {*} value The element to insert
     */
    Heap.prototype.insert = function(value) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('value', value);
        //>>includeEnd('debug');

        var data = this._data;
        var comparator = this._comparator;

        var index = this._length++;
        if (index < data.length) {
            data[index] = value;
        } else {
            data.push(value);
        }

        while (index !== 0) {
            var parent = Math.floor((index - 1) / 2);
            if (comparator(data[index], data[parent]) < 0) {
                swap(data, index, parent);
                index = parent;
            } else {
                break;
            }
        }

        if (this._length > this._maximumSize && this._maximumSize > 0) {
            this._length = this._maximumSize;
        }
    };

    /**
     * Remove the top element from the heap and return it.
     *
     * @returns {*} The top element of the heap.
     */
    Heap.prototype.pop = function() {
        if (this._length === 0) {
            return undefined;
        }
        var data = this._data;
        var root = data[0];
        swap(data, 0, --this._length);
        this.heapify(0);
        return root;
    };

    return Heap;
});
