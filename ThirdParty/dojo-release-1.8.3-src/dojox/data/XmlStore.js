define(["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/xhr", "dojo/data/util/simpleFetch", 
		"dojo/_base/query", "dojo/_base/array", "dojo/_base/kernel", "dojo/data/util/filter", "dojox/xml/parser",
		"dojox/data/XmlItem"], 
  function(lang, declare, xhr, simpleFetch, domQuery, array, kernel, filter, xmlParser, XmlItem) {

var XmlStore = declare("dojox.data.XmlStore", null, {
	// summary:
	//		A data store for XML based services or documents
	// description:
	//		A data store for XML based services or documents
	
	constructor: function(/* object */ args){
		// summary:
		//		Constructor for the XML store.
		// args:
		//		An anonymous object to initialize properties.  It expects the following values:
		//
		//		- url:		The url to a service or an XML document that represents the store
		//		- rootItem:	A tag name for root items
		//		- keyAttribute:	An attribute name for a key or an identity (unique identifier)
		//						Required for serverside fetchByIdentity, etc.  Not required for
		//						client side fetchItemBIdentity, as it will use an XPath-like
		//						structure if keyAttribute was not specified.  Recommended to always
		//						set this, though, for consistent identity behavior.
		//		- attributeMap: An anonymous object contains properties for attribute mapping,
		//						{"tag_name.item_attribute_name": "@xml_attribute_name", ...}
		//		- sendQuery:	A boolean indicate to add a query string to the service URL.
		//						Default is false.
		//		- urlPreventCache: Parameter to indicate whether or not URL calls should apply
		//						 the preventCache option to the xhr request.
		if(args){
			this.url = args.url;
			this.rootItem = (args.rootItem || args.rootitem || this.rootItem);
			this.keyAttribute = (args.keyAttribute || args.keyattribute || this.keyAttribute);
			this._attributeMap = (args.attributeMap || args.attributemap);
			this.label = args.label || this.label;
			this.sendQuery = (args.sendQuery || args.sendquery || this.sendQuery);
			if("urlPreventCache" in args){
				this.urlPreventCache = args.urlPreventCache?true:false;
			}
		}
		this._newItems = [];
		this._deletedItems = [];
		this._modifiedItems = [];
	},

	//Values that may be set by the parser.
	//Ergo, have to be instantiated to something
	//So the parser knows how to set them.
	url: "",

	//	A tag name for XML tags to be considered root items in the hierarchy
	rootItem: "",

	//	An attribute name for a key or an identity (unique identifier)
	//	Required for serverside fetchByIdentity, etc.  Not required for
	//	client side fetchItemBIdentity, as it will use an XPath-like
	//	structure if keyAttribute was not specified.  Recommended to always
	//	set this, though, for consistent identity behavior.
	keyAttribute: "",

	//	An attribute of the item to use as the label.
	label: "",

	//	A boolean indicate to add a query string to the service URL.
	//	Default is false.
	sendQuery: false,

	//	An anonymous object that contains properties for attribute mapping,
	//	for example {"tag_name.item_attribute_name": "@xml_attribute_name", ...}.
	//	This is optional. This is done so that attributes which are actual
	//	XML tag attributes (and not sub-tags of an XML tag), can be referenced.
	attributeMap: null,

	//	Parameter to indicate whether or not URL calls should apply the preventCache option to the xhr request.
	urlPreventCache: true,

	/* dojo/data/api/Read */

	getValue: function(/*dojo/data/api/Item*/ item, /* attribute|attribute-name-string */ attribute, /* value? */ defaultValue){
		// summary:
		//		Return an attribute value
		// description:
		//		'item' must be an instance of a dojox.data.XmlItem from the store instance.
		//		If 'attribute' specifies "tagName", the tag name of the element is
		//		returned.
		//		If 'attribute' specifies "childNodes", the first element child is
		//		returned.
		//		If 'attribute' specifies "text()", the value of the first text
		//		child is returned.
		//		For generic attributes, if '_attributeMap' is specified,
		//		an actual attribute name is looked up with the tag name of
		//		the element and 'attribute' (concatenated with '.').
		//		Then, if 'attribute' starts with "@", the value of the XML
		//		attribute is returned.
		//		Otherwise, the first child element of the tag name specified with
		//		'attribute' is returned.
		// item:
		//		An XML element that holds the attribute
		// attribute:
		//		A tag name of a child element, An XML attribute name or one of
		//		special names
		// defaultValue:
		//		A default value
		// returns:
		//		An attribute value found, otherwise 'defaultValue'
		var element = item.element;
		var i;
		var node;
		if(attribute === "tagName"){
			return element.nodeName;
		}else if(attribute === "childNodes"){
			for(i = 0; i < element.childNodes.length; i++){
				node = element.childNodes[i];
				if(node.nodeType === 1 /*ELEMENT_NODE*/){
					return this._getItem(node); //object
				}
			}
			return defaultValue;
		}else if(attribute === "text()"){
			for(i = 0; i < element.childNodes.length; i++){
				node = element.childNodes[i];
				if(node.nodeType === 3 /*TEXT_NODE*/ ||
					node.nodeType === 4 /*CDATA_SECTION_NODE*/){
					return node.nodeValue; //string
				}
			}
			return defaultValue;
		}else{
			attribute = this._getAttribute(element.nodeName, attribute);
			if(attribute.charAt(0) === '@'){
				var name = attribute.substring(1);
				var value = element.getAttribute(name);
				//Note that getAttribute will return null or empty string for undefined/unset
				//attributes, therefore, we should just check the return was valid
				//non-empty string and not null.
				return (value) ? value : defaultValue; //object
			}else{
				for(i = 0; i < element.childNodes.length; i++){
					node = element.childNodes[i];
					if(	node.nodeType === 1 /*ELEMENT_NODE*/ &&
						node.nodeName === attribute){
						return this._getItem(node); //object
					}
				}
				return defaultValue; //object
			}
		}
	},

	getValues: function(/*dojo/data/api/Item*/ item, /* attribute|attribute-name-string */ attribute){
		// summary:
		//		Return an array of attribute values
		// description:
		//		'item' must be an instance of a dojox.data.XmlItem from the store instance.
		//		If 'attribute' specifies "tagName", the tag name of the element is
		//		returned.
		//		If 'attribute' specifies "childNodes", child elements are returned.
		//		If 'attribute' specifies "text()", the values of child text nodes
		//		are returned.
		//		For generic attributes, if 'attributeMap' is specified,
		//		an actual attribute name is looked up with the tag name of
		//		the element and 'attribute' (concatenated with '.').
		//		Then, if 'attribute' starts with "@", the value of the XML
		//		attribute is returned.
		//		Otherwise, child elements of the tag name specified with
		//		'attribute' are returned.
		// item:
		//		An XML element that holds the attribute
		// attribute:
		//		A tag name of child elements, An XML attribute name or one of
		//		special names
		// returns:
		//		An array of attribute values found, otherwise an empty array
		var element = item.element;
		var values = [];
		var i;
		var node;
		if(attribute === "tagName"){
			return [element.nodeName];
		}else if(attribute === "childNodes"){
			for(i = 0; i < element.childNodes.length; i++){
				node = element.childNodes[i];
				if(node.nodeType === 1 /*ELEMENT_NODE*/){
					values.push(this._getItem(node));
				}
			}
			return values; //array
		}else if(attribute === "text()"){
			var ec = element.childNodes;
			for(i = 0; i < ec.length; i++){
				node = ec[i];
				if(node.nodeType === 3 || node.nodeType === 4){
					values.push(node.nodeValue);
				}
			}
			return values; //array
		}else{
			attribute = this._getAttribute(element.nodeName, attribute);
			if(attribute.charAt(0) === '@'){
				var name = attribute.substring(1);
				var value = element.getAttribute(name);
				return (value !== undefined) ? [value] : []; //array
			}else{
				for(i = 0; i < element.childNodes.length; i++){
					node = element.childNodes[i];
					if(	node.nodeType === 1 /*ELEMENT_NODE*/ &&
						node.nodeName === attribute){
						values.push(this._getItem(node));
					}
				}
				return values; //array
			}
		}
	},

	getAttributes: function(/*dojo/data/api/Item*/ item){
		// summary:
		//		Return an array of attribute names
		// description:
		//		'item' must be an instance of a dojox.data.XmlItem from the store instance.
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
		var element = item.element;
		var attributes = [];
		var i;
		attributes.push("tagName");
		if(element.childNodes.length > 0){
			var names = {};
			var childNodes = true;
			var text = false;
			for(i = 0; i < element.childNodes.length; i++){
				var node = element.childNodes[i];
				if(node.nodeType === 1 /*ELEMENT_NODE*/){
					var name = node.nodeName;
					if(!names[name]){
						attributes.push(name);
						names[name] = name;
					}
					childNodes = true;
				}else if(node.nodeType === 3){
					text = true;
				}
			}
			if(childNodes){
				attributes.push("childNodes");
			}
			if(text){
				attributes.push("text()");
			}
		}
		for(i = 0; i < element.attributes.length; i++){
			attributes.push("@" + element.attributes[i].nodeName);
		}
		if(this._attributeMap){
			for(var key in this._attributeMap){
				i = key.indexOf('.');
				if(i > 0){
					var tagName = key.substring(0, i);
					if(tagName === element.nodeName){
						attributes.push(key.substring(i + 1));
					}
				}else{ // global attribute
					attributes.push(key);
				}
			}
		}
		return attributes; //array
	},

	hasAttribute: function(/*dojo/data/api/Item*/ item, /* attribute|attribute-name-string */ attribute){
		// summary:
		//		Check whether an element has the attribute
		// item:
		//		'item' must be an instance of a dojox.data.XmlItem from the store instance.
		// attribute:
		//		A tag name of a child element, An XML attribute name or one of
		//		special names
		// returns:
		//		True if the element has the attribute, otherwise false
		return (this.getValue(item, attribute) !== undefined); //boolean
	},

	containsValue: function(/*dojo/data/api/Item*/ item, /* attribute|attribute-name-string */ attribute, /* anything */ value){
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
		//		object containing the args for loadItem.  See dojo/data/api/Read.loadItem()
	},

	getFeatures: function(){
		// summary:
		//		Return supported data APIs
		// returns:
		//		"dojo.data.api.Read" and "dojo.data.api.Write"
		var features = {
			"dojo.data.api.Read": true,
			"dojo.data.api.Write": true
		};

		//Local XML parsing can implement Identity fairly simple via
		if(!this.sendQuery || this.keyAttribute !== ""){
			features["dojo.data.api.Identity"] = true;
		}
		return features; //array
	},

	getLabel: function(/*dojo/data/api/Item*/ item){
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

	getLabelAttributes: function(/*dojo/data/api/Item*/ item){
		// summary:
		//		See dojo/data/api/Read.getLabelAttributes()
		if(this.label !== ""){
			return [this.label]; //array
		}
		return null; //null
	},

	_fetchItems: function(request, fetchHandler, errorHandler){
		// summary:
		//		Fetch items (XML elements) that match to a query
		// description:
		//		If 'sendQuery' is true, an XML document is loaded from
		//		'url' with a query string.
		//		Otherwise, an XML document is loaded and list XML elements that
		//		match to a query (set of element names and their text attribute
		//		values that the items to contain).
		//		A wildcard, "*" can be used to query values to match all
		//		occurrences.
		//		If 'rootItem' is specified, it is used to fetch items.
		// request:
		//		A request object
		// fetchHandler:
		//		A function to call for fetched items
		// errorHandler:
		//		A function to call on error
		var url = this._getFetchUrl(request);
		if(!url){
			errorHandler(new Error("No URL specified."), request);
			return;
		}
		var localRequest = (!this.sendQuery ? request : {}); // use request for _getItems()

		var self = this;
		var getArgs = {
				url: url,
				handleAs: "xml",
				preventCache: self.urlPreventCache
			};
		var getHandler = xhr.get(getArgs);
		getHandler.addCallback(function(data){
			var items = self._getItems(data, localRequest);
			if(items && items.length > 0){
				fetchHandler(items, request);
			}else{
				fetchHandler([], request);
			}
		});
		getHandler.addErrback(function(data){
			errorHandler(data, request);
		});
	},

	_getFetchUrl: function(request){
		// summary:
		//		Generate a URL for fetch
		// description:
		//		This default implementation generates a query string in the form of
		//		"?name1=value1&name2=value2..." off properties of 'query' object
		//		specified in 'request' and appends it to 'url', if 'sendQuery'
		//		is set to false.
		//		Otherwise, 'url' is returned as is.
		//		Sub-classes may override this method for the custom URL generation.
		// request:
		//		A request object
		// returns:
		//		A fetch URL
		if(!this.sendQuery){
			return this.url;
		}
		var query = request.query;
		if(!query){
			return this.url;
		}
		if(lang.isString(query)){
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
		//		Fetch items (XML elements) in an XML document based on a request
		// description:
		//		This default implementation walks through child elements of
		//		the document element to see if all properties of 'query' object
		//		match corresponding attributes of the element (item).
		//		If 'request' is not specified, all child elements are returned.
		//		Sub-classes may override this method for the custom search in
		//		an XML document.
		// document:
		//		An XML document
		// request:
		//		A request object
		// returns:
		//		An array of items
		var query = null;
		if(request){
			query = request.query;
		}
		var items = [];
		var nodes = null;

		if(this.rootItem !== ""){
			nodes = domQuery(this.rootItem, document);
		}else{
			nodes = document.documentElement.childNodes;
		}

		var deep = request.queryOptions ? request.queryOptions.deep : false;
		if(deep){
			nodes = this._flattenNodes(nodes);
		}
		for(var i = 0; i < nodes.length; i++){
			var node = nodes[i];
			if(node.nodeType != 1 /*ELEMENT_NODE*/){
				continue;
			}
			var item = this._getItem(node);
			if(query){
				var ignoreCase = request.queryOptions ? request.queryOptions.ignoreCase : false;
				var value;
				var match = false;
				var j;
				var emptyQuery = true;

				//See if there are any string values that can be regexp parsed first to avoid multiple regexp gens on the
				//same value for each item examined.  Much more efficient.
				var regexpList = {};
				for(var key in query){
					value = query[key];
					if(typeof value === "string"){
						regexpList[key] = filter.patternToRegExp(value, ignoreCase);
					}else if(value){
						// It's an object, possibly regexp, so treat it as one.
						regexpList[key] = value;
					}
				}
				for(var attribute in query){
					emptyQuery = false;
					var values = this.getValues(item, attribute);
					for(j = 0; j < values.length; j++){
						value = values[j];
						if(value){
							var queryValue = query[attribute];
							if((typeof value) === "string" &&
								(regexpList[attribute])){
								if((value.match(regexpList[attribute])) !== null){
									match = true;
								}else{
									match = false;
								}
							}else if((typeof value) === "object"){
								if(	value.toString &&
									(regexpList[attribute])){
									var stringValue = value.toString();
									if((stringValue.match(regexpList[attribute])) !== null){
										match = true;
									}else{
										match = false;
									}
								}else{
									if(queryValue === "*" || queryValue === value){
										match = true;
									}else{
										match = false;
									}
								}
							}
						}
						//One of the multiValue values matched,
						//so quit looking.
						if(match){
							break;
						}
					}
					if(!match){
						break;
					}
				}
				//Either the query was an empty object {}, which is match all, or
				//was an actual match.
				if(emptyQuery || match){
					items.push(item);
				}
			}else{
				//No query, everything matches.
				items.push(item);
			}
		}
		array.forEach(items,function(item){
			if(item.element.parentNode){
				item.element.parentNode.removeChild(item.element); // make it root
			}
		},this);
		return items;
	},

	_flattenNodes: function(nodes){
		// summary:
		//		Function used to flatten a hierarchy of XML nodes into a single list for
		//		querying over.  Used when deep = true;
		var flattened = [];
		if(nodes){
			var i;
			for(i = 0; i < nodes.length; i++){
				var node = nodes[i];
				flattened.push(node);
				if(node.childNodes && node.childNodes.length > 0){
					flattened = flattened.concat(this._flattenNodes(node.childNodes));
				}
			}
		}
		return flattened;
	},

	close: function(/*dojo/data/api/Request|Object?*/ request){
		// summary:
		//		See dojo/data/api/Read.close()
	},

/* dojo/data/api/Write */

	newItem: function(/* object? */ keywordArgs, parentInfo){
		// summary:
		//		Return a new dojox.data.XmlItem
		// description:
		//		At least, 'keywordArgs' must contain "tagName" to be used for
		//		the new	element.
		//		Other attributes in 'keywordArgs' are set to the new element,
		//		including "text()", but excluding "childNodes".
		// keywordArgs:
		//		An object containing initial attributes
		// returns:
		//		An XML element
		keywordArgs = (keywordArgs || {});
		var tagName = keywordArgs.tagName;
		if(!tagName){
			tagName = this.rootItem;
			if(tagName === ""){
				return null;
			}
		}

		var document = this._getDocument();
		var element = document.createElement(tagName);
		for(var attribute in keywordArgs){
			var text;
			if(attribute === "tagName"){
				continue;
			}else if(attribute === "text()"){
				text = document.createTextNode(keywordArgs[attribute]);
				element.appendChild(text);
			}else{
				attribute = this._getAttribute(tagName, attribute);
				if(attribute.charAt(0) === '@'){
					var name = attribute.substring(1);
					element.setAttribute(name, keywordArgs[attribute]);
				}else{
					var child = document.createElement(attribute);
					text = document.createTextNode(keywordArgs[attribute]);
					child.appendChild(text);
					element.appendChild(child);
				}
			}
		}

		var item = this._getItem(element);
		this._newItems.push(item);

		var pInfo = null;
		if(parentInfo && parentInfo.parent && parentInfo.attribute){
			pInfo = {
				item: parentInfo.parent,
				attribute: parentInfo.attribute,
				oldValue: undefined
			};

			//See if it is multi-valued or not and handle appropriately
			//Generally, all attributes are multi-valued for this store
			//So, we only need to append if there are already values present.
			var values = this.getValues(parentInfo.parent, parentInfo.attribute);
			if(values && values.length > 0){
				var tempValues = values.slice(0, values.length);
				if(values.length === 1){
					pInfo.oldValue = values[0];
				}else{
					pInfo.oldValue = values.slice(0, values.length);
				}
				tempValues.push(item);
				this.setValues(parentInfo.parent, parentInfo.attribute, tempValues);
				pInfo.newValue = this.getValues(parentInfo.parent, parentInfo.attribute);
			}else{
				this.setValue(parentInfo.parent, parentInfo.attribute, item);
				pInfo.newValue = item;
			}
		}
		return item; //object
	},
	
	deleteItem: function(/*dojo/data/api/Item*/ item){
		// summary:
		//		Delete an dojox.data.XmlItem (wrapper to a XML element).
		// item:
		//		An XML element to delete
		// returns:
		//		True
		var element = item.element;
		if(element.parentNode){
			this._backupItem(item);
			element.parentNode.removeChild(element);
			return true;
		}
		this._forgetItem(item);
		this._deletedItems.push(item);
		return true; //boolean
	},
	
	setValue: function(/*dojo/data/api/Item*/ item, /* attribute|String */ attribute, /* almost anything */ value){
		// summary:
		//		Set an attribute value
		// description:
		//		'item' must be an instance of a dojox.data.XmlItem from the store instance.
		//		If 'attribute' specifies "tagName", nothing is set and false is
		//		returned.
		//		If 'attribute' specifies "childNodes", the value (XML element) is
		//		added to the element.
		//		If 'attribute' specifies "text()", a text node is created with
		//		the value and set it to the element as a child.
		//		For generic attributes, if '_attributeMap' is specified,
		//		an actual attribute name is looked up with the tag name of
		//		the element and 'attribute' (concatenated with '.').
		//		Then, if 'attribute' starts with "@", the value is set to the XML
		//		attribute.
		//		Otherwise, a text node is created with the value and set it to
		//		the first child element of the tag name specified with 'attribute'.
		//		If the child element does not exist, it is created.
		// item:
		//		An XML element that holds the attribute
		// attribute:
		//		A tag name of a child element, An XML attribute name or one of
		//		special names
		// value:
		//		A attribute value to set
		// returns:
		//		False for "tagName", otherwise true
		if(attribute === "tagName"){
			return false; //boolean
		}

		this._backupItem(item);

		var element = item.element;
		var child;
		var text;
		if(attribute === "childNodes"){
			child = value.element;
			element.appendChild(child);
		}else if(attribute === "text()"){
			while(element.firstChild){
				element.removeChild(element.firstChild);
			}
			text = this._getDocument(element).createTextNode(value);
			element.appendChild(text);
		}else{
			attribute = this._getAttribute(element.nodeName, attribute);
			if(attribute.charAt(0) === '@'){
				var name = attribute.substring(1);
				element.setAttribute(name, value);
			}else{
				for(var i = 0; i < element.childNodes.length; i++){
					var node = element.childNodes[i];
					if(	node.nodeType === 1 /*ELEMENT_NODE*/ &&
						node.nodeName === attribute){
						child = node;
						break;
					}
				}
				var document = this._getDocument(element);
				if(child){
					while(child.firstChild){
						child.removeChild(child.firstChild);
					}
				}else{
					child = document.createElement(attribute);
					element.appendChild(child);
				}
				text = document.createTextNode(value);
				child.appendChild(text);
			}
		}
		return true; //boolean
	},
		
	setValues: function(/*dojo/data/api/Item*/ item, /* attribute|String */ attribute, /*Array*/ values){
		// summary:
		//		Set attribute values
		// description:
		//		'item' must be an instance of a dojox.data.XmlItem from the store instance.
		//		If 'attribute' specifies "tagName", nothing is set and false is
		//		returned.
		//		If 'attribute' specifies "childNodes", the value (array of XML
		//		elements) is set to the element's childNodes.
		//		If 'attribute' specifies "text()", a text node is created with
		//		the values and set it to the element as a child.
		//		For generic attributes, if '_attributeMap' is specified,
		//		an actual attribute name is looked up with the tag name of
		//		the element and 'attribute' (concatenated with '.').
		//		Then, if 'attribute' starts with "@", the first value is set to
		//		the XML attribute.
		//		Otherwise, child elements of the tag name specified with
		//		'attribute' are replaced with new child elements and their
		//		child text nodes of values.
		// item:
		//		An XML element that holds the attribute
		// attribute:
		//		A tag name of child elements, an XML attribute name or one of
		//		special names
		// value:
		//		A attribute value to set
		// notify:
		//		A non-API optional argument, used to indicate if notification API should be called
		//		or not.
		// returns:
		//		False for "tagName", otherwise true

		if(attribute === "tagName"){
			return false; //boolean
		}

		this._backupItem(item);

		var element = item.element;
		var i;
		var child;
		var text;
		if(attribute === "childNodes"){
			while(element.firstChild){
				element.removeChild(element.firstChild);
			}
			for(i = 0; i < values.length; i++){
				child = values[i].element;
				element.appendChild(child);
			}
		}else if(attribute === "text()"){
			while(element.firstChild){
				element.removeChild(element.firstChild);
			}
			var value = "";
			for(i = 0; i < values.length; i++){
				value += values[i];
			}
			text = this._getDocument(element).createTextNode(value);
			element.appendChild(text);
		}else{
			attribute = this._getAttribute(element.nodeName, attribute);
			if(attribute.charAt(0) === '@'){
				var name = attribute.substring(1);
				element.setAttribute(name, values[0]);
			}else{
				for(i = element.childNodes.length - 1; i >= 0; i--){
					var node = element.childNodes[i];
					if(	node.nodeType === 1 /*ELEMENT_NODE*/ &&
						node.nodeName === attribute){
						element.removeChild(node);
					}
				}
				var document = this._getDocument(element);
				for(i = 0; i < values.length; i++){
					child = document.createElement(attribute);
					text = document.createTextNode(values[i]);
					child.appendChild(text);
					element.appendChild(child);
				}
			}
		}
		return true; //boolean
	},
	
	unsetAttribute: function(/*dojo/data/api/Item*/ item, /* attribute|String */ attribute){
		// summary:
		//		Remove an attribute
		// description:
		//		'item' must be an instance of a dojox.data.XmlItem from the store instance.
		//		'attribute' can be an XML attribute name of the element or one of
		//		special names described below.
		//		If 'attribute' specifies "tagName", nothing is removed and false is
		//		returned.
		//		If 'attribute' specifies "childNodes" or "text()", all child nodes
		//		are removed.
		//		For generic attributes, if '_attributeMap' is specified,
		//		an actual attribute name is looked up with the tag name of
		//		the element and 'attribute' (concatenated with '.').
		//		Then, if 'attribute' starts with "@", the XML attribute is removed.
		//		Otherwise, child elements of the tag name specified with
		//		'attribute' are removed.
		// item:
		//		An XML element that holds the attribute
		// attribute:
		//		A tag name of child elements, an XML attribute name or one of
		//		special names
		// returns:
		//		False for "tagName", otherwise true
		if(attribute === "tagName"){
			return false; //boolean
		}

		this._backupItem(item);

		var element = item.element;
		if(attribute === "childNodes" || attribute === "text()"){
			while(element.firstChild){
				element.removeChild(element.firstChild);
			}
		}else{
			attribute = this._getAttribute(element.nodeName, attribute);
			if(attribute.charAt(0) === '@'){
				var name = attribute.substring(1);
				element.removeAttribute(name);
			}else{
				for(var i = element.childNodes.length - 1; i >= 0; i--){
					var node = element.childNodes[i];
					if(	node.nodeType === 1 /*ELEMENT_NODE*/ &&
						node.nodeName === attribute){
						element.removeChild(node);
					}
				}
			}
		}
		return true; //boolean
	},
	
	save: function(/* object */ keywordArgs){
		// summary:
		//		Save new and/or modified items (XML elements)
		// description:
		//		'url' is used to save XML documents for new, modified and/or
		//		deleted XML elements.
		// keywordArgs:
		//		An object for callbacks
		if(!keywordArgs){
			keywordArgs = {};
		}
		var i;
		for(i = 0; i < this._modifiedItems.length; i++){
			this._saveItem(this._modifiedItems[i], keywordArgs, "PUT");
		}
		for(i = 0; i < this._newItems.length; i++){
			var item = this._newItems[i];
			if(item.element.parentNode){ // reparented
				this._newItems.splice(i, 1);
				i--;
				continue;
			}
			this._saveItem(this._newItems[i], keywordArgs, "POST");
		}
		for(i = 0; i < this._deletedItems.length; i++){
			this._saveItem(this._deletedItems[i], keywordArgs, "DELETE");
		}
	},

	revert: function(){
		// summary:
		//	Invalidate changes (new and/or modified elements)
		// returns:
		//	True
		this._newItems = [];
		this._restoreItems(this._deletedItems);
		this._deletedItems = [];
		this._restoreItems(this._modifiedItems);
		this._modifiedItems = [];
		return true; //boolean
	},
	
	isDirty: function(/* item? */ item){
		// summary:
		//		Check whether an item is new, modified or deleted
		// description:
		//		If 'item' is specified, true is returned if the item is new,
		//		modified or deleted.
		//		Otherwise, true is returned if there are any new, modified
		//		or deleted items.
		// item:
		//		An item (XML element) to check
		// returns:
		//		True if an item or items are new, modified or deleted, otherwise
		//		false
		if(item){
			var element = this._getRootElement(item.element);
			return (this._getItemIndex(this._newItems, element) >= 0 ||
				this._getItemIndex(this._deletedItems, element) >= 0 ||
				this._getItemIndex(this._modifiedItems, element) >= 0); //boolean
		}else{
			return (this._newItems.length > 0 ||
				this._deletedItems.length > 0 ||
				this._modifiedItems.length > 0); //boolean
		}
	},

	_saveItem: function(item, keywordArgs, method){
		var url;
		var scope;
		if(method === "PUT"){
			url = this._getPutUrl(item);
		}else if(method === "DELETE"){
			url = this._getDeleteUrl(item);
		}else{ // POST
			url = this._getPostUrl(item);
		}
		if(!url){
			if(keywordArgs.onError){
				scope = keywordArgs.scope || kernel.global;
				keywordArgs.onError.call(scope, new Error("No URL for saving content: " + this._getPostContent(item)));
			}
			return;
		}

		var saveArgs = {
			url: url,
			method: (method || "POST"),
			contentType: "text/xml",
			handleAs: "xml"
		};
		var saveHandler;
		if(method === "PUT"){
			saveArgs.putData = this._getPutContent(item);
			saveHandler = xhr.put(saveArgs);
		}else if(method === "DELETE"){
			saveHandler = xhr.del(saveArgs);
		}else{ // POST
			saveArgs.postData = this._getPostContent(item);
			saveHandler = xhr.post(saveArgs);
		}
		scope = (keywordArgs.scope || kernel. global);
		var self = this;
		saveHandler.addCallback(function(data){
			self._forgetItem(item);
			if(keywordArgs.onComplete){
				keywordArgs.onComplete.call(scope);
			}
		});
		saveHandler.addErrback(function(error){
			if(keywordArgs.onError){
				keywordArgs.onError.call(scope, error);
			}
		});
	},

	_getPostUrl: function(item){
		// summary:
		//		Generate a URL for post
		// description:
		//		This default implementation just returns 'url'.
		//		Sub-classes may override this method for the custom URL.
		// item:
		//		An item to save
		// returns:
		//		A post URL
		return this.url; //string
	},

	_getPutUrl: function(item){
		// summary:
		//		Generate a URL for put
		// description:
		//		This default implementation just returns 'url'.
		//		Sub-classes may override this method for the custom URL.
		// item:
		//		An item to save
		// returns:
		//		A put URL
		return this.url; //string
	},

	_getDeleteUrl: function(item){
		// summary:
		//		Generate a URL for delete
		// description:
		//		This default implementation returns 'url' with 'keyAttribute'
		//		as a query string.
		//		Sub-classes may override this method for the custom URL based on
		//		changes (new, deleted, or modified).
		// item:
		//		An item to delete
		// returns:
		//		A delete URL
		var url = this.url;
		if(item && this.keyAttribute !== ""){
			var value = this.getValue(item, this.keyAttribute);
			if(value){
				var key = this.keyAttribute.charAt(0) ==='@' ? this.keyAttribute.substring(1): this.keyAttribute;
				url += url.indexOf('?') < 0 ? '?' : '&';
				url += key + '=' + value;
			}
		}
		return url;	//string
	},

	_getPostContent: function(item){
		// summary:
		//		Generate a content to post
		// description:
		//		This default implementation generates an XML document for one
		//		(the first only) new or modified element.
		//		Sub-classes may override this method for the custom post content
		//		generation.
		// item:
		//		An item to save
		// returns:
		//		A post content
		return "<?xml version=\'1.0\'?>" + xmlParser.innerXML(item.element); //XML string
	},

	_getPutContent: function(item){
		// summary:
		//		Generate a content to put
		// description:
		//		This default implementation generates an XML document for one
		//		(the first only) new or modified element.
		//		Sub-classes may override this method for the custom put content
		//		generation.
		// item:
		//		An item to save
		// returns:
		//		A post content
		return "<?xml version='1.0'?>" + xmlParser.innerXML(item.element); //XML string
	},

/* internal API */

	_getAttribute: function(tagName, attribute){
		if(this._attributeMap){
			var key = tagName + "." + attribute;
			var value = this._attributeMap[key];
			if(value){
				attribute = value;
			}else{ // look for global attribute
				value = this._attributeMap[attribute];
				if(value){
					attribute = value;
				}
			}
		}
		return attribute; //object
	},

	_getItem: function(element){
		try{
			var q = null;
			//Avoid function call if possible.
			if(this.keyAttribute === ""){
				q = this._getXPath(element);
			}
			return new XmlItem(element, this, q); //object
		}catch (e){
			console.log(e);
		}
		return null;
	},

	_getItemIndex: function(items, element){
		for(var i = 0; i < items.length; i++){
			if(items[i].element === element){
				return i; //int
			}
		}
		return -1; //int
	},

	_backupItem: function(item){
		var element = this._getRootElement(item.element);
		if(	this._getItemIndex(this._newItems, element) >= 0 ||
			this._getItemIndex(this._modifiedItems, element) >= 0){
			return; // new or already modified
		}
		if(element != item.element){
			item = this._getItem(element);
		}
		item._backup = element.cloneNode(true);
		this._modifiedItems.push(item);
	},

	_restoreItems: function(items){

		array.forEach(items,function(item){
			if(item._backup){
				item.element = item._backup;
				item._backup = null;
			}
		},this);
	},

	_forgetItem: function(item){
		var element = item.element;
		var index = this._getItemIndex(this._newItems, element);
		if(index >= 0){
			this._newItems.splice(index, 1);
		}
		index = this._getItemIndex(this._deletedItems, element);
		if(index >= 0){
			this._deletedItems.splice(index, 1);
		}
		index = this._getItemIndex(this._modifiedItems, element);
		if(index >= 0){
			this._modifiedItems.splice(index, 1);
		}
	},

	_getDocument: function(element){
		if(element){
			return element.ownerDocument; //DOMDocument
		}else if(!this._document){
			return xmlParser.parse(); // DOMDocument
		}
		return null; //null
	},

	_getRootElement: function(element){
		while(element.parentNode){
			element = element.parentNode;
		}
		return element; //DOMElement
	},

	_getXPath: function(element){
		// summary:
		//		A function to compute the xpath of a node in a DOM document.
		// description:
		//		A function to compute the xpath of a node in a DOM document.  Used for
		//		Client side query handling and identity.
		var xpath = null;
		if(!this.sendQuery){
			//xpath should be null for any server queries, as we don't have the entire
			//XML dom to figure it out.
			var node = element;
			xpath = "";
			while(node && node != element.ownerDocument){
				var pos = 0;
				var sibling = node;
				var name = node.nodeName;
				while(sibling){
					sibling = sibling.previousSibling;
					if(sibling && sibling.nodeName === name){
						pos++;
					}
				}
				var temp = "/" + name + "[" + pos + "]";
				if(xpath){
					xpath = temp + xpath;
				}else{
					xpath = temp;
				}
				node = node.parentNode;
			}
		}
		return xpath; //string
	},

	/*************************************
	 * Dojo.data Identity implementation *
	 *************************************/
	getIdentity: function(/*dojo/data/api/Item*/ item){
		// summary:
		//		Returns a unique identifier for an item.
		// item:
		//		The XML Item from the store from which to obtain its identifier.
		if(!this.isItem(item)){
			throw new Error("dojox.data.XmlStore: Object supplied to getIdentity is not an item");
		}else{
			var id = null;
			if(this.sendQuery && this.keyAttribute !== ""){
				id = this.getValue(item, this.keyAttribute).toString();
			}else if(!this.serverQuery){
				if(this.keyAttribute !== ""){
					id = this.getValue(item,this.keyAttribute).toString();
				}else{
					//No specified identity, so return the dojo.query/xpath
					//for the node as fallback.
					id = item.q;
				}
			}
			return id; //String.
		}
	},

	getIdentityAttributes: function(/*dojo/data/api/Item*/ item){
		// summary:
		//		Returns an array of attribute names that are used to generate the identity.
		// description:
		//		For XmlStore, if sendQuery is false and no keyAttribute was set, then this function
		//		returns null, as xpath is used for the identity, which is not a public attribute of
		//		the item.  If sendQuery is true and keyAttribute is set, then this function
		//		returns an array of one attribute name: keyAttribute.   This means the server side
		//		implementation must apply a keyAttribute to a returned node that always allows
		//		it to be looked up again.
		// item:
		//		The item from the store from which to obtain the array of public attributes that
		//		compose the identifier, if any.
		if(!this.isItem(item)){
			throw new Error("dojox.data.XmlStore: Object supplied to getIdentity is not an item");
		}else{
			if(this.keyAttribute !== ""){
				return [this.keyAttribute]; //array
			}else{
				//Otherwise it's either using xpath (not an attribute), or the remote store
				//doesn't support identity.
				return null; //null
			}
		}
	},


	fetchItemByIdentity: function(/* object */ keywordArgs){
		// summary:
		//		See dojo/data/api/Identity.fetchItemByIdentity(keywordArgs)
		var handleDocument = null;
		var scope = null;
		var self = this;
		var url = null;
		var getArgs = null;
		var getHandler = null;

		if(!self.sendQuery){
			handleDocument = function(data){
				if(data){
					if(self.keyAttribute !== ""){
						//We have a key attribute specified.  So ... we can process the items and locate the item
						//that contains a matching key attribute.  Its identity, as it were.
						var request = {};
						request.query={};
						request.query[self.keyAttribute] = keywordArgs.identity;
						request.queryOptions = {deep: true};
						var items = self._getItems(data,request);
						scope = keywordArgs.scope || kernel.global;
						if(items.length === 1){
							if(keywordArgs.onItem){
								keywordArgs.onItem.call(scope, items[0]);
							}
						}else if(items.length === 0){
							if(keywordArgs.onItem){
								keywordArgs.onItem.call(scope, null);
							}
						}else{
							if(keywordArgs.onError){
								keywordArgs.onError.call(scope, new Error("Items array size for identity lookup greater than 1, invalid keyAttribute."));
							}
						}
					}else{
						//Since dojo.query doesn't really support the functions needed
						//to do child node selection on IE well and since xpath support
						//is flakey across browsers, it's simpler to implement a
						//pseudo-xpath parser here.
						var qArgs = keywordArgs.identity.split("/");
						var i;
						var node = data;
						for(i = 0; i < qArgs.length; i++){
							if(qArgs[i] && qArgs[i] !== ""){
								var section = qArgs[i];
								section = section.substring(0,section.length - 1);
								var vals = section.split("[");
								var tag = vals[0];
								var index = parseInt(vals[1], 10);
								var pos = 0;
								if(node){
									var cNodes = node.childNodes;
									if(cNodes){
										var j;
										var foundNode = null;
										for(j = 0; j < cNodes.length; j++){
											var pNode = cNodes[j];
											if(pNode.nodeName === tag){
												if(pos < index){
													pos++;
												}else{
													foundNode = pNode;
													break;
												}
											}
										}
										if(foundNode){
											node = foundNode;
										}else{
											node = null;
										}
									}else{
										node = null;
									}
								}else{
									break;
								}
							}
						}
						//Return what we found, if any.
						var item = null;
						if(node){
							item = self._getItem(node);
							if(item.element.parentNode){
								item.element.parentNode.removeChild(item.element);
							}
						}
						if(keywordArgs.onItem){
							scope = keywordArgs.scope || kernel.global;
							keywordArgs.onItem.call(scope, item);
						}
					}
				}
			};
			url = this._getFetchUrl(null);
			getArgs = {
				url: url,
				handleAs: "xml",
				preventCache: self.urlPreventCache
			};
			getHandler = xhr.get(getArgs);
			
			//Add in the callbacks for completion of data load.
			getHandler.addCallback(handleDocument);
			if(keywordArgs.onError){
				getHandler.addErrback(function(error){
					var s = keywordArgs.scope || kernel.global;
					keywordArgs.onError.call(s, error);
				});
			}
		}else{
			//Server side querying, so need to pass the keyAttribute back to the server and let it return
			//what it will.  It SHOULD be only one item.
			if(self.keyAttribute !== ""){
				var request = {query:{}};
				request.query[self.keyAttribute] = keywordArgs.identity;
				url = this._getFetchUrl(request);
				handleDocument = function(data){
					var item = null;
					if(data){
						var items = self._getItems(data, {});
						if(items.length === 1){
							item = items[0];
						}else{
							if(keywordArgs.onError){
								var scope = keywordArgs.scope || kernel.global;
								keywordArgs.onError.call(scope, new Error("More than one item was returned from the server for the denoted identity"));
							}
						}
					}
					if(keywordArgs.onItem){
						scope = keywordArgs.scope || kernel.global;
						keywordArgs.onItem.call(scope, item);
					}
				};

				getArgs = {
					url: url,
					handleAs: "xml",
					preventCache: self.urlPreventCache
				};
				getHandler = xhr.get(getArgs);

				//Add in the callbacks for completion of data load.
				getHandler.addCallback(handleDocument);
				if(keywordArgs.onError){
					getHandler.addErrback(function(error){
						var s = keywordArgs.scope || kernel.global;
						keywordArgs.onError.call(s, error);
					});
				}
			}else{
				if(keywordArgs.onError){
					var s = keywordArgs.scope || kernel.global;
					keywordArgs.onError.call(s, new Error("XmlStore is not told that the server to provides identity support.  No keyAttribute specified."));
				}
			}
		}
	}
});

lang.extend(XmlStore,simpleFetch);

return XmlStore;
});
