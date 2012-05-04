define([
	"dojo/_base/array",
	"dojo/_base/connect",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dijit/registry",	// registry.byId
	"./ListItem"
], function(array, connect, declare, lang, registry, ListItem){

	// module:
	//		dojox/mobile/_DataListMixin
	// summary:
	//		Mixin for widgets to generate the list items corresponding to the
	//		data provider object.

	return declare("dojox.mobile._DataListMixin", null,{
		// summary:
		//		Mixin for widgets to generate the list items corresponding to
		//		the data provider object.
		// description:
		//		By mixing this class into the widgets, the list item nodes are
		//		generated as the child nodes of the widget and automatically
		//		re-generated whenever the corresponding data items are modified.

		// store: Object
		//		Reference to data provider object
		store: null,

		// query: Object
		//		A query that can be passed to 'store' to initially filter the
		//		items.
		query: null,

		// queryOptions: Object
		//		An optional parameter for the query.
		queryOptions: null,

		buildRendering: function(){
			this.inherited(arguments);
			if(!this.store){ return; }
			var store = this.store;
			this.store = null;
			this.setStore(store, this.query, this.queryOptions);
		},

		setStore: function(store, query, queryOptions){
			// summary:
			//		Sets the store to use with this widget.
			if(store === this.store){ return; }
			this.store = store;
			this.query = query;
			this.queryOptions = queryOptions;
			if(store && store.getFeatures()["dojo.data.api.Notification"]){
				array.forEach(this._conn || [], connect.disconnect);
				this._conn = [
					connect.connect(store, "onSet", this, "onSet"),
					connect.connect(store, "onNew", this, "onNew"),
					connect.connect(store, "onDelete", this, "onDelete")
				];
			}
			this.refresh();
		},

		refresh: function(){
			// summary:
			//		Fetches the data and generates the list items.
			if(!this.store){ return; }
			this.store.fetch({
				query: this.query,
				queryOptions: this.queryOptions,
				onComplete: lang.hitch(this, "onComplete"),
				onError: lang.hitch(this, "onError")
			});
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
					attr[name] = this.store.getValue(item, name);
				}
			}, this);
			var w = new ListItem(attr);
			item._widgetId = w.id;
			return w;
		},

		generateList: function(/*Array*/items, /*Object*/dataObject){
			// summary:
			//		Given the data, generates a list of items.
			array.forEach(this.getChildren(), function(child){
				child.destroyRecursive();
			});
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
			//	summary:
			//		See dojo.data.api.Notification.onSet()
		},

		onNew: function(/*Object*/newItem, /*Object?*/parentInfo){
			//	summary:
			//		See dojo.data.api.Notification.onNew()
			this.addChild(this.createListItem(newItem));
		},

		onDelete: function(/*Object*/deletedItem){
			//	summary:
			//		See dojo.data.api.Notification.onDelete()
			registry.byId(deletedItem._widgetId).destroyRecursive();
		}
	});
});
