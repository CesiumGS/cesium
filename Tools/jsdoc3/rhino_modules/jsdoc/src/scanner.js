/**
	@module jsdoc/src/scanner
	@requires module:common/fs
	
	@author Michael Mathews <micmath@gmail.com>
	@license Apache License 2.0 - See file 'LICENSE.md' in this project.
 */


var common = {
	mixin: require('common/util').mixin,
	events: require('common/events')
};

var fs = require('fs');

/**
    @constructor
    @mixes module:common.events
 */
exports.Scanner = function() {
}
common.mixin(exports.Scanner.prototype, common.events);

/**
	Recursively searches the given searchPaths for js files.
	@param {Array.<string>} searchPaths
	@param {number} [depth=1]
	@fires sourceFileFound
 */
exports.Scanner.prototype.scan = function(searchPaths, depth, includeMatch, excludeMatch) {
	var filePaths = [],
	    that = this;

	searchPaths = searchPaths || [];
	depth = depth || 1;

	searchPaths.forEach(function($) {
        if ( fs.stat($).isFile() ) {
            filePaths.push($);
        }
        else {
		    filePaths = filePaths.concat(fs.ls($, depth));
		}
	});
	
	filePaths = filePaths.filter(function($) {
	    if (includeMatch && !includeMatch.test($)) {
	        return false
	    }
	    
	    if (excludeMatch && excludeMatch.test($)) {
	        return false
	    }
	    
	    return true;
	});
	
	filePaths = filePaths.filter(function($) {
	    var e = { fileName: $ };
        that.fire('sourceFileFound', e);
	    
	    return !e.defaultPrevented;
	});

	return filePaths;
}

