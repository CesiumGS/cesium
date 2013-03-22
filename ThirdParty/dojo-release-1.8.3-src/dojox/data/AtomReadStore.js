define(["dojo", "dojox", "dojo/data/util/filter", "dojo/data/util/simpleFetch", "dojo/date/stamp"], function(dojo, dojox) {
dojo.experimental("dojox.data.AtomReadStore");

dojo.declare("dojox.data.AtomReadStore", null, {
	// summary:
	//		A read only data store for Atom XML based services or documents
	// description:
	//		A data store for Atom XML based services or documents.	This store is still under development
	//		and doesn't support wildcard filtering yet.	Attribute filtering is limited to category or id.

	constructor: function(/* object */ args){
		// summary:
		//		Constructor for the AtomRead store.
		// args:
		//		An anonymous object to initialize properties.	It expects the following values:
		//
		//		- url:			The url to a service or an XML document that represents the store
		//		- unescapeHTML:	A boolean to specify whether or not to unescape HTML text
		//		- sendQuery:	A boolean indicate to add a query string to the service URL

		if(args){
			this.url = args.url;
			this.rewriteUrl = args.rewriteUrl;
			this.label = args.label || this.label;
			this.sendQuery = (args.sendQuery || args.sendquery || this.sendQuery);
			this.unescapeHTML = args.unescapeHTML;
			if("urlPreventCache" in args){
				this.urlPreventCache = args.urlPreventCache?true:false;
						}
		}
		if(!this.url){
			throw new Error("AtomReadStore: a URL must be specified when creating the data store");
		}
	},

	//Values that may be set by the parser.
	//Ergo, have to be instantiated to something
	//So the parser knows how to set them.
	url: "",

	label: "title",

	sendQuery: false,

	unescapeHTML: false,

	// urlPreventCache: Boolean
	//		Configurable preventCache option for the URL.
	urlPreventCache: false,

	/* dojo/data/api/Read */

	getValue: function(/*dojo/data/api/Item*/ item, /*attribute|attribute-name-string*/ attribute, /*anything?*/ defaultValue){
		// summary:
		//		Return an attribute value
		// description:
		//		'item' must be an instance of an object created by the AtomReadStore instance.
		//		Accepted attributes are id, subtitle, title, summary, content, author, updated,
		//		published, category, link and alternate
		// item:
		//		An item returned by a call to the 'fetch' method.
		// attribute:
		//		A attribute of the Atom Entry
		// defaultValue:
		//		A default value
		// returns:
		//		An attribute value found, otherwise 'defaultValue'
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		this._initItem(item);
		attribute = attribute.toLowerCase();
		//If the attribute has previously been retrieved, then return it
		if(!item._attribs[attribute] && !item._parsed){
			this._parseItem(item);
			item._parsed = true;
		}
		var retVal = item._attribs[attribute];

		if(!retVal && attribute == "summary"){
			var content = this.getValue(item, "content");
			var regexp = new RegExp("/(<([^>]+)>)/g", "i");
			var text = content.text.replace(regexp,"");
			retVal = {
				text: text.substring(0, Math.min(400, text.length)),
				type: "text"
			};
			item._attribs[attribute] = retVal;
		}

		if(retVal && this.unescapeHTML){
			if((attribute == "content" || attribute == "summary" || attribute == "subtitle") && !item["_"+attribute+"Escaped"]){
				retVal.text = this._unescapeHTML(retVal.text);
				item["_"+attribute+"Escaped"] = true;
			}
		}
		return retVal ? dojo.isArray(retVal) ? retVal[0]: retVal : defaultValue;
	},

	getValues: function(/*dojo/data/api/Item*/ item, /*attribute|attribute-name-string*/ attribute){
		// summary:
		//		Return an attribute value
		// description:
		//		'item' must be an instance of an object created by the AtomReadStore instance.
		//		Accepted attributes are id, subtitle, title, summary, content, author, updated,
		//		published, category, link and alternate
		// item:
		//		An item returned by a call to the 'fetch' method.
		// attribute:
		//		A attribute of the Atom Entry
		// returns:
		//		An array of values for the attribute value found, otherwise 'defaultValue'
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		this._initItem(item);
		attribute = attribute.toLowerCase();
		//If the attribute has previously been retrieved, then return it
		if(!item._attribs[attribute]){
			this._parseItem(item);
		}
		var retVal = item._attribs[attribute];
		return retVal ? ((retVal.length !== undefined && typeof(retVal) !== "string") ? retVal : [retVal]) : undefined;
	},

	getAttributes: function(/*dojo/data/api/Item*/ item){
		// summary:
		//		Return an array of attribute names
		// description:
		//		'item' must be have been created by the AtomReadStore instance.
		//		tag names of child elements and XML attribute names of attributes
		//		specified to the element are returned along with special attribute
		//		names applicable to the element including "tagName", "childNodes"
		//		if the element has child elements, "text()" if the element has
		//		child text nodes, and attribute names in '_attributeMap' that match
		//		the tag name of the element.
		// item:
		//		An XML element
		// returns:
		//		An array of attributes found
		this._assertIsItem(item);
		if(!item._attribs){
			this._initItem(item);
			this._parseItem(item);
		}
		var attrNames = [];
		for(var x in item._attribs){
			attrNames.push(x);
		}
		return attrNames; //array
	},

	hasAttribute: function(/*dojo/data/api/Item*/ item, /*attribute|attribute-name-string*/ attribute){
		// summary:
		//		Check whether an element has the attribute
		// item:
		//		'item' must be created by the AtomReadStore instance.
		// attribute:
		//		An attribute of an Atom Entry item.
		// returns:
		//		True if the element has the attribute, otherwise false
		return (this.getValue(item, attribute) !== undefined); //boolean
	},

	containsValue: function(/*dojo/data/api/Item*/ item, /*attribute|attribute-name-string*/ attribute, /* anything */ value){
		// summary:
		//		Check whether the attribute values contain the value
		// item:
		//		'item' must be an instance of a dojox.data.XmlItem from the store instance.
		// attribute:
		//		A tag name of a child element, An XML attribute name or one of
		//		special names
		// returns:
		//		True if the attribute values contain the value, otherwise false
		var values = this.getValues(item, attribute);
		for(var i = 0; i < values.length; i++){
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
		//		Check whether the object is an item (XML element)
		// item:
		//		An object to check
		// returns:
		//		True if the object is an XML element, otherwise false
		if(something && something.element && something.store && something.store === this){
			return true; //boolean
		}
		return false; //boolran
	},

	isItemLoaded: function(/* anything */ something){
		// summary:
		//		Check whether the object is an item (XML element) and loaded
		// item:
		//		An object to check
		// returns:
		//		True if the object is an XML element, otherwise false
		return this.isItem(something); //boolean
	},

	loadItem: function(/* object */ keywordArgs){
		// summary:
		//		Load an item (XML element)
		// keywordArgs:
		//		object containing the args for loadItem.	See dojo/data/api/Read.loadItem()
	},

	getFeatures: function(){
		// summary:
		//		Return supported data APIs
		// returns:
		//		"dojo.data.api.Read" and "dojo.data.api.Write"
		var features = {
			"dojo.data.api.Read": true
		};
		return features; //array
	},

	getLabel: function(/*dojo/data/api/Item*/ item){
		// summary:
		//		See dojo/data/api/Read.getLabel()
		if((this.label !== "") && this.isItem(item)){
			var label = this.getValue(item,this.label);
			if(label && label.text){
				return label.text;
			}else if(label){
				return label.toString();
			}else{
				return undefined;
			}
		}
		return undefined; //undefined
	},

	getLabelAttributes: function(/*dojo/data/api/Item*/ item){
		// summary:
		//		See dojo/data/api/Read.getLabelAttributes()
		if(this.label !== ""){
			return [this.label]; //array
		}
		return null; //null
	},

	getFeedValue: function(attribute, defaultValue){
		// summary:
		//		Non-API method for retrieving values regarding the Atom feed,
		//		rather than the Atom entries.
		var values = this.getFeedValues(attribute, defaultValue);
		if(dojo.isArray(values)){
			return values[0];
		}
		return values;
	},

	getFeedValues: function(attribute, defaultValue){
		// summary:
		//		Non-API method for retrieving values regarding the Atom feed,
		//		rather than the Atom entries.
		if(!this.doc){
			return defaultValue;
		}
		if(!this._feedMetaData){
			this._feedMetaData = {
				element: this.doc.getElementsByTagName("feed")[0],
				store: this,
				_attribs: {}
			};
			this._parseItem(this._feedMetaData);
		}
		return this._feedMetaData._attribs[attribute] || defaultValue;
	},

	_initItem: function(item){
		// summary:
		//		Initializes an item before it can be parsed.
		if(!item._attribs){
			item._attribs = {};
		}
	},

	_fetchItems: function(request, fetchHandler, errorHandler){
		// summary:
		//		Retrieves the items from the Atom XML document.
		var url = this._getFetchUrl(request);
		if(!url){
			errorHandler(new Error("No URL specified."));
			return;
		}
		var localRequest = (!this.sendQuery ? request : null); // use request for _getItems()

		var _this = this;
		var docHandler = function(data){
			_this.doc = data;
			var items = _this._getItems(data, localRequest);
			var query = request.query;
			if(query){
				if(query.id){
					items = dojo.filter(items, function(item){
						return (_this.getValue(item, "id") == query.id);
					});
				}else if(query.category){
					items = dojo.filter(items, function(entry){
						var cats = _this.getValues(entry, "category");
						if(!cats){
							return false;
						}
						return dojo.some(cats, "return item.term=='"+query.category+"'");
					});
				}
			}

			if(items && items.length > 0){
				fetchHandler(items, request);
			}else{
				fetchHandler([], request);
			}
		};

		if(this.doc){
			docHandler(this.doc);
		}else{
			var getArgs = {
				url: url,
				handleAs: "xml",
				preventCache: this.urlPreventCache
			};
			var getHandler = dojo.xhrGet(getArgs);
			getHandler.addCallback(docHandler);

			getHandler.addErrback(function(data){
				errorHandler(data, request);
			});
		}
	},

	_getFetchUrl: function(request){
		if(!this.sendQuery){
			return this.url;
		}
		var query = request.query;
		if(!query){
			return this.url;
		}
		if(dojo.isString(query)){
			return this.url + query;
		}
		var queryString = "";
		for(var name in query){
			var value = query[name];
			if(value){
				if(queryString){
					queryString += "&";
				}
				queryString += (name + "=" + value);
			}
		}
		if(!queryString){
			return this.url;
		}
		//Check to see if the URL already has query params or not.
		var fullUrl = this.url;
		if(fullUrl.indexOf("?") < 0){
			fullUrl += "?";
		}else{
			fullUrl += "&";
		}
		return fullUrl + queryString;
	},

	_getItems: function(document, request){
		// summary:
		//		Parses the document in a first pass
		if(this._items){
			return this._items;
		}
		var items = [];
		var nodes = [];

		if(document.childNodes.length < 1){
			this._items = items;
			console.log("dojox.data.AtomReadStore: Received an invalid Atom document. Check the content type header");
			return items;
		}

		var feedNodes = dojo.filter(document.childNodes, "return item.tagName && item.tagName.toLowerCase() == 'feed'");

		var query = request.query;

		if(!feedNodes || feedNodes.length != 1){
			console.log("dojox.data.AtomReadStore: Received an invalid Atom document, number of feed tags = " + (feedNodes? feedNodes.length : 0));
			return items;
		}

		nodes = dojo.filter(feedNodes[0].childNodes, "return item.tagName && item.tagName.toLowerCase() == 'entry'");

		if(request.onBegin){
			request.onBegin(nodes.length, this.sendQuery ? request : {});
		}

		for(var i = 0; i < nodes.length; i++){
			var node = nodes[i];
			if(node.nodeType != 1 /*ELEMENT_NODE*/){
				continue;
			}
			items.push(this._getItem(node));
		}
		this._items = items;
		return items;
	},

	close: function(/*dojo/data/api/Request|Object?*/ request){
		// summary:
		//		See dojo/data/api/Read.close()
	},

/* internal API */

	_getItem: function(element){
		return {
			element: element,
			store: this
		};
	},

	_parseItem: function(item){
		var attribs = item._attribs;
		var _this = this;
		var text, type;

		function getNodeText(node){
			var txt = node.textContent || node.innerHTML || node.innerXML;
			if(!txt && node.childNodes[0]){
				var child = node.childNodes[0];
				if(child && (child.nodeType == 3 || child.nodeType == 4)){
					txt = node.childNodes[0].nodeValue;
				}
			}
			return txt;
		}
		function parseTextAndType(node){
			return {text: getNodeText(node),type: node.getAttribute("type")};
		}
		dojo.forEach(item.element.childNodes, function(node){
			var tagName = node.tagName ? node.tagName.toLowerCase() : "";
			switch(tagName){
				case "title":
					attribs[tagName] = {
						text: getNodeText(node),
						type: node.getAttribute("type")
					}; break;
				case "subtitle":
				case "summary":
				case "content":
					attribs[tagName] = parseTextAndType(node);
					break;
				case "author":
					var nameNode ,uriNode;
					dojo.forEach(node.childNodes, function(child){
						if(!child.tagName){
							return;
						}
						switch(child.tagName.toLowerCase()){
							case "name":
								nameNode = child;
								break;
							case "uri":
								uriNode = child;
								break;
						}
					});
					var author = {};
					if(nameNode && nameNode.length == 1){
						author.name = getNodeText(nameNode[0]);
					}
					if(uriNode && uriNode.length == 1){
						author.uri = getNodeText(uriNode[0]);
					}
					attribs[tagName] = author;
					break;
				case "id":
					attribs[tagName] = getNodeText(node);
					break;
				case "updated":
					attribs[tagName] = dojo.date.stamp.fromISOString(getNodeText(node) );
					break;
				case "published":
					attribs[tagName] = dojo.date.stamp.fromISOString(getNodeText(node));
					break;
				case "category":
					if(!attribs[tagName]){
						attribs[tagName] = [];
					}
					attribs[tagName].push({scheme:node.getAttribute("scheme"), term: node.getAttribute("term")});
					break;
				case "link":
					if(!attribs[tagName]){
						attribs[tagName] = [];
					}
					var link = {
						rel: node.getAttribute("rel"),
						href: node.getAttribute("href"),
						type: node.getAttribute("type")};
					attribs[tagName].push(link);

					if(link.rel == "alternate"){
						attribs["alternate"] = link;
					}
					break;
				default:
					break;
			}
		});
	},

	_unescapeHTML : function(text){
		//Replace HTML character codes with their unencoded equivalents, e.g. &#8217; with '
		text = text.replace(/&#8217;/m , "'").replace(/&#8243;/m , "\"").replace(/&#60;/m,">").replace(/&#62;/m,"<").replace(/&#38;/m,"&");
		return text;
	},

	_assertIsItem: function(/*dojo/data/api/Item*/ item){
		// summary:
		//		This function tests whether the item passed in is indeed an item in the store.
		// item:
		//		The item to test for being contained by the store.
		if(!this.isItem(item)){
			throw new Error("dojox.data.AtomReadStore: Invalid item argument.");
		}
	},

	_assertIsAttribute: function(/* attribute-name-string */ attribute){
		// summary:
		//		This function tests whether the item passed in is indeed a valid 'attribute' like type for the store.
		// attribute:
		//		The attribute to test for being contained by the store.
		if(typeof attribute !== "string"){
			throw new Error("dojox.data.AtomReadStore: Invalid attribute argument.");
		}
	}
});
dojo.extend(dojox.data.AtomReadStore,dojo.data.util.simpleFetch);

return dojox.data.AtomReadStore;
});
