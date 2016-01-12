define(["dojo/_base/declare"], function(declare){

	return declare("dijit.tree.model", null, {
		// summary:
		//		Contract for any data provider object for the tree.
		// description:
		//		Tree passes in values to the constructor to specify the callbacks.
		//		"item" is typically a dojo/data/Item but it's just a black box so
		//		it could be anything.
		//
		//		This (like `dojo/data/api/Read`) is just documentation, and not meant to be used.

		destroy: function(){
			// summary:
			//		Destroys this object, releasing connections to the store
			// tags:
			//		extension
		},

		// =======================================================================
		// Methods for traversing hierarchy

		getRoot: function(onItem){
			// summary:
			//		Calls onItem with the root item for the tree, possibly a fabricated item.
			//		Throws exception on error.
			// tags:
			//		extension
		},

		mayHaveChildren: function(item){
			// summary:
			//		Tells if an item has or may have children.  Implementing logic here
			//		avoids showing +/- expando icon for nodes that we know don't have children.
			//		(For efficiency reasons we may not want to check if an element actually
			//		has children until user clicks the expando node)
			// item: dojo/data/Item
			// tags:
			//		extension
		},

		getChildren: function(parentItem, onComplete){
			// summary:
			//		Calls onComplete() with array of child items of given parent item, all loaded.
			//		Throws exception on error.
			// parentItem: dojo/data/Item
			// onComplete: function(items)
			// tags:
			//		extension
		},

		// =======================================================================
		// Inspecting items

		isItem: function(something){
			// summary:
			//		Returns true if *something* is an item and came from this model instance.
			//		Returns false if *something* is a literal, an item from another model instance,
			//		or is any object other than an item.
			// tags:
			//		extension
		},

		getIdentity: function(item){
			// summary:
			//		Returns identity for an item
			// tags:
			//		extension
		},

		getLabel: function(item){
			// summary:
			//		Get the label for an item
			// tags:
			//		extension
		},

		// =======================================================================
		// Write interface

		newItem: function(args, parent, insertIndex, before){
			// summary:
			//		Creates a new item.   See `dojo/data/api/Write` for details on args.
			// args: dijit/tree/dndSource.__Item
			// parent: Item
			// insertIndex: int?
			//		Allows to insert the new item as the n'th child of `parent`.
			// before: Item?
			//		Insert the new item as the previous sibling of this item.  `before` must be a child of `parent`.
			// tags:
			//		extension
		},

		pasteItem: function(childItem, oldParentItem, newParentItem, bCopy, insertIndex, before){
			// summary:
			//		Move or copy an item from one parent item to another.
			//		Used in drag & drop.
			//		If oldParentItem is specified and bCopy is false, childItem is removed from oldParentItem.
			//		If newParentItem is specified, childItem is attached to newParentItem.
			// childItem: Item
			// oldParentItem: Item
			// newParentItem: Item
			// bCopy: Boolean
			// insertIndex: int?
			//		Allows to insert the new item as the n'th child of `parent`.
			// before: Item?
			//		Insert the new item as the previous sibling of this item.  `before` must be a child of `parent`.
			// tags:
			//		extension
		},

		// =======================================================================
		// Callbacks

		onChange: function(item){
			// summary:
			//		Callback whenever an item has changed, so that Tree
			//		can update the label, icon, etc.   Note that changes
			//		to an item's children or parent(s) will trigger an
			//		onChildrenChange() so you can ignore those changes here.
			// item: dojo/data/Item
			// tags:
			//		callback
		},

		onChildrenChange: function(parent, newChildrenList){
			// summary:
			//		Callback to do notifications about new, updated, or deleted items.
			// parent: dojo/data/Item
			// newChildrenList: dojo/data/Item[]
			// tags:
			//		callback
		}
	});
});