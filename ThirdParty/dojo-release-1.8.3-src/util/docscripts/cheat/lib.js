dojo.provide("util.docscripts.cheat.lib");
dojo.require("util.docscripts.cheat.floatup");
(function(){
	
	var api = util.docscripts.cheat.lib;
	dojo.mixin(api, {

		varmap:{
			// a map of things to prefix common things
			"dojo":"d.",
			"dojo.NodeList.prototype":"$('.nodes').",
			"dojo.keys":" ",
			"dojo.fx":"d.fx.",
			"dojo.fx.easing":"",
			"dijit._Widget.prototype":"_Widget.",
			"dijit._Templated.prototype":"_Templated.",
			"dijit.WidgetSet.prototype":"dijit.registry.",
			"dojo.Animation.prototype":"anim.",
			"dojo.Color.prototype":"color.",
			"dojo.xhrArgs":"args."
		},

		ignore:[
			// stuff to ignore:
			"keys", "NodeList", "fx", "prototype", "lib", /* AMD package module */
			
			// lifecycle stuff to hide
			"loaded", "unloaded", "loadInit", "windowUnloaded", "simulatedLoading", "floatup",
			"preamble", "WidgetSet", "registry", "inherited", "postscript",

			// dijit.WidgetSet
			"add", "remove",

			//
			"dijit", "form", "layout", "lang", "dir", "class",
			"declaredClass", "wai", "typematic", "popup",

			// dojo.Color
			"r","g","b","a"
		],

		useful_privates:[
			"_Widget", "_Templated", "_toArray"
		],

		tags: {
			dojo:{
				"Effects":[
					"anim", "animateProperty", "fadeIn", "fadeOut", "animate", "fx.chain", "fx.combine",
					"_Animation", "_Line", "Animation" /* _Animation deprecated in 1.4 */
				],

				"Ajax":[
					"xhr", "xhrGet", "xhrPost", "xhrPut", "xhrDelete", "rawXhrPut", "rawXhrPost", "contentHandlers"
				],

				"Language-Helpers":[
					"isArray", "isFunction", "isString", "isObject", "isArrayLike", "unique",
					"eval", "isAlien", "trim", "Deferred", "_toArray", "replace", "when"
				],

				"Arrays":[
					"at", "forEach", "indexOf", "map", "concat", "some", "every", "lastIndexOf",
					"qw", "filter", "splice", "slice", "end"
				],

				"Event-System":[
					"connect", "publish", "subscribe", "pub", "sub", "unsubscribe", "disconnect",
					"fixEvent", "stopEvent", "connectPublisher", "isCopyKey", "mouseButtons", "on"
				],

				"NodeList-Events":[
					"onmousedown", "onmouseenter", "onmouseleave", "onmousemove", "onmouseover",
					 "onmouseout", "onblur",
					"onfocus", "onclick", "onchange", "onload", "onmousedown", "onmouseup", "onsubmit",
					"onerror", "onkeydown", "onkeypress", "onkeyup", "hover", "on"
				],

				"NodeList-Misc":[
					"first", "last", "end", "_stash"
				],

				"Objects-OO":[
					"mixin", "declare", "extend", "delegate", "hitch", "partial", "setObject",
					"getObject", "exists", "instantiate", "safeMixin" /* ? */
				],

				"Package-System":[
					"require", "provide", "load", "requireLocalization", "requireIf", "dfdLoad",
					"moduleUrl", "requireAfterIf", "registerModulePath", "platformRequire", "isAsync"
				],

				"Document-Lifecycle":[
					"addOnLoad", "addOnUnload", "addOnWindowUnload","loaded",
					"unloaded", "loadInit",  "windowUnloaded", "ready"
				],

				"DOM-Manipulation":[
					"create", "wrap", "place", "byId", "query", "empty", "destroy", "generateId", "clone",
					"body", "append", "appendTo", "addContent", "adopt", "orphan"
				],

				"DOM-Attributes":[
					"hasAttr", "removeAttr", "position", "getNodeProp",
					"setSelectable", "isDescendant", "val", "attr", "coords", "marginBox", "contentBox"
				],

				"Colors":[
					"Color", "colorFromArray", "colorFromString", "blendColors", "colorFromRgb", "colorFromHex"
				],

				"Styles-CSS":[
					"style", "addClass", "removeClass", "toggleClass", "replaceClass", "hasClass", "getComputedStyle", "boxModel",
					"show", "hide", "toggle", "hoverClass"
				],

				"JSON":[
					"fromJson", "toJson", "toJsonIndentStr", "formToObject", "queryToObject", "formToQuery",
					"formToJson", "objectToQuery", "fieldToObject"
				],

				"Miscellaneous":[
					"experimental", "deprecated", "config", "version", "locale", "baseUrl"
				],

				"Advanced-Scope":[
					"conflict", "withDoc", "withGlobal", "setContext", "doc", "global"
				],

				"Sniffing":[
					"isBrowser", "isFF", "isKhtml", "isMoz", "isMozilla", "isIE", "isOpera", "isBrowser",
					"isQuirks", "isWebKit", "isChrome", "isSafari", "isAIR", /* new 1.4 */ "isMac"
				]
			},
			
			dijit:{
				"Widget-Development":[
					"create", "postCreate","buildRendering","inherited",
					"connect", "templateString", "templatePath", "widgetsInTemplate",
					"dojoAttachEvent", "dojoAttachPoint", "disconnect", "postMixInProperties",
					"attributeMap", "destroyRendering", "uninitialize", "_Widget", "_Templated"
				],
								
				"Dijit-Attributes":[
					"domNode", "srcNodeRef", "containerNode", "titleNode", "focusNode",
					"style", "id", "title", "defaultDuration", "nodesWithKeyClick", "defaultDuration"
				],
				
				"Widget-Access":[
					"byId", "byNode", "getEnclosingWidget", "findWidgets"
				],
				
				"Widget-Control":[
					"placeAt", "attr", "toString", "destroy", "startup", "destroyRecursive",
					"destroyDescendants", "getDescendants", "getChildren", "setAttribute",
					"placeOnScreen", "placeOnScreenAroundNode", "placeOnScreenAroundRectangle",
					"placeOnScreenAroundElement"
				],
				
				"Widget-Events":[
					"onClick", "onFocus", "onDblClick", "onKeyPress", "onMouseOver", "onBlur",
					"onKeyDown", "onKeyUp", "onMouseEnter", "onMouseLeave", "onMouseOut", "onMouseMove",
					"onMouseUp", "onMouseDown"
				],
				
				"ARIA-A11y-i18n":[
					"hasWaiRole", "getWaiRole", "setWaiRole", "hasWaiState", "removeWaiState",
					"removeWaiRole", "getWaiState", "setWaiState", "waiRole", "waiState",
					"isLeftToRight", "isFocusable", "getFocus", "isTabNavigable", "getFirstInTabbingOrder",
					"getLastInTabbingOrder", "focus"
				],
				
				"Dijit-Utils":[
					"getUniqueId", "getDocumentWindow", "getViewport", "scrollIntoView", "BackgroundIframe",
					"registerIframe", "moveToBookmark", "getBookmark", "isCollapsed", "placementRegistry",
					"registerWin"
				]
			}
		},

		getTag: function(key, part){
			part = part || "dojo";
			if(api.tags[part]){
				// summary: find the first matching function name in the tagMap
				for(var i in api.tags[part]){
					if(dojo.indexOf(api.tags[part][i], key) >= 0){
						return i;
					}
				}
			}
			return "Unknown-Tag";
		},

		getUl: function(tag){
			// find the UL within a <div> with this tag's id, or make it.
			// return the UL node
			var n = dojo.byId(tag);
			if(!n){
				var x = dojo.place("<fieldset id='" +tag+ "'><div class='box'><legend align='center'>" + api._deslash(tag) + "</legend><ul></ul></div></fieldset>", "container");
				n = dojo.query("ul", x)[0];
			}
			return n;

		},

		getSig: function(key, member, fn){
			// makup up a function signature for this object
			if(!dojo.isFunction(fn)){
//				var t = (typeof fn).toLowerCase()
//				switch(t){
//					case "boolean" :
//					case "string" :
//					case "array" :
//					case "number" :
//						member += "<span class='sig'> [" + t + "]</span>";
//						break;
//					case "object" :
//						for(var i in fn){
//							console.log(i);
//						}
//						break;
//					default:
//						console.log(t);
//						break;
//				}
				return key + member;
			}
			if(/^_?[A-Z]/.test(member)){
				key = "<span class='sig'>new</span> " + key;

// FIXME: determine the actual signature for the a declaredclass?
//				if(fn.prototype._constructor){
//					console.log(fn.prototype._constructor)
//				}
				
			}
			// FIXME: unwrap key (refactor all this) so we can link around it to API docs
			return key + member + "<span class='sig'>" + fn.toString().replace(/function\s+/, "").split(")")[0] + ")" + "</span>";
		},

		save: function(){
			dojo.xhrPost({
				url:"cheat.php",
				content: { body: dojo.body().innerHTML },
				load: function(response){
					window.location.href = "./cheat.html";
				},
				error: function(er){
					console.log("Error in saving:", er.responseText);
				}
			});
		},

		buildNav: function(){

			dojo.query("#container fieldset").forEach(function(n){

				var id = n.id;
				var mySize = dojo.query(n).query("li").length;

				dojo.place("<li><a href='#" + id + "'>" + api._deslash(id) + "</a> (" + mySize + ")</li>", "nav");

			//	console.log(mySize, n.id || n);

			}).addClass("dijitInline"); // .style("float","left");

		},
		
		addIn: function(strsomething, fs, base){
			var d = dojo, something;
			if(d.isObject(strsomething)){
				// only self referencing single-objects
				something = strsomething[strsomething];
			}else if(dojo.exists(strsomething)){
				something = dojo.getObject(strsomething);
			}
			if(!something){ return; }
			
			var k = api.varmap[strsomething] || (strsomething + ".");
			for(var i in something){
				if( (!i.match(/^_/) || dojo.indexOf(api.useful_privates, i) >= 0) && dojo.indexOf(api.ignore, i) == -1 ){
					var ul = fs || api.getUl(api.getTag(i, base));
					dojo.place("<li>" + api.getSig(k, i, something[i]) + "</li>", ul);
				}
			
			}

		},

		_deslash: function(str){
			return str.replace(/-/g, " ");
		},
		
		sortFields: function(id){
			dojo.query("#" + id).floatup();
		},
		
		hasTag: function(tag){
			return window.location.href.indexOf(tag) >= 0;
		}

	});

})();
