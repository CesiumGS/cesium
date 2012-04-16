/**
	@module jsdoc/tag/type

	@author Michael Mathews <micmath@gmail.com>
	@license Apache License 2.0 - See file 'LICENSE.md' in this project.
 */


/**
	@param {string} tagValue
	@returns {Array.<string>}
 */
exports.parse = function(tagValue) {
	if (typeof tagValue !== 'string') { tagValue = ''; }
	var type = '',
		text = '',
		count = 0,
		optional,
		nullable,
		variable;
	
	[type, text] = getTagType(tagValue);
	if (type === '') { text = tagValue; }
	
	[type, optional] = parseOptional(type);
	[type, nullable] = parseNullable(type);
	[type, variable] = parseVariable(type);

	type = parseTypes(type); // make it into an array

	return [type, text, optional, nullable, variable];
}

function parseOptional(type) {
	var optional = null;
	
	// {sometype=} means optional
	if ( /(.+)=$/.test(type) ) {
		type = RegExp.$1;
		optional = true;
	}
	
	return [type, optional];
}

function parseNullable(type) {
	var nullable = null;
	
	// {?sometype} means nullable, {!sometype} means not-nullable
	if ( /^([\?\!])(.+)$/.test(type) ) {
		type = RegExp.$2;
		nullable = (RegExp.$1 === '?')? true : false;
	}
	
	return [type, nullable];
}

function parseVariable(type) {
	var variable = null;
	
	// {...sometype} means variable number of that type
	if ( /^(\.\.\.)(.+)$/.test(type) ) {
		type = RegExp.$2;
		variable = true;
	}
	
	return [type, variable];
}

function parseTypes(type) {
	var types = [];
	
	if ( ~type.indexOf('|') ) {
		// remove optional parens, like: { ( string | number ) }
		// see: http://code.google.com/closure/compiler/docs/js-for-compiler.html#types
		if ( /^\s*\(\s*(.+)\s*\)\s*$/.test(type) ) {
			type = RegExp.$1;
		}
		types = type.split(/\s*\|\s*/g);
	}
	else if (type) {
		types = [type];
	}
	
	return types;
}

function getTagType(tagValue) {
    var type = '',
        text = '',
        count = 0;

    // type expressions start with '{'
    if (tagValue[0] === '{') {
        count++;

        // find matching closer '}'
        for (var i = 1, leni = tagValue.length; i < leni; i++) {
            if (tagValue[i] === '\\') { i++; continue; } // backslash escapes the next character

            if (tagValue[i] === '{') { count++; }
            else if (tagValue[i] === '}') { count--; }

            if (count === 0) {
                type = trim(tagValue.slice(1, i))
                       .replace(/\\\{/g, '{') // unescape escaped curly braces
                       .replace(/\\\}/g, '}');
                text = trim(tagValue.slice(i+1));
                break;
            }
        }
    }
    return [type, text];
}
exports.getTagType = getTagType;

/** @private */
function trim(text) {
	return text.trim();
}
