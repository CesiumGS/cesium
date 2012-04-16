/**
    Recursively print out all names and values in a data structure.
    @module common/dumper
    @author Michael Mathews <micmath@gmail.com>
	@license Apache License 2.0 - See file 'LICENSE.md' in this project.
 */

/**
    @param {any} object
 */
exports.dump = function(object) {
    indentBy = 0;
    output = '';
    
    walk(object);
    outdent(false);
    return output;
}

const INDENTATION = '    '; // 4 spaces
var indentBy,
    output;

function pad(depth) {
    var padding = '';
    while (depth--) {
        padding += INDENTATION;
    }
    return padding;
}

/**
    @param {string} openingBrace - The opening brace to add, like "{".
    @private
    @inner
    @memberof module:common/dumper
 */
function indent(openingBrace) {
    indentBy++;
    if (openingBrace) output += openingBrace + '\n';
}

/**
    @param {string|boolean} closingBrace - The closing brace to add, like "}" or if boolean
    `false` no closing brace or trailing newline.
    @private
    @inner
    @memberof module:common/dumper
 */
function outdent(closingBrace) {
    indentBy--;
    output = output.replace(/,\n$/, '\n'); // trim trailing comma
    if (closingBrace === false) { output = output.replace(/\n$/, ''); }
    else if (closingBrace) output += pad(indentBy) + closingBrace + ',\n';
}

var seen = [];
seen.has = function(object) {
    for (var i = 0, l = seen.length; i < l; i++) {
        if (seen[i] === object) { return true; }
    }
    return false;
}

function walk(object) {
    var value;
    
    if ( value = getValue(object) ) {
        output += value + ',\n';
    }
    else if ( isUnwalkable(object) ) {
        output += '<Object>,\n'
    }
    else if ( isRegExp(object) ) {
        output += '<RegExp ' + object + '>,\n'
    }
    else if ( isDate(object) ) {
        output += '<Date ' + object.toUTCString() + '>,\n'
    }
    else if ( isFunction(object) ) {
        output += '<Function' + (object.name? ' '+ object.name : '') + '>,\n';
    }
    else if ( isArray(object) ) {
        if ( seen.has(object) ) {
            output += '<CircularRef>,\n';
            return;
        }
        else {
            seen.push(object);
        }
        
        indent('[');
        for (var i = 0, leni = object.length; i < leni; i++) {
            output += pad(indentBy); // + i + ': ';
            walk( object[i] );
        }
        outdent(']');
    }
    else if ( isObject(object) ) {
        if ( seen.has(object) ) {
            output += '<CircularRef>,\n';
            return;
        }
        else {
            seen.push(object);
        }
    
        indent('{');
        for (var p in object) {
            if ( object.hasOwnProperty(p) ) {
                output += pad(indentBy) + stringify(p) + ': ';
                walk( object[p] );
            }
        }
        outdent('}');
    }
}

function getValue(o) { // see: https://developer.mozilla.org/en/JavaScript/Reference/Operators/Special/typeof
    if (o === null) { return 'null'; }
    if ( /^(string|boolean|number|undefined)$/.test(typeof o) ) {
        return ''+stringify(o);
    }
}

function stringify(o) {
    return JSON.stringify(o);
}

function isUnwalkable(o) { // some objects are unwalkable, like Java native objects
    return (typeof o === 'object' && typeof o.constructor === 'undefined');
}

function isArray(o) {
    return o && (o instanceof Array) || o.constructor === Array;
}

function isRegExp(o) {
    return (o instanceof RegExp) ||
         (typeof o.constructor !== 'undefined' && o.constructor.name === 'RegExp');
}

function isDate(o) {
    return o && (o instanceof Date) ||
           (typeof o.constructor !== 'undefined' && o.constructor.name === 'Date');
}

function isFunction(o) {
    return o && (typeof o === 'function' || o instanceof Function);// ||
           //(typeof o.constructor !== 'undefined' && (o.constructor||{}).name === 'Function');
}

function isObject(o) {
  return o && o instanceof Object ||
         (typeof o.constructor !== 'undefined' && o.constructor.name === 'Object');
}

