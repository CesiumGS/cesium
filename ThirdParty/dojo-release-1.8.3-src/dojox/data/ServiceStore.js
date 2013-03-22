define(["dojo/_base/declare", "dojo/_base/lang", "dojo/_base/array"], function(declare, lang, array) {
return declare("dojox.data.ServiceStore",
	// ClientFilter is intentionally not required, ServiceStore does not need it, and is more
	// lightweight without it, but if it is provided, the ServiceStore will use it.
	lang.getObject("dojox.data.ClientFilter", 0)||null,{
		// summary:
		//		note that dojox.rpc.Service is not required, you can create your own services
		//		A ServiceStore is a readonly data store that provides a data.data interface to an RPC service.
		//		|		var myServices = new dojox.rpc.Service(dojo.moduleUrl("dojox.rpc.tests.resources", "test.smd"));
		//		|		var serviceStore = new dojox.data.ServiceStore({service:myServices.ServiceStore});
		//
		//		The ServiceStore also supports lazy loading. References can be made to objects that have not been loaded.
		//		For example if a service returned:
		//		|		{"name":"Example","lazyLoadedObject":{"$ref":"obj2"}}
		//
		//		And this object has accessed using the dojo.data API:
		//		|		var obj = serviceStore.getValue(myObject,"lazyLoadedObject");
		//		The object would automatically be requested from the server (with an object id of "obj2").
	
	
		// service: Object
		//	This is the service object that is used to retrieve lazy data and save results
		//	The function should be directly callable with a single parameter of an object id to be loaded
		service: null,
		
		constructor: function(options){
			// summary:
			//		ServiceStore constructor, instantiate a new ServiceStore
			//		A ServiceStore can be configured from a JSON Schema. Queries are just
			//		passed through to the underlying services
			// options:
			//		Keyword arguments
			//
			//		####The *schema* parameter
			//
			//		This is a schema object for this store. This should be JSON Schema format.
			//
			//		####The *service* parameter
			//
			//		This is the service object that is used to retrieve lazy data and save results
			//		The function should be directly callable with a single parameter of an object id to be loaded
			//
			//		####The *idAttribute* parameter
			//
			//		Defaults to 'id'. The name of the attribute that holds an objects id.
			//		This can be a preexisting id provided by the server.
			//		If an ID isn't already provided when an object
			//		is fetched or added to the store, the autoIdentity system
			//		will generate an id for it and add it to the index.
			//
			//		####The *estimateCountFactor* parameter
			//
			//		This parameter is used by the ServiceStore to estimate the total count. When
			//		paging is indicated in a fetch and the response includes the full number of items
			//		requested by the fetch's count parameter, then the total count will be estimated
			//		to be estimateCountFactor multiplied by the provided count. If this is 1, then it is assumed that the server
			//		does not support paging, and the response is the full set of items, where the
			//		total count is equal to the number of items returned. If the server does support
			//		paging, an estimateCountFactor of 2 is a good value for estimating the total count
			//		It is also possible to override _processResults if the server can provide an exact
			//		total count.
			//
			//		####The *syncMode* parameter
			//
			//		Setting this to true will set the store to using synchronous calls by default.
			//		Sync calls return their data immediately from the calling function, so
			//		callbacks are unnecessary. This will only work with a synchronous capable service.
			//
			// description:
			//		ServiceStore can do client side caching and result set updating if
			//		dojox.data.ClientFilter is loaded. Do this add:
			//	|	dojo.require("dojox.data.ClientFilter")
			//		prior to loading the ServiceStore (ClientFilter must be loaded before ServiceStore).
			//		To utilize client side filtering with a subclass, you can break queries into
			//		client side and server side components by putting client side actions in
			//		clientFilter property in fetch calls. For example you could override fetch:
			//	|	fetch: function(args){
			//	|		// do the sorting and paging on the client side
			//	|		args.clientFilter = {start:args.start, count: args.count, sort: args.sort};
			//	|		// args.query will be passed to the service object for the server side handling
			//	|		return this.inherited(arguments);
			//	|	}
			//		When extending this class, if you would like to create lazy objects, you can follow
			//		the example from dojox.data.tests.stores.ServiceStore:
			// |	var lazyItem = {
			// |		_loadObject: function(callback){
			// |			this.name="loaded";
			// |			delete this._loadObject;
			// |			callback(this);
			// |		}
			// |	};

			//setup a byId alias to the api call
			this.byId=this.fetchItemByIdentity;
			this._index = {};
			// if the advanced json parser is enabled, we can pass through object updates as onSet events
			if(options){
				lang.mixin(this,options);
			}
			// We supply a default idAttribute for parser driven construction, but if no id attribute
			//	is supplied, it should be null so that auto identification takes place properly
			this.idAttribute = (options && options.idAttribute) || (this.schema && this.schema._idAttr);
		},
		
		// schema: 
		//		This is a schema object for this store. This should be JSON Schema format.
		schema: null,
		
		// idAttribute: String
		//		Defaults to 'id'. The name of the attribute that holds an objects id.
		//		This can be a preexisting id provided by the server.
		//		If an ID isn't already provided when an object
		//		is fetched or added to the store, the autoIdentity system
		//		will generate an id for it and add it to the index.
		
		idAttribute: "id",
		labelAttribute: "label",
		
		// syncMode: Boolean
		//		Setting this to true will set the store to using synchronous calls by default.
		//		Sync calls return their data immediately from the calling function, so
		//		callbacks are unnecessary. This will only work with a synchronous capable service.
		syncMode: false,
		
		// estimateCountFactor:
		//		This parameter is used by the ServiceStore to estimate the total count. When
		//		paging is indicated in a fetch and the response includes the full number of items
		//		requested by the fetch's count parameter, then the total count will be estimated
		//		to be estimateCountFactor multiplied by the provided count. If this is 1, then it is assumed that the server
		//		does not support paging, and the response is the full set of items, where the
		//		total count is equal to the numer of items returned. If the server does support
		//		paging, an estimateCountFactor of 2 is a good value for estimating the total count
		//		It is also possible to override _processResults if the server can provide an exact
		//		total count.	
		estimateCountFactor: 1,
		
		getSchema: function(){
			// summary:
			//		Returns a reference to the JSON Schema
			// returns: Object
			return this.schema;
		},

		loadLazyValues:true,

		getValue: function(/*Object*/ item, /*String*/property, /*value?*/defaultValue){
			// summary:
			//		Gets the value of an item's 'property'
			// item:
			//		The item to get the value from
			// property:
			//		property to look up value for
			// defaultValue:
			//		the default value

			var value = item[property];
			return value || // return the plain value since it was found;
						(property in item ? // a truthy value was not found, see if we actually have it
							value : // we do, so we can return it
							item._loadObject ? // property was not found, maybe because the item is not loaded, we will try to load it synchronously so we can get the property
								(dojox.rpc._sync = true) && arguments.callee.call(this,dojox.data.ServiceStore.prototype.loadItem({item:item}) || {}, property, defaultValue) : // load the item and run getValue again
								defaultValue);// not in item -> return default value
		},
		getValues: function(item, property){
			// summary:
			//		Gets the value of an item's 'property' and returns
			//		it.	If this value is an array it is just returned,
			//		if not, the value is added to an array and that is returned.
			// item: Object
			// property: String
			//		property to look up value for

			var val = this.getValue(item,property);
			return val instanceof Array ? val : val === undefined ? [] : [val];
		},

		getAttributes: function(item){
			// summary:
			//		Gets the available attributes of an item's 'property' and returns
			//		it as an array.
			// item: Object

			var res = [];
			for(var i in item){
				if(item.hasOwnProperty(i) && !(i.charAt(0) == '_' && i.charAt(1) == '_')){
					res.push(i);
				}
			}
			return res;
		},

		hasAttribute: function(item,attribute){
			// summary:
			//		Checks to see if item has attribute
			// item: Object
			// attribute: String
			return attribute in item;
		},

		containsValue: function(item, attribute, value){
			// summary:
			//		Checks to see if 'item' has 'value' at 'attribute'
			// item: Object
			// attribute: String
			// value: Anything
			return array.indexOf(this.getValues(item,attribute),value) > -1;
		},


		isItem: function(item){
			// summary:
			//		Checks to see if the argument is an item
			// item: Object

			// we have no way of determining if it belongs, we just have object returned from
			// service queries
			return (typeof item == 'object') && item && !(item instanceof Date);
		},

		isItemLoaded: function(/* object */ item){
			// summary:
			//		Checks to see if the item is loaded.

			return item && !item._loadObject;
		},

		loadItem: function(args){
			// summary:
			//		Loads an item and calls the callback handler. Note, that this will call the callback
			//		handler even if the item is loaded. Consequently, you can use loadItem to ensure
			//		that an item is loaded is situations when the item may or may not be loaded yet.
			//		If you access a value directly through property access, you can use this to load
			//		a lazy value as well (doesn't need to be an item).
			// example:
			//	|	store.loadItem({
			//	|		item: item, // this item may or may not be loaded
			//	|		onItem: function(item){
			//	|			// do something with the item
			//	|		}
			//	|	});

			var item;
			if(args.item._loadObject){
				args.item._loadObject(function(result){
					item = result; // in synchronous mode this can allow loadItem to return the value
					delete item._loadObject;
					var func = result instanceof Error ? args.onError : args.onItem;
					if(func){
						func.call(args.scope, result);
					}
				});
			}else if(args.onItem){
				// even if it is already loaded, we will use call the callback, this makes it easier to
				// use when it is not known if the item is loaded (you can always safely call loadItem).
				args.onItem.call(args.scope, args.item);
			}
			return item;
		},
		_currentId : 0,
		_processResults : function(results, deferred){
			// this should return an object with the items as an array and the total count of
			// items (maybe more than currently in the result set).
			// for example:
			//	| {totalCount:10, items: [{id:1},{id:2}]}

			// index the results, assigning ids as necessary

			if(results && typeof results == 'object'){
				var id = results.__id;
				if(!id){// if it hasn't been assigned yet
					if(this.idAttribute){
						// use the defined id if available
						id = results[this.idAttribute];
					}else{
						id = this._currentId++;
					}
					if(id !== undefined){
						var existingObj = this._index[id];
						if(existingObj){
							for(var j in existingObj){
								delete existingObj[j]; // clear it so we can mixin
							}
							results = lang.mixin(existingObj,results);
						}
						results.__id = id;
						this._index[id] = results;
					}
				}
				for(var i in results){
					results[i] = this._processResults(results[i], deferred).items;
				}
				var count = results.length;
			}
			return {totalCount: deferred.request.count == count ? (deferred.request.start || 0) + count * this.estimateCountFactor : count, items: results};
		},
		close: function(request){
			return request && request.abort && request.abort();
		},
		fetch: function(args){
			// summary:
			//		See dojo/data/api/Read.fetch
			// args:
			//		####The *queryOptions.cache* parameter
			//
			//		If true, indicates that the query result should be cached for future use. This is only available
			//		if dojox.data.ClientFilter has been loaded before the ServiceStore
			//
			//		####The *syncMode* parameter
			//
			//		Indicates that the call should be fetch synchronously if possible (this is not always possible)
			//
			//		####The *clientFetch* parameter
			//
			//		This is a fetch keyword argument for explicitly doing client side filtering, querying, and paging

			args = args || {};

			if("syncMode" in args ? args.syncMode : this.syncMode){
				dojox.rpc._sync = true;
			}
			var self = this;

			var scope = args.scope || self;
			var defResult = this.cachingFetch ? this.cachingFetch(args) : this._doQuery(args);
			defResult.request = args;
			defResult.addCallback(function(results){
				if(args.clientFetch){
					results = self.clientSideFetch({query:args.clientFetch,sort:args.sort,start:args.start,count:args.count},results);
				}
				var resultSet = self._processResults(results, defResult);
				results = args.results = resultSet.items;
				if(args.onBegin){
					args.onBegin.call(scope, resultSet.totalCount, args);
				}
				if(args.onItem){
					for(var i=0; i<results.length;i++){
						args.onItem.call(scope, results[i], args);
					}
				}
				if(args.onComplete){
					args.onComplete.call(scope, args.onItem ? null : results, args);
				}
				return results;
			});
			defResult.addErrback(args.onError && function(err){
				return args.onError.call(scope, err, args);
			});
			args.abort = function(){
				// abort the request
				defResult.cancel();
			};
			args.store = this;
			return args;
		},
		_doQuery: function(args){
			var query= typeof args.queryStr == 'string' ? args.queryStr : args.query;
			return this.service(query);
		},
		getFeatures: function(){
			// summary:
			//		return the store feature set

			return {
				"dojo.data.api.Read": true,
				"dojo.data.api.Identity": true,
				"dojo.data.api.Schema": this.schema
			};
		},

		getLabel: function(item){
			// summary:
			//		returns the label for an item. Just gets the "label" attribute.

			return this.getValue(item,this.labelAttribute);
		},

		getLabelAttributes: function(item){
			// summary:
			//		returns an array of attributes that are used to create the label of an item
			return [this.labelAttribute];
		},

		//Identity API Support


		getIdentity: function(item){
			return item.__id;
		},

		getIdentityAttributes: function(item){
			// summary:
			//		returns the attributes which are used to make up the
			//		identity of an item.	Basically returns this.idAttribute

			return [this.idAttribute];
		},

		fetchItemByIdentity: function(args){
			// summary:
			//		fetch an item by its identity, by looking in our index of what we have loaded
			var item = this._index[(args._prefix || '') + args.identity];
			if(item){
				// the item exists in the index
				if(item._loadObject){
					// we have a handle on the item, but it isn't loaded yet, so we need to load it
					args.item = item;
					return this.loadItem(args);
				}else if(args.onItem){
					// it's already loaded, so we can immediately callback
					args.onItem.call(args.scope, item);
				}
			}else{
				// convert the different spellings
				return this.fetch({
						query: args.identity,
						onComplete: args.onItem,
						onError: args.onError,
						scope: args.scope
					}).results;
			}
			return item;
		}

	}
);
});
