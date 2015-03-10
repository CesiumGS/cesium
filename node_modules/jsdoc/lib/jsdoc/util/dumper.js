/*global Set */
/**
 * Recursively print out all names and values in a data structure.
 * @module jsdoc/util/dumper
 * @author Michael Mathews <micmath@gmail.com>
 * @license Apache License 2.0 - See file 'LICENSE.md' in this project.
 */
'use strict';

var util = require('util');
var setDefined = typeof Set !== 'undefined';

function ObjectWalker() {
    if (setDefined) {
        this.seenItems = new Set();
    } else {
        this.seenItems = [];
    }
}

ObjectWalker.prototype.seen = function(object) {
    var result;
    if (setDefined) {
        result =  this.seenItems.has(object);
    } else {
        result = object.hasBeenSeenByWalkerDumper;
    }
    return result;
};

ObjectWalker.prototype.markAsSeen = function(object) {
    if (setDefined) {
        this.seenItems.add(object);
    } else {
        object.hasBeenSeenByWalkerDumper = true;
        this.seenItems.push(object);
    }
};

ObjectWalker.prototype.cleanSeenFlag = function() {
    if (setDefined) {
        this.seenItems = new Set();
    } else {
        this.seenItems.forEach(function(object) {
            delete object.hasBeenSeenByWalkerDumper;
        });
    }
};

// some objects are unwalkable, like Java native objects
ObjectWalker.prototype.isUnwalkable = function(o) {
    return (o && typeof o === 'object' && typeof o.constructor === 'undefined');
};

ObjectWalker.prototype.isFunction = function(o) {
    return (o && typeof o === 'function' || o instanceof Function);
};

ObjectWalker.prototype.isObject = function(o) {
    return o && o instanceof Object ||
        (o && typeof o.constructor !== 'undefined' && o.constructor.name === 'Object');
};

ObjectWalker.prototype.checkCircularRefs = function(o, func) {
    if ( this.seen(o) ) {
        return '<CircularRef>';
    }
    else {
        this.markAsSeen(o);
        return func(o);
    }
};

ObjectWalker.prototype.walk = function(o) {
    var result;

    var self = this;

    if ( this.isUnwalkable(o) ) {
        result = '<Object>';
    }
    else if ( o === undefined ) {
        result = null;
    }
    else if ( Array.isArray(o) ) {
        result = this.checkCircularRefs(o, function(arr) {
            var newArray = [];
            arr.forEach(function(item) {
                newArray.push( self.walk(item) );
            });

            return newArray;
        });
    }
    else if ( util.isRegExp(o) ) {
        result = '<RegExp ' + o + '>';
    }
    else if ( util.isDate(o) ) {
        result = '<Date ' + o.toUTCString() + '>';
    }
    else if ( util.isError(o) ) {
        result = { message: o.message };
    }
    else if ( this.isFunction(o) ) {
        result = '<Function' + (o.name ? ' ' + o.name : '') + '>';
    }
    else if ( this.isObject(o) && o !== null ) {
        result = this.checkCircularRefs(o, function(obj) {
            var newObj = {};
            Object.keys(obj).forEach(function(key) {
                if (!setDefined && key === 'hasBeenSeenByWalkerDumper') { return; }
                newObj[key] = self.walk(obj[key]);
            });

            return newObj;
        });
    }
    // should be safe to JSON.stringify() everything else
    else {
        result = o;
    }

    return result;
};

/**
 * @param {*} object
 */
exports.dump = function(object) {
    var walker = new ObjectWalker();
    var result = JSON.stringify(walker.walk(object), null, 4);
    walker.cleanSeenFlag();

    return result;
};
