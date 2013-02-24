define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"../_base",
	"dojo/_base/array"
], function(kernel,lang,dd,array){

	lang.getObject("dojox.dtl.contrib.data", true);

	var ddcd = dd.contrib.data;
	var first = true;

	ddcd._BoundItem = lang.extend(function(item, store){
		this.item = item;
		this.store = store;
	},
	{
		get: function(key){
			var store = this.store;
			var item = this.item;

			if(key == "getLabel"){
				return store.getLabel(item);
			}else if(key == "getAttributes"){
				return store.getAttributes(item);
			}else if(key == "getIdentity"){
				if(store.getIdentity){
					return store.getIdentity(item);
				}
				return "Store has no identity API";
			}else{
				if(!store.hasAttribute(item, key)){
					if(key.slice(-1) == "s"){
						if(first){
							first = false;
							kernel.deprecated("You no longer need an extra s to call getValues, it can be figured out automatically");
						}
						key = key.slice(0, -1);
					}
					if(!store.hasAttribute(item, key)){
						return;
					}
				}

				var values = store.getValues(item, key);
				if(!values){
					return;
				}
				if(!lang.isArray(values)){
					return new ddcd._BoundItem(values, store);
				}

				values = array.map(values, function(value){
					if(lang.isObject(value) && store.isItem(value)){
						return new ddcd._BoundItem(value, store);
					}
					return value;
				});
				values.get = ddcd._get;
				return values;
			}
		}
	});
	ddcd._BoundItem.prototype.get.safe = true;

	ddcd.BindDataNode = lang.extend(function(items, query, store, alias){
		this.items = items && new dd._Filter(items);
		this.query = query && new dd._Filter(query);
		this.store = new dd._Filter(store);
		this.alias = alias;
	},
	{
		render: function(context, buffer){
			var items = this.items && this.items.resolve(context);
			var query = this.query && this.query.resolve(context);
			var store = this.store.resolve(context);
			if(!store || !store.getFeatures){
				throw new Error("data_bind didn't receive a store");
			}

			if(query){
				var sync = false;

				store.fetch({
					query: query,
					sync: true,
					scope: this,
					onComplete: function(it){
						sync = true;
						items = it;
					}
				});

				if(!sync){
					throw new Error("The bind_data tag only works with a query if the store executed synchronously");
				}
			}

			var list = [];

			if(items){
				for(var i = 0, item; item = items[i]; i++){
					list.push(new ddcd._BoundItem(item, store));
				}
			}

			context[this.alias] = list;
			return buffer;
		},
		unrender: function(context, buffer){
			return buffer;
		},
		clone: function(){
			return this;
		}
	});

	lang.mixin(ddcd, {
		_get: function(key){
			if(this.length){
				return (this[0] instanceof ddcd._BoundItem) ? this[0].get(key) : this[0][key];
			}
		},
		bind_data: function(parser, token){
			// summary:
			//		Turns a list of data store items into DTL compatible items
			// example:
			//		`contextItems` and `contextStore` should be an item list
			//		and a data store that get assigned to `newVariable`
			//
			//	|	{% bind_data contextItems to contextStore as newVariable %}
			var parts = token.contents.split();

			if(parts[2] != 'to' || parts[4] != 'as' || !parts[5]){
				throw new Error("data_bind expects the format: 'data_bind items to store as varName'");
			}

			return new ddcd.BindDataNode(parts[1], null, parts[3], parts[5]);
		},
		bind_query: function(parser, token){
			// summary:
			//		Queries a data store and makes the returned items DTL compatible
			// example:
			//		You can only use this with data stores that work in a synchronous
			//		way (meaning that `onComplete` is fired during the `fetch` call).
			//		A `sync` flag is sent to the fetch call so that stores that usually
			//		work asynchronously make themselves syncrhonous if possible.
			//	|	{% bind_query contextQuery to contextStore as newVariable %}
			var parts = token.contents.split();

			if(parts[2] != 'to' || parts[4] != 'as' || !parts[5]){
				throw new Error("data_bind expects the format: 'bind_query query to store as varName'");
			}

			return new ddcd.BindDataNode(null, parts[1], parts[3], parts[5]);
		}
	});
	ddcd._get.safe = true;

	dd.register.tags("dojox.dtl.contrib", {
		"data": ["bind_data", "bind_query"]
	});
	return dojox.dtl.contrib.data;
});