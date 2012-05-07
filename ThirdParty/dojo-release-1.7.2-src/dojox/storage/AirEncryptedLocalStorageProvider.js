dojo.provide("dojox.storage.AirEncryptedLocalStorageProvider");
dojo.require("dojox.storage.manager");
dojo.require("dojox.storage.Provider");

if (dojo.isAIR) {
	(function(){
		
		if (!air) {
			var air = {};
		}
		air.ByteArray = window.runtime.flash.utils.ByteArray;
		air.EncryptedLocalStore = window.runtime.flash.data.EncryptedLocalStore,

		// summary:
		//		Storage provider that uses features in the Adobe AIR runtime to achieve
		//		permanent storage
		dojo.declare("dojox.storage.AirEncryptedLocalStorageProvider", [ dojox.storage.Provider ], {
			initialize: function(){
				// indicate that this storage provider is now loaded
				dojox.storage.manager.loaded();
			},
	
			isAvailable: function(){
				return true;
			},
			
			_getItem: function(key){
				var storedValue = air.EncryptedLocalStore.getItem("__dojo_" + key);
				return storedValue ? storedValue.readUTFBytes(storedValue.length) : "";
			},
			
			_setItem: function(key, value){
				var bytes = new air.ByteArray();
				bytes.writeUTFBytes(value);
				air.EncryptedLocalStore.setItem("__dojo_" + key, bytes);
			},
			
			_removeItem: function(key){
				air.EncryptedLocalStore.removeItem("__dojo_" + key);
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
					var namespaces = this._getItem("namespaces")||'|';
					if(namespaces.indexOf('|'+namespace+'|')==-1){
						this._setItem("namespaces", namespaces + namespace + '|');
					}
					var keys = this._getItem(namespace + "_keys")||'|';
					if(keys.indexOf('|'+key+'|')==-1){
						this._setItem(namespace + "_keys", keys + key + '|');
					}
					this._setItem('_' + namespace + '_' + key, value);
				}catch(e){
					// indicate we failed
					console.debug("dojox.storage.AirEncryptedLocalStorageProvider.put:", e);
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
				return this._getItem('_' + namespace + '_' + key);
			},
			
			getNamespaces: function(){
				var results = [ this.DEFAULT_NAMESPACE ];
				var namespaces = (this._getItem("namespaces")||'|').split('|');
				for (var i=0;i<namespaces.length;i++){
					if(namespaces[i].length && namespaces[i] != this.DEFAULT_NAMESPACE){
						results.push(namespaces[i]);
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
				var keys = (this._getItem(namespace + "_keys")||'|').split('|');
				for (var i=0;i<keys.length;i++){
					if (keys[i].length){
						results.push(keys[i]);
					}
				}
				return results;
			},
			
			clear: function(namespace){
				if(this.isValidKey(namespace) == false){
					throw new Error("Invalid namespace given: " + namespace);
				}
				var namespaces = this._getItem("namespaces")||'|';
				if(namespaces.indexOf('|'+namespace+'|')!=-1){
					this._setItem("namespaces", namespaces.replace('|' + namespace + '|', '|'));
				}
				var keys = (this._getItem(namespace + "_keys")||'|').split('|');
				for (var i=0;i<keys.length;i++){
					if (keys[i].length){
						this._removeItem(namespace + "_" + keys[i]);
					}
				}
				this._removeItem(namespace + "_keys");
			},
			
			remove: function(key, namespace){
				namespace = namespace||this.DEFAULT_NAMESPACE;
				
				var keys = this._getItem(namespace + "_keys")||'|';
				if(keys.indexOf('|'+key+'|')!=-1){
					this._setItem(namespace + "_keys", keys.replace('|' + key + '|', '|'));
				}
				this._removeItem('_' + namespace + '_' + key);
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
					console.debug("dojox.storage.AirEncryptedLocalStorageProvider.putMultiple:", e);
					if(resultsHandler){
						resultsHandler(this.FAILED, keys, e.toString(), namespace);
					}
					return;
				}
				
				if(resultsHandler){
					resultsHandler(this.SUCCESS, keys, null);
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

		dojox.storage.manager.register("dojox.storage.AirEncryptedLocalStorageProvider", new dojox.storage.AirEncryptedLocalStorageProvider());
		dojox.storage.manager.initialize();
	})();
}