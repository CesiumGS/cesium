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
     * Array implementation of a heap.
     *
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
        this._array = [];
        this._length = 0;
        this._maximumLength = undefined;
    }

    defineProperties(Heap.prototype, {
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
         * Gets the internal array.
         *
         * @memberof Heap.prototype
         *
         * @type {Array}
         * @readonly
         */
        internalArray : {
            get : function() {
                return this._array;
            }
        },

        /**
         * Gets and sets the maximum length of the heap.
         *
         * @memberof Heap.prototype
         *
         * @type {Number}
         */
        maximumLength : {
            get : function() {
                return this._maximumLength;
            },
            set : function(value) {
                this._maximumLength = value;
                if (this._length > value && value > 0) {
                    this._length = value;
                    this._array.length = value;
                }
            }
        }
    });

    function swap(array, a, b) {
        var temp = array[a];
        array[a] = array[b];
        array[b] = temp;
    }

    /**
     * Resizes the internal array of the heap.
     *
     * @param {Number} [length] The length to resize internal array to. Defaults to the current length of the heap.
     */
    Heap.prototype.reserve = function(length) {
        length = defaultValue(length, this._length);
        this._array.length = length;
    };

    /**
     * Update the heap so that index and all descendants satisfy the heap property.
     *
     * @param {Number} [index=0] The starting index to heapify from.
     */
    Heap.prototype.heapify = function(index) {
        index = defaultValue(index, 0);
        var length = this._length;
        var comparator = this._comparator;
        var array = this._array;
        var candidate = -1;

        while (true) {
            var right = 2 * (index + 1);
            var left = right - 1;

            if (left < length && comparator(array[left], array[index]) < 0) {
                candidate = left;
            } else {
                candidate = index;
            }

            if (right < length && comparator(array[right], array[candidate]) < 0) {
                candidate = right;
            }
            if (candidate !== index) {
                swap(array, candidate, index);
                index = candidate;
            } else {
                break;
            }
        }
    };

    /**
     * Resort the heap.
     */
    Heap.prototype.resort = function() {
        var length = this._length;
        for (var i = Math.ceil(length / 2); i >= 0; --i) {
            this.heapify(i);
        }
    };

    /**
     * Insert an element into the heap. If the length would grow greater than maximumLength
     * of the heap, extra elements are removed.
     *
     * @param {*} element The element to insert
     *
     * @return {*} The element that was removed from the heap if the heap is at full capacity.
     */
    Heap.prototype.insert = function(element) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('element', element);
        //>>includeEnd('debug');

        var array = this._array;
        var comparator = this._comparator;

        var index = this._length++;
        if (index < array.length) {
            array[index] = element;
        } else {
            array.push(element);
        }

        while (index !== 0) {
            var parent = Math.floor((index - 1) / 2);
            if (comparator(array[index], array[parent]) < 0) {
                swap(array, index, parent);
                index = parent;
            } else {
                break;
            }
        }

        var removedElement;

        if (defined(this._maximumLength) && (this._length > this._maximumLength)) {
            removedElement = array[this.maximumLength];
            this._length = this._maximumLength;
        }

        return removedElement;
    };

    /**
     * Remove the element specified by index from the heap and return it.
     *
     * @param {Number} [index=0] The index to remove.
     * @returns {*} The specified element of the heap.
     */
    Heap.prototype.pop = function(index) {
        index = defaultValue(index, 0);
        if (this._length === 0) {
            return undefined;
        }
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.number.lessThan('index', index, this._length);
        //>>includeEnd('debug');

        var array = this._array;
        var root = array[index];
        swap(array, index, --this._length);
        this.heapify(index);
        return root;
    };

    return Heap;
});
