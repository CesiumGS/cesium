define(["../_base/lang", "../Evented", "../_base/declare", "../_base/Deferred", "../_base/array", 
	"../_base/connect", "../regexp"
], function(lang, Evented, declare, Deferred, array, connect, regexp){

// module:
//		dojo/data/ObjectStore

function convertRegex(character){
	return character == '*' ? '.*' : character == '?' ? '.' : character; 
}
return declare("dojo.data.ObjectStore", [Evented],{
		// summary:
		//		A Dojo Data implementation that wraps Dojo object stores for backwards
		//		compatibility.

		objectStore: null,
		constructor: function(options){
			// options:
			//		The configuration information to pass into the data store.
			//
			//		- options.objectStore:
			//
			//		The object store to use as the source provider for this data store
			
			this._dirtyObjects = [];
			if(options.labelAttribute){
				// accept the old labelAttribute to make it easier to switch from old data stores
				options.labelProperty = options.labelAttribute; 
			}
			lang.mixin(this, options);
		},
		labelProperty: "label",

		getValue: function(/*Object*/ item, /*String*/property, /*value?*/defaultValue){
			// summary:
			//		Gets the value of an item's 'property'
			// item:
			//		The item to get the value from
			// property:
			//		property to look up value for
			// defaultValue:
			//		the default value

			return typeof item.get === "function" ? item.get(property) :
				property in item ?
					item[property] : defaultValue;
		},
		getValues: function(item, property){
			// summary:
			//		Gets the value of an item's 'property' and returns
			//		it. If this value is an array it is just returned,
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
			//		The item to check
			// attribute: String
			//		The attribute to check
			return attribute in item;
		},

		containsValue: function(item, attribute, value){
			// summary:
			//		Checks to see if 'item' has 'value' at 'attribute'
			// item: Object
			//		The item to check
			// attribute: String
			//		The attribute to check
			// value: Anything
			//		The value to look for
			return array.indexOf(this.getValues(item,attribute),value) > -1;
		},


		isItem: function(item){
			// summary:
			//		Checks to see if the argument is an item
			// item: Object
			//		The item to check

			// we have no way of determining if it belongs, we just have object returned from
			// service queries
			return (typeof item == 'object') && item && !(item instanceof Date);
		},

		isItemLoaded: function(item){
			// summary:
			//		Checks to see if the item is loaded.
			// item: Object
			//		The item to check

			return item && typeof item.load !== "function";
		},

		loadItem: function(args){
			// summary:
			//		Loads an item and calls the callback handler. Note, that this will call the callback
			//		handler even if the item is loaded. Consequently, you can use loadItem to ensure
			//		that an item is loaded is situations when the item may or may not be loaded yet.
			//		If you access a value directly through property access, you can use this to load
			//		a lazy value as well (doesn't need to be an item).
			// args: Object
			//		See dojo/data/api/Read.fetch()
			// example:
			//	|	store.loadItem({
			//	|		item: item, // this item may or may not be loaded
			//	|		onItem: function(item){
			//	|			// do something with the item
			//	|		}
			//	|	});

			var item;
			if(typeof args.item.load === "function"){
				Deferred.when(args.item.load(), function(result){
					item = result; // in synchronous mode this can allow loadItem to return the value
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
		close: function(request){
			// summary:
			// 		See dojo/data/api/Read.close()
			return request && request.abort && request.abort();
		},
		fetch: function(args){
			// summary:
			//		See dojo/data/api/Read.fetch()

			args = lang.delegate(args, args && args.queryOptions);
			var self = this;
			var scope = args.scope || self;
			var query = args.query;
			if(typeof query == "object"){ // can be null, but that is ignore by for-in
				query = lang.delegate(query); // don't modify the original
				for(var i in query){
					// find any strings and convert them to regular expressions for wildcard support
					var required = query[i];
					if(typeof required == "string"){
						query[i] = RegExp("^" + regexp.escapeString(required, "*?\\").replace(/\\.|\*|\?/g, convertRegex) + "$", args.ignoreCase ? "mi" : "m");
						query[i].toString = (function(original){
							return function(){
								return original;
							};
						})(required);
					}
				}
			}

			var results = this.objectStore.query(query, args);
			Deferred.when(results.total, function(totalCount){
				Deferred.when(results, function(results){
					if(args.onBegin){
						args.onBegin.call(scope, totalCount || results.length, args);
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
				}, errorHandler);
			}, errorHandler);
			function errorHandler(error){
				if(args.onError){
					args.onError.call(scope, error, args);
				}
			}
			args.abort = function(){
				// abort the request
				if(results.cancel){
					results.cancel();
				}
			};
			if(results.observe){
				if(this.observing){
					// if we were previously observing, cancel the last time to avoid multiple notifications. Just the best we can do for the impedance mismatch between APIs
					this.observing.cancel();
				}
				this.observing = results.observe(function(object, removedFrom, insertedInto){
					if(array.indexOf(self._dirtyObjects, object) == -1){
						if(removedFrom == -1){
							self.onNew(object);
						}
						else if(insertedInto == -1){
							self.onDelete(object);
						}
						else{
							for(var i in object){
								if(i != self.objectStore.idProperty){
									self.onSet(object, i, null, object[i]);
								}
							}
						}
					}
				}, true);
			}
			this.onFetch(results);
			args.store = this;
			return args;
		},
		getFeatures: function(){
			// summary:
			//		return the store feature set

			return {
				"dojo.data.api.Read": !!this.objectStore.get,
				"dojo.data.api.Identity": true,
				"dojo.data.api.Write": !!this.objectStore.put,
				"dojo.data.api.Notification": true
			};
		},

		getLabel: function(/* dojo/data/api/Item */ item){
			// summary:
			//		See dojo/data/api/Read.getLabel()
			if(this.isItem(item)){
				return this.getValue(item,this.labelProperty); //String
			}
			return undefined; //undefined
		},

		getLabelAttributes: function(/* dojo/data/api/Item */ item){
			// summary:
			//		See dojo/data/api/Read.getLabelAttributes()
			return [this.labelProperty]; //array
		},

		//Identity API Support


		getIdentity: function(item){
			// summary:
			//		returns the identity of the given item
			//		See dojo/data/api/Read.getIdentity()
			return this.objectStore.getIdentity ? this.objectStore.getIdentity(item) : item[this.objectStore.idProperty || "id"];
		},

		getIdentityAttributes: function(item){
			// summary:
			//		returns the attributes which are used to make up the
			//		identity of an item.	Basically returns this.objectStore.idProperty
			//		See dojo/data/api/Read.getIdentityAttributes()

			return [this.objectStore.idProperty];
		},

		fetchItemByIdentity: function(args){
			// summary:
			//		fetch an item by its identity, by looking in our index of what we have loaded
			var item;
			Deferred.when(this.objectStore.get(args.identity),
				function(result){
					item = result;
					args.onItem.call(args.scope, result);
				},
				function(error){
					args.onError.call(args.scope, error);
				}
			);
			return item;
		},

		newItem: function(data, parentInfo){
			// summary:
			//		adds a new item to the store at the specified point.
			//		Takes two parameters, data, and options.
			// data: Object
			//		The data to be added in as an item.
			// data: Object
			//		See dojo/data/api/Write.newItem()
					
			if(parentInfo){
				// get the previous value or any empty array
				var values = this.getValue(parentInfo.parent,parentInfo.attribute,[]);
				// set the new value
				values = values.concat([data]);
				data.__parent = values;
				this.setValue(parentInfo.parent, parentInfo.attribute, values);
			}
			this._dirtyObjects.push({object:data, save: true});
			this.onNew(data);
			return data;
		},
		deleteItem: function(item){
			// summary:
			//		deletes item and any references to that item from the store.
			// item:
			//		item to delete

			// If the desire is to delete only one reference, unsetAttribute or
			// setValue is the way to go.
			this.changing(item, true);

			this.onDelete(item);
		},
		setValue: function(item, attribute, value){
			// summary:
			//		sets 'attribute' on 'item' to 'value'
			//		See dojo/data/api/Write.setValue()
			
			var old = item[attribute];
			this.changing(item);
			item[attribute]=value;
			this.onSet(item,attribute,old,value);
		},
		setValues: function(item, attribute, values){
			// summary:
			//		sets 'attribute' on 'item' to 'value' value
			//		must be an array.
			//		See dojo/data/api/Write.setValues()

			if(!lang.isArray(values)){
				throw new Error("setValues expects to be passed an Array object as its value");
			}
			this.setValue(item,attribute,values);
		},

		unsetAttribute: function(item, attribute){
			// summary:
			//		unsets 'attribute' on 'item'
			//		See dojo/data/api/Write.unsetAttribute()

			this.changing(item);
			var old = item[attribute];
			delete item[attribute];
			this.onSet(item,attribute,old,undefined);
		},

		changing: function(object,_deleting){
			// summary:
			//		adds an object to the list of dirty objects.  This object
			//		contains a reference to the object itself as well as a
			//		cloned and trimmed version of old object for use with
			//		revert.
			// object: Object
			//		Indicates that the given object is changing and should be marked as 
			// 		dirty for the next save
			// _deleting: [private] Boolean
			
			object.__isDirty = true;
			//if an object is already in the list of dirty objects, don't add it again
			//or it will overwrite the premodification data set.
			for(var i=0; i<this._dirtyObjects.length; i++){
				var dirty = this._dirtyObjects[i];
				if(object==dirty.object){
					if(_deleting){
						// we are deleting, no object is an indicator of deletiong
						dirty.object = false;
						if(!this._saveNotNeeded){
							dirty.save = true;
						}
					}
					return;
				}
			}
			var old = object instanceof Array ? [] : {};
			for(i in object){
				if(object.hasOwnProperty(i)){
					old[i] = object[i];
				}
			}
			this._dirtyObjects.push({object: !_deleting && object, old: old, save: !this._saveNotNeeded});
		},

		save: function(kwArgs){
			// summary:
			//		Saves the dirty data using object store provider. See dojo/data/api/Write for API.
			// kwArgs:
			//		- kwArgs.global:
			//		  This will cause the save to commit the dirty data for all
			//		  ObjectStores as a single transaction.
			//
			//		- kwArgs.revertOnError:
			//		  This will cause the changes to be reverted if there is an
			//		  error on the save. By default a revert is executed unless
			//		  a value of false is provide for this parameter.
			//
			//		- kwArgs.onError:
			//		  Called when an error occurs in the commit
			//
			//		- kwArgs.onComplete:
			//		  Called when an the save/commit is completed

			kwArgs = kwArgs || {};
			var result, actions = [];
			var savingObjects = [];
			var self = this;
			var dirtyObjects = this._dirtyObjects;
			var left = dirtyObjects.length;// this is how many changes are remaining to be received from the server
			try{
				connect.connect(kwArgs,"onError",function(){
					if(kwArgs.revertOnError !== false){
						var postCommitDirtyObjects = dirtyObjects;
						dirtyObjects = savingObjects;
						self.revert(); // revert if there was an error
						self._dirtyObjects = postCommitDirtyObjects;
					}
					else{
						self._dirtyObjects = dirtyObjects.concat(savingObjects);
					}
				});
				if(this.objectStore.transaction){
					var transaction = this.objectStore.transaction();
				}
				for(var i = 0; i < dirtyObjects.length; i++){
					var dirty = dirtyObjects[i];
					var object = dirty.object;
					var old = dirty.old;
					delete object.__isDirty;
					if(object){
						result = this.objectStore.put(object, {overwrite: !!old});
					}
					else if(typeof old != "undefined"){
						result = this.objectStore.remove(this.getIdentity(old));
					}
					savingObjects.push(dirty);
					dirtyObjects.splice(i--,1);
					Deferred.when(result, function(value){
						if(!(--left)){
							if(kwArgs.onComplete){
								kwArgs.onComplete.call(kwArgs.scope, actions);
							}
						}
					},function(value){

						// on an error we want to revert, first we want to separate any changes that were made since the commit
						left = -1; // first make sure that success isn't called
						kwArgs.onError.call(kwArgs.scope, value);
					});

				}
				if(transaction){
					transaction.commit();
				}
			}catch(e){
				kwArgs.onError.call(kwArgs.scope, value);
			}
		},

		revert: function(){
			// summary:
			//		returns any modified data to its original state prior to a save();

			var dirtyObjects = this._dirtyObjects;
			for(var i = dirtyObjects.length; i > 0;){
				i--;
				var dirty = dirtyObjects[i];
				var object = dirty.object;
				var old = dirty.old;
				if(object && old){
					// changed
					for(var j in old){
						if(old.hasOwnProperty(j) && object[j] !== old[j]){
							this.onSet(object, j, object[j], old[j]);
							object[j] = old[j];
						}
					}
					for(j in object){
						if(!old.hasOwnProperty(j)){
							this.onSet(object, j, object[j]);
							delete object[j];
						}
					}
				}else if(!old){
					// was an addition, remove it
					this.onDelete(object);
				}else{
					// was a deletion, we will add it back
					this.onNew(old);
				}
				delete (object || old).__isDirty;
				dirtyObjects.splice(i, 1);
			}

		},
		isDirty: function(item){
			// summary:
			//		returns true if the item is marked as dirty or true if there are any dirty items
			// item: Object
			//		The item to check
			if(!item){
				return !!this._dirtyObjects.length;
			}
			return item.__isDirty;
		},

		// Notification Support

		onSet: function(){
			// summary:
			// 		See dojo/data/api/Notification.onSet()
		},
		onNew: function(){
			// summary:
			// 		See dojo/data/api/Notification.onNew()
		},
		onDelete:	function(){
			// summary:
			// 		See dojo/data/api/Notification.onDelete()
		},
		// an extra to get result sets
		onFetch: function(results){
			// summary:
			// 		Called when a fetch occurs			
		}

	}
);
});
