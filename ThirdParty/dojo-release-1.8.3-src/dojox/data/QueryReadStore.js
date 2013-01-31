define(["dojo", "dojox", "dojo/data/util/sorter", "dojo/string"], function(dojo, dojox) {

dojo.declare("dojox.data.QueryReadStore",
	null,
	{
		// summary:
		//		This class provides a store that is mainly intended to be used
		//		for loading data dynamically from the server, used i.e. for
		//		retrieving chunks of data from huge data stores on the server (by server-side filtering!).
		//		Upon calling the fetch() method of this store the data are requested from
		//		the server if they are not yet loaded for paging (or cached).
		//
		//		For example used for a combobox which works on lots of data. It
		//		can be used to retrieve the data partially upon entering the
		//		letters "ac" it returns only items like "action", "acting", etc.
		//
		//		note:
		//		The field name "id" in a query is reserved for looking up data
		//		by id. This is necessary as before the first fetch, the store
		//		has no way of knowing which field the server will declare as
		//		identifier.
		//
		// example:
		// |	// The parameter "query" contains the data that are sent to the server.
		// |	var store = new dojox.data.QueryReadStore({url:'/search.php'});
		// |	store.fetch({query:{name:'a'}, queryOptions:{ignoreCase:false}});
		//
		// |	// Since "serverQuery" is given, it overrules and those data are
		// |	// sent to the server.
		// |	var store = new dojox.data.QueryReadStore({url:'/search.php'});
		// |	store.fetch({serverQuery:{name:'a'}, queryOptions:{ignoreCase:false}});
		//
		// |	<div dojoType="dojox.data.QueryReadStore"
		// |		jsId="store2"
		// |		url="../tests/stores/QueryReadStore.php"
		// |		requestMethod="post"></div>
		// |	<div dojoType="dojox.grid.data.DojoData"
		// |		jsId="model2"
		// |		store="store2"
		// |		sortFields="[{attribute: 'name', descending: true}]"
		// |		rowsPerPage="30"></div>
		// |	<div dojoType="dojox.Grid" id="grid2"
		// |		model="model2"
		// |		structure="gridLayout"
		// |		style="height:300px; width:800px;"></div>

		// todo:
		//		- there is a bug in the paging, when i set start:2, count:5 after an initial fetch() and doClientPaging:true
		//		  it returns 6 elemetns, though count=5, try it in QueryReadStore.html
		//		- add optional caching
		//		- when the first query searched for "a" and the next for a subset of
		//		  the first, i.e. "ab" then we actually dont need a server request, if
		//		  we have client paging, we just need to filter the items we already have
		//		  that might also be tooo much logic
		
		url:"",
		requestMethod:"get",
		//useCache:false,
		
		// We use the name in the errors, once the name is fixed hardcode it, may be.
		_className:"dojox.data.QueryReadStore",
		
		// This will contain the items we have loaded from the server.
		// The contents of this array is optimized to satisfy all read-api requirements
		// and for using lesser storage, so the keys and their content need some explaination:
		//		this._items[0].i - the item itself
		//		this._items[0].r - a reference to the store, so we can identify the item
		//			securely. We set this reference right after receiving the item from the
		//			server.
		_items:[],
		
		// Store the last query that triggered xhr request to the server.
		// So we can compare if the request changed and if we shall reload
		// (this also depends on other factors, such as is caching used, etc).
		_lastServerQuery:null,
		
		// Store how many rows we have so that we can pass it to a clientPaging handler
		_numRows:-1,
		
		// Store a hash of the last server request. Actually I introduced this
		// for testing, so I can check if no unnecessary requests were issued for
		// client-side-paging.
		lastRequestHash:null,
		
		// doClientPaging: Boolean
		//		By default every request for paging is sent to the server.
		doClientPaging:false,
	
		// doClientSorting: Boolean
		//		By default all the sorting is done serverside before the data is returned
		//		which is the proper place to be doing it for really large datasets.
		doClientSorting:false,
	
		// Items by identify for Identify API
		_itemsByIdentity:null,
		
		// Identifier used
		_identifier:null,
	
		_features: {'dojo.data.api.Read':true, 'dojo.data.api.Identity':true},
	
		_labelAttr: "label",
		
		constructor: function(/* Object */ params){
			dojo.mixin(this,params);
		},
		
		getValue: function(/* item */ item, /* attribute-name-string */ attribute, /* value? */ defaultValue){
			//	According to the Read API comments in getValue() and exception is
			//	thrown when an item is not an item or the attribute not a string!
			this._assertIsItem(item);
			if(!dojo.isString(attribute)){
				throw new Error(this._className+".getValue(): Invalid attribute, string expected!");
			}
			if(!this.hasAttribute(item, attribute)){
				// read api says: return defaultValue "only if *item* does not have a value for *attribute*."
				// Is this the case here? The attribute doesn't exist, but a defaultValue, sounds reasonable.
				if(defaultValue){
					return defaultValue;
				}
			}
			return item.i[attribute];
		},
		
		getValues: function(/* item */ item, /* attribute-name-string */ attribute){
			this._assertIsItem(item);
			var ret = [];
			if(this.hasAttribute(item, attribute)){
				ret.push(item.i[attribute]);
			}
			return ret;
		},
		
		getAttributes: function(/* item */ item){
			this._assertIsItem(item);
			var ret = [];
			for(var i in item.i){
				ret.push(i);
			}
			return ret;
		},
	
		hasAttribute: function(/* item */ item,	/* attribute-name-string */ attribute){
			// summary:
			//		See dojo/data/api/Read.hasAttribute()
			return this.isItem(item) && typeof item.i[attribute]!="undefined";
		},
		
		containsValue: function(/* item */ item, /* attribute-name-string */ attribute, /* anything */ value){
			var values = this.getValues(item, attribute);
			var len = values.length;
			for(var i=0; i<len; i++){
				if(values[i] == value){
					return true;
				}
			}
			return false;
		},
		
		isItem: function(/* anything */ something){
			// Some basic tests, that are quick and easy to do here.
			// >>> var store = new dojox.data.QueryReadStore({});
			// >>> store.isItem("");
			// false
			//
			// >>> var store = new dojox.data.QueryReadStore({});
			// >>> store.isItem({});
			// false
			//
			// >>> var store = new dojox.data.QueryReadStore({});
			// >>> store.isItem(0);
			// false
			//
			// >>> var store = new dojox.data.QueryReadStore({});
			// >>> store.isItem({name:"me", label:"me too"});
			// false

			if(something){
				return typeof something.r != "undefined" && something.r == this;
			}
			return false;
		},
		
		isItemLoaded: function(/* anything */ something){
			// Currently we dont have any state that tells if an item is loaded or not
			// if the item exists its also loaded.
			// This might change when we start working with refs inside items ...
			return this.isItem(something);
		},
	
		loadItem: function(/* object */ args){
			if(this.isItemLoaded(args.item)){
				return;
			}
			// Actually we have nothing to do here, or at least I dont know what to do here ...
		},
	
		fetch:function(/* Object? */ request){
			// summary:
			//		See dojo.data.util.simpleFetch.fetch() this is just a copy and I adjusted
			//		only the paging, since it happens on the server if doClientPaging is
			//		false, thx to http://trac.dojotoolkit.org/ticket/4761 reporting this.
			//		Would be nice to be able to use simpleFetch() to reduce copied code,
			//		but i dont know how yet. Ideas please!
			request = request || {};
			if(!request.store){
				request.store = this;
			}
			var self = this;
		
			var _errorHandler = function(errorData, requestObject){
				if(requestObject.onError){
					var scope = requestObject.scope || dojo.global;
					requestObject.onError.call(scope, errorData, requestObject);
				}
			};
		
			var _fetchHandler = function(items, requestObject, numRows){
				var oldAbortFunction = requestObject.abort || null;
				var aborted = false;
				
				var startIndex = requestObject.start?requestObject.start:0;
				if(self.doClientPaging == false){
					// For client paging we dont need no slicing of the result.
					startIndex = 0;
				}
				var endIndex = requestObject.count?(startIndex + requestObject.count):items.length;
		
				requestObject.abort = function(){
					aborted = true;
					if(oldAbortFunction){
						oldAbortFunction.call(requestObject);
					}
				};
		
				var scope = requestObject.scope || dojo.global;
				if(!requestObject.store){
					requestObject.store = self;
				}
				if(requestObject.onBegin){
					requestObject.onBegin.call(scope, numRows, requestObject);
				}
				if(requestObject.sort && self.doClientSorting){
					items.sort(dojo.data.util.sorter.createSortFunction(requestObject.sort, self));
				}
				if(requestObject.onItem){
					for(var i = startIndex; (i < items.length) && (i < endIndex); ++i){
						var item = items[i];
						if(!aborted){
							requestObject.onItem.call(scope, item, requestObject);
						}
					}
				}
				if(requestObject.onComplete && !aborted){
					var subset = null;
					if(!requestObject.onItem){
						subset = items.slice(startIndex, endIndex);
					}
					requestObject.onComplete.call(scope, subset, requestObject);
				}
			};
			this._fetchItems(request, _fetchHandler, _errorHandler);
			return request;	// Object
		},
	
		getFeatures: function(){
			return this._features;
		},
	
		close: function(/*dojo/data/api/Request|Object?*/ request){
			// I have no idea if this is really needed ...
		},
	
		getLabel: function(/* item */ item){
			// summary:
			//		See dojo/data/api/Read.getLabel()
			if(this._labelAttr && this.isItem(item)){
				return this.getValue(item, this._labelAttr); //String
			}
			return undefined; //undefined
		},
	
		getLabelAttributes: function(/* item */ item){
			// summary:
			//		See dojo/data/api/Read.getLabelAttributes()
			if(this._labelAttr){
				return [this._labelAttr]; //array
			}
			return null; //null
		},
		
		_xhrFetchHandler: function(data, request, fetchHandler, errorHandler){
			data = this._filterResponse(data);
			if(data.label){
				this._labelAttr = data.label;
			}
			var numRows = data.numRows || -1;

			this._items = [];
			// Store a ref to "this" in each item, so we can simply check if an item
			// really origins form here (idea is from ItemFileReadStore, I just don't know
			// how efficient the real storage use, garbage collection effort, etc. is).
			dojo.forEach(data.items,function(e){
				this._items.push({i:e, r:this});
			},this);
			
			var identifier = data.identifier;
			this._itemsByIdentity = {};
			if(identifier){
				this._identifier = identifier;
				var i;
				for(i = 0; i < this._items.length; ++i){
					var item = this._items[i].i;
					var identity = item[identifier];
					if(!this._itemsByIdentity[identity]){
						this._itemsByIdentity[identity] = item;
					}else{
						throw new Error(this._className+":  The json data as specified by: [" + this.url + "] is malformed.  Items within the list have identifier: [" + identifier + "].  Value collided: [" + identity + "]");
					}
				}
			}else{
				this._identifier = Number;
				for(i = 0; i < this._items.length; ++i){
					this._items[i].n = i;
				}
			}
			
			// TODO actually we should do the same as dojo.data.ItemFileReadStore._getItemsFromLoadedData() to sanitize
			// (does it really sanititze them) and store the data optimal. should we? for security reasons???
			numRows = this._numRows = (numRows === -1) ? this._items.length : numRows;
			fetchHandler(this._items, request, numRows);
			this._numRows = numRows;
		},
		
		_fetchItems: function(request, fetchHandler, errorHandler){
			// summary:
			//		The request contains the data as defined in the Read-API.
			//		Additionally there is following keyword "serverQuery".
			//
			//		####The *serverQuery* parameter, optional.
			//
			//		This parameter contains the data that will be sent to the server.
			//		If this parameter is not given the parameter "query"'s
			//		data are sent to the server. This is done for some reasons:
			//
			//		- to specify explicitly which data are sent to the server, they
			//		  might also be a mix of what is contained in "query", "queryOptions"
			//		  and the paging parameters "start" and "count" or may be even
			//		  completely different things.
			//		- don't modify the request.query data, so the interface using this
			//		  store can rely on unmodified data, as the combobox dijit currently
			//		  does it, it compares if the query has changed
			//		- request.query is required by the Read-API
			//
			//		I.e. the following examples might be sent via GET:
			//	|	  fetch({query:{name:"abc"}, queryOptions:{ignoreCase:true}})
			//		  the URL will become:   /url.php?name=abc
			//
			//	|	  fetch({serverQuery:{q:"abc", c:true}, query:{name:"abc"}, queryOptions:{ignoreCase:true}})
			//		  the URL will become:   /url.php?q=abc&c=true
			//	|	  // The serverQuery-parameter has overruled the query-parameter
			//	|	  // but the query parameter stays untouched, but is not sent to the server!
			//	|	  // The serverQuery contains more data than the query, so they might differ!

			var serverQuery = request.serverQuery || request.query || {};
			//Need to add start and count
			if(!this.doClientPaging){
				serverQuery.start = request.start || 0;
				// Count might not be sent if not given.
				if(request.count){
					serverQuery.count = request.count;
				}
			}
			if(!this.doClientSorting && request.sort){
				var sortInfo = [];
				dojo.forEach(request.sort, function(sort){
					if(sort && sort.attribute){
						sortInfo.push((sort.descending ? "-" : "") + sort.attribute);
					}
				});
				serverQuery.sort = sortInfo.join(',');
			}
			// Compare the last query and the current query by simply json-encoding them,
			// so we dont have to do any deep object compare ... is there some dojo.areObjectsEqual()???
			if(this.doClientPaging && this._lastServerQuery !== null &&
				dojo.toJson(serverQuery) == dojo.toJson(this._lastServerQuery)
				){
				this._numRows = (this._numRows === -1) ? this._items.length : this._numRows;
				fetchHandler(this._items, request, this._numRows);
			}else{
				var xhrFunc = this.requestMethod.toLowerCase() == "post" ? dojo.xhrPost : dojo.xhrGet;
				var xhrHandler = xhrFunc({url:this.url, handleAs:"json-comment-optional", content:serverQuery, failOk: true});
				request.abort = function(){
					xhrHandler.cancel();
				};
				xhrHandler.addCallback(dojo.hitch(this, function(data){
					this._xhrFetchHandler(data, request, fetchHandler, errorHandler);
				}));
				xhrHandler.addErrback(function(error){
					errorHandler(error, request);
				});
				// Generate the hash using the time in milliseconds and a randon number.
				// Since Math.randon() returns something like: 0.23453463, we just remove the "0."
				// probably just for esthetic reasons :-).
				this.lastRequestHash = new Date().getTime()+"-"+String(Math.random()).substring(2);
				this._lastServerQuery = dojo.mixin({}, serverQuery);
			}
		},
		
		_filterResponse: function(data){
			// summary:
			//		If the data from servers needs to be processed before it can be processed by this
			//		store, then this function should be re-implemented in subclass. This default
			//		implementation just return the data unchanged.
			// data:
			//		The data received from server
			return data;
		},
	
		_assertIsItem: function(/* item */ item){
			// summary:
			//		It throws an error if item is not valid, so you can call it in every method that needs to
			//		throw an error when item is invalid.
			// item:
			//		The item to test for being contained by the store.
			if(!this.isItem(item)){
				throw new Error(this._className+": Invalid item argument.");
			}
		},
	
		_assertIsAttribute: function(/* attribute-name-string */ attribute){
			// summary:
			//		This function tests whether the item passed in is indeed a valid 'attribute' like type for the store.
			// attribute:
			//		The attribute to test for being contained by the store.
			if(typeof attribute !== "string"){
				throw new Error(this._className+": Invalid attribute argument ('"+attribute+"').");
			}
		},
	
		fetchItemByIdentity: function(/* Object */ keywordArgs){
			// summary:
			//		See dojo/data/api/Identity.fetchItemByIdentity()
	
			// See if we have already loaded the item with that id
			// In case there hasn't been a fetch yet, _itemsByIdentity is null
			// and thus a fetch will be triggered below.
			if(this._itemsByIdentity){
				var item = this._itemsByIdentity[keywordArgs.identity];
				if(!(item === undefined)){
					if(keywordArgs.onItem){
						var scope = keywordArgs.scope ? keywordArgs.scope : dojo.global;
						keywordArgs.onItem.call(scope, {i:item, r:this});
					}
					return;
				}
			}
	
			// Otherwise we need to go remote
			// Set up error handler
			var _errorHandler = function(errorData, requestObject){
				var scope = keywordArgs.scope ? keywordArgs.scope : dojo.global;
				if(keywordArgs.onError){
					keywordArgs.onError.call(scope, errorData);
				}
			};
			
			// Set up fetch handler
			var _fetchHandler = function(items, requestObject){
				var scope = keywordArgs.scope ? keywordArgs.scope : dojo.global;
				try{
					// There is supposed to be only one result
					var item = null;
					if(items && items.length == 1){
						item = items[0];
					}
					
					// If no item was found, item is still null and we'll
					// fire the onItem event with the null here
					if(keywordArgs.onItem){
						keywordArgs.onItem.call(scope, item);
					}
				}catch(error){
					if(keywordArgs.onError){
						keywordArgs.onError.call(scope, error);
					}
				}
			};
			
			// Construct query
			var request = {serverQuery:{id:keywordArgs.identity}};
			
			// Dispatch query
			this._fetchItems(request, _fetchHandler, _errorHandler);
		},
		
		getIdentity: function(/* item */ item){
			// summary:
			//		See dojo/data/api/Identity.getIdentity()
			var identifier = null;
			if(this._identifier === Number){
				identifier = item.n; // Number
			}else{
				identifier = item.i[this._identifier];
			}
			return identifier;
		},
		
		getIdentityAttributes: function(/* item */ item){
			// summary:
			//		See dojo/data/api/Identity.getIdentityAttributes()
			return [this._identifier];
		}
	}
);

return dojox.data.QueryReadStore;
});
