define(["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/array", "dojo/io/script", "dojox/data/FlickrStore", "dojo/_base/connect"], 
  function(lang, declare, array, scriptIO, FlickrStore, connect) {

var FlickrRestStore = declare("dojox.data.FlickrRestStore",
	FlickrStore, {
	constructor: function(/*Object*/args){
		// summary:
		//	Initializer for the FlickrRestStore store.
		// description:
		//	The FlickrRestStore is a Datastore interface to one of the basic services
		//	of the Flickr service, the public photo feed.  This does not provide
		//	access to all the services of Flickr.
		//	This store cannot do * and ? filtering as the flickr service
		//	provides no interface for wildcards.
		if(args){
			if(args.label){
				this.label = args.label;
			}
			if(args.apikey){
				this._apikey = args.apikey;
			}
		}
		this._cache = [];
		this._prevRequests = {};
		this._handlers = {};
		this._prevRequestRanges = [];
		this._maxPhotosPerUser = {};
		this._id = FlickrRestStore.prototype._id++;
	},

	// _id: Integer
	//		A unique identifier for this store.
	_id: 0,

	// _requestCount: Integer
	//		A counter for the number of requests made. This is used to define
	//		the callback function that Flickr will use.
	_requestCount: 0,

	// _flickrRestUrl: String
	//		The URL to the Flickr REST services.
	_flickrRestUrl: "http://www.flickr.com/services/rest/",

	// _apikey: String
	//		The users API key to be used when accessing Flickr REST services.
	_apikey: null,

	// _storeRef: String
	//		A key used to mark an data store item as belonging to this store.
	_storeRef: "_S",

	// _cache: Array
	//		An Array of all previously downloaded picture info.
	_cache: null,

	// _prevRequests: Object
	//		A HashMap used to record the signature of a request to prevent duplicate
	//		request being made.
	_prevRequests: null,

	// _handlers: Object
	//		A HashMap used to record the handlers registered for a single remote request.  Multiple
	//		requests may be made for the same information before the first request has finished.
	//		Each element of this Object is an array of handlers to call back when the request finishes.
	//		This prevents multiple requests being made for the same information.
	_handlers: null,

	// _sortAttributes: Object
	//		A quick lookup of valid attribute names in a sort query.
	_sortAttributes: {
		"date-posted": true,
		"date-taken": true,
		"interestingness": true
	},

	_fetchItems: function(	/*Object*/ request,
							/*Function*/ fetchHandler,
							/*Function*/ errorHandler){
		// summary:
		//		Fetch flickr items that match to a query
		// request:
		//		A request object
		// fetchHandler:
		//		A function to call for fetched items
		// errorHandler:
		//		A function to call on error
		var query = {};
		if(!request.query){
			request.query = query = {};
		} else {
			lang.mixin(query, request.query);
		}

		var primaryKey = [];
		var secondaryKey = [];

		//Build up the content to send the request for.
		var content = {
			format: "json",
			method: "flickr.photos.search",
			api_key: this._apikey,
			extras: "owner_name,date_upload,date_taken"
		};
		var isRest = false;
		if(query.userid){
			isRest = true;
			content.user_id = request.query.userid;
			primaryKey.push("userid"+request.query.userid);
		}

		if(query.groupid){
			isRest = true;
			content.group_id = query.groupid;
			primaryKey.push("groupid" + query.groupid);
		}

		if(query.apikey){
			isRest = true;
			content.api_key = request.query.apikey;
			secondaryKey.push("api"+request.query.apikey);
		}else if(content.api_key){
			isRest = true;
			request.query.apikey = content.api_key;
			secondaryKey.push("api"+content.api_key);
		}else{
			throw Error("dojox.data.FlickrRestStore: An API key must be specified.");
		}

		request._curCount = request.count;

		if(query.page){
			content.page = request.query.page;
			secondaryKey.push("page" + content.page);
		}else if(("start" in request) && request.start !== null){
			if(!request.count){
				request.count = 20;
			}
			var diff = request.start % request.count;
			var start = request.start, count = request.count;
			// If the count does not divide cleanly into the start number,
			// more work has to be done to figure out the best page to request
			if(diff !== 0) {
				if(start < count / 2){
					// If the first record requested is less than half the
					// amount requested, then request from 0 to the count record
					count = start + count;
					start = 0;
				}else{
					var divLimit = 20, div = 2;
					for(var i = divLimit; i > 0; i--){
						if(start % i === 0 && (start/i) >= count){
							div = i;
							break;
						}
					}
					count = start/div;
				}
				request._realStart = request.start;
				request._realCount = request.count;
				request._curStart = start;
				request._curCount = count;
			}else{
				request._realStart = request._realCount = null;
				request._curStart = request.start;
				request._curCount = request.count;
			}

			content.page = (start / count) + 1;
			secondaryKey.push("page" + content.page);
		}

		if(request._curCount){
			content.per_page = request._curCount;
			secondaryKey.push("count" + request._curCount);
		}

		if(query.lang){
			content.lang = request.query.lang;
			primaryKey.push("lang" + request.lang);
		}

		if(query.setid){
			content.method = "flickr.photosets.getPhotos";
			content.photoset_id = request.query.setid;
			primaryKey.push("set" + request.query.setid);
		}

		if(query.tags){
			if(query.tags instanceof Array){
				content.tags = query.tags.join(",");
			}else{
				content.tags = query.tags;
			}
			primaryKey.push("tags" + content.tags);

			if(query["tag_mode"] && (query.tag_mode.toLowerCase() === "any" ||
				query.tag_mode.toLowerCase() === "all")){
				content.tag_mode = query.tag_mode;
			}
		}
		if(query.text){
			content.text=query.text;
			primaryKey.push("text:"+query.text);
		}

		//The store only supports a single sort attribute, even though the
		//Read API technically allows multiple sort attributes
		if(query.sort && query.sort.length > 0){
			//The default sort attribute is 'date-posted'
			if(!query.sort[0].attribute){
				query.sort[0].attribute = "date-posted";
			}

			//If the sort attribute is valid, check if it is ascending or
			//descending.
			if(this._sortAttributes[query.sort[0].attribute]) {
				if(query.sort[0].descending){
					content.sort = query.sort[0].attribute + "-desc";
				}else{
					content.sort = query.sort[0].attribute + "-asc";
				}
			}
		}else{
			//The default sort in the Dojo Data API is ascending.
			content.sort = "date-posted-asc";
		}
		primaryKey.push("sort:"+content.sort);

		//Generate a unique key for this request, so the store can
		//detect duplicate requests.
		primaryKey = primaryKey.join(".");
		secondaryKey = secondaryKey.length > 0 ? "." + secondaryKey.join(".") : "";
		var requestKey = primaryKey + secondaryKey;

		//Make a copy of the request, in case the source object is modified
		//before the request completes
		request = {
			query: query,
			count: request._curCount,
			start: request._curStart,
			_realCount: request._realCount,
			_realStart: request._realStart,
			onBegin: request.onBegin,
			onComplete: request.onComplete,
			onItem: request.onItem
		};

		var thisHandler = {
			request: request,
			fetchHandler: fetchHandler,
			errorHandler: errorHandler
		};

		//If the request has already been made, but not yet completed,
		//then add the callback handler to the list of handlers
		//for this request, and finish.
		if(this._handlers[requestKey]){
			this._handlers[requestKey].push(thisHandler);
			return;
		}

		this._handlers[requestKey] = [thisHandler];

		//Linking this up to Flickr is a PAIN!
		var handle = null;
		var getArgs = {
			url: this._flickrRestUrl,
			preventCache: this.urlPreventCache,
			content: content,
			callbackParamName: "jsoncallback"
		};

		var doHandle = lang.hitch(this, function(processedData, data, handler){
			var onBegin = handler.request.onBegin;
			handler.request.onBegin = null;
			var maxPhotos;
			var req = handler.request;

			if(("_realStart" in req) && req._realStart != null){
				req.start = req._realStart;
				req.count = req._realCount;
				req._realStart = req._realCount = null;
			}

			//If the request contains an onBegin method, the total number
			//of photos must be calculated.
			if(onBegin){
				var photos = null;
				if(data){
					photos = (data.photoset ? data.photoset : data.photos);
				}
				if(photos && ("perpage" in photos) && ("pages" in photos)){
					if(photos.perpage * photos.pages <= handler.request.start + handler.request.count){
						//If the final page of results has been received, it is possible to
						//know exactly how many photos there are
						maxPhotos = handler.request.start + photos.photo.length;
					}else{
						//If the final page of results has not yet been received,
						//it is not possible to tell exactly how many photos exist, so
						//return the number of pages multiplied by the number of photos per page.
						maxPhotos = photos.perpage * photos.pages;
					}
					this._maxPhotosPerUser[primaryKey] = maxPhotos;
					onBegin(maxPhotos, handler.request);
				}else if(this._maxPhotosPerUser[primaryKey]){
					onBegin(this._maxPhotosPerUser[primaryKey], handler.request);
				}
			}
			//Call whatever functions the caller has defined on the request object, except for onBegin
			handler.fetchHandler(processedData, handler.request);
			if(onBegin){
				//Replace the onBegin function, if it existed.
				handler.request.onBegin = onBegin;
			}
		});

		//Define a callback for the script that iterates through a list of
		//handlers for this piece of data.	Multiple requests can come into
		//the store for the same data.
		var myHandler = lang.hitch(this, function(data){
			//The handler should not be called more than once, so disconnect it.
			//if(handle !== null){ dojo.disconnect(handle); }
			if(data.stat != "ok"){
				errorHandler(null, request);
			}else{ //Process the items...
				var handlers = this._handlers[requestKey];
				if(!handlers){
					console.log("FlickrRestStore: no handlers for data", data);
					return;
				}

				this._handlers[requestKey] = null;
				this._prevRequests[requestKey] = data;

				//Process the data once.
				var processedData = this._processFlickrData(data, request, primaryKey);
				if(!this._prevRequestRanges[primaryKey]){
					this._prevRequestRanges[primaryKey] = [];
				}
				this._prevRequestRanges[primaryKey].push({
					start: request.start,
					end: request.start + (data.photoset ? data.photoset.photo.length : data.photos.photo.length)
				});

				//Iterate through the array of handlers, calling each one.
				array.forEach(handlers, function(i){
					doHandle(processedData, data, i);
				});
			}
		});

		var data = this._prevRequests[requestKey];

		//If the data was previously retrieved, there is no need to fetch it again.
		if(data){
			this._handlers[requestKey] = null;
			doHandle(this._cache[primaryKey], data, thisHandler);
			return;
		}else if(this._checkPrevRanges(primaryKey, request.start, request.count)){
			//If this range of data has already been retrieved, reuse it.
			this._handlers[requestKey] = null;
			doHandle(this._cache[primaryKey], null, thisHandler);
			return;
		}

		var deferred = scriptIO.get(getArgs);
		deferred.addCallback(myHandler);

		//We only set up the errback, because the callback isn't ever really used because we have
		//to link to the jsonFlickrFeed function....
		deferred.addErrback(function(error){
			connect.disconnect(handle);
			errorHandler(error, request);
		});
	},

	getAttributes: function(item){
		// summary:
		//		See dojo/data/api/Read.getAttributes()
		return [
			"title", "author", "imageUrl", "imageUrlSmall", "imageUrlMedium",
			"imageUrlThumb", "imageUrlLarge", "imageUrlOriginal", "link", "dateTaken", "datePublished"
		];
	},

	getValues: function(item, attribute){
		// summary:
		//		See dojo/data/api/Read.getValue()
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);

		switch(attribute){
			case "title":
				return [ this._unescapeHtml(item.title) ]; // String
			case "author":
				return [ item.ownername ]; // String
			case "imageUrlSmall":
				return [ item.media.s ]; // String
			case "imageUrl":
				return [ item.media.l ]; // String
			case "imageUrlOriginal":
				return [ item.media.o ]; // String
			case "imageUrlLarge":
				return [ item.media.l ]; // String
			case "imageUrlMedium":
				return [ item.media.m ]; // String
			case "imageUrlThumb":
				return [ item.media.t ]; // String
			case "link":
				return [ "http://www.flickr.com/photos/" + item.owner + "/" + item.id ]; // String
			case "dateTaken":
				return [ item.datetaken ];
			case "datePublished":
				return [ item.datepublished ];
			default:
				return undefined;
		}

	},

	_processFlickrData: function(/* Object */data, /* Object */request, /* String */ cacheKey){
		// summary:
		//		Processes the raw data from Flickr and updates the internal cache.
		// data:
		//		Data returned from Flickr
		// request:
		//		The original dojo.data.Request object passed in by the user.

		// If the data contains an 'item' object, it has not come from the REST
		// services, so process it using the FlickrStore.
		if(data.items){
			return FlickrStore.prototype._processFlickrData.apply(this,arguments);
		}
		var template = ["http://farm", null, ".static.flickr.com/", null, "/", null, "_", null];

		var items = [];
		var photos = (data.photoset ? data.photoset : data.photos);
		if(data.stat == "ok" && photos && photos.photo){
			items = photos.photo;

			//Add on the store ref so that isItem can work.
			for(var i = 0; i < items.length; i++){
				var item = items[i];
				item[this._storeRef] = this;
				template[1] = item.farm;
				template[3] = item.server;
				template[5] = item.id;
				template[7] = item.secret;
				
				var base = template.join("");
				item.media = {
					s: base + "_s.jpg",
					m: base + "_m.jpg",
					l: base + ".jpg",
					t: base + "_t.jpg",
					o: base + "_o.jpg"
				};
				if(!item.owner && data.photoset){
					item.owner = data.photoset.owner;
				}
			}
		}
		var start = request.start ? request.start : 0;
		var arr = this._cache[cacheKey];
		if(!arr){
			this._cache[cacheKey] = arr = [];
		}
		array.forEach(items, function(i, idx){
			arr[idx+ start] = i;
		});

		return arr; // Array
	},

	_checkPrevRanges: function(primaryKey, start, count){
		var end = start + count;
		var arr = this._prevRequestRanges[primaryKey];
		return (!!arr) && array.some(arr, function(item){
			return ((start >= item.start)&&(end <= item.end));
		});
	}
});
return FlickrRestStore;
});

