define(["../has", "../_base/kernel"], function(has, dojo){
"use strict";

var testDiv = document.createElement("div");
var matchesSelector = testDiv.matches || testDiv.webkitMatchesSelector || testDiv.mozMatchesSelector || testDiv.msMatchesSelector || testDiv.oMatchesSelector;
var querySelectorAll = testDiv.querySelectorAll;
var unionSplit = /([^\s,](?:"(?:\\.|[^"])+"|'(?:\\.|[^'])+'|[^,])*)/g;
has.add("dom-matches-selector", !!matchesSelector);
has.add("dom-qsa", !!querySelectorAll); 

// this is a simple query engine. It has handles basic selectors, and for simple
// common selectors is extremely fast
var liteEngine = function(selector, root){
	// summary:
	//		A small lightweight query selector engine that implements CSS2.1 selectors
	//		minus pseudo-classes and the sibling combinator, plus CSS3 attribute selectors

	if(combine && selector.indexOf(',') > -1){
		return combine(selector, root);
	}
	// use the root's ownerDocument if provided, otherwise try to use dojo.doc. Note 
	// that we don't use dojo/_base/window's doc to reduce dependencies, and 
	// fallback to plain document if dojo.doc hasn't been defined (by dojo/_base/window).
	// presumably we will have a better way to do this in 2.0 
	var doc = root ? root.ownerDocument || root : dojo.doc || document, 
		match = (querySelectorAll ? 
			/^([\w]*)#([\w\-]+$)|^(\.)([\w\-\*]+$)|^(\w+$)/ : // this one only matches on simple queries where we can beat qSA with specific methods
			/^([\w]*)#([\w\-]+)(?:\s+(.*))?$|(?:^|(>|.+\s+))([\w\-\*]+)(\S*$)/) // this one matches parts of the query that we can use to speed up manual filtering
			.exec(selector);
	root = root || doc;
	if(match){
		// fast path regardless of whether or not querySelectorAll exists
		if(match[2]){
			// an #id
			// use dojo.byId if available as it fixes the id retrieval in IE, note that we can't use the dojo namespace in 2.0, but if there is a conditional module use, we will use that
			var found = dojo.byId ? dojo.byId(match[2], doc) : doc.getElementById(match[2]);
			if(!found || (match[1] && match[1] != found.tagName.toLowerCase())){
				// if there is a tag qualifer and it doesn't match, no matches
				return [];
			}
			if(root != doc){
				// there is a root element, make sure we are a child of it
				var parent = found;
				while(parent != root){
					parent = parent.parentNode;
					if(!parent){
						return [];
					}
				}
			}
			return match[3] ?
					liteEngine(match[3], found) 
					: [found];
		}
		if(match[3] && root.getElementsByClassName){
			// a .class
			return root.getElementsByClassName(match[4]);
		}
		var found;
		if(match[5]){
			// a tag
			found = root.getElementsByTagName(match[5]);
			if(match[4] || match[6]){
				selector = (match[4] || "") + match[6];
			}else{
				// that was the entirety of the query, return results
				return found;
			}
		}
	}
	if(querySelectorAll){
		// qSA works strangely on Element-rooted queries
		// We can work around this by specifying an extra ID on the root
		// and working up from there (Thanks to Andrew Dupont for the technique)
		// IE 8 doesn't work on object elements
		if (root.nodeType === 1 && root.nodeName.toLowerCase() !== "object"){				
			return useRoot(root, selector, root.querySelectorAll);
		}else{
			// we can use the native qSA
			return root.querySelectorAll(selector);
		}
	}else if(!found){
		// search all children and then filter
		found = root.getElementsByTagName("*");
	}
	// now we filter the nodes that were found using the matchesSelector
	var results = [];
	for(var i = 0, l = found.length; i < l; i++){
		var node = found[i];
		if(node.nodeType == 1 && jsMatchesSelector(node, selector, root)){
			// keep the nodes that match the selector
			results.push(node);
		}
	}
	return results;
};
var useRoot = function(context, query, method){
	// this function creates a temporary id so we can do rooted qSA queries, this is taken from sizzle
	var oldContext = context,
		old = context.getAttribute("id"),
		nid = old || "__dojo__",
		hasParent = context.parentNode,
		relativeHierarchySelector = /^\s*[+~]/.test(query);

	if(relativeHierarchySelector && !hasParent){
		return [];
	}
	if(!old){
		context.setAttribute("id", nid);
	}else{
		nid = nid.replace(/'/g, "\\$&");
	}
	if(relativeHierarchySelector && hasParent){
		context = context.parentNode;
	}
	var selectors = query.match(unionSplit);
	for(var i = 0; i < selectors.length; i++){
		selectors[i] = "[id='" + nid + "'] " + selectors[i];
	}
	query = selectors.join(",");

	try{
		return method.call(context, query);
	}finally{
		if(!old){
			oldContext.removeAttribute("id");
		}
	}
};

if(!has("dom-matches-selector")){
	var jsMatchesSelector = (function(){
		// a JS implementation of CSS selector matching, first we start with the various handlers
		var caseFix = testDiv.tagName == "div" ? "toLowerCase" : "toUpperCase";
		var selectorTypes = {
			"": function(tagName){
				tagName = tagName[caseFix]();
				return function(node){
					return node.tagName == tagName;
				};
			},
			".": function(className){
				var classNameSpaced = ' ' + className + ' ';
				return function(node){
					return node.className.indexOf(className) > -1 && (' ' + node.className + ' ').indexOf(classNameSpaced) > -1;
				};
			},
			"#": function(id){
				return function(node){
					return node.id == id;
				};
			}
		};
		var attrComparators = {
			"^=": function(attrValue, value){
				return attrValue.indexOf(value) == 0;
			},
			"*=": function(attrValue, value){
				return attrValue.indexOf(value) > -1;
			},
			"$=": function(attrValue, value){
				return attrValue.substring(attrValue.length - value.length, attrValue.length) == value;
			},
			"~=": function(attrValue, value){
				return (' ' + attrValue + ' ').indexOf(' ' + value + ' ') > -1;
			},
			"|=": function(attrValue, value){
				return (attrValue + '-').indexOf(value + '-') == 0;
			},
			"=": function(attrValue, value){
				return attrValue == value;
			},
			"": function(attrValue, value){
				return true;
			}
		};
		function attr(name, value, type){
			var firstChar = value.charAt(0);
			if(firstChar == '"' || firstChar == "'"){
				// it is quoted, remove the quotes
				value = value.slice(1, -1);
			}
			value = value.replace(/\\/g,'');
			var comparator = attrComparators[type || ""];
			return function(node){
				var attrValue = node.getAttribute(name);
				return attrValue && comparator(attrValue, value);
			};
		}
		function ancestor(matcher){
			return function(node, root){
				while((node = node.parentNode) != root){
					if(matcher(node, root)){
						return true;
					}
				}
			};
		}
		function parent(matcher){
			return function(node, root){
				node = node.parentNode;
				return matcher ? 
					node != root && matcher(node, root)
					: node == root;
			};
		}
		var cache = {};
		function and(matcher, next){
			return matcher ?
				function(node, root){
					return next(node) && matcher(node, root);
				}
				: next;
		}
		return function(node, selector, root){
			// this returns true or false based on if the node matches the selector (optionally within the given root)
			var matcher = cache[selector]; // check to see if we have created a matcher function for the given selector
			if(!matcher){
				// create a matcher function for the given selector
				// parse the selectors
				if(selector.replace(/(?:\s*([> ])\s*)|(#|\.)?((?:\\.|[\w-])+)|\[\s*([\w-]+)\s*(.?=)?\s*("(?:\\.|[^"])+"|'(?:\\.|[^'])+'|(?:\\.|[^\]])*)\s*\]/g, function(t, combinator, type, value, attrName, attrType, attrValue){
					if(value){
						matcher = and(matcher, selectorTypes[type || ""](value.replace(/\\/g, '')));
					}
					else if(combinator){
						matcher = (combinator == " " ? ancestor : parent)(matcher);
					}
					else if(attrName){
						matcher = and(matcher, attr(attrName, attrValue, attrType));
					}
					return "";
				})){
					throw new Error("Syntax error in query");
				}
				if(!matcher){
					return true;
				}
				cache[selector] = matcher;
			}
			// now run the matcher function on the node
			return matcher(node, root);
		};
	})();
}
if(!has("dom-qsa")){
	var combine = function(selector, root){
		// combined queries
		var selectors = selector.match(unionSplit);
		var indexed = [];
		// add all results and keep unique ones, this only runs in IE, so we take advantage 
		// of known IE features, particularly sourceIndex which is unique and allows us to 
		// order the results 
		for(var i = 0; i < selectors.length; i++){
			selector = new String(selectors[i].replace(/\s*$/,''));
			selector.indexOf = escape; // keep it from recursively entering combine
			var results = liteEngine(selector, root);
			for(var j = 0, l = results.length; j < l; j++){
				var node = results[j];
				indexed[node.sourceIndex] = node;
			}
		}
		// now convert from a sparse array to a dense array
		var totalResults = [];
		for(i in indexed){
			totalResults.push(indexed[i]);
		}
		return totalResults;
	};
}

liteEngine.match = matchesSelector ? function(node, selector, root){
	if(root && root.nodeType != 9){
		// doesn't support three args, use rooted id trick
		return useRoot(root, selector, function(query){
			return matchesSelector.call(node, query);
		});
	}
	// we have a native matchesSelector, use that
	return matchesSelector.call(node, selector);
} : jsMatchesSelector; // otherwise use the JS matches impl

return liteEngine;
});
