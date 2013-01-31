define([
	"dojo/_base/array", // array.forEach array.indexOf array.map
	"dojo/_base/connect", // isCopyKey
	"dojo/_base/declare", // declare
	"dojo/dom-class", // domClass.add
	"dojo/dom-geometry", // domGeometry.position
	"dojo/_base/lang", // lang.mixin lang.hitch
	"dojo/on", // subscribe
	"dojo/touch",
	"dojo/topic",
	"dojo/dnd/Manager", // DNDManager.manager
	"./_dndSelector"
], function(array, connect, declare, domClass, domGeometry, lang, on, touch, topic, DNDManager, _dndSelector){

// module:
//		dijit/tree/dndSource
// summary:
//		Handles drag and drop operations (as a source or a target) for `dijit.Tree`

/*=====
var __Item = {
	// summary:
	//		New item to be added to the Tree, like:
	// id: Anything
	id: "",
	// name: String
	name: ""
};
=====*/

var dndSource = declare("dijit.tree.dndSource", _dndSelector, {
	// summary:
	//		Handles drag and drop operations (as a source or a target) for `dijit.Tree`

	// isSource: Boolean
	//		Can be used as a DnD source.
	isSource: true,

	// accept: String[]
	//		List of accepted types (text strings) for the Tree; defaults to
	//		["text"]
	accept: ["text", "treeNode"],

	// copyOnly: [private] Boolean
	//		Copy items, if true, use a state of Ctrl key otherwise
	copyOnly: false,

	// dragThreshold: Number
	//		The move delay in pixels before detecting a drag; 5 by default
	dragThreshold: 5,

	// betweenThreshold: Integer
	//		Distance from upper/lower edge of node to allow drop to reorder nodes
	betweenThreshold: 0,

	// Flag used by Avatar.js to signal to generate text node when dragging
	generateText: true,

	constructor: function(/*dijit/Tree*/ tree, /*dijit/tree/dndSource*/ params){
		// summary:
		//		a constructor of the Tree DnD Source
		// tags:
		//		private
		if(!params){ params = {}; }
		lang.mixin(this, params);
		var type = params.accept instanceof Array ? params.accept : ["text", "treeNode"];
		this.accept = null;
		if(type.length){
			this.accept = {};
			for(var i = 0; i < type.length; ++i){
				this.accept[type[i]] = 1;
			}
		}

		// class-specific variables
		this.isDragging = false;
		this.mouseDown = false;
		this.targetAnchor = null;	// DOMNode corresponding to the currently moused over TreeNode
		this.targetBox = null;	// coordinates of this.targetAnchor
		this.dropPosition = "";	// whether mouse is over/after/before this.targetAnchor
		this._lastX = 0;
		this._lastY = 0;

		// states
		this.sourceState = "";
		if(this.isSource){
			domClass.add(this.node, "dojoDndSource");
		}
		this.targetState = "";
		if(this.accept){
			domClass.add(this.node, "dojoDndTarget");
		}

		// set up events
		this.topics = [
			topic.subscribe("/dnd/source/over", lang.hitch(this, "onDndSourceOver")),
			topic.subscribe("/dnd/start", lang.hitch(this, "onDndStart")),
			topic.subscribe("/dnd/drop", lang.hitch(this, "onDndDrop")),
			topic.subscribe("/dnd/cancel", lang.hitch(this, "onDndCancel"))
		];
	},

	// methods
	checkAcceptance: function(/*===== source, nodes =====*/){
		// summary:
		//		Checks if the target can accept nodes from this source
		// source: dijit/tree/dndSource
		//		The source which provides items
		// nodes: DOMNode[]
		//		Array of DOM nodes corresponding to nodes being dropped, dijitTreeRow nodes if
		//		source is a dijit/Tree.
		// tags:
		//		extension
		return true;	// Boolean
	},

	copyState: function(keyPressed){
		// summary:
		//		Returns true, if we need to copy items, false to move.
		//		It is separated to be overwritten dynamically, if needed.
		// keyPressed: Boolean
		//		The "copy" control key was pressed
		// tags:
		//		protected
		return this.copyOnly || keyPressed;	// Boolean
	},
	destroy: function(){
		// summary:
		//		Prepares the object to be garbage-collected.
		this.inherited(arguments);
		var h;
		while(h = this.topics.pop()){ h.remove(); }
		this.targetAnchor = null;
	},

	_onDragMouse: function(e, firstTime){
		// summary:
		//		Helper method for processing onmousemove/onmouseover events while drag is in progress.
		//		Keeps track of current drop target.
		// e: Event
		//		The mousemove event.
		// firstTime: Boolean?
		//		If this flag is set, this is the first mouse move event of the drag, so call m.canDrop() etc.
		//		even if newTarget == null because the user quickly dragged a node in the Tree to a position
		//		over Tree.containerNode but not over any TreeNode (#7971)

		var m = DNDManager.manager(),
			oldTarget = this.targetAnchor,			// the TreeNode corresponding to TreeNode mouse was previously over
			newTarget = this.current,				// TreeNode corresponding to TreeNode mouse is currently over
			oldDropPosition = this.dropPosition;	// the previous drop position (over/before/after)

		// calculate if user is indicating to drop the dragged node before, after, or over
		// (i.e., to become a child of) the target node
		var newDropPosition = "Over";
		if(newTarget && this.betweenThreshold > 0){
			// If mouse is over a new TreeNode, then get new TreeNode's position and size
			if(!this.targetBox || oldTarget != newTarget){
				this.targetBox = domGeometry.position(newTarget.rowNode, true);
			}
			if((e.pageY - this.targetBox.y) <= this.betweenThreshold){
				newDropPosition = "Before";
			}else if((e.pageY - this.targetBox.y) >= (this.targetBox.h - this.betweenThreshold)){
				newDropPosition = "After";
			}
		}

		if(firstTime || newTarget != oldTarget || newDropPosition != oldDropPosition){
			if(oldTarget){
				this._removeItemClass(oldTarget.rowNode, oldDropPosition);
			}
			if(newTarget){
				this._addItemClass(newTarget.rowNode, newDropPosition);
			}

			// Check if it's ok to drop the dragged node on/before/after the target node.
			if(!newTarget){
				m.canDrop(false);
			}else if(newTarget == this.tree.rootNode && newDropPosition != "Over"){
				// Can't drop before or after tree's root node; the dropped node would just disappear (at least visually)
				m.canDrop(false);
			}else{
				// Guard against dropping onto yourself (TODO: guard against dropping onto your descendant, #7140)
				var sameId = false;
				if(m.source == this){
					for(var dragId in this.selection){
						var dragNode = this.selection[dragId];
						if(dragNode.item === newTarget.item){
							sameId = true;
							break;
						}
					}
				}
				if(sameId){
					m.canDrop(false);
				}else if(this.checkItemAcceptance(newTarget.rowNode, m.source, newDropPosition.toLowerCase())
						&& !this._isParentChildDrop(m.source, newTarget.rowNode)){
					m.canDrop(true);
				}else{
					m.canDrop(false);
				}
			}

			this.targetAnchor = newTarget;
			this.dropPosition = newDropPosition;
		}
	},

	onMouseMove: function(e){
		// summary:
		//		Called for any onmousemove/ontouchmove events over the Tree
		// e: Event
		//		onmousemouse/ontouchmove event
		// tags:
		//		private
		if(this.isDragging && this.targetState == "Disabled"){ return; }
		this.inherited(arguments);
		var m = DNDManager.manager();
		if(this.isDragging){
			this._onDragMouse(e);
		}else{
			if(this.mouseDown && this.isSource &&
				 (Math.abs(e.pageX-this._lastX)>=this.dragThreshold || Math.abs(e.pageY-this._lastY)>=this.dragThreshold)){
				var nodes = this.getSelectedTreeNodes();
				if(nodes.length){
					if(nodes.length > 1){
						//filter out all selected items which has one of their ancestor selected as well
						var seen = this.selection, i = 0, r = [], n, p;
						nextitem: while((n = nodes[i++])){
							for(p = n.getParent(); p && p !== this.tree; p = p.getParent()){
								if(seen[p.id]){ //parent is already selected, skip this node
									continue nextitem;
								}
							}
							//this node does not have any ancestors selected, add it
							r.push(n);
						}
						nodes = r;
					}
					nodes = array.map(nodes, function(n){return n.domNode});
					m.startDrag(this, nodes, this.copyState(connect.isCopyKey(e)));
					this._onDragMouse(e, true);	// because this may be the only mousemove event we get before the drop
				}
			}
		}
	},

	onMouseDown: function(e){
		// summary:
		//		Event processor for onmousedown/ontouchstart
		// e: Event
		//		onmousedown/ontouchend event
		// tags:
		//		private
		this.mouseDown = true;
		this.mouseButton = e.button;
		this._lastX = e.pageX;
		this._lastY = e.pageY;
		this.inherited(arguments);
	},

	onMouseUp: function(e){
		// summary:
		//		Event processor for onmouseup/ontouchend
		// e: Event
		//		onmouseup/ontouchend event
		// tags:
		//		private
		if(this.mouseDown){
			this.mouseDown = false;
			this.inherited(arguments);
		}
	},

	onMouseOut: function(){
		// summary:
		//		Event processor for when mouse is moved away from a TreeNode
		// tags:
		//		private
		this.inherited(arguments);
		this._unmarkTargetAnchor();
	},

	checkItemAcceptance: function(/*===== target, source, position =====*/){
		// summary:
		//		Stub function to be overridden if one wants to check for the ability to drop at the node/item level
		// description:
		//		In the base case, this is called to check if target can become a child of source.
		//		When betweenThreshold is set, position="before" or "after" means that we
		//		are asking if the source node can be dropped before/after the target node.
		// target: DOMNode
		//		The dijitTreeRoot DOM node inside of the TreeNode that we are dropping on to
		//		Use dijit.getEnclosingWidget(target) to get the TreeNode.
		// source: dijit/tree/dndSource
		//		The (set of) nodes we are dropping
		// position: String
		//		"over", "before", or "after"
		// tags:
		//		extension
		return true;
	},

	// topic event processors
	onDndSourceOver: function(source){
		// summary:
		//		Topic event processor for /dnd/source/over, called when detected a current source.
		// source: Object
		//		The dijit/tree/dndSource / dojo/dnd/Source which has the mouse over it
		// tags:
		//		private
		if(this != source){
			this.mouseDown = false;
			this._unmarkTargetAnchor();
		}else if(this.isDragging){
			var m = DNDManager.manager();
			m.canDrop(false);
		}
	},
	onDndStart: function(source, nodes, copy){
		// summary:
		//		Topic event processor for /dnd/start, called to initiate the DnD operation
		// source: Object
		//		The dijit/tree/dndSource / dojo/dnd/Source which is providing the items
		// nodes: DomNode[]
		//		The list of transferred items, dndTreeNode nodes if dragging from a Tree
		// copy: Boolean
		//		Copy items, if true, move items otherwise
		// tags:
		//		private

		if(this.isSource){
			this._changeState("Source", this == source ? (copy ? "Copied" : "Moved") : "");
		}
		var accepted = this.checkAcceptance(source, nodes);

		this._changeState("Target", accepted ? "" : "Disabled");

		if(this == source){
			DNDManager.manager().overSource(this);
		}

		this.isDragging = true;
	},

	itemCreator: function(nodes /*===== , target, source =====*/){
		// summary:
		//		Returns objects passed to `Tree.model.newItem()` based on DnD nodes
		//		dropped onto the tree.   Developer must override this method to enable
		//		dropping from external sources onto this Tree, unless the Tree.model's items
		//		happen to look like {id: 123, name: "Apple" } with no other attributes.
		// description:
		//		For each node in nodes[], which came from source, create a hash of name/value
		//		pairs to be passed to Tree.model.newItem().  Returns array of those hashes.
		// nodes: DomNode[]
		// target: DomNode
		// source: dojo/dnd/Source
		// returns: __Item[]
		//		Array of name/value hashes for each new item to be added to the Tree
		// tags:
		//		extension

		// TODO: for 2.0 refactor so itemCreator() is called once per drag node, and
		// make signature itemCreator(sourceItem, node, target) (or similar).

		return array.map(nodes, function(node){
			return {
				"id": node.id,
				"name": node.textContent || node.innerText || ""
			};
		}); // Object[]
	},

	onDndDrop: function(source, nodes, copy){
		// summary:
		//		Topic event processor for /dnd/drop, called to finish the DnD operation.
		// description:
		//		Updates data store items according to where node was dragged from and dropped
		//		to.   The tree will then respond to those data store updates and redraw itself.
		// source: Object
		//		The dijit/tree/dndSource / dojo/dnd/Source which is providing the items
		// nodes: DomNode[]
		//		The list of transferred items, dndTreeNode nodes if dragging from a Tree
		// copy: Boolean
		//		Copy items, if true, move items otherwise
		// tags:
		//		protected
		if(this.containerState == "Over"){
			var tree = this.tree,
				model = tree.model,
				target = this.targetAnchor;

			this.isDragging = false;

			// Compute the new parent item
			var newParentItem;
			var insertIndex;
			var before;		// drop source before (aka previous sibling) of target
			newParentItem = (target && target.item) || tree.item;
			if(this.dropPosition == "Before" || this.dropPosition == "After"){
				// TODO: if there is no parent item then disallow the drop.
				// Actually this should be checked during onMouseMove too, to make the drag icon red.
				newParentItem = (target.getParent() && target.getParent().item) || tree.item;
				// Compute the insert index for reordering
				insertIndex = target.getIndexInParent();
				if(this.dropPosition == "After"){
					insertIndex = target.getIndexInParent() + 1;
					before = target.getNextSibling() && target.getNextSibling().item;
				}else{
					before = target.item;
				}
			}else{
				newParentItem = (target && target.item) || tree.item;
			}

			// If necessary, use this variable to hold array of hashes to pass to model.newItem()
			// (one entry in the array for each dragged node).
			var newItemsParams;

			array.forEach(nodes, function(node, idx){
				// dojo/dnd/Item representing the thing being dropped.
				// Don't confuse the use of item here (meaning a DnD item) with the
				// uses below where item means dojo.data item.
				var sourceItem = source.getItem(node.id);

				// Information that's available if the source is another Tree
				// (possibly but not necessarily this tree, possibly but not
				// necessarily the same model as this Tree)
				if(array.indexOf(sourceItem.type, "treeNode") != -1){
					var childTreeNode = sourceItem.data,
						childItem = childTreeNode.item,
						oldParentItem = childTreeNode.getParent().item;
				}

				if(source == this){
					// This is a node from my own tree, and we are moving it, not copying.
					// Remove item from old parent's children attribute.
					// TODO: dijit/tree/dndSelector should implement deleteSelectedNodes()
					// and this code should go there.

					if(typeof insertIndex == "number"){
						if(newParentItem == oldParentItem && childTreeNode.getIndexInParent() < insertIndex){
							insertIndex -= 1;
						}
					}
					model.pasteItem(childItem, oldParentItem, newParentItem, copy, insertIndex, before);
				}else if(model.isItem(childItem)){
					// Item from same model
					// (maybe we should only do this branch if the source is a tree?)
					model.pasteItem(childItem, oldParentItem, newParentItem, copy, insertIndex, before);
				}else{
					// Get the hash to pass to model.newItem().  A single call to
					// itemCreator() returns an array of hashes, one for each drag source node.
					if(!newItemsParams){
						newItemsParams = this.itemCreator(nodes, target.rowNode, source);
					}

					// Create new item in the tree, based on the drag source.
					model.newItem(newItemsParams[idx], newParentItem, insertIndex, before);
				}
			}, this);

			// Expand the target node (if it's currently collapsed) so the user can see
			// where their node was dropped.   In particular since that node is still selected.
			this.tree._expandNode(target);
		}
		this.onDndCancel();
	},

	onDndCancel: function(){
		// summary:
		//		Topic event processor for /dnd/cancel, called to cancel the DnD operation
		// tags:
		//		private
		this._unmarkTargetAnchor();
		this.isDragging = false;
		this.mouseDown = false;
		delete this.mouseButton;
		this._changeState("Source", "");
		this._changeState("Target", "");
	},

	// When focus moves in/out of the entire Tree
	onOverEvent: function(){
		// summary:
		//		This method is called when mouse is moved over our container (like onmouseenter)
		// tags:
		//		private
		this.inherited(arguments);
		DNDManager.manager().overSource(this);
	},
	onOutEvent: function(){
		// summary:
		//		This method is called when mouse is moved out of our container (like onmouseleave)
		// tags:
		//		private
		this._unmarkTargetAnchor();
		var m = DNDManager.manager();
		if(this.isDragging){
			m.canDrop(false);
		}
		m.outSource(this);

		this.inherited(arguments);
	},

	_isParentChildDrop: function(source, targetRow){
		// summary:
		//		Checks whether the dragged items are parent rows in the tree which are being
		//		dragged into their own children.
		//
		// source:
		//		The DragSource object.
		//
		// targetRow:
		//		The tree row onto which the dragged nodes are being dropped.
		//
		// tags:
		//		private

		// If the dragged object is not coming from the tree this widget belongs to,
		// it cannot be invalid.
		if(!source.tree || source.tree != this.tree){
			return false;
		}


		var root = source.tree.domNode;
		var ids = source.selection;

		var node = targetRow.parentNode;

		// Iterate up the DOM hierarchy from the target drop row,
		// checking of any of the dragged nodes have the same ID.
		while(node != root && !ids[node.id]){
			node = node.parentNode;
		}

		return node.id && ids[node.id];
	},

	_unmarkTargetAnchor: function(){
		// summary:
		//		Removes hover class of the current target anchor
		// tags:
		//		private
		if(!this.targetAnchor){ return; }
		this._removeItemClass(this.targetAnchor.rowNode, this.dropPosition);
		this.targetAnchor = null;
		this.targetBox = null;
		this.dropPosition = null;
	},

	_markDndStatus: function(copy){
		// summary:
		//		Changes source's state based on "copy" status
		this._changeState("Source", copy ? "Copied" : "Moved");
	}
});

/*=====
dndSource.__Item = __Item;
=====*/

return dndSource;
});
