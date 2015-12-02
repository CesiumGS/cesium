define([
	"../_base/lang", "../_base/declare", "../Deferred", "../_base/array",
	"./util/QueryResults", "./util/SimpleQueryEngine" /*=====, "./api/Store" =====*/
], function(lang, declare, Deferred, array, QueryResults, SimpleQueryEngine /*=====, Store =====*/){

// module:
//		dojo/store/DataStore


// No base class, but for purposes of documentation, the base class is dojo/store/api/Store
var base = null;
/*===== base = Store; =====*/

return declare("dojo.store.DataStore", base, {
	// summary:
	//		This is an adapter for using Dojo Data stores with an object store consumer.
	//		You can provide a Dojo data store and use this adapter to interact with it through
	//		the Dojo object store API

	target: "",
	constructor: function(options){
		// options: Object?
		//		This provides any configuration information that will be mixed into the store,
		//		including a reference to the Dojo data store under the property "store".
		lang.mixin(this, options);
 		if(!"idProperty" in options){
			var idAttribute; 
			try{
				idAttribute = this.store.getIdentityAttributes(); 
			}catch(e){ 
	 		// some store are not requiring an item instance to give us the ID attributes 
	 		// but some other do and throw errors in that case. 
			} 
			// if no idAttribute we have implicit id 
			this.idProperty = (!idAttribute || !idAttributes[0]) || this.idProperty; 
		}
		var features = this.store.getFeatures();
		// check the feature set and null out any methods that shouldn't be available
		if(!features["dojo.data.api.Read"]){
			this.get = null;
		}
		if(!features["dojo.data.api.Identity"]){
			this.getIdentity = null;
		}
		if(!features["dojo.data.api.Write"]){
			this.put = this.add = null;
		}
	},
	// idProperty: String
	//		The object property to use to store the identity of the store items.
	idProperty: "id",
	// store:
	//		The object store to convert to a data store
	store: null,
	// queryEngine: Function
	//		Defines the query engine to use for querying the data store
	queryEngine: SimpleQueryEngine,
	
	_objectConverter: function(callback){
		var store = this.store;
		var idProperty = this.idProperty;
		function convert(item){
			var object = {};
			var attributes = store.getAttributes(item);
			for(var i = 0; i < attributes.length; i++){
				var attribute = attributes[i];
				var values = store.getValues(item, attribute);
				if(values.length > 1){
					for(var j = 0; j < values.length; j++){
						var value = values[j];
						if(typeof value == 'object' && store.isItem(value)){
							values[j] = convert(value);
						}
					}
					value = values;
				}else{
					var value = store.getValue(item, attribute);
					if(typeof value == 'object' && store.isItem(value)){
						value = convert(value);
					}
				}
				object[attributes[i]] = value;
			}
			if(!(idProperty in object) && store.getIdentity){
				object[idProperty] = store.getIdentity(item);
			}
			return object;
		}
		return function(item){
			return callback(item && convert(item));
		};
	},
	get: function(id, options){
		// summary:
		//		Retrieves an object by it's identity. This will trigger a fetchItemByIdentity
		// id: Object?
		//		The identity to use to lookup the object
		var returnedObject, returnedError;
		var deferred = new Deferred();
		this.store.fetchItemByIdentity({
			identity: id,
			onItem: this._objectConverter(function(object){
				deferred.resolve(returnedObject = object);
			}),
			onError: function(error){
				deferred.reject(returnedError = error);
			}
		});
		if(returnedObject !== undefined){
			// if it was returned synchronously
			return returnedObject == null ? undefined : returnedObject;
		}
		if(returnedError){
			throw returnedError;
		}
		return deferred.promise;
	},
	put: function(object, options){
		// summary:
		//		Stores an object by its identity.
		// object: Object
		//		The object to store.
		// options: Object?
		//		Additional metadata for storing the data.  Includes a reference to an id
		//		that the object may be stored with (i.e. { id: "foo" }).
		options = options || {};
		var id = typeof options.id != "undefined" ? options.id : this.getIdentity(object);
		var store = this.store;
		var idProperty = this.idProperty;
		var deferred = new Deferred();
		if(typeof id == "undefined"){
			store.newItem(object);
			store.save({
				onComplete: function(){
					deferred.resolve(object);
				},
				onError: function(error){
					deferred.reject(error);
				}
			});
		}else{
			store.fetchItemByIdentity({
				identity: id,
				onItem: function(item){
					if(item){
						if(options.overwrite === false){
							return deferred.reject(new Error("Overwriting existing object not allowed"));
						}
						for(var i in object){
							if(i != idProperty && // don't copy id properties since they are immutable and should be omitted for implicit ids
									object.hasOwnProperty(i) && // don't want to copy methods and inherited properties
									store.getValue(item, i) != object[i]){
								store.setValue(item, i, object[i]);
							}
						}
					}else{
						if(options.overwrite === true){
							return deferred.reject(new Error("Creating new object not allowed"));
						}
						store.newItem(object);
					}
					store.save({
						onComplete: function(){
							deferred.resolve(object);
						},
						onError: function(error){
							deferred.reject(error);
						}
					});
				},
				onError: function(error){
					deferred.reject(error);
				}
			});
		}
		return deferred.promise;
	},
	add: function(object, options){
		// summary:
		//		Creates an object, throws an error if the object already exists
		// object: Object
		//		The object to store.
		// options: dojo/store/api/Store.PutDirectives?
		//		Additional metadata for storing the data.  Includes an "id"
		//		property if a specific id is to be used.
		// returns: Number
		(options = options || {}).overwrite = false;
		// call put with overwrite being false
		return this.put(object, options);
	},
	remove: function(id){
		// summary:
		//		Deletes an object by its identity.
		// id: Object
		//		The identity to use to delete the object
		var store = this.store;
		var deferred = new Deferred();

		this.store.fetchItemByIdentity({
			identity: id,
			onItem: function(item){
				try{
					if(item == null){
						// no item found, return false
						deferred.resolve(false);
					}else{
						// delete and save the change
						store.deleteItem(item);
						store.save();
						deferred.resolve(true);
					}
				}catch(error){
					deferred.reject(error);
				}
			},
			onError: function(error){
				deferred.reject(error);
			}
		});
		return deferred.promise;
	},
	query: function(query, options){
		// summary:
		//		Queries the store for objects.
		// query: Object
		//		The query to use for retrieving objects from the store
		// options: Object?
		//		Optional options object as used by the underlying dojo.data Store.
		// returns: dojo/store/api/Store.QueryResults
		//		A query results object that can be used to iterate over results.
		var fetchHandle;
		var deferred = new Deferred(function(){ fetchHandle.abort && fetchHandle.abort(); });
		deferred.total = new Deferred();
		var converter = this._objectConverter(function(object){return object;});
		fetchHandle = this.store.fetch(lang.mixin({
			query: query,
			onBegin: function(count){
				deferred.total.resolve(count);
			},
			onComplete: function(results){
				deferred.resolve(array.map(results, converter));
			},
			onError: function(error){
				deferred.reject(error);
			}
		}, options));
		return QueryResults(deferred);
	},
	getIdentity: function(object){
		// summary:
		//		Fetch the identity for the given object.
		// object: Object
		//		The data object to get the identity from.
		// returns: Number
		//		The id of the given object.
		return object[this.idProperty];
	}
});
});
