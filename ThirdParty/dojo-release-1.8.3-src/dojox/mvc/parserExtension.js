define([
	"require",
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojo/has!dojo-parser?:dojo/_base/window",
	"dojo/has",
	"dojo/has!dojo-mobile-parser?:dojo/parser",
	"dojo/has!dojo-parser?:dojox/mobile/parser",
	"dojox/mvc/_atBindingMixin",
	"dojox/mvc/Element"
], function(require, kernel, lang, win, has, parser, mobileParser, _atBindingMixin){

	// module:
	//		dojox/mvc/parserExtension
	// summary:
	//		A extension of Dojo parser that allows data binding without specifying data-dojo-type.

	has.add("dom-qsa", !!document.createElement("div").querySelectorAll);
	try{ has.add("dojo-parser", !!require("dojo/parser"));  }catch(e){}
	try{ has.add("dojo-mobile-parser", !!require("dojox/mobile/parser")); }catch(e){}

	if(has("dojo-parser")){
		var oldScan = parser.scan;

		parser.scan = function(/*DOMNode?*/ root, /*Object*/ options){
			// summary:
			//		Find list of DOM nodes that has data-dojo-bind, but not data-dojo-type.
			//		And add them to list of DOM nodes to instantiate widget (dojox/mvc/Element).

			return oldScan.apply(this, lang._toArray(arguments)).then(function(list){
				var dojoType = (options.scope || kernel._scopeName) + "Type",			// typically "dojoType"
				 attrData = "data-" + (options.scope || kernel._scopeName) + "-",	// typically "data-dojo-"
				 dataDojoType = attrData + "type";									// typically "data-dojo-type"

				for(var nodes = has("dom-qsa") ? root.querySelectorAll("[" + _atBindingMixin.prototype.dataBindAttr + "]") : root.getElementsByTagName("*"), i = 0, l = nodes.length; i < l; i++){
					var node = nodes[i], foundBindingInAttribs = false;
					if(!node.getAttribute(dataDojoType) && !node.getAttribute(dojoType) && node.getAttribute(_atBindingMixin.prototype.dataBindAttr)){
						list.push({
							types: ["dojox/mvc/Element"],
							node: node
						});
					}
				}

				return list;
			});
		};
	}

	if(has("dojo-mobile-parser")){
		var oldParse = mobileParser.parse;

		mobileParser.parse = function(/*DOMNode?*/ root, /*Object*/ options){
			// summary:
			//		Find list of DOM nodes that has data-dojo-bind, but not data-dojo-type.
			//		Set dojox/mvc/Element to their data-dojo-type.

			var dojoType = ((options || {}).scope || kernel._scopeName) + "Type",		// typically "dojoType"
			 attrData = "data-" + ((options || {}).scope || kernel._scopeName) + "-",	// typically "data-dojo-"
			 dataDojoType = attrData + "type";											// typically "data-dojo-type"
			 nodes = has("dom-qsa") ? (root || win.body()).querySelectorAll("[" + _atBindingMixin.prototype.dataBindAttr + "]") : (root || win.body()).getElementsByTagName("*");

			for(var i = 0, l = nodes.length; i < l; i++){
				var node = nodes[i], foundBindingInAttribs = false, bindingsInAttribs = [];
				if(!node.getAttribute(dataDojoType) && !node.getAttribute(dojoType) && node.getAttribute(_atBindingMixin.prototype.dataBindAttr)){
					node.setAttribute(dataDojoType, "dojox/mvc/Element");
				}
			}

			return oldParse.apply(this, lang._toArray(arguments));
		};
	}

	return parser || mobileParser;
});
