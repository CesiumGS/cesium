define(["dojo/_base/kernel", "dojo/_base/lang", "dojo/_base/declare", "dojo/_base/query",
		"dojo/dom-construct","dojo/io/script"], 
  function(kernel, lang, declare, domQuery, domConstruct, scriptIO) {

kernel.experimental("dojox.data.GoogleSearchStore");

var SearchStore = declare("dojox.data.GoogleSearchStore",null,{
	// summary:
	//		A data store for retrieving search results from Google.
	//		This data store acts as a base class for Google searches,
	//		and has a number of child data stores that implement different
	//		searches. This store defaults to searching the web, and is functionally
	//		identical to the dojox.data.GoogleWebSearchStore object.
	//		The following attributes are supported on each item:
	//
	//		- url - The URL for the item
	//		- unescapedUrl - The URL for the item, with URL escaping. This is often more readable
	//		- visibleUrl - The URL with no protocol specified.
	//		- cacheUrl - The URL to the copy of the document cached by Google
	//		- title - The page title in HTML format.
	//		- titleNoFormatting - The page title in plain text
	//		- content - A snippet of information about the page
	//
	//		The query accepts one parameter: text - The string to search for
	constructor: function(/*Object*/args){
		// summary:
		//		Initializer for the GoogleSearchStore store.
		// description:
		//		The GoogleSearchStore is a Datastore interface to
		//		the Google search service. The constructor accepts the following arguments:
		//
		//		- label - the label attribute to use. Defaults to titleNoFormatting
		//		- key - The API key to use. This is optional
		//		- lang - The language locale to use. Defaults to the browser locale

		if(args){
			if(args.label){
				this.label = args.label;
			}
			if(args.key){
				this._key = args.key;
			}
			if(args.lang){
				this._lang = args.lang;
			}
			if("urlPreventCache" in args){
				this.urlPreventCache = args.urlPreventCache?true:false;
			}
		}
		this._id = dojox.data.GoogleSearchStore.prototype._id++;
	},

	// _id: Integer
	//		A unique identifier for this store.
	_id: 0,

	// _requestCount: Integer
	//		A counter for the number of requests made. This is used to define
	//		the callback function that GoogleSearchStore will use.
	_requestCount: 0,

	// _googleUrl: String
	//		The URL to Googles search web service.
	_googleUrl: "http://ajax.googleapis.com/ajax/services/search/",

	// _storeRef: String
	//		The internal reference added to each item pointing at the store which owns it.
	_storeRef: "_S",

	// _attributes: Array
	//		The list of attributes that this store supports
	_attributes: [	"unescapedUrl", "url", "visibleUrl", "cacheUrl", "title",
			"titleNoFormatting", "content", "estimatedResultCount"],

	// _aggregtedAttributes: Hash
	//		Maps per-query aggregated attributes that this store supports to the result keys that they come from.
	_aggregatedAttributes: {
		estimatedResultCount: "cursor.estimatedResultCount"
	},

	// label: String
	//		The default attribute which acts as a label for each item.
	label: "titleNoFormatting",

	// type: String
	//		The type of search. Valid values are "web", "local", "video", "blogs", "news", "books", "images".
	//		This should not be set directly. Instead use one of the child classes.
	_type: "web",

	// urlPreventCache: boolean
	//		Sets whether or not to pass preventCache to dojo.io.script.
	urlPreventCache: true,


	// _queryAttrs: Hash
	//		Maps query hash keys to Google query parameters.
	_queryAttrs: {
		text: 'q'
	},

	_assertIsItem: function(/* item */ item){
		// summary:
		//		This function tests whether the item passed in is indeed an item in the store.
		// item:
		//		The item to test for being contained by the store.
		if(!this.isItem(item)){
			throw new Error("dojox.data.GoogleSearchStore: a function was passed an item argument that was not an item");
		}
	},

	_assertIsAttribute: function(/* attribute-name-string */ attribute){
		// summary:
		//		This function tests whether the item passed in is indeed a valid 'attribute' like type for the store.
		// attribute:
		//		The attribute to test for being contained by the store.
		if(typeof attribute !== "string"){
			throw new Error("dojox.data.GoogleSearchStore: a function was passed an attribute argument that was not an attribute name string");
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
		return this._attributes;
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
		var val = item[attribute];
		if(lang.isArray(val)) {
			return val;
		}else if(val !== undefined){
			return [val];
		}else{
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

	_format: function(item, name){
		return item;//base implementation does not format any items
	},

	fetch: function(request){
		// summary:
		//		Fetch Google search items that match to a query
		// request:
		//		A request object
		// fetchHandler:
		//		A function to call for fetched items
		// errorHandler:
		//		A function to call on error
		request = request || {};

		var scope = request.scope || kernel.global;

		if(!request.query){
			if(request.onError){
				request.onError.call(scope, new Error(this.declaredClass +
					": A query must be specified."));
				return;
			}
		}
		//Make a copy of the request object, in case it is
		//modified outside the store in the middle of a request
		var query = {};
		for(var attr in this._queryAttrs) {
			query[attr] = request.query[attr];
		}
		request = {
			query: query,
			onComplete: request.onComplete,
			onError: request.onError,
			onItem: request.onItem,
			onBegin: request.onBegin,
			start: request.start,
			count: request.count
		};

		//Google's web api will only return a max of 8 results per page.
		var pageSize = 8;

		//Generate a unique function to be called back
		var callbackFn = "GoogleSearchStoreCallback_" + this._id + "_" + (++this._requestCount);

		//Build up the content to send the request for.
		//rsz is the result size, "large" gives 8 results each time
		var content = this._createContent(query, callbackFn, request);

		var firstRequest;

		if(typeof(request.start) === "undefined" || request.start === null){
			request.start = 0;
		}

		if(!request.count){
			request.count = pageSize;
		}
		firstRequest = {start: request.start - request.start % pageSize};

		var _this = this;
		var searchUrl = this._googleUrl + this._type;

		var getArgs = {
			url: searchUrl,
			preventCache: this.urlPreventCache,
			content: content
		};

		var items = [];
		var successfulReq = 0;
		var finished = false;
		var lastOnItem = request.start -1;
		var numRequests = 0;
		var scriptIds = [];

		// Performs the remote request.
		function doRequest(req){
			//Record how many requests have been made.
			numRequests ++;
			getArgs.content.context = getArgs.content.start = req.start;

			var deferred = scriptIO.get(getArgs);
			scriptIds.push(deferred.ioArgs.id);

			//We only set up the errback, because the callback isn't ever really used because we have
			//to link to the jsonp callback function....
			deferred.addErrback(function(error){
				if(request.onError){
					request.onError.call(scope, error, request);
				}
			});
		}

		// Function to handle returned data.
		var myHandler = function(start, data){
			if (scriptIds.length > 0) {
				// Delete the script node that was created.
				domQuery("#" + scriptIds.splice(0,1)).forEach(domConstruct.destroy);
			}
			if(finished){return;}

			var results = _this._getItems(data);
			var cursor = data ? data['cursor']: null;

			if(results){
				//Process the results, adding the store reference to them
				for(var i = 0; i < results.length && i + start < request.count + request.start; i++) {
					_this._processItem(results[i], data);
					items[i + start] = results[i];
				}
				successfulReq ++;
				if(successfulReq == 1){
					// After the first request, we know how many results exist.
					// So perform any follow up requests to retrieve more data.
					var pages = cursor ? cursor.pages : null;
					var firstStart = pages ? Number(pages[pages.length - 1].start) : 0;

					//Call the onBegin method if it exists
					if (request.onBegin){
						var est = cursor ? cursor.estimatedResultCount : results.length;
						var total =  est ? Math.min(est, firstStart + results.length) : firstStart + results.length;
						request.onBegin.call(scope, total, request);
					}

					// Request the next pages.
					var nextPage = (request.start - request.start % pageSize) + pageSize;
					var page = 1;
					while(pages){
						if(!pages[page] || Number(pages[page].start) >= request.start + request.count){
							break;
						}
						if(Number(pages[page].start) >= nextPage) {
							doRequest({start: pages[page].start});
						}
						page++;
					}
				}

				// Call the onItem function on all retrieved items.
				if(request.onItem && items[lastOnItem + 1]){
					do{
						lastOnItem++;
						request.onItem.call(scope, items[lastOnItem], request);
					}while(items[lastOnItem + 1] && lastOnItem < request.start + request.count);
				}

				//If this is the last request, call final fetch handler.
				if(successfulReq == numRequests){
					//Process the items...
					finished = true;
					//Clean up the function, it should never be called again
					kernel.global[callbackFn] = null;
					if(request.onItem){
						request.onComplete.call(scope, null, request);
					}else{
						items = items.slice(request.start, request.start + request.count);
						request.onComplete.call(scope, items, request);
					}

				}
			}
		};

		var callbacks = [];
		var lastCallback = firstRequest.start - 1;

		// Attach a callback function to the global namespace, where Google can call it.
		kernel.global[callbackFn] = function(start, data, responseCode, errorMsg){
			try {
				if(responseCode != 200){
					if(request.onError){
						request.onError.call(scope, new Error("Response from Google was: " + responseCode), request);
					}
					kernel.global[callbackFn] = function(){};//an error occurred, do not return anything else.
					return;
				}
	
				if(start == lastCallback + 1){
					myHandler(Number(start), data);
					lastCallback += pageSize;
	
					//make sure that the callbacks happen in the correct sequence
					if(callbacks.length > 0){
						callbacks.sort(_this._getSort());
						//In case the requsts do not come back in order, sort the returned results.
						while(callbacks.length > 0 && callbacks[0].start == lastCallback + 1){
							myHandler(Number(callbacks[0].start), callbacks[0].data);
							callbacks.splice(0,1);
							lastCallback += pageSize;
						}
					}
				}else{
					callbacks.push({start:start, data: data});
				}
			} catch (e) {
				request.onError.call(scope, e, request);
			}
		};

		// Perform the first request. When this has finished
		// we will have a list of pages, which can then be
		// gone through
		doRequest(firstRequest);
	},
	
	_getSort: function() {
		return function(a,b){
			if(a.start < b.start){return -1;}
			if(b.start < a.start){return 1;}
			return 0;
		};
	},

	_processItem: function(item, data) {
		item[this._storeRef] = this;
		// Copy aggregated attributes from query results to the item.
		for(var attribute in this._aggregatedAttributes) {
			item[attribute] = lang.getObject(this._aggregatedAttributes[attribute], false, data);
		}
	},

	_getItems: function(data){
		return data['results'] || data;
	},

	_createContent: function(query, callback, request){
		var content = {
			v: "1.0",
			rsz: "large",
			callback: callback,
			key: this._key,
			hl: this._lang
		};
		for(var attr in this._queryAttrs) {
			content[this._queryAttrs[attr]] = query[attr];
		}
		return content;
	}
});

var WebSearchStore = declare("dojox.data.GoogleWebSearchStore", SearchStore,{
	// summary:
	//		A data store for retrieving search results from Google.
	//		The following attributes are supported on each item:
	//
	//		- title - The page title in HTML format.
	//		- titleNoFormatting - The page title in plain text
	//		- content - A snippet of information about the page
	//		- url - The URL for the item
	//		- unescapedUrl - The URL for the item, with URL escaping. This is often more readable
	//		- visibleUrl - The URL with no protocol specified.
	//		- cacheUrl - The URL to the copy of the document cached by Google
	//		- estimatedResultCount - (aggregated per-query) estimated number of results
	//
	//		The query accepts one parameter: text - The string to search for
});

var BlogSearchStore = declare("dojox.data.GoogleBlogSearchStore", SearchStore,{
	// summary:
	//		A data store for retrieving search results from Google.
	//		The following attributes are supported on each item:
	//
	//		- title - The blog post title in HTML format.
	//		- titleNoFormatting - The  blog post title in plain text
	//		- content - A snippet of information about the blog post
	//		- blogUrl - The URL for the blog
	//		- postUrl - The URL for the a single blog post
	//		- visibleUrl - The URL with no protocol specified.
	//		- cacheUrl - The URL to the copy of the document cached by Google
	//		- author - The author of the blog post
	//		- publishedDate - The published date, in RFC-822 format
	//
	//		The query accepts one parameter: text - The string to search for
	_type: "blogs",
	_attributes: ["blogUrl", "postUrl", "title", "titleNoFormatting", "content",
			"author", "publishedDate"],
	_aggregatedAttributes: { }
});


var LocalSearchStore = declare("dojox.data.GoogleLocalSearchStore", SearchStore,{
	// summary:
	//		A data store for retrieving search results from Google.
	//		The following attributes are supported on each item:
	//
	//		- title - The blog post title in HTML format.
	//		- titleNoFormatting - The  blog post title in plain text
	//		- content - A snippet of information about the blog post
	//		- url - The URL for the item
	//		- lat - The latitude.
	//		- lng - The longtitude.
	//		- streetAddress - The street address
	//		- city - The city
	//		- region - The region
	//		- country - The country
	//		- phoneNumbers - Phone numbers associated with this address. Can be one or more.
	//		- ddUrl - A URL that can be used to provide driving directions from the center of the search results to this search results
	//		- ddUrlToHere - A URL that can be used to provide driving directions from this search result to a user specified location
	//		- staticMapUrl - The published date, in RFC-822 format
	//		- viewport - Recommended viewport for the query results (same for all results in a query)
	//			- center - contains lat, lng properties
	//			- span - lat, lng properties for the viewport span
	//			- ne, sw - lat, lng properties for the viewport corners
	//
	//		The query accepts the following parameters:
	//
	//		- text - The string to search for
	//		- centerLatLong - Comma-separated lat & long for the center of the search (e.g. "48.8565,2.3509")
	//		- searchSpan - Comma-separated lat & long degrees indicating the size of the desired search area (e.g. "0.065165,0.194149")

	_type: "local",
	_attributes: ["title", "titleNoFormatting", "url", "lat", "lng", "streetAddress",
			"city", "region", "country", "phoneNumbers", "ddUrl", "ddUrlToHere",
			"ddUrlFromHere", "staticMapUrl", "viewport"],
	_aggregatedAttributes: {
		viewport: "viewport"
	},
	_queryAttrs: {
		text: 'q',
		centerLatLong: 'sll',
		searchSpan: 'sspn'
	}
});

var VideoSearchStore = declare("dojox.data.GoogleVideoSearchStore", SearchStore,{
	// summary:
	//		A data store for retrieving search results from Google.
	//		The following attributes are supported on each item:
	//
	//		- title - The blog post title in HTML format.
	//		- titleNoFormatting - The  blog post title in plain text
	//		- content - A snippet of information about the blog post
	//		- url - The URL for the item
	//		- published - The published date, in RFC-822 format.
	//		- publisher - The name of the publisher.
	//		- duration - The approximate duration, in seconds, of the video.
	//		- tbWidth - The width in pixels of the video.
	//		- tbHeight - The height in pixels of the video
	//		- tbUrl - The URL to a thumbnail representation of the video.
	//		- playUrl - If present, supplies the url of the flash version of the video that can be played inline on your page. To play this video simply create and <embed> element on your page using this value as the src attribute and using application/x-shockwave-flash as the type attribute. If you want the video to play right away, make sure to append &autoPlay=true to the url..
	//
	//		The query accepts one parameter: text - The string to search for
	_type: "video",
	_attributes: ["title", "titleNoFormatting", "content", "url", "published", "publisher",
			"duration", "tbWidth", "tbHeight", "tbUrl", "playUrl"],
	_aggregatedAttributes: { }
});

var NewsSearchStore = declare("dojox.data.GoogleNewsSearchStore", SearchStore,{
	// summary:
	//		A data store for retrieving search results from Google.
	//		The following attributes are supported on each item:
	//
	//		- title - The news story title in HTML format.
	//		- titleNoFormatting - The news story title in plain text
	//		- content - A snippet of information about the news story
	//		- url - The URL for the item
	//		- unescapedUrl - The URL for the item, with URL escaping. This is often more readable
	//		- publisher - The name of the publisher
	//		- clusterUrl - A URL pointing to a page listing related storied.
	//		- location - The location of the news story.
	//		- publishedDate - The date of publication, in RFC-822 format.
	//		- relatedStories - An optional array of objects specifying related stories.
	//			Each object has the following subset of properties:
	//			"title", "titleNoFormatting", "url", "unescapedUrl", "publisher", "location", "publishedDate".
	//
	//		The query accepts one parameter: text - The string to search for
	_type: "news",
	_attributes: ["title", "titleNoFormatting", "content", "url", "unescapedUrl", "publisher",
			"clusterUrl", "location", "publishedDate", "relatedStories" ],
	_aggregatedAttributes: { }
});

var BookSearchStore = declare("dojox.data.GoogleBookSearchStore", SearchStore,{
	// summary:
	//		A data store for retrieving search results from Google.
	//		The following attributes are supported on each item:
	//
	//		- title - The book title in HTML format.
	//		- titleNoFormatting - The book title in plain text
	//		- authors - An array of authors
	//		- url - The URL for the item
	//		- unescapedUrl - The URL for the item, with URL escaping. This is often more readable
	//		- bookId - An identifier for the book, usually an ISBN.
	//		- pageCount - The number of pages in the book.
	//		- publishedYear - The year of publication.
	//
	//		The query accepts one parameter: text - The string to search for
	_type: "books",
	_attributes: ["title", "titleNoFormatting", "authors", "url", "unescapedUrl", "bookId",
			"pageCount", "publishedYear"],
	_aggregatedAttributes: { }
});

var ImageSearchStore = declare("dojox.data.GoogleImageSearchStore", SearchStore,{
	// summary:
	//		A data store for retrieving search results from Google.
	//		The following attributes are supported on each item:
	//
	//		- title - The image title in HTML format.
	//		- titleNoFormatting - The image title in plain text
	//		- url - The URL for the image
	//		- unescapedUrl - The URL for the image, with URL escaping. This is often more readable
	//		- tbUrl - The URL for the image thumbnail
	//		- visibleUrl - A shortened version of the URL associated with the result, stripped of a protocol and path
	//		- originalContextUrl - The URL of the page containing the image.
	//		- width - The width of the image in pixels.
	//		- height - The height of the image in pixels.
	//		- tbWidth - The width of the image thumbnail in pixels.
	//		- tbHeight - The height of the image thumbnail in pixels.
	//		- content - A snippet of information about the image, in HTML format
	//		- contentNoFormatting - A snippet of information about the image, in plain text
	//
	//		The query accepts one parameter: text - The string to search for
	_type: "images",
	_attributes: ["title", "titleNoFormatting", "visibleUrl", "url", "unescapedUrl",
			"originalContextUrl", "width", "height", "tbWidth", "tbHeight",
			"tbUrl", "content", "contentNoFormatting"],
	_aggregatedAttributes: { }
});

return {
	Search: SearchStore,
	ImageSearch: ImageSearchStore,
	BookSearch: BookSearchStore,
	NewsSearch: NewsSearchStore,
	VideoSearch: VideoSearchStore,
	LocalSearch: LocalSearchStore,
	BlogSearch: BlogSearchStore,
	WebSearch: WebSearchStore
	}
});
