define([
	"dojo",
	"dijit",
	"dojox",
	"dijit/_editor/range",
	"dijit/_editor/selection",
	"dijit/_editor/_Plugin",
	"dijit/form/Button",
	"dojo/_base/connect",
	"dojo/_base/declare",
	"dojo/string"
], function(dojo, dijit, dojox, range, selection, _Plugin) {

dojo.declare("dojox.editor.plugins.AutoUrlLink", [_Plugin], {
	// summary:
	//		This plugin can recognize a URL like string
	//		(such as http://www.website.com) and turn it into
	//		a hyperlink that points to that URL.
	
	// _template: [private] String
	//		The link template
	_template: "<a _djrealurl='${url}' href='${url}'>${url}</a>",
	
	setEditor: function(/*dijit.Editor*/ editor){
		// summary:
		//		Called by the editor it belongs to.
		// editor:
		//		The editor it belongs to.
		this.editor = editor;
		if(!dojo.isIE){
			// IE will recognize URL as a link automatically
			// No need to re-invent the wheel.
			dojo.some(editor._plugins, function(plugin){
				// Need to detect which enter key mode it is now
				if(plugin.isInstanceOf(dijit._editor.plugins.EnterKeyHandling)){
					this.blockNodeForEnter = plugin.blockNodeForEnter;
					return true;
				}
				return false;
			}, this);
			this.connect(editor, "onKeyPress", "_keyPress");
			this.connect(editor, "onClick", "_recognize");
			this.connect(editor, "onBlur", "_recognize");
		}
	},
	
	_keyPress: function(evt){
		// summary:
		//		Handle the keypress event and dispatch it to the target handler
		// evt:
		//		The keypress event object.
		// tags:
		//		protected
		var ks = dojo.keys, v = 118, V = 86,
			kc = evt.keyCode, cc = evt.charCode;
		if(cc == ks.SPACE || (evt.ctrlKey && (cc == v || cc == V))){
			setTimeout(dojo.hitch(this, "_recognize"), 0);
		}else if(kc == ks.ENTER){
			// Handle the enter event after EnterKeyHandling finishes its job
			setTimeout(dojo.hitch(this, function(){
				this._recognize({enter: true});
			}), 0);
		}else{
			// _saved: The previous dom node when the cursor is at a new dom node.
			// When we click elsewhere, the previous dom node
			// should be examed to see if there is any URL need to be activated
			this._saved = this.editor.window.getSelection().anchorNode;
		}
	},
	
	_recognize: function(args){
		// summary:
		//		Recognize the URL like strings and turn them into a link
		// tags:
		//		private
		var template = this._template,
			isEnter = args ? args.enter : false,
			ed = this.editor,
			selection = ed.window.getSelection();
		console.log("_recognize: isEnter = ", isEnter, ", selection is ", selection,  selection.anchorNode, this._findLastEditingNode(selection.anchorNode))
			if(selection){
				var node = isEnter ? this._findLastEditingNode(selection.anchorNode) :
								(this._saved || selection.anchorNode),
				bm = this._saved = selection.anchorNode,
				bmOff = selection.anchorOffset;
			
			if(node.nodeType == 3 && !this._inLink(node)){
				var linked = false, result = this._findUrls(node, bm, bmOff),
					range = ed.document.createRange(),
					item, cost = 0, isSameNode = (bm == node);
						
				item = result.shift();
				while(item){
					// Covert a URL to a link.
					range.setStart(node, item.start);
					range.setEnd(node, item.end);
					selection.removeAllRanges();
					selection.addRange(range);
					ed.execCommand("insertHTML", dojo.string.substitute(template, {url: range.toString()}));
					cost += item.end;
					item = result.shift();
					linked = true;
				}
				
				// If bm and node are the some dom node, caculate the actual bookmark offset
				// If the position of the cursor is modified (turned into a link, etc.), no
				// need to recover the cursor position
				if(isSameNode && (bmOff = bmOff - cost) <= 0){ return; }
	
				// We didn't update anything, so don't collapse selections.
				if(!linked) { return ; }
				try{
					// Try to recover the cursor position
					range.setStart(bm, 0);
					range.setEnd(bm, bmOff);
					selection.removeAllRanges();
					selection.addRange(range);
					ed._sCall("collapse", []);
				}catch(e){}
			}
		}
	},
	
	_inLink: function(/*DomNode*/ node){
		// summary:
		//		Check if the node is already embraced within a `<a>...</a>` tag.
		// node:
		//		The node to be examined.
		// tags:
		//		private
		var editNode = this.editor.editNode,
			result = false, tagName;
			
		node = node.parentNode;
		while(node && node !== editNode){
			tagName = node.tagName ? node.tagName.toLowerCase() : "";
			if(tagName == "a"){
				result = true;
				break;
			}
			node = node.parentNode;
		}
		return result;
	},
	
	_findLastEditingNode: function(/*DomNode*/ node){
		// summary:
		//		Find the last node that was edited so that we can
		//		get the last edited text.
		// node:
		//		The current node that the cursor is at.
		// tags:
		//		private
		var blockTagNames = dijit.range.BlockTagNames,
			editNode = this.editor.editNode, blockNode;

		if(!node){ return node; }
		if(this.blockNodeForEnter == "BR" &&
				(!(blockNode = dijit.range.getBlockAncestor(node, null, editNode).blockNode) ||
				blockNode.tagName.toUpperCase() != "LI")){
			while((node = node.previousSibling) && node.nodeType != 3){}
		}else{
			// EnterKeyHandling is under "DIV" or "P" mode or
			// it's in a LI element. Find the last editing block
			if((blockNode || (blockNode = dijit.range.getBlockAncestor(node, null, editNode).blockNode)) &&
					blockNode.tagName.toUpperCase() == "LI"){
				node = blockNode;
			}else{
				node = dijit.range.getBlockAncestor(node, null, editNode).blockNode;
			}
			// Find the last editing text node
			while((node = node.previousSibling) && !(node.tagName && node.tagName.match(blockTagNames))){}
			if(node){
				node = node.lastChild;
				while(node){
					if(node.nodeType == 3 && dojo.trim(node.nodeValue) != ""){
						break;
					}else if(node.nodeType == 1){
						node = node.lastChild;
					}else{
						node = node.previousSibling;
					}
				}
			}
		}
		return node;
	},
	
	_findUrls: function(/*DomNode*/ node, /*DomNode*/ bm, /*Number*/ bmOff){
		// summary:
		//		Find the occurrace of the URL strings.
		//		FF, Chrome && Safri have a behavior that when insertHTML is executed,
		//		the orignal referrence to the text node will be the text node next to
		//		the inserted anchor automatically. So we have to re-caculate the index of
		//		the following URL occurrence.
		// value:
		//		A text to be scanned.
		// tags:
		//		private
		var pattern = /(http|https|ftp):\/\/[^\s]+/ig,
			list = [], baseIndex = 0,
			value = node.nodeValue, result, ch;
		
		if(node === bm && bmOff < value.length){
			// Break the text so that it may not grab extra words.
			// Such as if you type:
			// foo http://foo.com|bar (And | is where you press enter).
			// It will grab the bar word as part of the link. That's annoying/bad.
			// Also it prevents recognizing the text after the cursor.
			value = value.substr(0, bmOff);
		}
		
		while((result = pattern.exec(value)) != null){
			if(result.index == 0 || (ch = value.charAt(result.index - 1)) == " " || ch == "\xA0"){
				list.push({start: result.index - baseIndex, end: result.index + result[0].length - baseIndex});
				baseIndex = result.index + result[0].length;
			}
		}

		return list;
	}
});

// Register this plugin.
dojo.subscribe(dijit._scopeName + ".Editor.getPlugin",null,function(o){
	if(o.plugin){ return; }
	var name = o.args.name.toLowerCase();
	if(name ===  "autourllink"){
		o.plugin = new dojox.editor.plugins.AutoUrlLink();
	}
});

return dojox.editor.plugins.AutoUrlLink;

});
