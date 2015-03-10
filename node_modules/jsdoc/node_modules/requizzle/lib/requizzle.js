/*
	Copyright (c) 2014 Google Inc. All rights reserved.
	Copyright (c) 2012-2013 Johannes Ewald.

	Use of this source code is governed by the MIT License, available in this package's LICENSE file
	or at http://opensource.org/licenses/MIT.
 */
'use strict';

/** @module lib/requizzle */

var _ = require('underscore');
var loader = require('./loader');
var Module = require('module');
var path = require('path');

/**
 * Function that returns text to swizzle into the module.
 *
 * @typedef module:lib/requizzle~wrapperFunction
 * @type {function}
 * @param {string} targetPath - The path to the target module.
 * @param {string} parentModulePath - The path to the module that is requiring the target module.
 * @return {string} The text to insert before or after the module's source code.
 */

/**
 * Options for the wrappers that will be swizzled into the target module.
 *
 * @typedef module:lib/requizzle~options
 * @type {Object}
 * @property {Object=} options.extras - Functions that generate text to swizzle into the target
 * module.
 * @property {module:lib/requizzle~wrapperFunction} options.extras.after - Function that returns
 * text to insert after the module's source code.
 * @property {module:lib/requizzle~wrapperFunction} options.extras.before - Function that returns
 * text to insert before the module's source code.
 * @property {(Array.<string>|string)} options.requirePaths - Additional paths to search when
 * resolving module paths in the target module.
 */

function isNativeModule(targetPath, parentModule) {
	var lookupPaths = Module._resolveLookupPaths(targetPath, parentModule);

	if (lookupPaths[0] === targetPath && lookupPaths[1].length === 0) {
		return true;
	}

	return false;
}

/**
 * Create a `Requizzle` instance. If you provide options, Requizzle will default to those options
 * when you call {@link Requizzle#requizzle}.
 *
 * @class
 * @param {!module:lib/requizzle~options} options - Options for the wrappers that will be swizzled
 * into the target module.
 * @param {Object=} cache - For internal use.
 */
function Requizzle(options, cache) {
	this._options = options;
	this._cache = cache || {
		module: {},
		source: {}
	};
}

/**
 * Load the module, swizzling in the requested changes.
 *
 * @param {!string} targetPath - The path to the module that will be loaded.
 * @return {Module} The swizzled module.
 */
Requizzle.prototype.requizzle = function requizzle(targetPath) {
	var options = this._options;
	var parentModule = options.parent;
	var targetModule;
	var wrapper;

	// Don't interfere with native modules
	if (isNativeModule(targetPath, parentModule)) {
		return require(targetPath);
	}

	// Resolve the filename relative to the parent module
	targetPath = Module._resolveFilename(targetPath, parentModule);

	wrapper = loader.createWrapper(targetPath, parentModule, this._cache, this._options);
	targetModule = loader.load(targetPath, parentModule, wrapper, this._cache, this._options);

	return targetModule.exports;
};

module.exports = Requizzle;
