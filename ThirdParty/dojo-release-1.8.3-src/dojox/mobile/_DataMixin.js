define([
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/Deferred"
], function(array, declare, lang, Deferred){

	// module:
	//		dojox/mobile/_DataMixin

	return declare("dojox.mobile._DataMixin", null, {
		// summary:
		//		Mixin for widgets to enable dojo/data data store.
		// description:
		//		By mixing this class into a widget, it can get data through a
		//		dojo/data data store. The widget must implement
		//		onComplete(/*Array*/items) to handle the retrieved data.

		// store: Object
		//		Reference to data provider object used by this widget.
		store: null,

		// query: Object
		//		A query that can be passed to 'store' to initially filter the items.
		query: null,

		// queryOptions: Object
		//		An optional parameter for the query.
		queryOptions: null,

		setStore: function(/*dojo/data/store*/store, /*dojo/data/api/Request|Object*/query, /*Object?*/queryOptions){
			// summary:
			//		Sets the store to use with this widget.
			if(store === this.store){ return null; }
			this.store = store;
			this._setQuery(query, queryOptions);
			if(store && store.getFeatures()["dojo.data.api.Notification"]){
				array.forEach(this._conn || [], this.disconnect, this);
				this._conn = [
					this.connect(store, "onSet", "onSet"),
					this.connect(store, "onNew", "onNew"),
					this.connect(store, "onDelete", "onDelete"),
					this.connect(store, "close", "onStoreClose")
				];
			}
			return this.refresh();
		},

		setQuery: function(/*dojo/data/api/Request|Object*/query, /*Object?*/queryOptions){
			// summary:
			//		Sets a query.
			this._setQuery(query, queryOptions);
			return this.refresh();
		},

		_setQuery: function(query, queryOptions){
			// tags:
			//		private
			this.query = query;
			this.queryOptions = queryOptions || this.queryOptions;
		},

		refresh: function(){
			// summary:
			//		Fetches the data and generates the list items.
			if(!this.store){ return null; }
			var d = new Deferred();
			var onComplete = lang.hitch(this, function(items, request){
				this.onComplete(items, request);
				d.resolve();
			});
			var onError = lang.hitch(this, function(errorData, request){
				this.onError(errorData, request);
				d.resolve();
			});
			var q = this.query;
			this.store.fetch({
				query: q,
				queryOptions: this.queryOptions,
				onComplete: onComplete,
				onError: onError,
				start: q && q.start,
				count: q && q.count
			});
			return d;
		}

/*
		// Subclass MUST implement the following methods.

		onComplete: function(items, request){
			// summary:
			//		An handler that is called after the fetch completes.
		},

		onError: function(errorData, request){
			// summary:
			//		An error handler.
		},

		onSet: function(item, attribute, oldValue, newValue){
			// summary:
			//		See dojo/data/api/Notification.onSet()
		},

		onNew: function(newItem, parentInfo){
			// summary:
			//		See dojo/data/api/Notification.onNew()
		},

		onDelete: function(deletedItem){
			// summary:
			//		See dojo/data/api/Notification.onDelete()
		},

		onStoreClose: function(request){
			// summary:
			//		Refresh list on close.
		}
*/
	});
});
