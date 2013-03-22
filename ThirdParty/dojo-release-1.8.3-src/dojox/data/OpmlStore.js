define(["dojo/_base/declare", "dojo/_base/lang", "dojo/_base/xhr", "dojo/data/util/simpleFetch", "dojo/data/util/filter",
		"dojo/_base/kernel"],
  function(declare, lang, xhr, simpleFetch, filterUtil, kernel) {

var OpmlStore = declare("dojox.data.OpmlStore", null, {
	// summary:
	//		The OpmlStore implements the dojo/data/api/Read API.
	// examples:
	//	|	var opmlStore = new dojo.data.OpmlStore({url:"geography.xml"});
	//	|	var opmlStore = new dojo.data.OpmlStore({url:"http://example.com/geography.xml"});

	constructor: function(/* Object */ keywordParameters){
		// summary:
		//		constructor
		// keywordParameters:
		//		- {url: String, label: String}
		//
		//		Where label is optional and configures what should be used as the return from getLabel()
		this._xmlData = null;
		this._arrayOfTopLevelItems = [];
		this._arrayOfAllItems = [];
		this._metadataNodes = null;
		this._loadFinished = false;
		this.url = keywordParameters.url;
		this._opmlData = keywordParameters.data; // XML DOM Document
		if(keywordParameters.label){
			this.label = keywordParameters.label;
		}
		this._loadInProgress = false;	//Got to track the initial load to prevent duelling loads of the dataset.
		this._queuedFetches = [];
		this._identityMap = {};
		this._identCount = 0;
		this._idProp = "_I";
		if(keywordParameters && "urlPreventCache" in keywordParameters){
			this.urlPreventCache = keywordParameters.urlPreventCache?true:false;
		}
	},

	// label: [public] string
	//		The attribute of the Opml item to act as a label.
	label: "text",

	// url: [public] string
	//		The location from which to fetch the Opml document.
	url: "",

	// urlPreventCache: [public] boolean
	//		Flag to denote if the underlying xhrGet call should set preventCache.
	urlPreventCache: false,

	_assertIsItem: function(/* item */ item){
		if(!this.isItem(item)){
			throw new Error("dojo.data.OpmlStore: a function was passed an item argument that was not an item");
		}
	},
	
	_assertIsAttribute: function(/*dojo/data/api/Item|String */ attribute){
		// summary:
		//		This function tests whether the item passed in is indeed a valid 'attribute' like type for the store.
		// attribute:
		//		The attribute to test for being contained by the store.
		if(!lang.isString(attribute)){
			throw new Error("dojox.data.OpmlStore: a function was passed an attribute argument that was not an attribute object nor an attribute name string");
		}
	},
	
	_removeChildNodesThatAreNotElementNodes: function(/* node */ node, /* boolean */ recursive){
		var childNodes = node.childNodes;
		if(childNodes.length === 0){
			return;
		}
		var nodesToRemove = [];
		var i, childNode;
		for(i = 0; i < childNodes.length; ++i){
			childNode = childNodes[i];
			if(childNode.nodeType != 1){
				nodesToRemove.push(childNode);
			}
		}
		for(i = 0; i < nodesToRemove.length; ++i){
			childNode = nodesToRemove[i];
			node.removeChild(childNode);
		}
		if(recursive){
			for(i = 0; i < childNodes.length; ++i){
				childNode = childNodes[i];
				this._removeChildNodesThatAreNotElementNodes(childNode, recursive);
			}
		}
	},
	
	_processRawXmlTree: function(/* xmlDoc */ rawXmlTree){
		this._loadFinished = true;
		this._xmlData = rawXmlTree;
		var headNodes = rawXmlTree.getElementsByTagName('head');
		var headNode = headNodes[0];
		if(headNode){
			this._removeChildNodesThatAreNotElementNodes(headNode);
			this._metadataNodes = headNode.childNodes;
		}
		var bodyNodes = rawXmlTree.getElementsByTagName('body');
		var bodyNode = bodyNodes[0];
		if(bodyNode){
			this._removeChildNodesThatAreNotElementNodes(bodyNode, true);
			
			var bodyChildNodes = bodyNodes[0].childNodes;
			for(var i = 0; i < bodyChildNodes.length; ++i){
				var node = bodyChildNodes[i];
				if(node.tagName == 'outline'){
					this._identityMap[this._identCount] = node;
					this._identCount++;
					this._arrayOfTopLevelItems.push(node);
					this._arrayOfAllItems.push(node);
					this._checkChildNodes(node);
				}
			}
		}
	},

	_checkChildNodes: function(node /*Node*/){
		// summary:
		//		Internal function to recurse over all child nodes from the store and add them
		//		As non-toplevel items
		// description:
		//		Internal function to recurse over all child nodes from the store and add them
		//		As non-toplevel items
		// node:
		//		The child node to walk.
		if(node.firstChild){
			for(var i = 0; i < node.childNodes.length; i++){
				var child = node.childNodes[i];
				if(child.tagName == 'outline'){
					this._identityMap[this._identCount] = child;
					this._identCount++;
					this._arrayOfAllItems.push(child);
					this._checkChildNodes(child);
				}
			}
		}
	},

	_getItemsArray: function(/*object?*/queryOptions){
		// summary:
		//		Internal function to determine which list of items to search over.
		// queryOptions: The query options parameter, if any.
		if(queryOptions && queryOptions.deep){
			return this._arrayOfAllItems;
		}
		return this._arrayOfTopLevelItems;
	},

/***************************************
     dojo/data/api/Read API
***************************************/
	getValue: function( /* item */ item,
						/* attribute|attribute-name-string */ attribute,
						/* value? */ defaultValue){
		// summary:
		//		See dojo/data/api/Read.getValue()
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		if(attribute == 'children'){
			return (item.firstChild || defaultValue); //Object
		}else{
			var value = item.getAttribute(attribute);
			return (value !== undefined) ? value : defaultValue; //Object
		}
	},
	
	getValues: function(/* item */ item,
						/* attribute|attribute-name-string */ attribute){
		// summary:
		//		See dojo/data/api/Read.getValues()
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		var array = [];
		if(attribute == 'children'){
			for(var i = 0; i < item.childNodes.length; ++i){
				array.push(item.childNodes[i]);
			}
		} else if(item.getAttribute(attribute) !== null){
				array.push(item.getAttribute(attribute));
		}
		return array; // Array
	},
	
	getAttributes: function(/* item */ item){
		// summary:
		//		See dojo/data/api/Read.getAttributes()
		this._assertIsItem(item);
		var attributes = [];
		var xmlNode = item;
		var xmlAttributes = xmlNode.attributes;
		for(var i = 0; i < xmlAttributes.length; ++i){
			var xmlAttribute = xmlAttributes.item(i);
			attributes.push(xmlAttribute.nodeName);
		}
		if(xmlNode.childNodes.length > 0){
			attributes.push('children');
		}
		return attributes; //Array
	},
	
	hasAttribute: function( /* item */ item,
							/* attribute|attribute-name-string */ attribute){
		// summary:
		//		See dojo/data/api/Read.hasAttribute()
		return (this.getValues(item, attribute).length > 0); //Boolean
	},
	
	containsValue: function(/* item */ item,
							/* attribute|attribute-name-string */ attribute,
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
		// description:
		//		Four things are verified to ensure that "something" is an item:
		//		something can not be null, the nodeType must be an XML Element,
		//		the tagName must be "outline", and the node must be a member of
		//		XML document for this datastore.
		return (something &&
				something.nodeType == 1 &&
				something.tagName == 'outline' &&
				something.ownerDocument === this._xmlData); //Boolean
	},
	
	isItemLoaded: function(/* anything */ something){
		// summary:
		//		See dojo/data/api/Read.isItemLoaded().
		//		OpmlStore loads every item, so if it's an item, then it's loaded.
		return this.isItem(something); //Boolean
	},
	
	loadItem: function(/* item */ item){
		// summary:
		//		See dojo/data/api/Read.loadItem()
		// description:
		//		The OpmlStore always loads all items, so if it's an item, then it's loaded.
		//
		//		From the dojo/data/api/Read.loadItem docs:
		//
		//			If a call to isItemLoaded() returns true before loadItem() is even called,
		//			then loadItem() need not do any work at all and will not even invoke the callback handlers.
	},

	getLabel: function(/* item */ item){
		// summary:
		//		See dojo/data/api/Read.getLabel()
		if(this.isItem(item)){
			return this.getValue(item,this.label); //String
		}
		return undefined; //undefined
	},

	getLabelAttributes: function(/* item */ item){
		// summary:
		//		See dojo/data/api/Read.getLabelAttributes()
		return [this.label]; //array
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
		var filter = function(requestArgs, arrayOfItems){
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

				for(var i = 0; i < arrayOfItems.length; ++i){
					var match = true;
					var candidateItem = arrayOfItems[i];
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
			}else{
				// We want a copy to pass back in case the parent wishes to sort the array.  We shouldn't allow resort
				// of the internal list so that multiple callers can get lists and sort without affecting each other.
				if(arrayOfItems.length> 0){
					items = arrayOfItems.slice(0,arrayOfItems.length);
				}
			}
			findCallback(items, requestArgs);
		};

		if(this._loadFinished){
			filter(keywordArgs, this._getItemsArray(keywordArgs.queryOptions));
		}else{

			//If fetches come in before the loading has finished, but while
			//a load is in progress, we have to defer the fetching to be
			//invoked in the callback.
			if(this._loadInProgress){
				this._queuedFetches.push({args: keywordArgs, filter: filter});
			}else{
				if(this.url !== ""){
					this._loadInProgress = true;
					var getArgs = {
							url: self.url,
							handleAs: "xml",
							preventCache: self.urlPreventCache
						};
					var getHandler = xhr.get(getArgs);
					getHandler.addCallback(function(data){
						self._processRawXmlTree(data);
						filter(keywordArgs, self._getItemsArray(keywordArgs.queryOptions));
						self._handleQueuedFetches();
					});
					getHandler.addErrback(function(error){
						throw error;
					});
				}else if(this._opmlData){
					this._processRawXmlTree(this._opmlData);
					this._opmlData = null;
					filter(keywordArgs, this._getItemsArray(keywordArgs.queryOptions));
				}else{
					throw new Error("dojox.data.OpmlStore: No OPML source data was provided as either URL or XML data input.");
				}
			}
		}
	},
	
	getFeatures: function(){
		// summary:
		//		See dojo/data/api/Read.getFeatures()
		var features = {
			'dojo.data.api.Read': true,
			'dojo.data.api.Identity': true
		};
		return features; //Object
	},

/***************************************
     dojo/data/api/Identity API
***************************************/
	getIdentity: function(/* item */ item){
		// summary:
		//		See dojo/data/api/Identity.getIdentity()
		if(this.isItem(item)){
			//No other way to do this other than O(n) without
			//complete rework of how the tree stores nodes.
			for(var i in this._identityMap){
				if(this._identityMap[i] === item){
					return i;
				}
			}
		}
		return null; //null
	},

	fetchItemByIdentity: function(/* Object */ keywordArgs){
		// summary:
		//		See dojo/data/api/Identity.fetchItemByIdentity()

		//Hasn't loaded yet, we have to trigger the load.
		if(!this._loadFinished){
			var self = this;
			if(this.url !== ""){
				//If fetches come in before the loading has finished, but while
				//a load is in progress, we have to defer the fetching to be
				//invoked in the callback.
				if(this._loadInProgress){
					this._queuedFetches.push({args: keywordArgs});
				}else{
					this._loadInProgress = true;
					var getArgs = {
							url: self.url,
							handleAs: "xml"
						};
					var getHandler = xhr.get(getArgs);
					getHandler.addCallback(function(data){
						var scope = keywordArgs.scope ? keywordArgs.scope : kernel.global;
						try{
							self._processRawXmlTree(data);
							var item = self._identityMap[keywordArgs.identity];
							if(!self.isItem(item)){
								item = null;
							}
							if(keywordArgs.onItem){
								keywordArgs.onItem.call(scope, item);
							}
							self._handleQueuedFetches();
						}catch(error){
							if(keywordArgs.onError){
								keywordArgs.onError.call(scope, error);
							}
						}
					});
					getHandler.addErrback(function(error){
						this._loadInProgress = false;
						if(keywordArgs.onError){
							var scope = keywordArgs.scope ? keywordArgs.scope : kernel.global;
							keywordArgs.onError.call(scope, error);
						}
					});
				}
			}else if(this._opmlData){
				this._processRawXmlTree(this._opmlData);
				this._opmlData = null;
				var item = this._identityMap[keywordArgs.identity];
				if(!self.isItem(item)){
					item = null;
				}
				if(keywordArgs.onItem){
					var scope = keywordArgs.scope ? keywordArgs.scope : kernel.global;
					keywordArgs.onItem.call(scope, item);
				}
			}
		}else{
			//Already loaded.  We can just look it up and call back.
			var item = this._identityMap[keywordArgs.identity];
			if(!this.isItem(item)){
				item = null;
			}
			if(keywordArgs.onItem){
				var scope = keywordArgs.scope ? keywordArgs.scope : kernel.global;
				keywordArgs.onItem.call(scope, item);
			}
		}
	},

	getIdentityAttributes: function(/* item */ item){
		// summary:
		//		See dojo/data/api/Identity.getIdentifierAttributes()

		//Identity isn't a public attribute in the item, it's the node count.
		//So, return null.
		return null;
	},

	_handleQueuedFetches: function(){
		// summary:
		//		Internal function to execute delayed request in the store.
		
		//Execute any deferred fetches now.
		if(this._queuedFetches.length > 0){
			for(var i = 0; i < this._queuedFetches.length; i++){
				var fData = this._queuedFetches[i];
				var delayedQuery = fData.args;
				var delayedFilter = fData.filter;
				if(delayedFilter){
					delayedFilter(delayedQuery, this._getItemsArray(delayedQuery.queryOptions));
				}else{
					this.fetchItemByIdentity(delayedQuery);
				}
			}
			this._queuedFetches = [];
		}
	},

	close: function(/*dojo/data/api/Request|Object?*/ request){
		// summary:
		//		See dojo/data/api/Read.close()
	}
});
//Mix in the simple fetch implementation to this class.
lang.extend(OpmlStore, simpleFetch);

return OpmlStore;
});
	
