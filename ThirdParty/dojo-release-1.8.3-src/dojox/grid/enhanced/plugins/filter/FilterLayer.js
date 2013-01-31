define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/kernel",
	"dojo/_base/json",
	"../_StoreLayer"
], function(declare, lang, kernel, json, layers){

	var cmdSetFilter = "filter",
		cmdClearFilter = "clear",
		hitchIfCan = function(scope, func){
			return func ? lang.hitch(scope || kernel.global, func) : function(){};
		},
		shallowClone = function(obj){
			var res = {};
			if(obj && lang.isObject(obj)){
				for(var name in obj){
					res[name] = obj[name];
				}
			}
			return res;
		};
	var _FilterLayerMixin = declare("dojox.grid.enhanced.plugins.filter._FilterLayerMixin", null, {
/*=====
		// _filter: _ConditionExpr
		//		The filter definition
		_filter: null,
		
		filterDef: function(filter){
			// summary:
			//		Get/set/clear the filter definition
			// tags:
			//		public
			// filter: (_ConditionExpr|null)?
			//		- null: clear filter definition
			//		- undefined: it's getter
			// returns:
			//		A filter definition if it's getter.
		},
=====*/
		tags: ["sizeChange"],
		name: function(){
			// summary:
			//		override from _StoreLayer.name
			return "filter";	//string
		},
		onFilterDefined: function(filter){},
		
		onFiltered: function(filteredSize, totalSize){
			// summary:
			//		Called when store data is filtered. This event is before *onComplete*, after *onBegin*.
			// tags:
			//		callback extension
			// filteredSize: Integer
			//		The number of remaining fetched items after filtering.
			// totalSize: Integer
			//		The number of original fetched items.
		}
	});
	var ServerSideFilterLayer = declare("dojox.grid.enhanced.plugins.filter.ServerSideFilterLayer", [layers._ServerSideLayer, _FilterLayerMixin], {
		constructor: function(args){
			this._onUserCommandLoad = args.setupFilterQuery || this._onUserCommandLoad;
			this.filterDef(null);
		},
		filterDef: function(/* (_ConditionExpr|null)? */filter){
			// summary:
			//		See _FilterLayerMixin.filterDef
			if(filter){
				this._filter = filter;
				var obj = filter.toObject();
				//Stateless implementation will need to parse the filter object.
				this.command(cmdSetFilter, this._isStateful ? json.toJson(obj) : obj);
				this.command(cmdClearFilter, null);
				this.useCommands(true);
				this.onFilterDefined(filter);
			}else if(filter === null){
				this._filter = null;
				this.command(cmdSetFilter, null);
				this.command(cmdClearFilter, true);
				this.useCommands(true);
				this.onFilterDefined(null);
			}
			return this._filter;	//_ConditionExpr
		},
		onCommandLoad: function(/* (in)string */responce, /* (in|out)keywordArgs */ userRequest){
			// summary:
			//		override from _ServerSideLayer.onCommandLoad
			this.inherited(arguments);
			var oldOnBegin = userRequest.onBegin;
			if(this._isStateful){
				var filteredSize;
				if(responce){
					this.command(cmdSetFilter, null);
					this.command(cmdClearFilter, null);
					this.useCommands(false);
					var sizes = responce.split(',');
					if(sizes.length >= 2){
						filteredSize = this._filteredSize = parseInt(sizes[0], 10);
						this.onFiltered(filteredSize, parseInt(sizes[1], 10));
					}else{
						//Error here.
						return;
					}
				}else{
					filteredSize = this._filteredSize;
				}
				if(this.enabled()){
					userRequest.onBegin = function(size, req){
						hitchIfCan(userRequest.scope, oldOnBegin)(filteredSize, req);
					};
				}
			}else{
				var _this = this;
				userRequest.onBegin = function(size, req){
					if(!_this._filter){
						_this._storeSize = size;
					}
					_this.onFiltered(size, _this._storeSize || size);
					req.onBegin = oldOnBegin;
					hitchIfCan(userRequest.scope, oldOnBegin)(size, req);
				};
			}
		}
	});
	var ClientSideFilterLayer = declare("dojox.grid.enhanced.plugins.filter.ClientSideFilterLayer", [layers._StoreLayer, _FilterLayerMixin], {
		// summary:
		//		Add a client side filter layer on top of the data store,
		//		so any filter expression can be applied to the store.
/*=====
		// _items: Array,
		//		Cached items (may contain holes)
		_items: [],
		
		// _result: Array,
		//		Current fetch result
		_result: [],

		// _resultStartIdx: Integer,
		//		The index in cache of the first result item
		_resultStartIdx: 0,
		
		// _indexMap: Array,
		//		A map from the row index of this._items to the row index of the original store.
		_indexMap: null,
		
		// _getter: function(datarow, colArg, rowIndex, store);
		//		A user defined way to get data from store
		_getter: null,
		
		// _nextUnfetchedIdx: Integer
		//		The index of the next item in the store that is never fetched.
		_nextUnfetchedIdx: 0,
=====*/
		// _storeSize: Integer
		//		The actual size of the original store
		_storeSize: -1,
		
		// _fetchAll
		//		If the store is small or store size must be correct when onBegin is called,
		//		we should fetch and filter all the items on the first query.
		_fetchAll: true,
		
		constructor: function(args){
			this.filterDef(null);
			args = lang.isObject(args) ? args : {};
			this.fetchAllOnFirstFilter(args.fetchAll);
			this._getter = lang.isFunction(args.getter) ? args.getter : this._defaultGetter;
		},
		_defaultGetter: function(datarow, colName, rowIndex, store){
			return store.getValue(datarow, colName);
		},
		filterDef: function(/* (_ConditionExpr|null)? */filter){
			// summary:
			//		See _FilterLayerMixin.filterDef
			if(filter !== undefined){
				this._filter = filter;
				this.invalidate();
				this.onFilterDefined(filter);
			}
			return this._filter;	//_ConditionExpr
		},
		setGetter: function(/* function */getter){
			// summary:
			//		Set the user defined way to retrieve data from store.
			// tags:
			//		public
			// getter: function(datarow, colArg, rowIndex, store);
			if(lang.isFunction(getter)){
				this._getter = getter;
			}
		},
		fetchAllOnFirstFilter: function(/* bool? */toFetchAll){
			// summary:
			//		The get/set function for fetchAll.
			// tags:
			//		public
			// toFetchAll: boolean?
			//		If provided, it's a set function, otherwise it's a get function.
			// returns:
			//		Whether fetch all on first filter if this is a getter
			if(toFetchAll !== undefined){
				this._fetchAll = !!toFetchAll;
			}
			return this._fetchAll;	//Boolean
		},
		invalidate: function(){
			// summary:
			//		Clear all the status information of this layer
			// tags:
			//		private
			this._items = [];
			this._nextUnfetchedIdx = 0;
			this._result = [];
			this._indexMap = [];
			this._resultStartIdx = 0;
		},
		//----------------Private Functions-----------------------------
		_fetch: function(userRequest,filterRequest){
			// summary:
			//		Implement _StoreLayer._fetch
			// tags:
			//		private callback
			// filterRequest: dojo/data/api/Request
			//		The actual request used in store.fetch.
			//		This function is called recursively to fill the result store items
			//		until the user specified item count is reached. Only in recursive calls,
			//		this parameter is valid.
			if(!this._filter){
				//If we don't have any filter, use the original request and fetch.
				var old_onbegin = userRequest.onBegin, _this = this;
				userRequest.onBegin = function(size, r){
					hitchIfCan(userRequest.scope, old_onbegin)(size, r);
					_this.onFiltered(size, size);
				};
				this.originFetch(userRequest);
				return userRequest;
			}
			try{
				//If the fetch is at the beginning, user's start position is used;
				//If we are in a recursion, our own request is used.
				var start = filterRequest ? filterRequest._nextResultItemIdx : userRequest.start;
				start = start || 0;
				if(!filterRequest){
					//Initially, we have no results.
					this._result = [];
					this._resultStartIdx = start;
					var sortStr;
					if(lang.isArray(userRequest.sort) && userRequest.sort.length > 0 &&
						//Sort info will stay here in every re-fetch, so remember it!
						(sortStr = json.toJson(userRequest.sort)) != this._lastSortInfo){
						//If we should sort data, all the old caches are no longer valid.
						this.invalidate();
						this._lastSortInfo = sortStr;
					}
				}
				//this._result contains the current fetch result (of every recursion).
				var end = typeof userRequest.count == "number" ?
					start + userRequest.count - this._result.length : this._items.length;
				//Try to retrieve all the items from our cache.
				//Only need items after userRequest.start, test it in case start is smaller.
				if(this._result.length){
					this._result = this._result.concat(this._items.slice(start, end));
				}else{
					this._result = this._items.slice(userRequest.start, typeof userRequest.count == "number" ?
						userRequest.start + userRequest.count : this._items.length);
				}
				if(this._result.length >= userRequest.count || this._hasReachedStoreEnd()){
					//We already have had enough items, or we have to stop fetching because there's nothing more to fetch.
					this._completeQuery(userRequest);
				}else{
					//User's request hasn't been finished yet. Fetch more.
					if(!filterRequest){
						//Initially, we've got to create a new request object.
						filterRequest = shallowClone(userRequest);
						//Use our own onBegin function to remember the total size of the original store.
						filterRequest.onBegin = lang.hitch(this, this._onFetchBegin);
						filterRequest.onComplete = lang.hitch(this, function(items, req){
							//We've fetched some more, so march ahead!
							this._nextUnfetchedIdx += items.length;
							//Actual filtering work goes here. Survived items are added to our cache.
							//req is our own request object.
							this._doFilter(items, req.start, userRequest);
							//Recursively call this function. Let's do this again!
							this._fetch(userRequest, req);
						});
					}
					//Fetch starts from the next unfetched item.
					filterRequest.start = this._nextUnfetchedIdx;
					//If store is small, we should only fetch once.
					if(this._fetchAll){
						delete filterRequest.count;
					}
					//Remember we've (maybe) already added something to our result array, so next time we should not start over again.
					filterRequest._nextResultItemIdx = end < this._items.length ? end : this._items.length;
					//Actual fetch work goes here.
					this.originFetch(filterRequest);
				}
			}catch(e){
				if(userRequest.onError){
					hitchIfCan(userRequest.scope, userRequest.onError)(e, userRequest);
				}else{
					throw e;
				}
			}
			return userRequest;
		},
		_hasReachedStoreEnd: function(){
			// summary:
			//		Check whether all the items in the original store have been fetched.
			// tags:
			//		private
			return this._storeSize >= 0 && this._nextUnfetchedIdx >= this._storeSize;	//Boolean
		},
		_applyFilter: function(/* data item */datarow,/* Integer */rowIndex){
			// summary:
			//		Apply the filter to a row of data
			// tags:
			//		private
			// returns:
			//		whether this row survived the filter.
			var g = this._getter, s = this._store;
			try{
				return !!(this._filter.applyRow(datarow, function(item, arg){
					return g(item, arg, rowIndex, s);
				}).getValue());
			}catch(e){
				console.warn("FilterLayer._applyFilter() error: ", e);
				return false;
			}
		},
		_doFilter: function(/* Array */items,/* Integer */startIdx,/* object */userRequest){
			// summary:
			//		Use the filter expression to filter items. Survived items are stored in this._items.
			//		The given items start from "startIdx" in the original store.
			// tags:
			//		private
			for(var i = 0, cnt = 0; i < items.length; ++i){
				if(this._applyFilter(items[i], startIdx + i)){
					hitchIfCan(userRequest.scope, userRequest.onItem)(items[i], userRequest);
					cnt += this._addCachedItems(items[i], this._items.length);
					this._indexMap.push(startIdx + i);
				}
			}
		},
		_onFetchBegin: function(/* Integer */size,/* request object */req){
			// summary:
			//		This function is used to replace the user's onFetchBegin in store.fetch
			// tags:
			//		private
			this._storeSize = size;
		},
		_completeQuery: function(/* request object */userRequest){
			// summary:
			//		Logically, the user's query is completed here, i.e., all the filtered results are ready.
			//		(or their index mappings are ready)
			// tags:
			//		private
			var size = this._items.length;
			if(this._nextUnfetchedIdx < this._storeSize){
				//FIXME: There's still some items in the original store that are not fetched & filtered.
				//So we have to estimate a little bigger size to allow scrolling to these unfetched items.
				//However, this behavior is ONLY correct in Grid! Any better way to do this?
				size++;
			}
			hitchIfCan(userRequest.scope, userRequest.onBegin)(size,userRequest);
			this.onFiltered(this._items.length, this._storeSize);
			hitchIfCan(userRequest.scope, userRequest.onComplete)(this._result, userRequest);
		},
		_addCachedItems: function(/* Array */items,/* Integer */filterStartIdx){
			// summary:
			//		Add data items to the cache. The insert point is at *filterStartIdx*
			// tags:
			//		private
			// items: Array
			//		Data items to add.
			// filterStartIdx: Integer
			//		The start point to insert in the cache.
			if(!lang.isArray(items)){
				items = [items];
			}
			for(var k = 0; k < items.length; ++k){
				this._items[filterStartIdx + k] = items[k];
			}
			return items.length;
		},
		onRowMappingChange: function(mapping){
			//This function runs in FilterLayer scope!
			if(this._filter){
				var m = lang.clone(mapping),
					alreadyUpdated = {};
				for(var r in m){
					r = parseInt(r, 10);
					mapping[this._indexMap[r]] = this._indexMap[m[r]];
					if(!alreadyUpdated[this._indexMap[r]]){
						alreadyUpdated[this._indexMap[r]] = true;
					}
					if(!alreadyUpdated[r]){
						alreadyUpdated[r] = true;
						delete mapping[r];
					}
				}
			}
		}
	});

	return lang.mixin({
		ServerSideFilterLayer: ServerSideFilterLayer,
		ClientSideFilterLayer: ClientSideFilterLayer
	}, layers);
});
