define(["dojo/_base/lang","dojo/_base/declare", "dojo/_base/connect", "dojo/io/script", "dojo/data/util/simpleFetch", "dojo/date/stamp"], 
  function(lang, declare, connect, scriptIO, simpleFetch, dateStamp) {

var PicasaStore = declare("dojox.data.PicasaStore", null, {
	constructor: function(/*Object*/args){
		// summary:
		//		Initializer for the PicasaStore store.
		// description:
		//		The PicasaStore is a Datastore interface to one of the basic services
		//		of the Picasa service, the public photo feed.  This does not provide
		//		access to all the services of Picasa.
		//		This store cannot do * and ? filtering as the picasa service
		//		provides no interface for wildcards.
		if(args && args.label){
			this.label = args.label;
		}
		if(args && "urlPreventCache" in args){
			this.urlPreventCache = args.urlPreventCache?true:false;
		}
		if(args && "maxResults" in args){
			this.maxResults = parseInt(args.maxResults);
			if(!this.maxResults){
				this.maxResults = 20;
			}
		}
	},

	_picasaUrl: "http://picasaweb.google.com/data/feed/api/all",

	_storeRef: "_S",

	// label: string
	//		The attribute to use from the picasa item as its label.
	label: "title",

	// urlPreventCache: boolean
	//		Flag denoting if preventCache should be passed to io.script.
	urlPreventCache: false,

	// maxResults: Number
	//		Define out how many results to return for a fetch.
	maxResults: 20,

	_assertIsItem: function(/* item */ item){
		// summary:
		//		This function tests whether the item passed in is indeed an item in the store.
		// item:
		//		The item to test for being contained by the store.
		if(!this.isItem(item)){
			throw new Error("dojox.data.PicasaStore: a function was passed an item argument that was not an item");
		}
	},

	_assertIsAttribute: function(/* attribute-name-string */ attribute){
		// summary:
		//		This function tests whether the item passed in is indeed a valid 'attribute' like type for the store.
		// attribute:
		//		The attribute to test for being contained by the store.
		if(typeof attribute !== "string"){
			throw new Error("dojox.data.PicasaStore: a function was passed an attribute argument that was not an attribute name string");
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
		if(values && values.length > 0){
			return values[0];
		}
		return defaultValue;
	},

	getAttributes: function(item){
		// summary:
		//		See dojo/data/api/Read.getAttributes()
		return ["id", "published", "updated", "category", "title$type", "title",
			"summary$type", "summary", "rights$type", "rights", "link", "author",
			"gphoto$id", "gphoto$name", "location", "imageUrlSmall", "imageUrlMedium",
			"imageUrl", "datePublished", "dateTaken","description"];
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
		if(attribute === "title"){
			return [this._unescapeHtml(item.title)];
		}else if(attribute === "author"){
			return [this._unescapeHtml(item.author[0].name)];
		}else if(attribute === "datePublished"){
			return [dateAtamp.fromISOString(item.published)];
		}else if(attribute === "dateTaken"){
			return [dateStamp.fromISOString(item.published)];
		}else if(attribute === "updated"){
			return [dateStamp.fromISOString(item.updated)];
		}else if(attribute === "imageUrlSmall"){
			return [item.media.thumbnail[1].url];
		}else if(attribute === "imageUrl"){
			return [item.content$src];
		}else if(attribute === "imageUrlMedium"){
			return [item.media.thumbnail[2].url];
		}else if(attribute === "link"){
			return [item.link[1]];
		}else if(attribute === "tags"){
			return item.tags.split(" ");
		}else if(attribute === "description"){
			return [this._unescapeHtml(item.summary)];
		}
		return [];
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

	_fetchItems: function(request, fetchHandler, errorHandler){
		// summary:
		//		Fetch picasa items that match to a query
		// request:
		//		A request object
		// fetchHandler:
		//		A function to call for fetched items
		// errorHandler:
		//		A function to call on error

		if(!request.query){
			request.query={};
		}

		//Build up the content to send the request for.
		var content = {alt: "jsonm", pp: "1", psc: "G"};

		content['start-index'] = "1";
		if(request.query.start){
			content['start-index'] = request.query.start;
		}
		if(request.query.tags){
			content.q = request.query.tags;
		}
		if(request.query.userid){
			content.uname = request.query.userid;
		}
		if(request.query.userids){
			content.ids = request.query.userids;
		}
		if(request.query.lang){
			content.hl = request.query.lang;
		}
		content['max-results'] = this.maxResults;

		//Linking this up to Picasa is a JOY!
		var self = this;
		var handle = null;
		var myHandler = function(data){
			if(handle !== null){
				connect.disconnect(handle);
			}

			//Process the items...
			fetchHandler(self._processPicasaData(data), request);
		};
		var getArgs = {
			url: this._picasaUrl,
			preventCache: this.urlPreventCache,
			content: content,
			callbackParamName: 'callback',
			handle: myHandler
		};
		var deferred = scriptIO.get(getArgs);
		
		deferred.addErrback(function(error){
			connect.disconnect(handle);
			errorHandler(error, request);
		});
	},

	_processPicasaData: function(data){
		var items = [];
		if(data.feed){
			items = data.feed.entry;
			//Add on the store ref so that isItem can work.
			for(var i = 0; i < items.length; i++){
				var item = items[i];
				item[this._storeRef] = this;
			}
		}
		return items;
	},

	_unescapeHtml: function(str){
		// summary:
		//		Utility function to un-escape XML special characters in an HTML string.
		// description:
		//		Utility function to un-escape XML special characters in an HTML string.
		// str: String
		//		The string to un-escape
		// returns:
		//		HTML String converted back to the normal text (unescaped) characters (<,>,&, ", etc,).

		// TODO: Check to see if theres already compatible escape() in dojo.string or dojo.html
		if(str){
			str = str.replace(/&amp;/gm, "&").replace(/&lt;/gm, "<").replace(/&gt;/gm, ">").replace(/&quot;/gm, "\"");
			str = str.replace(/&#39;/gm, "'");
		}
		return str;
	}
});
lang.extend(PicasaStore, simpleFetch);

return PicasaStore;

});
