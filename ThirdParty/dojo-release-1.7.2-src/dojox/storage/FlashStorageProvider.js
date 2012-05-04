dojo.provide("dojox.storage.FlashStorageProvider");

dojo.require("dojox.flash");
dojo.require("dojox.storage.manager");
dojo.require("dojox.storage.Provider");

// summary:
//		Storage provider that uses features in Flash to achieve permanent
//		storage
// description:
//		Authors of this storage provider-
//			Brad Neuberg, bkn3@columbia.edu
dojo.declare("dojox.storage.FlashStorageProvider", dojox.storage.Provider, {
		initialized: false,
		
		_available: null,
		_statusHandler: null,
		_flashReady: false,
		_pageReady: false,
		
		initialize: function(){
		  //console.debug("FlashStorageProvider.initialize");
			if(dojo.config["disableFlashStorage"] == true){
				return;
			}
			
			// initialize our Flash
			dojox.flash.addLoadedListener(dojo.hitch(this, function(){
			  //console.debug("flashReady");
			  // indicate our Flash subsystem is now loaded
			  this._flashReady = true;
			  if(this._flashReady && this._pageReady){
				  this._loaded();
				}
			}));
			var swfLoc = dojo.moduleUrl("dojox", "storage/Storage.swf").toString();
			dojox.flash.setSwf(swfLoc, false);
			
			// wait till page is finished loading
			dojo.connect(dojo, "loaded", this, function(){
			  //console.debug("pageReady");
			  this._pageReady = true;
			  if(this._flashReady && this._pageReady){
			    this._loaded();
			  }
			});
		},
		
		//	Set a new value for the flush delay timer.
		//	Possible values:
		//	  0 : Perform the flush synchronously after each "put" request
		//	> 0 : Wait until 'newDelay' ms have passed without any "put" request to flush
		//	 -1 : Do not  automatically flush
		setFlushDelay: function(newDelay){
			if(newDelay === null || typeof newDelay === "undefined" || isNaN(newDelay)){
				throw new Error("Invalid argunment: " + newDelay);
			}
			
			dojox.flash.comm.setFlushDelay(String(newDelay));
		},
		
		getFlushDelay: function(){
			return Number(dojox.flash.comm.getFlushDelay());
		},
		
		flush: function(namespace){
			//FIXME: is this test necessary?  Just use !namespace
			if(namespace == null || typeof namespace == "undefined"){
				namespace = dojox.storage.DEFAULT_NAMESPACE;
			}
			dojox.flash.comm.flush(namespace);
		},

		isAvailable: function(){
			return (this._available = !dojo.config["disableFlashStorage"]);
		},

		put: function(key, value, resultsHandler, namespace){
			if(!this.isValidKey(key)){
				throw new Error("Invalid key given: " + key);
			}
			
			if(!namespace){
				namespace = dojox.storage.DEFAULT_NAMESPACE;
			}
			
			if(!this.isValidKey(namespace)){
				throw new Error("Invalid namespace given: " + namespace);
			}
				
			this._statusHandler = resultsHandler;
			
			// serialize the value;
			// handle strings differently so they have better performance
			if(dojo.isString(value)){
				value = "string:" + value;
			}else{
				value = dojo.toJson(value);
			}
			
			dojox.flash.comm.put(key, value, namespace);
		},

		putMultiple: function(keys, values, resultsHandler, namespace){
			if(!this.isValidKeyArray(keys) || ! values instanceof Array
			    || keys.length != values.length){
				throw new Error("Invalid arguments: keys = [" + keys + "], values = [" + values + "]");
			}
			
			if(!namespace){
				namespace = dojox.storage.DEFAULT_NAMESPACE;
			}

			if(!this.isValidKey(namespace)){
				throw new Error("Invalid namespace given: " + namespace);
			}

			this._statusHandler = resultsHandler;
			
			//	Convert the arguments on strings we can pass along to Flash
			var metaKey = keys.join(",");
			var lengths = [];
			for(var i=0;i<values.length;i++){
				if(dojo.isString(values[i])){
					values[i] = "string:" + values[i];
				}else{
					values[i] = dojo.toJson(values[i]);
				}
				lengths[i] = values[i].length;
			}
			var metaValue = values.join("");
			var metaLengths = lengths.join(",");
			
			dojox.flash.comm.putMultiple(metaKey, metaValue, metaLengths, namespace);
		},

		get: function(key, namespace){
			if(!this.isValidKey(key)){
				throw new Error("Invalid key given: " + key);
			}
			
			if(!namespace){
				namespace = dojox.storage.DEFAULT_NAMESPACE;
			}
			
			if(!this.isValidKey(namespace)){
				throw new Error("Invalid namespace given: " + namespace);
			}
			
			var results = dojox.flash.comm.get(key, namespace);

			if(results == ""){
				return null;
			}
		
			return this._destringify(results);
		},

		getMultiple: function(/*array*/ keys, /*string?*/ namespace){ /*Object*/
			if(!this.isValidKeyArray(keys)){
				throw new ("Invalid key array given: " + keys);
			}
			
			if(!namespace){
				namespace = dojox.storage.DEFAULT_NAMESPACE;
			}
			
			if(!this.isValidKey(namespace)){
				throw new Error("Invalid namespace given: " + namespace);
			}
			
			var metaKey = keys.join(",");
			var metaResults = dojox.flash.comm.getMultiple(metaKey, namespace);
			var results = eval("(" + metaResults + ")");
			
			//	destringify each entry back into a real JS object
			//FIXME: use dojo.map
			for(var i = 0; i < results.length; i++){
				results[i] = (results[i] == "") ? null : this._destringify(results[i]);
			}
			
			return results;
		},

		_destringify: function(results){
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
		
		getKeys: function(namespace){
			if(!namespace){
				namespace = dojox.storage.DEFAULT_NAMESPACE;
			}
			
			if(!this.isValidKey(namespace)){
				throw new Error("Invalid namespace given: " + namespace);
			}
			
			var results = dojox.flash.comm.getKeys(namespace);
			
			// Flash incorrectly returns an empty string as "null"
			if(results == null || results == "null"){
			  results = "";
			}
			
			results = results.split(",");
			results.sort();
			
			return results;
		},
		
		getNamespaces: function(){
			var results = dojox.flash.comm.getNamespaces();
			
			// Flash incorrectly returns an empty string as "null"
			if(results == null || results == "null"){
			  results = dojox.storage.DEFAULT_NAMESPACE;
			}
			
			results = results.split(",");
			results.sort();
			
			return results;
		},

		clear: function(namespace){
			if(!namespace){
				namespace = dojox.storage.DEFAULT_NAMESPACE;
			}
			
			if(!this.isValidKey(namespace)){
				throw new Error("Invalid namespace given: " + namespace);
			}
			
			dojox.flash.comm.clear(namespace);
		},
		
		remove: function(key, namespace){
			if(!namespace){
				namespace = dojox.storage.DEFAULT_NAMESPACE;
			}
			
			if(!this.isValidKey(namespace)){
				throw new Error("Invalid namespace given: " + namespace);
			}
			
			dojox.flash.comm.remove(key, namespace);
		},
		
		removeMultiple: function(/*array*/ keys, /*string?*/ namespace){ /*Object*/
			if(!this.isValidKeyArray(keys)){
				dojo.raise("Invalid key array given: " + keys);
			}
			if(!namespace){
				namespace = dojox.storage.DEFAULT_NAMESPACE;
			}
			
			if(!this.isValidKey(namespace)){
				throw new Error("Invalid namespace given: " + namespace);
			}
			
			var metaKey = keys.join(",");
			dojox.flash.comm.removeMultiple(metaKey, namespace);
		},

		isPermanent: function(){
			return true;
		},

		getMaximumSize: function(){
			return dojox.storage.SIZE_NO_LIMIT;
		},

		hasSettingsUI: function(){
			return true;
		},

		showSettingsUI: function(){
			dojox.flash.comm.showSettings();
			dojox.flash.obj.setVisible(true);
			dojox.flash.obj.center();
		},

		hideSettingsUI: function(){
			// hide the dialog
			dojox.flash.obj.setVisible(false);
			
			// call anyone who wants to know the dialog is
			// now hidden
			if(dojo.isFunction(dojox.storage.onHideSettingsUI)){
				dojox.storage.onHideSettingsUI.call(null);
			}
		},
		
		getResourceList: function(){ /* Array[] */
			// Dojo Offline no longer uses the FlashStorageProvider for offline
			// storage; Gears is now required
			return [];
		},
		
		/** Called when Flash and the page are finished loading. */
		_loaded: function(){
			// get available namespaces
			this._allNamespaces = this.getNamespaces();
			
			this.initialized = true;

			// indicate that this storage provider is now loaded
			dojox.storage.manager.loaded();
		},
		
		//	Called if the storage system needs to tell us about the status
		//	of a put() request.
		_onStatus: function(statusResult, key, namespace){
		  //console.debug("onStatus, statusResult="+statusResult+", key="+key);
			var ds = dojox.storage;
			var dfo = dojox.flash.obj;
			
			if(statusResult == ds.PENDING){
				dfo.center();
				dfo.setVisible(true);
			}else{
				dfo.setVisible(false);
			}
			
			if(ds._statusHandler){
				ds._statusHandler.call(null, statusResult, key, null, namespace);
			}
		}
	}
);

dojox.storage.manager.register("dojox.storage.FlashStorageProvider",
								new dojox.storage.FlashStorageProvider());
