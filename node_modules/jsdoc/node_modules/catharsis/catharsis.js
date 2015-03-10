/**
 * Catharsis
 * A parser for Google Closure Compiler type expressions, powered by PEG.js.
 *
 * @author Jeff Williams <jeffrey.l.williams@gmail.com>
 * @license MIT License <http://opensource.org/licenses/mit-license.php/>
 */

'use strict';

var describe = require('./lib/describe');
var parse = require('./lib/parser').parse;
var stringify = require('./lib/stringify');

var typeExpressionCache = {
	normal: {},
	jsdoc: {}
};

var parsedTypeCache = {
	normal: {},
	htmlSafe: {}
};

var descriptionCache = {
	normal: {}
};

function getTypeExpressionCache(options) {
	if (options.useCache === false) {
		return null;
	} else if (options.jsdoc === true) {
		return typeExpressionCache.jsdoc;
	} else {
		return typeExpressionCache.normal;
	}
}

function getParsedTypeCache(options) {
	if (options.useCache === false || options.links !== null || options.links !== undefined) {
		return null;
	} else if (options.htmlSafe === true) {
		return parsedTypeCache.htmlSafe;
	} else {
		return parsedTypeCache.normal;
	}
}

function getDescriptionCache(options) {
	if (options.useCache === false || options.links !== null || options.links !== undefined) {
		return null;
	} else {
		return descriptionCache.normal;
	}
}

// can't return the original if any of the following are true:
// 1. restringification was requested
// 2. htmlSafe option was requested
// 3. links option was provided
// 4. typeExpression property is missing
function canReturnOriginalExpression(parsedType, options) {
	return options.restringify !== true && options.htmlSafe !== true &&
		(options.links === null || options.links === undefined) &&
		Object.prototype.hasOwnProperty.call(parsedType, 'typeExpression');
}

// Add non-enumerable properties to a result object, then freeze it.
function prepareFrozenObject(obj, expr, options) {
	Object.defineProperty(obj, 'jsdoc', {
		value: options.jsdoc === true ? true : false
	});

	if (expr) {
		Object.defineProperty(obj, 'typeExpression', {
			value: expr
		});
	}

	return Object.freeze(obj);
}

function cachedParse(expr, options) {
	var cache = getTypeExpressionCache(options);
	var parsedType;

	if (cache && Object.prototype.hasOwnProperty.call(cache, expr)) {
		return cache[expr];
	} else {
		parsedType = parse(expr, options);
		parsedType = prepareFrozenObject(parsedType, expr, options);

		if (cache) {
			cache[expr] = parsedType;
		}

		return parsedType;
	}
}

function cachedStringify(parsedType, options) {
	var cache = getParsedTypeCache(options);
	var json;

	if (canReturnOriginalExpression(parsedType, options)) {
		return parsedType.typeExpression;
	} else if (cache) {
		json = JSON.stringify(parsedType);
		cache[json] = cache[json] || stringify(parsedType, options);
		return cache[json];
	} else {
		return stringify(parsedType, options);
	}
}

function cachedDescribe(parsedType, options) {
	var cache = getDescriptionCache(options);
	var json;
	var result;

	if (cache) {
		json = JSON.stringify(parsedType);
		cache[json] = cache[json] || describe(parsedType, options);
		return cache[json];
	} else {
		result = describe(parsedType, options);
		result = prepareFrozenObject(result, null, options);

		return result;
	}
}

function Catharsis() {
	this.Types = require('./lib/types');
}

Catharsis.prototype.parse = function(typeExpr, options) {
	options = options || {};

	typeExpr = typeExpr.replace(/[\r\n]/g, '')
		.replace(/\s+/g, ' ')
		.trim();

	return cachedParse(typeExpr, options);
};

Catharsis.prototype.stringify = function(parsedType, options) {
	var result;

	options = options || {};

	result = cachedStringify(parsedType, options);
	if (options.validate) {
		this.parse(result, options);
	}

	return result;
};

Catharsis.prototype.describe = function(parsedType, options) {
	options = options || {};

	return cachedDescribe(parsedType, options);
};

module.exports = new Catharsis();
