dojo.provide("dojox.storage.BehaviorStorageProvider");

dojo.require("dojox.storage.Provider");
dojo.require("dojox.storage.manager");

dojo.declare(
	"dojox.storage.BehaviorStorageProvider",
	[dojox.storage.Provider],
	{
		store: null,

		storeName: '__dojox_BehaviorStorage',

		keys: [],

		initialize: function(){
			try{
				this.store = this._createStore();
				this.store.load(this.storeName);
			}catch(e){
				throw new Error("Store is not available: " + e);
			}

			var keys = this.get('keys','dojoxSystemNS');
			this.keys = keys || [];

			this.initialized = true;
			dojox.storage.manager.loaded();

		},

		isAvailable: function(){ /*Boolean*/
			// This is not completely true. UserData may
			// be disabled in security settings. To *really*
			// check if this is available, one needs to wait
			// until the store is successfully initialized...
			return dojo.isIE && dojo.isIE >= 5;
		},

		_createStore: function() {
			var storeNode = dojo.create(
				'link',
				{id: this.storeName + 'Node', style: {'display':'none'}},
				dojo.query('head')[0]
			);
			storeNode.addBehavior('#default#userdata');

			return storeNode;
		},

		put: function(	/*string*/ key,
						/*object*/ value,
						/*function*/ resultsHandler,
						/*string?*/ namespace){

			this._assertIsValidKey(key);

			namespace = namespace||this.DEFAULT_NAMESPACE;
			this._assertIsValidNamespace(namespace);

			var fullKey = this.getFullKey(key,namespace);
			value = dojo.toJson(value);

			this.store.setAttribute(fullKey, value);
			this.store.save(this.storeName);

			var success = this.store.getAttribute(fullKey) === value;
			if(success){
				this._addKey(fullKey);
				this.store.setAttribute('__dojoxSystemNS_keys', dojo.toJson(this.keys));
				this.store.save(this.storeName);
			}

			if(resultsHandler){
				resultsHandler(success ? this.SUCCESS : this.FAILED, key, null, namespace);
			}
		},

		get: function(/*string*/ key, /*string?*/ namespace){ /*Object*/
			this._assertIsValidKey(key);

			namespace = namespace||this.DEFAULT_NAMESPACE;
			this._assertIsValidNamespace(namespace);

			key = this.getFullKey(key, namespace);

			return dojo.fromJson(this.store.getAttribute(key));
		},

		getKeys: function(/*string?*/ namespace){ /*Array*/
			namespace = namespace||this.DEFAULT_NAMESPACE;
			this._assertIsValidNamespace(namespace);

			namespace = '__'+namespace+'_';

			var keys = [];
			for(var i = 0; i < this.keys.length; i++){
				var currentKey = this.keys[i];
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

			var keys = [];
			for(var i = 0; i < this.keys.length; i++){
				var currentKey = this.keys[i];
				if(this._beginsWith(currentKey,namespace)){
					keys.push(currentKey);
				}
			}

			dojo.forEach(keys, function(key){
				this.store.removeAttribute(key);
				this._removeKey(key);
			}, this);

			this.put('keys', this.keys, null, 'dojoxSystemNS');
			this.store.save(this.storeName);
		},

		remove: function(/*string*/ key, /*string?*/ namespace){
			this._assertIsValidKey(key);

			namespace = namespace||this.DEFAULT_NAMESPACE;
			this._assertIsValidNamespace(namespace);

			key = this.getFullKey(key, namespace);
			this.store.removeAttribute(key);

			this._removeKey(key);
			this.put('keys', this.keys, null, 'dojoxSystemNS');
			this.store.save(this.storeName);

		},

		getNamespaces: function(){ /*string[]*/


			var results = [ this.DEFAULT_NAMESPACE];

			var found = {};
			found[this.DEFAULT_NAMESPACE] = true;
			var tester = /^__([^_]*)_/;

			for(var i = 0; i < this.keys.length; i++){
				var currentKey = this.keys[i];
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
			// this *might* be more, depending on the zone
			// of the current site. But 64k is guaranteed.
			return 64;
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
		},

		_addKey: function(key){
			this._removeKey(key);
			this.keys.push(key);
		},

		_removeKey: function(key){
			this.keys = dojo.filter(this.keys,function(item){ return item !== key;},this);
		}
	}
);

dojox.storage.manager.register("dojox.storage.BehaviorStorageProvider", new dojox.storage.BehaviorStorageProvider());