/*******************************************************************************
 * @license
 * Copyright (c) 2012 VMware, Inc. All Rights Reserved.
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors:
 *     Andy Clement (VMware) - initial API and implementation
 *     Andrew Eisenberg (VMware) - implemented visitor pattern
 ******************************************************************************/

/*global define */
define("plugins/esprima/proposalUtils", {
	/**
	 * Match ignoring case and checking camel case.
	 * @param prefix
	 * @param target
	 * @return
	 */
	looselyMatches: function(prefix, target) {
		if (target === null || prefix === null) {
			return false;
		}

		// Zero length string matches everything.
		if (prefix.length === 0) {
			return true;
		}

		// Exclude a bunch right away
		if (prefix.charAt(0).toLowerCase() !== target.charAt(0).toLowerCase()) {
			return false;
		}

		if (this.startsWith(target, prefix)) {
			return true;
		}

		var lowerCase = target.toLowerCase();
		if (this.startsWith(lowerCase, prefix)) {
			return true;
		}

		// Test for camel characters in the prefix.
		if (prefix === prefix.toLowerCase()) {
			return false;
		}

		var prefixParts = this.toCamelCaseParts(prefix);
		var targetParts = this.toCamelCaseParts(target);

		if (prefixParts.length > targetParts.length) {
			return false;
		}

		for (var i = 0; i < prefixParts.length; ++i) {
			if (!this.startsWith(targetParts[i], prefixParts[i])) {
				return false;
			}
		}

		return true;
	},

	/**
	 * Convert an input string into parts delimited by upper case characters. Used for camel case matches.
	 * e.g. GroClaL = ['Gro','Cla','L'] to match say 'GroovyClassLoader'.
	 * e.g. mA = ['m','A']
	 * @param String str
	 * @return Array.<String>
	 */
	toCamelCaseParts: function(str) {
		var parts = [];
		for (var i = str.length - 1; i >= 0; --i) {
			if (this.isUpperCase(str.charAt(i))) {
				parts.push(str.substring(i));
				str = str.substring(0, i);
			}
		}
		if (str.length !== 0) {
			parts.push(str);
		}
		return parts.reverse();
	},

	startsWith : function(str, start) {
		return str.substr(0, start.length) === start;
	},
	
	isUpperCase : function(char) {
		return char >= 'A' && char <= 'Z';
	},
	
	repeatChar : function(char, times) {
		var str = "";
		for (var i = 0; i < times; i++) {
			str += char;
		}
		return str;
	}
});
