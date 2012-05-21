dojo.provide("dojox.storage.manager");
//dojo.require("dojo.AdapterRegistry");
// FIXME: refactor this to use an AdapterRegistry

dojox.storage.manager = new function(){
	// summary: A singleton class in charge of the dojox.storage system
	// description:
	//		Initializes the storage systems and figures out the best available
	//		storage options on this platform.

	// currentProvider: Object
	//	The storage provider that was automagically chosen to do storage
	//	on this platform, such as dojox.storage.FlashStorageProvider.
	this.currentProvider = null;

	// available: Boolean
	//	Whether storage of some kind is available.
	this.available = false;

  // providers: Array
  //  Array of all the static provider instances, useful if you want to
  //  loop through and see what providers have been registered.
  this.providers = [];

	this._initialized = false;

	this._onLoadListeners = [];

	this.initialize = function(){
		// summary:
		//		Initializes the storage system and autodetects the best storage
		//		provider we can provide on this platform
		this.autodetect();
	};

	this.register = function(/*string*/ name, /*Object*/ instance){
		// summary:
		//		Registers the existence of a new storage provider; used by
		//		subclasses to inform the manager of their existence. The
		//		storage manager will select storage providers based on
		//		their ordering, so the order in which you call this method
		//		matters.
		// name:
		//		The full class name of this provider, such as
		//		"dojox.storage.FlashStorageProvider".
		// instance:
		//		An instance of this provider, which we will use to call
		//		isAvailable() on.

		// keep list of providers as a list so that we can know what order
		// storage providers are preferred; also, store the providers hashed
		// by name in case someone wants to get a provider that uses
		// a particular storage backend
		this.providers.push(instance);
		this.providers[name] = instance;
	};

	this.setProvider = function(storageClass){
		// summary:
		//		Instructs the storageManager to use the given storage class for
		//		all storage requests.
		// description:
		//		Example-
		//			dojox.storage.setProvider(
		//				dojox.storage.IEStorageProvider)

	};

	this.autodetect = function(){
		// summary:
		//		Autodetects the best possible persistent storage provider
		//		available on this platform.

		//console.debug("dojox.storage.manager.autodetect");

		if(this._initialized){ // already finished
			return;
		}

		// a flag to force the storage manager to use a particular
		// storage provider type, such as
		// djConfig = {forceStorageProvider: "dojox.storage.WhatWGStorageProvider"};
		var forceProvider = dojo.config["forceStorageProvider"] || false;

		// go through each provider, seeing if it can be used
		var providerToUse;
		//FIXME: use dojo.some
		for(var i = 0; i < this.providers.length; i++){
			providerToUse = this.providers[i];
			if(forceProvider && forceProvider == providerToUse.declaredClass){
				// still call isAvailable for this provider, since this helps some
				// providers internally figure out if they are available
				// FIXME: This should be refactored since it is non-intuitive
				// that isAvailable() would initialize some state
				providerToUse.isAvailable();
				break;
			}else if(!forceProvider && providerToUse.isAvailable()){
				break;
			}
		}

		if(!providerToUse){ // no provider available
			this._initialized = true;
			this.available = false;
			this.currentProvider = null;
			console.warn("No storage provider found for this platform");
			this.loaded();
			return;
		}

		// create this provider and mix in it's properties
		// so that developers can do dojox.storage.put rather
		// than dojox.storage.currentProvider.put, for example
		this.currentProvider = providerToUse;
		dojo.mixin(dojox.storage, this.currentProvider);

		// have the provider initialize itself
		dojox.storage.initialize();

		this._initialized = true;
		this.available = true;
	};

	this.isAvailable = function(){ /*Boolean*/
		// summary: Returns whether any storage options are available.
		return this.available;
	};

	this.addOnLoad = function(func){ /* void */
		// summary:
		//		Adds an onload listener to know when Dojo Offline can be used.
		// description:
		//		Adds a listener to know when Dojo Offline can be used. This
		//		ensures that the Dojo Offline framework is loaded and that the
		//		local dojox.storage system is ready to be used. This method is
		//		useful if you don't want to have a dependency on Dojo Events
		//		when using dojox.storage.
		// func: Function
		//		A function to call when Dojo Offline is ready to go
		this._onLoadListeners.push(func);

		if(this.isInitialized()){
			this._fireLoaded();
		}
	};

	this.removeOnLoad = function(func){ /* void */
		// summary: Removes the given onLoad listener
		for(var i = 0; i < this._onLoadListeners.length; i++){
			if(func == this._onLoadListeners[i]){
				this._onLoadListeners.splice(i, 1);
				break;
			}
		}
	};

	this.isInitialized = function(){ /*Boolean*/
	 	// summary:
		//		Returns whether the storage system is initialized and ready to
		//		be used.

		// FIXME: This should REALLY not be in here, but it fixes a tricky
		// Flash timing bug.
		// Confirm that this is still needed with the newly refactored Dojo
		// Flash. Used to be for Internet Explorer. -- Brad Neuberg
		if(this.currentProvider != null
			&& this.currentProvider.declaredClass == "dojox.storage.FlashStorageProvider"
			&& dojox.flash.ready == false){
			return false;
		}else{
			return this._initialized;
		}
	};

	this.supportsProvider = function(/*string*/ storageClass){ /* Boolean */
		// summary: Determines if this platform supports the given storage provider.
		// description:
		//		Example-
		//			dojox.storage.manager.supportsProvider(
		//				"dojox.storage.InternetExplorerStorageProvider");

		// construct this class dynamically
		try{
			// dynamically call the given providers class level isAvailable()
			// method
			var provider = eval("new " + storageClass + "()");
			var results = provider.isAvailable();
			if(!results){ return false; }
			return results;
		}catch(e){
			return false;
		}
	};

	this.getProvider = function(){ /* Object */
		// summary: Gets the current provider
		return this.currentProvider;
	};

	this.loaded = function(){
		// summary:
		//		The storage provider should call this method when it is loaded
		//		and ready to be used. Clients who will use the provider will
		//		connect to this method to know when they can use the storage
		//		system. You can either use dojo.connect to connect to this
		//		function, or can use dojox.storage.manager.addOnLoad() to add
		//		a listener that does not depend on the dojo.event package.
		// description:
		//		Example 1-
		//			if(dojox.storage.manager.isInitialized() == false){
		//				dojo.connect(dojox.storage.manager, "loaded", TestStorage, "initialize");
		//			}else{
		//				dojo.connect(dojo, "loaded", TestStorage, "initialize");
		//			}
		//		Example 2-
		//			dojox.storage.manager.addOnLoad(someFunction);


		// FIXME: we should just provide a Deferred for this. That way you
		// don't care when this happens or has happened. Deferreds are in Base
		this._fireLoaded();
	};

	this._fireLoaded = function(){
		//console.debug("dojox.storage.manager._fireLoaded");

		dojo.forEach(this._onLoadListeners, function(i){
			try{
				i();
			}catch(e){ console.debug(e); }
		});
	};

	this.getResourceList = function(){
		// summary:
		//		Returns a list of whatever resources are necessary for storage
		//		providers to work.
		// description:
		//		This will return all files needed by all storage providers for
		//		this particular environment type. For example, if we are in the
		//		browser environment, then this will return the hidden SWF files
		//		needed by the FlashStorageProvider, even if we don't need them
		//		for the particular browser we are working within. This is meant
		//		to faciliate Dojo Offline, which must retrieve all resources we
		//		need offline into the offline cache -- we retrieve everything
		//		needed, in case another browser that requires different storage
		//		mechanisms hits the local offline cache. For example, if we
		//		were to sync against Dojo Offline on Firefox 2, then we would
		//		not grab the FlashStorageProvider resources needed for Safari.
		var results = [];
		dojo.forEach(dojox.storage.manager.providers, function(currentProvider){
			results = results.concat(currentProvider.getResourceList());
		});

		return results;
	}
};
