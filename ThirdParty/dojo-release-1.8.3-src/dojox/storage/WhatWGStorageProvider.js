dojo.provide("dojox.storage.WhatWGStorageProvider");
dojo.require("dojox.storage.Provider");
dojo.require("dojox.storage.manager");

dojo.declare("dojox.storage.WhatWGStorageProvider", [ dojox.storage.Provider ], {
	// summary:
	//		Storage provider that uses WHAT Working Group features in Firefox 2
	//		to achieve permanent storage.
	// description:
	//		The WHAT WG storage API is documented at
	//		http://www.whatwg.org/specs/web-apps/current-work/#scs-client-side
	//
	//		You can disable this storage provider with the following djConfig variable:
	// |	var djConfig = { disableWhatWGStorage: true };
	//
	//		Authors of this storage provider:
	//
	//		- JB Boisseau, jb.boisseau@eutech-ssii.com
	//		- Brad Neuberg, bkn3@columbia.edu

	initialized: false,
	
	_domain: null,
	_available: null,
	_statusHandler: null,
	_allNamespaces: null,
	_storageEventListener: null,
	
	initialize: function(){
		if(dojo.config["disableWhatWGStorage"] == true){
			return;
		}
		
		// get current domain
		this._domain = location.hostname;
		// console.debug(this._domain);
		
		// indicate that this storage provider is now loaded
		this.initialized = true;
		dojox.storage.manager.loaded();
	},
	
	isAvailable: function(){
		try{
			var myStorage = globalStorage[location.hostname];
		}catch(e){
			this._available = false;
			return this._available;
		}
		
		this._available = true;
		return this._available;
	},

	put: function(key, value, resultsHandler, namespace){
		if(this.isValidKey(key) == false){
			throw new Error("Invalid key given: " + key);
		}
		namespace = namespace||this.DEFAULT_NAMESPACE;
		
		// get our full key name, which is namespace + key
		key = this.getFullKey(key, namespace);
		
		this._statusHandler = resultsHandler;
		
		// serialize the value;
		// handle strings differently so they have better performance
		if(dojo.isString(value)){
			value = "string:" + value;
		}else{
			value = dojo.toJson(value);
		}
		
		// register for successful storage events.
		var storageListener = dojo.hitch(this, function(evt){
			// remove any old storage event listener we might have added
			// to the window on old put() requests; Firefox has a bug
			// where it can occassionaly go into infinite loops calling
			// our storage event listener over and over -- this is a
			// workaround
			// FIXME: Simplify this into a test case and submit it
			// to Firefox
			window.removeEventListener("storage", storageListener, false);
			
			// indicate we succeeded
			if(resultsHandler){
				resultsHandler.call(null, this.SUCCESS, key, null, namespace);
			}
		});
		
		window.addEventListener("storage", storageListener, false);
		
		// try to store the value
		try{
			var myStorage = globalStorage[this._domain];
			myStorage.setItem(key, value);
		}catch(e){
			// indicate we failed
			this._statusHandler.call(null, this.FAILED, key, e.toString(), namespace);
		}
	},

	get: function(key, namespace){
		if(this.isValidKey(key) == false){
			throw new Error("Invalid key given: " + key);
		}
		namespace = namespace||this.DEFAULT_NAMESPACE;
		
		// get our full key name, which is namespace + key
		key = this.getFullKey(key, namespace);
		
		// sometimes, even if a key doesn't exist, Firefox
		// will return a blank string instead of a null --
		// this _might_ be due to having underscores in the
		// keyname, but I am not sure.
		
		// FIXME: Simplify this bug into a testcase and
		// submit it to Firefox
		var myStorage = globalStorage[this._domain];
		var results = myStorage.getItem(key);
		
		if(results == null || results == ""){
			return null;
		}
		
		results = results.value;
		
		// destringify the content back into a
		// real JavaScript object;
		// handle strings differently so they have better performance
		if(dojo.isString(results) && (/^string:/.test(results))){
			results = results.substring("string:".length);
		}else{
			results = dojo.fromJson(results);
		}
		
		return results;
	},
	
	getNamespaces: function(){
		var results = [ this.DEFAULT_NAMESPACE ];
		
		// simply enumerate through our array and save any string
		// that starts with __
		var found = {};
		var myStorage = globalStorage[this._domain];
		var tester = /^__([^_]*)_/;
		for(var i = 0; i < myStorage.length; i++){
			var currentKey = myStorage.key(i);
			if(tester.test(currentKey) == true){
				var currentNS = currentKey.match(tester)[1];
				// have we seen this namespace before?
				if(typeof found[currentNS] == "undefined"){
					found[currentNS] = true;
					results.push(currentNS);
				}
			}
		}
		
		return results;
	},

	getKeys: function(namespace){
		namespace = namespace||this.DEFAULT_NAMESPACE;
		
		if(this.isValidKey(namespace) == false){
			throw new Error("Invalid namespace given: " + namespace);
		}
		
		// create a regular expression to test the beginning
		// of our key names to see if they match our namespace;
		// if it is the default namespace then test for the presence
		// of no namespace for compatibility with older versions
		// of dojox.storage
		var namespaceTester;
		if(namespace == this.DEFAULT_NAMESPACE){
			namespaceTester = new RegExp("^([^_]{2}.*)$");
		}else{
			namespaceTester = new RegExp("^__" + namespace + "_(.*)$");
		}
		
		var myStorage = globalStorage[this._domain];
		var keysArray = [];
		for(var i = 0; i < myStorage.length; i++){
			var currentKey = myStorage.key(i);
			if(namespaceTester.test(currentKey) == true){
				// strip off the namespace portion
				currentKey = currentKey.match(namespaceTester)[1];
				keysArray.push(currentKey);
			}
		}
		
		return keysArray;
	},

	clear: function(namespace){
		namespace = namespace||this.DEFAULT_NAMESPACE;
		
		if(this.isValidKey(namespace) == false){
			throw new Error("Invalid namespace given: " + namespace);
		}
		
		// create a regular expression to test the beginning
		// of our key names to see if they match our namespace;
		// if it is the default namespace then test for the presence
		// of no namespace for compatibility with older versions
		// of dojox.storage
		var namespaceTester;
		if(namespace == this.DEFAULT_NAMESPACE){
			namespaceTester = new RegExp("^[^_]{2}");
		}else{
			namespaceTester = new RegExp("^__" + namespace + "_");
		}
		
		var myStorage = globalStorage[this._domain];
		var keys = [];
		for(var i = 0; i < myStorage.length; i++){
			if(namespaceTester.test(myStorage.key(i)) == true){
				keys[keys.length] = myStorage.key(i);
			}
		}
		
		dojo.forEach(keys, dojo.hitch(myStorage, "removeItem"));
	},
	
	remove: function(key, namespace){
		// get our full key name, which is namespace + key
		key = this.getFullKey(key, namespace);
		
		var myStorage = globalStorage[this._domain];
		myStorage.removeItem(key);
	},
	
	isPermanent: function(){
		return true;
	},

	getMaximumSize: function(){
		return this.SIZE_NO_LIMIT;
	},

	hasSettingsUI: function(){
		return false;
	},
	
	showSettingsUI: function(){
		throw new Error(this.declaredClass + " does not support a storage settings user-interface");
	},
	
	hideSettingsUI: function(){
		throw new Error(this.declaredClass + " does not support a storage settings user-interface");
	},
	
	getFullKey: function(key, namespace){
		namespace = namespace||this.DEFAULT_NAMESPACE;
		
		if(this.isValidKey(namespace) == false){
			throw new Error("Invalid namespace given: " + namespace);
		}
		
		// don't append a namespace string for the default namespace,
		// for compatibility with older versions of dojox.storage
		if(namespace == this.DEFAULT_NAMESPACE){
			return key;
		}else{
			return "__" + namespace + "_" + key;
		}
	}
});

dojox.storage.manager.register("dojox.storage.WhatWGStorageProvider",
								new dojox.storage.WhatWGStorageProvider());
