dojo.provide("dojox.storage.CookieStorageProvider");

dojo.require("dojox.storage.Provider");
dojo.require("dojox.storage.manager");
dojo.require("dojo.cookie");

dojo.declare(
	"dojox.storage.CookieStorageProvider",
	[dojox.storage.Provider],
	{
		store: null,

		cookieName: 'dojoxStorageCookie',

		storageLife: 730, // in days

		initialize: function(){

			this.store = dojo.fromJson(dojo.cookie(this.cookieName)) || {};

			this.initialized = true;
			dojox.storage.manager.loaded();
		},

		isAvailable: function(){ /*Boolean*/
			return dojo.cookie.isSupported();
		},

		put: function(	/*string*/ key,
						/*object*/ value,
						/*function*/ resultsHandler,
						/*string?*/ namespace){

			this._assertIsValidKey(key);

			namespace = namespace||this.DEFAULT_NAMESPACE;
			this._assertIsValidNamespace(namespace);

			fullKey = this.getFullKey(key,namespace);

			this.store[fullKey] = dojo.toJson(value);
			this._save();

			var success = dojo.toJson(this.store) === dojo.cookie(this.cookieName);

			if(!success){
				this.remove(key,namespace);
			}

			if(resultsHandler){
				resultsHandler(success ? this.SUCCESS : this.FAILED, key, null, namespace);
			}

		},

		get: function(/*string*/ key, /*string?*/ namespace){ /*Object*/
			this._assertIsValidKey(key);

			namespace = namespace||this.DEFAULT_NAMESPACE;
			this._assertIsValidNamespace(namespace);

			// get our full key name, which is namespace + key
			key = this.getFullKey(key, namespace);

			return this.store[key] ? dojo.fromJson(this.store[key]) : null;
		},

		getKeys: function(/*string?*/ namespace){ /*Array*/
			namespace = namespace||this.DEFAULT_NAMESPACE;
			this._assertIsValidNamespace(namespace);

			namespace = '__'+namespace+'_';

			var keys = [];
			for(var currentKey in this.store){
				if(this._beginsWith(currentKey,namespace)){
					currentKey = currentKey.substring(namespace.length);
					keys.push(currentKey);
				}
			}

			return keys;
		},

		clear: function(/*string?*/ namespace){
			namespace = namespace||this.DEFAULT_NAMESPACE;
			this._assertIsValidNamespace(namespace);

			namespace = '__'+namespace+'_';

			for(var currentKey in this.store){
				if(this._beginsWith(currentKey,namespace)){
					delete(this.store[currentKey]);
				}
			}

			this._save();
		},

		remove: function(/*string*/ key, /*string?*/ namespace){
			namespace = namespace||this.DEFAULT_NAMESPACE;
			this._assertIsValidNamespace(namespace);

			this._assertIsValidKey(key);
			key = this.getFullKey(key, namespace);

			delete this.store[key];
			this._save();
		},

		getNamespaces: function(){ /*string[]*/
			// There must be a better way than
			// to execute a regex on *every*
			// item in the store.

			var results = [this.DEFAULT_NAMESPACE];

			var found = {};
			found[this.DEFAULT_NAMESPACE] = true;
			var tester = /^__([^_]*)_/;

			for(var currentKey in this.store){
				if(tester.test(currentKey) == true){
					var currentNS = currentKey.match(tester)[1];
					if(typeof found[currentNS] == "undefined"){
						found[currentNS] = true;
						results.push(currentNS);
					}
				}
			}

			return results;
		},

		isPermanent: function(){ /*Boolean*/
			return true;
		},

		getMaximumSize: function(){ /* mixed */
			return 4;
		},

		hasSettingsUI: function(){ /*Boolean*/
			return false;
		},

		isValidKey: function(/*string*/ keyName){ /*Boolean*/
			if(keyName === null || keyName === undefined){
				return false;
			}

			return /^[0-9A-Za-z_-]*$/.test(keyName);
		},

		isValidNamespace: function(/*string*/ keyName){ /*Boolean*/
			// we *must* prevent namespaces from having
			// underscores - else lookup of namespaces
			// via RegEx (e.g. in getNamespaces ) would
			// return wrong results.
			//
			// The only way around this would be to
			// disallow underscores in keys.

			if(keyName === null || keyName === undefined){
				return false;
			}

			return /^[0-9A-Za-z-]*$/.test(keyName);
		},

		getFullKey: function(key, namespace){
			// checks for valid namespace and
			// key are already performed.
			return "__" + namespace + "_" + key;
		},

		_save: function(){
			dojo.cookie(this.cookieName,dojo.toJson(this.store),{expires: this.storageLife});
		},

		_beginsWith: function(/* string */ haystack, /* string */ needle) {
			if(needle.length > haystack.length) {
				return false;
			}
			return haystack.substring(0,needle.length) === needle;
		},

		_assertIsValidNamespace: function(/* string */ namespace){
			if(this.isValidNamespace(namespace) === false){
				throw new Error("Invalid namespace given: " + namespace);
			}
		},

		_assertIsValidKey: function(/* string */ key){
			if(this.isValidKey(key) === false){
				throw new Error("Invalid key given: " + key);
			}
		}
	}
);

dojox.storage.manager.register("dojox.storage.CookieStorageProvider", new dojox.storage.CookieStorageProvider());
