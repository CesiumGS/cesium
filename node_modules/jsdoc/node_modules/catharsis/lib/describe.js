'use strict';

var _ = require('underscore-contrib');
var fs = require('fs');
var path = require('path');
var stringify = require('./stringify');
var Types = require('./types');
var util = require('util');

var DEFAULT_OPTIONS = {
	language: 'en',
	resources: {
		en: JSON.parse(fs.readFileSync(path.join(__dirname, '../res/en.json'), 'utf8'))
	}
};

// order matters for these!
var FUNCTION_DETAILS = ['new', 'this'];
var FUNCTION_DETAILS_VARIABLES = ['functionNew', 'functionThis'];
var MODIFIERS = ['optional', 'nullable', 'repeatable'];

var TEMPLATE_VARIABLES = [
	'application',
	'codeTagClose',
	'codeTagOpen',
	'element',
	'field',
	'functionNew',
	'functionParams',
	'functionReturns',
	'functionThis',
	'keyApplication',
	'name',
	'nullable',
	'optional',
	'param',
	'prefix',
	'repeatable',
	'suffix',
	'type'
];

var FORMATS = {
	EXTENDED: 'extended',
	SIMPLE: 'simple'
};

function makeTagOpen(codeTag, codeClass) {
	var tagOpen = '';
	var tags = codeTag ? codeTag.split(' ') : [];

	tags.forEach(function(tag) {
		var tagClass = codeClass ? util.format(' class="%s"', codeClass) : '';
		tagOpen += util.format('<%s%s>', tag, tagClass);
	});

	return tagOpen;
}

function makeTagClose(codeTag) {
	var tagClose = '';
	var tags = codeTag ? codeTag.split(' ') : [];

	tags.reverse();
	tags.forEach(function(tag) {
		tagClose += util.format('</%s>', tag);
	});

	return tagClose;
}

function Result() {
	this.description = '';
	this.modifiers = {
		functionNew: '',
		functionThis: '',
		optional: '',
		nullable: '',
		repeatable: ''
	};
	this.returns = '';
}

function Context(props) {
	var self = this;

	props = props || {};

	TEMPLATE_VARIABLES.forEach(function(variable) {
		self[variable] = props[variable] || '';
	});
}

function Describer(opts) {
	var options;

	this._useLongFormat = true;
	options = this._options = _.defaults(opts || {}, DEFAULT_OPTIONS);
	this._stringifyOptions = _.defaults(options, {_ignoreModifiers: true});

	// use a dictionary, not a Context object, so we can more easily merge this into Context objects
	this._i18nContext = {
		codeTagClose: makeTagClose(options.codeTag),
		codeTagOpen: makeTagOpen(options.codeTag, options.codeClass)
	};

	// templates start out as strings; we lazily replace them with template functions
	this._templates = options.resources[options.language];
	if (!this._templates) {
		throw new Error('I18N resources are not available for the language ' + options.language);
	}
}

function modifierKind(useLongFormat) {
	return useLongFormat ? FORMATS.EXTENDED : FORMATS.SIMPLE;
}

function buildModifierStrings(describer, modifiers, type, useLongFormat) {
	var modifierStrings = {};
	var result = {};

	modifiers.forEach(function(modifier) {
		var key = modifierKind(useLongFormat);
		var modifierStrings = describer[modifier](type[modifier]);

		result[modifier] = modifierStrings[key];
	});

	return result;
}

function addModifiers(describer, context, result, type, useLongFormat) {
	var keyPrefix = 'modifiers.' + modifierKind(useLongFormat);
	var modifiers = buildModifierStrings(describer, MODIFIERS, type, useLongFormat);

	MODIFIERS.forEach(function(modifier) {
		var modifierText = modifiers[modifier] || '';

		result.modifiers[modifier] = modifierText;
		if (!useLongFormat) {
			context[modifier] = modifierText;
		}
	});

	context.prefix = describer._translate(keyPrefix + '.prefix', context);
	context.suffix = describer._translate(keyPrefix + '.suffix', context);
}

function addFunctionModifiers(describer, context, result, type, useLongFormat) {
	var functionDetails = buildModifierStrings(describer, FUNCTION_DETAILS, type, useLongFormat);
	var kind = modifierKind(useLongFormat);
	var strings = [];

	FUNCTION_DETAILS.forEach(function(functionDetail, i) {
		var functionExtraInfo = functionDetails[functionDetail] || '';
		var functionDetailsVariable = FUNCTION_DETAILS_VARIABLES[i];

		result.modifiers[functionDetailsVariable] = functionExtraInfo;
		if (!useLongFormat) {
			context[functionDetailsVariable] += functionExtraInfo;
		}
	});
}

// Replace 2+ whitespace characters with a single whitespace character.
function collapseSpaces(string) {
	return string.replace(/(\s)+/g, '$1');
}

