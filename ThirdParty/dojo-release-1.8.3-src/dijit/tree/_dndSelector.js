define([
	"dojo/_base/array", // array.filter array.forEach array.map
	"dojo/_base/connect", // connect.isCopyKey
	"dojo/_base/declare", // declare
	"dojo/_base/Deferred", // Deferred
	"dojo/_base/kernel",	// global
	"dojo/_base/lang", // lang.hitch
	"dojo/cookie", // cookie
	"dojo/mouse", // mouse.isLeft
	"dojo/on",
	"dojo/touch",
	"./_dndContainer"
], function(array, connect, declare, Deferred, kernel, lang, cookie, mouse, on, touch, _dndContainer){

	// module:
	//		dijit/tree/_dndSelector


	return declare("dijit.tree._dndSelector", _dndContainer, {
		// summary:
		//		This is a base class for `dijit/tree/dndSource` , and isn't meant to be used directly.
		//		It's based on `dojo/dnd/Selector`.
		// tags:
		//		protected

		/*=====
		// selection: Object
		//		(id to DomNode) map for every TreeNode that's currently selected.
		//		The DOMNode is the TreeNode.rowNode.
		selection: {},
		=====*/

		constructor: function(){
			// summary:
			//		Initialization
			// tags:
			//		private

			this.selection={};
			this.anchor = null;

			if(!this.cookieName && this.tree.id){
				this.cookieName = this.tree.id + "SaveSelectedCookie";
			}

			this.events.push(
				on(this.tree.domNode, touch.press, lang.hitch(this,"onMouseDown")),
				on(this.tree.domNode, touch.release, lang.hitch(this,"onMouseUp")),
				on(this.tree.domNode, touch.move, lang.hitch(this,"onMouseMove"))
			);
		},

		// singular: Boolean
		//		Allows selection of only one element, if true.
		//		Tree hasn't been tested in singular=true mode, unclear if it works.
		singular: false,

		// methods
		getSelectedTreeNodes: function(){
			// summary:
			//		Returns a list of selected node(s).
			//		Used by dndSource on the start of a drag.
			// tags:
			//		protected
			var nodes=[], sel = this.selection;
			for(var i in sel){
				nodes.push(sel[i]);
			}
			return nodes;
		},

		selectNone: function(){
			// summary:
			//		Unselects all items
			// tags:
			//		private

			this.setSelection([]);
			return this;	// self
		},

		destroy: function(){
			// summary:
			//		Prepares the object to be garbage-collected
			this.inherited(arguments);
			this.selection = this.anchor = null;
		},
		addTreeNode: function(/*dijit/Tree._TreeNode*/ node, /*Boolean?*/isAnchor){
			// summary:
			//		add node to current selection
			// node: Node
			//		node to add
			// isAnchor: Boolean
			//		Whether the node should become anchor.

			this.setSelection(this.getSelectedTreeNodes().concat( [node] ));
			if(isAnchor){ this.anchor = node; }
			return node;
		},
		removeTreeNode: function(/*dijit/Tree._TreeNode*/ node){
			// summary:
			//		remove node from current selection
			// node: Node
			//		node to remove
			this.setSelection(this._setDifference(this.getSelectedTreeNodes(), [node]));
			return node;
		},
		isTreeNodeSelected: function(/*dijit/Tree._TreeNode*/ node){
			// summary:
			//		return true if node is currently selected
			// node: Node
			//		the node to check whether it's in the current selection

			return node.id && !!this.selection[node.id];
		},
		setSelection: function(/*dijit/Tree._TreeNode[]*/ newSelection){
			// summary:
			//		set the list of selected nodes to be exactly newSelection. All changes to the
			//		selection should be passed through this function, which ensures that derived
			//		attributes are kept up to date. Anchor will be deleted if it has been removed
			//		from the selection, but no new anchor will be added by this function.
			// newSelection: Node[]
			//		list of tree nodes to make selected
			var oldSelection = this.getSelectedTreeNodes();
			array.forEach(this._setDifference(oldSelection, newSelection), lang.hitch(this, function(node){
				node.setSelected(false);
				if(this.anchor == node){
					delete this.anchor;
				}
				delete this.selection[node.id];
			}));
			array.forEach(this._setDifference(newSelection, oldSelection), lang.hitch(this, function(node){
				node.setSelected(true);
				this.selection[node.id] = node;
			}));
			this._updateSelectionProperties();
		},
		_setDifference: function(xs,ys){
			// summary:
			//		Returns a copy of xs which lacks any objects
			//		occurring in ys. Checks for membership by
			//		modifying and then reading the object, so it will
			//		not properly handle sets of numbers or strings.

			array.forEach(ys, function(y){ y.__exclude__ = true; });
			var ret = array.filter(xs, function(x){ return !x.__exclude__; });

			// clean up after ourselves.
			array.forEach(ys, function(y){ delete y['__exclude__'] });
			return ret;
		},
		_updateSelectionProperties: function(){
			// summary:
			//		Update the following tree properties from the current selection:
			//		path[s], selectedItem[s], selectedNode[s]

			var selected = this.getSelectedTreeNodes();
			var paths = [], nodes = [], selects = [];
			array.forEach(selected, function(node){
				var ary = node.getTreePath(), model = this.tree.model;
				nodes.push(node);
				paths.push(ary);
				ary = array.map(ary, function(item){
					return model.getIdentity(item);
				}, this);
				selects.push(ary.join("/"))
			}, this);
			var items = array.map(nodes,function(node){ return node.item; });
			this.tree._set("paths", paths);
			this.tree._set("path", paths[0] || []);
			this.tree._set("selectedNodes", nodes);
			this.tree._set("selectedNode", nodes[0] || null);
			this.tree._set("selectedItems", items);
			this.tree._set("selectedItem", items[0] || null);
            if (this.tree.persist && selects.length > 0) {
                cookie(this.cookieName, selects.join(","), {expires:365});
            }
		},
		_getSavedPaths: function(){
			// summary:
			//		Returns paths of nodes that were selected previously and saved in the cookie.

			var tree = this.tree;
			if(tree.persist && tree.dndController.cookieName){
				var oreo, paths = [];
				oreo = cookie(tree.dndController.cookieName);
				if(oreo){
					paths = array.map(oreo.split(","), function(path){
					   return path.split("/");
					})
				}
				return paths;
			}
		},
		// mouse events
		onMouseDown: function(e){
			// summary:
			//		Event processor for onmousedown/ontouchstart
			// e: Event
			//		onmousedown/ontouchstart event
			// tags:
			//		protected

			// ignore click on expando node
			if(!this.current || this.tree.isExpandoNode(e.target, this.current)){ return; }

			if(mouse.isLeft(e)){
				// Prevent text selection while dragging on desktop, see #16328.   But don't call preventDefault()
				// for mobile because it will break things completely, see #15838.
				e.preventDefault();
			}else if(e.type != "touchstart"){
				// Ignore right click
				return;
			}

			var treeNode = this.current,
			  copy = connect.isCopyKey(e), id = treeNode.id;

			// if shift key is not pressed, and the node is already in the selection,
			// delay deselection until onmouseup so in the case of DND, deselection
			// will be canceled by onmousemove.
			if(!this.singular && !e.shiftKey && this.selection[id]){
				this._doDeselect = true;
				return;
			}else{
				this._doDeselect = false;
			}
			this.userSelect(treeNode, copy, e.shiftKey);
		},

		onMouseUp: function(e){
			// summary:
			//		Event processor for onmouseup/ontouchend
			// e: Event
			//		onmouseup/ontouchend event
			// tags:
			//		protected

			// _doDeselect is the flag to indicate that the user wants to either ctrl+click on
			// a already selected item (to deselect the item), or click on a not-yet selected item
			// (which should remove all current selection, and add the clicked item). This can not
			// be done in onMouseDown, because the user may start a drag after mousedown. By moving
			// the deselection logic here, the user can drags an already selected item.
			if(!this._doDeselect){ return; }
			this._doDeselect = false;
			this.userSelect(this.current, connect.isCopyKey(e), e.shiftKey);
		},
		onMouseMove: function(/*===== e =====*/){
			// summary:
			//		event processor for onmousemove/ontouchmove
			// e: Event
			//		onmousemove/ontouchmove event
			this._doDeselect = false;
		},

		_compareNodes: function(n1, n2){
			if(n1 === n2){
				return 0;
			}

			if('sourceIndex' in document.documentElement){ //IE
				//TODO: does not yet work if n1 and/or n2 is a text node
				return n1.sourceIndex - n2.sourceIndex;
			}else if('compareDocumentPosition' in document.documentElement){ //FF, Opera
				return n1.compareDocumentPosition(n2) & 2 ? 1: -1;
			}else if(document.createRange){ //Webkit
				var r1 = doc.createRange();
				r1.setStartBefore(n1);

				var r2 = doc.createRange();
				r2.setStartBefore(n2);

				return r1.compareBoundaryPoints(r1.END_TO_END, r2);
			}else{
				throw Error("dijit.tree._compareNodes don't know how to compare two different nodes in this browser");
			}
		},

		userSelect: function(node, multi, range){
			// summary:
			//		Add or remove the given node from selection, responding
			//		to a user action such as a click or keypress.
			// multi: Boolean
			//		Indicates whether this is meant to be a multi-select action (e.g. ctrl-click)
			// range: Boolean
			//		Indicates whether this is meant to be a ranged action (e.g. shift-click)
			// tags:
			//		protected

			if(this.singular){
				if(this.anchor == node && multi){
					this.selectNone();
				}else{
					this.setSelection([node]);
					this.anchor = node;
				}
			}else{
				if(range && this.anchor){
					var cr = this._compareNodes(this.anchor.rowNode, node.rowNode),
					begin, end, anchor = this.anchor;

					if(cr < 0){ //current is after anchor
						begin = anchor;
						end = node;
					}else{ //current is before anchor
						begin = node;
						end = anchor;
					}
					var nodes = [];
					//add everything betweeen begin and end inclusively
					while(begin != end){
						nodes.push(begin);
						begin = this.tree._getNextNode(begin);
					}
					nodes.push(end);

					this.setSelection(nodes);
				}else{
					if( this.selection[ node.id ] && multi ){
						this.removeTreeNode( node );
					}else if(multi){
						this.addTreeNode(node, true);
					}else{
						this.setSelection([node]);
						this.anchor = node;
					}
				}
			}
		},

		getItem: function(/*String*/ key){
			// summary:
			//		Returns the dojo/dnd/Container._Item (representing a dragged node) by it's key (id).
			//		Called by dojo/dnd/Source.checkAcceptance().
			// tags:
			//		protected

			var widget = this.selection[key];
			return {
				data: widget,
				type: ["treeNode"]
			}; // dojo/dnd/Container._Item
		},

		forInSelectedItems: function(/*Function*/ f, /*Object?*/ o){
			// summary:
			//		Iterates over selected items;
			//		see `dojo/dnd/Container.forInItems()` for details
			o = o || kernel.global;
			for(var id in this.selection){
				// console.log("selected item id: " + id);
				f.call(o, this.getItem(id), id, this);
			}
		}
	});
});
