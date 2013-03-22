dojo.provide("dojox.storage.AirFileStorageProvider");
dojo.require("dojox.storage.manager");
dojo.require("dojox.storage.Provider");

if (dojo.isAIR) {
	(function(){

		if (!air) {
			var air = {};
		}
		air.File = window.runtime.flash.filesystem.File;
		air.FileStream = window.runtime.flash.filesystem.FileStream;
		air.FileMode = window.runtime.flash.filesystem.FileMode;
		
		// summary:
		//		Storage provider that uses features in the Adobe AIR runtime to achieve
		//		permanent storage
		dojo.declare("dojox.storage.AirFileStorageProvider", [ dojox.storage.Provider ], {
			initialized: false,
			
			_storagePath: "__DOJO_STORAGE/",
	
			initialize: function(){
				this.initialized = false;

				// need to initialize our storage directory
				try{
					var dir = air.File.applicationStorageDirectory.resolvePath(this._storagePath);
					if (!dir.exists){
						dir.createDirectory();
					}
					this.initialized = true;
				}catch(e){
					console.debug("dojox.storage.AirFileStorageProvider.initialize:", e);
				}
				
				// indicate that this storage provider is now loaded
				dojox.storage.manager.loaded();
			},
	
			isAvailable: function(){
				return true;
			},
			
			put: function(key, value, resultsHandler, namespace){
				if(this.isValidKey(key) == false){
					throw new Error("Invalid key given: " + key);
				}
				namespace = namespace||this.DEFAULT_NAMESPACE;
				if(this.isValidKey(namespace) == false){
					throw new Error("Invalid namespace given: " + namespace);
				}
				
				// try to store the value
				try{
					this.remove(key, namespace);
					
					var dir = air.File.applicationStorageDirectory.resolvePath(this._storagePath + namespace);
					if (!dir.exists){
						dir.createDirectory();
					}
					
					var file = dir.resolvePath(key);
					var stream = new air.FileStream();
					stream.open(file, air.FileMode.WRITE);
					stream.writeObject(value);
					stream.close();
				}catch(e){
					// indicate we failed
					console.debug("dojox.storage.AirFileStorageProvider.put:", e);
					resultsHandler(this.FAILED, key, e.toString(), namespace);
					return;
				}
				
				if(resultsHandler){
					resultsHandler(this.SUCCESS, key, null, namespace);
				}
			},
			
			get: function(key, namespace){
				if(this.isValidKey(key) == false){
					throw new Error("Invalid key given: " + key);
				}
				namespace = namespace||this.DEFAULT_NAMESPACE;
				
				var results = null;
				
				var file = air.File.applicationStorageDirectory.resolvePath(this._storagePath + namespace + '/' + key);
				if (file.exists && !file.isDirectory){
					var stream = new air.FileStream();
					stream.open(file, air.FileMode.READ);
					results = stream.readObject();
					stream.close();
				}
				
				return results;
			},
			
			getNamespaces: function(){
				var results = [ this.DEFAULT_NAMESPACE ];
				var dir = air.File.applicationStorageDirectory.resolvePath(this._storagePath);
				var files = dir.getDirectoryListing(), i;
				for (i = 0; i < files.length; i++) {
					if(files[i].isDirectory && files[i].name != this.DEFAULT_NAMESPACE){
						results.push(files[i].name);
					}
				}
				return results;
			},

			getKeys: function(namespace){
				namespace = namespace||this.DEFAULT_NAMESPACE;
				if(this.isValidKey(namespace) == false){
					throw new Error("Invalid namespace given: " + namespace);
				}

				var results = [];
				var dir = air.File.applicationStorageDirectory.resolvePath(this._storagePath + namespace);
				if (dir.exists && dir.isDirectory){
					var files = dir.getDirectoryListing(), i;
					for (i = 0; i < files.length; i++) {
						results.push(files[i].name);
					}
				}
				return results;
			},
			
			clear: function(namespace){
				if(this.isValidKey(namespace) == false){
					throw new Error("Invalid namespace given: " + namespace);
				}
				var dir = air.File.applicationStorageDirectory.resolvePath(this._storagePath + namespace);
				if (dir.exists && dir.isDirectory){
					dir.deleteDirectory(true);
				}
			},
			
			remove: function(key, namespace){
				namespace = namespace||this.DEFAULT_NAMESPACE;
				var file = air.File.applicationStorageDirectory.resolvePath(this._storagePath + namespace + '/' + key);
				if (file.exists && !file.isDirectory){
					file.deleteFile();
				}
			},
			
			putMultiple: function(keys, values, resultsHandler, namespace) {
 				if(this.isValidKeyArray(keys) === false
						|| ! values instanceof Array
						|| keys.length != values.length){
					throw new Error("Invalid arguments: keys = [" + keys + "], values = [" + values + "]");
				}
				
				if(namespace == null || typeof namespace == "undefined"){
					namespace = this.DEFAULT_NAMESPACE;
				}
	
				if(this.isValidKey(namespace) == false){
					throw new Error("Invalid namespace given: " + namespace);
				}
	
				this._statusHandler = resultsHandler;

				// try to store the value
				try{
					for(var i=0;i<keys.length;i++) {
						this.put(keys[i], values[i], null, namespace);
					}
				}catch(e){
					// indicate we failed
					console.debug("dojox.storage.AirFileStorageProvider.putMultiple:", e);
					if(resultsHandler){
						resultsHandler(this.FAILED, keys, e.toString(), namespace);
					}
					return;
				}
				
				if(resultsHandler){
					resultsHandler(this.SUCCESS, keys, null, namespace);
				}
			},

			getMultiple: function(keys, namespace){
				if(this.isValidKeyArray(keys) === false){
					throw new Error("Invalid key array given: " + keys);
				}
				
				if(namespace == null || typeof namespace == "undefined"){
					namespace = this.DEFAULT_NAMESPACE;
				}
				
				if(this.isValidKey(namespace) == false){
					throw new Error("Invalid namespace given: " + namespace);
				}
		
				var results = [];
				for(var i=0;i<keys.length;i++){
					results[i] = this.get(keys[i], namespace);
				}
				return results;
			},
			
			removeMultiple: function(keys, namespace){
				namespace = namespace||this.DEFAULT_NAMESPACE;
				
				for(var i=0;i<keys.length;i++){
					this.remove(keys[i], namespace);
				}
			},
			
			isPermanent: function(){ return true; },

			getMaximumSize: function(){ return this.SIZE_NO_LIMIT; },

			hasSettingsUI: function(){ return false; },
			
			showSettingsUI: function(){
				throw new Error(this.declaredClass + " does not support a storage settings user-interface");
			},
			
			hideSettingsUI: function(){
				throw new Error(this.declaredClass + " does not support a storage settings user-interface");
			}
		});

		dojox.storage.manager.register("dojox.storage.AirFileStorageProvider", new dojox.storage.AirFileStorageProvider());
		dojox.storage.manager.initialize();
	})();
}