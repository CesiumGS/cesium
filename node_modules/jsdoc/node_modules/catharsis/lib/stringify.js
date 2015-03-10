'use strict';

var Types = require('./types');

function Stringifier(options) {
	this._options = options || {};
	this._options.linkClass = this._options.linkClass || this._options.cssClass;

	// in a list of function signature params, repeatable params are stringified differently
	this._inFunctionSignatureParams = false;
}

Stringifier.prototype.applications = function(applications) {
	var result = '';
	var strings = [];

	if (!applications) {
		return result;
	}

	for (var i = 0, l = applications.length; i < l; i++) {
		strings.push(this.type(applications[i]));
	}

	if (this._options.htmlSafe) {
		result = '.&lt;';
	} else {
		result = '.<';
	}

	result += strings.join(', ') + '>';

	return result;
};

Stringifier.prototype.elements = function(elements) {
	var result = '';
	var strings = [];

	if (!elements) {
		return result;
	}

	for (var i = 0, l = elements.length; i < l; i++) {
		strings.push(this.type(elements[i]));
	}

	result = '(' + strings.join('|') + ')';

	return result;
};

Stringifier.prototype.name = function(name) {
	return name || '';
};

Stringifier.prototype['new'] = function(funcNew) {
	return funcNew ? 'new:' + this.type(funcNew) : '';
};

Stringifier.prototype.nullable = function(nullable) {
	switch (nullable) {
		case true:
			return '?';
		case false:
			return '!';
		default:
			return '';
	}
};

Stringifier.prototype.optional = function(optional) {
	if (optional === true) {
		return '=';
	} else {
		return '';
	}
};

Stringifier.prototype.params = function(params) {
	var result = '';
	var strings = [];

	if (!params || params.length === 0) {
		return result;
	}

	for (var i = 0, l = params.length; i < l; i++) {
		strings.push(this.type(params[i]));
	}

	result = strings.join(', ');

	return result;
};

Stringifier.prototype.result = function(result) {
	return result ? ': ' + this.type(result) : '';
};

Stringifier.prototype['this'] = function(funcThis) {
	return funcThis ? 'this:' + this.type(funcThis) : '';
};

Stringifier.prototype.type = function(type) {
	var typeString = '';

	if (!type) {
		return typeString;
	}

	switch(type.type) {
		case Types.AllLiteral:
			typeString = this._formatNameAndType(type, '*');
			break;
		case Types.FunctionType:
			typeString = this._signature(type);
			break;
		case Types.NullLiteral:
			typeString = this._formatNameAndType(type, 'null');
			break;
		case Types.RecordType:
			typeString = this._record(type);
			break;
		case Types.TypeApplication:
			typeString = this.type(type.expression) + this.applications(type.applications);
			break;
		case Types.UndefinedLiteral:
			typeString = this._formatNameAndType(type, 'undefined');
			break;
		case Types.TypeUnion:
			typeString = this.elements(type.elements);
			break;
		case Types.UnknownLiteral:
			typeString = this._formatNameAndType(type, '?');
			break;
		default:
			typeString = this._formatNameAndType(type);
	}

	// add optional/nullable/repeatable modifiers
	if (!this._options._ignoreModifiers) {
		typeString = this._addModifiers(type, typeString);
	}

	return typeString;
};

Stringifier.prototype.stringify = Stringifier.prototype.type;

Stringifier.prototype.key = Stringifier.prototype.type;

Stringifier.prototype._record = function(type) {
	var fields = this._recordFields(type.fields);

	return '{' + fields.join(', ') + '}';
};

Stringifier.prototype._recordFields = function(fields) {
	var field;
	var keyAndValue;

	var result = [];

	if (!fields) {
		return result;
	}

	for (var i = 0, l = fields.length; i < l; i++) {
		field = fields[i];

		keyAndValue = this.key(field.key);
		keyAndValue += field.value ? ': ' + this.type(field.value) : '';

		result.push(keyAndValue);
	}

	return result;
};

function combineNameAndType(nameString, typeString) {
	var separator = (nameString && typeString) ? ':' : '';

	return nameString + separator + typeString;
}

// Adds optional, nullable, and repeatable modifiers if necessary.
Stringifier.prototype._addModifiers = function(type, typeString) {
	var combined;

	var open = '';
	var close = '';
	var optional = '';

	if (type.repeatable) {
		open = this._inFunctionSignatureParams ? '...[' : '...';
		close = this._inFunctionSignatureParams ? ']' : '';
	}

	combined = this.nullable(type.nullable) + combineNameAndType('', typeString);
	optional = this.optional(type.optional);

	return open + combined + close + optional;
};

Stringifier.prototype._addLinks = function(nameString) {
	var openTag;

	var linkClass = '';
	var options = this._options;

	if (options.links && Object.prototype.hasOwnProperty.call(options.links, nameString)) {
		if (options.linkClass) {
			linkClass = ' class="' + options.linkClass + '"';
		}

		openTag = '<a href="' + options.links[nameString] + '"' + linkClass + '>';
		nameString = openTag + nameString + '</a>';
	}

	return nameString;
};

Stringifier.prototype._formatNameAndType = function(type, literal) {
	var nameString = type.name || literal || '';
	var typeString = type.type ? this.type(type.type) : '';

	nameString = this._addLinks(nameString);

	return combineNameAndType(nameString, typeString);
};

Stringifier.prototype._signature = function(type) {
	var param;
	var prop;
	var signature;

	var params = [];
	// these go within the signature's parens, in this order
	var props = [
		'new',
		'this',
		'params'
	];

	this._inFunctionSignatureParams = true;
	for (var i = 0, l = props.length; i < l; i++) {
		prop = props[i];
		param = this[prop](type[prop]);
		if (param.length > 0) {
			params.push(param);
		}
	}
	this._inFunctionSignatureParams = false;

	signature = 'function(' + params.join(', ') + ')';
	signature += this.result(type.result);

	return signature;
};


module.exports = function(type, options) {
	return new Stringifier(options).stringify(type);
};
