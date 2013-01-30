define(["dojo/_base/declare", "dojo/_base/lang", "dojo/_base/kernel", "dojo/_base/json", "dojo/_base/xhr"],
  function(declare, lang, kernel, jsonUtil, xhr) {

return declare("dojox.data.FileStore", null, {
	constructor: function(/*Object*/args){
		// summary:
		//		A simple store that provides a datastore interface to a filesystem.
		// description:
		//		A simple store that provides a datastore interface to a filesystem.  It takes a few parameters
		//		for initialization:
		//
		//		- url:	The URL of the service which provides the file store serverside implementation.
		//		- label:	The attribute of the file to use as the human-readable text.  Default is 'name'.
		//
		//		The purpose of this store is to represent a file as a datastore item.  The
		//		datastore item by default has the following attributes that can be examined on it.
		//
		//		- directory:	Boolean indicating if the file item represents a directory.
		//		- name:	The filename with no path informatiom.
		//		- path:	The file complete file path including name, relative to the location the
		//			file service scans from
		//		- size:	The size of the file, in bytes.
		//		- parentDir:	The parent directory path.
		//		- children:	Any child files contained by a directory file item.
		//
		//		Note that the store's server call pattern is RESTlike.
		//
		//		The store also supports the passing of configurable options to the back end service, such as
		//		expanding all child files (no lazy load), displaying hidden files, displaying only directories, and so on.
		//		These are defined through a comma-separated list in declarative, or through setting the options array in programmatic.
		//		example:	options="expand,dirsOnly,showHiddenFiles"
		if(args && args.label){
			this.label = args.label;
		}
		if(args && args.url){
			this.url = args.url;
		}
		if(args && args.options){
			if(lang.isArray(args.options)){
				this.options = args.options;
			}else{
				if(lang.isString(args.options)){
					this.options = args.options.split(",");
				}
			}
		}
		if(args && args.pathAsQueryParam){
			this.pathAsQueryParam = true;
		}
		if(args && "urlPreventCache" in args){
			this.urlPreventCache = args.urlPreventCache?true:false;
		}
	},

	// url: [public] string
	//		The URL to the file path service.
	url: "",
	
	// _storeRef: [private] string
	//		Internal variable used to denote an item came from this store instance.
	_storeRef: "_S",

	// label: [public] string
	//		Default attribute to use to represent the item as a user-readable
	//		string.  Public, so users can change it.
	label: "name",

	// _identifier: [private] string
	//		Default attribute to use to represent the item's identifier.
	//		Path should always be unique in the store instance.
	_identifier: "path",

	// _attributes: [private] string
	//		Internal variable of attributes all file items should have.
	_attributes: ["children", "directory", "name", "path", "modified", "size", "parentDir"],
	
	// pathSeparator: [public] string
	//		The path separator to use when chaining requests for children
	//		Can be overriden by the server on initial load
	pathSeparator: "/",

	// options: [public] array
	//		Array of options to always send when doing requests.
	//		Back end service controls this, like 'dirsOnly', 'showHiddenFiles', 'expandChildren', etc.
	options: [],

	// failOk: [public] boolean
	//		Flag to pass on to xhr functions to check if we are OK to fail the call silently
	failOk: false,

	// urlPreventCache: [public] string
	//		Flag to dennote if preventCache should be passed to xhrGet.
	urlPreventCache: true,

	_assertIsItem: function(/* item */ item){
		// summary:
		//		This function tests whether the item passed in is indeed an item in the store.
		// item:
		//		The item to test for being contained by the store.
		if(!this.isItem(item)){
			throw new Error("dojox.data.FileStore: a function was passed an item argument that was not an item");
		}
	},

	_assertIsAttribute: function(/* attribute-name-string */ attribute){
		// summary:
		//		This function tests whether the item passed in is indeed a valid 'attribute' like type for the store.
		// attribute:
		//		The attribute to test for being contained by the store.
		if(typeof attribute !== "string"){
			throw new Error("dojox.data.FileStore: a function was passed an attribute argument that was not an attribute name string");
		}
	},

	pathAsQueryParam: false, //Function to switch between REST style URL lookups and passing the path to specific items as a query param: 'path'.

	getFeatures: function(){
		// summary:
		//		See dojo/data/api/Read.getFeatures()
		return {
			'dojo.data.api.Read': true, 'dojo.data.api.Identity':true
		};
	},

	getValue: function(item, attribute, defaultValue){
		// summary:
		//		See dojo/data/api/Read.getValue()
		var values = this.getValues(item, attribute);
		if(values && values.length > 0){
			return values[0];
		}
		return defaultValue;
	},

	getAttributes: function(item){
		// summary:
		//		See dojo/data/api/Read.getAttributes()
		return this._attributes;
	},

	hasAttribute: function(item, attribute){
		// summary:
		//		See dojo/data/api/Read.hasAttribute()
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		return (attribute in item);
	},
	
	getIdentity: function(/* item */ item){
		// summary:
		//		See dojo/data/api/Identity.getIdentity()
		return this.getValue(item, this._identifier);
	},
	
	getIdentityAttributes: function(item){
		// summary:
		//		See dojo/data/api/Read.getLabelAttributes()
		return [this._identifier];
	},


	isItemLoaded: function(item){
		// summary:
		//		See dojo/data/api/Read.isItemLoaded()
		var loaded = this.isItem(item);
		if(loaded && typeof item._loaded == "boolean" && !item._loaded){
			loaded = false;
		}
		return loaded;
	},

	loadItem: function(keywordArgs){
		// summary:
		//		See dojo/data/api/Read.loadItem()
		var item = keywordArgs.item;
		var self = this;
		var scope = keywordArgs.scope || kernel.global;

		var content = {};

		if(this.options.length > 0){
			content.options = jsonUtil.toJson(this.options);
		}

		if(this.pathAsQueryParam){
			content.path = item.parentPath + this.pathSeparator + item.name;
		}
		var xhrData = {
			url: this.pathAsQueryParam? this.url : this.url + "/" + item.parentPath + "/" + item.name,
			handleAs: "json-comment-optional",
			content: content,
			preventCache: this.urlPreventCache,
			failOk: this.failOk
		};

		var deferred = xhr.get(xhrData);
		deferred.addErrback(function(error){
				if(keywordArgs.onError){
					keywordArgs.onError.call(scope, error);
				}
		});
		
		deferred.addCallback(function(data){
			delete item.parentPath;
			delete item._loaded;
			lang.mixin(item, data);
			self._processItem(item);
			if(keywordArgs.onItem){
				keywordArgs.onItem.call(scope, item);
			}
		});
	},

	getLabel: function(item){
		// summary:
		//		See dojo/data/api/Read.getLabel()
		return this.getValue(item,this.label);
	},
	
	getLabelAttributes: function(item){
		// summary:
		//		See dojo/data/api/Read.getLabelAttributes()
		return [this.label];
	},
	
	containsValue: function(item, attribute, value){
		// summary:
		//		See dojo/data/api/Read.containsValue()
		var values = this.getValues(item,attribute);
		for(var i = 0; i < values.length; i++){
			if(values[i] == value){
				return true;
			}
		}
		return false;
	},

	getValues: function(item, attribute){
		// summary:
		//		See dojo/data/api/Read.getValue()
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		
		var value = item[attribute];
		if(typeof value !== "undefined" && !lang.isArray(value)){
			value = [value];
		}else if(typeof value === "undefined"){
			value = [];
		}
		return value;
	},

	isItem: function(item){
		// summary:
		//		See dojo/data/api/Read.isItem()
		if(item && item[this._storeRef] === this){
			return true;
		}
		return false;
	},
	
	close: function(request){
		// summary:
		//		See dojo/data/api/Read.close()
	},

	fetch: function(request){
		// summary:
		//		Fetch  items that match to a query
		// request:
		//		A request object

		request = request || {};
		if(!request.store){
			request.store = this;
		}
		var self = this;
		var scope = request.scope || kernel.global;

		//Generate what will be sent over.
		var reqParams = {};
		if(request.query){
			reqParams.query = jsonUtil.toJson(request.query);
		}

		if(request.sort){
			reqParams.sort = jsonUtil.toJson(request.sort);
		}

		if(request.queryOptions){
			reqParams.queryOptions = jsonUtil.toJson(request.queryOptions);
		}

		if(typeof request.start == "number"){
			reqParams.start = "" + request.start;
		}
		if(typeof request.count == "number"){
			reqParams.count = "" + request.count;
		}

		if(this.options.length > 0){
			reqParams.options = jsonUtil.toJson(this.options);
		}

		var getArgs = {
			url: this.url,
			preventCache: this.urlPreventCache,
			failOk: this.failOk,
			handleAs: "json-comment-optional",
			content: reqParams
		};


		var deferred = xhr.get(getArgs);

		deferred.addCallback(function(data){self._processResult(data, request);});
		deferred.addErrback(function(error){
			if(request.onError){
				request.onError.call(scope, error, request);
			}
		});
	},

	fetchItemByIdentity: function(keywordArgs){
		// summary:
		//		See dojo/data/api/Read.loadItem()
		var path = keywordArgs.identity;
		var self = this;
		var scope = keywordArgs.scope || kernel.global;

		var content = {};

		if(this.options.length > 0){
			content.options = jsonUtil.toJson(this.options);
		}

		if(this.pathAsQueryParam){
			content.path = path;
		}
		var xhrData = {
			url: this.pathAsQueryParam? this.url : this.url + "/" + path,
			handleAs: "json-comment-optional",
			content: content,
			preventCache: this.urlPreventCache,
			failOk: this.failOk
		};

		var deferred = xhr.get(xhrData);
		deferred.addErrback(function(error){
				if(keywordArgs.onError){
					keywordArgs.onError.call(scope, error);
				}
		});
		
		deferred.addCallback(function(data){
			var item = self._processItem(data);
			if(keywordArgs.onItem){
				keywordArgs.onItem.call(scope, item);
			}
		});
	},

	_processResult: function(data, request){
		var scope = request.scope || kernel.global;
		try{
			//If the data contains a path separator, set ours
			if(data.pathSeparator){
				this.pathSeparator = data.pathSeparator;
			}
			//Invoke the onBegin handler, if any, to return the
			//size of the dataset as indicated by the service.
			if(request.onBegin){
				request.onBegin.call(scope, data.total, request);
			}
			//Now process all the returned items thro
			var items = this._processItemArray(data.items);
			if(request.onItem){
				var i;
				for(i = 0; i < items.length; i++){
					request.onItem.call(scope, items[i], request);
				}
				items = null;
			}
			if(request.onComplete){
				request.onComplete.call(scope, items, request);
			}
		}catch (e){
			if(request.onError){
				request.onError.call(scope, e, request);
			}else{
				console.log(e);
			}
		}
	},
	
	_processItemArray: function(itemArray){
		// summary:
		//		Internal function for processing an array of items for return.
		var i;
		for(i = 0; i < itemArray.length; i++){
			this._processItem(itemArray[i]);
		}
		return itemArray;
	},
	
	_processItem: function(item){
		// summary:
		//		Internal function for processing an item returned from the store.
		//		It sets up the store ref as well as sets up the attributes necessary
		//		to invoke a lazy load on a child, if there are any.
		if(!item){return null;}
		item[this._storeRef] = this;
		if(item.children && item.directory){
			if(lang.isArray(item.children)){
				var children = item.children;
				var i;
				for(i = 0; i < children.length; i++ ){
					var name = children[i];
					if(lang.isObject(name)){
						children[i] = this._processItem(name);
					}else{
						children[i] = {name: name, _loaded: false, parentPath: item.path};
						children[i][this._storeRef] = this;
					}
				}
			}else{
				delete item.children;
			}
		}
		return item;
	}
});
});
