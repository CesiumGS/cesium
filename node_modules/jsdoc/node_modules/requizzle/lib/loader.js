/*
	Copyright (c) 2014 Google Inc. All rights reserved.
	Copyright (c) 2012-2013 Johannes Ewald.

	Use of this source code is governed by the MIT License, available in this package's LICENSE file
	or at http://opensource.org/licenses/MIT.
 */
'use strict';

var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var Module = require('module');

var originalWrapper = Module.wrapper.slice(0);
var requizzleWrappers = {
	extras: require('./wrappers/extras'),
	requirePaths: require('./wrappers/requirepaths'),
	strict: require('./wrappers/strict')
};

function wrap(wrappers, script) {
	return wrappers[0] + script + wrappers[1];
}

function replaceWrapper(wrapperObj) {
	var joiner = '\n';
	var before = wrapperObj.before.join(joiner);
	var after = wrapperObj.after.join(joiner);
	var wrappers = [
		originalWrapper[0] + before,
		after + originalWrapper[1]
	];

	Module.wrap = wrap.bind(null, wrappers);
}

function restoreWrapper() {
	Module.wrap = wrap.bind(null, originalWrapper);
}

function createModule(targetPath, parentModule, moduleCache) {
	moduleCache[targetPath] = moduleCache[targetPath] || new Module(targetPath, parentModule);

	return moduleCache[targetPath];
}

/**
 * Wrapper for `require()` to prevent the target module's dependencies from being swizzled.
 *
 * @param {!Module} targetModule - The module that is being swizzled.
 * @param {!function} nodeRequire - The original `require()` method for the target module.
 * @param {!string} filepath - The value passed to `require()`.
 * @return {!Module} The requested module dependency.
 */
function requireProxy(targetModule, nodeRequire, filepath) {
	restoreWrapper();
	targetModule.require = nodeRequire;

	return nodeRequire.call(targetModule, filepath);
}

/**
 * Wrapper for `require()` to swizzle the target module's dependencies, using the same settings as
 * the target module.
 *
 * @param {!Module} targetModule - The module that is being swizzled.
 * @param {!Object} opts - The Requizzle options object.
 * @param {!string} filepath - The value passed to `require()`.
 * @return {!Module} The requested module dependency.
 */
function infectProxy(targetModule, cache, opts, filepath) {
	var moduleExports;
	// loaded here to avoid circular dependencies
	var Requizzle = require('./requizzle');
	var requizzle;

	opts = _.clone(opts);
	opts.parent = targetModule;
	requizzle = new Requizzle(opts, cache);

	moduleExports = requizzle.requizzle(filepath);

	return moduleExports;
}

var load = exports.load = function load(targetPath, parentModule, wrapper, cache, options) {
	var nodeRequire;
	var targetModule;

	// Handle circular requires, and avoid reloading modules unnecessarily
	if (cache.module[targetPath]) {
		return cache.module[targetPath];
	}

	targetModule = createModule(targetPath, parentModule, cache.module);
	nodeRequire = targetModule.require;

	if (options.infect) {
		targetModule.require = function(filepath) {
			return infectProxy(targetModule, cache, options, filepath);
		};
	} else {
		targetModule.require = function(filepath) {
			return requireProxy(targetModule, nodeRequire, filepath);
		};
	}

	// update the wrapper before we load the target module
	replaceWrapper(wrapper);

	targetModule.load(targetModule.id);

	// make sure the wrapper is restored even if the target module doesn't load any dependencies
	restoreWrapper();

	return targetModule;
};

/**
 * Check whether the entire module includes a `'use strict'` declaration.
 *
 * @param {string} src - The source file to check.
 * @return {boolean} Set to `true` if the module includes a `use strict` declaration.
 */
function detectStrictMode(src) {
	return (/^\s*(?:["']use strict["'])[ \t]*(?:[\r\n]|;)/g).test(src);
}

function loadSource(targetPath, sourceCache) {
	if (sourceCache[targetPath] === undefined) {
		sourceCache[targetPath] = fs.readFileSync(targetPath, 'utf8');
	}

	return sourceCache[targetPath];
}

exports.createWrapper = function createWrapper(targetPath, parentModule, cache, options) {
	var src;
	var wrapperObject = {
		before: [],
		after: []
	};

	function add(wrapperFunctions, opts) {
		var params = [targetPath, parentModule, opts];

		['before', 'after'].forEach(function(item) {
			var result = wrapperFunctions[item].apply(null, params);

			if (result) {
				wrapperObject[item].push(result);
			}
		});
	}

	// Preserve the module's `use strict` declaration if present
	src = loadSource(targetPath, cache.source);
	if (detectStrictMode(src) === true) {
		add(requizzleWrappers.strict);
	}

	if (options.requirePaths) {
		add(requizzleWrappers.requirePaths, options.requirePaths);
	}

	if (options.extras) {
		add(requizzleWrappers.extras, options.extras);
	}

	return wrapperObject;
};