Describer.prototype._stringify = function(type, typeString, useLongFormat) {
	var context = new Context({
		type: typeString || stringify(type, this._stringifyOptions)
	});
	var result = new Result();

	addModifiers(this, context, result, type, useLongFormat);
	result.description = this._translate('type', context).trim();

	return result;
};

Describer.prototype._translate = function(key, context) {
	var result;
	var templateFunction = _.getPath(this._templates, key);

	context = context || new Context();

	if (templateFunction === undefined) {
		throw new Error(util.format('The template %s does not exist for the language %s', key,
			this._options.language));
	}

	// compile and cache the template function if necessary
	if (typeof templateFunction === 'string') {
		// force the templates to use the `context` object
		templateFunction = templateFunction.replace(/\<\%\= /g, '<%= context.');
		templateFunction = _.template(templateFunction, null, {variable: 'context'});
		_.setPath(this._templates, templateFunction, key);
	}

	result = (templateFunction(_.extend(context, this._i18nContext)) || '')
		// strip leading spaces
		.replace(/^\s+/, '');
	result = collapseSpaces(result);

	return result;
};

Describer.prototype._modifierHelper = function(key, modifierPrefix, context) {
	modifierPrefix = modifierPrefix || '';

	return {
		extended: key ?
			this._translate(util.format('%s.%s.%s', modifierPrefix, FORMATS.EXTENDED, key),
				context) :
			'',
		simple: key ?
			this._translate(util.format('%s.%s.%s', modifierPrefix, FORMATS.SIMPLE, key), context) :
			''
	};
};

Describer.prototype._translateModifier = function(key, context) {
	return this._modifierHelper(key, 'modifiers', context);
};

Describer.prototype._translateFunctionModifier = function(key, context) {
	return this._modifierHelper(key, 'function', context);
};

function getApplicationKey(applications) {
	if (applications.length === 1) {
		return 'array';
	} else if (/[Ss]tring/.test(applications[0].name)) {
		// object with string keys
		return 'object';
	} else {
		// object with non-string keys
		return 'objectNonString';
	}
}

Describer.prototype.application = function(type, useLongFormat) {
	var applications = type.applications.slice(0);
	var context = new Context();
	var key = 'application.' + getApplicationKey(applications);
	var result = new Result();
	var self = this;

	addModifiers(this, context, result, type, useLongFormat);

	context.application = this.type(applications.pop()).description;
	context.keyApplication = applications.length ? this.type(applications.pop()).description : '';

	result.description = this._translate(key, context).trim();

	return result;
};

function reduceMultiple(context, keyName, contextName, translate, previous, current, index, items) {
	var key =
		index === 0 ? '.first.many' :
		index === (items.length - 1) ? '.last.many' :
		'.middle.many';

	key = keyName + key;
	context[contextName] = items[index];

	return previous + translate(key, context);
}

Describer.prototype.elements = function(type, useLongFormat) {
	var context = new Context();
	var items = type.elements.slice(0);
	var result = new Result();

	addModifiers(this, context, result, type, useLongFormat);
	result.description = this._combineMultiple(items, context, 'union', 'element', useLongFormat);

	return result;
};

Describer.prototype['new'] = function(funcNew) {
	var context = new Context({'functionNew': this.type(funcNew).description});
	var key = funcNew ? 'new' : '';

	return this._translateFunctionModifier(key, context);
};

Describer.prototype.nullable = function(nullable) {
	var key = nullable === true ? 'nullable' :
		nullable === false ? 'nonNullable' :
		'';

	return this._translateModifier(key);
};

Describer.prototype.optional = function(optional) {
	var key = (optional === true) ? 'optional' : '';

	return this._translateModifier(key);
};

Describer.prototype.repeatable = function(repeatable) {
	var key = (repeatable === true) ? 'repeatable' : '';

	return this._translateModifier(key);
};

Describer.prototype._combineMultiple = function(items, context, keyName, contextName,
	useLongFormat) {
	var result = new Result();
	var self = this;
	var strings;

	strings = typeof items[0] === 'string' ?
		items.slice(0) :
		items.map(function(item) {
			return self.type(item).description;
		});

	switch(strings.length) {
		case 0:
			// falls through
		case 1:
			context[contextName] = strings[0] || '';
			result.description = this._translate(keyName + '.first.one', context);
			break;
		case 2:
			strings.forEach(function(item, idx) {
				var key = keyName + (idx === 0 ? '.first' : '.last' ) + '.two';

				context[contextName] = item;
				result.description += self._translate(key, context);
			});
			break;
		default:
			result.description = strings.reduce(reduceMultiple.bind(null, context, keyName,
				contextName, this._translate.bind(this)), '');
	}

	return result.description.trim();
};

