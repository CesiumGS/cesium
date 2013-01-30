define(["dojo", "dojox", "dojo/data/util/sorter"], function(dojo, dojox) {

dojox.data.ASYNC_MODE = 0;
dojox.data.SYNC_MODE = 1;

dojo.declare("dojox.data.CdfStore", null, {
	// summary:
	//		IMPORTANT: The CDF Store is designed to work with Tibco GI, and references Tibco's
	//		JSX3 JavaScript library and will not work without it.
	//
	//		The CDF Store implements dojo.data.Read, Write, and Identity api's.  It is a local
	//		(in memory) store that handles XML documents formatted according to the
	//		Common Data Format (CDF) spec:
	//		http://www.tibco.com/devnet/resources/gi/3_1/tips_and_techniques/CommonDataFormatCDF.pdf
	//
	//		The purpose of this store is to provide a glue between a jsx3 CDF file and a Dijit.
	//
	//		While a CDF document is an XML file, other than the initial input, all data returned
	//		from and written to this store should be in object format.

	// identity: [const] String
	//		The unique identifier for each item. Defaults to "jsxid" which is standard for a CDF
	//		document. Should not be changed.
	identity: "jsxid",

	// url : String
	//		The location from which to fetch the XML (CDF) document.
	url: "",

	// xmlStr: String
	//		A string that can be parsed into an XML document and should be formatted according
	//		to the CDF spec.
	// example:
	//		|	'<data jsxid="jsxroot"><record jsxtext="A"/><record jsxtext="B" jsxid="2" jsxid="2"/></data>'
	xmlStr:"",

	// data:	Object
	//		A object that will be converted into the xmlStr property, and then parsed into a CDF.
	data:null,

	// label:	String
	//		The property within each item used to define the item.
	label: "",

	//	mode [const]: dojox.data.ASYNC_MODE|dojox.data.SYNC_MODE
	//		This store supports synchronous fetches if this property is set to dojox.data.SYNC_MODE.
	mode:dojox.data.ASYNC_MODE,
	
	constructor: function(/* Object */ args){
		// summary:
		//	Constructor for the CDF store. Instantiate a new CdfStore.
		if(args){
			this.url = args.url;
			this.xmlStr = args.xmlStr || args.str;
			if(args.data){
				this.xmlStr = this._makeXmlString(args.data);
			}
			this.identity = args.identity || this.identity;
			this.label = args.label || this.label;
			this.mode = args.mode !== undefined ? args.mode : this.mode;
		}
		this._modifiedItems = {};
		
		this.byId = this.fetchItemByIdentity;
	},
	
	/* dojo/data/api/Read */

	getValue: function(/* jsx3.xml.Entity */ item, /* String */ property, /* value? */ defaultValue){
		// summary:
		//		Return an property value of an item

		return item.getAttribute(property) || defaultValue; // anything
	},

	getValues: function(/* jsx3.xml.Entity */ item, /* String */ property){
		// summary:
		//		Return an array of values

		//	TODO!!! Can't find an example of an array in any CDF files
		var v = this.getValue(item, property, []);
		return dojo.isArray(v) ? v : [v];
	},

	getAttributes: function(/* jsx3.xml.Entity */ item){
		// summary:
		//		Return an array of property names

		return item.getAttributeNames(); // Array
	},

	hasAttribute: function(/* jsx3.xml.Entity */ item, /* String */ property){
		// summary:
		//		Check whether an item has a property

		return (this.getValue(item, property) !== undefined); // Boolean
	},
	
	hasProperty: function(/* jsx3.xml.Entity */ item, /* String */ property){
		// summary:
		//	Alias for hasAttribute
		return this.hasAttribute(item, property);
	},
	
	containsValue: function(/* jsx3.xml.Entity */ item, /* String */ property, /* anything */ value){
		// summary:
		//		Check whether an item contains a value

		var values = this.getValues(item, property);
		for(var i = 0; i < values.length; i++){
			if(values[i] === null){ continue; }
			if((typeof value === "string")){
				if(values[i].toString && values[i].toString() === value){
					return true;
				}
			}else if(values[i] === value){
				return true; //boolean
			}
		}
		return false;//boolean
	},

	isItem: function(/* anything */ something){
		// summary:
		//		Check whether the object is an item (jsx3.xml.Entity)

		if(something.getClass && something.getClass().equals(jsx3.xml.Entity.jsxclass)){
			return true; //boolean
		}
		return false; //boolran
	},

	isItemLoaded: function(/* anything */ something){
		// summary:
		//		Check whether the object is a jsx3.xml.Entity object and loaded

		return this.isItem(something); // Boolean
	},

	loadItem: function(/* object */ keywordArgs){
		// summary:
		//		Load an item
		// description:
		//		The store always loads all items, so if it's an item, then it's loaded.
	},

	getFeatures: function(){
		// summary:
		//		Return supported data APIs

		return {
			"dojo.data.api.Read": true,
			"dojo.data.api.Write": true,
			"dojo.data.api.Identity":true
		}; // Object
	},

	getLabel: function(/* jsx3.xml.Entity */ item){
		// summary:
		//		See dojo/data/api/Read.getLabel()

		if((this.label !== "") && this.isItem(item)){
			var label = this.getValue(item,this.label);
			if(label){
				return label.toString();
			}
		}
		return undefined; //undefined
	},

	getLabelAttributes: function(/* jsx3.xml.Entity */ item){
		// summary:
		//		returns an array of what properties of the item that were used
		//		to generate its label
		//		See dojo/data/api/Read.getLabelAttributes()

		if(this.label !== ""){
			return [this.label]; //array
		}
		return null; //null
	},

	
	fetch: function(/* Object? */ request){
		// summary:
		//		Returns an Array of items based on the request arguments.
		// description:
		//		Returns an Array of items based on the request arguments.
		//		If the store is in ASYNC mode, the items should be expected in an onComplete
		//		method passed in the request object. If store is in SYNC mode, the items will
		//		be return directly as well as within the onComplete method.
		//
		//		note:
		//		The mode can be set on store initialization or during a fetch as one of the
		//		parameters.
		//
		//		See:
		//
		//		- http://www.tibco.com/devnet/resources/gi/3_7/api/html/jsx3/xml/Entity.html#method:selectNodes
		//		- http://www.w3.org/TR/xpath
		//		- http://msdn.microsoft.com/en-us/library/ms256086.aspx
		//
		//		See dojo.data.Read.fetch():
		//
		//		- onBegin
		//		- onComplete
		//		- onItem
		//		- onError
		//		- scope
		//		- start
		//		- count
		//		- sort
		// request: String
		//		The items in the store are treated as objects, but this is reading an XML
		//		document. Further, the actual querying of the items takes place in Tibco GI's
		//		jsx3.xml.Entity. Therefore, we are using their syntax which is xpath.
		//
		//		Note:
		//		As conforming to a CDF document, most, if not all nodes are considered "records"
		//		and their tagNames are as such. The root node is named "data".
		// example:
		//		All items:
		//		|	store.fetch({query:"*"});
		// example:
		//		Item with a jsxid attribute equal to "1" (note you could use byId for this)
		//		|	store.fetch({query:"//record[@jsxid='1']"});
		// example:
		//		All items with any jsxid attribute:
		//		|	"//record[@jsxid='*']"
		// example:
		//		The items with a jsxid of '1' or '4':
		//		|	"//record[@jsxid='4' or @jsxid='1']"
		// example:
		//		All children within a "group" node (could be multiple group nodes):
		//		"//group/record"
		// example:
		//		All children within a specific group node:
		//		"//group[@name='mySecondGroup']/record"
		// example:
		//		Any record, anywhere in the document:
		//		|	"//record"
		//		Only the records beneath the root (data) node:
		//		|	"//data/record"

		request = request || {};
		if(!request.store){
			request.store = this;
		}
		if(request.mode !== undefined){
			this.mode = request.mode;
		}
		var self = this;
	
		var errorHandler = function(errorData){
			if(request.onError){
				var scope = request.scope || dojo.global;
				request.onError.call(scope, errorData, request);
			}else{
				console.error("cdfStore Error:", errorData);
			}
		};
	
		var fetchHandler = function(items, requestObject){
			requestObject = requestObject || request;
			var oldAbortFunction = requestObject.abort || null;
			var aborted = false;
	
			var startIndex = requestObject.start?requestObject.start:0;
			var endIndex = (requestObject.count && (requestObject.count !== Infinity))?(startIndex + requestObject.count):items.length;
	
			requestObject.abort = function(){
				aborted = true;
				if(oldAbortFunction){
					oldAbortFunction.call(requestObject);
				}
			};
	
			var scope = requestObject.scope || dojo.global;
			if(!requestObject.store){
				requestObject.store = self;
			}
			if(requestObject.onBegin){
				requestObject.onBegin.call(scope, items.length, requestObject);
			}
			if(requestObject.sort){
				items.sort(dojo.data.util.sorter.createSortFunction(requestObject.sort, self));
			}
			
			if(requestObject.onItem){
				for(var i = startIndex; (i < items.length) && (i < endIndex); ++i){
					var item = items[i];
					if(!aborted){
						requestObject.onItem.call(scope, item, requestObject);
					}
				}
			}
			if(requestObject.onComplete && !aborted){
				if(!requestObject.onItem){
					items = items.slice(startIndex, endIndex);
					if(requestObject.byId){
						items = items[0];
					}
				}
				requestObject.onComplete.call(scope, items, requestObject);
			}else{
				items = items.slice(startIndex, endIndex);
				if(requestObject.byId){
					items = items[0];
				}
			}
			return items;
		};
		
		if(!this.url && !this.data && !this.xmlStr){
			errorHandler(new Error("No URL or data specified."));
			return false;
		}
		var localRequest = request || "*"; // use request for _getItems()
		
		if(this.mode == dojox.data.SYNC_MODE){
			// sync mode. items returned directly
			var res = this._loadCDF();
			if(res instanceof Error){
				if(request.onError){
					request.onError.call(request.scope || dojo.global, res, request);
				}else{
					console.error("CdfStore Error:", res);
				}
				return res;
			}
			this.cdfDoc = res;
			
			var items = this._getItems(this.cdfDoc, localRequest);
			if(items && items.length > 0){
				items = fetchHandler(items, request);
			}else{
				items = fetchHandler([], request);
			}
			return items;
		
		}else{
			
			// async mode. Return a Deferred.
			var dfd = this._loadCDF();
			dfd.addCallbacks(dojo.hitch(this, function(cdfDoc){
				var items = this._getItems(this.cdfDoc, localRequest);
				if(items && items.length > 0){
					fetchHandler(items, request);
				}else{
					fetchHandler([], request);
				}
			}),
			dojo.hitch(this, function(err){
				errorHandler(err, request);
			}));
			
			return dfd;	// Object
		}
	},

	
	_loadCDF: function(){
		// summary:
		//		Internal method.
		//		If a cdfDoc exists, return it. Otherwise, get one from JSX3,
		//		load the data or url, and return the doc or a deferred.
		var dfd = new dojo.Deferred();
		if(this.cdfDoc){
			if(this.mode == dojox.data.SYNC_MODE){
				return this.cdfDoc; // jsx3.xml.CDF
			}else{
				setTimeout(dojo.hitch(this, function(){
					dfd.callback(this.cdfDoc);
				}), 0);
				return dfd; // dojo.Deferred
			}
		}
		
		this.cdfDoc = jsx3.xml.CDF.Document.newDocument();
		this.cdfDoc.subscribe("response", this, function(evt){
			dfd.callback(this.cdfDoc);
		});
		this.cdfDoc.subscribe("error", this, function(err){
			dfd.errback(err);
		});
		
		this.cdfDoc.setAsync(!this.mode);
		if(this.url){
			this.cdfDoc.load(this.url);
		}else if(this.xmlStr){
			this.cdfDoc.loadXML(this.xmlStr);
			if(this.cdfDoc.getError().code){
				return new Error(this.cdfDoc.getError().description); // Error
			}
		}
		
		if(this.mode == dojox.data.SYNC_MODE){
			return this.cdfDoc; // jsx3.xml.CDF
		}else{
			return dfd;			// dojo.Deferred
		}
	},
	
	_getItems: function(/* jsx3.xml.Entity */cdfDoc, /* Object */request){
		// summary:
		//		Internal method.
		//		Requests the items from jsx3.xml.Entity with an xpath query.

		var itr = cdfDoc.selectNodes(request.query, false, 1);
		var items = [];
		while(itr.hasNext()){
			items.push(itr.next());
		}
		return items;
	},

	close: function(/*dojo/data/api/Request|Object?*/ request){
		// summary:
		//		See dojo/data/api/Read.close()
	},

/* dojo/data/api/Write */

	newItem: function(/* object? */ keywordArgs, /* Object|String? */ parentInfo){
		// summary:
		//		Creates a jsx3.xml.Entity item and inserts it either inside the
		//		parent or appends it to the root

		keywordArgs = (keywordArgs || {});
		if(keywordArgs.tagName){
			// record tagName is automatic and this would add it
			// as a property
			if(keywordArgs.tagName!="record"){
				// TODO: How about some sort of group?
				console.warn("Only record inserts are supported at this time");
			}
			delete keywordArgs.tagName;
		}
		keywordArgs.jsxid = keywordArgs.jsxid || this.cdfDoc.getKey();
		if(this.isItem(parentInfo)){
			parentInfo = this.getIdentity(parentInfo);
		}
		var item = this.cdfDoc.insertRecord(keywordArgs, parentInfo);

		this._makeDirty(item);
		
		return item; // jsx3.xml.Entity
	},
	
	deleteItem: function(/* jsx3.xml.Entity */ item){
		// summary:
		//		Delete an jsx3.xml.Entity (wrapper to a XML element).

		this.cdfDoc.deleteRecord(this.getIdentity(item));
		this._makeDirty(item);
		return true; //boolean
	},
	
	setValue: function(/* jsx3.xml.Entity */ item, /* String */ property, /* almost anything */ value){
		// summary:
		//		Set an property value

		this._makeDirty(item);
		item.setAttribute(property, value);
		return true; // Boolean
	},
		
	setValues: function(/* jsx3.xml.Entity */ item, /* String */ property, /*array*/ values){
		// summary:
		//		Set property values.

		//		TODO: Needs to be fully implemented.

		this._makeDirty(item);
		console.warn("cdfStore.setValues only partially implemented.");
		return item.setAttribute(property, values);
		
	},
	
	unsetAttribute: function(/* jsx3.xml.Entity */ item, /* String */ property){
		// summary:
		//		Remove an property

		this._makeDirty(item);
		item.removeAttribute(property);
		return true; // Boolean
	},
	
	revert: function(){
		// summary:
		//		Invalidate changes (new and/or modified elements)
		//		Resets data by simply deleting the reference to the cdfDoc.
		//		Subsequent fetches will load the new data.
		//
		//		Note:
		//		Any items outside the store will no longer be valid and may cause errors.

		delete this.cdfDoc;
		this._modifiedItems = {};
		return true; //boolean
	},
	
	isDirty: function(/* jsx3.xml.Entity ? */ item){
		// summary:
		//		Check whether an item is new, modified or deleted.
		//		If no item is passed, checks if anything in the store has changed.

		if(item){
			return !!this._modifiedItems[this.getIdentity(item)]; // Boolean
		}else{
			var _dirty = false;
			for(var nm in this._modifiedItems){ _dirty = true; break; }
			return _dirty; // Boolean
		}
	},

	

/* internal API */

	_makeDirty: function(item){
		// summary:
		//		Internal method.
		//		Marks items as modified, deleted or new.
		var id = this.getIdentity(item);
		this._modifiedItems[id] = item;
	},
	
	
	_makeXmlString: function(obj){
		// summary:
		//		Internal method.
		//		Converts an object into an XML string.

		var parseObj = function(obj, name){
			var xmlStr = "";
			var nm;
			if(dojo.isArray(obj)){
				for(var i=0;i<obj.length;i++){
					xmlStr += parseObj(obj[i], name);
				}
			}else if(dojo.isObject(obj)){
				xmlStr += '<'+name+' ';
				for(nm in obj){
					if(!dojo.isObject(obj[nm])){
						xmlStr += nm+'="'+obj[nm]+'" ';
					}
				}
				xmlStr +='>';
				for(nm in obj){
					if(dojo.isObject(obj[nm])){
						xmlStr += parseObj(obj[nm], nm);
					}
				}
				xmlStr += '</'+name+'>';
			}
			return xmlStr;
		};
		return parseObj(obj, "data");
	},

	/*************************************
	 * Dojo.data Identity implementation *
	 *************************************/
	getIdentity: function(/* jsx3.xml.Entity */ item){
		// summary:
		//		Returns the identifier for an item.

		return this.getValue(item, this.identity); // String
	},

	getIdentityAttributes: function(/* jsx3.xml.Entity */ item){
		// summary:
		//		Returns the property used for the identity.

		return [this.identity]; // Array
	},


	fetchItemByIdentity: function(/* Object|String */ args){
		// summary:
		//		See dojo/data/api/Identity.fetchItemByIdentity(keywordArgs).
		//
		//		Note:
		//		This method can be synchronous if mode is set.
		//		Also, there is a more finger friendly alias of this method, byId();
		if(dojo.isString(args)){
			var id = args;
			args = {query:"//record[@jsxid='"+id+"']", mode: dojox.data.SYNC_MODE};
		}else{
			if(args){
				args.query = "//record[@jsxid='"+args.identity+"']";
			}
			if(!args.mode){args.mode = this.mode;}
		}
		args.byId = true;
		return this.fetch(args); // dojo/_base/Deferred|Array
	},
	byId: function(/* Object|String */ args){
		// stub. See fetchItemByIdentity
	}
	
});

return dojox.data.CdfStore;
});

