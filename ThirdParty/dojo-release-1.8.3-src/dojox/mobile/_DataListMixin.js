define([
	"dojo/_base/array",
	"dojo/_base/declare",
	"dijit/registry",
	"./_DataMixin",
	"./ListItem"
], function(array, declare, registry, DataMixin, ListItem){

	// module:
	//		dojox/mobile/_DataListMixin

	return declare("dojox.mobile._DataListMixin", DataMixin, {
		// summary:
		//		Mixin for widgets to generate the list items corresponding to
		//		the data provider object.
		// description:
		//		By mixing this class into the widgets, the list item nodes are
		//		generated as the child nodes of the widget and automatically
		//		re-generated whenever the corresponding data items are modified.

		// append: Boolean
		//		If true, refresh() does not clear the existing items.
		append: false,

		// itemMap: Object
		//		An optional parameter mapping field names from the store to ItemList name.
		// example:
		//	|	itemMap:{text:'label', profile_image_url:'icon' }
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
			var attr = {};
			var arr = this.store.getLabelAttributes(item);
			var labelAttr = arr ? arr[0] : null;
			array.forEach(this.store.getAttributes(item), function(name){
				if(name === labelAttr){
					attr["label"] = this.store.getLabel(item);
				}else{
					attr[(this.itemMap && this.itemMap[name]) || name] = this.store.getValue(item, name);
				}
			}, this);
			var w = new ListItem(attr);
			item._widgetId = w.id;
			return w;
		},

		generateList: function(/*Array*/items, /*Object*/dataObject){
			// summary:
			//		Given the data, generates a list of items.
			if(!this.append){
				array.forEach(this.getChildren(), function(child){
					child.destroyRecursive();
				});
			}
			array.forEach(items, function(item, index){
				this.addChild(this.createListItem(item));
			}, this);
		},

		onComplete: function(/*Array*/items, /*Object*/request){
			// summary:
			//		An handler that is called after the fetch completes.
			this.generateList(items, request);
		},

		onError: function(/*Object*/errorData, /*Object*/request){
			// summary:
			//		An error handler.
		},

		onSet: function(/*Object*/item, /*String*/attribute, /*Object|Array*/oldValue, /*Object|Array*/newValue){
			// summary:
			//		See dojo/data/api/Notification.onSet().
		},

		onNew: function(/*Object*/newItem, /*Object?*/parentInfo){
			// summary:
			//		See dojo/data/api/Notification.onNew().
			this.addChild(this.createListItem(newItem));
		},

		onDelete: function(/*Object*/deletedItem){
			// summary:
			//		See dojo/data/api/Notification.onDelete().
			registry.byId(deletedItem._widgetId).destroyRecursive();
		},

		onStoreClose: function(/*Object?*/request){
			// summary:
			//		Refresh list on close.
			if(this.store.clearOnClose){
				this.refresh();
			}
		}
	});
});
