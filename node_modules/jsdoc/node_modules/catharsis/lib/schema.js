'use strict';

var _ = require('underscore-contrib');

// JSON schema types
var ARRAY = 'array';
var BOOLEAN = 'boolean';
var OBJECT = 'object';
var STRING = 'string';
var UNDEFINED = 'undefined';

var TYPES = require('./types');
var TYPE_NAMES = _.values(TYPES);

module.exports = {
	id: '#parsedType',
	type: [OBJECT, UNDEFINED],
	additionalProperties: false,
	properties: {
		type: {
			type: STRING,
			enum: TYPE_NAMES
		},

		// field type
		key: { '$ref': '#parsedType' },
		value: { '$ref': '#parsedType' },

		// function type
		params: {
			type: ARRAY,
			items: { '$ref': '#parsedType' }
		},
		'new': { '$ref': '#parsedType' },
		'this': { '$ref': '#parsedType' },
		result: {'$ref': '#parsedType' },

		// name expression
		name: STRING,

		// record type
		fields: {
			type: ARRAY,
			items: { '$ref': '#parsedType' }
		},

		// type application
		expression: { '$ref': '#parsedType' },
		applications: {
			type: ARRAY,
			minItems: 1,
			maxItems: 2,
			items: { '$ref': '#parsedType' }
		},

		// type union
		elements: {
			type: ARRAY,
			minItems: 1,
			items: { '$ref': '#parsedType' }
		},

		optional: BOOLEAN,
		nullable: BOOLEAN,
		repeatable: BOOLEAN,
		reservedWord: BOOLEAN
	},
	required: [ 'type' ]
};
