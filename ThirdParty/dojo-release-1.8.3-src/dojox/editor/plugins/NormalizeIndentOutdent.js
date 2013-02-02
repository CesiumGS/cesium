define([
	"dojo",
	"dijit",
	"dojox",
	"dijit/_editor/_Plugin",
	"dijit/_editor/range",
	"dijit/_editor/selection",
	"dojo/_base/connect",
	"dojo/_base/declare"
], function(dojo, dijit, dojox, _Plugin) {

dojo.declare("dojox.editor.plugins.NormalizeIndentOutdent", _Plugin, {
	// summary:
	//		This plugin provides improved indent and outdent handling to
	//		the editor.  It tries to generate valid HTML, as well as be
	//		consistent about how it indents and outdents lists and blocks/elements.

	// indentBy: [public] number
	//		The amount to indent by.  Valid values are 1+.  This is combined with
	//		the indentUnits parameter to determine how much to indent or outdent
	//		by for regular text.  It does not affect lists.
	indentBy: 40,
	
	// indentUnits: [public] String
	//		The units to apply to the indent amount.  Usually 'px', but can also
	//		be em.
	indentUnits: "px",

	setEditor: function(editor){
		// summary:
		//		Over-ride for the setting of the editor.
		// editor: Object
		//		The editor to configure for this plugin to use.
		this.editor = editor;

		// Register out indent handler via the builtin over-ride mechanism.
		editor._indentImpl = dojo.hitch(this, this._indentImpl);
		editor._outdentImpl = dojo.hitch(this, this._outdentImpl);

		// Take over the query command enabled function, we want to prevent
		// indent of first items in a list, etc.
		if(!editor._indentoutdent_queryCommandEnabled){
			editor._indentoutdent_queryCommandEnabled = editor.queryCommandEnabled;
		}
		editor.queryCommandEnabled = dojo.hitch(this, this._queryCommandEnabled);

		// We need the custom undo code since we manipulate the dom
		// outside of the browser natives and only customUndo really handles
		// that.  It will incur a performance hit, but should hopefully be
		// relatively small.
		editor.customUndo = true;
	},

	_queryCommandEnabled: function(command){
		// summary:
		//		An over-ride for the editor's query command enabled,
		//		so that we can prevent indents, etc, on bad elements
		//		or positions (like first element in a list).
		// command:
		//		The command passed in to check enablement.
		// tags:
		//		private
		var c = command.toLowerCase();
		var ed, sel, range, node, tag, prevNode;
		var style = "marginLeft";
		if(!this._isLtr()){
			style = "marginRight";
		}
		if(c === "indent"){
			ed = this.editor;
			sel = dijit.range.getSelection(ed.window);
			if(sel && sel.rangeCount > 0){
				range = sel.getRangeAt(0);
				node = range.startContainer;

				// Check for li nodes first, we handle them a certain way.
				while(node && node !== ed.document && node !== ed.editNode){
					tag = this._getTagName(node);
					if(tag === "li"){
						
						prevNode = node.previousSibling;
						while(prevNode && prevNode.nodeType !== 1){
							prevNode = prevNode.previousSibling;
						}
						if(prevNode && this._getTagName(prevNode) === "li"){
							return true;
						}else{
							// First item, disallow
							return false;
						}
					}else if(this._isIndentableElement(tag)){
						return true;
					}
					node = node.parentNode;
				}
				if(this._isRootInline(range.startContainer)){
					return true;
				}
			}
		}else if(c === "outdent"){
			ed = this.editor;
			sel = dijit.range.getSelection(ed.window);
			if(sel && sel.rangeCount > 0){
				range = sel.getRangeAt(0);
				node = range.startContainer;
				// Check for li nodes first, we handle them a certain way.
				while(node && node !== ed.document && node !== ed.editNode){
					tag = this._getTagName(node);
					if(tag === "li"){
						// Standard list, we can ask the browser.
						return this.editor._indentoutdent_queryCommandEnabled(command);
					}else if(this._isIndentableElement(tag)){
						// Block, we need to handle the indent check.
						var cIndent = node.style?node.style[style]:"";
						if(cIndent){
							cIndent = this._convertIndent(cIndent);
							if(cIndent/this.indentBy >= 1){
								return true;
							}
						}
						return false;
					}
					node = node.parentNode;
				}
				if(this._isRootInline(range.startContainer)){
					return false;
				}
			}
		}else{
			return this.editor._indentoutdent_queryCommandEnabled(command);
		}
		return false;
	},

	_indentImpl: function(/*String*/ html) {
		// summary:
		//		Improved implementation of indent, generates correct indent for
		//		ul/ol
		var ed = this.editor;

		var sel = dijit.range.getSelection(ed.window);
		if(sel && sel.rangeCount > 0){
			var range = sel.getRangeAt(0);
			var node = range.startContainer;
			var tag, start, end, div;
			

			if(range.startContainer === range.endContainer){
				// No selection, just cursor point, we need to see if we're
				// in an indentable block, or similar.
				if(this._isRootInline(range.startContainer)){
					// Text at the 'root' of the document,
					// we'll try to indent it and all inline selements around it
					// as they are visually a single line.

					// First, we need to find the toplevel inline element that is rooted
					// to the document 'editNode'
					start = range.startContainer;
					while(start && start.parentNode !== ed.editNode){
						start = start.parentNode;
					}

					// Now we need to walk up its siblings and look for the first one in the rooting
					// that isn't inline or text, as we want to grab all of that for indent.
					while(start && start.previousSibling && (
							this._isTextElement(start) ||
							(start.nodeType === 1 && this._isInlineFormat(this._getTagName(start))
						))){
						start = start.previousSibling;
					}
					if(start && start.nodeType === 1 && !this._isInlineFormat(this._getTagName(start))){
						// Adjust slightly, we're one node too far back in this case.
						start = start.nextSibling;
					}

					// Okay, we have a configured start, lets grab everything following it that's
					// inline and make it an indentable block!
					if(start){
						div = ed.document.createElement("div");
						dojo.place(div, start, "after");
						div.appendChild(start);
						end = div.nextSibling;
						while(end && (
							this._isTextElement(end) ||
							(end.nodeType === 1 &&
								this._isInlineFormat(this._getTagName(end)))
							)){
							// Add it.
							div.appendChild(end);
							end = div.nextSibling;
						}
						this._indentElement(div);
						ed._sCall("selectElementChildren", [div]);
						ed._sCall("collapse", [true]);
					}
				}else{
					while(node && node !== ed.document && node !== ed.editNode){
						tag = this._getTagName(node);
						if(tag === "li"){
							this._indentList(node);
							return;
						}else if(this._isIndentableElement(tag)){
							this._indentElement(node);
							return;
						}
						node = node.parentNode;
					}
				}
			}else{
				var curNode;
				// multi-node select.  We need to scan over them.
				// Find the two containing nodes at start and end.
				// then move the end one node past.  Then ... lets see
				// what we can indent!
				start = range.startContainer;
				end = range.endContainer;
				// Find the non-text nodes.

				while(start && this._isTextElement(start) && start.parentNode !== ed.editNode){
					start = start.parentNode;
				}
				while(end && this._isTextElement(end) && end.parentNode !== ed.editNode){
					end = end.parentNode;
				}
				if(end === ed.editNode || end === ed.document.body){
					// Okay, selection end is somewhere after start, we need to find the last node
					// that is safely in the range.
					curNode = start;
					while(curNode.nextSibling &&
						ed._sCall("inSelection", [curNode])){
						curNode = curNode.nextSibling;
					}
					end = curNode;
					if(end === ed.editNode || end === ed.document.body){
						// Unable to determine real selection end, so just make it
						// a single node indent of start + all following inline styles, if
						// present, then just exit.
						tag = this._getTagName(start);
						if(tag === "li"){
							this._indentList(start);
						}else if(this._isIndentableElement(tag)){
							this._indentElement(start);
						}else if(this._isTextElement(start) ||
								 this._isInlineFormat(tag)){
							// inline element or textnode, So we want to indent it somehow
							div = ed.document.createElement("div");
							dojo.place(div, start, "after");

							// Find and move all inline tags following the one we inserted also into the
							// div so we don't split up content funny.
							var next = start;
							while(next && (
								this._isTextElement(next) ||
								(next.nodeType === 1 &&
								this._isInlineFormat(this._getTagName(next))))){
								div.appendChild(next);
								next = div.nextSibling;
							}
							this._indentElement(div);
						}
						return;
					}
				}
				
				// Has a definite end somewhere, so lets try to indent up to it.
				// requires looking at the selections and in some cases, moving nodes
				// into indentable blocks.
				end = end.nextSibling;
				curNode = start;
				while(curNode && curNode !== end){
					if(curNode.nodeType === 1){
						tag = this._getTagName(curNode);
						if(dojo.isIE){
							// IE sometimes inserts blank P tags, which we want to skip
							// as they end up indented, which messes up layout.
							if(tag === "p" && this._isEmpty(curNode)){
								curNode = curNode.nextSibling;
								continue;
							}
						}
						if(tag === "li"){
							if(div){
								if(this._isEmpty(div)){
									div.parentNode.removeChild(div);
								}else{
									this._indentElement(div);
								}
								div = null;
							}
							this._indentList(curNode);
						}else if(!this._isInlineFormat(tag) && this._isIndentableElement(tag)){
							if(div){
								if(this._isEmpty(div)){
									div.parentNode.removeChild(div);
								}else{
									this._indentElement(div);
								}
								div = null;
							}
							curNode = this._indentElement(curNode);
						}else if(this._isInlineFormat(tag)){
							// inline tag.
							if(!div){
								div = ed.document.createElement("div");
								dojo.place(div, curNode, "after");
								div.appendChild(curNode);
								curNode = div;
							}else{
								div.appendChild(curNode);
								curNode = div;
							}
						}
					}else if(this._isTextElement(curNode)){
						if(!div){
							div = ed.document.createElement("div");
							dojo.place(div, curNode, "after");
							div.appendChild(curNode);
							curNode = div;
						}else{
							div.appendChild(curNode);
							curNode = div;
						}
					}
					curNode = curNode.nextSibling;
				}
				// Okay, indent everything we merged if we haven't yet..
				if(div){
					if(this._isEmpty(div)){
						div.parentNode.removeChild(div);
					}else{
						this._indentElement(div);
					}
					div = null;
				}
			}
		}
	},

	_indentElement: function(node){
		// summary:
		//		Function to indent a block type tag.
		// node:
		//		The node who's content to indent.
		// tags:
		//		private
		var style = "marginLeft";
		if(!this._isLtr()){
			style = "marginRight";
		}
		var tag = this._getTagName(node);
		if(tag === "ul" || tag === "ol"){
			// Lists indent funny, so lets wrap them in a div
			// and indent the div instead.
			var div = this.editor.document.createElement("div");
			dojo.place(div, node, "after");
			div.appendChild(node);
			node = div;
		}
		var cIndent = node.style?node.style[style]:"";
		if(cIndent){
			cIndent = this._convertIndent(cIndent);
			cIndent = (parseInt(cIndent, 10) + this.indentBy) + this.indentUnits;
		}else{
			cIndent = this.indentBy + this.indentUnits;
		}
		dojo.style(node, style, cIndent);
		return node; //Return the node that was indented.
	},

	_outdentElement: function(node){
		// summary:
		//		Function to outdent a block type tag.
		// node:
		//		The node who's content to outdent.
		// tags:
		//		private
		var style = "marginLeft";
		if(!this._isLtr()){
			style = "marginRight";
		}
		var cIndent = node.style?node.style[style]:"";
		if(cIndent){
			cIndent = this._convertIndent(cIndent);
			if(cIndent - this.indentBy > 0){
				cIndent = (parseInt(cIndent, 10) - this.indentBy) + this.indentUnits;
			}else{
				cIndent = "";
			}
			dojo.style(node, style, cIndent);
		}
	},

	_outdentImpl: function(/*String*/ html) {
		// summary:
		//		Improved implementation of outdent, generates correct indent for
		//		ul/ol and other elements.
		// tags:
		//		private
		var ed = this.editor;
		var sel = dijit.range.getSelection(ed.window);
		if(sel && sel.rangeCount > 0){
			var range = sel.getRangeAt(0);
			var node = range.startContainer;
			var tag;

			if(range.startContainer === range.endContainer){
				// Check for li nodes first, we handle them a certain way.
				while(node && node !== ed.document && node !== ed.editNode){
					tag = this._getTagName(node);
					if(tag === "li"){
						return this._outdentList(node);
					}else if(this._isIndentableElement(tag)){
						return this._outdentElement(node);
					}
					node = node.parentNode;
				}
				ed.document.execCommand("outdent", false, html);
			}else{
				// multi-node select.  We need to scan over them.
				// Find the two containing nodes at start and end.
				// then move the end one node past.  Then ... lets see
				// what we can outdent!
				var start = range.startContainer;
				var end =  range.endContainer;
				// Find the non-text nodes.
				while(start && start.nodeType === 3){
					start = start.parentNode;
				}
				while(end && end.nodeType === 3){
					end = end.parentNode;
				}
				end = end.nextSibling;
				var curNode = start;
				while(curNode && curNode !== end){
					if(curNode.nodeType === 1){
						tag = this._getTagName(curNode);
						if(tag === "li"){
							this._outdentList(curNode);
						}else if(this._isIndentableElement(tag)){
							this._outdentElement(curNode);
						}

					}
					curNode = curNode.nextSibling;
				}
			}
		}
		return null;
	},


	_indentList: function(listItem){
		// summary:
		//		Internal function to handle indenting a list element.
		// listItem:
		//		The list item to indent.
		// tags:
		//		private
		var ed = this.editor;
		var newList, li;
		var listContainer = listItem.parentNode;
		var prevTag = listItem.previousSibling;
		
		// Ignore text, we want elements.
		while(prevTag && prevTag.nodeType !== 1){
			prevTag = prevTag.previousSibling;
		}
		var type = null;
		var tg = this._getTagName(listContainer);
		
		// Try to determine what kind of list item is here to indent.
		if(tg === "ol"){
			type = "ol";
		}else if(tg === "ul"){
			type = "ul";
		}
		
		// Only indent list items actually in a list.
		// Bail out if the list is malformed somehow.
		if(type){
			// There is a previous node in the list, so we want to append a new list
			// element after it that contains a new list of the content to indent it.
			if(prevTag && prevTag.tagName.toLowerCase() == "li"){
				// Lets see if we can merge this into another  (Eg,
				// does the sibling li contain an embedded list already of
				// the same type?  if so, we move into that one.
				var embList;
				if(prevTag.childNodes){
					var i;
					for(i = 0; i < prevTag.childNodes.length; i++){
						var n = prevTag.childNodes[i];
						if(n.nodeType === 3){
							if(dojo.trim(n.nodeValue)){
								if(embList){
									// Non-empty text after list, exit, can't embed.
									break;
								}
							}
						}else if(n.nodeType === 1 && !embList){
							// See if this is a list container.
							if(type === n.tagName.toLowerCase()){
								embList = n;
							}
						}else{
							// Other node present, break, can't embed.
							break;
						}
					}
				}
				if(embList){
					// We found a list to merge to, so merge.
					embList.appendChild(listItem);
				}else{
					// Nope, wasn't an embedded list container,
					// So lets just create a new one.
					newList = ed.document.createElement(type);
					dojo.style(newList, {
						paddingTop: "0px",
						paddingBottom: "0px"
					});
					li = ed.document.createElement("li");
					dojo.style(li, {
						listStyleImage: "none",
						listStyleType: "none"
					});
					prevTag.appendChild(newList);
					newList.appendChild(listItem);
				}

				// Move cursor.
				ed._sCall("selectElementChildren", [listItem]);
				ed._sCall("collapse", [true]);
			}
		}
	},

	_outdentList: function(listItem){
		// summary:
		//		Internal function to handle outdenting a list element.
		// listItem:
		//		The list item to outdent.
		// tags:
		//		private
		var ed = this.editor;
		var list = listItem.parentNode;
		var type = null;
		var tg = list.tagName ? list.tagName.toLowerCase() : "";
		var li;

		// Try to determine what kind of list contains the item.
		if(tg === "ol"){
			type = "ol";
		}else if(tg === "ul"){
			type = "ul";
		}

		// Check to see if it is a nested list, as outdenting is handled differently.
		var listParent = list.parentNode;
		var lpTg = this._getTagName(listParent);
		
		// We're in a list, so we need to outdent this specially.
		// Check for welformed and malformed lists (<ul><ul></ul>U/ul> type stuff).
		if(lpTg === "li" || lpTg === "ol" || lpTg === "ul"){
			if(lpTg === "ol" || lpTg === "ul"){
				// Okay, we need to fix this up, this is invalid html,
				// So try to combine this into a previous element before
				// de do a shuffle of the nodes, to build an HTML compliant
				// list.
				var prevListLi = list.previousSibling;
				while(prevListLi && (prevListLi.nodeType !== 1 ||
						(prevListLi.nodeType === 1 &&
						this._getTagName(prevListLi) !== "li"))
					){
					prevListLi = prevListLi.previousSibling;
				}
				if(prevListLi){
					// Move this list up into the previous li
					// to fix malformation.
					prevListLi.appendChild(list);
					listParent = prevListLi;
				}else{
					li = listItem;
					var firstItem = listItem;
					while(li.previousSibling){
						li = li.previousSibling;
						if(li.nodeType === 1 && this._getTagName(li) === "li"){
							firstItem = li;
						}
					}

					if(firstItem !== listItem){
						dojo.place(firstItem, list, "before");
						firstItem.appendChild(list);
						listParent = firstItem;
					}else{
						// No previous list item in a malformed list
						// ... so create one  and move into that.
						li = ed.document.createElement("li");
						dojo.place(li, list, "before");
						li.appendChild(list);
						listParent = li;
					}
					dojo.style(list, {
						paddingTop: "0px",
						paddingBottom: "0px"
					});
				}
			}

			// find the previous node, if any,
			// non-text.
			var prevLi = listItem.previousSibling;
			while(prevLi && prevLi.nodeType !== 1){
				prevLi = prevLi.previousSibling;
			}
			var nextLi = listItem.nextSibling;
			while(nextLi && nextLi.nodeType !== 1){
				nextLi = nextLi.nextSibling;
			}

			if(!prevLi){
				// Top item in a nested list, so just move it out
				// and then shuffle the remaining indented list into it.
				dojo.place(listItem, listParent, "after");
				listItem.appendChild(list);
			}else if(!nextLi){
				// Last item in a nested list, shuffle it out after
				// the nsted list only.
				dojo.place(listItem, listParent, "after");
			}else{
				// Item is in the middle of an embedded  list, so we
				// have to split it.

				// Move all the items following current list item into
				// a list after it.
				var newList = ed.document.createElement(type);
				dojo.style(newList, {
					paddingTop: "0px",
					paddingBottom: "0px"
				});
				listItem.appendChild(newList);
				while(listItem.nextSibling){
					newList.appendChild(listItem.nextSibling);
				}

				// Okay, now place the list item after the
				// current list parent (li).
				dojo.place(listItem, listParent, "after");
			}
			
			// Clean up any empty lists left behind.
			if(list && this._isEmpty(list)){
				list.parentNode.removeChild(list);
			}
			if(listParent && this._isEmpty(listParent)){
				listParent.parentNode.removeChild(listParent);
			}
			
			// Move our cursor to the list item we moved.
			ed._sCall("selectElementChildren", [listItem]);
			ed._sCall("collapse", [true]);
		}else{
			// Not in a nested list, so we can just defer to the
			// browser and hope it outdents right.
			ed.document.execCommand("outdent", false, null);
		}
	},

	_isEmpty: function(node){
		// summary:
		//		Internal function to determine if a node is 'empty'
		//		Eg, contains only blank text.  Used to determine if
		//		an empty list element should be removed or not.
		// node:
		//		The node to check.
		// tags:
		//		private
		if(node.childNodes){
			var empty = true;
			var i;
			for(i = 0; i < node.childNodes.length; i++){
				var n = node.childNodes[i];
				if(n.nodeType === 1){
					if(this._getTagName(n) === "p"){
						if(!dojo.trim(n.innerHTML)){
							continue;
						}
					}
					empty = false;
					break;
				}else if(this._isTextElement(n)){
					// Check for empty text.
					var nv = dojo.trim(n.nodeValue);
					if(nv && nv !=="&nbsp;" && nv !== "\u00A0"){
						empty = false;
						break;
					}
				}else{
					empty = false;
					break;
				}
			}
			return empty;
		}else{
			return true;
		}
	},

	_isIndentableElement: function(tag){
		// summary:
		//		Internal function to detect what element types
		//		are indent-controllable by us.
		// tag:
		//		The tag to check
		// tags:
		//		private
		switch(tag){
			case "p":
			case "div":
			case "h1":
			case "h2":
			case "h3":
			case "center":
			case "table":
			case "ul":
			case "ol":
				return true;
			default:
				return false;
		}
	},

	_convertIndent: function(indent){
		// summary:
		//		Function to convert the current indent style to
		//		the units we're using by some heuristic.
		// indent:
		//		The indent amount to convert.
		// tags:
		//		private
		var pxPerEm = 12;
		indent = indent + "";
		indent = indent.toLowerCase();
		var curUnit = (indent.indexOf("px") > 0) ? "px" : (indent.indexOf("em") > 0) ? "em" : "px";
		indent = indent.replace(/(px;?|em;?)/gi, "");
		if(curUnit === "px"){
			if(this.indentUnits === "em"){
				indent = Math.ceil(indent/pxPerEm);
			}
		}else{
			if(this.indentUnits === "px"){
				indent = indent * pxPerEm;
			}
		}
		return indent;
	},

	_isLtr: function(){
		// summary:
		//		Function to detect if the editor body is in RTL or LTR.
		// tags:
		//		private
		var editDoc = this.editor.document.body;
		var cs = dojo.getComputedStyle(editDoc);
		return cs ? cs.direction == "ltr" : true;
	},

	_isInlineFormat: function(tag){
		// summary:
		//		Function to determine if the current tag is an inline
		//		element that does formatting, as we don't want to
		//		break/indent around it, as it can screw up text.
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

	_getTagName: function(node){
		// summary:
		//		Internal function to get the tag name of an element
		//		if any.
		// node:
		//		The node to look at.
		// tags:
		//		private
		var tag = "";
		if(node && node.nodeType === 1){
			tag = node.tagName?node.tagName.toLowerCase():"";
		}
		return tag;
	},

	_isRootInline: function(node){
		// summary:
		//		This functions tests whether an indicated node is in root as inline
		//		or rooted inline elements in the page.
		// node:
		//		The node to start at.
		// tags:
		//		private
		var ed = this.editor;
		if(this._isTextElement(node) && node.parentNode === ed.editNode){
			return true;
		}else if(node.nodeType === 1 && this._isInlineFormat(node) && node.parentNode === ed.editNode){
			return true;
		}else if(this._isTextElement(node) && this._isInlineFormat(this._getTagName(node.parentNode))){
			node = node.parentNode;
			while(node && node !== ed.editNode && this._isInlineFormat(this._getTagName(node))){
				node = node.parentNode;
			}
			if(node === ed.editNode){
				return true;
			}
		}
		return false;
	},

	_isTextElement: function(node){
		// summary:
		//		Helper function to check for text nodes.
		// node:
		//		The node to check.
		// tags:
		//		private
		if(node && node.nodeType === 3 || node.nodeType === 4){
			return true;
		}
		return false;
	}
});

// Register this plugin.
dojo.subscribe(dijit._scopeName + ".Editor.getPlugin",null,function(o){
	if(o.plugin){ return; }
	var name = o.args.name.toLowerCase();
	if(name === "normalizeindentoutdent"){
		o.plugin = new dojox.editor.plugins.NormalizeIndentOutdent({
			indentBy: ("indentBy" in o.args) ?
				(o.args.indentBy > 0 ? o.args.indentBy : 40) :
				40,
			indentUnits: ("indentUnits" in o.args) ?
				(o.args.indentUnits.toLowerCase() == "em"? "em" : "px") :
				"px"
		});
	}
});

return dojox.editor.plugins.NormalizeIndentOutdent;

});
