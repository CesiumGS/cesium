dojo.provide("dojox.storage.AirDBStorageProvider");
dojo.require("dojox.storage.manager");
dojo.require("dojox.storage.Provider");

if (dojo.isAIR) {
	(function(){

		if (!air) {
			var air = {};
		}
		air.File = window.runtime.flash.filesystem.File;
		air.SQLConnection = window.runtime.flash.data.SQLConnection;
		air.SQLStatement = window.runtime.flash.data.SQLStatement;

		// summary:
		//		Storage provider that uses features in the Adobe AIR runtime to achieve
		//		permanent storage
		dojo.declare("dojox.storage.AirDBStorageProvider", [ dojox.storage.Provider ], {
			DATABASE_FILE: "dojo.db",
			TABLE_NAME: "__DOJO_STORAGE",
			initialized: false,
			
			_db: null,
			
			initialize: function(){
				this.initialized = false;

				// need to initialize our storage database
				try{
					this._db = new air.SQLConnection();
					this._db.open(air.File.applicationStorageDirectory.resolvePath(this.DATABASE_FILE));
					
					this._sql("CREATE TABLE IF NOT EXISTS " + this.TABLE_NAME + "(namespace TEXT, key TEXT, value TEXT)");
					this._sql("CREATE UNIQUE INDEX IF NOT EXISTS namespace_key_index ON " + this.TABLE_NAME + " (namespace, key)");
					
					this.initialized = true;
				}catch(e){
					console.debug("dojox.storage.AirDBStorageProvider.initialize:", e);
				}
				
				// indicate that this storage provider is now loaded
				dojox.storage.manager.loaded();
			},
			
			_sql: function(query, params){
				var stmt = new air.SQLStatement();
				stmt.sqlConnection = this._db;
				stmt.text = query;
				if (params){
					for (var param in params){
						stmt.parameters[param] = params[param];
					}
				}
				stmt.execute();
				return stmt.getResult();
			},
			
			_beginTransaction: function(){
				this._db.begin();
			},
	
			_commitTransaction: function(){
				this._db.commit();
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
					this._sql("DELETE FROM " + this.TABLE_NAME + " WHERE namespace = :namespace AND key = :key",
						{ ":namespace":namespace, ":key":key });
					this._sql("INSERT INTO " + this.TABLE_NAME + " VALUES (:namespace, :key, :value)",
						{ ":namespace":namespace, ":key":key, ":value":value });
				}catch(e){
					// indicate we failed
					console.debug("dojox.storage.AirDBStorageProvider.put:", e);
					resultsHandler(this.FAILED, key, e.toString());
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
				
				var results = this._sql("SELECT * FROM " + this.TABLE_NAME + " WHERE namespace = :namespace AND key = :key",
					{ ":namespace":namespace, ":key":key });
				
				if(results.data && results.data.length){
					return results.data[0].value;
				}
				
				return null;
			},
			
			getNamespaces: function(){
				var results = [ this.DEFAULT_NAMESPACE ];
				var rs = this._sql("SELECT namespace FROM " + this.TABLE_NAME + " DESC GROUP BY namespace");
				if (rs.data){
					for(var i = 0; i < rs.data.length; i++){
						if(rs.data[i].namespace != this.DEFAULT_NAMESPACE){
							results.push(rs.data[i].namespace);
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
				
				var results = [];
				var rs = this._sql("SELECT key FROM " + this.TABLE_NAME + " WHERE namespace = :namespace", { ":namespace":namespace });
				if (rs.data){
					for(var i = 0; i < rs.data.length; i++){
						results.push(rs.data[i].key);
					}
				}
				return results;
			},
			
			clear: function(namespace){
				if(this.isValidKey(namespace) == false){
					throw new Error("Invalid namespace given: " + namespace);
				}
				this._sql("DELETE FROM " + this.TABLE_NAME + " WHERE namespace = :namespace", { ":namespace":namespace });
			},
			
			remove: function(key, namespace){
				namespace = namespace||this.DEFAULT_NAMESPACE;
				this._sql("DELETE FROM " + this.TABLE_NAME + " WHERE namespace = :namespace AND key = :key",
					{ ":namespace":namespace, ":key":key });
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
					this._beginTransaction();
					for(var i=0;i<keys.length;i++) {
						this._sql("DELETE FROM " + this.TABLE_NAME + " WHERE namespace = :namespace AND key = :key",
							{ ":namespace":namespace, ":key":keys[i] });
						this._sql("INSERT INTO " + this.TABLE_NAME + " VALUES (:namespace, :key, :value)",
						 	{ ":namespace":namespace, ":key":keys[i], ":value":values[i] });
					}
					this._commitTransaction();
				}catch(e){
					// indicate we failed
					console.debug("dojox.storage.AirDBStorageProvider.putMultiple:", e);
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
					var result = this._sql("SELECT * FROM " + this.TABLE_NAME + " WHERE namespace = :namespace AND key = :key",
						{ ":namespace":namespace, ":key":keys[i] });
					results[i] = result.data && result.data.length ? result.data[0].value : null;
				}
				
				return results;
			},
			
			removeMultiple: function(keys, namespace){
				namespace = namespace||this.DEFAULT_NAMESPACE;
				
				this._beginTransaction();
				for(var i=0;i<keys.length;i++){
					this._sql("DELETE FROM " + this.TABLE_NAME + " WHERE namespace = namespace = :namespace AND key = :key",
						{ ":namespace":namespace, ":key":keys[i] });
				}
				this._commitTransaction();
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

		dojox.storage.manager.register("dojox.storage.AirDBStorageProvider", new dojox.storage.AirDBStorageProvider());
		dojox.storage.manager.initialize();
	})();
}