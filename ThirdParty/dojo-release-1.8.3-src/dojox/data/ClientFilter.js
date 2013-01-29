define(["dojo/_base/declare", "dojo/_base/lang", "dojo/_base/array", "dojo/_base/Deferred", "dojo/data/util/filter"], 
  function(declare, lang, array, Deferred, filter) {

// This is an abstract data store module for adding updatable result set functionality to an existing data store class

	var addUpdate = function(store,create,remove){
		// create a handler that adds to the list of notifications
		return function(item){
			store._updates.push({
					create:create && item,
					remove:remove && item
				});
			ClientFilter.onUpdate();
		}
	};
	var ClientFilter = declare("dojox.data.ClientFilter", null, {
			cacheByDefault: false,
			constructor: function(){
				// summary:
				//		This is an abstract class that data stores can extend to add updateable result set functionality
				//		as well as client side querying capabilities. This enables
				//		widgets to be aware of how active results change in response to the modifications/notifications.
				// description:
				//		To a update a result set after a notification (onNew, onSet, and onDelete),
				//		widgets can call the updateResultSet method. Widgets can use the updated
				//		result sets to determine how to react to notifications, and how to update their displayed results
				//		based on changes.
				//
				//		This module will use the best available information to update result sets, using query attribute
				//		objects to determine if items are in a result set, and using the sort arrays to maintain sort
				//		information. However, queries can be opaque strings, and this module can not update
				//		results by itself in this case. In this situations, data stores can provide a isUpdateable(request) function
				//		and matchesQuery(item,request) function. If a data store can handle a query, it can return true from
				//		isUpdateable and if an item matches a query, it can return true from matchesQuery. Here is
				//		definition of isUpdateable and matchesQuery:
				//
				//		- isUpdateable(request)  - request is the keywords arguments as is passed to the fetch function.
				//		- matchesQuery(item,request) - item is the item to test, and request is the value arguments object
				//		for the fetch function.
				//
				//		You can define a property on this object instance "cacheByDefault" to a value of true that will
				//		cause all queries to be cached by default unless the cache queryOption is explicitly set to false.
				//		This can be defined in the constructor options for ServiceStore/JsonRestStore and subtypes.
				//
				// example:
				//		to make a updated-result-set data store from an existing data store:
				//	|	declare("dojox.data.MyLiveDataStore",
				//	|		dojox.data.MyDataStore,dojox.data.ClientFilter], // subclass LiveResultSets if available
				//	|		{}
				//	|	);
				this.onSet = addUpdate(this,true,true);
				this.onNew = addUpdate(this,true,false);
				this.onDelete = addUpdate(this,false,true);
				this._updates= [];
				this._fetchCache = [];
			},
			clearCache: function(){
				// summary:
				//		Clears the cache of client side queries
				this._fetchCache = [];
			},
			updateResultSet: function(/*Array*/ resultSet, /*Object*/ request){
				// summary:
				//		Attempts to update the given result set based on previous notifications
				// resultSet:
				//		The result set array that should be updated
				// request:
				//		This object follows the same meaning as the keywordArgs passed to a dojo/data/api/Read.fetch.
				// description:
				//		This will attempt to update the provide result based on previous notification, adding new items
				//		from onNew calls, removing deleted items, and updating modified items, and properly removing
				//		and adding items as required by the query and sort parameters.
				// returns:
				//		- 0: Indicates it could not successfully update the result set
				//		- 1: Indicates it could successfully handle all the notifications, but no changes were made to the result set
				//		- 2: Indicates it successfully handled all the notifications and result set has been updated.
				if(this.isUpdateable(request)){
					// we try to avoid rerunning notification updates more than once on the same object for performance
					for(var i = request._version || 0; i < this._updates.length;i++){
						// for each notification,we will update the result set
						var create = this._updates[i].create;
						var remove = this._updates[i].remove;
						if(remove){
							for(var j = 0; j < resultSet.length;j++){
								if(this.getIdentity(resultSet[j]) == this.getIdentity(remove)){
									resultSet.splice(j--,1);
									var updated = true;
								}
							}
						}
						if(create && this.matchesQuery(create,request) && // if there is a new/replacement item and it matches the query
								array.indexOf(resultSet,create) == -1){ // and it doesn't already exist in query
							resultSet.push(create); // should this go at the beginning by default instead?
							updated = true;
						}
					}
					if(request.sort && updated){
						// do the sort if needed
						resultSet.sort(this.makeComparator(request.sort.concat()));
					}
					resultSet._fullLength = resultSet.length;
					if(request.count && updated && request.count !== Infinity){
						// do we really need to do this?
						// make sure we still find within the defined paging set
						resultSet.splice(request.count, resultSet.length);
					}
					request._version = this._updates.length;
					return updated ? 2 : 1;
				}
				return 0;
			},
			querySuperSet: function(argsSuper, argsSub){
				// summary:
				//		Determines whether the provided arguments are super/sub sets of each other
				// argsSuper:
				//		Dojo Data Fetch arguments
				// argsSub:
				//		Dojo Data Fetch arguments
				if(argsSuper.query == argsSub.query){
					return {};
				}
				if(!(argsSub.query instanceof Object && // sub query must be an object
						// super query must be non-existent or an object
						(!argsSuper.query || typeof argsSuper.query == 'object'))){
					return false;
				}
				var clientQuery = lang.mixin({},argsSub.query);
				for(var i in argsSuper.query){
					if(clientQuery[i] == argsSuper.query[i]){
						delete clientQuery[i];
					}else if(!(typeof argsSuper.query[i] == 'string' &&
							// if it is a pattern, we can test to see if it is a sub-pattern
							// FIXME: This is not technically correct, but it will work for the majority of cases
							filter.patternToRegExp(argsSuper.query[i]).test(clientQuery[i]))){
						return false;
					}
				}
				return clientQuery;
			},
			//	This is the point in the version notification history at which it is known that the server is in sync, this should
			//	be updated to this._updates.length on commit operations.
			serverVersion: 0,
			
			cachingFetch: function(args){
				var self = this;
				for(var i = 0; i < this._fetchCache.length;i++){
					var cachedArgs = this._fetchCache[i];
					var clientQuery = this.querySuperSet(cachedArgs,args);
					if(clientQuery !== false){
						var defResult = cachedArgs._loading;
						if(!defResult){
							defResult = new Deferred();
							defResult.callback(cachedArgs.cacheResults);
						}
						defResult.addCallback(function(results){
							results = self.clientSideFetch(lang.mixin(lang.mixin({}, args),{query:clientQuery}), results);
							defResult.fullLength = results._fullLength;
							return results;
						});
						args._version = cachedArgs._version;
						break;
					}
				}
				if(!defResult){
					var serverArgs = lang.mixin({}, args);
					var putInCache = (args.queryOptions || 0).cache;
					var fetchCache = this._fetchCache;
					if(putInCache === undefined ? this.cacheByDefault : putInCache){
						// we are caching this request, so we want to get all the data, and page on the client side
						if(args.start || args.count){
							delete serverArgs.start;
							delete serverArgs.count;
							args.clientQuery = lang.mixin(args.clientQuery || {}, {
								start: args.start,
								count: args.count
							});
						}
						args = serverArgs;
						fetchCache.push(args);
					}
					defResult= args._loading = this._doQuery(args);

					defResult.addErrback(function(){
						fetchCache.splice(array.indexOf(fetchCache, args), 1);
					});
				}
				var version = this.serverVersion;
				
				defResult.addCallback(function(results){
					delete args._loading;
					// update the result set in case anything changed while we were waiting for the fetch
					if(results){
						args._version = typeof args._version == "number" ? args._version : version;
						self.updateResultSet(results,args);
						args.cacheResults = results;
						if(!args.count || results.length < args.count){
							defResult.fullLength = ((args.start)?args.start:0) + results.length;
						}
					}
					return results;
				});
				return defResult;
			},
			isUpdateable: function(/*Object*/ request){
				// summary:
				//		Returns whether the provide fetch arguments can be used to update an existing list
				// request:
				//		See dojo/data/api/Read.fetch request
				
				return !request.query || typeof request.query == "object";
			},
			clientSideFetch: function(/*Object*/ request,/*Array*/ baseResults){
				// summary:
				//		Performs a query on the client side and returns the results as an array
				// request:
				//		See dojo/data/api/Read.fetch request
				// baseResults:
				//		This provides the result set to start with for client side querying
				if(request.queryOptions && request.queryOptions.results){
					baseResults = request.queryOptions.results;
				}
				if(request.query){
					// filter by the query
					var results = [];
					for(var i = 0; i < baseResults.length; i++){
						var value = baseResults[i];
						if(value && this.matchesQuery(value,request)){
							results.push(baseResults[i]);
						}
					}
				}else{
					results = request.sort ? baseResults.concat() : baseResults; // we don't want to mutate the baseResults if we are doing a sort
				}
				if(request.sort){
					// do the sort if needed
					results.sort(this.makeComparator(request.sort.concat()));
				}
				return this.clientSidePaging(request, results);
			},
			clientSidePaging: function(/*Object*/ request,/*Array*/ baseResults){
				var start = request.start || 0;
				var finalResults = (start || request.count) ? baseResults.slice(start,start + (request.count || baseResults.length)) : baseResults;
				finalResults._fullLength = baseResults.length;
				return finalResults;
			},
			matchesQuery: function(item,request){
				var query = request.query;
				var ignoreCase = request.queryOptions && request.queryOptions.ignoreCase;
				for(var i in query){
					// if anything doesn't match, than this should be in the query
					var match = query[i];
					var value = this.getValue(item,i);
					if((typeof match == 'string' && (match.match(/[\*\.]/) || ignoreCase)) ?
						!filter.patternToRegExp(match, ignoreCase).test(value) :
						value != match){
						return false;
					}
				}
				return true;
			},
			makeComparator: function(sort){
				// summary:
				//		returns a comparator function for the given sort order array
				// sort:
				//		See dojox.data.api.Read.fetch
				var current = sort.shift();
				if(!current){
					// sort order for ties and no sort orders
					return function(){
						return 0;// keep the order unchanged
					};
				}
				var attribute = current.attribute;
				var descending = !!current.descending;
				var next = this.makeComparator(sort);
				var store = this;
				return function(a,b){
					var av = store.getValue(a,attribute);
					var bv = store.getValue(b,attribute);
					if(av != bv){
						return av < bv == descending ? 1 : -1;
					}
					return next(a,b);
				};
			}
		}
	);
	ClientFilter.onUpdate = function(){};

	return ClientFilter;
});
