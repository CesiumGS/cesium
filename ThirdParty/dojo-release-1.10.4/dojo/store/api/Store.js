define(["../../_base/declare"], function(declare){

// module:
//		dojo/api/Store

var Store = declare(null, {
	// summary:
	//		This is an abstract API that data provider implementations conform to.
	//		This file defines methods signatures and intentionally leaves all the
	//		methods unimplemented.  For more information on the ,
	//		please visit: http://dojotoolkit.org/reference-guide/dojo/store.html
	//		Every method and property is optional, and is only needed if the functionality
	//		it provides is required.
	//		Every method may return a promise for the specified return value if the
	//		execution of the operation is asynchronous (except
	//		for query() which already defines an async return value).

	// idProperty: String
	//		If the store has a single primary key, this indicates the property to use as the
	//		identity property. The values of this property should be unique.
	idProperty: "id",

	// queryEngine: Function
	//		If the store can be queried locally (on the client side in JS), this defines
	//		the query engine to use for querying the data store.
	//		This takes a query and query options and returns a function that can execute
	//		the provided query on a JavaScript array. The queryEngine may be replace to
	//		provide more sophisticated querying capabilities. For example:
	//		| var query = store.queryEngine({foo:"bar"}, {count:10});
	//		| query(someArray) -> filtered array
	//		The returned query function may have a "matches" property that can be
	//		used to determine if an object matches the query. For example:
	//		| query.matches({id:"some-object", foo:"bar"}) -> true
	//		| query.matches({id:"some-object", foo:"something else"}) -> false
	queryEngine: null,

	get: function(id){
		// summary:
		//		Retrieves an object by its identity
		// id: Number
		//		The identity to use to lookup the object
		// returns: Object
		//		The object in the store that matches the given id.
	},
	getIdentity: function(object){
		// summary:
		//		Returns an object's identity
		// object: Object
		//		The object to get the identity from
		// returns: String|Number
	},
	put: function(object, directives){
		// summary:
		//		Stores an object
		// object: Object
		//		The object to store.
		// directives: dojo/store/api/Store.PutDirectives?
		//		Additional directives for storing objects.
		// returns: Number|String
	},
	add: function(object, directives){
		// summary:
		//		Creates an object, throws an error if the object already exists
		// object: Object
		//		The object to store.
		// directives: dojo/store/api/Store.PutDirectives?
		//		Additional directives for creating objects.
		// returns: Number|String
	},
	remove: function(id){
		// summary:
		//		Deletes an object by its identity
		// id: Number
		//		The identity to use to delete the object
		delete this.index[id];
		var data = this.data,
			idProperty = this.idProperty;
		for(var i = 0, l = data.length; i < l; i++){
			if(data[i][idProperty] == id){
				data.splice(i, 1);
				return;
			}
		}
	},
	query: function(query, options){
		// summary:
		//		Queries the store for objects. This does not alter the store, but returns a
		//		set of data from the store.
		// query: String|Object|Function
		//		The query to use for retrieving objects from the store.
		// options: dojo/store/api/Store.QueryOptions
		//		The optional arguments to apply to the resultset.
		// returns: dojo/store/api/Store.QueryResults
		//		The results of the query, extended with iterative methods.
		//
		// example:
		//		Given the following store:
		//
		//	...find all items where "prime" is true:
		//
		//	|	store.query({ prime: true }).forEach(function(object){
		//	|		// handle each object
		//	|	});
	},
	transaction: function(){
		// summary:
		//		Starts a new transaction.
		//		Note that a store user might not call transaction() prior to using put,
		//		delete, etc. in which case these operations effectively could be thought of
		//		as "auto-commit" style actions.
		// returns: dojo/store/api/Store.Transaction
		//		This represents the new current transaction.
	},
	getChildren: function(parent, options){
		// summary:
		//		Retrieves the children of an object.
		// parent: Object
		//		The object to find the children of.
		// options: dojo/store/api/Store.QueryOptions?
		//		Additional options to apply to the retrieval of the children.
		// returns: dojo/store/api/Store.QueryResults
		//		A result set of the children of the parent object.
	},
	getMetadata: function(object){
		// summary:
		//		Returns any metadata about the object. This may include attribution,
		//		cache directives, history, or version information.
		// object: Object
		//		The object to return metadata for.
		// returns: Object
		//		An object containing metadata.
	}
});

Store.PutDirectives = declare(null, {
	// summary:
	//		Directives passed to put() and add() handlers for guiding the update and
	//		creation of stored objects.
	// id: String|Number?
	//		Indicates the identity of the object if a new object is created
	// before: Object?
	//		If the collection of objects in the store has a natural ordering,
	//		this indicates that the created or updated object should be placed before the
	//		object specified by the value of this property. A value of null indicates that the
	//		object should be last.
	// parent: Object?,
	//		If the store is hierarchical (with single parenting) this property indicates the
	//		new parent of the created or updated object.
	// overwrite: Boolean?
	//		If this is provided as a boolean it indicates that the object should or should not
	//		overwrite an existing object. A value of true indicates that a new object
	//		should not be created, the operation should update an existing object. A
	//		value of false indicates that an existing object should not be updated, a new
	//		object should be created (which is the same as an add() operation). When
	//		this property is not provided, either an update or creation is acceptable.
});

Store.SortInformation = declare(null, {
	// summary:
	//		An object describing what attribute to sort on, and the direction of the sort.
	// attribute: String
	//		The name of the attribute to sort on.
	// descending: Boolean
	//		The direction of the sort.  Default is false.
});

Store.QueryOptions = declare(null, {
	// summary:
	//		Optional object with additional parameters for query results.
	// sort: dojo/store/api/Store.SortInformation[]?
	//		A list of attributes to sort on, as well as direction
	//		For example:
	//		| [{attribute:"price, descending: true}].
	//		If the sort parameter is omitted, then the natural order of the store may be
	//		applied if there is a natural order.
	// start: Number?
	//		The first result to begin iteration on
	// count: Number?
	//		The number of how many results should be returned.
});

Store.QueryResults = declare(null, {
	// summary:
	//		This is an object returned from query() calls that provides access to the results
	//		of a query. Queries may be executed asynchronously.

	forEach: function(callback, thisObject){
		// summary:
		//		Iterates over the query results, based on
		//		https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/forEach.
		//		Note that this may executed asynchronously. The callback may be called
		//		after this function returns.
		// callback:
		//		Function that is called for each object in the query results
		// thisObject:
		//		The object to use as |this| in the callback.

	},
	filter: function(callback, thisObject){
		// summary:
		//		Filters the query results, based on
		//		https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/filter.
		//		Note that this may executed asynchronously. The callback may be called
		//		after this function returns.
		// callback:
		//		Function that is called for each object in the query results
		// thisObject:
		//		The object to use as |this| in the callback.
		// returns: dojo/store/api/Store.QueryResults
	},
	map: function(callback, thisObject){
		// summary:
		//		Maps the query results, based on
		//		https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/map.
		//		Note that this may executed asynchronously. The callback may be called
		//		after this function returns.
		// callback:
		//		Function that is called for each object in the query results
		// thisObject:
		//		The object to use as |this| in the callback.
		// returns: dojo/store/api/Store.QueryResults
	},
	then: function(callback, errorHandler){
		// summary:
		//		This registers a callback for when the query is complete, if the query is asynchronous.
		//		This is an optional method, and may not be present for synchronous queries.
		// callback:
		//		This is called when the query is completed successfully, and is passed a single argument
		//		that is an array representing the query results.
		// errorHandler:
		//		This is called if the query failed, and is passed a single argument that is the error
		//		for the failure.
	},
	observe: function(listener, includeAllUpdates){
		// summary:
		//		This registers a callback for notification of when data is modified in the query results.
		//		This is an optional method, and is usually provided by dojo/store/Observable.
		// listener: Function
		//		The listener function is called when objects in the query results are modified
		//		to affect the query result. The listener function is called with the following arguments:
		//		| listener(object, removedFrom, insertedInto);
		//
		//		- The object parameter indicates the object that was create, modified, or deleted.
		//		- The removedFrom parameter indicates the index in the result array where
		//		the object used to be. If the value is -1, then the object is an addition to
		//		this result set (due to a new object being created, or changed such that it
		//		is a part of the result set).
		//		- The insertedInto parameter indicates the index in the result array where
		//		the object should be now. If the value is -1, then the object is a removal
		//		from this result set (due to an object being deleted, or changed such that it
		//		is not a part of the result set).
		// includeAllUpdates:
		//		This indicates whether or not to include object updates that do not affect
		//		the inclusion or order of the object in the query results. By default this is false,
		//		which means that if any object is updated in such a way that it remains
		//		in the result set and it's position in result sets is not affected, then the listener
		//		will not be fired.

	},
	// total: Number|Promise?
	//		This property should be included in if the query options included the "count"
	//		property limiting the result set. This property indicates the total number of objects
	//		matching the query (as if "start" and "count" weren't present). This may be
	//		a promise if the query is asynchronous.
	total: 0
});

Store.Transaction = declare(null, {
	// summary:
	//		This is an object returned from transaction() calls that represents the current
	//		transaction.

	commit: function(){
		// summary:
		//		Commits the transaction. This may throw an error if it fails. Of if the operation
		//		is asynchronous, it may return a promise that represents the eventual success
		//		or failure of the commit.
	},
	abort: function(callback, thisObject){
		// summary:
		//		Aborts the transaction. This may throw an error if it fails. Of if the operation
		//		is asynchronous, it may return a promise that represents the eventual success
		//		or failure of the abort.
	}
});
return Store;
});
