define(["../_base/lang","../_base/Deferred"
],function(lang, Deferred) {
	// module:
	//		dojo/store/Cache
	// summary:
	//		TODOC

var store = lang.getObject("dojo.store", true);

/*=====
dojo.declare("dojo.store.__CacheArgs", null, {
	constructor: function(){
		// summary:
		//		These are additional options for how caching is handled.
		// isLoaded: Function?
		//		This is a function that will be called for each item in a query response to determine
		//		if it is cacheable. If isLoaded returns true, the item will be cached, otherwise it
		//		will not be cached. If isLoaded is not provided, all items will be cached.
		this.isLoaded = isLoaded;
	}
});
=====*/
store.Cache = function(masterStore, cachingStore, /*dojo.store.__CacheArgs*/ options){
	// summary:
	//		The Cache store wrapper takes a master store and a caching store,
	//		caches data from the master into the caching store for faster
	//		lookup. Normally one would use a memory store for the caching
	//		store and a server store like JsonRest for the master store.
	// masterStore:
	//		This is the authoritative store, all uncached requests or non-safe requests will
	//		be made against this store.
	// cachingStore:
	//		This is the caching store that will be used to store responses for quick access.
	//		Typically this should be a local store.
	// options:
	//		These are additional options for how caching is handled.
	options = options || {};
	return lang.delegate(masterStore, {
		query: function(query, directives){
			var results = masterStore.query(query, directives);
			results.forEach(function(object){
				if(!options.isLoaded || options.isLoaded(object)){
					cachingStore.put(object);
				}
			});
			return results;
		},
		// look for a queryEngine in either store
		queryEngine: masterStore.queryEngine || cachingStore.queryEngine,
		get: function(id, directives){
			return Deferred.when(cachingStore.get(id), function(result){
				return result || Deferred.when(masterStore.get(id, directives), function(result){
					if(result){
						cachingStore.put(result, {id: id});
					}
					return result;
				});
			});
		},
		add: function(object, directives){
			return Deferred.when(masterStore.add(object, directives), function(result){
				// now put result in cache
				return cachingStore.add(typeof result == "object" ? result : object, directives);
			});
		},
		put: function(object, directives){
			// first remove from the cache, so it is empty until we get a response from the master store
			cachingStore.remove((directives && directives.id) || this.getIdentity(object));
			return Deferred.when(masterStore.put(object, directives), function(result){
				// now put result in cache
				return cachingStore.put(typeof result == "object" ? result : object, directives);
			});
		},
		remove: function(id, directives){
			return Deferred.when(masterStore.remove(id, directives), function(result){
				return cachingStore.remove(id, directives);
			});
		},
		evict: function(id){
			return cachingStore.remove(id);
		}
	});
};
/*=====
dojo.declare("dojo.store.Cache", null, {
	// example:
	//	|	var master = new dojo.store.Memory(data);
	//	|	var cacher = new dojo.store.Memory();
	//	|	var store = new dojo.store.Cache(master, cacher);
	//
	query: function(query, directives){
		// summary:
		//		Query the underlying master store and cache any results.
		// query: Object|String
		//		The object or string containing query information. Dependent on the query engine used.
		// directives: dojo.store.util.SimpleQueryEngine.__queryOptions?
		//		An optional keyword arguments object with additional parameters describing the query.
		// returns: dojo.store.util.QueryResults
		//		A QueryResults object that can be used to iterate over.
	},
	get: function(id, directives){
		// summary:
		//		Get the object with the specific id.
		// id: Number
		//		The identifier for the object in question.
		// directives: dojo.store.__GetOptions?
		//		Any additional parameters needed to describe how the get should be performed.
		// returns: dojo.store.util.QueryResults
		//		A QueryResults object.
	},
	add: function(object, directives){
		// summary:
		//		Add the given object to the store.
		// object: Object
		//		The object to add to the store.
		// directives: dojo.store.__AddOptions?
		//		Any additional parameters needed to describe how the add should be performed.
		// returns: Number
		//		The new id for the object.
	},
	put: function(object, directives){
		// summary:
		//		Put the object into the store (similar to an HTTP PUT).
		// object: Object
		//		The object to put to the store.
		// directives: dojo.store.__PutOptions?
		//		Any additional parameters needed to describe how the put should be performed.
		// returns: Number
		//		The new id for the object.
	},
	remove: function(id, directives){
		// summary:
		//		Remove the object with the specific id.
		// id: Number
		//		The identifier for the object in question.
		// directives: dojo.store.__RemoveOptions?
		//		Any additional parameters needed to describe how the remove should be performed.
	},
	evict: function(id){
		// summary:
		//		Remove the object with the given id from the underlying caching store.
		// id: Number
		//		The identifier for the object in question.
	}
});
=====*/
return store.Cache;
});
