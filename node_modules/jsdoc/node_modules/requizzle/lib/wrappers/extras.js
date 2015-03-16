/*
	Copyright (c) 2014 Google Inc. All rights reserved.

	Use of this source code is governed by the MIT License, available in this package's LICENSE file
	or at http://opensource.org/licenses/MIT.
 */
'use strict';

function callFunction(targetPath, parentModule, func) {
	if (!func) {
		return '';
	}

	return func(targetPath, parentModule);
}

exports.before = function before(targetPath, parentModule, options) {
	return callFunction(targetPath, parentModule, options.before);
};

exports.after = function after(targetPath, parentModule, options) {
	return callFunction(targetPath, parentModule, options.after);
};
