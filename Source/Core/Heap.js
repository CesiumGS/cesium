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

    function Heap(comparator) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('comparator', comparator);
        //>>includeEnd('debug');

        this._comparator = comparator;
        this._data = [];
        this._length = 0;
        this.maximumSize = 0;
    }

    defineProperties(Heap.prototype, {
        /**
         *  @readonly
         */
        data : {
            get : function() {
                return this._data;
            }
        },

        length : {
            get : function() {
                return this._length;
            }
        }
    });

    function swap(data, a, b) {
        var temp = data[a];
        data[a] = data[b];
        data[b] = temp;
    }

    Heap.prototype.reserve = function(length) {
        length = defaultValue(length, this._length);
        var data = this._data;
        data.length = length;
    };

    Heap.prototype.heapify = function(index) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.number.greaterThanOrEquals('index', index, 0);
        //>>includeEnd('debug');

        var length = this._length;
        var comparator = this._comparator;
        var data = this._data;
        var candidate = -1;

        while(1) {
            var left = 2 * index + 1;
            var right = 2 * index + 2;

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

        if (this._length > this.maximumSize && this.maximumSize > 0) {
            this._length = this.maximumSize;
            this.reserve();
        }
    };

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

        do {
            var parent = Math.floor(index / 2);
            if (comparator(data[index], data[parent]) < 0) {
                swap(data, index, parent);
                index = parent;
            } else {
                break;
            }
        } while (index !== 0);

        if (this._length > this.maximumSize && this.maximumSize > 0) {
            this._length = this.maximumSize;
        }
    };

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
