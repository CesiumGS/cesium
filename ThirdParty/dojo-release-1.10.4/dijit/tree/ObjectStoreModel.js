define([
	"dojo/_base/array", // array.filter array.forEach array.indexOf array.some
	"dojo/aspect", // aspect.before, aspect.after
	"dojo/_base/declare", // declare
	"dojo/Deferred",
	"dojo/_base/lang", // lang.hitch
	"dojo/when",
	"../Destroyable"
], function(array, aspect, declare, Deferred, lang, when, Destroyable){

	// module:
	//		dijit/tree/ObjectStoreModel

	return declare("dijit.tree.ObjectStoreModel", Destroyable, {
		// summary:
		//		Implements dijit/tree/model connecting dijit/Tree to a dojo/store/api/Store that implements
		//		getChildren().
		//
		//		If getChildren() returns an array with an observe() method, then it will be leveraged to reflect
		//		store updates to the tree.   So, this class will work best when:
		//
		//			1. the store implements dojo/store/Observable
		//			2. getChildren() is implemented as a query to the server (i.e. it calls store.query())
		//
		//		Drag and Drop: To support drag and drop, besides implementing getChildren()
		//		and dojo/store/Observable, the store must support the parent option to put().
		//		And in order to have child elements ordered according to how the user dropped them,
		//		put() must support the before option.

		// store: dojo/store/api/Store
		//		Underlying store
		store: null,

		// labelAttr: String
		//		Get label for tree node from this attribute
		labelAttr: "name",

		// labelType: [const] String
		//		Specifies how to interpret the labelAttr in the data store items.
		//		Can be "html" or "text".
		labelType: "text",

		// root: [readonly] Object
		//		Pointer to the root item from the dojo/store/api/Store (read only, not a parameter)
		root: null,

		// query: anything
		//		Specifies datastore query to return the root item for the tree.
		//		Must only return a single item.   Alternately can just pass in pointer
		//		to root item.
		// example:
		//	|	{id:'ROOT'}
		query: null,

		constructor: function(/* Object */ args){
			// summary:
			//		Passed the arguments listed above (store, etc)
			// tags:
			//		private

			lang.mixin(this, args);

			// Map from id of each parent node to array of its children, or to Promise for that array of children.
			this.childrenCache = {};
		},

		// =======================================================================
		// Methods for traversing hierarchy

		getRoot: function(onItem, onError){
			// summary:
			//		Calls onItem with the root item for the tree, possibly a fabricated item.
			//		Calls onError on error.
			if(this.root){
				onItem(this.root);
			}else{
				var res = this.store.query(this.query);
				if(res.then){
					this.own(res);	// in case app calls destroy() before query completes
				}

				when(res,
					lang.hitch(this, function(items){
						//console.log("queried root: ", res);
						if(items.length != 1){
							throw new Error("dijit.tree.ObjectStoreModel: root query returned " + items.length +
								" items, but must return exactly one");
						}
						this.root = items[0];
						onItem(this.root);

						// Setup listener to detect if root item changes
						if(res.observe){
							res.observe(lang.hitch(this, function(obj){
								// Presumably removedFrom == insertedInto == 1, and this call indicates item has changed.
								//console.log("root changed: ", obj);
								this.onChange(obj);
							}), true);	// true to listen for updates to obj
						}
					}),
					onError
				);
			}
		},

		mayHaveChildren: function(/*===== item =====*/){
			// summary:
			//		Tells if an item has or might have children.  Implementing logic here
			//		avoids showing +/- expando icon for nodes that we know won't have children.
			//		(For efficiency reasons we may not want to check if an element actually
			//		has children until user clicks the expando node).
			//
			//		Application code should override this method based on the data, for example
			//		it could be `return item.leaf == true;`.
			//
			//		Note that mayHaveChildren() must return true for an item if it could possibly
			//		have children in the future, due to drag-an-drop or some other data store update.
			//		Also note that it may return true if it's just too expensive to check during tree
			//		creation whether or not the item has children.
			// item: Object
			//		Item from the dojo/store
			return true;
		},

		getChildren: function(/*Object*/ parentItem, /*function(items)*/ onComplete, /*function*/ onError){
			// summary:
			//		Calls onComplete() with array of child items of given parent item.
			// parentItem:
			//		Item from the dojo/store

			// TODO:
			// For 2.0, change getChildren(), getRoot(), etc. to return a cancelable promise, rather than taking
			// onComplete() and onError() callbacks.   Also, probably get rid of the caching.
			//
			// But be careful if we continue to maintain ObjectStoreModel as a separate class
			// from Tree, because in that case ObjectStoreModel can be shared by two trees, and destroying one tree
			// should not interfere with an in-progress getChildren() call from another tree.  Also, need to make
			// sure that multiple calls to getChildren() for the same parentItem don't trigger duplicate calls
			// to onChildrenChange() and onChange().
			//
			// I think for 2.0 though that ObjectStoreModel should be rolled into Tree itself.

			var id = this.store.getIdentity(parentItem);

			if(this.childrenCache[id]){
				// If this.childrenCache[id] is defined, then it always has the latest list of children
				// (like a live collection), so just return it.
				when(this.childrenCache[id], onComplete, onError);
				return;
			}

			// Query the store.
			// Cache result so that we can close the query on destroy(), and to avoid setting up multiple observers
			// when getChildren() is called multiple times for the same parent.
			// The only problem is that getChildren() on non-Observable stores may return a stale value.
			var res = this.childrenCache[id] = this.store.getChildren(parentItem);
			if(res.then){
				this.own(res);	// in case app calls destroy() before query completes
			}

			// Setup observer in case children list changes, or the item(s) in the children list are updated.
			if(res.observe){
				this.own(res.observe(lang.hitch(this, function(obj, removedFrom, insertedInto){
					//console.log("observe on children of ", id, ": ", obj, removedFrom, insertedInto);

					// If removedFrom == insertedInto, this call indicates that the item has changed.
					// Even if removedFrom != insertedInto, the item may have changed.
					this.onChange(obj);

					if(removedFrom != insertedInto){
						// Indicates an item was added, removed, or re-parented.  The children[] array (returned from
						// res.then(...)) has already been updated (like a live collection), so just use it.
						when(res, lang.hitch(this, "onChildrenChange", parentItem));
					}
				}), true));	// true means to notify on item changes
			}

			// User callback
			when(res, onComplete, onError);
		},

		// =======================================================================
		// Inspecting items

		isItem: function(/*===== something =====*/){
			return true;	// Boolean
		},

		getIdentity: function(/* item */ item){
			return this.store.getIdentity(item);	// Object
		},

		getLabel: function(/*dojo/data/Item*/ item){
			// summary:
			//		Get the label for an item
			return item[this.labelAttr];	// String
		},

		// =======================================================================
		// Write interface, for DnD

		newItem: function(/* dijit/tree/dndSource.__Item */ args, /*Item*/ parent, /*int?*/ insertIndex, /*Item*/ before){
			// summary:
			//		Creates a new item.   See `dojo/data/api/Write` for details on args.
			//		Used in drag & drop when item from external source dropped onto tree.

			return this.store.put(args, {
				parent: parent,
				before: before
			});
		},

		pasteItem: function(/*Item*/ childItem, /*Item*/ oldParentItem, /*Item*/ newParentItem,
					/*Boolean*/ bCopy, /*int?*/ insertIndex, /*Item*/ before){
			// summary:
			//		Move or copy an item from one parent item to another.
			//		Used in drag & drop.

			var d = new Deferred();

			if(oldParentItem === newParentItem && !bCopy && !before){
				// Avoid problem when items visually disappear when dropped onto their parent.
				// Happens because the (no-op) store.put() call doesn't generate any notification
				// that the childItem was added/moved.
				d.resolve(true);
				return d;
			}

			if(oldParentItem && !bCopy){
				// In order for DnD moves to work correctly, childItem needs to be orphaned from oldParentItem
				// before being adopted by newParentItem.   That way, the TreeNode is moved rather than
				// an additional TreeNode being created, and the old TreeNode subsequently being deleted.
				// The latter loses information such as selection and opened/closed children TreeNodes.
				// Unfortunately simply calling this.store.put() will send notifications in a random order, based
				// on when the TreeNodes in question originally appeared, and not based on the drag-from
				// TreeNode vs. the drop-onto TreeNode.

				this.getChildren(oldParentItem, lang.hitch(this, function(oldParentChildren){
					oldParentChildren = [].concat(oldParentChildren); // concat to make copy
					var index = array.indexOf(oldParentChildren, childItem);
					oldParentChildren.splice(index, 1);
					this.onChildrenChange(oldParentItem, oldParentChildren);

					d.resolve(this.store.put(childItem, {
						overwrite: true,
						parent: newParentItem,
						oldParent: oldParentItem,
						before: before
					}));
				}));
			}else{
				d.resolve(this.store.put(childItem, {
					overwrite: true,
					parent: newParentItem,
					oldParent: oldParentItem,
					before: before
				}));
			}

			return d;
		},

		// =======================================================================
		// Callbacks

		onChange: function(/*dojo/data/Item*/ /*===== item =====*/){
			// summary:
			//		Callback whenever an item has changed, so that Tree
			//		can update the label, icon, etc.   Note that changes
			//		to an item's children or parent(s) will trigger an
			//		onChildrenChange() so you can ignore those changes here.
			// tags:
			//		callback
		},

		onChildrenChange: function(/*===== parent, newChildrenList =====*/){
			// summary:
			//		Callback to do notifications about new, updated, or deleted items.
			// parent: dojo/data/Item
			// newChildrenList: Object[]
			//		Items from the store
			// tags:
			//		callback
		},

		onDelete: function(/*dojo/data/Item*/ /*===== item =====*/){
			// summary:
			//		Callback when an item has been deleted.
			//		Actually we have no way of knowing this with the new dojo.store API,
			//		so this method is never called (but it's left here since Tree connects
			//		to it).
			// tags:
			//		callback
		}
	});
});
