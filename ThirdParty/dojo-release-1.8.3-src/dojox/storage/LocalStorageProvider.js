dojo.provide("dojox.storage.LocalStorageProvider");

dojo.require("dojox.storage.Provider");
dojo.require("dojox.storage.manager");

dojo.declare(
	"dojox.storage.LocalStorageProvider",
	[dojox.storage.Provider],
	{
		store: null,

		initialize: function(){

			this.store = localStorage;

			this.initialized = true;
			dojox.storage.manager.loaded();
		},

		isAvailable: function(){ /*Boolean*/
			return typeof localStorage != 'undefined';
		},

		put: function(	/*string*/ key,
						/*object*/ value,
						/*function*/ resultsHandler,
						/*string?*/ namespace){

			// TODO: Use the events as specified in http://dev.w3.org/html5/webstorage/#the-storage-event ?
			//	Currently, the storage event is not reliable around browsers.

			this._assertIsValidKey(key);

			namespace = namespace||this.DEFAULT_NAMESPACE;
			this._assertIsValidNamespace(namespace);

			var fullKey = this.getFullKey(key,namespace);

			// prepending a prefix to a string value
			// will result in that prefix not being
			// usable as a value, so we better use
			// toJson() always.
			value = dojo.toJson(value);

			try { // ua may raise an QUOTA_EXCEEDED_ERR exception
				this.store.setItem(fullKey,value);

				if(resultsHandler){
					resultsHandler(this.SUCCESS, key, null, namespace);
				}
			} catch(e) {
				if(resultsHandler){
					resultsHandler(this.FAILED, key, e.toString(), namespace);
				}
			}
		},

		get: function(/*string*/ key, /*string?*/ namespace){ /*Object*/
			this._assertIsValidKey(key);

			namespace = namespace||this.DEFAULT_NAMESPACE;
			this._assertIsValidNamespace(namespace);

			// get our full key name, which is namespace + key
			key = this.getFullKey(key, namespace);

			return dojo.fromJson(this.store.getItem(key));
		},

		getKeys: function(/*string?*/ namespace){ /*Array*/
			namespace = namespace||this.DEFAULT_NAMESPACE;
			this._assertIsValidNamespace(namespace);

			namespace = '__'+namespace+'_'

			var keys = [];
			for(var i = 0; i < this.store.length; i++){
				var currentKey = this.store.key(i);
				if(this._beginsWith(currentKey,namespace)){
					currentKey = currentKey.substring(namespace.length);
					keys.push(currentKey);
				}
			}

			return keys;
		},

		clear: function(/*string?*/ namespace){
			// Um, well, the 'specs' in Provider.js say that if
			// no namespace is given, this method should nuke
			// the *complete* storage. As other components might
			// be using localStorage too, this might not be a
			// good idea, so this method won't do it.

			namespace = namespace||this.DEFAULT_NAMESPACE;
			this._assertIsValidNamespace(namespace);

			namespace = '__'+namespace+'_';

			var keys = [];
			for(var i = 0; i < this.store.length; i++){
				if(this._beginsWith(this.store.key(i),namespace)){
					keys.push(this.store.key(i));
				}
			}

			dojo.forEach(keys, dojo.hitch(this.store, "removeItem"));
		},

		remove: function(/*string*/ key, /*string?*/ namespace){
			namespace = namespace||this.DEFAULT_NAMESPACE;
			this._assertIsValidNamespace(namespace);

			this.store.removeItem(this.getFullKey(key, namespace));
		},

		getNamespaces: function(){ /*string[]*/
			// There must be a better way than
			// to execute a regex on *every*
			// item in the store.

			var results = [ this.DEFAULT_NAMESPACE];

			var found = {};
			found[this.DEFAULT_NAMESPACE] = true;
			var tester = /^__([^_]*)_/;

			for(var i = 0; i < this.store.length; i++){
				var currentKey = this.store.key(i);
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
			return dojox.storage.SIZE_NO_LIMIT;
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

dojox.storage.manager.register("dojox.storage.LocalStorageProvider", new dojox.storage.LocalStorageProvider());