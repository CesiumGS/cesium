define("dojox/rpc/OfflineRest", ["dojo", "dojox", "dojox/data/ClientFilter", "dojox/rpc/Rest", "dojox/storage"], function(dojo, dojox) {

	var Rest = dojox.rpc.Rest;
	var namespace = "dojox_rpc_OfflineRest";
	var loaded;
	var index = Rest._index;
	dojox.storage.manager.addOnLoad(function(){
		// now that we are loaded we need to save everything in the index
		loaded = dojox.storage.manager.available;
		for(var i in index){
			saveObject(index[i], i);
		}
	});
	var dontSave;
	function getStorageKey(key){
		// returns a key that is safe to use in storage
		return key.replace(/[^0-9A-Za-z_]/g,'_');
	}
	function saveObject(object,id){
		// save the object into local storage
		
		if(loaded && !dontSave && (id || (object && object.__id))){
			dojox.storage.put(
					getStorageKey(id||object.__id),
					typeof object=='object'?dojox.json.ref.toJson(object):object, // makeshift technique to determine if the object is json object or not
					function(){},
					namespace);
		}
	}
	function isNetworkError(error){
		//	determine if the error was a network error and should be saved offline
		// 	or if it was a server error and not a result of offline-ness
		return error instanceof Error && (error.status == 503 || error.status > 12000 ||  !error.status); // TODO: Make the right error determination
	}
	function sendChanges(){
		// periodical try to save our dirty data
		if(loaded){
			var dirty = dojox.storage.get("dirty",namespace);
			if(dirty){
				for (var dirtyId in dirty){
					commitDirty(dirtyId,dirty);
				}
			}
		}
	}
	var OfflineRest;
	function sync(){
		OfflineRest.sendChanges();
		OfflineRest.downloadChanges();
	}
	var syncId = setInterval(sync,15000);
	dojo.connect(document, "ononline", sync);
	OfflineRest = dojox.rpc.OfflineRest = {
		// summary:
		//		Makes the REST service be able to store changes in local
		//		storage so it can be used offline automatically.

		turnOffAutoSync: function(){
			clearInterval(syncId);
		},
		sync: sync,
		sendChanges: sendChanges,
		downloadChanges: function(){
			
		},
		addStore: function(/*data-store*/store,/*query?*/baseQuery){
			// summary:
			//		Adds a store to the monitored store for local storage
			// store:
			//		Store to add
			// baseQuery:
			//		This is the base query to should be used to load the items for
			//		the store. Generally you want to load all the items that should be
			//		available when offline.
			OfflineRest.stores.push(store);
			store.fetch({queryOptions:{cache:true},query:baseQuery,onComplete:function(results,args){
				store._localBaseResults = results;
				store._localBaseFetch = args;
			}});
						
		}
	};
	OfflineRest.stores = [];
	var defaultGet = Rest._get;
	Rest._get = function(service, id){
		// We specifically do NOT want the paging information to be used by the default handler,
		// this is because online apps want to minimize the data transfer,
		// but an offline app wants the opposite, as much data as possible transferred to
		// the client side
		try{
			// if we are reloading the application with local dirty data in an online environment
			//	we want to make sure we save the changes first, so that we get up-to-date
			//	information from the server
			sendChanges();
			if(window.navigator && navigator.onLine===false){
				// we force an error if we are offline in firefox, otherwise it will silently load it from the cache
				throw new Error();
			}
			var dfd = defaultGet(service, id);
		}catch(e){
			dfd = new dojo.Deferred();
			dfd.errback(e);
		}
		var sync = dojox.rpc._sync;
		dfd.addCallback(function(result){
			saveObject(result, service._getRequest(id).url);
			return result;
		});
		dfd.addErrback(function(error){
			if(loaded){
				// if the storage is loaded, we can go ahead and get the object out of storage
				if(isNetworkError(error)){
					var loadedObjects = {};
					// network error, load from local storage
					var byId = function(id,backup){
						if(loadedObjects[id]){
							return backup;
						}
						var result = dojo.fromJson(dojox.storage.get(getStorageKey(id),namespace)) || backup;
						
						loadedObjects[id] = result;
						for(var i in result){
							var val = result[i]; // resolve references if we can
							id = val && val.$ref;
							if (id){
								if(id.substring && id.substring(0,4) == "cid:"){
									// strip the cid scheme, we should be able to resolve it locally
									id = id.substring(4);
								}
								result[i] = byId(id,val);
							}
						}
						if (result instanceof Array){
							//remove any deleted items
							for (i = 0;i<result.length;i++){
								if (result[i]===undefined){
									result.splice(i--,1);
								}
							}
						}
						return result;
					};
					dontSave = true; // we don't want to be resaving objects when loading from local storage
					//TODO: Should this reuse something from dojox.rpc.Rest
					var result = byId(service._getRequest(id).url);
					
					if(!result){// if it is not found we have to just return the error
						return error;
					}
					dontSave = false;
					return result;
				}
				else{
					return error; // server error, let the error propagate
				}
			}
			else{
				if(sync){
					return new Error("Storage manager not loaded, can not continue");
				}
				// we are not loaded, so we need to defer until we are loaded
				dfd = new dojo.Deferred();
				dfd.addCallback(arguments.callee);
				dojox.storage.manager.addOnLoad(function(){
					dfd.callback();
				});
				return dfd;
			}
		});
		return dfd;
	};
	function changeOccurred(method, absoluteId, contentId, serializedContent, service){
		if(method=='delete'){
			dojox.storage.remove(getStorageKey(absoluteId),namespace);
		}
		else{
			// both put and post should store the actual object
			dojox.storage.put(getStorageKey(contentId), serializedContent, function(){
			},namespace);
		}
		var store = service && service._store;
		// record all the updated queries
		if(store){
			store.updateResultSet(store._localBaseResults, store._localBaseFetch);
			dojox.storage.put(getStorageKey(service._getRequest(store._localBaseFetch.query).url),dojox.json.ref.toJson(store._localBaseResults),function(){
				},namespace);
			
		}
		
	}
	dojo.addOnLoad(function(){
		dojo.connect(dojox.data, "restListener", function(message){
			var channel = message.channel;
			var method = message.event.toLowerCase();
			var service = dojox.rpc.JsonRest && dojox.rpc.JsonRest.getServiceAndId(channel).service;
			changeOccurred(
				method,
				channel,
				method == "post" ? channel + message.result.id : channel,
				dojo.toJson(message.result),
				service
			);
			
		});
	});
	//FIXME: Should we make changes after a commit to see if the server rejected the change
	// or should we come up with a revert mechanism?
	var defaultChange = Rest._change;
	Rest._change = function(method,service,id,serializedContent){
		if(!loaded){
			return defaultChange.apply(this,arguments);
		}
		var absoluteId = service._getRequest(id).url;
		changeOccurred(method, absoluteId, dojox.rpc.JsonRest._contentId, serializedContent, service);
		var dirty = dojox.storage.get("dirty",namespace) || {};
		if (method=='put' || method=='delete'){
			// these supersede so we can overwrite anything using this id
			var dirtyId = absoluteId;
		}
		else{
			dirtyId = 0;
			for (var i in dirty){
				if(!isNaN(parseInt(i))){
					dirtyId = i;
				}
			} // get the last dirtyId to make a unique id for non-idempotent methods
			dirtyId++;
		}
		dirty[dirtyId] = {method:method,id:absoluteId,content:serializedContent};
		return commitDirty(dirtyId,dirty);
	};
	function commitDirty(dirtyId, dirty){
		var dirtyItem = dirty[dirtyId];
		var serviceAndId = dojox.rpc.JsonRest.getServiceAndId(dirtyItem.id);
		var deferred = defaultChange(dirtyItem.method,serviceAndId.service,serviceAndId.id,dirtyItem.content);
		// add it to our list of dirty objects
		dirty[dirtyId] = dirtyItem;
		dojox.storage.put("dirty",dirty,function(){},namespace);
		deferred.addBoth(function(result){
			if (isNetworkError(result)){
				// if a network error (offlineness) was the problem, we leave it
				// dirty, and return to indicate successfulness
				return null;
			}
			// it was successful or the server rejected it, we remove it from the dirty list
			var dirty = dojox.storage.get("dirty",namespace) || {};
			delete dirty[dirtyId];
			dojox.storage.put("dirty",dirty,function(){},namespace);
			return result;
		});
		return deferred;
	}
		
	dojo.connect(index,"onLoad",saveObject);
	dojo.connect(index,"onUpdate",saveObject);

	return OfflineRest;
});
