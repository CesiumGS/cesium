define(["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/array", "dojo/_base/json","dojo/_base/kernel", "dojo/_base/sniff", "dojo/data/util/sorter", "dojo/data/util/filter", "./css"],
 function(lang, declare, array, jsonUtil, kernel, has, sorter, filter, css) {

return declare("dojox.data.CssRuleStore", null, {
	// summary:
	//		Basic store to display CSS information.
	// description:
	//		The CssRuleStore allows users to get information about active CSS rules in the page running the CssRuleStore.
	//		It can also filter out rules from specific stylesheets.  The attributes it exposes on rules are as follows:
	//
	//		- selector:				The selector text.
	//		- classes:				An array of classes present in this selector.
	//		- rule:					The actual DOM Rule object.
	//		- style:					The actual DOM CSSStyleDeclaration object.
	//		- cssText:				The cssText string provided on the rule object.
	//		- styleSheet:				The originating DOM Stylesheet object.
	//		- parentStyleSheet:		The parent stylesheet to the sheet this rule originates from.
	//		- parentStyleSheetHref:	The href of the parent stylesheet.
	//
	//		AND every style attribute denoted as style.*, such as style.textAlign or style.backgroundColor

	_storeRef: '_S',
	_labelAttribute: 'selector', // text representation of the Item [label and identifier may need to stay due to method names]

	_cache: null,

	_browserMap: null,

	_cName: "dojox.data.CssRuleStore",

	constructor: function(/* Object */ keywordParameters){
		// Initializes this store
		if(keywordParameters){
			lang.mixin(this, keywordParameters);
		}
		this._cache = {};
		this._allItems = null;
		this._waiting = [];
		this.gatherHandle = null;
		var self = this;
		// CSS files may not be finished loading by the time the store is constructed.  We need to
		// give them a little time, so setting the stylesheet loading to retry every 250ms.
		function gatherRules(){
			try{
				// Funkiness here is due to css that may still be loading.  This throws an DOM Access
				// error if css isnt completely loaded.
				self.context = css.determineContext(self.context);
				if(self.gatherHandle){
					clearInterval(self.gatherHandle);
					self.gatherHandle = null;
				}
				// Handle any fetches that have been queued while we've been waiting on the CSS files
				// to finish
				while(self._waiting.length){
					var item = self._waiting.pop();
					css.rules.forEach(item.forFunc, null, self.context);
					item.finishFunc();
				}
			}catch(e){}
		}
		this.gatherHandle = setInterval(gatherRules,250);
	},
	
	setContext: function(/* Array */ context){
		// Sets the context in which queries are executed
		// context: Array - Array of CSS string paths to execute queries within
		if(context){
			this.close();
			this.context = css.determineContext(context);
		}
	},

	getFeatures: function(){
		// summary:
		//		See dojo/data/api/Read.getFeatures()
		return {
			"dojo.data.api.Read" : true
		};
	},

	isItem: function(item){
		// summary:
		//		See dojo/data/api/Read.isItem()
		if(item && item[this._storeRef] == this){
			return true;
		}
		return false;
	},

	hasAttribute: function(item, attribute){
		// summary:
		//		See dojo/data/api/Read.hasAttribute()
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		var attrs = this.getAttributes(item);
		if(array.indexOf(attrs, attribute) != -1){
			return true;
		}
		return false;
	},

	getAttributes: function(item){
		// summary:
		//		See dojo/data/api/Read.getAttributes()
		this._assertIsItem(item);
		var attrs = ['selector', 'classes', 'rule', 'style', 'cssText', 'styleSheet', 'parentStyleSheet', 'parentStyleSheetHref'];
		var style = item.rule.style;
		if(style){
			var key;
			for(key in style){
				attrs.push("style." + key);
			}
		}
		return attrs;
	},

	getValue: function(item, attribute, defaultValue){
		// summary:
		//		See dojo/data/api/Read.getValue()
		var values = this.getValues(item, attribute);
		var value = defaultValue;
		if(values && values.length > 0){
			return values[0];
		}
		return defaultValue;
	},

	getValues: function(item, attribute){
		// summary:
		//		See dojo/data/api/Read.getValues()
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		var value = null;
		if(attribute === "selector"){
			value = item.rule["selectorText"];
			if(value && lang.isString(value)){
				value = value.split(",");
			}
		}else if(attribute === "classes"){
			value = item.classes;
		}else if(attribute === "rule"){
			value = item.rule.rule;
		}else if(attribute === "style"){
			value = item.rule.style;
		}else if(attribute === "cssText"){
			if(has("ie")){
				if(item.rule.style){
					value = item.rule.style.cssText;
					if(value){
						value = "{ " + value.toLowerCase() + " }";
					}
				}
			}else{
				value = item.rule.cssText;
				if(value){
					value = value.substring(value.indexOf("{"), value.length);
				}
			}
		}else if(attribute === "styleSheet"){
			value = item.rule.styleSheet;
		}else if(attribute === "parentStyleSheet"){
			value = item.rule.parentStyleSheet;
		}else if(attribute === "parentStyleSheetHref"){
			if(item.href){
				value = item.href;
			}
		}else if(attribute.indexOf("style.") === 0){
			var attr = attribute.substring(attribute.indexOf("."), attribute.length);
			value = item.rule.style[attr];
		}else{
			value = [];
		}
		if(value !== undefined){
			if(!lang.isArray(value)){
				value = [value];
			}
		}
		return value;
	},

	getLabel: function(item){
		// summary:
		//		See dojo/data/api/Read.getLabel()
		this._assertIsItem(item);
		return this.getValue(item, this._labelAttribute);
	},

	getLabelAttributes: function(item){
		// summary:
		//		See dojo/data/api/Read.getLabelAttributes()
		return [this._labelAttribute];
	},

	containsValue: function(/* item */ item,
							/* attribute-name-string */ attribute,
							/* anything */ value){
		// summary:
		//		See dojo/data/api/Read.containsValue()
		var regexp = undefined;
		if(typeof value === "string"){
			regexp = filter.patternToRegExp(value, false);
		}
		return this._containsValue(item, attribute, value, regexp); //boolean.
	},

	isItemLoaded: function(/* anything */ something){
		// summary:
		//		See dojo/data/api/Read.isItemLoaded()
		return this.isItem(something); //boolean
	},

	loadItem: function(/* object */ keywordArgs){
		// summary:
		//		See dojo/data/api/Read.loadItem()
		this._assertIsItem(keywordArgs.item);
	},

	fetch: function(request){
		// summary:
		//		See dojo/data/api/Read.fetch()
		request = request || {};
		if(!request.store){
			request.store = this;
		}

		var scope = request.scope || kernel.global;
		if(this._pending && this._pending.length > 0){
			this._pending.push({request: request, fetch: true});
		}else{
			this._pending = [{request: request, fetch: true}];
			this._fetch(request);
		}
		return request;
	},

	_fetch: function(request){
		// summary:
		//		Populates the _allItems object with unique class names
		var scope = request.scope || kernel.global;
		if(this._allItems === null){
			this._allItems = {};
			try{
				if(this.gatherHandle){
					this._waiting.push({'forFunc': lang.hitch(this, this._handleRule), 'finishFunc': lang.hitch(this, this._handleReturn)});
				}else{
					css.rules.forEach(lang.hitch(this, this._handleRule), null, this.context);
					this._handleReturn();
				}
			}catch(e){
				if(request.onError){
					request.onError.call(scope, e, request);
				}
			}
		}else{
			this._handleReturn();
		}
	},

	_handleRule: function(rule, styleSheet, href){
		// summary:
		//		Handles the creation of an item based on the passed rule.  In this store, this implies
		//		parsing out all available class names.
		var selector = rule['selectorText'];
		var s = selector.split(" ");
		var classes = [];
		for(var j=0; j<s.length; j++){
			var tmp = s[j];
			var first = tmp.indexOf('.');
			if(tmp && tmp.length > 0 && first !== -1){
				var last = tmp.indexOf(',') || tmp.indexOf('[');
				tmp = tmp.substring(first, ((last !== -1 && last > first)?last:tmp.length));
				classes.push(tmp);
			}
		}
		var item = {};
		item.rule = rule;
		item.styleSheet = styleSheet;
		item.href = href;
		item.classes = classes;
		item[this._storeRef] = this;
		if(!this._allItems[selector]){
			this._allItems[selector] = [];
		}
		this._allItems[selector].push(item);
	},

	_handleReturn: function(){
		// summary:
		//		Handles the return from a fetching action.  Delegates requests to act on the resulting
		//		item set to eitehr the _handleFetchReturn or _handleFetchByIdentityReturn depending on
		//		where the request originated.
		var _inProgress = [];
		
		var items = [];
		var item = null;
		for(var i in this._allItems){
			item = this._allItems[i];
			for(var j in item){
				items.push(item[j]);
			}
		}

		var requestInfo;
		// One-level deep clone (can't use dojo.clone, since we don't want to clone all those store refs!)
		while(this._pending.length){
			requestInfo = this._pending.pop();
			requestInfo.request._items = items;
			_inProgress.push(requestInfo);
		}

		while(_inProgress.length){
			requestInfo = _inProgress.pop();
			this._handleFetchReturn(requestInfo.request);
		}
	},

	_handleFetchReturn: function(/*Request */ request){
		// summary:
		//		Handles a fetchByIdentity request by finding the correct items.
		var scope = request.scope || kernel.global;
		var items = [];
		//Check to see if we've looked this query up before
		//If so, just reuse it, much faster.  Only regen if query changes.
		var cacheKey = "all";
		var i;
		if(request.query){
			cacheKey = jsonUtil.toJson(request.query);
		}
		if(this._cache[cacheKey]){
			items = this._cache[cacheKey];
		}else if(request.query){
			for(i in request._items){
				var item = request._items[i];
				// Per https://bugs.webkit.org/show_bug.cgi?id=17935 , Safari 3.x always returns the selectorText
				// of a rule in full lowercase.
				var ignoreCase = (request.queryOptions ? request.queryOptions.ignoreCase : false);
				var regexpList = {};
				var key;
				var value;
				for(key in request.query){
					value = request.query[key];
					if(typeof value === "string"){
						regexpList[key] = filter.patternToRegExp(value, ignoreCase);
					}
				}
				var match = true;
				for(key in request.query){
					value = request.query[key];
					if(!this._containsValue(item, key, value, regexpList[key])){
						match = false;
					}
				}
				if(match){
					items.push(item);
				}
			}
			this._cache[cacheKey] = items;
		}else{
			for(i in request._items){
				items.push(request._items[i]);
			}
		}
		var total = items.length;

		//Sort it if we need to.
		if(request.sort){
			items.sort(sorter.createSortFunction(request.sort, this));
		}
		var start = 0;
		var count = items.length;
		if(request.start > 0 && request.start < items.length){
			start = request.start;
		}
		if(request.count && request.count){
			count = request.count;
		}
		var endIdx = start + count;
		if(endIdx > items.length){
			endIdx = items.length;
		}

		items = items.slice(start, endIdx);

		if(request.onBegin){
			request.onBegin.call(scope, total, request);
		}
		if(request.onItem){
			if(lang.isArray(items)){
				for(i = 0; i < items.length; i++){
					request.onItem.call(scope, items[i], request);
				}
				if(request.onComplete){
					request.onComplete.call(scope, null, request);
				}
			}
		}else if(request.onComplete){
			request.onComplete.call(scope, items, request);
		}
		return request;
	},

	close: function(){
		// summary:
		//		See dojo/data/api/Read.close().
		//		Clears out the cache and allItems objects, meaning all future fetches will requery
		//		the stylesheets.
		this._cache = {};
		this._allItems = null;
	},
	
	_assertIsItem: function(/* item */ item){
		// summary:
		//		This function tests whether the item passed in is indeed an item in the store.
		// item:
		//		The item to test for being contained by the store.
		if(!this.isItem(item)){
			throw new Error(this._cName + ": Invalid item argument.");
		}
	},

	_assertIsAttribute: function(/* attribute-name-string */ attribute){
		// summary:
		//		This function tests whether the item passed in is indeed a valid 'attribute' like type for the store.
		// attribute:
		//		The attribute to test for being contained by the store.
		if(typeof attribute !== "string"){
			throw new Error(this._cName + ": Invalid attribute argument.");
		}
	},

	_containsValue: function(	/* item */ item,
								/* attribute-name-string */ attribute,
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
		return array.some(this.getValues(item, attribute), function(possibleValue){
			if(possibleValue !== null && !lang.isObject(possibleValue) && regexp){
				if(possibleValue.toString().match(regexp)){
					return true; // Boolean
				}
			}else if(value === possibleValue){
				return true; // Boolean
			}
			return false;
		});
	}
});
});
