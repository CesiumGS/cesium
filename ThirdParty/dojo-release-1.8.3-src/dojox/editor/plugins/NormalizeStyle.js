define([
	"dojo",
	"dijit",
	"dojox",
	"dijit/_editor/_Plugin",
	"dijit/_editor/html",
	"dojo/_base/connect",
	"dojo/_base/declare"
], function(dojo, dijit, dojox, _Plugin, editorHtml) {

dojo.declare("dojox.editor.plugins.NormalizeStyle", _Plugin,{
	// summary:
	//		This plugin provides NormalizeStyle capability to the editor.  It is
	//		a headless plugin that tries to normalize how content is styled when
	//		it comes out of th editor ('b' or css).   It also auto-converts
	//		incoming content to the proper one expected by the browser as well so
	//		that the native styling buttons work.

	// mode: [public] String
	//		A String variable indicating if it should use semantic tags 'b', 'i', etc, or
	//		CSS styling.  The default is semantic.
	mode: "semantic",

	// condenseSpans: [public] Boolean
	//		A boolean variable indicating if it should try to condense
	//		'span''span''span' styles  when in css mode
	//		The default is true, it will try to combine where it can.
	condenseSpans: true,

	setEditor: function(editor){
		// summary:
		//		Over-ride for the setting of the editor.
		// editor: Object
		//		The editor to configure for this plugin to use.
		this.editor = editor;
		editor.customUndo = true;

		if(this.mode === "semantic"){
			this.editor.contentDomPostFilters.push(dojo.hitch(this, this._convertToSemantic));
		}else if(this.mode === "css"){
			this.editor.contentDomPostFilters.push(dojo.hitch(this, this._convertToCss));
		}

		// Pre DOM filters are usually based on what browser, as they all use different ways to
		// apply styles with actions and modify them.
		if(dojo.isIE){
			// IE still uses semantic tags most of the time, so convert to that.
			this.editor.contentDomPreFilters.push(dojo.hitch(this, this._convertToSemantic));
			this._browserFilter = this._convertToSemantic;
		}else if(dojo.isWebKit){
			this.editor.contentDomPreFilters.push(dojo.hitch(this, this._convertToCss));
			this._browserFilter = this._convertToCss;
		}else if(dojo.isMoz){
			//Editor currently forces Moz into semantic mode, so we need to match.  Ideally
			//editor could get rid of that and just use CSS mode, which would work cleaner
			//That's why this is split out, to make it easy to change later.
			this.editor.contentDomPreFilters.push(dojo.hitch(this, this._convertToSemantic));
			this._browserFilter = this._convertToSemantic;
		}else{
			this.editor.contentDomPreFilters.push(dojo.hitch(this, this._convertToSemantic));
			this._browserFilter = this._convertToSemantic;
		}

		// Set up the inserthtml impl over-ride.  This catches semi-paste events and
		// tries to normalize them too.
		if(this.editor._inserthtmlImpl){
			this.editor._oldInsertHtmlImpl = this.editor._inserthtmlImpl;
		}
		this.editor._inserthtmlImpl = dojo.hitch(this, this._inserthtmlImpl);
	},

	_convertToSemantic: function(node){
		// summary:
		//		A function to convert the HTML structure of 'node' into
		//		semantic tags where possible.
		// node: DOMNode
		//		The node to process.
		// tags:
		//		private
		if(node){
			var doc = this.editor.document;
			var self = this;
			var convertNode = function(cNode){
				if(cNode.nodeType == 1){
					if(cNode.id !== "dijitEditorBody"){
						var style = cNode.style;
						var tag = cNode.tagName?cNode.tagName.toLowerCase():"";
						var sTag;
						if(style && tag != "table" && tag != "ul" && tag != "ol"){
							// Avoid wrapper blocks that have specific underlying structure, as injecting
							// spans/etc there is invalid.
							// Lets check and convert certain node/style types.
							var fw = style.fontWeight? style.fontWeight.toLowerCase() : "";
							var fs = style.fontStyle? style.fontStyle.toLowerCase() : "";
							var td = style.textDecoration? style.textDecoration.toLowerCase() : "";
							var s = style.fontSize?style.fontSize.toLowerCase() : "";
							var bc = style.backgroundColor?style.backgroundColor.toLowerCase() : "";
							var c = style.color?style.color.toLowerCase() : "";
	
							var wrapNodes = function(wrap, pNode){
								if(wrap){
									while(pNode.firstChild){
										wrap.appendChild(pNode.firstChild);
									}
									if(tag == "span" && !pNode.style.cssText){
										// A styler tag with nothing extra in it, so lets remove it.
										dojo.place(wrap, pNode, "before");
										pNode.parentNode.removeChild(pNode);
										pNode = wrap;
									}else{
										pNode.appendChild(wrap);
									}
								}
								return pNode;
							};
							switch(fw){
								case "bold":
								case "bolder":
								case "700":
								case "800":
								case "900":
									sTag = doc.createElement("b");
									cNode.style.fontWeight = "";
									break;
							}
							cNode = wrapNodes(sTag, cNode);
							sTag = null;
							if(fs == "italic"){
								sTag = doc.createElement("i");
								cNode.style.fontStyle = "";
							}
							cNode = wrapNodes(sTag, cNode);
							sTag = null;
							if(td){
								var da = td.split(" ");
								var count = 0;
								dojo.forEach(da, function(s){
									switch(s){
										case "underline":
											sTag = doc.createElement("u");
											break;
										case "line-through":
											sTag = doc.createElement("strike");
											break;
									}
									count++;
									if(count == da.length){
										// Last one, clear the decor and see if we can span strip on wrap.
										cNode.style.textDecoration = "";
									}
									cNode = wrapNodes(sTag, cNode);
									sTag = null;
								});
								
							}
							if(s){
								var sizeMap = {
									"xx-small": 1,
									"x-small": 2,
									"small": 3,
									"medium": 4,
									"large": 5,
									"x-large": 6,
									"xx-large": 7,
									"-webkit-xxx-large": 7
								};

								// Convert point or px size to size
								// to something roughly mappable.
								if(s.indexOf("pt") > 0){
									s = s.substring(0,s.indexOf("pt"));
									s = parseInt(s);
									if(s < 5){
										s = "xx-small";
									}else if(s < 10){
										s = "x-small";
									}else if(s < 15){
										s = "small";
									}else if(s < 20){
										s = "medium";
									}else if(s < 25){
										s = "large";
									}else if(s < 30){
										s = "x-large";
									}else if(s > 30){
										s = "xx-large";
									}
								}else if(s.indexOf("px") > 0){
									s = s.substring(0,s.indexOf("px"));
									s = parseInt(s);
									if(s < 5){
										s = "xx-small";
									}else if(s < 10){
										s = "x-small";
									}else if(s < 15){
										s = "small";
									}else if(s < 20){
										s = "medium";
									}else if(s < 25){
										s = "large";
									}else if(s < 30){
										s = "x-large";
									}else if(s > 30){
										s = "xx-large";
									}
								}
								var size = sizeMap[s];
								if(!size){
									size = 3;
								}
								sTag = doc.createElement("font");
								sTag.setAttribute("size", size);
								cNode.style.fontSize = "";
							}
							cNode = wrapNodes(sTag, cNode);
							sTag = null;
							if(bc && tag !== "font" && self._isInline(tag)){
								// IE doesn't like non-font background color crud.
								// Also, don't move it in if the background color is set on a block style node,
								// as it won't color properly once put on inline font.
								bc = new dojo.Color(bc).toHex();
								sTag = doc.createElement("font");
								sTag.style.backgroundColor = bc;
								cNode.style.backgroundColor = "";
							}
							if(c && tag !== "font"){
								// IE doesn't like non-font background color crud.
								c = new dojo.Color(c).toHex();
								sTag = doc.createElement("font");
								sTag.setAttribute("color", c);
								cNode.style.color = "";
							}
							cNode = wrapNodes(sTag, cNode);
							sTag = null;
						}
					}
					if(cNode.childNodes){
						// Clone it, since we may alter its position
						var nodes = [];
						dojo.forEach(cNode.childNodes, function(n){ nodes.push(n);});
						dojo.forEach(nodes, convertNode);
					}
				}
				return cNode;
			};
			return this._normalizeTags(convertNode(node));
		}
		return node;
	},
	
	_normalizeTags: function(node){
		// summary:
		//		A function to handle normalizing certain tag types contained under 'node'
		// node:
		//		The node to search from.
		// tags:
		//		Protected.
		var w = this.editor.window;
		var doc = this.editor.document;
		dojo.query("em,s,strong", node).forEach(function(n){
			var tag = n.tagName?n.tagName.toLowerCase():"";
			var tTag;
			switch(tag){
				case "s":
						tTag = "strike";
						break;
				case "em":
						tTag = "i";
						break;
				case "strong":
						tTag = "b";
						break;
			}
			if(tTag){
				var nNode = doc.createElement(tTag);
				dojo.place("<"+tTag+">", n, "before");
				while(n.firstChild){
					nNode.appendChild(n.firstChild);
				}
				n.parentNode.removeChild(n);
			}
		});
		return node;
	},

	_convertToCss: function(node){
		// summary:
		//		A function to convert the HTML structure of 'node' into
		//		css span styles around text instead of semantic tags.
		//		Note:  It does not do compression of spans together.
		// node: DOMNode
		//		The node to process
		// tags:
		//		private
		if(node){
			var doc = this.editor.document;
			var convertNode = function(cNode) {
				if(cNode.nodeType == 1){
					if(cNode.id !== "dijitEditorBody"){
						var tag = cNode.tagName?cNode.tagName.toLowerCase():"";
						if(tag){
							var span;
							switch(tag){
								case "b":
								case "strong": // Mainly IE
									span = doc.createElement("span");
									span.style.fontWeight = "bold";
									break;
								case "i":
								case "em": // Mainly IE
									span = doc.createElement("span");
									span.style.fontStyle = "italic";
									break;
								case "u":
									span = doc.createElement("span");
									span.style.textDecoration = "underline";
									break;
								case "strike":
								case "s": // Mainly WebKit.
									span = doc.createElement("span");
									span.style.textDecoration = "line-through";
									break;
								case "font": // Try to deal with colors
									var styles = {};
									if(dojo.attr(cNode, "color")){
										styles.color = dojo.attr(cNode, "color");
									}
									if(dojo.attr(cNode, "face")){
										styles.fontFace = dojo.attr(cNode, "face");
									}
									if(cNode.style && cNode.style.backgroundColor){
										styles.backgroundColor = cNode.style.backgroundColor;
									}
									if(cNode.style && cNode.style.color){
										styles.color = cNode.style.color;
									}
									var sizeMap = {
										1: "xx-small",
										2: "x-small",
										3: "small",
										4: "medium",
										5: "large",
										6: "x-large",
										7: "xx-large"
									};
									if(dojo.attr(cNode, "size")){
										styles.fontSize = sizeMap[dojo.attr(cNode, "size")];
									}
									span = doc.createElement("span");
									dojo.style(span, styles);
									break;
							}
							if(span){
								while(cNode.firstChild){
									span.appendChild(cNode.firstChild);
								}
								dojo.place(span, cNode, "before");
								cNode.parentNode.removeChild(cNode);
								cNode = span;
							}
						}
					}
					if(cNode.childNodes){
						// Clone it, since we may alter its position
						var nodes = [];
						dojo.forEach(cNode.childNodes, function(n){ nodes.push(n);});
						dojo.forEach(nodes, convertNode);
					}
				}
				return cNode;
			};
			node = convertNode(node);
			if(this.condenseSpans){
				this._condenseSpans(node);
			}
		}
		return node;
	},

	_condenseSpans: function(node){
		// summary:
		//		Method to condense spans if you end up with multi-wrapping from
		//		from converting b, i, u, to span nodes.
		// node:
		//		The node (and its children), to process.
		// tags:
		//		private
		var compressSpans = function(node){
			// Okay, span with no class or id and it has styles.
			// So, merge the styles, then collapse.  Merge requires determining
			// all the common/different styles and anything that overlaps the style,
			// but a different value can't be merged.
			var genStyleMap = function(styleText){
				var m;
				if(styleText){
					m = {};
					var styles = styleText.toLowerCase().split(";");
					dojo.forEach(styles, function(s){
						if(s){
							var ss = s.split(":");
							var key = ss[0] ? dojo.trim(ss[0]): "";
							var val = ss[1] ? dojo.trim(ss[1]): "";
							if(key && val){
								var i;
								var nKey = "";
								for(i = 0; i < key.length; i++){
									var ch = key.charAt(i);
									if(ch == "-"){
										i++;
										ch = key.charAt(i);
										nKey += ch.toUpperCase();
									}else{
										nKey += ch;
									}
								}
								m[nKey] = val;
							}
						}
					});
				}
				return m;
			};
			if(node && node.nodeType == 1){
				var tag = node.tagName? node.tagName.toLowerCase() : "";
				if(tag === "span" && node.childNodes && node.childNodes.length === 1){
					// Okay, a possibly compressible span
					var c = node.firstChild;
					while(c && c.nodeType == 1 && c.tagName && c.tagName.toLowerCase() == "span"){
						if(!dojo.attr(c, "class") && !dojo.attr(c, "id") && c.style){
							var s1 = genStyleMap(node.style.cssText);
							var s2 = genStyleMap(c.style.cssText);
							if(s1 && s2){
								// Maps, so lets see if we can combine them.
								var combinedMap = {};
								var i;
								for(i in s1){
									if(!s1[i] || !s2[i] || s1[i] == s2[i]){
										combinedMap[i] = s1[i];
										delete s2[i];
									}else if(s1[i] != s2[i]){
										// Collision, cannot merge.
										// IE does not handle combined underline strikethrough text
										// decorations on a single span.
										if(i == "textDecoration"){
											combinedMap[i] = s1[i] + " " + s2[i];
											delete s2[i];
										}else{
											combinedMap = null;
										}
										break;
									}else{
										combinedMap = null;
										break;
									}
								}
								if(combinedMap){
									for(i in s2){
										combinedMap[i] = s2[i];
									}
									dojo.style(node, combinedMap);
									while(c.firstChild){
										node.appendChild(c.firstChild);
									}
									var t = c.nextSibling;
									c.parentNode.removeChild(c);
									c = t;
								}else{
									c = c.nextSibling;
								}
							}else{
								c = c.nextSibling;
							}
						}else{
							c = c.nextSibling;
						}
					}
				}
			}
			if(node.childNodes && node.childNodes.length){
				dojo.forEach(node.childNodes, compressSpans);
			}
		};
		compressSpans(node);
	},
	
	_isInline: function(tag){
		// summary:
		//		Function to determine if the current tag is an inline
		//		element that does formatting, as we don't want to
		//		try to combine inlines with divs on styles.
		// tag:
		//		The tag to examine
		// tags:
		//		private
		switch(tag){
			case "a":
			case "b":
			case "strong":
			case "s":
			case "strike":
			case "i":
			case "u":
			case "em":
			case "sup":
			case "sub":
			case "span":
			case "font":
			case "big":
			case "cite":
			case "q":
			case "img":
			case "small":
				return true;
			default:
				return false;
		}
	},

	_inserthtmlImpl: function(html){
		// summary:
		//		Function to trap and over-ride the editor inserthtml implementation
		//		to try and filter it to match the editor's internal styling mode.
		//		Helpful for plugins like PasteFromWord, in that it extra-filters
		//		and normalizes the input if it can.
		// html:
		//		The HTML string to insert.
		// tags:
		//		private
		if(html){
			var doc = this.editor.document;
			var div = doc.createElement("div");
			div.innerHTML = html;
			div = this._browserFilter(div);
			html = editorHtml.getChildrenHtml(div);
			div.innerHTML = "";

			// Call the over-ride, or if not available, just execute it.
			if(this.editor._oldInsertHtmlImpl){
				return this.editor._oldInsertHtmlImpl(html);
			}else{
				return this.editor.execCommand("inserthtml", html);
			}
		}
		return false;
	}
});

// Register this plugin.
dojo.subscribe(dijit._scopeName + ".Editor.getPlugin",null,function(o){
	if(o.plugin){ return; }
	var name = o.args.name.toLowerCase();
	if(name === "normalizestyle"){
		o.plugin = new dojox.editor.plugins.NormalizeStyle({
			mode: ("mode" in o.args)?o.args.mode:"semantic",
			condenseSpans: ("condenseSpans" in o.args)?o.args.condenseSpans:true
		});
	}
});

return dojox.editor.plugins.NormalizeStyle;

});
