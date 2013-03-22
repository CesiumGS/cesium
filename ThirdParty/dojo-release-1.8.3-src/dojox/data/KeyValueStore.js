define(["dojo/_base/declare", "dojo/_base/lang", "dojo/_base/xhr", "dojo/_base/kernel",
		"dojo/data/util/simpleFetch", "dojo/data/util/filter"], 
  function(declare, lang, xhr, kernel, simpleFetch, filterUtil) {

var KeyValueStore = declare("dojox.data.KeyValueStore", null, {
	// summary:
	//		This is a dojo.data store implementation.  It can take in either a Javascript
	//		array, JSON string, or URL as the data source.  Data is expected to be in the
	//		following format:
	// |	[
	// |		{ "key1": "value1" },
	// |		{ "key2": "value2" }
	// |	]
	//		This is to mimic the Java Properties file format.  Each 'item' from this store
	//		is a JS object representing a key-value pair.  If an item in the above array has
	//		more than one key/value pair, only the first will be used/accessed.
	constructor: function(/* Object */ keywordParameters){
		// summary:
		//		constructor
		// keywordParameters:
		//		- {url: String}
		//		- {data: string}
		//		- {dataVar: jsonObject}
		if(keywordParameters.url){
			this.url = keywordParameters.url;
		}
		this._keyValueString = keywordParameters.data;
		this._keyValueVar = keywordParameters.dataVar;
		this._keyAttribute = "key";
		this._valueAttribute = "value";
		this._storeProp = "_keyValueStore";
		this._features = {
			'dojo.data.api.Read': true,
			'dojo.data.api.Identity': true
		};
		this._loadInProgress = false;	//Got to track the initial load to prevent duelling loads of the dataset.
		this._queuedFetches = [];
		if(keywordParameters && "urlPreventCache" in keywordParameters){
			this.urlPreventCache = keywordParameters.urlPreventCache?true:false;
		}
	},
	
	url: "",
	data: "",

	// urlPreventCache: boolean
	//		Controls if urlPreventCache should be used with underlying xhrGet.
	urlPreventCache: false,
	
	_assertIsItem: function(/* item */ item){
		// summary:
		//		This function tests whether the item passed in is indeed an item in the store.
		// item:
		//		The item to test for being contained by the store.
		if(!this.isItem(item)){
			throw new Error("dojox.data.KeyValueStore: a function was passed an item argument that was not an item");
		}
	},
	
	_assertIsAttribute: function(/* item */ item, /* String */ attribute){
		// summary:
		//		This function tests whether the item passed in is indeed a valid 'attribute' like type for the store.
		// attribute:
		//		The attribute to test for being contained by the store.
		if(!lang.isString(attribute)){
			throw new Error("dojox.data.KeyValueStore: a function was passed an attribute argument that was not an attribute object nor an attribute name string");
		}
	},

/***************************************
     dojo/data/api/Read API
***************************************/
	getValue: function(	/* item */ item,
						/* attribute-name-string */ attribute,
						/* value? */ defaultValue){
		// summary:
		//		See dojo/data/api/Read.getValue()
		this._assertIsItem(item);
		this._assertIsAttribute(item, attribute);
		var value;
		if(attribute == this._keyAttribute){ // Looking for key
			value = item[this._keyAttribute];
		}else{
			value = item[this._valueAttribute]; // Otherwise, attribute == ('value' || the actual key )
		}
		if(value === undefined){
			value = defaultValue;
		}
		return value;
	},

	getValues: function(/* item */ item,
						/* attribute-name-string */ attribute){
		// summary:
		//		See dojo/data/api/Read.getValues()
		//		Key/Value syntax does not support multi-valued attributes, so this is just a
		//		wrapper function for getValue().
		var value = this.getValue(item, attribute);
		return (value ? [value] : []); //Array
	},

	getAttributes: function(/* item */ item){
		// summary:
		//		See dojo/data/api/Read.getAttributes()
		return [this._keyAttribute, this._valueAttribute, item[this._keyAttribute]];
	},

	hasAttribute: function(	/* item */ item,
							/* attribute-name-string */ attribute){
		// summary:
		//		See dojo/data/api/Read.hasAttribute()
		this._assertIsItem(item);
		this._assertIsAttribute(item, attribute);
		return (attribute == this._keyAttribute || attribute == this._valueAttribute || attribute == item[this._keyAttribute]);
	},

	containsValue: function(/* item */ item,
							/* attribute-name-string */ attribute,
							/* anything */ value){
		// summary:
		//		See dojo/data/api/Read.containsValue()
		var regexp = undefined;
		if(typeof value === "string"){
			regexp = filterUtil.patternToRegExp(value, false);
		}
		return this._containsValue(item, attribute, value, regexp); //boolean.
	},

	_containsValue: function(	/* item */ item,
								/* attribute|attribute-name-string */ attribute,
								/* anything */ value,
								/* RegExp?*/ regexp){
		// summary:
		//		Internal function for looking at the values contained by the item.
		// description:
		//		Internal function for looking at the values contained by the item.  This
		//		function allows for denoting if the comparison should be case sensitive for
		//		strings or not (for handling filtering cases where string case should not matter)
		// item:
		//		The data item to examine for attribute values.
		// attribute:
		//		The attribute to inspect.
		// value:
		//		The value to match.
		// regexp:
		//		Optional regular expression generated off value if value was of string type to handle wildcarding.
		//		If present and attribute values are string, then it can be used for comparison instead of 'value'
		var values = this.getValues(item, attribute);
		for(var i = 0; i < values.length; ++i){
			var possibleValue = values[i];
			if(typeof possibleValue === "string" && regexp){
				return (possibleValue.match(regexp) !== null);
			}else{
				//Non-string matching.
				if(value === possibleValue){
					return true; // Boolean
				}
			}
		}
		return false; // Boolean
	},

	isItem: function(/* anything */ something){
		// summary:
		//		See dojo/data/api/Read.isItem()
		if(something && something[this._storeProp] === this){
			return true; //Boolean
		}
		return false; //Boolean
	},

	isItemLoaded: function(/* anything */ something){
		// summary:
		//		See dojo/data/api/Read.isItemLoaded()
		//		The KeyValueStore always loads all items, so if it's an item, then it's loaded.
		return this.isItem(something); //Boolean
	},

	loadItem: function(/* object */ keywordArgs){
		// summary:
		//		See dojo/data/api/Read.loadItem()
		// description:
		//		The KeyValueStore always loads all items, so if it's an item, then it's loaded.
		//
		//		From the dojo/data/api/Read.loadItem docs:
		//
		//			If a call to isItemLoaded() returns true before loadItem() is even called,
		//			then loadItem() need not do any work at all and will not even invoke
		//			the callback handlers.
	},

	getFeatures: function(){
		// summary:
		//		See dojo/data/api/Read.getFeatures()
		return this._features; //Object
	},

	close: function(/*dojo/data/api/Request|Object?*/ request){
		// summary:
		//		See dojo/data/api/Read.close()
	},

	getLabel: function(/* item */ item){
		// summary:
		//		See dojo/data/api/Read.getLabel()
		return item[this._keyAttribute];
	},

	getLabelAttributes: function(/* item */ item){
		// summary:
		//		See dojo/data/api/Read.getLabelAttributes()
		return [this._keyAttribute];
	},
	
	// The dojo/data/api/Read.fetch() function is implemented as
	// a mixin from dojo.data.util.simpleFetch.
	// That mixin requires us to define _fetchItems().
	_fetchItems: function(	/* Object */ keywordArgs,
							/* Function */ findCallback,
							/* Function */ errorCallback){
		// summary:
		//		See dojo.data.util.simpleFetch.fetch()
		
		var self = this;

		var filter = function(requestArgs, arrayOfAllItems){
			var items = null;
			if(requestArgs.query){
				items = [];
				var ignoreCase = requestArgs.queryOptions ? requestArgs.queryOptions.ignoreCase : false;

				//See if there are any string values that can be regexp parsed first to avoid multiple regexp gens on the
				//same value for each item examined.  Much more efficient.
				var regexpList = {};
				for(var key in requestArgs.query){
					var value = requestArgs.query[key];
					if(typeof value === "string"){
						regexpList[key] = filterUtil.patternToRegExp(value, ignoreCase);
					}
				}

				for(var i = 0; i < arrayOfAllItems.length; ++i){
					var match = true;
					var candidateItem = arrayOfAllItems[i];
					for(var key in requestArgs.query){
						var value = requestArgs.query[key];
						if(!self._containsValue(candidateItem, key, value, regexpList[key])){
							match = false;
						}
					}
					if(match){
						items.push(candidateItem);
					}
				}
			}else if(requestArgs.identity){
				items = [];
				var item;
				for(var key in arrayOfAllItems){
					item = arrayOfAllItems[key];
					if(item[self._keyAttribute] == requestArgs.identity){
						items.push(item);
						break;
					}
				}
			}else{
				// We want a copy to pass back in case the parent wishes to sort the array.  We shouldn't allow resort
				// of the internal list so that multiple callers can get lists and sort without affecting each other.
				if(arrayOfAllItems.length> 0){
					items = arrayOfAllItems.slice(0,arrayOfAllItems.length);
				}
			}
			findCallback(items, requestArgs);
		};

		if(this._loadFinished){
			filter(keywordArgs, this._arrayOfAllItems);
		}else{
			if(this.url !== ""){
				//If fetches come in before the loading has finished, but while
				//a load is in progress, we have to defer the fetching to be
				//invoked in the callback.
				if(this._loadInProgress){
					this._queuedFetches.push({args: keywordArgs, filter: filter});
				}else{
					this._loadInProgress = true;
					var getArgs = {
							url: self.url,
							handleAs: "json-comment-filtered",
							preventCache: this.urlPreventCache
						};
					var getHandler = xhr.get(getArgs);
					getHandler.addCallback(function(data){
						self._processData(data);
						filter(keywordArgs, self._arrayOfAllItems);
						self._handleQueuedFetches();
					});
					getHandler.addErrback(function(error){
						self._loadInProgress = false;
						throw error;
					});
				}
			}else if(this._keyValueString){
				this._processData(eval(this._keyValueString));
				this._keyValueString = null;
				filter(keywordArgs, this._arrayOfAllItems);
			}else if(this._keyValueVar){
				this._processData(this._keyValueVar);
				this._keyValueVar = null;
				filter(keywordArgs, this._arrayOfAllItems);
			}else{
				throw new Error("dojox.data.KeyValueStore: No source data was provided as either URL, String, or Javascript variable data input.");
			}
		}
		
	},

	_handleQueuedFetches: function(){
		// summary:
		//		Internal function to execute delayed request in the store.
		
		//Execute any deferred fetches now.
		if(this._queuedFetches.length > 0){
			for(var i = 0; i < this._queuedFetches.length; i++){
				var fData = this._queuedFetches[i];
				var delayedFilter = fData.filter;
				var delayedQuery = fData.args;
				if(delayedFilter){
					delayedFilter(delayedQuery, this._arrayOfAllItems);
				}else{
					this.fetchItemByIdentity(fData.args);
				}
			}
			this._queuedFetches = [];
		}
	},
	
	_processData: function(/* Array */ data){
		this._arrayOfAllItems = [];
		for(var i=0; i<data.length; i++){
			this._arrayOfAllItems.push(this._createItem(data[i]));
		}
		this._loadFinished = true;
		this._loadInProgress = false;
	},
	
	_createItem: function(/* Object */ something){
		var item = {};
		item[this._storeProp] = this;
		for(var i in something){
			item[this._keyAttribute] = i;
			item[this._valueAttribute] = something[i];
			break;
		}
		return item; //Object
	},

/***************************************
     dojo/data/api/Identity API
***************************************/
	getIdentity: function(/* item */ item){
		// summary:
		//		See dojo/data/api/Identity.getIdentity()
		if(this.isItem(item)){
			return item[this._keyAttribute]; //String
		}
		return null; //null
	},

	getIdentityAttributes: function(/* item */ item){
		// summary:
		//		See dojo/data/api/Identity.getIdentifierAttributes()
		return [this._keyAttribute];
	},

	fetchItemByIdentity: function(/* object */ keywordArgs){
		// summary:
		//		See dojo/data/api/Identity.fetchItemByIdentity()
		keywordArgs.oldOnItem = keywordArgs.onItem;
		keywordArgs.onItem = null;
		keywordArgs.onComplete = this._finishFetchItemByIdentity ;
		this.fetch(keywordArgs);
	},
	
	_finishFetchItemByIdentity: function(/* Array */ items, /* object */ request){
		var scope = request.scope || kernel.global;
		if(items.length){
			request.oldOnItem.call(scope, items[0]);
		}else{
			request.oldOnItem.call(scope, null);
		}
	}
});
//Mix in the simple fetch implementation to this class.
lang.extend(KeyValueStore,simpleFetch);
return KeyValueStore;
});
