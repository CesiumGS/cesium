/*
	Copyright (c) 2014 Google Inc. All rights reserved.

	Use of this source code is governed by the MIT License, available in this package's LICENSE file
	or at http://opensource.org/licenses/MIT.
 */
'use strict';

var path = require('path');

function resolvePaths(parentModule, paths) {
	if (!paths) {
		return [];
	}

	return paths.slice(0).map(function(p) {
		return path.resolve(parentModule.filepath, p);
	});
}

function requirePaths(parentModule, opts) {
	var result = {
		before: [],
		after: []
	};

	if (!parentModule) {
		return result;
	}

	if (Array.isArray(opts)) {
		result.before = resolvePaths(parentModule, opts);
	} else {
		result.before = resolvePaths(parentModule, opts.before);
		result.after = resolvePaths(parentModule, opts.after);
	}

	return result;
}

exports.before = function before(targetPath, parentModule, opts) {
	var resolvedPaths = requirePaths(parentModule, opts);
	return 'module.paths = ' + JSON.stringify(resolvedPaths.before) + '.concat(module.paths)' +
		'.concat(' + JSON.stringify(resolvedPaths.after) + '); ';
};

exports.after = function after(targetPath, parentModule, opts) {
	return '';
};
