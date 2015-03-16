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
 *     Andrew Eisenberg (VMware) - initial API and implementation
 ******************************************************************************/

/*global define esprima */
define("plugins/esprima/esprimaVisitor", function(scriptedLogger) {



	return {
	
		/**
		 * parses the contents with options that are appropriate for inferencing
		 */
		parse : function(contents, extraOptions) {
			if (!extraOptions) {
				extraOptions = {};
			}
			if (!extraOptions.range) {
				extraOptions.range = true;
			}
			if (!extraOptions.tolerant) {
				extraOptions.tolerant = true;
			}
			if (!extraOptions.comment) {
				extraOptions.comment = true;
			}
			try {
				var parsedProgram = esprima.parse(contents, extraOptions);
				return parsedProgram;
			} catch (e) {
				if (typeof scriptedLogger !== "undefined") {
					scriptedLogger.warn("Problem parsing file", "CONTENT_ASSIST");
					scriptedLogger.warn(e.message, "CONTENT_ASSIST");
					scriptedLogger.warn(e.stack, "CONTENT_ASSIST");
				}
				return null;
			}
		},

		/**
		 * Generic AST visitor.  Visits all children in source order, if they have a range property.
		 *
		 * @param node The AST node to visit
		 * @param {rhsVisit:Boolean,...} context any extra data required to pass between operations.  Set rhsVisit to true if the rhs of
		 * assignments and variable declarators should be visited before the lhs
		 * @param operation function(node, context, [isInitialOp]) an operation on the AST node and the data.  Return falsy if
		 * the visit should no longer continue. Return truthy to continue.
		 * @param [postoperation] (optional) function(node, context, [isInitialOp]) an operation that is exectuted after visiting the current node's children.
		 * will only be invoked if operation returns true for the current node
		 */
		visit: function(node, context, operation, postoperation) {
			var i, key, child, children;

			if (operation(node, context, true)) {
				// gather children to visit
				children = [];
				for (key in node) {
					if (key !== "range" && key !== "errors" && key !== "target" && key !== "extras" && key !== "comments") {
						child = node[key];
						if (child instanceof Array) {
							for (i = 0; i < child.length; i++) {
								if (child[i] && child[i].hasOwnProperty("type")) {
									children.push(child[i]);
								} else if (key === "properties") {
									// might be key-value pair of an object expression
									// in old versions of the parser, the 'properties' property did not have a 'type' or a 'range'
									// so we must explicitly visit the children here.
									// in new versions of the parser, this is fixed, and this branch will never be taken.
									if (child[i].hasOwnProperty("key") && child[i].hasOwnProperty("value")) {
										children.push(child[i].key);
										children.push(child[i].value);
									}
								}
							}
						} else {
							if (child && child.hasOwnProperty("type")) {
								children.push(child);
							}
						}
					}
				}

				if (children.length > 0) {
					// sort children by source location
					// children with no source location are visited first
					children.sort(function(left, right) {
						if (left.range && right.range) {
							return left.range[0] - right.range[0];
						} else if (left.range) {
							return 1;
						} else if (right.range) {
							return -1;
						} else {
							return 0;
						}
					});

					// visit children in order
					for (i = 0; i < children.length; i++) {
						this.visit(children[i], context, operation, postoperation);
					}
				}
				if (postoperation) {
					postoperation(node, context, false);
				}
			}
		}
	};
});
