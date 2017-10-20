define([
	"dojo/_base/declare", // declare
	"dojo/dom-construct", // domConstruct.destroy domConstruct.place
	"dojo/keys", // keys.ENTER
	"dojo/_base/lang",
	"dojo/on",
	"dojo/sniff", // has("ie") has("mozilla") has("webkit")
	"dojo/_base/window", // win.withGlobal
	"dojo/window", // winUtils.scrollIntoView
	"../_Plugin",
	"../RichText",
	"../range"
], function(declare, domConstruct, keys, lang, on, has, win, winUtils, _Plugin, RichText, rangeapi){

	// module:
	//		dijit/_editor/plugins/EnterKeyHandling

	return declare("dijit._editor.plugins.EnterKeyHandling", _Plugin, {
		// summary:
		//		This plugin tries to make all browsers behave consistently with regard to
		//		how ENTER behaves in the editor window.  It traps the ENTER key and alters
		//		the way DOM is constructed in certain cases to try to commonize the generated
		//		DOM and behaviors across browsers.
		//
		// description:
		//		This plugin has three modes:
		//
		//		- blockNodeForEnter=BR
		//		- blockNodeForEnter=DIV
		//		- blockNodeForEnter=P
		//
		//		In blockNodeForEnter=P, the ENTER key starts a new
		//		paragraph, and shift-ENTER starts a new line in the current paragraph.
		//		For example, the input:
		//
		//	|	first paragraph <shift-ENTER>
		//	|	second line of first paragraph <ENTER>
		//	|	second paragraph
		//
		//		will generate:
		//
		//	|	<p>
		//	|		first paragraph
		//	|		<br/>
		//	|		second line of first paragraph
		//	|	</p>
		//	|	<p>
		//	|		second paragraph
		//	|	</p>
		//
		//		In BR and DIV mode, the ENTER key conceptually goes to a new line in the
		//		current paragraph, and users conceptually create a new paragraph by pressing ENTER twice.
		//		For example, if the user enters text into an editor like this:
		//
		//	|		one <ENTER>
		//	|		two <ENTER>
		//	|		three <ENTER>
		//	|		<ENTER>
		//	|		four <ENTER>
		//	|		five <ENTER>
		//	|		six <ENTER>
		//
		//		It will appear on the screen as two 'paragraphs' of three lines each.  Markupwise, this generates:
		//
		//		BR:
		//	|		one<br/>
		//	|		two<br/>
		//	|		three<br/>
		//	|		<br/>
		//	|		four<br/>
		//	|		five<br/>
		//	|		six<br/>
		//
		//		DIV:
		//	|		<div>one</div>
		//	|		<div>two</div>
		//	|		<div>three</div>
		//	|		<div>&nbsp;</div>
		//	|		<div>four</div>
		//	|		<div>five</div>
		//	|		<div>six</div>

		// blockNodeForEnter: String
		//		This property decides the behavior of Enter key. It can be either P,
		//		DIV, BR, or empty (which means disable this feature). Anything else
		//		will trigger errors.  The default is 'BR'
		//
		//		See class description for more details.
		blockNodeForEnter: 'BR',

		constructor: function(args){
			if(args){
				if("blockNodeForEnter" in args){
					args.blockNodeForEnter = args.blockNodeForEnter.toUpperCase();
				}
				lang.mixin(this, args);
			}
		},

		setEditor: function(editor){
			// Overrides _Plugin.setEditor().
			if(this.editor === editor){
				return;
			}
			this.editor = editor;
			if(this.blockNodeForEnter == 'BR'){
				// While Moz has a mode tht mostly works, it's still a little different,
				// So, try to just have a common mode and be consistent.  Which means
				// we need to enable customUndo, if not already enabled.
				this.editor.customUndo = true;
				editor.onLoadDeferred.then(lang.hitch(this, function(d){
					this.own(on(editor.document, "keydown", lang.hitch(this, function(e){
						if(e.keyCode == keys.ENTER){
							// Just do it manually.  The handleEnterKey has a shift mode that
							// Always acts like <br>, so just use it.
							var ne = lang.mixin({}, e);
							ne.shiftKey = true;
							if(!this.handleEnterKey(ne)){
								e.stopPropagation();
								e.preventDefault();
							}
						}
					})));
					if(has("ie") >= 9 && has("ie") <= 10){
						this.own(on(editor.document, "paste", lang.hitch(this, function(e){
							setTimeout(lang.hitch(this, function(){
								// Use the old range/selection code to kick IE 9 into updating
								// its range by moving it back, then forward, one 'character'.
								var r = this.editor.document.selection.createRange();
								r.move('character', -1);
								r.select();
								r.move('character', 1);
								r.select();
							}), 0);
						})));
					}
					return d;
				}));
			}else if(this.blockNodeForEnter){
				// add enter key handler
				var h = lang.hitch(this, "handleEnterKey");
				editor.addKeyHandler(13, 0, 0, h); //enter
				editor.addKeyHandler(13, 0, 1, h); //shift+enter
				this.own(this.editor.on('KeyPressed', lang.hitch(this, 'onKeyPressed')));
			}
		},
		onKeyPressed: function(){
			// summary:
			//		Handler for after the user has pressed a key, and the display has been updated.
			//		Connected to RichText's onKeyPressed() method.
			// tags:
			//		private
			if(this._checkListLater){
				if(this.editor.selection.isCollapsed()){
					var liparent = this.editor.selection.getAncestorElement('LI');
					if(!liparent){
						// circulate the undo detection code by calling RichText::execCommand directly
						RichText.prototype.execCommand.call(this.editor, 'formatblock', this.blockNodeForEnter);
						// set the innerHTML of the new block node
						var block = this.editor.selection.getAncestorElement(this.blockNodeForEnter);
						if(block){
							block.innerHTML = this.bogusHtmlContent;
							if(has("ie") <= 9){
								// move to the start by moving backwards one char
								var r = this.editor.document.selection.createRange();
								r.move('character', -1);
								r.select();
							}
						}else{
							console.error('onKeyPressed: Cannot find the new block node'); // FIXME
						}
					}else{
						if(has("mozilla")){
							if(liparent.parentNode.parentNode.nodeName == 'LI'){
								liparent = liparent.parentNode.parentNode;
							}
						}
						var fc = liparent.firstChild;
						if(fc && fc.nodeType == 1 && (fc.nodeName == 'UL' || fc.nodeName == 'OL')){
							liparent.insertBefore(fc.ownerDocument.createTextNode('\xA0'), fc);
							var newrange = rangeapi.create(this.editor.window);
							newrange.setStart(liparent.firstChild, 0);
							var selection = rangeapi.getSelection(this.editor.window, true);
							selection.removeAllRanges();
							selection.addRange(newrange);
						}
					}
				}
				this._checkListLater = false;
			}
			if(this._pressedEnterInBlock){
				// the new created is the original current P, so we have previousSibling below
				if(this._pressedEnterInBlock.previousSibling){
					this.removeTrailingBr(this._pressedEnterInBlock.previousSibling);
				}
				delete this._pressedEnterInBlock;
			}
		},

		// bogusHtmlContent: [private] String
		//		HTML to stick into a new empty block
		bogusHtmlContent: '&#160;', // &nbsp;

		// blockNodes: [private] Regex
		//		Regex for testing if a given tag is a block level (display:block) tag
		blockNodes: /^(?:P|H1|H2|H3|H4|H5|H6|LI)$/,

		handleEnterKey: function(e){
			// summary:
			//		Handler for enter key events when blockNodeForEnter is DIV or P.
			// description:
			//		Manually handle enter key event to make the behavior consistent across
			//		all supported browsers. See class description for details.
			// tags:
			//		private

			var selection, range, newrange, startNode, endNode, brNode, doc = this.editor.document, br, rs, txt;
			if(e.shiftKey){        // shift+enter always generates <br>
				var parent = this.editor.selection.getParentElement();
				var header = rangeapi.getAncestor(parent, this.blockNodes);
				if(header){
					if(header.tagName == 'LI'){
						return true; // let browser handle
					}
					selection = rangeapi.getSelection(this.editor.window);
					range = selection.getRangeAt(0);
					if(!range.collapsed){
						range.deleteContents();
						selection = rangeapi.getSelection(this.editor.window);
						range = selection.getRangeAt(0);
					}
					if(rangeapi.atBeginningOfContainer(header, range.startContainer, range.startOffset)){
						br = doc.createElement('br');
						newrange = rangeapi.create(this.editor.window);
						header.insertBefore(br, header.firstChild);
						newrange.setStartAfter(br);
						selection.removeAllRanges();
						selection.addRange(newrange);
					}else if(rangeapi.atEndOfContainer(header, range.startContainer, range.startOffset)){
						newrange = rangeapi.create(this.editor.window);
						br = doc.createElement('br');
						header.appendChild(br);
						header.appendChild(doc.createTextNode('\xA0'));
						newrange.setStart(header.lastChild, 0);
						selection.removeAllRanges();
						selection.addRange(newrange);
					}else{
						rs = range.startContainer;
						if(rs && rs.nodeType == 3){
							// Text node, we have to split it.
							txt = rs.nodeValue;
							startNode = doc.createTextNode(txt.substring(0, range.startOffset));
							endNode = doc.createTextNode(txt.substring(range.startOffset));
							brNode = doc.createElement("br");

							if(endNode.nodeValue == "" && has("webkit")){
								endNode = doc.createTextNode('\xA0')
							}
							domConstruct.place(startNode, rs, "after");
							domConstruct.place(brNode, startNode, "after");
							domConstruct.place(endNode, brNode, "after");
							domConstruct.destroy(rs);
							newrange = rangeapi.create(this.editor.window);
							newrange.setStart(endNode, 0);
							selection.removeAllRanges();
							selection.addRange(newrange);
							return false;
						}
						return true; // let browser handle
					}
				}else{
					selection = rangeapi.getSelection(this.editor.window);
					if(selection.rangeCount){
						range = selection.getRangeAt(0);
						if(range && range.startContainer){
							if(!range.collapsed){
								range.deleteContents();
								selection = rangeapi.getSelection(this.editor.window);
								range = selection.getRangeAt(0);
							}
							rs = range.startContainer;
							if(rs && rs.nodeType == 3){
								// Text node, we have to split it.

								var offset = range.startOffset;
								if(rs.length < offset){
									//We are not splitting the right node, try to locate the correct one
									ret = this._adjustNodeAndOffset(rs, offset);
									rs = ret.node;
									offset = ret.offset;
								}
								txt = rs.nodeValue;

								startNode = doc.createTextNode(txt.substring(0, offset));
								endNode = doc.createTextNode(txt.substring(offset));
								brNode = doc.createElement("br");

								if(!endNode.length){
									// Create dummy text with a &nbsp to go after the BR, to prevent IE crash.
									// See https://bugs.dojotoolkit.org/ticket/12008 for details.
									endNode = doc.createTextNode('\xA0');
								}

								if(startNode.length){
									domConstruct.place(startNode, rs, "after");
								}else{
									startNode = rs;
								}
								domConstruct.place(brNode, startNode, "after");
								domConstruct.place(endNode, brNode, "after");
								domConstruct.destroy(rs);
								newrange = rangeapi.create(this.editor.window);
								newrange.setStart(endNode, 0);
								newrange.setEnd(endNode, endNode.length);
								selection.removeAllRanges();
								selection.addRange(newrange);
								this.editor.selection.collapse(true);
							}else{
								var targetNode;
								if(range.startOffset >= 0){
									targetNode = rs.childNodes[range.startOffset];
								}
								var brNode = doc.createElement("br");
								var endNode = doc.createTextNode('\xA0');
								if(!targetNode){
									rs.appendChild(brNode);
									rs.appendChild(endNode);
								}else{
									domConstruct.place(brNode, targetNode, "before");
									domConstruct.place(endNode, brNode, "after");
								}
								newrange = rangeapi.create(this.editor.window);
								newrange.setStart(endNode, 0);
								newrange.setEnd(endNode, endNode.length);
								selection.removeAllRanges();
								selection.addRange(newrange);
								this.editor.selection.collapse(true);
							}
							// \xA0 dummy text node remains, but is stripped before get("value")
							// by RichText._stripTrailingEmptyNodes().  Still, could we just use a plain
							// space (" ") instead?
						}
					}else{
						// don't change this: do not call this.execCommand, as that may have other logic in subclass
						RichText.prototype.execCommand.call(this.editor, 'inserthtml', '<br>');
					}
				}
				return false;
			}
			var _letBrowserHandle = true;

			// first remove selection
			selection = rangeapi.getSelection(this.editor.window);
			range = selection.getRangeAt(0);
			if(!range.collapsed){
				range.deleteContents();
				selection = rangeapi.getSelection(this.editor.window);
				range = selection.getRangeAt(0);
			}

			var block = rangeapi.getBlockAncestor(range.endContainer, null, this.editor.editNode);
			var blockNode = block.blockNode;

			// if this is under a LI or the parent of the blockNode is LI, just let browser to handle it
			if((this._checkListLater = (blockNode && (blockNode.nodeName == 'LI' || blockNode.parentNode.nodeName == 'LI')))){
				if(has("mozilla")){
					// press enter in middle of P may leave a trailing <br/>, let's remove it later
					this._pressedEnterInBlock = blockNode;
				}
				// if this li only contains spaces, set the content to empty so the browser will outdent this item
				if(/^(\s|&nbsp;|&#160;|\xA0|<span\b[^>]*\bclass=['"]Apple-style-span['"][^>]*>(\s|&nbsp;|&#160;|\xA0)<\/span>)?(<br>)?$/.test(blockNode.innerHTML)){
					// empty LI node
					blockNode.innerHTML = '';
					if(has("webkit")){ // WebKit tosses the range when innerHTML is reset
						newrange = rangeapi.create(this.editor.window);
						newrange.setStart(blockNode, 0);
						selection.removeAllRanges();
						selection.addRange(newrange);
					}
					this._checkListLater = false; // nothing to check since the browser handles outdent
				}
				return true;
			}

			// text node directly under body, let's wrap them in a node
			if(!block.blockNode || block.blockNode === this.editor.editNode){
				try{
					RichText.prototype.execCommand.call(this.editor, 'formatblock', this.blockNodeForEnter);
				}catch(e2){ /*squelch FF3 exception bug when editor content is a single BR*/
				}
				// get the newly created block node
				// FIXME
				block = {blockNode: this.editor.selection.getAncestorElement(this.blockNodeForEnter),
					blockContainer: this.editor.editNode};
				if(block.blockNode){
					if(block.blockNode != this.editor.editNode &&
						(!(block.blockNode.textContent || block.blockNode.innerHTML).replace(/^\s+|\s+$/g, "").length)){
						this.removeTrailingBr(block.blockNode);
						return false;
					}
				}else{    // we shouldn't be here if formatblock worked
					block.blockNode = this.editor.editNode;
				}
				selection = rangeapi.getSelection(this.editor.window);
				range = selection.getRangeAt(0);
			}

			var newblock = doc.createElement(this.blockNodeForEnter);
			newblock.innerHTML = this.bogusHtmlContent;
			this.removeTrailingBr(block.blockNode);
			var endOffset = range.endOffset;
			var node = range.endContainer;
			if(node.length < endOffset){
				//We are not checking the right node, try to locate the correct one
				var ret = this._adjustNodeAndOffset(node, endOffset);
				node = ret.node;
				endOffset = ret.offset;
			}
			if(rangeapi.atEndOfContainer(block.blockNode, node, endOffset)){
				if(block.blockNode === block.blockContainer){
					block.blockNode.appendChild(newblock);
				}else{
					domConstruct.place(newblock, block.blockNode, "after");
				}
				_letBrowserHandle = false;
				// lets move caret to the newly created block
				newrange = rangeapi.create(this.editor.window);
				newrange.setStart(newblock, 0);
				selection.removeAllRanges();
				selection.addRange(newrange);
				if(this.editor.height){
					winUtils.scrollIntoView(newblock);
				}
			}else if(rangeapi.atBeginningOfContainer(block.blockNode,
				range.startContainer, range.startOffset)){
				domConstruct.place(newblock, block.blockNode, block.blockNode === block.blockContainer ? "first" : "before");
				if(newblock.nextSibling && this.editor.height){
					// position input caret - mostly WebKit needs this
					newrange = rangeapi.create(this.editor.window);
					newrange.setStart(newblock.nextSibling, 0);
					selection.removeAllRanges();
					selection.addRange(newrange);
					// browser does not scroll the caret position into view, do it manually
					winUtils.scrollIntoView(newblock.nextSibling);
				}
				_letBrowserHandle = false;
			}else{ //press enter in the middle of P/DIV/Whatever/
				if(block.blockNode === block.blockContainer){
					block.blockNode.appendChild(newblock);
				}else{
					domConstruct.place(newblock, block.blockNode, "after");
				}
				_letBrowserHandle = false;

				// Clone any block level styles.
				if(block.blockNode.style){
					if(newblock.style){
						if(block.blockNode.style.cssText){
							newblock.style.cssText = block.blockNode.style.cssText;
						}
					}
				}

				// Okay, we probably have to split.
				rs = range.startContainer;
				var firstNodeMoved;
				if(rs && rs.nodeType == 3){
					// Text node, we have to split it.
					var nodeToMove, tNode;
					endOffset = range.endOffset;
					if(rs.length < endOffset){
						//We are not splitting the right node, try to locate the correct one
						ret = this._adjustNodeAndOffset(rs, endOffset);
						rs = ret.node;
						endOffset = ret.offset;
					}

					txt = rs.nodeValue;
					startNode = doc.createTextNode(txt.substring(0, endOffset));
					endNode = doc.createTextNode(txt.substring(endOffset, txt.length));

					// Place the split, then remove original nodes.
					domConstruct.place(startNode, rs, "before");
					domConstruct.place(endNode, rs, "after");
					domConstruct.destroy(rs);

					// Okay, we split the text.  Now we need to see if we're
					// parented to the block element we're splitting and if
					// not, we have to split all the way up.  Ugh.
					var parentC = startNode.parentNode;
					while(parentC !== block.blockNode){
						var tg = parentC.tagName;
						var newTg = doc.createElement(tg);
						// Clone over any 'style' data.
						if(parentC.style){
							if(newTg.style){
								if(parentC.style.cssText){
									newTg.style.cssText = parentC.style.cssText;
								}
							}
						}
						// If font also need to clone over any font data.
						if(parentC.tagName === "FONT"){
							if(parentC.color){
								newTg.color = parentC.color;
							}
							if(parentC.face){
								newTg.face = parentC.face;
							}
							if(parentC.size){  // this check was necessary on IE
								newTg.size = parentC.size;
							}
						}

						nodeToMove = endNode;
						while(nodeToMove){
							tNode = nodeToMove.nextSibling;
							newTg.appendChild(nodeToMove);
							nodeToMove = tNode;
						}
						domConstruct.place(newTg, parentC, "after");
						startNode = parentC;
						endNode = newTg;
						parentC = parentC.parentNode;
					}

					// Lastly, move the split out tags to the new block.
					// as they should now be split properly.
					nodeToMove = endNode;
					if(nodeToMove.nodeType == 1 || (nodeToMove.nodeType == 3 && nodeToMove.nodeValue)){
						// Non-blank text and non-text nodes need to clear out that blank space
						// before moving the contents.
						newblock.innerHTML = "";
					}
					firstNodeMoved = nodeToMove;
					while(nodeToMove){
						tNode = nodeToMove.nextSibling;
						newblock.appendChild(nodeToMove);
						nodeToMove = tNode;
					}
				}

				//lets move caret to the newly created block
				newrange = rangeapi.create(this.editor.window);
				var nodeForCursor;
				var innerMostFirstNodeMoved = firstNodeMoved;
				if(this.blockNodeForEnter !== 'BR'){
					while(innerMostFirstNodeMoved){
						nodeForCursor = innerMostFirstNodeMoved;
						tNode = innerMostFirstNodeMoved.firstChild;
						innerMostFirstNodeMoved = tNode;
					}
					if(nodeForCursor && nodeForCursor.parentNode){
						newblock = nodeForCursor.parentNode;
						newrange.setStart(newblock, 0);
						selection.removeAllRanges();
						selection.addRange(newrange);
						if(this.editor.height){
							winUtils.scrollIntoView(newblock);
						}
						if(has("mozilla")){
							// press enter in middle of P may leave a trailing <br/>, let's remove it later
							this._pressedEnterInBlock = block.blockNode;
						}
					}else{
						_letBrowserHandle = true;
					}
				}else{
					newrange.setStart(newblock, 0);
					selection.removeAllRanges();
					selection.addRange(newrange);
					if(this.editor.height){
						winUtils.scrollIntoView(newblock);
					}
					if(has("mozilla")){
						// press enter in middle of P may leave a trailing <br/>, let's remove it later
						this._pressedEnterInBlock = block.blockNode;
					}
				}
			}
			return _letBrowserHandle;
		},

		_adjustNodeAndOffset: function(/*DomNode*/node, /*Int*/offset){
			// summary:
			//		In the case there are multiple text nodes in a row the offset may not be within the node.  If the offset is larger than the node length, it will attempt to find
			//		the next text sibling until it locates the text node in which the offset refers to
			// node:
			//		The node to check.
			// offset:
			//		The position to find within the text node
			// tags:
			//		private.
			while(node.length < offset && node.nextSibling && node.nextSibling.nodeType == 3){
				//Adjust the offset and node in the case of multiple text nodes in a row
				offset = offset - node.length;
				node = node.nextSibling;
			}
			return {"node": node, "offset": offset};
		},

		removeTrailingBr: function(container){
			// summary:
			//		If last child of container is a `<br>`, then remove it.
			// tags:
			//		private
			var para = /P|DIV|LI/i.test(container.tagName) ?
				container : this.editor.selection.getParentOfType(container, ['P', 'DIV', 'LI']);

			if(!para){
				return;
			}
			if(para.lastChild){
				if((para.childNodes.length > 1 && para.lastChild.nodeType == 3 && /^[\s\xAD]*$/.test(para.lastChild.nodeValue)) ||
					para.lastChild.tagName == 'BR'){

					domConstruct.destroy(para.lastChild);
				}
			}
			if(!para.childNodes.length){
				para.innerHTML = this.bogusHtmlContent;
			}
		}
	});

});
