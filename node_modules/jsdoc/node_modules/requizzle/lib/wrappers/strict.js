/*
	Copyright (c) 2014 Google Inc. All rights reserved.

	Use of this source code is governed by the MIT License, available in this package's LICENSE file
	or at http://opensource.org/licenses/MIT.
 */
'use strict';

exports.before = function before() {
	return '"use strict";';
};

exports.after = function after() {
	return '';
};
