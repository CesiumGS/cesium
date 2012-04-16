/**
	Parse the command line arguments.
	@module common/args
	@author Michael Mathews <micmath@gmail.com>
	@license Apache License 2.0 - See file 'LICENSE.md' in this project.
 */
(function() {

	/**
		Create an instance of the parser.
		@classdesc A parser to interpret the key value pairs entered on the command
		line.
		@constructor
	 */
	exports.ArgParser = function() {
		this._options = [];
	}
	
	exports.ArgParser.prototype._getOptionByShortName = function(name) {
		for (var i = this._options.length; i--;) {
			if (this._options[i].shortName === name) { return this._options[i]; }
		}
		return null;
	}
	
	exports.ArgParser.prototype._getOptionByLongName = function(name) {
		for (var i = this._options.length; i--;) {
			if (this._options[i].longName === name) { return this._options[i]; }
		}
		return null;
	}
	
	/**
	 * Provide information about a legal option.
	 * @param {character} shortName The short name of the option, entered like: -T.
	 * @param {string}    longName The equivalent long name of the option, entered like: --test.
	 * @param {boolean}   hasValue Does this option require a value? Like: -t templatename
	 * @param {string}    helpText
	 * @example
	 * myParser.addOption('t', 'template', true, 'The path to the template.');
	 * myParser.addOption('h', 'help', false, 'Show the help message.');
	 */
	exports.ArgParser.prototype.addOption = function(shortName, longName, hasValue, helpText) {
 		this._options.push({shortName: shortName, longName: longName, hasValue: hasValue, helpText: helpText});
 	};
 	
 	/**
 		Generate a summary of all the options with corresponding help text.
 		@returns {string}
 	 */
 	exports.ArgParser.prototype.help = function() {
 		var help = 'OPTIONS:\n',
 			option;
 		
 		for (var i = 0, leni = this._options.length; i < leni; i++) {
 			option = this._options[i];
 			
 			if (option.shortName) {
 				help += '-' + option.shortName + (option.longName? ' or ' : '');
 			}
 			
			if (option.longName) {
 				help += '--' + option.longName;
 			}
			
			if (option.hasValue)  {
				help += ' <value>';
			}
			
			help += ' ' + option.helpText + '\n';
		}
		
		return help;
 	};
	
	/**
		Get the options.
		@param {Array.<string>} args An array, like ['-x', 'hello']
		@param {Object} [defaults={}] An optional collection of default values.
		@returns {Object} The keys will be the longNames, or the shortName if
		no longName is defined for that option. The values will be the values
		provided, or `true` if the option accepts no value.
	 */
	exports.ArgParser.prototype.parse = function(args, defaults) {
 		var result = defaults || {};
 		
 		result._ = [];
 		
 		for (var i = 0, leni = args.length; i < leni; i++) {
 			var arg = '' + args[i],
 				next = (i < leni-1)? '' + args[i+1] : null,
 				option,
 				shortName,
 				longName,
 				name,
 				value = null;
 			
 			// like -t
 			if (arg.charAt(0) === '-') {
 			
 				// like: --template
 				if (arg.charAt(1) === '-') {
 					name = longName = arg.slice(2);
 					option = this._getOptionByLongName(longName);
 				}
 				else {
 					name = shortName = arg.slice(1);
 					option = this._getOptionByShortName(shortName);
 				}
 				
 				if (option === null) {
					throw new Error( 'Unknown command line option found: ' + name );
				}
				
				if (option.hasValue) {
					value = next;
					i++;
				
					if (value === null || value.charAt(0) === '-') {
						throw new Error( 'Command line option requires a value: ' + name );
					}
				}
				else {
					value = true;
				}
 				
 				if (option.longName && shortName) {
 					name = option.longName;
 				}
 				
 				result[name] = value;
 			}
 			else {
 				result._.push(arg);
 			}
 		}
 		
		return result;
	}
})();