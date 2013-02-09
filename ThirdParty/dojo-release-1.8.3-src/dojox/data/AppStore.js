define(["dojo", "dojox", "dojo/data/util/simpleFetch", "dojo/data/util/filter", "dojox/atom/io/Connection"], function(dojo, dojox) {

dojo.experimental("dojox.data.AppStore");

dojo.declare("dojox.data.AppStore",
	null,{

	// url: [public] string
	//		So the parser can instantiate the store via markup.
	url: "",
	
	// urlPreventCache: [public] boolean
	//		Whether or not to pass the preventCache parameter to the connection
	urlPreventCache: false,

	// xmethod: [public] boolean
	//		Whether to use X-Method-Override for PUT/DELETE.
	xmethod: false,
	
	_atomIO: null,
	_feed: null,
	_requests: null,
	_processing: null,
	
	_updates: null,
	_adds: null,
	_deletes: null,
	
	constructor: function(/*Object*/args){
		// summary:
		//		The APP data store.
		// description:
		//		The APP Store is instantiated either in markup or programmatically by supplying a
		//		url of the Collection to be used.
		// args:
		//		An anonymous object to initialize properties.  It expects the following values:
		//
		//		- url:				The url of the Collection to load.
		//		- urlPreventCache:	Whether or not to append on cache prevention params (as defined by dojo.xhr*)
		
		if(args && args.url){
			this.url = args.url;
		}
		if(args && args.urlPreventCache){
			this.urlPreventCache = args.urlPreventCache;
		}
		if(!this.url){
			throw new Error("A URL is required to instantiate an APP Store object");
		}
	},
	
	_setFeed: function(feed, data){
		// summary:
		//		Sets the internal feed using a dojox.atom.io.model.Feed object.
		// description:
		//		Sets the internal feed using a dojox.atom.io.model.Feed object.  Also adds
		//		a property to the entries to track that they belong to this store. It
		//		also parses stored requests (since we were waiting on a callback) and
		//		executes those as well.
		// feed: dojox.atom.io.model.Feed object
		//		The Feed to use for this data store.
		// data: unused
		//		Signature for this function is defined by AtomIO.getFeed, since this is a callback.
		this._feed = feed;
		var i;
		for(i=0; i<this._feed.entries.length; i++){
			this._feed.entries[i].store = this;
		}
		if(this._requests){
			for(i=0; i<this._requests.length; i++){
				var request = this._requests[i];
				if(request.request && request.fh && request.eh){
					this._finishFetchItems(request.request, request.fh, request.eh);
				}else if(request.clear){
					this._feed = null;
				}else if(request.add){
					this._feed.addEntry(request.add);
				}else if(request.remove){
					this._feed.removeEntry(request.remove);
				}
			}
		}
		this._requests = null;
	},
	
	_getAllItems: function(){
		// summary:
		//		Function to return all entries in the Feed as an array of items.
		// description:
		//		Function to return all entries in the Feed as an array of items.
		// returns:
		//		Array of all entries in the feed.
		var items = [];
		for(var i=0; i<this._feed.entries.length; i++){
			items.push(this._feed.entries[i]);
		}
		return items; //array
	},
	
	_assertIsItem: function(/* item */ item){
		// summary:
		//		This function tests whether the item is an item.
		// description:
		//		This function tests whether the item passed in is indeed an item
		//		in the store.
		// item:
		//		The item to test for being contained by the store.
		if(!this.isItem(item)){
			throw new Error("This error message is provided when a function is called in the following form: "
				+ "getAttribute(argument, attributeName).  The argument variable represents the member "
				+ "or owner of the object. The error is created when an item that does not belong "
				+ "to this store is specified as an argument.");
		}
	},

	_assertIsAttribute: function(/* String */ attribute){
		// summary:
		//		This function tests whether the item is an attribute.
		// description:
		//		This function tests whether the item passed in is indeed a valid
		//		'attribute' like type for the store.
		// attribute:
		//		The attribute to test for being contained by the store.
		// returns:
		//		Returns a boolean indicating whether this is a valid attribute.
		if(typeof attribute !== "string"){
			throw new Error("The attribute argument must be a string. The error is created "
			+ "when a different type of variable is specified such as an array or object.");
		}

		for(var key in dojox.atom.io.model._actions){
			if(key == attribute){
				return true;
			}
		}
		return false;
	},
	
	_addUpdate: function(/* Object */ update){
		// summary:
		//		Internal function to add an updated entry to our updates array
		// description:
		//		Internal function to add an updated entry to our updates array
		// update: dojox.atom.io.model.Entry object
		//		The updated Entry we've changed.
		if(!this._updates){
			this._updates = [update];
		}else{
			this._updates.push(update);
		}
	},

/***************************************
     dojo/data/api/Read API
***************************************/
	
	getValue: function(	/* item */ item,
						/* attribute-name-string */ attribute,
						/* value? */ defaultValue){
		// summary:
		//		See dojo/data/api/Read.getValue()
		var values = this.getValues(item, attribute);
		return (values.length > 0)?values[0]:defaultValue; // Object|Number|Boolean
	},

	getValues: function(/* item */ item,
						/* attribute-name-string */ attribute){
		// summary:
		//		See dojo/data/api/Read.getValues()

		this._assertIsItem(item);
		var flag = this._assertIsAttribute(attribute);

		if(flag){
			if((attribute === "author" || attribute === "contributor" || attribute === "link") && item[attribute+"s"]){
				return item[attribute+"s"];
			}
			if(attribute === "category" && item.categories){
				return item.categories;
			}
			if(item[attribute]){
				item = item[attribute];
				if(item.nodeType == "Content"){
					return [item.value];
				}
				return [item] ;
			}
		}
		return []; //Array
	},

	getAttributes: function(/* item */ item){
		// summary:
		//		See dojo/data/api/Read.getAttributes()
		this._assertIsItem(item);
		var attributes = [];
		for(var key in dojox.atom.io.model._actions){
			if(this.hasAttribute(item, key)){
				attributes.push(key);
			}
		}
		return attributes; //Array
	},

	hasAttribute: function(	/* item */ item,
							/* attribute-name-string */ attribute){
		// summary:
		//		See dojo/data/api/Read.hasAttribute()
		return this.getValues(item, attribute).length > 0;
	},

	containsValue: function(/* item */ item,
							/* attribute-name-string */ attribute,
							/* anything */ value){
		// summary:
		//		See dojo/data/api/Read.containsValue()
		var regexp = undefined;
		if(typeof value === "string"){
			regexp = dojo.data.util.filter.patternToRegExp(value, false);
		}
		return this._containsValue(item, attribute, value, regexp); //boolean.
	},

	_containsValue: function(	/* item */ item,
								/* attribute-name-string */ attribute,
								/* anything */ value,
								/* RegExp?*/ regexp,
								/* Boolean?*/ trim){
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
				if(trim){
					possibleValue = possibleValue.replace(new RegExp(/^\s+/),""); // START
					possibleValue = possibleValue.replace(new RegExp(/\s+$/),""); // END
				}
				possibleValue = possibleValue.replace(/\r|\n|\r\n/g, "");
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
		return something && something.store && something.store === this; //boolean
	},

	isItemLoaded: function(/* anything */ something){
		// summary:
		//		See dojo/data/api/Read.isItemLoaded()
		return this.isItem(something);
	},

	loadItem: function(/* Object */ keywordArgs){
		// summary:
		//		See dojo/data/api/Read.loadItem()
		this._assertIsItem(keywordArgs.item);
	},
	
	_fetchItems: function(request, fetchHandler, errorHandler){
		// summary:
		//		Fetch items (Atom entries) that match to a query
		// description:
		//		Fetch items (Atom entries) that match to a query
		// request:
		//		A request object
		// fetchHandler:
		//		A function to call for fetched items
		// errorHandler:
		//		A function to call on error
		if(this._feed){
			this._finishFetchItems(request, fetchHandler, errorHandler);
		}else{
			var flag = false;
			if(!this._requests){
				this._requests = [];
				flag = true;
			}
			this._requests.push({request: request, fh: fetchHandler, eh: errorHandler});
			if(flag){
				this._atomIO = new dojox.atom.io.Connection(false, this.urlPreventCache);
				this._atomIO.getFeed(this.url,this._setFeed, null, this);
			}
		}
	},
		
	_finishFetchItems: function(request, fetchHandler, errorHandler){
		// summary:
		//		Internal function for finishing a fetch request.
		// description:
		//		Internal function for finishing a fetch request.  Needed since the feed
		//		might not have been loaded, so we finish the fetch in a callback.
		// request:
		//		A request object
		// fetchHandler:
		//		A function to call for fetched items
		// errorHandler:
		//		A function to call on error
		var items = null;
		var arrayOfAllItems = this._getAllItems();
		if(request.query){
			var ignoreCase = request.queryOptions ? request.queryOptions.ignoreCase : false;
			items = [];

			//See if there are any string values that can be regexp parsed first to avoid multiple regexp gens on the
			//same value for each item examined.  Much more efficient.
			var regexpList = {};
			var key;
			var value;
			for(key in request.query){
				value = request.query[key]+'';
				if(typeof value === "string"){
					regexpList[key] = dojo.data.util.filter.patternToRegExp(value, ignoreCase);
				}
			}

			for(var i = 0; i < arrayOfAllItems.length; ++i){
				var match = true;
				var candidateItem = arrayOfAllItems[i];
				for(key in request.query){
					value = request.query[key]+'';
					if(!this._containsValue(candidateItem, key, value, regexpList[key], request.trim)){
						match = false;
					}
				}
				if(match){
					items.push(candidateItem);
				}
			}
		}else{
			// We want a copy to pass back in case the parent wishes to sort the array.  We shouldn't allow resort
			// of the internal list so that multiple callers can get listsand sort without affecting each other.
			if(arrayOfAllItems.length> 0){
				items = arrayOfAllItems.slice(0,arrayOfAllItems.length);
			}
		}
		try{
			fetchHandler(items, request);
		}catch(e){
			errorHandler(e, request);
		}
	},

	getFeatures: function(){
		// summary:
		//		See dojo/data/api/Read.getFeatures()
		return {
			'dojo.data.api.Read': true,
			'dojo.data.api.Write': true,
			'dojo.data.api.Identity': true
		};
	},
	
	close: function(/*dojo/data/api/Request|Object?*/ request){
		// summary:
		//		See dojo/data/api/Read.close()
		
		// nothing to do here!
		this._feed = null;
	},

	getLabel: function(/* item */ item){
		// summary:
		//		See dojo/data/api/Read.getLabel()
		if(this.isItem(item)){
			return this.getValue(item, "title", "No Title");
		}
		return undefined;
	},

	getLabelAttributes: function(/* item */ item){
		// summary:
		//		See dojo/data/api/Read.getLabelAttributes()
		return ["title"];
	},

/***************************************
     dojo/data/api/Identity API
***************************************/

	getIdentity: function(/* item */ item){
		// summary:
		//		See dojo/data/api/Identity.getIdentity()
		this._assertIsItem(item);
		return this.getValue(item, "id");
	},

	getIdentityAttributes: function(/* item */ item){
		// summary:
		//		See dojo/data/api/Identity.getIdentityAttributes()
		return ["id"];
	},

	fetchItemByIdentity: function(keywordArgs){
		// summary:
		//		See dojo/data/api/Identity.fetchItemByIdentity()

		this._fetchItems({query:{id:keywordArgs.identity}, onItem: keywordArgs.onItem, scope: keywordArgs.scope},
			function(items, request){
				var scope = request.scope;
				if(!scope){
					scope = dojo.global;
				}
				if(items.length < 1){
					request.onItem.call(scope, null);
				}else{
					request.onItem.call(scope, items[0]);
				}
		}, keywordArgs.onError);
	},

/***************************************
     dojo/data/api/Identity API
***************************************/

	newItem: function(/* Object? */ keywordArgs){
		// summary:
		//		See dojo/data/api/Write.newItem()
		var entry = new dojox.atom.io.model.Entry();
		var value = null;
		var temp = null;
		var i;
		for(var key in keywordArgs){
			if(this._assertIsAttribute(key)){
				value = keywordArgs[key];
				switch(key){
					case "link":
						for(i in value){
							temp = value[i];
							entry.addLink(temp.href,temp.rel,temp.hrefLang,temp.title,temp.type);
						}
						break;
					case "author":
						for(i in value){
							temp = value[i];
							entry.addAuthor(temp.name, temp.email, temp.uri);
						}
						break;
					case "contributor":
						for(i in value){
							temp = value[i];
							entry.addContributor(temp.name, temp.email, temp.uri);
						}
						break;
					case "category":
						for(i in value){
							temp = value[i];
							entry.addCategory(temp.scheme, temp.term, temp.label);
						}
						break;
					case "icon":
					case "id":
					case "logo":
					case "xmlBase":
					case "rights":
						entry[key] = value;
						break;
					case "updated":
					case "published":
					case "issued":
					case "modified":
						entry[key] = dojox.atom.io.model.util.createDate(value);
						break;
					case "content":
					case "summary":
					case "title":
					case "subtitle":
						entry[key] = new dojox.atom.io.model.Content(key);
						entry[key].value = value;
						break;
					default:
						entry[key] = value;
						break;
				}
			}
		}
		entry.store = this;
		entry.isDirty = true;

		if(!this._adds){
			this._adds = [entry];
		}else{
			this._adds.push(entry);
		}

		if(this._feed){
			this._feed.addEntry(entry);
		}else{
			if(this._requests){
				this._requests.push({add:entry});
			}else{
				this._requests = [{add:entry}];
				this._atomIO = new dojox.atom.io.Connection(false, this.urlPreventCache);
				this._atomIO.getFeed(this.url,dojo.hitch(this,this._setFeed));
			}
		}
		return true;
	},

	deleteItem: function(/* item */ item){
		// summary:
		//		See dojo/data/api/Write.deleteItem()
		this._assertIsItem(item);

		if(!this._deletes){
			this._deletes = [item];
		}else{
			this._deletes.push(item);
		}

		if(this._feed){
			this._feed.removeEntry(item);
		}else{
			if(this._requests){
				this._requests.push({remove:item});
			}else{
				this._requests = [{remove:item}];
				this._atomIO = new dojox.atom.io.Connection(false, this.urlPreventCache);
				this._atomIO.getFeed(this.url,dojo.hitch(this,this._setFeed));
			}
		}
		item = null;
		return true;
	},

	setValue: function(	/* item */ item,
						/* string */ attribute,
						/* almost anything */ value){
		// summary:
		//		See dojo/data/api/Write.setValue()
		this._assertIsItem(item);
		
		var update = {item: item};
		if(this._assertIsAttribute(attribute)){
			switch(attribute){
				case "link":
					update.links = item.links;
					this._addUpdate(update);
					item.links = null;
					item.addLink(value.href,value.rel,value.hrefLang,value.title,value.type);
					item.isDirty = true;
					return true;
				case "author":
					update.authors = item.authors;
					this._addUpdate(update);
					item.authors = null;
					item.addAuthor(value.name, value.email, value.uri);
					item.isDirty = true;
					return true;
				case "contributor":
					update.contributors = item.contributors;
					this._addUpdate(update);
					item.contributors = null;
					item.addContributor(value.name, value.email, value.uri);
					item.isDirty = true;
					return true;
				case "category":
					update.categories = item.categories;
					this._addUpdate(update);
					item.categories = null;
					item.addCategory(value.scheme, value.term, value.label);
					item.isDirty = true;
					return true;
				case "icon":
				case "id":
				case "logo":
				case "xmlBase":
				case "rights":
					update[attribute] = item[attribute];
					this._addUpdate(update);
					item[attribute] = value;
					item.isDirty = true;
					return true;
				case "updated":
				case "published":
				case "issued":
				case "modified":
					update[attribute] = item[attribute];
					this._addUpdate(update);
					item[attribute] = dojox.atom.io.model.util.createDate(value);
					item.isDirty = true;
					return true;
				case "content":
				case "summary":
				case "title":
				case "subtitle":
					update[attribute] = item[attribute];
					this._addUpdate(update);
					item[attribute] = new dojox.atom.io.model.Content(attribute);
					item[attribute].value = value;
					item.isDirty = true;
					return true;
				default:
					update[attribute] = item[attribute];
					this._addUpdate(update);
					item[attribute] = value;
					item.isDirty = true;
					return true;
			}
		}
		return false;
	},

	setValues: function(/* item */ item,
						/* string */ attribute,
						/* array */ values){
		// summary:
		//		See dojo/data/api/Write.setValues()
		if(values.length === 0){
			return this.unsetAttribute(item, attribute);
		}
		this._assertIsItem(item);
		
		var update = {item: item};
		var value;
		var i;
		if(this._assertIsAttribute(attribute)){
			switch(attribute){
				case "link":
					update.links = item.links;
					item.links = null;
					for(i in values){
						value = values[i];
						item.addLink(value.href,value.rel,value.hrefLang,value.title,value.type);
					}
					item.isDirty = true;
					return true;
				case "author":
					update.authors = item.authors;
					item.authors = null;
					for(i in values){
						value = values[i];
						item.addAuthor(value.name, value.email, value.uri);
					}
					item.isDirty = true;
					return true;
				case "contributor":
					update.contributors = item.contributors;
					item.contributors = null;
					for(i in values){
						value = values[i];
						item.addContributor(value.name, value.email, value.uri);
					}
					item.isDirty = true;
					return true;
				case "categories":
					update.categories = item.categories;
					item.categories = null;
					for(i in values){
						value = values[i];
						item.addCategory(value.scheme, value.term, value.label);
					}
					item.isDirty = true;
					return true;
				case "icon":
				case "id":
				case "logo":
				case "xmlBase":
				case "rights":
					update[attribute] = item[attribute];
					item[attribute] = values[0];
					item.isDirty = true;
					return true;
				case "updated":
				case "published":
				case "issued":
				case "modified":
					update[attribute] = item[attribute];
					item[attribute] = dojox.atom.io.model.util.createDate(values[0]);
					item.isDirty = true;
					return true;
				case "content":
				case "summary":
				case "title":
				case "subtitle":
					update[attribute] = item[attribute];
					item[attribute] = new dojox.atom.io.model.Content(attribute);
					item[attribute].values[0] = values[0];
					item.isDirty = true;
					return true;
				default:
					update[attribute] = item[attribute];
					item[attribute] = values[0];
					item.isDirty = true;
					return true;
			}
		}
		this._addUpdate(update);
		return false;
	},

	unsetAttribute: function(	/* item */ item,
								/* string */ attribute){
		// summary:
		//		See dojo/data/api/Write.unsetAttribute()
		this._assertIsItem(item);
		if(this._assertIsAttribute(attribute)){
			if(item[attribute] !== null){
				var update = {item: item};
				switch(attribute){
					case "author":
					case "contributor":
					case "link":
						update[attribute+"s"] = item[attribute+"s"];
						break;
					case "category":
						update.categories = item.categories;
						break;
					default:
						update[attribute] = item[attribute];
						break;
				}
				item.isDirty = true;
				item[attribute] = null;
				this._addUpdate(update);
				return true;
			}
		}
		return false; // boolean
	},

	save: function(/* object */ keywordArgs){
		// summary:
		//		See dojo/data/api/Write.save()
		// keywordArgs:
		// |	{
		// |		onComplete: function
		// |		onError: function
		// |		scope: object
		// |	}
		var i;
		for(i in this._adds){
			this._atomIO.addEntry(this._adds[i], null, function(){}, keywordArgs.onError, false, keywordArgs.scope);
		}
			
		this._adds = null;
		
		for(i in this._updates){
			this._atomIO.updateEntry(this._updates[i].item, function(){}, keywordArgs.onError, false, this.xmethod, keywordArgs.scope);
		}
			
		this._updates = null;
		
		for(i in this._deletes){
			this._atomIO.removeEntry(this._deletes[i], function(){}, keywordArgs.onError, this.xmethod, keywordArgs.scope);
		}
			
		this._deletes = null;
		
		this._atomIO.getFeed(this.url,dojo.hitch(this,this._setFeed));
		
		if(keywordArgs.onComplete){
			var scope = keywordArgs.scope || dojo.global;
			keywordArgs.onComplete.call(scope);
		}
	},

	revert: function(){
		// summary:
		//		See dojo/data/api/Write.revert()
		var i;
		for(i in this._adds){
			this._feed.removeEntry(this._adds[i]);
		}
			
		this._adds = null;
		
		var update, item, key;
		for(i in this._updates){
			update = this._updates[i];
			item = update.item;
			for(key in update){
				if(key !== "item"){
					item[key] = update[key];
				}
			}
		}
		this._updates = null;
		
		for(i in this._deletes){
			this._feed.addEntry(this._deletes[i]);
		}
		this._deletes = null;
		return true;
	},

	isDirty: function(/* item? */ item){
		// summary:
		//		See dojo/data/api/Write.isDirty()
		if(item){
			this._assertIsItem(item);
			return item.isDirty?true:false; //boolean
		}
		return (this._adds !== null || this._updates !== null); //boolean
	}
});
dojo.extend(dojox.data.AppStore,dojo.data.util.simpleFetch);

return dojox.data.AppStore;
});
