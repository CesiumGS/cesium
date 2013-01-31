define([
	"dojo/_base/kernel", // dojo.experimental
	"dojo/_base/lang", // dojo.extend
	"dojo/_base/declare", // declare
	"dojo/_base/xhr", // dojo.xhrGet
	"dojo/_base/array", // dojo.forEach
	"dojo/_base/window", // dojo.doc
	"dojo/query",
	"dojo/data/util/simpleFetch",
	"dojox/xml/parser"], function (kernel, lang, declare, dxhr, array, window, query, simpleFetch, parser) {
kernel.experimental("dojox.data.OpenSearchStore");

var OpenSearchStore = declare("dojox.data.OpenSearchStore", null, {
	constructor: function(/*Object*/args){
		// summary:
		//		Initializer for the OpenSearchStore store.
		// description:
		//		The OpenSearchStore is a Datastore interface to any search
		//		engine that implements the open search specifications.
		if(args){
			this.label = args.label;
			this.url = args.url;
			this.itemPath = args.itemPath;
			if("urlPreventCache" in args){
				this.urlPreventCache = args.urlPreventCache?true:false;
			}
		}
		var def = dxhr.get({
			url: this.url,
			handleAs: "xml",
			sync: true,
			preventCache: this.urlPreventCache
		});
		def.addCallback(this, "_processOsdd");
		def.addErrback(function(){
			throw new Error("Unable to load OpenSearch Description document from " . args.url);
		});
	},
	
	// URL to the open search description document
	url: "",
	itemPath: "",
	_storeRef: "_S",
	urlElement: null,
	iframeElement: null,

	// urlPreventCache: boolean
	//		Flag denoting if xhrGet calls should use the preventCache option.
	urlPreventCache: true,
	
	ATOM_CONTENT_TYPE: 3,
	ATOM_CONTENT_TYPE_STRING: "atom",
	RSS_CONTENT_TYPE: 2,
	RSS_CONTENT_TYPE_STRING: "rss",
	XML_CONTENT_TYPE: 1,
	XML_CONTENT_TYPE_STRING: "xml",

	_assertIsItem: function(/* item */ item){
		// summary:
		//		This function tests whether the item passed in is indeed an item in the store.
		// item:
		//		The item to test for being contained by the store.
		if(!this.isItem(item)){
			throw new Error("dojox.data.OpenSearchStore: a function was passed an item argument that was not an item");
		}
	},

	_assertIsAttribute: function(/* attribute-name-string */ attribute){
		// summary:
		//		This function tests whether the item passed in is indeed a valid 'attribute' like type for the store.
		// attribute:
		//		The attribute to test for being contained by the store.
		if(typeof attribute !== "string"){
			throw new Error("dojox.data.OpenSearchStore: a function was passed an attribute argument that was not an attribute name string");
		}
	},

	getFeatures: function(){
		// summary:
		//		See dojo/data/api/Read.getFeatures()
		return {
			'dojo.data.api.Read': true
		};
	},

	getValue: function(item, attribute, defaultValue){
		// summary:
		//		See dojo/data/api/Read.getValue()
		var values = this.getValues(item, attribute);
		if(values){
			return values[0];
		}
		return defaultValue;
	},

	getAttributes: function(item){
		// summary:
		//		See dojo/data/api/Read.getAttributes()
		return ["content"];
	},

	hasAttribute: function(item, attribute){
		// summary:
		//		See dojo/data/api/Read.hasAttributes()
		if(this.getValue(item,attribute)){
			return true;
		}
		return false;
	},

	isItemLoaded: function(item){
		// summary:
		//		See dojo/data/api/Read.isItemLoaded()
		return this.isItem(item);
	},

	loadItem: function(keywordArgs){
		// summary:
		//		See dojo/data/api/Read.loadItem()
	},

	getLabel: function(item){
		// summary:
		//		See dojo/data/api/Read.getLabel()
		return undefined;
	},
	
	getLabelAttributes: function(item){
		// summary:
		//		See dojo/data/api/Read.getLabelAttributes()
		return null;
	},

	containsValue: function(item, attribute, value){
		// summary:
		//		See dojo/data/api/Read.containsValue()
		var values = this.getValues(item,attribute);
		for(var i = 0; i < values.length; i++){
			if(values[i] === value){
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
		var value = this.processItem(item, attribute);
		if(value){
			return [value];
		}
		return undefined;
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
	
	process: function(data){
		// This should return an array of items.  This would be the function to override if the
		// developer wanted to customize the processing/parsing of the entire batch of search
		// results.
		return this["_processOSD"+this.contentType](data);
	},
	
	processItem: function(item, attribute){
		// This returns the text that represents the item.  If a developer wanted to customize
		// how an individual item is rendered/parsed, they'd override this function.
		return this["_processItem"+this.contentType](item.node, attribute);
	},
	
	_createSearchUrl: function(request){
		var template = this.urlElement.attributes.getNamedItem("template").nodeValue;
		var attrs = this.urlElement.attributes;
		var index = template.indexOf("{searchTerms}");
		template = template.substring(0, index) + request.query.searchTerms + template.substring(index+13);
		
		array.forEach([	{'name': 'count', 'test': request.count, 'def': '10'},
						{'name': 'startIndex', 'test': request.start, 'def': this.urlElement.attributes.getNamedItem("indexOffset")?this.urlElement.attributes.getNamedItem("indexOffset").nodeValue:0},
						{'name': 'startPage', 'test': request.startPage, 'def': this.urlElement.attributes.getNamedItem("pageOffset")?this.urlElement.attributes.getNamedItem("pageOffset").nodeValue:0},
						{'name': 'language', 'test': request.language, 'def': "*"},
						{'name': 'inputEncoding', 'test': request.inputEncoding, 'def': 'UTF-8'},
						{'name': 'outputEncoding', 'test': request.outputEncoding, 'def': 'UTF-8'}
					], function(item){
			template = template.replace('{'+item.name+'}', item.test || item.def);
			template = template.replace('{'+item.name+'?}', item.test || item.def);
		});
		return template;
	},

	_fetchItems: function(request, fetchHandler, errorHandler){
		// summary:
		//		Fetch OpenSearch items that match to a query
		// request:
		//		A request object
		// fetchHandler:
		//		A function to call for fetched items
		// errorHandler:
		//		A function to call on error

		if(!request.query){
			request.query={};
		}

		//Build up the content using information from the request
		var self = this;
		var url = this._createSearchUrl(request);
		var getArgs = {
			url: url,
			preventCache: this.urlPreventCache
		};

		// Change to fetch the query results.
		var xhr = dxhr.get(getArgs);

		xhr.addErrback(function(error){
			errorHandler(error, request);
		});

		xhr.addCallback(function(data){
			var items = [];
			if(data){
				//Process the items...
				items = self.process(data);
				for(var i=0; i < items.length; i++){
					items[i] = {node: items[i]};
					items[i][self._storeRef] = self;
				}
			}
			fetchHandler(items, request);
		});
	},
	
	_processOSDxml: function(data){
		var div = window.doc.createElement("div");
		div.innerHTML = data;
		return query(this.itemPath, div);
	},
	
	_processItemxml: function(item, attribute){
		if(attribute === "content"){
			return item.innerHTML;
		}
		return undefined;
	},
	
	_processOSDatom: function(data){
		return this._processOSDfeed(data, "entry");
	},

	_processItematom: function(item, attribute){
		return this._processItemfeed(item, attribute, "content");
	},

	_processOSDrss: function(data){
		return this._processOSDfeed(data, "item");
	},

	_processItemrss: function(item, attribute){
		return this._processItemfeed(item, attribute, "description");
	},

	_processOSDfeed: function(data, type){
		data = dojox.xml.parser.parse(data);
		var items = [];
		var nodeList = data.getElementsByTagName(type);
		for(var i=0; i<nodeList.length; i++){
			items.push(nodeList.item(i));
		}
		return items;
	},

	_processItemfeed: function(item, attribute, type){
		if(attribute === "content"){
			var content = item.getElementsByTagName(type).item(0);
			return this._getNodeXml(content, true);
		}
		return undefined;
	},
	
	_getNodeXml: function(node, skipFirst){
		var i;
		switch(node.nodeType){
			case 1:
				var xml = [];
				if(!skipFirst){
					xml.push("<"+node.tagName);
					var attr;
					for(i=0; i<node.attributes.length; i++){
						attr = node.attributes.item(i);
						xml.push(" "+attr.nodeName+"=\""+attr.nodeValue+"\"");
					}
					xml.push(">");
				}
				for(i=0; i<node.childNodes.length; i++){
					xml.push(this._getNodeXml(node.childNodes.item(i)));
				}
				if(!skipFirst){
					xml.push("</"+node.tagName+">\n");
				}
				return xml.join("");
			case 3:
			case 4:
				return node.nodeValue;
		}
		return undefined;
	},

	_processOsdd: function(doc){
		var urlnodes = doc.getElementsByTagName("Url");
		//TODO: Check all the urlnodes and determine what our best one is...
		var types = [];
		var contentType;
		var i;
		for(i=0; i<urlnodes.length; i++){
			contentType = urlnodes[i].attributes.getNamedItem("type").nodeValue;
			switch(contentType){
				case "application/rss+xml":
					types[i] = this.RSS_CONTENT_TYPE;
					break;
				case "application/atom+xml":
					types[i] = this.ATOM_CONTENT_TYPE;
					break;
				default:
					types[i] = this.XML_CONTENT_TYPE;
					break;
			}
		}
		var index = 0;
		var currentType = types[0];
		for(i=1; i<urlnodes.length; i++){
			if(types[i]>currentType){
				index = i;
				currentType = types[i];
			}
		}

		// We'll be using urlnodes[index] as it's the best option (ATOM > RSS > XML)
		var label = urlnodes[index].nodeName.toLowerCase();
		if(label == 'url'){
			var urlattrs = urlnodes[index].attributes;
			this.urlElement = urlnodes[index];
			switch(types[index]){
				case this.ATOM_CONTENT_TYPE:
					this.contentType = this.ATOM_CONTENT_TYPE_STRING;
					break;
				case this.RSS_CONTENT_TYPE:
					this.contentType = this.RSS_CONTENT_TYPE_STRING;
					break;
				case this.XML_CONTENT_TYPE:
					this.contentType = this.XML_CONTENT_TYPE_STRING;
					break;
			}
		}
	}
});
return lang.extend(OpenSearchStore,simpleFetch);
});
