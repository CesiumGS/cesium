#!/usr/bin/env node

'use strict';

// Command-line tool that parses a type expression and dumps a JSON version of the parse tree.
var catharsis = require('../catharsis');
var path = require('path');
var util = require('util');

var command = path.basename(process.argv[1]);
var typeExpression = process.argv[2];
var opts = {
	describe: false,
	jsdoc: false
};
var parsedType;

function usage() {
	console.log(util.format('Usage:\n    %s typeExpression [--jsdoc] [--describe]', command));
}

function done(err) {
	/*eslint no-process-exit: 0 */
	process.exit(err === undefined ? 0 : err);
}

process.argv.slice(3).forEach(function(arg) {
	var parsedArg = arg.replace(/^\-{2}/, '');
	if (opts[parsedArg] !== undefined) {
		opts[parsedArg] = true;
	} else {
		console.error('Unknown option "%s"', arg);
		usage();
		done(1);
	}
});

if (!typeExpression) {
	usage();
	done(1);
} else {
	try {
		parsedType = catharsis.parse(typeExpression, opts);
		if (opts.describe) {
			parsedType = catharsis.describe(parsedType);
		}
	} catch (e) {
		console.error(util.format('Unable to parse "%s" (exception follows):', typeExpression));
		console.error(e.stack || e.message);
		done(1);
	}

	console.log(JSON.stringify(parsedType, null, 2));
	done();
}