Describer.prototype.params = function(params, functionContext) {
	var context = new Context();
	var result = new Result();
	var self = this;
	var strings;

	// TODO: this hardcodes the order and placement of functionNew and functionThis; need to move
	// this to the template (and also track whether to put a comma after the last modifier)
	functionContext = functionContext || {};
	params = params || [];
	strings = params.map(function(param) {
		return self.type(param).description;
	});

	if (functionContext.functionThis) {
		strings.unshift(functionContext.functionThis);
	}
	if (functionContext.functionNew) {
		strings.unshift(functionContext.functionNew);
	}
	result.description = this._combineMultiple(strings, context, 'params', 'param', false);

	return result;
};

Describer.prototype['this'] = function(funcThis) {
	var context = new Context({'functionThis': this.type(funcThis).description});
	var key = funcThis ? 'this' : '';

	return this._translateFunctionModifier(key, context);
};

Describer.prototype.type = function(type, useLongFormat) {
	var result = new Result();

	if (useLongFormat === undefined) {
		useLongFormat = this._useLongFormat;
	}
	// ensure we don't use the long format for inner types
	this._useLongFormat = false;

	if (!type) {
		return result;
	}

	switch(type.type) {
		case Types.AllLiteral:
			result = this._stringify(type, this._translate('all'), useLongFormat);
			break;
		case Types.FunctionType:
			result = this._signature(type, useLongFormat);
			break;
		case Types.NameExpression:
			result = this._stringify(type, null, useLongFormat);
			break;
		case Types.NullLiteral:
			result = this._stringify(type, this._translate('null'), useLongFormat);
			break;
		case Types.RecordType:
			result = this._record(type, useLongFormat);
			break;
		case Types.TypeApplication:
			result = this.application(type, useLongFormat);
			break;
		case Types.TypeUnion:
			result = this.elements(type, useLongFormat);
			break;
		case Types.UndefinedLiteral:
			result = this._stringify(type, this._translate('undefined'), useLongFormat);
			break;
		case Types.UnknownLiteral:
			result = this._stringify(type, this._translate('unknown'), useLongFormat);
			break;
		default:
			throw new Error('Unknown type: ' + JSON.stringify(type));
	}

	return result;
};

Describer.prototype._record = function(type, useLongFormat) {
	var context = new Context();
	var items;
	var result = new Result();

	items = this._recordFields(type.fields);

	addModifiers(this, context, result, type, useLongFormat);
	result.description = this._combineMultiple(items, context, 'record', 'field', useLongFormat);

	return result;
};

Describer.prototype._recordFields = function(fields) {
	var context = new Context();
	var result = [];
	var self = this;

	if (!fields.length) {
		return result;
	}

	result = fields.map(function(field) {
		var key = 'field.' + (field.value ? 'typed' : 'untyped');

		context.name = self.type(field.key).description;
		if (field.value) {
			context.type = self.type(field.value).description;
		}

		return self._translate(key, context);
	});

	return result;
};

Describer.prototype._addLinks = function(nameString) {
	var linkClass = '';
	var options = this._options;
	var result = nameString;


	if (options.links && Object.prototype.hasOwnProperty.call(options.links, nameString)) {
		if (options.linkClass) {
			linkClass = util.format(' class="%s"', options.linkClass);
		}

		nameString = util.format('<a href="%s"%s>%s</a>', options.links[nameString], linkClass,
			nameString);
	}

	return nameString;
};

Describer.prototype.result = function(type, useLongFormat) {
	var context = new Context();
	var description;
	var key = 'function.' + modifierKind(useLongFormat) + '.returns';
	var result = new Result();

	context.type = this.type(type).description;

	addModifiers(this, context, result, type, useLongFormat);
	result.description = this._translate(key, context);

	return result;
};

Describer.prototype._signature = function(type, useLongFormat) {
	var context = new Context();
	var functionModifiers;
	var kind = modifierKind(useLongFormat);
	var result = new Result();
	var returns;
	var self = this;

	addModifiers(this, context, result, type, useLongFormat);
	addFunctionModifiers(this, context, result, type, useLongFormat);

	context.functionParams = this.params(type.params || [], context).description;

	if (type.result) {
		returns = this.result(type.result, useLongFormat);
		if (useLongFormat) {
			result.returns = returns.description;
		} else {
			context.functionReturns = returns.description;
		}
	}

	result.description += this._translate('function.' + kind + '.signature', context).trim();

	return result;
};

module.exports = function(type, options) {
	var simple = new Describer(options).type(type, false);
	var extended = new Describer(options).type(type);

	[simple, extended].forEach(function(result) {
		result.description = collapseSpaces(result.description.trim());
	});

	return {
		simple: simple.description,
		extended: extended
	};
};
