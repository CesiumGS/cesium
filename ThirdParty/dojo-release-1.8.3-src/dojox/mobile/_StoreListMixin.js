define([
	"dojo/_base/array",
	"dojo/_base/declare",
	"./_StoreMixin",
	"./ListItem"
], function(array, declare, StoreMixin, ListItem){

	// module:
	//		dojox/mobile/_StoreListMixin

	return declare("dojox.mobile._StoreListMixin", StoreMixin, {
		// summary:
		//		Mixin for widgets to generate the list items corresponding to
		//		the dojo/store data provider object.
		// description:
		//		Mixin for widgets to generate the list items corresponding to
		//		the dojo/store data provider object.
		//		By mixing this class into the widgets, the list item nodes are
		//		generated as the child nodes of the widget and automatically
		//		regenerated whenever the corresponding data items are modified.

		// append: Boolean
		//		If true, refresh() does not clear the existing items.
		append: false,

		// itemMap: Object
		//		An optional parameter mapping field names from the store to ItemList names.
		//		Example: itemMap:{text:'label', profile_image_url:'icon'}
		itemMap: null,

		buildRendering: function(){
			this.inherited(arguments);
			if(!this.store){ return; }
			var store = this.store;
			this.store = null;
			this.setStore(store, this.query, this.queryOptions);
		},

		createListItem: function(/*Object*/item){
			// summary:
			//		Creates a list item widget.
			var props = {};
			if(!item["label"]){
				props["label"] = item[this.labelProperty];
			}
			for(var name in item){
				props[(this.itemMap && this.itemMap[name]) || name] = item[name];
			}
			return new ListItem(props);
		},

		generateList: function(/*Array*/items){
			// summary:
			//		Given the data, generates a list of items.
			if(!this.append){
				array.forEach(this.getChildren(), function(child){
					child.destroyRecursive();
				});
			}
			array.forEach(items, function(item, index){
				this.addChild(this.createListItem(item));
				if(item[this.childrenProperty]){
					array.forEach(item[this.childrenProperty], function(child, index){
						this.addChild(this.createListItem(child));
					}, this);
				}
			}, this);
		},

		onComplete: function(/*Array*/items){
			// summary:
			//		A handler that is called after the fetch completes.
			this.generateList(items);
		},

		onError: function(/*Object*/ /*===== errorData =====*/){
			// summary:
			//		An error handler.
		},

		onUpdate: function(/*Object*/item, /*Number*/insertedInto){
			// summary:
			//		Adds a new item or updates an existing item.
			if(insertedInto === this.getChildren().length){
				this.addChild(this.createListItem(item)); // add a new ListItem
			}else{
				this.getChildren()[insertedInto].set(item); // update the existing ListItem
			}
		},

		onDelete: function(/*Object*/item, /*Number*/removedFrom){
			// summary:
			//		Deletes an existing item.
			this.getChildren()[removedFrom].destroyRecursive();
		}
	});
});
