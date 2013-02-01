define(["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/array", "dojo/data/util/simpleFetch", "dojo/io/script", 
		"dojo/_base/connect", "dojo/date/stamp", "dojo/AdapterRegistry"], 
  function(lang, declare, array, simpleFetch, scriptIO, connect, dateStamp, AdapterRegistry) {

var FlickrStore = declare("dojox.data.FlickrStore", null, {
	constructor: function(/*Object*/args){
		// summary:
		//		Initializer for the FlickrStore store.
		// description:
		//		The FlickrStore is a Datastore interface to one of the basic services
		//		of the Flickr service, the public photo feed.  This does not provide
		//		access to all the services of Flickr.
		//		This store cannot do * and ? filtering as the flickr service
		//		provides no interface for wildcards.
		if(args && args.label){
			this.label = args.label;
		}
		if(args && "urlPreventCache" in args){
			this.urlPreventCache = args.urlPreventCache?true:false;
		}
	},

	_storeRef: "_S",

	label: "title",

	//Flag to allor control of if cache prevention is enabled or not.
	urlPreventCache: true,

	_assertIsItem: function(/* item */ item){
		// summary:
		//		This function tests whether the item passed in is indeed an item in the store.
		// item:
		//		The item to test for being contained by the store.
		if(!this.isItem(item)){
			throw new Error("dojox.data.FlickrStore: a function was passed an item argument that was not an item");
		}
	},

	_assertIsAttribute: function(/* attribute-name-string */ attribute){
		// summary:
		//		This function tests whether the item passed in is indeed a valid 'attribute' like type for the store.
		// attribute:
		//		The attribute to test for being contained by the store.
		if(typeof attribute !== "string"){
			throw new Error("dojox.data.FlickrStore: a function was passed an attribute argument that was not an attribute name string");
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
		return [
			"title", "description", "author", "datePublished", "dateTaken",
			"imageUrl", "imageUrlSmall", "imageUrlMedium", "tags", "link"
		];
	},

	hasAttribute: function(item, attribute){
		// summary:
		//		See dojo/data/api/Read.hasAttributes()
		var v = this.getValue(item,attribute);
		if(v || v === "" || v === false){
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
		var u = lang.hitch(this, "_unescapeHtml");
		var s = lang.hitch(dateStamp, "fromISOString");
		switch(attribute){
			case "title":
				return [ u(item.title) ];
			case "author":
				return [ u(item.author) ];
			case "datePublished":
				return [ s(item.published) ];
			case "dateTaken":
				return [ s(item.date_taken) ];
			case "imageUrlSmall":
				return [ item.media.m.replace(/_m\./, "_s.") ];
			case "imageUrl":
				return [ item.media.m.replace(/_m\./, ".") ];
			case "imageUrlMedium":
				return [ item.media.m ];
			case "link":
				return [ item.link ];
			case "tags":
				return item.tags.split(" ");
			case "description":
				return [ u(item.description) ];
			default:
				return [];
		}
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
		//		Fetch flickr items that match to a query
		// request:
		//		A request object
		// fetchHandler:
		//		A function to call for fetched items
		// errorHandler:
		//		A function to call on error

		var rq = request.query = request.query || {};

		//Build up the content to send the request for.
		var content = {
			format: "json",
			tagmode:"any"
		};

		array.forEach(
			[ "tags", "tagmode", "lang", "id", "ids" ],
			function(i){
				if(rq[i]){ content[i] = rq[i]; }
			}
		);

		content.id = rq.id || rq.userid || rq.groupid;

		if(rq.userids){
			content.ids = rq.userids;
		}

		//Linking this up to Flickr is a PAIN!
		var handle = null;
		var getArgs = {
			url: dojox.data.FlickrStore.urlRegistry.match(request),
			preventCache: this.urlPreventCache,
			content: content
		};
		var myHandler = lang.hitch(this, function(data){
			if(!!handle){
				connect.disconnect(handle);
			}

			//Process the items...
			fetchHandler(this._processFlickrData(data), request);
		});
		handle = connect.connect("jsonFlickrFeed", myHandler);
		var deferred = scriptIO.get(getArgs);
		
		//We only set up the errback, because the callback isn't ever really used because we have
		//to link to the jsonFlickrFeed function....
		deferred.addErrback(function(error){
			connect.disconnect(handle);
			errorHandler(error, request);
		});
	},

	_processFlickrData: function(data){
		var items = [];
		if(data.items){
			items = data.items;
			//Add on the store ref so that isItem can work.
			for(var i = 0; i < data.items.length; i++){
				var item = data.items[i];
				item[this._storeRef] = this;
			}
		}
		return items;
	},

	_unescapeHtml: function(/*String*/ str){
		// summary:
		//		Utility function to un-escape XML special characters in an
		//		HTML string.
		// str: String.
		//		The string to un-escape
		// returns:
		//		HTML String converted back to the normal text (unescaped)
		//		characters (<,>,&, ", etc,).

		//TODO:
		//		Check to see if theres already compatible escape() in
		//		dojo.string or dojo.html
		return	str.replace(/&amp;/gm, "&").
					replace(/&lt;/gm, "<").
					replace(/&gt;/gm, ">").
					replace(/&quot;/gm, "\"").
					replace(/&#39;/gm, "'");
	}
});

lang.extend(FlickrStore, simpleFetch);

var feedsUrl = "http://api.flickr.com/services/feeds/";

var reg = FlickrStore.urlRegistry = new AdapterRegistry(true);

reg.register("group pool",
	function(request){ return !!request.query["groupid"]; },
	feedsUrl+"groups_pool.gne"
);

reg.register("default",
	function(request){ return true; },
	feedsUrl+"photos_public.gne"
);

//We have to define this because of how the Flickr API works.
//This somewhat stinks, but what can you do?
if(!jsonFlickrFeed){
	var jsonFlickrFeed = function(data){};
}

return FlickrStore;
});
