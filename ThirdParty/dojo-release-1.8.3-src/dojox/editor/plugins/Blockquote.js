define([
	"dojo",
	"dijit",
	"dojox",
	"dijit/_editor/range",
	"dijit/_editor/selection",
	"dijit/_editor/_Plugin",
	"dijit/form/ToggleButton",
	"dojo/_base/connect",
	"dojo/_base/declare",
	"dojo/i18n",
	"dojo/i18n!dojox/editor/plugins/nls/Blockquote"
], function(dojo, dijit, dojox, range, selection, _Plugin) {

dojo.declare("dojox.editor.plugins.Blockquote", _Plugin, {
	// summary:
	//		This plugin provides Blockquote capability to the editor.
	//		window/tab

	// iconClassPrefix: [const] String
	//		The CSS class name for the button node icon.
	iconClassPrefix: "dijitAdditionalEditorIcon",

	_initButton: function(){
		// summary:
		//		Over-ride for creation of the preview button.
		this._nlsResources = dojo.i18n.getLocalization("dojox.editor.plugins", "Blockquote");
		this.button = new dijit.form.ToggleButton({
			label: this._nlsResources["blockquote"],
			showLabel: false,
			iconClass: this.iconClassPrefix + " " + this.iconClassPrefix + "Blockquote",
			tabIndex: "-1",
			onClick: dojo.hitch(this, "_toggleQuote")
		});
	},

	setEditor: function(editor){
		// summary:
		//		Over-ride for the setting of the editor.
		// editor: Object
		//		The editor to configure for this plugin to use.
		this.editor = editor;
		this._initButton();
		this.connect(this.editor, "onNormalizedDisplayChanged", "updateState");
		// We need the custom undo code since we manipulate the dom
		// outside of the browser natives and only customUndo really handles
		// that.  It will incur a performance hit, but should hopefully be
		// relatively small.
		editor.customUndo = true;
	},
	
	_toggleQuote: function(arg){
		// summary:
		//		Function to trigger previewing of the editor document
		// tags:
		//		private
		try{
			var ed = this.editor;
			ed.focus();

			var quoteIt = this.button.get("checked");
			var sel = dijit.range.getSelection(ed.window);
			var range, elem, start, end;
			if(sel && sel.rangeCount > 0){
				range = sel.getRangeAt(0);
			}
			if(range){
				ed.beginEditing();
				if(quoteIt){
					// Lets see what we've got as a selection...
					var bq, tag;
					if(range.startContainer === range.endContainer){
						// No selection, just cursor point, we need to see if we're
						// in an indentable block, or similar.
						if(this._isRootInline(range.startContainer)){
							// Text at the 'root' of the document, so we need to gather all of it.,
		
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
									(start.nodeType === 1 &&
									 this._isInlineFormat(this._getTagName(start))
								))){
								start = start.previousSibling;
							}
							if(start && start.nodeType === 1 &&
							   !this._isInlineFormat(this._getTagName(start))){
								// Adjust slightly, we're one node too far back in this case.
								start = start.nextSibling;
							}
		
							// Okay, we have a configured start, lets grab everything following it that's
							// inline and make it part of the blockquote!
							if(start){
								bq = ed.document.createElement("blockquote");
								dojo.place(bq, start, "after");
								bq.appendChild(start);
								end = bq.nextSibling;
								while(end && (
									this._isTextElement(end) ||
									(end.nodeType === 1 &&
										this._isInlineFormat(this._getTagName(end)))
									)){
									// Add it.
									bq.appendChild(end);
									end = bq.nextSibling;
								}
							}
						}else{
							// Figure out what to do when not root inline....
							var node = range.startContainer;
							while ((this._isTextElement(node) ||
									this._isInlineFormat(this._getTagName(node))
									|| this._getTagName(node) === "li") &&
								node !== ed.editNode && node !== ed.document.body){
								node = node.parentNode;
							}
							if(node !== ed.editNode && node !==	node.ownerDocument.documentElement){
								bq = ed.document.createElement("blockquote");
								dojo.place(bq, node, "after");
								bq.appendChild(node);
							}
						}
						if(bq){
							ed._sCall("selectElementChildren", [bq]);
							ed._sCall("collapse", [true]);
						}
					}else{
						var curNode;
						// multi-node select.  We need to scan over them.
						// Find the two containing nodes at start and end.
						// then move the end one node past.  Then ... lets see
						// what we can blockquote!
						start = range.startContainer;
						end = range.endContainer;
						// Find the non-text nodes.

						while(start && this._isTextElement(start) && start.parentNode !== ed.editNode){
							start = start.parentNode;
						}

						// Try to find the end node.  We have to check the selection junk
						curNode = start;
						while(curNode.nextSibling && ed._sCall("inSelection", [curNode])){
							curNode = curNode.nextSibling;
						}
						end = curNode;
						if(end === ed.editNode || end === ed.document.body){
							// Unable to determine real selection end, so just make it
							// a single node indent of start + all following inline styles, if
							// present, then just exit.
							bq = ed.document.createElement("blockquote");
							dojo.place(bq, start, "after");
							tag = this._getTagName(start);
							if(this._isTextElement(start) || this._isInlineFormat(tag)){
								// inline element or textnode
								// Find and move all inline tags following the one we inserted also into the
								// blockquote so we don't split up content funny.
								var next = start;
								while(next && (
									this._isTextElement(next) ||
									(next.nodeType === 1 &&
									this._isInlineFormat(this._getTagName(next))))){
									bq.appendChild(next);
									next = bq.nextSibling;
								}
							}else{
								bq.appendChild(start);
							}
							return;
						}

						// Has a definite end somewhere, so lets try to blockquote up to it.
						// requires looking at the selections and in some cases, moving nodes
						// into separate blockquotes.
						end = end.nextSibling;
						curNode = start;
						while(curNode && curNode !== end){
							if(curNode.nodeType === 1){
								tag = this._getTagName(curNode);
								if(tag !== "br"){
									if(!window.getSelection){
										// IE sometimes inserts blank P tags, which we want to skip
										// as they end up blockquoted, which messes up layout.
										if(tag === "p" && this._isEmpty(curNode)){
											curNode = curNode.nextSibling;
											continue;
										}
									}
									if(this._isInlineFormat(tag)){
										// inline tag.
										if(!bq){
											bq = ed.document.createElement("blockquote");
											dojo.place(bq, curNode, "after");
											bq.appendChild(curNode);
										}else{
											bq.appendChild(curNode);
										}
										curNode = bq;
									}else{
										if(bq){
											if(this._isEmpty(bq)){
												bq.parentNode.removeChild(bq);
											}
										}
										bq = ed.document.createElement("blockquote");
										dojo.place(bq, curNode, "after");
										bq.appendChild(curNode);
										curNode = bq;
									}
								}
							}else if(this._isTextElement(curNode)){
								if(!bq){
									bq = ed.document.createElement("blockquote");
									dojo.place(bq, curNode, "after");
									bq.appendChild(curNode);
								}else{
									bq.appendChild(curNode);
								}
								curNode = bq;
							}
							curNode = curNode.nextSibling;
						}
						// Okay, check the last bq, remove it if no content.
						if(bq){
							if(this._isEmpty(bq)){
								bq.parentNode.removeChild(bq);
							}else{
								ed._sCall("selectElementChildren", [bq]);
								ed._sCall("collapse", [true]);
							}
							bq = null;
						}
					}
				}else{
					var found = false;
					if(range.startContainer === range.endContainer){
						elem = range.endContainer;
						// Okay, now see if we can find one of the formatting types we're in.
						while(elem && elem !== ed.editNode && elem !== ed.document.body){
							var tg = elem.tagName?elem.tagName.toLowerCase():"";
							if(tg === "blockquote"){
								found = true;
								break;
							}
							elem = elem.parentNode;
						}
						if(found){
							var lastChild;
							while(elem.firstChild){
								lastChild = elem.firstChild;
								dojo.place(lastChild, elem, "before");
							}
							elem.parentNode.removeChild(elem);
							if(lastChild){
								ed._sCall("selectElementChildren", [lastChild]);
								ed._sCall("collapse", [true]);
							}
						}
					}else{
						// Multi-select!  Gotta find all the blockquotes contained within the selection area.
						start = range.startContainer;
						end = range.endContainer;
						while(start && this._isTextElement(start) && start.parentNode !== ed.editNode){
							start = start.parentNode;
						}
						var selectedNodes = [];
						var cNode = start;
						while(cNode && cNode.nextSibling && ed._sCall("inSelection", [cNode])){
							if(cNode.parentNode && this._getTagName(cNode.parentNode) === "blockquote"){
								cNode = cNode.parentNode;
							}
							selectedNodes.push(cNode);
							cNode = cNode.nextSibling;
						}
						
						// Find all the blocknodes now that we know the selection area.
						var bnNodes = this._findBlockQuotes(selectedNodes);
						while(bnNodes.length){
							var bn = bnNodes.pop();
							if(bn.parentNode){
								// Make sure we haven't seen this before and removed it.
								while(bn.firstChild){
									dojo.place(bn.firstChild, bn, "before");
								}
								bn.parentNode.removeChild(bn);
							}
						}
					}
				}
				ed.endEditing();
			}
			ed.onNormalizedDisplayChanged();
		}catch(e){ /* Squelch */ }
	},

	updateState: function(){
		// summary:
		//		Overrides _Plugin.updateState().  This controls whether or not the current
		//		cursor position should toggle on the quote button or not.
		// tags:
		//		protected
		var ed = this.editor;
		var disabled = this.get("disabled");
		
		if(!ed || !ed.isLoaded){ return; }
		if(this.button){
			this.button.set("disabled", disabled);
			if(disabled){
				return;
			}

			// Some browsers (WebKit) doesn't actually get the tag info right.
			// So ... lets check it manually.
			var elem;
			var found = false;
			
			// Try to find the ansestor element (and see if it is blockquote)
			var sel = dijit.range.getSelection(ed.window);
			if(sel && sel.rangeCount > 0){
				var range = sel.getRangeAt(0);
				if(range){
					elem = range.endContainer;
				}
			}
			// Okay, now see if we can find one of the formatting types we're in.
			while(elem && elem !== ed.editNode && elem !== ed.document){
				var tg = elem.tagName?elem.tagName.toLowerCase():"";
				if(tg === "blockquote"){
					found = true;
					break;
				}
				elem = elem.parentNode;
			}
			// toggle whether or not the current selection is blockquoted.
			this.button.set("checked", found);
		}
	},

	_findBlockQuotes: function(nodeList){
		// summary:
		//		function to find all the blocknode elements in a collection of
		//		nodes
		// nodeList:
		//		The list of nodes.
		// tags:
		//		private
		var bnList = [];
		if(nodeList){
			var i;
			for(i = 0; i < nodeList.length; i++){
				var node = nodeList[i];
				if(node.nodeType === 1){
					if(this._getTagName(node) === "blockquote"){
						bnList.push(node);
					}
					if(node.childNodes && node.childNodes.length > 0){
						bnList = bnList.concat(this._findBlockQuotes(node.childNodes));
					}
				}
			}
		}
		return bnList;
	},

	/*****************************************************************/
	/* Functions borrowed from NormalizeIndentOutdent                */
	/*****************************************************************/

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
	}
});

// Register this plugin.
dojo.subscribe(dijit._scopeName + ".Editor.getPlugin",null,function(o){
	if(o.plugin){ return; }
	var name = o.args.name.toLowerCase();
	if(name === "blockquote"){
		o.plugin = new dojox.editor.plugins.Blockquote({});
	}
});

return dojox.editor.plugins.Blockquote;

});
