/**
	@module jsdoc/opts/parser
	@requires common/args
	@author Michael Mathews <micmath@gmail.com>
	@license Apache License 2.0 - See file 'LICENSE.md' in this project.
 */

var common = {
	args: require('common/args')
};

var argParser = new common.args.ArgParser(),
	ourOptions,
	defaults = {
		destination: './out/'
	};

argParser.addOption('t', 'template',    true,  'The name of the template to use. Default: the "default" template');
argParser.addOption('c', 'configure',   true,  'The path to the configuration file. Default: jsdoc __dirname + /conf.json');
argParser.addOption('e', 'encoding',    true,  'Assume this encoding when reading all source files. Default: utf-8');
argParser.addOption('T', 'test',        false, 'Run all tests and quit.');
argParser.addOption('d', 'destination', true,  'The path to the output folder. Use "console" to dump data to the console. Default: console');
argParser.addOption('p', 'private',     false, 'Display symbols marked with the @private tag. Default: false.');
argParser.addOption('r', 'recurse',     false, 'Recurse into subdirectories when scanning for source code files.');
argParser.addOption('h', 'help',        false, 'Print this message and quit.');
argParser.addOption('X', 'explain',     false, 'Dump all found doclet internals to console and quit.');
argParser.addOption('q', 'query',       true,  'Provide a querystring to define custom variable names/values to add to the options hash.');
argParser.addOption('u', 'tutorials',   true,  'Directory in which JSDoc should search for tutorials.');

//TODO [-R, recurseonly] = a number representing the depth to recurse
//TODO [-f, filter] = a regex to filter on <-- this can be better defined in the configs?

//Here are options specific to tests
argParser.addOption(null, 'verbose',    false, 'Display verbose output for tests');
argParser.addOption(null, 'match',      true,  'only run tests containing <value>', true);
argParser.addOption(null, 'coffee',     false,  'load coffee-script which allows execution .coffee files');

/**
	Set the options for this app.
	@throws {Error} Illegal arguments will throw errors.
	@param {string|String[]} args The command line arguments for this app.
 */
exports.parse = function(args) {
	args = args || [];

	if (typeof args === 'string' || args.constructor === String) {
		args = (''+args).split(/\s+/g);
	}

	ourOptions = argParser.parse(args, defaults);

	return ourOptions;
}

/**
	Display help message for options.
 */
exports.help = function() {
    return argParser.help();
}

/**
	Get a named option.
	@param {string} name The name of the option.
	@return {string} The value associated with the given name.
 *//**
	Get all the options for this app.
	@return {Object} A collection of key/values representing all the options.
 */
exports.get = function(name) {
	if (typeof name === 'undefined') {
		return ourOptions;
	}
	else {
		return ourOptions[name];
	}
}
