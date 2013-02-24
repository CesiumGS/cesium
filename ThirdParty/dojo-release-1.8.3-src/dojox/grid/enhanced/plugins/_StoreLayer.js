define([
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/lang",
	"dojo/_base/xhr"
], function(declare, array, lang, xhr){
	// summary:
	//		The dojo/data/api/Read API is powerful, but it's difficult to give the store some special commands before
	//		fetch, so that the store content can be temporarily modified or transformed, and acts as another store. The
	//		parameter *query* or *queryOptions* in keywordArgs for *fetch* is not enough because:
	//
	//		1.	users do not have the opportunity to response to the store actions when these options or queries are applied,
	//			especially when the real store is at server side.
	//		2.	the store implementation must be changed to support any new options in 'query' or 'queryOptions', so it'll be
	//			difficult if this implementation is not able to or very hard to be changed, or some new options are required to
	//			be valid for all stores.
	//
	//		This *StoreLayer* framework is dedicated to provide a uniform way for configuring an existing store, so that
	//		it can be easily extended to have special behaviors or act like a totally different store.
	//		The major approach is to wrap the *fetch* function of store, layer by layer. Every layer treats the incoming
	//		store.fetch as a 'black box', thus maintaining the independence between layers.
	//		*fetch* is the most important data retriever in the Read API, almost all other functions are used for a single
	//		item, and require that this item is already retrieved (by and only by *fetch*). So once we've controlled this
	//		*fetch* function, we've controlled almost the whole store. This fact simplifies our implementation of StoreLayer.
	// example:
	//	| //ns is for namespace, i.e.:dojox.grid.enhanced.plugins
	//	| ns.wrap(ns.wrap(ns.wrap(store, new ns.FilterLayer()), new ns.UniqueLayer()), new ns.TransformLayer());
	//	| 
	//	| //every layer has a name, it should be given in the document of this layer.
	//	| //if you don't know it's name, you can get it by: ns.SomeLayer.prototype.name();
	//	| store.layer("filter").filterDef(...);
	//	| store.layer("unique").setUniqueColumns(...);
	//	| store.layer("transform").setScheme(...);
	//	| 
	//	| //now use the store as usual...
	//	| 
	//	| store.unwrap("transform"); //remove the transform layer but retain the other two.
	//	| 
	//	| //now use the store as usual...
	//	| 
	//	| store.unwrap(); //remove all the layers, get the original store back.

	var ns = lang.getObject("grid.enhanced.plugins", true, dojox);
	
	var getPrevTags = function(tags){
		var tagList = ["reorder", "sizeChange", "normal", "presentation"];
		var idx = tagList.length;
		for(var i = tags.length - 1; i >= 0; --i){
			var p = array.indexOf(tagList, tags[i]);
			if(p >= 0 && p <= idx){
				idx = p;
			}
		}
		if(idx < tagList.length - 1){
			return tagList.slice(0, idx + 1);
		}else{
			return tagList;
		}
	},
	
	unwrap = function(/* string? */layerName){
		// summary:
		//		Unwrap the layers of the store
		// tags:
		//		public
		// returns:
		//		The unwrapped store, for nested use only.
		var i, layers = this._layers, len = layers.length;
		if(layerName){
			for(i = len-1; i >= 0; --i){
				if(layers[i].name() == layerName){
					layers[i]._unwrap(layers[i + 1]);
					break;
				}
			}
			layers.splice(i, 1);
		}else{
			for(i = len - 1; i >= 0; --i){
				layers[i]._unwrap();
			}
		}
		if(!layers.length){
			delete this._layers;
			delete this.layer;
			delete this.unwrap;
			delete this.forEachLayer;
		}
		//console.log("layers:",this._layers);
		return this;	//Read-store
	},
	
	getLayer = function(layerName){
		// summary:
		//		Get a layer of the store, so we can configure that layer.
		// tags:
		//		public (scope is store)
		// layerName: string
		//		the name of the layer
		// returns:
		//		the store layer object
		var i, layers = this._layers;
		if(typeof layerName == "undefined"){
			return layers.length;	//Integer
		}
		if(typeof layerName == "number"){
			return layers[layerName];	//_StoreLayer
		}
		for(i = layers.length - 1; i >= 0; --i){
			if(layers[i].name() == layerName){
				return layers[i];	//_StoreLayer
			}
		}
		return null;	//_StoreLayer
	},
	
	forEachLayer = function(callback, isInnerToOuter){
		// summary:
		//		Visit the layers one by one. From the outer most to inner most by default.
		// callback: Function
		//		The function to callback.
		//		If return false, break the loop.
		// isInnerToOuter: Boolean
		//		Whether visit from the inner most layer to the outer most layer.
		var len = this._layers.length, start, end, dir;
		if(isInnerToOuter){
			start = 0;
			end = len;
			dir = 1;
		}else{
			start = len - 1;
			end = -1;
			dir = -1;
		}
		for(var i = start; i != end; i += dir){
			if(callback(this._layers[i], i) === false){
				return i;
			}
		}
		return end;
	};
	ns.wrap = function(store, funcName, layer, layerFuncName){
		// summary:
		//		Wrap the store with the given layer.
		// tags:
		//		public
		// store: Read-store
		//		The store to be wrapped.
		// layer: _StoreLayer
		//		The layer to be used
		// returns:
		//		The wrapped store, for nested use only.
		if(!store._layers){
			store._layers = [];
			store.layer = lang.hitch(store, getLayer);
			store.unwrap = lang.hitch(store, unwrap);
			store.forEachLayer = lang.hitch(store, forEachLayer);
		}
		var prevTags = getPrevTags(layer.tags);
		if(!array.some(store._layers, function(lyr, i){
			if(array.some(lyr.tags, function(tag){
				return array.indexOf(prevTags, tag) >= 0;
			})){
				return false;
			}else{
				store._layers.splice(i, 0, layer);
				layer._wrap(store, funcName, layerFuncName, lyr);
				return true;
			}
		})){
			store._layers.push(layer);
			layer._wrap(store, funcName, layerFuncName);
		}
		//console.log("wrapped layers:", dojo.map(store._layers, function(lyr){return lyr.name();}));
		return store;	//Read-store
	};

	var _StoreLayer = declare("dojox.grid.enhanced.plugins._StoreLayer", null, {
		// summary:
		//		The most abstract class of store layers, provides basic utilities and some interfaces.
		// tags:
		//		abstract
/*=====
		// _store: [protected] Read-store
		//		The wrapped store.
		_store: null,
		
		// _originFetch: [protected] function
		//		The original fetch function of the store.
		_originFetch: null,
		
		// __enabled: [private] Boolean
		//		To control whether this layer is valid.
		__enabled: true,
=====*/
		tags: ["normal"],
		
		layerFuncName: "_fetch",
		
		constructor: function(){
			this._store = null;
			this._originFetch = null;
			this.__enabled = true;
		},
		initialize: function(store){
		},
		uninitialize: function(store){
		},
		invalidate: function(){
			
		},
		_wrap: function(store, funcName, layerFuncName, nextLayer){
			// summary:
			//		Do the actual wrapping (or 'hacking' if you like) to the store.
			// tags:
			//		internal
			// store: Read-store
			//		The store to be wrapped.
			this._store = store;
			this._funcName = funcName;
			var fetchFunc = lang.hitch(this, function(){
				return (this.enabled() ? this[layerFuncName || this.layerFuncName] : this.originFetch).apply(this, arguments);
			});
			if(nextLayer){
				this._originFetch = nextLayer._originFetch;
				nextLayer._originFetch = fetchFunc;
			}else{
				this._originFetch = store[funcName] || function(){};
				store[funcName] = fetchFunc;
			}
			this.initialize(store);
		},
		_unwrap: function(nextLayer){
			// summary:
			//		Do the actual unwrapping to the store.
			// tags:
			//		internal
			// store: Read-store
			//		The store to be unwrapped.
			this.uninitialize(this._store);
			if(nextLayer){
				nextLayer._originFetch = this._originFetch;
			}else{
				this._store[this._funcName] = this._originFetch;
			}
			this._originFetch = null;
			this._store = null;
		},
		enabled: function(/* bool? */toEnable){
			// summary:
			//		The get/set function of the enabled status of this layer
			// tags:
			//		public
			// toEnable: Boolean?
			//		If given, is a setter, otherwise, it's getter.
			if(typeof toEnable != "undefined"){
				this.__enabled = !!toEnable;
			}
			return this.__enabled;	//Boolean
		},
		name: function(){
			// summary:
			//		Get the name of this store layer.
			//		The default name retrieved from class name, which should have a pattern of "{name}Layer".
			//		If this pattern does not exist, the whole class name will be this layer's name.
			//		It's better to override this method if your class name is too complicated.
			// tags:
			//		public extension
			// returns:
			//		The name of this layer.
			if(!this.__name){
				var m = this.declaredClass.match(/(?:\.(?:_*)([^\.]+)Layer$)|(?:\.([^\.]+)$)/i);
				this.__name = m ? (m[1] || m[2]).toLowerCase() : this.declaredClass;
			}
			return this.__name;
		},
		originFetch: function(){
			return (lang.hitch(this._store, this._originFetch)).apply(this, arguments);
		}
	});
	var _ServerSideLayer = declare("dojox.grid.enhanced.plugins._ServerSideLayer", _StoreLayer, {
		// summary:
		//		The most abstract class for all server side store layers.
		// tags:
		//		abstract
/*=====
		// _url: [protected] string
		//		The url of the server
		_url: "",
		// __cmds [private] object
		//		The command object to be sent to server.
		__cmds: {},
=====*/
		constructor: function(args){
			args = args || {};
			this._url = args.url || "";
			this._isStateful = !!args.isStateful;
			this._onUserCommandLoad = args.onCommandLoad || function(){};
			this.__cmds = {cmdlayer:this.name(), enable:true};
			
			//Only for stateful server, sending commands before fetch makes sense.
			this.useCommands(this._isStateful);
		},
		enabled: function(/* bool? */toEnable){
			// summary:
			//		Overrided from _StoreLayer.enabled
			var res = this.inherited(arguments);
			this.__cmds.enable = this.__enabled;
			return res;
		},
		useCommands: function(/* bool? */toUse){
			// summary:
			//		If you only want to modify the user request, instead of sending a separate command
			//		to server before fetch, just call:
			// |		this.useCommand(false);
			// tags:
			//		public
			// toUse: Boolean?
			//		If provided, it's a setter, otherwise, it's a getter
			if(typeof toUse != "undefined"){
				this.__cmds.cmdlayer = (toUse && this._isStateful) ? this.name() : null;
			}
			return !!(this.__cmds.cmdlayer);	//Boolean
		},
		_fetch: function(/* keywordArgs */userRequest){
			// summary:
			//		Implementation of _StoreLayer._fetch
			if(this.__cmds.cmdlayer){
				//We're gonna send command to server before fetch.
				xhr.post({
					url: this._url || this._store.url,
					content: this.__cmds,
					load: lang.hitch(this, function(responce){
						this.onCommandLoad(responce, userRequest);
						this.originFetch(userRequest);
					}),
					error: lang.hitch(this, this.onCommandError)
				});
			}else{
				//The user only wants to modify the request object.
				this.onCommandLoad("", userRequest);
				this.originFetch(userRequest);
			}
			return userRequest;	// dojo/data/api/Request
		},
		command: function(/* string */cmdName,/* (string|number|bool|...)? */cmdContent){
			// summary:
			//		get/set a command (a name-value pair)
			// tags:
			//		public
			// cmdName: string
			//		The name of the command
			// cmdContent: anything
			//		The content of the command
			// returns:
			//		The content of the command if cmdContent is undefined
			var cmds = this.__cmds;
			if(cmdContent === null){
				delete cmds[cmdName];
			}else if(typeof cmdContent !== "undefined"){
				cmds[cmdName] = cmdContent;
			}
			return cmds[cmdName];	//anything
		},
		onCommandLoad: function(/* string */response, /* keywordArgs */userRequest){
			// summary:
			//		When the server gives back *response* for the commands, you can do something here.
			// tags:
			//		callback extension
			// response: string
			//		server response
			// userRequest: [in|out] dojo/data/api/Request
			//		The request object for *fetch*. You can modify this object according to the *response*
			//		so as to change the behavior of *fetch*
			this._onUserCommandLoad(this.__cmds, userRequest, response);
		},
		onCommandError: function(error){
			// summary:
			//		handle errors when sending commands.
			// tags:
			//		callback extension
			// error: Error
			console.log(error);
			throw error;
		}
	});

	return {
		_StoreLayer: _StoreLayer,
		_ServerSideLayer: _ServerSideLayer,
		wrap: ns.wrap
	};
});
