define(["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/xhr", "dojo/_base/kernel","dojo/data/util/filter", "dojo/data/util/simpleFetch"],
  function(lang, declare, xhr, kernel, filterUtil, simpleFetch) {

var CsvStore = declare("dojox.data.CsvStore", null, {
	// summary:
	//		The CsvStore implements the dojo/data/api/Read API and reads
	//		data from files in CSV (Comma Separated Values) format.
	//		All values are simple string values. References to other items
	//		are not supported as attribute values in this datastore.
	//
	//		Example data file:
	//		name, color, age, tagline
	//		Kermit, green, 12, "Hi, I'm Kermit the Frog."
	//		Fozzie Bear, orange, 10, "Wakka Wakka Wakka!"
	//		Miss Piggy, pink, 11, "Kermie!"
	//
	//		Note that values containing a comma must be enclosed with quotes ("")
	//		Also note that values containing quotes must be escaped with two consecutive quotes (""quoted"")
	//
	// examples:
	//		var csvStore = new dojox.data.CsvStore({url:"movies.csv");
	//		var csvStore = new dojox.data.CsvStore({url:"http://example.com/movies.csv");

	constructor: function(/* Object */ keywordParameters){
		// summary:
		//		initializer
		// keywordParameters:
		//		- url: String
		//		- data: String
		//		- label: String: The column label for the column to use for the label returned by getLabel.
		//		- identifier: String: The column label for the column to use for the identity.  Optional.  If not set, the identity is the row number.
		
		this._attributes = [];			// e.g. ["Title", "Year", "Producer"]
		this._attributeIndexes = {};	// e.g. {Title: 0, Year: 1, Producer: 2}
		this._dataArray = [];			// e.g. [[<Item0>],[<Item1>],[<Item2>]]
		this._arrayOfAllItems = [];		// e.g. [{_csvId:0,_csvStore:store},...]
		this._loadFinished = false;
		if(keywordParameters.url){
			this.url = keywordParameters.url;
		}
		this._csvData = keywordParameters.data;
		if(keywordParameters.label){
			this.label = keywordParameters.label;
		}else if(this.label === ""){
			this.label = undefined;
		}
		this._storeProp = "_csvStore";	// Property name for the store reference on every item.
		this._idProp = "_csvId";		// Property name for the Item Id on every item.
		this._features = {
			'dojo.data.api.Read': true,
			'dojo.data.api.Identity': true
		};
		this._loadInProgress = false;	//Got to track the initial load to prevent duelling loads of the dataset.
		this._queuedFetches = [];
		this.identifier = keywordParameters.identifier;
		if(this.identifier === ""){
			delete this.identifier;
		}else{
			this._idMap = {};
		}
		if("separator" in keywordParameters){
			this.separator = keywordParameters.separator;
		}
		if("urlPreventCache" in keywordParameters){
			this.urlPreventCache = keywordParameters.urlPreventCache?true:false;
		}
	},

	// url: [public] string
	//		Declarative hook for setting Csv source url.
	url: "",

	// label: [public] string
	//		Declarative hook for setting the label attribute.
	label: "",

	// identifier: [public] string
	//		Declarative hook for setting the identifier.
	identifier: "",

	// separator: [public] string
	//		Declatative and programmatic hook for defining the separator
	//		character used in the Csv style file.
	separator: ",",

	// separator: [public] string
	//		Parameter to allow specifying if preventCache should be passed to
	//		the xhrGet call or not when loading data from a url.
	//		Note this does not mean the store calls the server on each fetch,
	//		only that the data load has preventCache set as an option.
	urlPreventCache: false,

	_assertIsItem: function(/* item */ item){
		// summary:
		//		This function tests whether the item passed in is indeed an item in the store.
		// item:
		//		The item to test for being contained by the store.
		if(!this.isItem(item)){
			throw new Error(this.declaredClass + ": a function was passed an item argument that was not an item");
		}
	},
	
	_getIndex: function(item){
		// summary:
		//		Internal function to get the internal index to the item data from the item handle
		// item:
		//		The idem handle to get the index for.
		var idx = this.getIdentity(item);
		if(this.identifier){
			idx = this._idMap[idx];
		}
		return idx;
	},

/***************************************
     dojo/data/api/Read API
***************************************/
	getValue: function(	/* item */ item,
						/* attribute|attribute-name-string */ attribute,
						/* value? */ defaultValue){
		// summary:
		//		See dojo/data/api/Read.getValue()
		//		Note that for the CsvStore, an empty string value is the same as no value,
		//		so the defaultValue would be returned instead of an empty string.
		this._assertIsItem(item);
		var itemValue = defaultValue;
		if(typeof attribute === "string"){
			var ai = this._attributeIndexes[attribute];
			if(ai != null){
				var itemData = this._dataArray[this._getIndex(item)];
				itemValue = itemData[ai] || defaultValue;
			}
		}else{
			throw new Error(this.declaredClass + ": a function was passed an attribute argument that was not a string");
		}
		return itemValue; //String
	},

	getValues: function(/* item */ item,
						/* attribute|attribute-name-string */ attribute){
		// summary:
		//		See dojo/data/api/Read.getValues()
		//		CSV syntax does not support multi-valued attributes, so this is just a
		//		wrapper function for getValue().
		var value = this.getValue(item, attribute);
		return (value ? [value] : []); //Array
	},

	getAttributes: function(/* item */ item){
		// summary:
		//		See dojo/data/api/Read.getAttributes()
		this._assertIsItem(item);
		var attributes = [];
		var itemData = this._dataArray[this._getIndex(item)];
		for(var i=0; i<itemData.length; i++){
			// Check for empty string values. CsvStore treats empty strings as no value.
			if(itemData[i] !== ""){
				attributes.push(this._attributes[i]);
			}
		}
		return attributes; //Array
	},

	hasAttribute: function(	/* item */ item,
							/* attribute-name-string */ attribute){
		// summary:
		//		See dojo/data/api/Read.hasAttribute()
		//		The hasAttribute test is true if attribute has an index number within the item's array length
		//		AND if the item has a value for that attribute. Note that for the CsvStore, an
		//		empty string value is the same as no value.
		this._assertIsItem(item);
		if(typeof attribute === "string"){
			var attributeIndex = this._attributeIndexes[attribute];
			var itemData = this._dataArray[this._getIndex(item)];
			return (typeof attributeIndex !== "undefined" && attributeIndex < itemData.length && itemData[attributeIndex] !== ""); //Boolean
		}else{
			throw new Error(this.declaredClass + ": a function was passed an attribute argument that was not a string");
		}
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
		// tags:
		//		private
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
		if(something && something[this._storeProp] === this){
			var identity = something[this._idProp];
			//If an identifier was specified, we have to look it up via that and the mapping,
			//otherwise, just use row number.
			if(this.identifier){
				var data = this._dataArray[this._idMap[identity]];
				if(data){
					return true;
				}
			}else{
				if(identity >= 0 && identity < this._dataArray.length){
					return true; //Boolean
				}
			}
		}
		return false; //Boolean
	},

	isItemLoaded: function(/* anything */ something){
		// summary:
		//		See dojo/data/api/Read.isItemLoaded()
		//		The CsvStore always loads all items, so if it's an item, then it's loaded.
		return this.isItem(something); //Boolean
	},

	loadItem: function(/* item */ item){
		// summary:
		//		See dojo/data/api/Read.loadItem()
		// description:
		//		The CsvStore always loads all items, so if it's an item, then it's loaded.
		//
		//		From the dojo/data/api/Read.loadItem docs:
		//			If a call to isItemLoaded() returns true before loadItem() is even called,
		//			then loadItem() need not do any work at all and will not even invoke
		//			the callback handlers.
	},

	getFeatures: function(){
		// summary:
		//		See dojo/data/api/Read.getFeatures()
		return this._features; //Object
	},

	getLabel: function(/* item */ item){
		// summary:
		//		See dojo/data/api/Read.getLabel()
		if(this.label && this.isItem(item)){
			return this.getValue(item,this.label); //String
		}
		return undefined; //undefined
	},

	getLabelAttributes: function(/* item */ item){
		// summary:
		//		See dojo/data/api/Read.getLabelAttributes()
		if(this.label){
			return [this.label]; //array
		}
		return null; //null
	},


	// The dojo/data/api/Read.fetch() function is implemented as
	// a mixin from dojo.data.util.simpleFetch.
	// That mixin requires us to define _fetchItems().
	_fetchItems: function(	/* Object */ keywordArgs,
							/* Function */ findCallback,
							/* Function */ errorCallback){
		// summary:
		//		See dojo.data.util.simpleFetch.fetch()
		// tags:
		//		protected
		var self = this;
		var filter = function(requestArgs, arrayOfAllItems){
			var items = null;
			if(requestArgs.query){
				var key, value;
				items = [];
				var ignoreCase = requestArgs.queryOptions ? requestArgs.queryOptions.ignoreCase : false;

				//See if there are any string values that can be regexp parsed first to avoid multiple regexp gens on the
				//same value for each item examined.  Much more efficient.
				var regexpList = {};
				for(key in requestArgs.query){
					value = requestArgs.query[key];
					if(typeof value === "string"){
						regexpList[key] = filterUtil.patternToRegExp(value, ignoreCase);
					}
				}

				for(var i = 0; i < arrayOfAllItems.length; ++i){
					var match = true;
					var candidateItem = arrayOfAllItems[i];
					for(key in requestArgs.query){
						value = requestArgs.query[key];
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
				items = arrayOfAllItems.slice(0,arrayOfAllItems.length);
				
			}
			findCallback(items, requestArgs);
		};

		if(this._loadFinished){
			filter(keywordArgs, this._arrayOfAllItems);
		}else{
			if(this.url !== ""){
				//If fetches come in before the loading has finished, but while
				//a load is in progress, we have to defer the fetching to be
				//invoked in the callback.
				if(this._loadInProgress){
					this._queuedFetches.push({args: keywordArgs, filter: filter});
				}else{
					this._loadInProgress = true;
					var getArgs = {
							url: self.url,
							handleAs: "text",
							preventCache: self.urlPreventCache
						};
					var getHandler = xhr.get(getArgs);
					getHandler.addCallback(function(data){
						try{
							self._processData(data);
							filter(keywordArgs, self._arrayOfAllItems);
							self._handleQueuedFetches();
						}catch(e){
							errorCallback(e, keywordArgs);
						}
					});
					getHandler.addErrback(function(error){
						self._loadInProgress = false;
						if(errorCallback){
							errorCallback(error, keywordArgs);
						}else{
							throw error;
						}
					});
					//Wire up the cancel to abort of the request
					//This call cancel on the deferred if it hasn't been called
					//yet and then will chain to the simple abort of the
					//simpleFetch keywordArgs
					var oldAbort = null;
					if(keywordArgs.abort){
						oldAbort = keywordArgs.abort;
					}
					keywordArgs.abort = function(){
						var df = getHandler;
						if(df && df.fired === -1){
							df.cancel();
							df = null;
						}
						if(oldAbort){
							oldAbort.call(keywordArgs);
						}
					};
				}
			}else if(this._csvData){
				try{
					this._processData(this._csvData);
					this._csvData = null;
					filter(keywordArgs, this._arrayOfAllItems);
				}catch(e){
					errorCallback(e, keywordArgs);
				}
			}else{
				var error = new Error(this.declaredClass + ": No CSV source data was provided as either URL or String data input.");
				if(errorCallback){
					errorCallback(error, keywordArgs);
				}else{
					throw error;
				}
			}
		}
	},
	
	close: function(/*dojo/data/api/Request|Object?*/  request){
		// summary:
		//		See dojo/data/api/Read.close()
	},
	
	
	// -------------------------------------------------------------------
	// Private methods
	_getArrayOfArraysFromCsvFileContents: function(/* string */ csvFileContents){
		// summary:
		//		Parses a string of CSV records into a nested array structure.
		// description:
		//		Given a string containing CSV records, this method parses
		//		the string and returns a data structure containing the parsed
		//		content.  The data structure we return is an array of length
		//		R, where R is the number of rows (lines) in the CSV data.  The
		//		return array contains one sub-array for each CSV line, and each
		//		sub-array contains C string values, where C is the number of
		//		columns in the CSV data.
		// example:
		//		For example, given this CSV string as input:
		// |		"Title, Year, Producer \n Alien, 1979, Ridley Scott \n Blade Runner, 1982, Ridley Scott"
		//		this._dataArray will be set to:
		// |		[["Alien", "1979", "Ridley Scott"],
		// |		["Blade Runner", "1982", "Ridley Scott"]]
		//		And this._attributes will be set to:
		// |		["Title", "Year", "Producer"]
		//		And this._attributeIndexes will be set to:
		// |		{ "Title":0, "Year":1, "Producer":2 }
		// tags:
		//		private
		if(lang.isString(csvFileContents)){
			var leadingWhiteSpaceCharacters = new RegExp("^\\s+",'g');
			var trailingWhiteSpaceCharacters = new RegExp("\\s+$",'g');
			var doubleQuotes = new RegExp('""','g');
			var arrayOfOutputRecords = [];
			var i;
			
			var arrayOfInputLines = this._splitLines(csvFileContents);
			for(i = 0; i < arrayOfInputLines.length; ++i){
				var singleLine = arrayOfInputLines[i];
				if(singleLine.length > 0){
					var listOfFields = singleLine.split(this.separator);
					var j = 0;
					while(j < listOfFields.length){
						var space_field_space = listOfFields[j];
						var field_space = space_field_space.replace(leadingWhiteSpaceCharacters, ''); // trim leading whitespace
						var field = field_space.replace(trailingWhiteSpaceCharacters, ''); // trim trailing whitespace
						var firstChar = field.charAt(0);
						var lastChar = field.charAt(field.length - 1);
						var secondToLastChar = field.charAt(field.length - 2);
						var thirdToLastChar = field.charAt(field.length - 3);
						if(field.length === 2 && field == "\"\""){
							listOfFields[j] = ""; //Special case empty string field.
						}else if((firstChar == '"') &&
								((lastChar != '"') ||
								((lastChar == '"') && (secondToLastChar == '"') && (thirdToLastChar != '"')))){
							if(j+1 === listOfFields.length){
								// alert("The last field in record " + i + " is corrupted:\n" + field);
								return; //null
							}
							var nextField = listOfFields[j+1];
							listOfFields[j] = field_space + this.separator + nextField;
							listOfFields.splice(j+1, 1); // delete element [j+1] from the list
						}else{
							if((firstChar == '"') && (lastChar == '"')){
								field = field.slice(1, (field.length - 1)); // trim the " characters off the ends
								field = field.replace(doubleQuotes, '"'); // replace "" with "
							}
							listOfFields[j] = field;
							j += 1;
						}
					}
					arrayOfOutputRecords.push(listOfFields);
				}
			}
			
			// The first item of the array must be the header row with attribute names.
			this._attributes = arrayOfOutputRecords.shift();
			for(i = 0; i<this._attributes.length; i++){
				// Store the index of each attribute
				this._attributeIndexes[this._attributes[i]] = i;
			}
			this._dataArray = arrayOfOutputRecords; //Array
		}
	},

	_splitLines: function(csvContent){
		// summary:
		//		Function to split the CSV file contents into separate lines.
		//		Since line breaks can occur inside quotes, a Regexp didn't
		//		work as well.  A quick passover parse should be just as efficient.
		// tags:
		//		private
		var split = [];
		var i;
		var line = "";
		var inQuotes = false;
		for(i = 0; i < csvContent.length; i++){
			var c = csvContent.charAt(i);
			switch(c){
				case '\"':
					inQuotes = !inQuotes;
					line += c;
					break;
				case '\r':
					if(inQuotes){
						line += c;
					}else{
						split.push(line);
						line = "";
						if(i < (csvContent.length - 1) && csvContent.charAt(i + 1) == '\n'){
							i++; //Skip it, it's CRLF
						}
					}
					break;
				case '\n':
					if(inQuotes){
						line += c;
					}else{
						split.push(line);
						line = "";
					}
					break;
				default:
					line +=c;
			}
		}
		if(line !== ""){
			split.push(line);
		}
		return split;
	},
	
	_processData: function(/* String */ data){
		// summary:
		//		Function for processing the string data from the server.
		// data: String
		//		The CSV data.
		// tags:
		//		private
		this._getArrayOfArraysFromCsvFileContents(data);
		this._arrayOfAllItems = [];

		//Check that the specified Identifier is actually a column title, if provided.
		if(this.identifier){
			if(this._attributeIndexes[this.identifier] === undefined){
				throw new Error(this.declaredClass + ": Identity specified is not a column header in the data set.");
			}
		}

		for(var i=0; i<this._dataArray.length; i++){
			var id = i;
			//Associate the identifier to a row in this case
			//for o(1) lookup.
			if(this.identifier){
				var iData = this._dataArray[i];
				id = iData[this._attributeIndexes[this.identifier]];
				this._idMap[id] = i;
			}
			this._arrayOfAllItems.push(this._createItemFromIdentity(id));
		}
		this._loadFinished = true;
		this._loadInProgress = false;
	},
	
	_createItemFromIdentity: function(/* String */ identity){
		// summary:
		//		Function for creating a new item from its identifier.
		// identity: String
		//		The identity
		// tags:
		//		private
		var item = {};
		item[this._storeProp] = this;
		item[this._idProp] = identity;
		return item; //Object
	},
	
	
/***************************************
     dojo/data/api/Identity API
***************************************/
	getIdentity: function(/* item */ item){
		// summary:
		//		See dojo/data/api/Identity.getIdentity()
		// tags:
		//		public
		if(this.isItem(item)){
			return item[this._idProp]; //String
		}
		return null; //null
	},

	fetchItemByIdentity: function(/* Object */ keywordArgs){
		// summary:
		//		See dojo/data/api/Identity.fetchItemByIdentity()
		// tags:
		//		public
		var item;
		var scope = keywordArgs.scope?keywordArgs.scope:kernel.global;
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
							handleAs: "text"
						};
					var getHandler = xhr.get(getArgs);
					getHandler.addCallback(function(data){
						try{
							self._processData(data);
							var item = self._createItemFromIdentity(keywordArgs.identity);
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
							keywordArgs.onError.call(scope, error);
						}
					});
				}
			}else if(this._csvData){
				try{
					self._processData(self._csvData);
					self._csvData = null;
					item = self._createItemFromIdentity(keywordArgs.identity);
					if(!self.isItem(item)){
						item = null;
					}
					if(keywordArgs.onItem){
						keywordArgs.onItem.call(scope, item);
					}
				}catch(e){
					if(keywordArgs.onError){
						keywordArgs.onError.call(scope, e);
					}
				}
			}
		}else{
			//Already loaded.  We can just look it up and call back.
			item = this._createItemFromIdentity(keywordArgs.identity);
			if(!this.isItem(item)){
				item = null;
			}
			if(keywordArgs.onItem){
				keywordArgs.onItem.call(scope, item);
			}
		}
	},

	getIdentityAttributes: function(/* item */ item){
		// summary:
		//		See dojo/data/api/Identity.getIdentifierAttributes()
		// tags:
		//		public

		// Identity isn't a public attribute in the item, it's the row position index.
		// So, return null.
		if(this.identifier){
			return [this.identifier];
		}else{
			return null;
		}
	},

	_handleQueuedFetches: function(){
		// summary:
		//		Internal function to execute delayed request in the store.
		// tags:
		//		private

		// Execute any deferred fetches now.
		if(this._queuedFetches.length > 0){
			for(var i = 0; i < this._queuedFetches.length; i++){
				var fData = this._queuedFetches[i];
				var delayedFilter = fData.filter;
				var delayedQuery = fData.args;
				if(delayedFilter){
					delayedFilter(delayedQuery, this._arrayOfAllItems);
				}else{
					this.fetchItemByIdentity(fData.args);
				}
			}
			this._queuedFetches = [];
		}
	}
});
//Mix in the simple fetch implementation to this class.
lang.extend(CsvStore, simpleFetch);

return CsvStore;
});
